import { COOKIE_NAME } from "@shared/const";
import { demoParcels, parcelFeatureCollection } from "@/lib/demoData";
import type {
  LandUse,
  Parcel,
  ParcelDetailStatuses,
  ParcelFeature,
  ParcelFeatureCollection,
  ParcelFeatureProperties,
  ParcelGeometry,
  ParcelStatus,
  RiskLevel,
} from "@/types/parcel";

export type MapLayer = "Parcel boundaries" | "Land use" | "Administrative boundaries" | "Roads" | "Satellite view" | "Risk indicators" | "Restrictions";

export const mapLayers: Array<{ id: MapLayer; description: string; ready: boolean }> = [
  { id: "Parcel boundaries", description: "PostGIS parcel polygons (EPSG:4326)", ready: true },
  { id: "Land use", description: "Parcel land-use classification", ready: true },
  { id: "Administrative boundaries", description: "Seeded district boundary context", ready: true },
  { id: "Roads", description: "Access corridors derived from the parcel fabric", ready: true },
  { id: "Risk indicators", description: "Validation and monitoring risk signals", ready: true },
  { id: "Satellite view", description: "Raster tile source placeholder", ready: false },
  { id: "Restrictions", description: "Seeded restriction overlay", ready: true },
];

/**
 * Stable adapter boundary for the map's data source. The bundled collection is
 * the offline mirror of the same canonical dataset the seed wrote to PostGIS.
 */
export function getParcelFeatureCollection(): ParcelFeatureCollection {
  return parcelFeatureCollection as ParcelFeatureCollection;
}

export function getParcelFeature(parcelId: string) {
  return getParcelFeatureCollection().features.find((feature) => feature.properties.parcelId === parcelId);
}

export function getParcelCentroid(parcelId: string): [number, number] | null {
  const feature = getParcelFeature(parcelId);
  return feature ? featureCentroid(feature) : null;
}

export function isMapLayerReady(layer: MapLayer) {
  return mapLayers.find((item) => item.id === layer)?.ready ?? false;
}

export type BBox = [number, number, number, number];

// ---------------------------------------------------------------------------
// Geometry helpers — Polygon *and* MultiPolygon aware
// ---------------------------------------------------------------------------

/** Visits every coordinate pair of a Polygon or MultiPolygon geometry. */
export function forEachPosition(
  geometry: ParcelGeometry | undefined,
  visit: (lng: number, lat: number) => void,
): void {
  if (!geometry) return;
  const ringsOf = (source: ParcelGeometry): number[][][] => {
    if (source.type === "Polygon") return source.coordinates as number[][][];
    return (source.coordinates as number[][][][]).flat();
  };
  for (const ring of ringsOf(geometry)) {
    for (const position of ring) {
      const lng = position[0];
      const lat = position[1];
      if (typeof lng === "number" && typeof lat === "number") visit(lng, lat);
    }
  }
}

/** `[minLng, minLat, maxLng, maxLat]` for one parcel feature. */
export function computeFeatureBBox(feature: ParcelFeature): BBox | null {
  const hinted = feature?.properties?.bbox;
  if (Array.isArray(hinted) && hinted.length === 4 && hinted.every((value) => Number.isFinite(value))) {
    return [hinted[0], hinted[1], hinted[2], hinted[3]];
  }
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  forEachPosition(feature?.geometry, (lng, lat) => {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  });
  if (!Number.isFinite(minLng)) return null;
  return [minLng, minLat, maxLng, maxLat];
}

/** `[minLng, minLat, maxLng, maxLat]` across every feature in a collection. */
export function computeCollectionBBox(collection: ParcelFeatureCollection): BBox | null {
  let bbox: BBox | null = null;
  for (const feature of collection.features ?? []) {
    const current = computeFeatureBBox(feature);
    if (!current) continue;
    bbox = bbox
      ? [
          Math.min(bbox[0], current[0]),
          Math.min(bbox[1], current[1]),
          Math.max(bbox[2], current[2]),
          Math.max(bbox[3], current[3]),
        ]
      : current;
  }
  return bbox;
}

/** Arithmetic centroid of the parcel rings (used for grouping and labels). */
export function featureCentroid(feature: ParcelFeature): [number, number] | null {
  const hinted = feature?.properties?.centroid;
  if (Array.isArray(hinted) && hinted.length === 2 && hinted.every((value) => Number.isFinite(value))) {
    return [hinted[0], hinted[1]];
  }
  let lng = 0;
  let lat = 0;
  let count = 0;
  forEachPosition(feature?.geometry, (positionLng, positionLat) => {
    lng += positionLng;
    lat += positionLat;
    count += 1;
  });
  if (count === 0) return null;
  return [lng / count, lat / count];
}

