import type {
  Parcel,
  ParcelFeature,
  ParcelFeatureCollection,
  ParcelFeatureProperties,
  ParcelGeometry,
} from "../../client/src/types/parcel";

/**
 * GeoJSON feature builders for the parcel API.
 *
 * Geometry comes straight from the `Parcel` model, which the repository fills
 * from PostGIS (`ST_AsGeoJSON` after an `ST_SRID` check / `ST_Transform`), so
 * these helpers never invent coordinates. Bounds and centroid are computed from
 * that same geometry — and are replaced by the PostGIS values when the row
 * already carries them in `properties.bbox` / `properties.centroid`.
 */

export type BBox = [number, number, number, number];

type AnyRing = number[][];

/** Walks every position of a Polygon or MultiPolygon geometry. */
export function forEachGeometryPosition(
  geometry: ParcelGeometry,
  visit: (position: number[]) => void
): void {
  if (!geometry) return;
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates as AnyRing[]) {
      for (const position of ring) visit(position);
    }
    return;
  }
  if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates as AnyRing[][]) {
      for (const ring of polygon) {
        for (const position of ring) visit(position);
      }
    }
  }
}

/** `[minLng, minLat, maxLng, maxLat]` across all rings of the geometry. */
export function geometryBBox(geometry: ParcelGeometry): BBox | null {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  forEachGeometryPosition(geometry, (position) => {
    const lng = position[0];
    const lat = position[1];
    if (typeof lng !== "number" || typeof lat !== "number") return;
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  });
  if (!Number.isFinite(minLng)) return null;
  return [minLng, minLat, maxLng, maxLat];
}

/** Arithmetic centroid of the exterior ring(s) — a display fallback only. */
export function geometryCentroid(geometry: ParcelGeometry): [number, number] | null {
  let lng = 0;
  let lat = 0;
  let count = 0;
  forEachGeometryPosition(geometry, (position) => {
    const px = position[0];
    const py = position[1];
    if (typeof px !== "number" || typeof py !== "number") return;
    lng += px;
    lat += py;
    count += 1;
  });
  if (count === 0) return null;
  return [lng / count, lat / count];
}

/** Builds the authoritative GeoJSON Feature for one parcel. */
export function parcelFeatureFromParcel(parcel: Parcel, restriction?: string): ParcelFeature {
  const bbox = geometryBBox(parcel.geometry);
  const centroid = geometryCentroid(parcel.geometry);
  const properties: ParcelFeatureProperties = {
    parcelId: parcel.id,
    ULPIN: parcel.ulpin,
    area: parcel.area,
    landUse: parcel.landUse,
    status: parcel.status,
    risk: parcel.risk,
    owner: parcel.owner,
    locality: parcel.locality,
    updatedAt: parcel.lastUpdated,
    ...(parcel.surveyNumber ? { surveyNumber: parcel.surveyNumber } : {}),
    ...(parcel.district ? { district: parcel.district } : {}),
    ...(parcel.state ? { state: parcel.state } : {}),
    ...(parcel.details?.geometry.srid !== null && parcel.details?.geometry.srid !== undefined
      ? { srid: parcel.details.geometry.srid }
      : {}),
    ...(parcel.details?.geometry.geometryType
      ? { geometryType: parcel.details.geometry.geometryType }
      : {}),
    ...(centroid ? { centroid } : {}),
    ...(bbox ? { bbox } : {}),
    ...(parcel.details ? { details: parcel.details } : {}),
    ...(restriction ? { restriction } : {}),
  };
  return { type: "Feature", properties, geometry: parcel.geometry };
}

/** Builds the FeatureCollection served to MapLibre. */
export function parcelFeatureCollection(
  parcels: Parcel[],
  restrictionTypes: Map<string, string[]>
): ParcelFeatureCollection {
  return {
    type: "FeatureCollection",
    features: parcels.map((parcel) => {
      const types = restrictionTypes.get(parcel.id);
      return parcelFeatureFromParcel(parcel, types && types.length > 0 ? types.join(", ") : undefined);
    }),
  };
}

/** Aggregate extent across parcels, preferring each row's PostGIS bbox. */
export function collectionBBox(features: ParcelFeature[]): BBox | null {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const feature of features) {
    const bbox = feature.properties.bbox ?? geometryBBox(feature.geometry);
    if (!bbox) continue;
    if (bbox[0] < minLng) minLng = bbox[0];
    if (bbox[1] < minLat) minLat = bbox[1];
    if (bbox[2] > maxLng) maxLng = bbox[2];
    if (bbox[3] > maxLat) maxLat = bbox[3];
  }
  if (!Number.isFinite(minLng)) return null;
  return [minLng, minLat, maxLng, maxLat];
}
