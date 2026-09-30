import { useEffect, useRef, useState } from "react";
import { Layers3, Satellite, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { MapLayer } from "@/lib/gis";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  buildAdminExtentFeature,
  buildParcelFromFeature,
  buildRoadNetworkFeatures,
  computeFeatureBBox,
  computeViewFit,
  fetchParcelDetail,
  fetchParcelFeatureCollection,
  MAPLIBRE_SRID,
} from "@/lib/gis";
import type { Parcel, ParcelFeature, ParcelFeatureProperties } from "@/types/parcel";

type ParcelMapPreviewProps = {
  selectedParcel?: Parcel;
  onSelect?: (parcel: Parcel) => void;
  compact?: boolean;
  activeLayer?: MapLayer;
  activeGisLayers?: string[];
  onLayerChange?: (layer: MapLayer) => void;
  /**
   * Called with the PostgreSQL/PostGIS detail (ownership, registration, tax,
   * encumbrance, validation) of a clicked parcel so a host panel can show the
   * authoritative record instead of bundled mock fields.
   */
  onParcelDetail?: (parcel: Parcel) => void;
};

/**
 * MapLibre style: OpenStreetMap raster tiles as the real-world basemap.
 * All parcel content comes from the GeoJSON sources added once the map loads
 * (PostGIS parcel boundaries via /api/gis/parcels.geojson), rendered as
 * overlays on top of the basemap.
 */
const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#e8ecf0" } },
    { id: "osm-basemap", type: "raster", source: "osm-tiles", paint: { "raster-opacity": 1 } },
  ],
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
};

// Theme colors from client/src/index.css (:root) so the map matches the app.
const THEME_GREEN = "#2b9b68";
const THEME_AMBER = "#c68322";
const THEME_RED = "#d95d60";

/**
 * Distinct fill per parcel, keyed on the deterministic tint bucket derived from
 * the real Parcel ID, so neighbouring parcels never look identical.
 */
const PARCEL_TINT_FILL = [
  "match",
  ["get", "tint"],
  0, "#60a5fa",
  1, "#4ade80",
  2, "#facc15",
  3, "#fb923c",
  4, "#a78bfa",
  5, "#22d3ee",
  "#60a5fa",
];

const LAND_USE_FILL = [
  "match",
  ["get", "landUse"],
  "Residential", "#60a5fa",
  "Mixed use", "#a78bfa",
  "Agricultural", "#4ade80",
  "Institutional", "#facc15",
  "Commercial", "#fb923c",
  "#94a3b8",
];

const STATUS_FILL = ["match", ["get", "status"], "Verified", THEME_GREEN, "Under review", THEME_AMBER, "Flagged", THEME_RED, "#3b82f6"];

const RISK_FILL = ["match", ["get", "risk"], "Low", THEME_GREEN, "Medium", THEME_AMBER, "High", THEME_RED, "#94a3b8"];

/**
 * Boundary width scales with zoom so parcel outlines stay crisp and legible
 * when the camera is framed on a single parcel. Cadastral lines should be thin.
 */
const PARCEL_LINE_WIDTH = ["interpolate", ["linear"], ["zoom"], 10, 1.0, 13, 1.5, 16, 2];
const SELECTED_LINE_WIDTH = ["interpolate", ["linear"], ["zoom"], 10, 3, 13, 4, 16, 5];


type LayerModeVisual = {
  basemapOpacity: number;
  fillColor: unknown;
  fillOpacity: number;
  lineColor: string;
  lineWidth: unknown;
  lineOpacity: number;
  admin: boolean;
  roads: boolean;
  restrictions: boolean;
};

/**
 * Presentation per layer toggle. Every mode re-styles the same real PostGIS
 * parcel dataset (plus layers derived from it), so each toggle visibly changes
 * the map instead of only updating its label.  basemapOpacity dims or brightens
 * the OSM raster tiles to let the parcel overlay stand out.
 */