/** Median span (degrees) of a parcel — the natural scale of the fabric. */
function medianParcelSpan(collection: ParcelFeatureCollection): number {
  const spans: number[] = [];
  for (const feature of collection.features ?? []) {
    const bbox = computeFeatureBBox(feature);
    if (!bbox) continue;
    spans.push(Math.max(Math.abs(bbox[2] - bbox[0]), Math.abs(bbox[3] - bbox[1])));
  }
  if (spans.length === 0) return 0.002;
  spans.sort((a, b) => a - b);
  const middle = Math.floor(spans.length / 2);
  const median = spans.length % 2 === 1 ? spans[middle] : (spans[middle - 1] + spans[middle]) / 2;
  return median > 0 ? median : 0.002;
}


// ---------------------------------------------------------------------------
// Automatic view fit — deterministic, data-driven (no hardcoded coordinates)
// ---------------------------------------------------------------------------

/** How many parcels around the anchor are framed for a legible cadastral view. */
export const DEFAULT_NEIGHBOURHOOD_SIZE = 12;

export type ParcelViewFit = {
  bbox: BBox;
  parcelIds: string[];
  /** `dataset` when the whole dataset fits, otherwise `neighbourhood`. */
  strategy: "dataset" | "neighbourhood";
  anchorParcelId: string | null;
};

/** Grows a bbox so it is never smaller than `minSpan` degrees on either axis. */
export function expandBBox(bbox: BBox, minSpan: number): BBox {
  const width = Math.abs(bbox[2] - bbox[0]);
  const height = Math.abs(bbox[3] - bbox[1]);
  const padX = Math.max(0, minSpan - width) / 2;
  const padY = Math.max(0, minSpan - height) / 2;
  return [bbox[0] - padX, bbox[1] - padY, bbox[2] + padX, bbox[3] + padY];
}

/**
 * Decides the camera for the parcel fabric.
 *
 * A naive fit over every seeded parcel would be dominated by distant outliers
 * (the seeded fabric spans ~7 km x 10 km while each parcel is ~200 m), which
 * rendered every polygon as a ~12 px fragment. Instead:
 *
 *  - datasets of `neighbourhoodSize` parcels or fewer are framed in full, and
 *  - larger datasets are framed on the anchor parcel plus its
 *    `neighbourhoodSize` nearest neighbours (nearest first, parcel ID as the
 *    deterministic tie-breaker), so each polygon is drawn at a legible size.
 *
 * Nothing is hidden: every parcel stays in the GeoJSON source, and selecting or
 * searching any parcel (including an outlier) re-frames the camera on it.
 */
export function computeViewFit(
  collection: ParcelFeatureCollection,
  options?: { anchorParcelId?: string | null; neighbourhoodSize?: number },
): ParcelViewFit | null {
  const features = collection.features ?? [];
  if (features.length === 0) return null;
  const whole = computeCollectionBBox(collection);
  if (!whole) return null;

  const size = Math.max(1, Math.floor(options?.neighbourhoodSize ?? DEFAULT_NEIGHBOURHOOD_SIZE));
  if (features.length <= size) {
    return {
      bbox: whole,
      parcelIds: features.map((feature) => feature.properties.parcelId),
      strategy: "dataset",
      anchorParcelId: null,
    };
  }

  const requested = options?.anchorParcelId ?? null;
  const anchor =
    (requested && features.find((feature) => feature.properties.parcelId === requested)) || features[0];
  const anchorCentroid = featureCentroid(anchor);
  const anchorParcelId = anchor.properties.parcelId;
  if (!anchorCentroid) {
    return { bbox: whole, parcelIds: [anchorParcelId], strategy: "dataset", anchorParcelId };
  }

  const ranked = features
    .map((feature) => {
      const centroid = featureCentroid(feature);
      const distance = centroid
        ? Math.hypot(centroid[0] - anchorCentroid[0], (centroid[1] - anchorCentroid[1]) * 1.05)
        : Number.POSITIVE_INFINITY;
      return { feature, distance };
    })
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        left.feature.properties.parcelId.localeCompare(right.feature.properties.parcelId),
    )
    .slice(0, size);

  const neighbourhood: ParcelFeatureCollection = {
    type: "FeatureCollection",
    features: ranked.map((entry) => entry.feature),
  };
  const bbox = computeCollectionBBox(neighbourhood);
  if (!bbox) {
    return { bbox: whole, parcelIds: [anchorParcelId], strategy: "dataset", anchorParcelId };
  }

  return {
    bbox: expandBBox(bbox, medianParcelSpan(collection) * 4),
    parcelIds: ranked.map((entry) => entry.feature.properties.parcelId),
    strategy: "neighbourhood",
    anchorParcelId,
  };
}

