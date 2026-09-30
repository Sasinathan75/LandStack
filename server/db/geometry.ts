import { createHash } from "node:crypto";

/**
 * LandSphere AI — PostGIS geometry helpers.
 *
 * The authoritative demo parcel geometry lives in the Prompt 10 canonical dataset
 * (`client/src/lib/demoData/parcels.ts`) as GeoJSON Polygon coordinates using the
 * WGS84 (EPSG:4326) axis order [longitude, latitude].
 *
 * These helpers convert that trustless GeoJSON representation into the EWKT text
 * accepted by the `geometry(Polygon, 4326)` PostGIS column, and provide validity
 * checks that can also run without a database connection.
 *
 * IMPORTANT: these coordinates are synthetic placeholders that only exist to support
 * the demo GIS workflow. They are NOT real cadastral survey coordinates.
 */

export const LANDSPHERE_SRID = 4326 as const;

export type GeoJsonPosition = [number, number];
export type GeoJsonPolygonCoordinates = GeoJsonPosition[][];

export interface GeoJsonPolygonGeometry {
  type: "Polygon";
  coordinates: GeoJsonPolygonCoordinates;
}

export interface GeoJsonMultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: GeoJsonPolygonCoordinates[];
}

/** GeoJSON geometry types accepted by the LandSphere geometry helpers. */
export type GeoJsonParcelGeometry = GeoJsonPolygonGeometry | GeoJsonMultiPolygonGeometry;

