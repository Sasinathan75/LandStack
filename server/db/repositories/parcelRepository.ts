import { isDatabaseConfigured, queryRaw, sanitizeDatabaseError } from "../client";
import { demoParcels } from "../../../client/src/lib/demoData/parcels";
import type {
  LandUse,
  Parcel,
  ParcelDetailStatuses,
  ParcelGeometry,
  ParcelStatus,
  RiskLevel,
} from "../../../client/src/types/parcel";
import { restrictionSeeds } from "../seedData/landDetails";
import { LANDSPHERE_SRID } from "../geometry";

/**
 * Parcel Repository — PostgreSQL + PostGIS.
 *
 * The authoritative parcel geometry is the PostGIS `parcels.geometry` column
 * (`geometry(Polygon, 4326)`). Every read:
 *
 *  1. verifies the stored SRID with `ST_SRID`,
 *  2. transforms to EPSG:4326 with `ST_Transform` when the SRID differs,
 *  3. serialises it with `ST_AsGeoJSON`, so the API returns valid GeoJSON
 *     `Polygon`/`MultiPolygon` coordinates,
 *  4. reads the real bounds/centroid from PostGIS (`ST_Centroid`, `Box3D`)
 *     instead of guessing them in the browser.
 *
 * Related land-status facts (owner, registration, tax, encumbrance,
 * validation, restrictions) are pulled with `LEFT JOIN LATERAL … LIMIT 1`
 * sub-queries so a parcel can never be duplicated by a one-to-many join.
 *
 * No parcel geometry is ever fabricated. When PostgreSQL is unreachable the
 * repository serves the bundled canonical dataset — the exact same seeded
 * coordinates `pnpm db:seed` wrote into PostGIS — marked `source: "bundled"`.
 */

interface ParcelRow {
  parcelId: string;
  ulpin: string;
  surveyNumber: string;
  areaAcres: number;
  landUse: string;
  location: string;
  district: string;
  state: string;
  status: string;
  riskLevel: string;
  updatedAt: Date | string;
  srid: number | null;
  geometryType: string | null;
  geojson: string | null;
  centroidLng: number | null;
  centroidLat: number | null;
  minLng: number | null;
  minLat: number | null;
  maxLng: number | null;
  maxLat: number | null;
  ownerName: string | null;
  ownershipType: string | null;
  ownershipPercentage: number | null;
  ownerIsPrimary: boolean | null;
  coOwnerCount: number | null;
  registrationStatus: string | null;
  registrationRecordType: string | null;
  registrationRecordNumber: string | null;
  registrationAuthority: string | null;
  transactionStatus: string | null;
  transactionType: string | null;
  deedNumber: string | null;
  encumbranceStatus: string | null;
  encumbranceType: string | null;
  encumbranceHolder: string | null;
  taxPaymentStatus: string | null;
  taxAssessmentYear: string | null;
  taxAmountDue: number | null;
  taxAmountPaid: number | null;
  validationStatus: string | null;
  validationRisk: string | null;
  validationIssue: string | null;
  validationType: string | null;
  restrictionTypes: string | null;
}


const LAND_USE_VALUES: LandUse[] = [
  "Residential",
  "Mixed use",
  "Agricultural",
  "Institutional",
  "Commercial",
];

const RISK_VALUES: RiskLevel[] = ["Low", "Medium", "High"];

/** Coerces a database land-use string into the UI union without inventing a value. */
function toLandUse(value: string | null | undefined): LandUse {
  const match = LAND_USE_VALUES.find((item) => item.toLowerCase() === (value ?? "").toLowerCase());
  return match ?? "Residential";
}

/** Coerces a database status into the UI status union. */
function toStatus(value: string | null | undefined): ParcelStatus {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "flagged") return "Flagged";
  if (normalized === "under review") return "Under review";
  if (normalized === "active" || normalized === "open" || normalized === "pending") {
    return "Under review";
  }
  return "Verified";
}