const LAYER_MODES: Record<MapLayer, LayerModeVisual> = {
  "Parcel boundaries": { basemapOpacity: 1.0, fillColor: PARCEL_TINT_FILL, fillOpacity: 0.12, lineColor: "#3b82f6", lineWidth: PARCEL_LINE_WIDTH, lineOpacity: 0.8, admin: false, roads: false, restrictions: false },
  "Land use":           { basemapOpacity: 0.9,  fillColor: LAND_USE_FILL,    fillOpacity: 0.12, lineColor: "#1e293b", lineWidth: PARCEL_LINE_WIDTH, lineOpacity: 0.8, admin: false, roads: false, restrictions: false },
  "Administrative boundaries": { basemapOpacity: 1.0, fillColor: PARCEL_TINT_FILL, fillOpacity: 0.0, lineColor: "#3b82f6", lineWidth: PARCEL_LINE_WIDTH, lineOpacity: 0.8, admin: true, roads: false, restrictions: false },
  "Roads":              { basemapOpacity: 1.0,  fillColor: PARCEL_TINT_FILL, fillOpacity: 0.0, lineColor: "#64748b", lineWidth: 1.2, lineOpacity: 0.5, admin: false, roads: true, restrictions: false },
  "Risk indicators":    { basemapOpacity: 0.9, fillColor: RISK_FILL,        fillOpacity: 0.20, lineColor: "#0f2e50", lineWidth: PARCEL_LINE_WIDTH, lineOpacity: 0.8, admin: false, roads: false, restrictions: false },
  "Satellite view":     { basemapOpacity: 0.4, fillColor: "#38bdf8",        fillOpacity: 0.15,  lineColor: "#e2e8f0", lineWidth: PARCEL_LINE_WIDTH, lineOpacity: 0.8, admin: false, roads: false, restrictions: false },
  "Restrictions":       { basemapOpacity: 1.0,  fillColor: PARCEL_TINT_FILL, fillOpacity: 0.15, lineColor: "#ef4444", lineWidth: 1.1, lineOpacity: 0.8, admin: false, roads: false, restrictions: true },
};

/** Layer ids that always exist once the style is loaded and parcel data is in. */
const PARCEL_LAYER_IDS = [
  "parcel-fill",
  "parcel-line",
  "parcel-label",
  "admin-extent-fill",
  "admin-extent-line",
  "roads-casing",
  "roads-line",
  "restriction-fill",
  "restriction-line",
  "selected-parcel-fill",
  "selected-parcel-line",
  "selected-parcel-label",
];

function applyLayerMode(map: maplibregl.Map, mode: MapLayer, activeGisLayers?: string[], container?: HTMLElement | null) {
  if (activeGisLayers) {
    const hasCadastral = activeGisLayers.includes("Georeferenced Cadastral Maps");
    const hasParcel = activeGisLayers.includes("Parcel Boundaries");
    const hasULPIN = activeGisLayers.includes("ULPIN / Unique Parcel Identifier");
    const hasLandUse = activeGisLayers.includes("Land Use & Zoning");
    const hasAdmin = activeGisLayers.includes("Administrative Boundaries (Village / Tehsil)");
    const hasRestrictions = activeGisLayers.includes("Restriction Zones");
    const hasRisk = activeGisLayers.includes("AI Validation Risk");

    if (map.getLayer("osm-basemap")) {
      map.setPaintProperty("osm-basemap", "raster-opacity", hasCadastral ? 1.0 : 0.4);
    }
    map.setLayoutProperty("parcel-fill", "visibility", (hasParcel || hasLandUse || hasRisk) ? "visible" : "none");
    map.setLayoutProperty("parcel-line", "visibility", hasParcel ? "visible" : "none");
    map.setLayoutProperty("parcel-label", "visibility", hasULPIN ? "visible" : "none");

    const fillColor = hasRisk ? RISK_FILL : (hasLandUse ? LAND_USE_FILL : PARCEL_TINT_FILL);
    map.setPaintProperty("parcel-fill", "fill-color", fillColor as any);
    map.setPaintProperty("parcel-fill", "fill-opacity", hasRisk ? 0.20 : 0.15);
    
    map.setPaintProperty("parcel-line", "line-color", "#3b82f6");
    map.setPaintProperty("parcel-line", "line-opacity", 0.8);

    map.setLayoutProperty("restriction-fill", "visibility", hasRestrictions ? "visible" : "none");
    map.setLayoutProperty("restriction-line", "visibility", hasRestrictions ? "visible" : "none");

    map.setLayoutProperty("admin-extent-fill", "visibility", hasAdmin ? "visible" : "none");
    map.setLayoutProperty("admin-extent-line", "visibility", hasAdmin ? "visible" : "none");
    map.setLayoutProperty("roads-casing", "visibility", "none");
    map.setLayoutProperty("roads-line", "visibility", "none");

    if (container) {
      container.dataset.activeLayer = activeGisLayers.join(",");
      container.dataset.visibleLayers = activeGisLayers.join(",");
    }
    return;
  }

  const visual = LAYER_MODES[mode] ?? LAYER_MODES["Parcel boundaries"];
  // Dim/brighten the OSM basemap so parcel overlays read clearly.
  if (map.getLayer("osm-basemap")) {
    map.setPaintProperty("osm-basemap", "raster-opacity", visual.basemapOpacity);
  }
  map.setPaintProperty("parcel-fill", "fill-color", visual.fillColor as never);
  map.setPaintProperty("parcel-fill", "fill-opacity", visual.fillOpacity);
  map.setPaintProperty("parcel-line", "line-color", visual.lineColor);
  map.setPaintProperty("parcel-line", "line-width", visual.lineWidth as never);
  map.setPaintProperty("parcel-line", "line-opacity", visual.lineOpacity);
  map.setLayoutProperty("admin-extent-fill", "visibility", visual.admin ? "visible" : "none");
  map.setLayoutProperty("admin-extent-line", "visibility", visual.admin ? "visible" : "none");
  map.setLayoutProperty("roads-casing", "visibility", visual.roads ? "visible" : "none");
  map.setLayoutProperty("roads-line", "visibility", visual.roads ? "visible" : "none");
  map.setLayoutProperty("restriction-fill", "visibility", visual.restrictions ? "visible" : "none");
  map.setLayoutProperty("restriction-line", "visibility", visual.restrictions ? "visible" : "none");
  map.setLayoutProperty("parcel-label", "visibility", "visible"); // Always visible in legacy mode

  if (container) {
    const visible = ["osm-basemap", "parcel-fill", "parcel-line"];
    if (visual.admin) visible.push("admin-extent-fill", "admin-extent-line");
    if (visual.roads) visible.push("roads-casing", "roads-line");
    if (visual.restrictions) visible.push("restriction-fill", "restriction-line");
    visible.push("selected-parcel-fill", "selected-parcel-line", "parcel-label", "selected-parcel-label");
    container.dataset.activeLayer = mode;
    container.dataset.visibleLayers = visible.join(",");
  }
}

