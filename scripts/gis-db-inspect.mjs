/**
 * LandSphere AI — PostGIS parcel geometry inspector (read-only).
 *
 * Verifies the real seeded cadastral geometry that the GIS map must render:
 * SRID, geometry type, validity, extent, per-parcel bbox and the related
 * land-status tables used by the Selected Feature / Parcel Details panel.
 *
 * Usage: node scripts/gis-db-inspect.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(path.join(root, ".env"), "utf8");
  const match = /^DATABASE_URL=(.+)$/m.exec(env);
  if (!match) throw new Error("DATABASE_URL not found in .env");
  return match[1].trim();
}

const client = new pg.Client({ connectionString: loadDatabaseUrl() });

async function run(label, sql) {
  try {
    const result = await client.query(sql);
    console.log(`\n=== ${label}`);
    console.log(JSON.stringify(result.rows, null, 1));
  } catch (error) {
    console.log(`\n=== ${label}\nERROR: ${error.message}`);
  }
}

await client.connect();

await run(
  "Parcel count / geometry presence",
  `SELECT count(*)::int AS parcels,
          count(geometry)::int AS with_geometry,
          count(geojson)::int AS with_geojson_jsonb
     FROM parcels`
);

await run(
  "CRS / geometry type / validity",
  `SELECT ST_SRID(geometry) AS srid,
          GeometryType(geometry) AS geom_type,
          count(*)::int AS rows,
          sum(CASE WHEN ST_IsValid(geometry) THEN 1 ELSE 0 END)::int AS valid_rows,
          sum(CASE WHEN ST_IsValid(ST_Transform(geometry, 4326)) THEN 1 ELSE 0 END)::int AS valid_after_4326_transform
     FROM parcels
    GROUP BY 1, 2`
);

await run(
  "Whole-dataset extent (drives naive fitBounds)",
  `SELECT ST_Extent(geometry)::text AS whole_extent,
          round(ST_XMax(ST_Extent(geometry))::numeric - ST_XMin(ST_Extent(geometry))::numeric, 5) AS span_lng_deg,
          round(ST_YMax(ST_Extent(geometry))::numeric - ST_YMin(ST_Extent(geometry))::numeric, 5) AS span_lat_deg
     FROM parcels`
);

await run(
  "Per-parcel extent, area and centroid (ST_AsGeoJSON source of truth)",
  `SELECT parcel_id,
          ulpin,
          round(area_acres::numeric, 2) AS area_acres,
          ST_SRID(geometry) AS srid,
          GeometryType(geometry) AS postgis_geom_type,
          (ST_AsGeoJSON(geometry)::json ->> 'type') AS geojson_type,
          round((ST_XMax(Box3D(geometry)) - ST_XMin(Box3D(geometry)))::numeric, 5) AS parcel_lng_deg,
          round((ST_YMax(Box3D(geometry)) - ST_YMin(Box3D(geometry)))::numeric, 5) AS parcel_lat_deg,
          round(ST_X(ST_Centroid(geometry))::numeric, 5) AS centroid_lng,
          round(ST_Y(ST_Centroid(geometry))::numeric, 5) AS centroid_lat
     FROM parcels
    ORDER BY parcel_id`
);

await run(
  "Related land-status rows used by the parcel details panel",
  `SELECT 'citizens' AS tbl, count(*)::int AS rows FROM citizens
    UNION ALL SELECT 'parcel_owners', count(*)::int FROM parcel_owners
    UNION ALL SELECT 'land_records', count(*)::int FROM land_records
    UNION ALL SELECT 'transactions', count(*)::int FROM transactions
    UNION ALL SELECT 'encumbrances', count(*)::int FROM encumbrances
    UNION ALL SELECT 'property_taxes', count(*)::int FROM property_taxes
    UNION ALL SELECT 'restrictions', count(*)::int FROM restrictions
    UNION ALL SELECT 'ai_validations', count(*)::int FROM ai_validations
    ORDER BY tbl`
);

await run(
  "Authoritative owner per parcel (parcel_owners -> citizens)",
  `SELECT p.parcel_id, c.full_name AS owner_name, po.ownership_type, po.ownership_status, po.share_percent
     FROM parcels p
     LEFT JOIN parcel_owners po ON po.parcel_id = p.id
     LEFT JOIN citizens c ON c.id = po.citizen_id
    ORDER BY p.parcel_id
    LIMIT 40`
);

await run(
  "Duplicate-row hazard of a naive multi LEFT JOIN (LS-PAR-0428 shown)",
  `SELECT p.parcel_id,
          count(*)::int AS joined_rows
     FROM parcels p
     LEFT JOIN land_records lr ON lr.parcel_id = p.id
     LEFT JOIN transactions t ON t.parcel_id = p.id
     LEFT JOIN encumbrances e ON e.parcel_id = p.id
     LEFT JOIN property_taxes pt ON pt.parcel_id = p.id
     LEFT JOIN ai_validations av ON av.parcel_id = p.id
    GROUP BY 1
    ORDER BY joined_rows DESC
    LIMIT 5`
);

await run(
  "Status columns available per related table",
  `SELECT table_name, string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
     FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('land_records','transactions','encumbrances','property_taxes','ai_validations','parcel_owners','restrictions','citizens')
    GROUP BY 1
    ORDER BY 1`
);


await client.end();
