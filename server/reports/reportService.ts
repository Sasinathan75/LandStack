// server/reports/reportService.ts

import { demoParcels } from "../../client/src/lib/demoData/parcels";
import { validateParcel } from "../ai/validation";
import { getSatellitePreview } from "../gis/satellite";

export interface GeneratedReport {
  id: string;
  parcelId: string;
  generatedAt: string; // ISO timestamp
  status: "Ready" | "Failed";
  content: string; // human‑readable report text
  metadata: {
    parcelInfo: any;
    validation?: any;
    satellite?: any;
  };
}

/**
 * Deterministic mock report generation for a parcel.
 * Returns undefined if the parcel does not exist.
 */
export function generateReport(parcelId: string): GeneratedReport | undefined {
  const parcel = demoParcels.find(
    (p) => p.id.toLowerCase() === parcelId.toLowerCase()
  );
  if (!parcel) return undefined;

  // Basic parcel info (deterministic subset)
  const parcelInfo = {
    id: parcel.id,
    ulpin: parcel.ulpin,
    locality: parcel.locality,
    owner: parcel.owner ?? "Unknown",
    status: parcel.status ?? "Unknown",
    geometry: parcel.geometry,
  };

  // AI validation summary (reuse existing service)
  const validation = validateParcel(parcel.id);

  // Satellite preview metadata (deterministic mock)
  const satellite = getSatellitePreview(parcel.id);

  const generatedAt = new Date().toISOString();

  const contentLines = [
    `--- LandSphere AI Report ---`,
    `Report ID: REPORT-${generatedAt.replace(/[-:T.]/g, "").slice(0, 14)}`,
    `Parcel ID: ${parcel.id}`,
    `Generated At: ${generatedAt}`,
    ``,
    `Parcel Information:`,
    `  ULPIN: ${parcelInfo.ulpin}`,
    `  Locality: ${parcelInfo.locality}`,
    `  Owner: ${parcelInfo.owner}`,
    `  Status: ${parcelInfo.status}`,
    ``,
    `AI Validation Summary:`,
    `  Validation Status: ${validation.status}`,
    `  Score: ${validation.score}`,
    ``,
    `Satellite Metadata:`,
    `  Source: ${satellite?.source ?? "N/A"}`,
    `  Captured At: ${satellite?.capturedAt ?? "N/A"}`,
    `  Resolution: ${satellite?.resolution ?? "N/A"}`,
    `  Imagery URL: ${satellite?.imageryUrl ?? "N/A"}`,
    ``,
    `--- End of Report ---`,
  ];

  const content = contentLines.join("\n");

  const report: GeneratedReport = {
    id: `REP-${generatedAt.replace(/[-:T.]/g, "").slice(0, 14)}`,
    parcelId: parcel.id,
    generatedAt,
    status: "Ready",
    content,
    metadata: {
      parcelInfo,
      validation,
      satellite,
    },
  };

  return report;
}