/**
 * Measures how large a parcel polygon is actually drawn, in CSS pixels, so the
 * "polygons must be clearly visible" requirement can be asserted instead of
 * eyeballed. Returns the median rendered width/height of the loaded parcels.
 */
function measureParcelPixelSize(
  map: maplibregl.Map,
  features: ParcelFeature[],
): number {
  const sizes: number[] = [];
  for (const feature of features) {
    const bbox = computeFeatureBBox(feature);
    if (!bbox) continue;
    const topLeft = map.project([bbox[0], bbox[3]]);
    const bottomRight = map.project([bbox[2], bbox[1]]);
    sizes.push(Math.max(Math.abs(bottomRight.x - topLeft.x), Math.abs(bottomRight.y - topLeft.y)));
  }
  if (sizes.length === 0) return 0;
  sizes.sort((a, b) => a - b);
  const middle = Math.floor(sizes.length / 2);
  const median = sizes.length % 2 === 1 ? sizes[middle] : (sizes[middle - 1] + sizes[middle]) / 2;
  return Math.round(median * 10) / 10;
}

/** Maps a clicked MapLibre feature into the panel model, from backend data only. */
function resolveParcelFromFeature(feature: {
  properties?: Record<string, unknown>;
  geometry?: unknown;
}): Parcel | null {
  const rawProps = feature.properties ?? {};
  const properties = rawProps as unknown as ParcelFeatureProperties;
  const parcelId = String(properties.parcelId ?? rawProps.id ?? "").trim();
  if (!parcelId) return null;
  return buildParcelFromFeature({
    type: "Feature",
    properties: { ...properties, parcelId },
    geometry: (feature.geometry as ParcelFeature["geometry"]) ?? { type: "Polygon", coordinates: [] },
  });
}