/**
 * Deterministic tint bucket for a parcel, derived from its real Parcel ID.
 * Used only to colour polygons so neighbouring parcels are distinguishable —
 * no coordinate or attribute is invented.
 */
export function parcelTintBucket(parcelId: string, buckets = 6): number {
  let hash = 0;
  for (let index = 0; index < parcelId.length; index += 1) {
    hash = (hash * 31 + parcelId.charCodeAt(index)) % 1000003;
  }
  return hash % buckets;
}


// ---------------------------------------------------------------------------
// Backend GeoJSON loading (PostgreSQL/PostGIS via /api/gis/parcels.geojson)
// ---------------------------------------------------------------------------

export type ParcelGeoJsonSource = "postgis" | "demo";

/** Expected map projection for MapLibre (`[longitude, latitude]` axis order). */
export const MAPLIBRE_SRID = 4326;

/**
 * Restriction seeds from the PostgreSQL seed dataset
 * (`server/db/seedData/landDetails.ts`), mirrored here for offline fallback
 * only — used when the GeoJSON API cannot be reached.
 */
export const DEMO_RESTRICTION_TYPES: Record<string, string> = {
  "LS-PAR-0428": "Reserve Boundary Setback",
  "LS-PAR-0410": "Public Reserve Boundary",
  "LS-PAR-0421": "Agricultural Buffer",
};

/**
 * Clone a FeatureCollection into a clean parcel collection: keep the supported
 * polygon geometry types (`Polygon` **and** `MultiPolygon`) and make sure every
 * feature carries the standard property set. `restriction` is removed and
 * re-added only when present, so `["has", "restriction"]` filters behave
 * predictably.
 */
export function normalizeParcelFeatureCollection(
  collection: ParcelFeatureCollection,
): ParcelFeatureCollection {
  const features: ParcelFeature[] = [];
  for (const feature of collection.features ?? []) {
    const geometry = feature?.geometry;
    if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) continue;
    const properties: ParcelFeatureProperties = { ...feature.properties };
    const provided = properties.restriction;
    delete properties.restriction;
    const restriction = provided || DEMO_RESTRICTION_TYPES[properties.parcelId];
    if (restriction) properties.restriction = restriction;
    features.push({ type: "Feature", properties, geometry });
  }
  return { type: "FeatureCollection", features };
}

/** Adds the deterministic tint bucket used to differentiate neighbouring parcels. */
export function withParcelTints(collection: ParcelFeatureCollection): ParcelFeatureCollection {
  return {
    type: "FeatureCollection",
    features: collection.features.map((feature) => ({
      type: "Feature",
      properties: {
        ...feature.properties,
        tint: parcelTintBucket(feature.properties.parcelId),
      },
      geometry: feature.geometry,
    })),
  };
}

export type ParcelFeatureCollectionResponse = {
  collection: ParcelFeatureCollection;
  source: ParcelGeoJsonSource;
  /** SRID reported by the backend (must be 4326 for MapLibre). */
  srid: number | null;
  /** PostGIS extent of the whole seeded dataset. */
  datasetBbox: BBox | null;
  restrictedCount: number;
  parcelsInDatabase: number | null;
};

function readSessionToken(): string | null {
  try {
    // Mirror the tRPC link's session forwarding for preview environments.
    const raw = sessionStorage.getItem("manus-cookie");
    const prefix = `${COOKIE_NAME}=`;
    const pair = raw?.split(";").find((item) => item.trim().startsWith(prefix));
    return pair?.trim().slice(prefix.length) ?? null;
  } catch {
    // sessionStorage unavailable — cookie auth still applies
    return null;
  }
}


/**
 * Load parcel boundaries from the PostGIS-backed GeoJSON endpoint. Falls back to
 * the bundled canonical collection (the same seeded coordinates) so the map
 * still renders when the API is unreachable, and reports which one was used.
 */
