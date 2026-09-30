// Satellite Service (deterministic mock implementation)
// Provides preview and metadata for parcel satellite imagery.
// Designed so a real provider can replace the implementation without changing the API contract.

import { demoParcels } from "../../client/src/lib/demoData/parcels";

export interface SatelliteResult {
  parcelId: string;
  available: boolean;
  source: string; // e.g., "demo"
  capturedAt: string; // ISO timestamp
  resolution: string; // e.g., "10m"
  imageryUrl: string; // URL to mock image asset
  bounds: unknown; // could be GeoJSON bbox or similar – pass through from parcel geometry if present
  metadata: Record<string, unknown>;
}

/**
 * Returns deterministic mock satellite preview data for a given parcel.
 * If the parcel does not exist, returns undefined.
 */
export function getSatellitePreview(parcelId: string): SatelliteResult | undefined {
  const parcel = demoParcels.find((p) => p.id.toLowerCase() === parcelId.toLowerCase());
  if (!parcel) return undefined;

  // Deterministic values based on parcel ID (no randomness).
  const capturedAt = "2026-09-01T00:00:00Z";
  const resolution = "10m";
  const source = "demo";
  const imageryUrl = `https://example.com/satellite/${parcel.id}.png`;
  const bounds = (parcel as any).geometry?.bbox ?? null;
  const metadata = {
    provider: source,
    description: `Demo satellite image for parcel ${parcel.id}`,
    capturedAt,
    resolution,
  };

  return {
    parcelId: parcel.id,
    available: true,
    source,
    capturedAt,
    resolution,
    imageryUrl,
    bounds,
    metadata,
  };
}

/**
 * Alias for getSatellitePreview – kept for future extension where metadata may differ.
 */
export const getSatelliteMetadata = getSatellitePreview;