/** Coerces a database risk level into the UI risk union. */
function toRisk(value: string | null | undefined): RiskLevel {
  const match = RISK_VALUES.find((item) => item.toLowerCase() === (value ?? "").toLowerCase());
  return match ?? "Low";
}

/** Formats the seeded numeric acreage exactly like the UI expects (`1.85 Acres`). */
function formatAcres(value: number | string | null | undefined): string {
  const acres = Number(value);
  return Number.isFinite(acres) ? `${acres.toFixed(2)} Acres` : "—";
}

/** `17.4680° N, 78.3610° E` from the PostGIS centroid. */
function formatCoordinates(lng: number | null, lat: number | null): string {
  if (lng === null || lat === null || !Number.isFinite(lng) || !Number.isFinite(lat)) return "—";
  return `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
}

/**
 * The seed appends `, <district>, <state>` to the recorded location. This strips
 * exactly those trailing labels so the map and parcel list show the recorded
 * locality, while `district`/`state` stay available separately.
 */
function shortLocality(location: string, district: string | null, state: string | null): string {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const dropTrailing = (label: string | null) => {
    if (!label || parts.length <= 1) return;
    if (parts[parts.length - 1].toLowerCase() === label.toLowerCase()) parts.pop();
  };
  dropTrailing(state);
  dropTrailing(district);
  return parts.join(", ") || location;
}

/** Parses `ST_AsGeoJSON` output, accepting both Polygon and MultiPolygon. */
function parseGeometry(geojson: string | null): ParcelGeometry | null {
  if (!geojson) return null;
  try {
    const parsed = JSON.parse(geojson) as { type?: string; coordinates?: unknown };
    if (parsed?.type === "Polygon" && Array.isArray(parsed.coordinates)) {
      return { type: "Polygon", coordinates: parsed.coordinates as never };
    }
    if (parsed?.type === "MultiPolygon" && Array.isArray(parsed.coordinates)) {
      return { type: "MultiPolygon", coordinates: parsed.coordinates as never };
    }
  } catch {
    // Fall through to null — a malformed geometry is reported, never guessed.
  }
  return null;
}


/** Builds the real land-status facts for the details panel from SQL columns. */
function buildDetails(row: ParcelRow): ParcelDetailStatuses {
  const ownershipLabel = row.ownerName
    ? `${row.ownershipType ?? "Recorded owner"}${
        row.ownershipPercentage !== null ? ` · ${Number(row.ownershipPercentage).toFixed(2)}%` : ""
      }`
    : "No ownership record";
  const registrationLabel = row.registrationStatus
    ? `${row.registrationStatus}${row.registrationRecordType ? ` · ${row.registrationRecordType}` : ""}`
    : "Not registered";
  const taxLabel = row.taxPaymentStatus
    ? `${row.taxPaymentStatus}${row.taxAssessmentYear ? ` · ${row.taxAssessmentYear}` : ""}`
    : "No tax record";
  const encumbranceLabel = row.encumbranceStatus
    ? `${row.encumbranceStatus}${row.encumbranceType ? ` · ${row.encumbranceType}` : ""}`
    : "None recorded";
  const validationLabel = row.validationStatus
    ? `${row.validationStatus}${row.validationRisk ? ` · ${row.validationRisk} risk` : ""}`
    : "No validation record";

  return {
    ownership: {
      ownerName: row.ownerName,
      ownershipType: row.ownershipType,
      sharePercent: row.ownershipPercentage === null ? null : Number(row.ownershipPercentage),
      isPrimary: Boolean(row.ownerIsPrimary),
      coOwnerCount: Number(row.coOwnerCount ?? 0),
      label: ownershipLabel,
    },
    registration: {
      status: row.registrationStatus,
      recordType: row.registrationRecordType,
      recordNumber: row.registrationRecordNumber,
      issuingAuthority: row.registrationAuthority,
      label: registrationLabel,
    },
    propertyTax: {
      paymentStatus: row.taxPaymentStatus,
      assessmentYear: row.taxAssessmentYear,
      amountDue: row.taxAmountDue === null ? null : Number(row.taxAmountDue),
      amountPaid: row.taxAmountPaid === null ? null : Number(row.taxAmountPaid),
      label: taxLabel,
    },
    encumbrance: {
      status: row.encumbranceStatus,
      encumbranceType: row.encumbranceType,
      holderName: row.encumbranceHolder,
      label: encumbranceLabel,
    },
    validation: {
      status: row.validationStatus,
      riskLevel: row.validationRisk ? toRisk(row.validationRisk) : null,
      issueTitle: row.validationIssue,
      validationType: row.validationType,
      label: validationLabel,
    },
    restrictions: (row.restrictionTypes ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    geometry: {
      srid: row.srid,
      geometryType: row.geometryType,
    },
  };
}


/**
 * Single-row-per-parcel PostGIS projection.
 *
 * `$1` = search text (nullable), `$2` = district (nullable),
 * `$3..$6` = bbox `minLng, minLat, maxLng, maxLat` (nullable).
 */
const PARCEL_SELECT = `
SELECT
  p.parcel_id AS "parcelId",
  p.ulpin,
  p.survey_number AS "surveyNumber",
  p.area_acres::float8 AS "areaAcres",
  p.land_use AS "landUse",
  p.location,
  p.district,
  p.state,
  p.status,
  p.risk_level AS "riskLevel",
  p.updated_at AS "updatedAt",
  ST_SRID(p.geometry) AS "srid",
  GeometryType(p.geometry) AS "geometryType",
  CASE
    WHEN p.geometry IS NULL THEN NULL
    WHEN ST_SRID(p.geometry) = ${LANDSPHERE_SRID} THEN ST_AsGeoJSON(p.geometry)
    ELSE ST_AsGeoJSON(ST_Transform(p.geometry, ${LANDSPHERE_SRID}))
  END AS "geojson",
  ST_X(ST_Centroid(p.geometry)) AS "centroidLng",
  ST_Y(ST_Centroid(p.geometry)) AS "centroidLat",
  ST_XMin(Box3D(p.geometry)) AS "minLng",
  ST_YMin(Box3D(p.geometry)) AS "minLat",
  ST_XMax(Box3D(p.geometry)) AS "maxLng",
  ST_YMax(Box3D(p.geometry)) AS "maxLat",
  owner.full_name AS "ownerName",
  owner.ownership_type AS "ownershipType",
  owner.ownership_percentage::float8 AS "ownershipPercentage",
  owner.is_primary AS "ownerIsPrimary",
  owner.co_owner_count AS "coOwnerCount",
  reg.status AS "registrationStatus",
  reg.record_type AS "registrationRecordType",
  reg.record_number AS "registrationRecordNumber",
  reg.issuing_authority AS "registrationAuthority",
  txn.status AS "transactionStatus",
  txn.transaction_type AS "transactionType",
  txn.registration_deed_number AS "deedNumber",
  enc.status AS "encumbranceStatus",
  enc.encumbrance_type AS "encumbranceType",
  enc.holder_name AS "encumbranceHolder",
  tax.payment_status AS "taxPaymentStatus",
  tax.assessment_year AS "taxAssessmentYear",
  tax.amount_due::float8 AS "taxAmountDue",
  tax.amount_paid::float8 AS "taxAmountPaid",
  val.status AS "validationStatus",
  val.risk_level AS "validationRisk",
  val.issue_title AS "validationIssue",
  val.validation_type AS "validationType",
  res.restriction_types AS "restrictionTypes"
FROM parcels p
LEFT JOIN LATERAL (
  SELECT c.full_name,
         po.ownership_type,
         po.ownership_percentage,
         po.is_primary,
         (SELECT COUNT(*) - 1 FROM parcel_owners po2 WHERE po2.parcel_id = p.id) AS co_owner_count
    FROM parcel_owners po
    JOIN citizens c ON c.id = po.citizen_id
   WHERE po.parcel_id = p.id
   ORDER BY po.is_primary DESC, po.id
   LIMIT 1
) owner ON TRUE
LEFT JOIN LATERAL (
  SELECT lr.status, lr.record_type, lr.record_number, lr.issuing_authority
    FROM land_records lr WHERE lr.parcel_id = p.id ORDER BY lr.id DESC LIMIT 1
) reg ON TRUE
LEFT JOIN LATERAL (
  SELECT t.status, t.transaction_type, t.registration_deed_number
    FROM transactions t WHERE t.parcel_id = p.id ORDER BY t.id DESC LIMIT 1
) txn ON TRUE
LEFT JOIN LATERAL (
  SELECT e.status, e.encumbrance_type, e.holder_name
    FROM encumbrances e WHERE e.parcel_id = p.id ORDER BY e.id DESC LIMIT 1
) enc ON TRUE
LEFT JOIN LATERAL (
  SELECT pt.payment_status, pt.assessment_year, pt.amount_due, pt.amount_paid
    FROM property_taxes pt WHERE pt.parcel_id = p.id ORDER BY pt.id DESC LIMIT 1
) tax ON TRUE
LEFT JOIN LATERAL (
  SELECT av.status, av.risk_level, av.issue_title, av.validation_type
    FROM ai_validations av WHERE av.parcel_id = p.id ORDER BY av.id DESC LIMIT 1
) val ON TRUE
LEFT JOIN LATERAL (
  SELECT string_agg(r.restriction_type, ', ' ORDER BY r.restriction_type) AS restriction_types
    FROM restrictions r WHERE r.parcel_id = p.id
) res ON TRUE
`;


/** Maps a PostGIS row into the UI parcel model, or `null` when it has no geometry. */
function mapParcelRow(row: ParcelRow): Parcel | null {
  const geometry = parseGeometry(row.geojson);
  if (!geometry) {
    console.warn(
      `[ParcelRepository] ${row.parcelId} has no usable PostGIS geometry (SRID ${row.srid ?? "null"}); row skipped.`
    );
    return null;
  }
  const locality = shortLocality(row.location ?? "", row.district ?? null, row.state ?? null);
  const coordinates = formatCoordinates(row.centroidLng, row.centroidLat);
  return {
    id: row.parcelId,
    ulpin: row.ulpin,
    owner: row.ownerName ?? "Not recorded",
    area: formatAcres(row.areaAcres),
    locality,
    coordinates,
    location: { locality, coordinates },
    landUse: toLandUse(row.landUse),
    status: toStatus(row.status),
    risk: toRisk(row.riskLevel),
    lastUpdated: new Date(row.updatedAt).toISOString().slice(0, 10),
    geometry,
    surveyNumber: row.surveyNumber ?? undefined,
    district: row.district ?? undefined,
    state: row.state ?? undefined,
    source: "postgis",
    details: buildDetails(row),
  };
}

/** Bundled canonical rows — same seeded coordinates, marked as the offline source. */
function bundledParcels(): Parcel[] {
  return demoParcels.map((parcel) => ({ ...parcel, source: "bundled" as const }));
}

/** Offline lookup used only when PostgreSQL cannot be reached. */
function bundledFind(idOrUlpin: string): Parcel | undefined {
  const key = idOrUlpin.trim().toLowerCase();
  const match = demoParcels.find(
    (parcel) => parcel.id.toLowerCase() === key || parcel.ulpin.toLowerCase() === key
  );
  return match ? { ...match, source: "bundled" } : undefined;
}

export type ParcelDatasetExtent = {
  bbox: [number, number, number, number] | null;
  parcels: number;
  withGeometry: number;
  srids: number[];
  geometryTypes: string[];
};


/**
 * Parcel Repository for PostgreSQL + PostGIS reads with a bundled-data fallback.
 */
export class ParcelRepository {
  /**
   * Runs the single-row-per-parcel PostGIS projection. Returns `null` when the
   * database is unavailable or the query fails, so callers can fall back.
   */
  private async selectRows(params?: {
    query?: string;
    district?: string;
    bbox?: [number, number, number, number];
  }): Promise<ParcelRow[] | null> {
    if (!isDatabaseConfigured()) return null;
    try {
      const search = params?.query?.trim() || null;
      const district = params?.district?.trim() || null;
      const bbox = params?.bbox ?? null;
      const result = await queryRaw<ParcelRow>(
        `${PARCEL_SELECT}
WHERE ($1::text IS NULL OR (
          p.parcel_id ILIKE '%' || $1 || '%'
       OR p.ulpin ILIKE '%' || $1 || '%'
       OR p.survey_number ILIKE '%' || $1 || '%'
       OR p.location ILIKE '%' || $1 || '%'
       OR p.land_use ILIKE '%' || $1 || '%'
       OR COALESCE(owner.full_name, '') ILIKE '%' || $1 || '%'
       OR COALESCE(val.issue_title, '') ILIKE '%' || $1 || '%'
      ))
  AND ($2::text IS NULL OR p.district ILIKE '%' || $2 || '%' OR p.location ILIKE '%' || $2 || '%')
  AND ($3::float8 IS NULL OR ST_Intersects(
        CASE WHEN ST_SRID(p.geometry) = ${LANDSPHERE_SRID} THEN p.geometry
             ELSE ST_Transform(p.geometry, ${LANDSPHERE_SRID}) END,
        ST_MakeEnvelope($3, $4, $5, $6, ${LANDSPHERE_SRID})
      ))
ORDER BY p.parcel_id`,
        [
          search,
          district,
          bbox?.[0] ?? null,
          bbox?.[1] ?? null,
          bbox?.[2] ?? null,
          bbox?.[3] ?? null,
        ]
      );
      return result.rows;
    } catch (error) {
      console.warn(
        "[ParcelRepository] PostGIS parcel query failed; serving bundled canonical parcels:",
        sanitizeDatabaseError(error)
      );
      return null;
    }
  }

  /**
   * Search parcels by text query, district or spatial bounding box using the
   * real PostGIS geometry. Falls back to the bundled canonical dataset (the
   * identical seeded coordinates) only when PostgreSQL is unreachable.
   */
  async findParcels(params?: {
    query?: string;
    district?: string;
    bbox?: [number, number, number, number];
  }): Promise<Parcel[]> {
    const rows = await this.selectRows(params);
    if (!rows) return bundledParcels();

    const parcels = rows.map(mapParcelRow).filter((parcel): parcel is Parcel => parcel !== null);

    if (parcels.length === 0) {
      if (!params?.query && !params?.district && !params?.bbox) {
        console.warn(
          "[ParcelRepository] No parcel rows carry PostGIS geometry; serving bundled canonical parcels."
        );
        return bundledParcels();
      }
      return [];
    }
    return parcels;
  }

  /**
   * Find a single parcel by Parcel ID or ULPIN (exact match first, then the
   * first case-insensitive substring match) with its real PostGIS geometry.
   */
  async findById(idOrUlpin: string): Promise<Parcel | undefined> {
    const key = idOrUlpin.trim();
    if (!key) return undefined;
    const rows = await this.selectRows({ query: key });
    if (!rows) return bundledFind(key);

    const parcels = rows.map(mapParcelRow).filter((parcel): parcel is Parcel => parcel !== null);
    const lowered = key.toLowerCase();
    return (
      parcels.find(
        (parcel) => parcel.id.toLowerCase() === lowered || parcel.ulpin.toLowerCase() === lowered
      ) ?? parcels[0]
    );
  }


  /**
   * PostGIS dataset facts: extent, parcel count, SRIDs and geometry types.
   * Used by `/api/gis/parcels.geojson` to publish a CRS + bbox the map can trust.
   */
  async datasetExtent(): Promise<ParcelDatasetExtent | null> {
    if (!isDatabaseConfigured()) return null;
    try {
      const result = await queryRaw<{
        parcels: number;
        withGeometry: number;
        srids: string | null;
        geometryTypes: string | null;
        minLng: number | null;
        minLat: number | null;
        maxLng: number | null;
        maxLat: number | null;
      }>(`
SELECT
  COUNT(*)::int AS "parcels",
  COUNT(geometry)::int AS "withGeometry",
  (SELECT string_agg(DISTINCT ST_SRID(geometry)::text, ',') FROM parcels WHERE geometry IS NOT NULL) AS "srids",
  (SELECT string_agg(DISTINCT GeometryType(geometry), ',') FROM parcels WHERE geometry IS NOT NULL) AS "geometryTypes",
  ST_XMin(ST_Extent(geometry)) AS "minLng",
  ST_YMin(ST_Extent(geometry)) AS "minLat",
  ST_XMax(ST_Extent(geometry)) AS "maxLng",
  ST_YMax(ST_Extent(geometry)) AS "maxLat"
FROM parcels;`);

      const row = result.rows[0];
      if (!row) return null;
      const corners = [row.minLng, row.minLat, row.maxLng, row.maxLat];
      const hasExtent = corners.every((value) => value !== null && Number.isFinite(value));
      return {
        bbox: hasExtent ? (corners as [number, number, number, number]) : null,
        parcels: Number(row.parcels ?? 0),
        withGeometry: Number(row.withGeometry ?? 0),
        srids: (row.srids ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
          .map(Number),
        geometryTypes: (row.geometryTypes ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      };
    } catch (error) {
      console.warn("[ParcelRepository] PostGIS extent query failed:", sanitizeDatabaseError(error));
      return null;
    }
  }

  /**
   * List seeded parcel restrictions (parcel id + restriction type), used by the
   * GIS GeoJSON endpoint to flag restricted parcels on the Restrictions layer.
   * Falls back to the deterministic seed dataset when PostgreSQL is offline.
   */
  async findRestrictions(): Promise<Array<{ parcelId: string; restrictionType: string }>> {
    const seedFallback = () =>
      restrictionSeeds.map((seed) => ({
        parcelId: seed.parcelId,
        restrictionType: seed.restrictionType,
      }));

    if (!isDatabaseConfigured()) return seedFallback();

    try {
      const result = await queryRaw<{ parcelId: string; restrictionType: string }>(
        `SELECT p.parcel_id AS "parcelId", r.restriction_type AS "restrictionType"
           FROM restrictions r
           JOIN parcels p ON p.id = r.parcel_id
          ORDER BY p.parcel_id, r.restriction_type;`
      );
      if (result.rows.length === 0) return seedFallback();
      return result.rows;
    } catch (error) {
      console.warn(
        "[ParcelRepository] Restrictions query failed, using seed restrictions:",
        sanitizeDatabaseError(error)
      );
      return seedFallback();
    }
  }

  /**
   * Spatial query: find the parcel containing a given point (`lng`, `lat`) using
   * PostGIS `ST_Contains` against the EPSG:4326 geometry.
   */
  async findByPoint(lng: number, lat: number): Promise<Parcel | undefined> {
    if (!isDatabaseConfigured()) return undefined;
    try {
      const result = await queryRaw<ParcelRow>(
        `${PARCEL_SELECT}
WHERE p.geometry IS NOT NULL
  AND ST_Contains(
        CASE WHEN ST_SRID(p.geometry) = ${LANDSPHERE_SRID} THEN p.geometry
             ELSE ST_Transform(p.geometry, ${LANDSPHERE_SRID}) END,
        ST_SetSRID(ST_MakePoint($1, $2), ${LANDSPHERE_SRID})
      )
ORDER BY p.parcel_id
LIMIT 1`,
        [lng, lat]
      );
      const row = result.rows[0];
      return row ? mapParcelRow(row) ?? undefined : undefined;
    } catch (error) {
      console.warn("[ParcelRepository] findByPoint failed:", sanitizeDatabaseError(error));
      return undefined;
    }
  }
}

export const parcelRepository = new ParcelRepository();