/** Formats a coordinate without scientific notation (PostGIS safe). */
export function formatWktNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Geometry coordinate must be finite, received: ${value}`);
  }
  return value.toFixed(6);
}

/** GeoJSON polygon rings must repeat the first position as the last position. */
export function isRingClosed(ring: readonly GeoJsonPosition[]): boolean {
  if (ring.length < 4) {
    return false;
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

/** Returns a closed copy of the ring (PostGIS requires closed linear rings). */
export function closeRing(ring: readonly GeoJsonPosition[]): GeoJsonPosition[] {
  const positions = ring.map((position) => [position[0], position[1]] as GeoJsonPosition);
  if (positions.length > 0 && !isRingClosed(positions)) {
    positions.push([positions[0][0], positions[0][1]]);
  }
  return positions;
}

/** Shoelace signed area in squared degrees (sign indicates ring orientation). */
export function ringSignedArea(ring: readonly GeoJsonPosition[]): number {
  if (ring.length < 4) {
    return 0;
  }
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

/**
 * "Valid enough for the demo GIS workflow" check: closed ring, at least four
 * positions, at least three distinct vertices and a non-zero area. Full OGC validity
 * is asserted by PostGIS `ST_IsValid` once the geometry is stored in PostgreSQL.
 */
export function isValidPolygonRing(ring: readonly GeoJsonPosition[]): boolean {
  if (!isRingClosed(ring)) {
    return false;
  }
  const distinct = new Set(ring.slice(0, -1).map((position) => `${position[0]},${position[1]}`));
  if (distinct.size < 3) {
    return false;
  }
  return Math.abs(ringSignedArea(ring)) > 0;
}

/** Arithmetic mean of the ring vertices (simple demo centroid, WGS84 degrees). */
export function ringCentroid(ring: readonly GeoJsonPosition[]): GeoJsonPosition | null {
  const vertices = isRingClosed(ring) ? ring.slice(0, -1) : ring;
  if (vertices.length === 0) {
    return null;
  }
  const total = vertices.reduce<[number, number]>(
    (accumulator, position) => [accumulator[0] + position[0], accumulator[1] + position[1]],
    [0, 0]
  );
  return [total[0] / vertices.length, total[1] / vertices.length];
}


/** WKT for a single ring, e.g. `POLYGON((78.1 17.1, 78.2 17.1, ...))`. */
export function ringToWkt(ring: readonly GeoJsonPosition[]): string {
  const closed = closeRing(ring);
  if (closed.length < 4) {
    throw new RangeError("A PostGIS polygon ring requires at least four positions");
  }
  const positions = closed
    .map((position) => `${formatWktNumber(position[0])} ${formatWktNumber(position[1])}`)
    .join(", ");
  return `POLYGON((${positions}))`;
}

/** WKT for GeoJSON polygon coordinates; holes are preserved as inner rings. */
export function polygonCoordinatesToWkt(coordinates: GeoJsonPolygonCoordinates): string {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    throw new RangeError("A PostGIS polygon requires at least one ring");
  }
  const rings = coordinates.map((ring) => {
    const closed = closeRing(ring);
    const positions = closed
      .map((position) => `${formatWktNumber(position[0])} ${formatWktNumber(position[1])}`)
      .join(", ");
    return `(${positions})`;
  });
  return `POLYGON(${rings.join(", ")})`;
}

/**
 * EWKT text for the PostGIS column. PostGIS understands the `SRID=4326;` prefix
 * through `geometry_in`, which keeps the insert strongly typed as
 * `geometry(Polygon, 4326)`.
 */
export function toEwkt(wkt: string, srid: number = LANDSPHERE_SRID): string {
  return wkt.startsWith("SRID=") ? wkt : `SRID=${srid};${wkt}`;
}

export function geoJsonPolygonToWkt(geometry: GeoJsonPolygonGeometry): string {
  if (geometry.type !== "Polygon") {
    throw new TypeError(`Unsupported GeoJSON geometry type: ${geometry.type}`);
  }
  return polygonCoordinatesToWkt(geometry.coordinates);
}

export function geoJsonPolygonToEwkt(
  geometry: GeoJsonPolygonGeometry,
  srid: number = LANDSPHERE_SRID
): string {
  return toEwkt(geoJsonPolygonToWkt(geometry), srid);
}

/** WKT for GeoJSON polygon coordinates nested as a MultiPolygon. */
export function multiPolygonCoordinatesToWkt(coordinates: GeoJsonPolygonCoordinates[]): string {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    throw new RangeError("A PostGIS multipolygon requires at least one polygon");
  }
  const polygons = coordinates.map((polygon) => {
    const rings = polygon.map((ring) => {
      const closed = closeRing(ring);
      const positions = closed
        .map((position) => `${formatWktNumber(position[0])} ${formatWktNumber(position[1])}`)
        .join(", ");
      return `(${positions})`;
    });
    return `(${rings.join(", ")})`;
  });
  return `MULTIPOLYGON(${polygons.join(", ")})`;
}

/** WKT for either supported GeoJSON parcel geometry type. */
export function geoJsonGeometryToWkt(geometry: GeoJsonParcelGeometry): string {
  if (geometry.type === "Polygon") {
    return geoJsonPolygonToWkt(geometry);
  }
  if (geometry.type === "MultiPolygon") {
    return multiPolygonCoordinatesToWkt(geometry.coordinates);
  }
  throw new TypeError(
    `Unsupported GeoJSON geometry type: ${(geometry as { type?: string }).type ?? "undefined"}`
  );
}

/** EWKT text for either supported GeoJSON parcel geometry type. */
export function geoJsonGeometryToEwkt(
  geometry: GeoJsonParcelGeometry,
  srid: number = LANDSPHERE_SRID
): string {
  return toEwkt(geoJsonGeometryToWkt(geometry), srid);
}


/** Deterministic placeholder audit hash (demo-only, not a security primitive). */
export function integrityHash(...parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

/** Stable, lowercase, URL-safe slug used for deterministic demo identifiers. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

/** Parses values such as `"2.48 Acres"` into a numeric acreage. */
export function parseAcres(value: string): number {
  const match = /-?\d+(\.\d+)?/.exec(value);
  if (!match) {
    throw new RangeError(`Unable to parse acreage from: ${value}`);
  }
  return Number.parseFloat(match[0]);
}

/** Rounds to a fixed number of decimals and returns a string for numeric columns. */
export function roundTo(value: number, decimals: number): string {
  return value.toFixed(decimals);
}