export function ParcelMapPreview({
  selectedParcel,
  onSelect,
  compact = false,
  activeLayer: controlledLayer,
  activeGisLayers,
  onLayerChange,
  onParcelDetail,
}: ParcelMapPreviewProps) {
  const [localLayer, setLocalLayer] = useState<MapLayer>("Parcel boundaries");
  const activeLayer = controlledLayer ?? localLayer;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const featuresRef = useRef<ParcelFeature[]>([]);
  const readyRef = useRef(false);
  const lastFittedParcelRef = useRef<string | null>(null);
  const activeLayerRef = useRef<MapLayer>(activeLayer);
  const activeGisLayersRef = useRef<string[] | undefined>(activeGisLayers);
  activeGisLayersRef.current = activeGisLayers;
  const onSelectRef = useRef(onSelect);
  const onDetailRef = useRef(onParcelDetail);
  const [mapReady, setMapReady] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);

  onSelectRef.current = onSelect;
  onDetailRef.current = onParcelDetail;
  activeLayerRef.current = activeLayer;

  // Initialize MapLibre: fetch the PostGIS parcel GeoJSON first so the camera
  // can be framed on the real data extent, then wire sources and layers once
  // the (network-free) style is loaded.
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;
    let cancelled = false;
    let instance: maplibregl.Map | null = null;

    void fetchParcelFeatureCollection().then(
      ({ collection, source, srid, datasetBbox, parcelsInDatabase }) => {
        if (cancelled || !mapContainerRef.current) return;
        featuresRef.current = collection.features;

        // Deterministic camera: the seeded fabric is far wider than a single
        // parcel, so the opening view is the anchor parcel + its neighbours.
        const view = computeViewFit(collection, {
          anchorParcelId: selectedParcel?.id ?? null,
        });
        const initialBBox = view?.bbox ?? datasetBbox;

        instance = new maplibregl.Map({
          container: mapContainerRef.current,
          style: BASE_STYLE as maplibregl.StyleSpecification,
          ...(initialBBox
            ? {
                bounds: [
                  [initialBBox[0], initialBBox[1]],
                  [initialBBox[2], initialBBox[3]],
                ] as maplibregl.LngLatBoundsLike,
                fitBoundsOptions: { padding: compact ? 26 : 54, maxZoom: 18 },
              }
            : { center: [78.4867, 17.385] as [number, number], zoom: 14 }),
          maxZoom: 19,
          minZoom: 3,
        });
        mapRef.current = instance;
        (container as unknown as { __maplibre?: maplibregl.Map }).__maplibre = instance;
        container.dataset.source = source;
        container.dataset.parcelCount = String(collection.features.length);
        container.dataset.srid = String(srid ?? MAPLIBRE_SRID);
        container.dataset.datasetBbox = datasetBbox ? datasetBbox.join(",") : "";
        container.dataset.parcelsInDatabase = String(parcelsInDatabase ?? collection.features.length);
        container.dataset.fitStrategy = view?.strategy ?? "none";
        container.dataset.fitParcels = String(view?.parcelIds.length ?? 0);

        instance.on("load", () => {
          const map = mapRef.current;
          if (!map || cancelled) return;


          const adminFeature = buildAdminExtentFeature(collection);
          map.addSource("parcels", { type: "geojson", data: collection });
          map.addSource("admin-extent", {
            type: "geojson",
            data: { type: "FeatureCollection", features: adminFeature ? [adminFeature] : [] },
          });
          map.addSource("roads", { type: "geojson", data: buildRoadNetworkFeatures(collection) });
          map.addSource("selected-parcel", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });

          // Layer order defines z-order. parcel-fill stays visible in every mode
          // so parcel click selection keeps working across toggles.
          map.addLayer({
            id: "parcel-fill",
            type: "fill",
            source: "parcels",
            paint: {
              "fill-color": PARCEL_TINT_FILL as never,
              "fill-opacity": 0.38,
              "fill-outline-color": "rgba(0,0,0,0)",
            },
          });
          map.addLayer({
            id: "parcel-line",
            type: "line",
            source: "parcels",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#0f2e50",
              "line-width": PARCEL_LINE_WIDTH as never,
              "line-opacity": 1,
            },
          });
          map.addLayer({
            id: "parcel-label",
            type: "symbol",
            source: "parcels",
            minzoom: 15,
            layout: {
              "text-field": ["concat", ["get", "parcelId"], "\n", ["get", "ULPIN"]],
              "text-size": 12,
              "text-overlap": "never",
            },
            paint: {
              "text-color": "#0f2e50",
              "text-halo-color": "rgba(255,255,255,0.8)",
              "text-halo-width": 1.5,
            },
          });
          map.addLayer({ id: "admin-extent-fill", type: "fill", source: "admin-extent", paint: { "fill-color": "#2c6ce6", "fill-opacity": 0.05 }, layout: { visibility: "none" } });
          map.addLayer({ id: "admin-extent-line", type: "line", source: "admin-extent", paint: { "line-color": "#152b47", "line-width": 2.5, "line-dasharray": [3, 2] }, layout: { visibility: "none" } });
          map.addLayer({ id: "roads-casing", type: "line", source: "roads", paint: { "line-color": "#ffffff", "line-width": 5, "line-opacity": 0.85 }, layout: { visibility: "none" } });
          map.addLayer({ id: "roads-line", type: "line", source: "roads", paint: { "line-color": THEME_AMBER, "line-width": 2.5 }, layout: { visibility: "none" } });
          map.addLayer({ id: "restriction-fill", type: "fill", source: "parcels", filter: ["has", "restriction"], paint: { "fill-color": THEME_RED, "fill-opacity": 0.35 }, layout: { visibility: "none" } });
          map.addLayer({ id: "restriction-line", type: "line", source: "parcels", filter: ["has", "restriction"], paint: { "line-color": "#8f2f33", "line-width": 2.5 }, layout: { visibility: "none" } });
          map.addLayer({ id: "selected-parcel-fill", type: "fill", source: "selected-parcel", paint: { "fill-color": "#3b82f6", "fill-opacity": 0.4 } });
          map.addLayer({
            id: "selected-parcel-line",
            type: "line",
            source: "selected-parcel",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#60a5fa", "line-width": SELECTED_LINE_WIDTH as never, "line-opacity": 1.0 },
          });
          map.addLayer({
            id: "selected-parcel-label",
            type: "symbol",
            source: "selected-parcel",
            layout: {
              "text-field": ["get", "parcelId"],
              "text-size": 14,
              "text-overlap": "never",
            },
            paint: {
              "text-color": "#93c5fd",
              "text-halo-color": "rgba(15,24,43,0.9)",
              "text-halo-width": 2,
            },
          });

          const publishPixelSize = () => {
            const active = mapRef.current;
            if (!active || cancelled) return;
            container.dataset.parcelPixelSize = String(
              measureParcelPixelSize(active, featuresRef.current),
            );
          };

          // Any parcel polygon hit selects that Parcel ID — including the
          // highlight overlay and restriction overlay drawn above it.
          const clickLayers = [
            "restriction-fill",
            "restriction-line",
            "selected-parcel-fill",
            "selected-parcel-line",
            "parcel-fill",
            "parcel-line",
          ];
          const onParcelClick = (event: maplibregl.MapLayerMouseEvent) => {
            const hits = event.features ?? [];
            const target = hits.find(
              (feature) => feature.properties?.parcelId || feature.properties?.id,
            );
            const parcel = target ? resolveParcelFromFeature(target) : null;
            if (!parcel) return;
            onSelectRef.current?.(parcel);
            toast.success(`${parcel.id} selected`, {
              description: "Parcel identity is ready for the next workflow stage.",
            });
            // Enrich the panel with the authoritative PostGIS record.
            void fetchParcelDetail(parcel.id).then(({ parcel: detail }) => {
              if (detail && onDetailRef.current) onDetailRef.current(detail);
            });
          };
          map.on("click", clickLayers, onParcelClick);
          map.on("mouseenter", clickLayers, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", clickLayers, () => {
            map.getCanvas().style.cursor = "default";
          });
          map.on("zoomend", () => {
            setZoom(map.getZoom());
            publishPixelSize();
          });


          // Frame the camera after layout settles, then report the achieved
          // on-screen parcel size for verification.
          requestAnimationFrame(() => {
            const active = mapRef.current;
            if (!active || cancelled) return;
            active.resize();
            if (initialBBox) {
              active.fitBounds(
                [
                  [initialBBox[0], initialBBox[1]],
                  [initialBBox[2], initialBBox[3]],
                ] as maplibregl.LngLatBoundsLike,
                { padding: compact ? 26 : 54, maxZoom: 16, duration: 0 },
              );
            }
            setZoom(active.getZoom());
            publishPixelSize();
          });

          applyLayerMode(map, activeLayerRef.current, activeGisLayersRef.current, container);
          readyRef.current = true;
          setMapReady(true);
          container.dataset.mapReady = "true";
        });

        instance.on("error", (event) => {
          console.warn(
            "[GIS] MapLibre error:",
            (event as unknown as { error?: Error }).error?.message ?? String(event),
          );
        });
      },
    );

    return () => {
      cancelled = true;
      readyRef.current = false;
      const currentContainer = mapContainerRef.current;
      if (currentContainer) {
        delete (currentContainer as unknown as { __maplibre?: maplibregl.Map }).__maplibre;
        delete currentContainer.dataset.mapReady;
        delete currentContainer.dataset.activeLayer;
        delete currentContainer.dataset.visibleLayers;
      }
      instance?.remove();
      mapRef.current = null;
    };
    // The map is created exactly once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the selected-parcel highlight in sync and re-frame the camera on that
  // parcel whenever the selection changes (map click, parcel list or a search).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const source = map.getSource("selected-parcel") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const container = mapContainerRef.current;

    const applySelection = (feature: ParcelFeature | null, shouldFit: boolean) => {
      source.setData(
        feature
          ? { type: "FeatureCollection", features: [feature] }
          : { type: "FeatureCollection", features: [] },
      );
      if (container) container.dataset.selectedParcel = feature?.properties.parcelId ?? "";
      // The highlight must stay drawn above every parcel layer.
      for (const id of ["selected-parcel-fill", "selected-parcel-line"]) {
        if (map.getLayer(id)) map.moveLayer(id);
      }
      if (feature && shouldFit) {
        const bbox = computeFeatureBBox(feature);
        if (bbox) {
          map.fitBounds(
            [
              [bbox[0], bbox[1]],
              [bbox[2], bbox[3]],
            ] as maplibregl.LngLatBoundsLike,
            { padding: compact ? 40 : 160, maxZoom: 17, duration: 650 },
          );
        }
      }
    };

    if (!selectedParcel) {
      applySelection(null, false);
      return;
    }

    const loaded = featuresRef.current.find(
      (feature) =>
        feature.properties.parcelId.toLowerCase() === selectedParcel.id.toLowerCase() ||
        feature.properties.ULPIN?.toLowerCase() === selectedParcel.ulpin.toLowerCase(),
    );
    if (loaded) {
      // The opening neighbourhood view already frames the initial selection.
      const shouldFit = true;
      applySelection(loaded, shouldFit);
      lastFittedParcelRef.current = selectedParcel.id;
      return;
    }

    // Selected parcel is not in the loaded window yet — read its real PostGIS
    // geometry, then highlight and zoom to it.
    let cancelled = false;
    void fetchParcelDetail(selectedParcel.id).then(({ parcel }) => {
      if (cancelled || !parcel?.geometry) return;
      const feature: ParcelFeature = {
        type: "Feature",
        properties: {
          parcelId: parcel.id,
          ULPIN: parcel.ulpin,
          area: parcel.area,
          landUse: parcel.landUse,
          status: parcel.status,
          risk: parcel.risk,
          owner: parcel.owner,
          locality: parcel.locality,
          updatedAt: parcel.lastUpdated,
          ...(parcel.details ? { details: parcel.details } : {}),
        },
        geometry: parcel.geometry,
      };
      applySelection(feature, true);
      lastFittedParcelRef.current = parcel.id;
    });
    return () => {
      cancelled = true;
    };
  }, [selectedParcel, mapReady, compact]);

  // Apply layer toggles to the live map.
  useEffect(() => {
    activeLayerRef.current = activeLayer;
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    applyLayerMode(map, activeLayer, activeGisLayers, mapContainerRef.current);
  }, [activeLayer, activeGisLayers, mapReady]);


  return (
    <div className={`parcel-map ${compact ? "parcel-map-compact" : ""}`}>
      {/* Map container — fills the map card exactly (position context is .parcel-map) */}
      <div
        ref={mapContainerRef}
        className="map-container"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* Layer picker */}
      {!activeGisLayers && (
        <div className="map-layer-picker">
          <SlidersHorizontal size={13} />
          <span>{activeLayer}</span>
          <select
            value={activeLayer}
            onChange={(event) => {
              const layer = event.target.value as MapLayer;
              setLocalLayer(layer);
              onLayerChange?.(layer);
            }}
            aria-label="Map layer"
          >
            <option>Parcel boundaries</option>
            <option>Land use</option>
            <option>Administrative boundaries</option>
            <option>Roads</option>
            <option>Risk indicators</option>
            <option>Satellite view</option>
            <option>Restrictions</option>
          </select>
        </div>
      )}

      {/* Legend */}
      <div className="map-legend">
        <span><i className="legend-dot legend-green" /> Verified</span>
        <span><i className="legend-dot legend-amber" /> Review</span>
        <span><i className="legend-dot legend-red" /> Flagged</span>
      </div>

      {/* Scale */}
      {zoom !== null && <div className="map-scale">{Math.round(zoom * 20)} m</div>}

      {/* Right‑hand controls */}
      <div className="map-controls map-controls-right">
        <button onClick={() => toast.info("Layer manager is ready for upcoming GIS layers")}>
          <Layers3 size={15} />
        </button>
        <button onClick={() => toast.info("Satellite layer will be connected in Stage 2")}>
          <Satellite size={15} />
        </button>
      </div>
    </div>
  );
}