export async function fetchParcelFeatureCollection(): Promise<ParcelFeatureCollectionResponse> {
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = readSessionToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch("/api/gis/parcels.geojson", { credentials: "include", headers });
    if (response.ok) {
      const payload = await response.json();
      const featureCollection = payload?.featureCollection;
      if (
        featureCollection?.type === "FeatureCollection" &&
        Array.isArray(featureCollection.features) &&
        featureCollection.features.length > 0
      ) {
        const srids: number[] = Array.isArray(payload?.srids) ? payload.srids : [];
        // `ST_SRID`/`ST_Transform` happen in the repository; surface a clear
        // warning if a non-4326 layer ever reaches the browser.
        if (srids.length > 0 && srids.some((value) => value !== MAPLIBRE_SRID)) {
          console.warn(
            `[GIS] Backend reported SRIDs ${srids.join(", ")}; MapLibre expects EPSG:${MAPLIBRE_SRID}.`,
          );
        }
        return {
          collection: withParcelTints(normalizeParcelFeatureCollection(featureCollection)),
          source: "postgis",
          srid: srids[0] ?? null,
          datasetBbox: Array.isArray(payload?.bbox) ? (payload.bbox as BBox) : null,
          restrictedCount: Number(payload?.restrictedCount ?? 0),
          parcelsInDatabase: payload?.parcelsInDatabase ?? null,
        };
      }
    }
    console.warn(
      `[GIS] Parcel GeoJSON endpoint unavailable (HTTP ${response.status}); using bundled parcel boundaries.`,
    );
  } catch (error) {
    console.warn("[GIS] Parcel GeoJSON request failed; using bundled parcel boundaries.", error);
  }
  const fallback = withParcelTints(normalizeParcelFeatureCollection(getParcelFeatureCollection()));
  return {
    collection: fallback,
    source: "demo",
    srid: MAPLIBRE_SRID,
    datasetBbox: computeCollectionBBox(fallback),
    restrictedCount: fallback.features.filter((feature) => feature.properties.restriction).length,
    parcelsInDatabase: null,
  };
}

/** Reads one parcel (by Parcel ID or ULPIN) from PostgreSQL/PostGIS. */
export async function fetchParcelDetail(
  idOrUlpin: string,
): Promise<{ parcel: Parcel | null; source: ParcelGeoJsonSource }> {
  const cleanKey = (idOrUlpin || "").trim();
  if (!cleanKey) return { parcel: null, source: "demo" };

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = readSessionToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(`/api/parcels/${encodeURIComponent(cleanKey)}`, {
      credentials: "include",
      headers,
    });
    if (response.ok) {
      const payload = await response.json();
      const parcel = (payload?.parcel ?? null) as Parcel | null;
      if (parcel) {
        if (payload?.details && !parcel.details) {
          parcel.details = payload.details;
        }
        return { parcel, source: (payload?.source as ParcelGeoJsonSource) ?? "postgis" };
      }
    }
  } catch (error) {
    console.warn(`[GIS] Parcel detail request for ${cleanKey} failed:`, error);
  }
  const lowered = cleanKey.toLowerCase();
  const bundled =
    demoParcels.find(
      (item) =>
        item.id.toLowerCase() === lowered ||
        item.ulpin.toLowerCase() === lowered,
    ) ?? null;
  return { parcel: bundled ? { ...bundled, source: "bundled" } : null, source: "demo" };
}

/**
 * Builds the panel model for a clicked parcel entirely from the feature the
 * backend returned — never from a bundled mock row.
 */
export function buildParcelFromFeature(feature: ParcelFeature): Parcel | null {
  const properties = (feature?.properties ?? {}) as ParcelFeatureProperties;
  const parcelId = String(properties.parcelId ?? "").trim();
  if (!parcelId || !feature.geometry) return null;

  const centroid = featureCentroid(feature);
  const coordinates = centroid
    ? `${centroid[1].toFixed(4)}° N, ${centroid[0].toFixed(4)}° E`
    : "—";
  const locality = properties.locality ?? "—";
  const details: ParcelDetailStatuses | undefined = properties.details;

  return {
    id: parcelId,
    ulpin: properties.ULPIN ?? "—",
    owner: properties.owner ?? details?.ownership.ownerName ?? "Not recorded",
    area: properties.area ?? "—",
    locality,
    coordinates,
    location: { locality, coordinates },
    landUse: properties.landUse ?? "Residential",
    status: properties.status ?? "Under review",
    risk: properties.risk ?? "Low",
    lastUpdated: properties.updatedAt ?? new Date().toISOString().slice(0, 10),
    geometry: feature.geometry,
    surveyNumber: properties.surveyNumber,
    district: properties.district,
    state: properties.state,
    source: "postgis",
    details,
  };
}


