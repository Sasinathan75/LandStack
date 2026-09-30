import {
  describeDatabaseTarget,
  isDatabaseConfigured,
  queryRaw,
  sanitizeDatabaseError,
} from "./client";

/**
 * LandSphere AI — database health checks (Prompt 11, Step 11).
 *
 * Four verifications are provided:
 *  1. PostgreSQL connection
 *  2. PostgreSQL version
 *  3. PostGIS availability + version
 *  4. Spatial query execution (including a PostGIS spatial query over the parcels table)
 *
 * Every failure is reported as a structured, secret-free message. Checks never throw.
 */

export type DatabaseCheckStatus = "ok" | "failed" | "skipped";

export interface DatabaseCheck {
  /** Stable machine-readable check identifier. */
  id: "postgresql_connection" | "postgresql_version" | "postgis_extension" | "spatial_query";
  /** Human-readable check name. */
  name: string;
  status: DatabaseCheckStatus;
  /** Short human-readable detail (version string, geometry text, row count, ...). */
  detail: string;
  /** Error message when the check failed (credentials are always redacted). */
  error?: string;
}

export interface DatabaseHealthReport {
  configured: boolean;
  target: string | null;
  healthy: boolean;
  checkedAt: string;
  checks: DatabaseCheck[];
  postgresVersion: string | null;
  postgisVersion: string | null;
  spatialQueryResult: string | null;
}

/** Canonical demo reference point used by the spatial query check (Chennai, WGS84). */
export const SPATIAL_CHECK_POINT_WKT = "POINT(80.2707 13.0827)";

export const SPATIAL_CHECK_SRID = 4326;

interface VersionRow {
  version: string;
}

interface PostgisRow {
  postgis_version: string;
}

interface SpatialRow {
  point_wkt: string;
  srid: number;
  geometry_type: string;
}

interface ParcelSpatialRow {
  parcel_count: string;
  valid_count: string;
  gist_indexes: string;
}

function skipped(id: DatabaseCheck["id"], name: string, detail: string): DatabaseCheck {
  return { id, name, status: "skipped", detail };
}

function failed(id: DatabaseCheck["id"], name: string, error: unknown): DatabaseCheck {
  return {
    id,
    name,
    status: "failed",
    detail: "check failed",
    error: sanitizeDatabaseError(error),
  };
}

/** 1. PostgreSQL connection + 2. PostgreSQL version. */
export async function checkPostgresConnection(): Promise<{
  connection: DatabaseCheck;
  version: DatabaseCheck;
  postgresVersion: string | null;
}> {
  const name = "PostgreSQL connection";
  const versionName = "PostgreSQL version";

  if (!isDatabaseConfigured()) {
    const detail = "DATABASE_URL is not configured for this process.";
    return {
      connection: skipped("postgresql_connection", name, detail),
      version: skipped("postgresql_version", versionName, detail),
      postgresVersion: null,
    };
  }

  try {
    const result = await queryRaw<VersionRow>("SELECT version() AS version;");
    const version = result.rows[0]?.version ?? "unknown";
    return {
      connection: {
        id: "postgresql_connection",
        name,
        status: "ok",
        detail: `Connected to ${describeDatabaseTarget() ?? "configured database"}.`,
      },
      version: { id: "postgresql_version", name: versionName, status: "ok", detail: version },
      postgresVersion: version,
    };
  } catch (error) {
    return {
      connection: failed("postgresql_connection", name, error),
      version: failed("postgresql_version", versionName, error),
      postgresVersion: null,
    };
  }
}

/** 3. PostGIS availability + version. */
export async function checkPostgis(): Promise<{
  check: DatabaseCheck;
  postgisVersion: string | null;
}> {
  const name = "PostGIS extension";
  if (!isDatabaseConfigured()) {
    return {
      check: skipped("postgis_extension", name, "DATABASE_URL is not configured for this process."),
      postgisVersion: null,
    };
  }

  try {
    const result = await queryRaw<PostgisRow>("SELECT PostGIS_Version() AS postgis_version;");
    const version = result.rows[0]?.postgis_version ?? null;
    return {
      check: {
        id: "postgis_extension",
        name,
        status: "ok",
        detail: version ? `Available — PostGIS ${version}` : "Available",
      },
      postgisVersion: version,
    };
  } catch (error) {
    return { check: failed("postgis_extension", name, error), postgisVersion: null };
  }
}



/** 4. Spatial query execution, plus a real PostGIS query over the parcels table. */
export async function checkSpatialQuery(): Promise<{
  check: DatabaseCheck;
  spatialQueryResult: string | null;
}> {
  const name = "Spatial query execution";
  if (!isDatabaseConfigured()) {
    return {
      check: skipped("spatial_query", name, "DATABASE_URL is not configured for this process."),
      spatialQueryResult: null,
    };
  }

  try {
    const point = await queryRaw<SpatialRow>(
      `SELECT ST_AsText(ST_GeomFromText($1, $2)) AS point_wkt,
              ST_SRID(ST_GeomFromText($1, $2)) AS srid,
              GeometryType(ST_GeomFromText($1, $2)) AS geometry_type;`,
      [SPATIAL_CHECK_POINT_WKT, SPATIAL_CHECK_SRID]
    );

    const pointWkt = point.rows[0]?.point_wkt ?? null;
    const srid = point.rows[0]?.srid ?? null;

    // Spatial query over real parcel geometry: polygon validity + GIST index presence.
    const parcels = await queryRaw<ParcelSpatialRow>(
      `SELECT COUNT(*)::text AS parcel_count,
              COUNT(*) FILTER (WHERE ST_IsValid(geometry))::text AS valid_count,
              (SELECT COUNT(*)::text
                 FROM pg_indexes
                WHERE tablename = 'parcels'
                  AND indexdef ILIKE '%USING gist%') AS gist_indexes
         FROM parcels;`
    );

    const parcelCount = Number(parcels.rows[0]?.parcel_count ?? 0);
    const validCount = Number(parcels.rows[0]?.valid_count ?? 0);
    const gistIndexes = Number(parcels.rows[0]?.gist_indexes ?? 0);

    return {
      check: {
        id: "spatial_query",
        name,
        status: "ok",
        detail:
          `ST_GeomFromText → ${pointWkt} (SRID ${srid}); ` +
          `parcels=${parcelCount}, valid_geometries=${validCount}, gist_indexes=${gistIndexes}`,
      },
      spatialQueryResult: pointWkt,
    };
  } catch (error) {
    return { check: failed("spatial_query", name, error), spatialQueryResult: null };
  }
}

/** Runs every database check and returns an aggregate report. */
export async function getDatabaseHealth(): Promise<DatabaseHealthReport> {
  const { connection, version, postgresVersion } = await checkPostgresConnection();
  const { check: postgisCheck, postgisVersion } = await checkPostgis();
  const { check: spatialCheck, spatialQueryResult } = await checkSpatialQuery();

  const checks = [connection, version, postgisCheck, spatialCheck];

  return {
    configured: isDatabaseConfigured(),
    target: describeDatabaseTarget(),
    healthy: checks.every((entry) => entry.status === "ok"),
    checkedAt: new Date().toISOString(),
    checks,
    postgresVersion,
    postgisVersion,
    spatialQueryResult,
  };
}