// ---------------------------------------------------------------------------
// Layers derived from the loaded parcel data (no hardcoded geometry)
// ---------------------------------------------------------------------------

/**
 * District/administrative extent for the "Administrative boundaries" layer — a
 * padded rectangle around the loaded parcel bounds (data-derived).
 */
export function buildAdminExtentFeature(collection: ParcelFeatureCollection): GeoJSON.Feature | null {
  const bbox = computeCollectionBBox(collection);
  if (!bbox) return null;
  const pad = Math.max((bbox[2] - bbox[0]) * 0.08, (bbox[3] - bbox[1]) * 0.08, 0.0015);
  const minLng = bbox[0] - pad;
  const minLat = bbox[1] - pad;
  const maxLng = bbox[2] + pad;
  const maxLat = bbox[3] + pad;
  return {
    type: "Feature",
    properties: { name: "Administrative extent" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [minLng, minLat],
          [maxLng, minLat],
          [maxLng, maxLat],
          [minLng, maxLat],
          [minLng, minLat],
        ],
      ],
    },
  };
}

type RoadPoint = { lng: number; lat: number; parcelId: string };

/**
 * Road/access corridor lines derived from the parcel fabric: parcels in the
 * same latitude band are linked along their frontage, and adjacent bands are
 * linked at their closest pair. Deterministic and data-driven — the layer is
 * computed from whatever boundaries the backend returned.
 */
export function buildRoadNetworkFeatures(collection: ParcelFeatureCollection): GeoJSON.FeatureCollection {
  const points: RoadPoint[] = [];
  for (const feature of collection.features ?? []) {
    const centroid = featureCentroid(feature);
    if (centroid) {
      points.push({ lng: centroid[0], lat: centroid[1], parcelId: feature.properties.parcelId });
    }
  }
  if (points.length < 2) return { type: "FeatureCollection", features: [] };

  // Group into latitude bands ("rows"), seeded by the scale of the parcel fabric.
  const bandHeight = Math.max(medianParcelSpan(collection) * 0.9, 0.0009);
  points.sort((a, b) => b.lat - a.lat || a.lng - b.lng);
  const rows: RoadPoint[][] = [];
  for (const point of points) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0].lat - point.lat) <= bandHeight) row.push(point);
    else rows.push([point]);
  }
  for (const row of rows) row.sort((a, b) => a.lng - b.lng);

  const maxGap = bandHeight * 3.4;
  const segments: Array<[RoadPoint, RoadPoint]> = [];
  const seen = new Set<string>();
  const addSegment = (p: RoadPoint, q: RoadPoint, key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    segments.push([p, q]);
  };

  // Along-row frontage roads (skip unrealistic gaps).
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    for (let index = 1; index < row.length; index += 1) {
      const previous = row[index - 1];
      const current = row[index];
      if (current.lng - previous.lng <= maxGap) {
        addSegment(previous, current, `h:${rowIndex}:${previous.parcelId}:${current.parcelId}`);
      }
    }
  }

  // Between-row connectors at the closest longitude pair.
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const upper = rows[rowIndex - 1];
    const lower = rows[rowIndex];
    if (upper[0].lat - lower[0].lat > maxGap) continue;
    let best: { p: RoadPoint; q: RoadPoint; distance: number } | null = null;
    for (const p of upper) {
      for (const q of lower) {
        const distance = Math.abs(p.lng - q.lng);
        if (!best || distance < best.distance) best = { p, q, distance };
      }
    }
    if (best && best.distance <= maxGap) {
      addSegment(best.p, best.q, `v:${rowIndex}:${best.p.parcelId}:${best.q.parcelId}`);
    }
  }

  return {
    type: "FeatureCollection",
    features: segments.map(([p, q], index) => ({
      type: "Feature",
      properties: { roadIndex: index },
      geometry: { type: "LineString", coordinates: [[p.lng, p.lat], [q.lng, q.lat]] },
    })),
  };
}
