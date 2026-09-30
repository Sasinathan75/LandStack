// AI Validation Service (deterministic rule‑based mock)
// This module provides a simple server‑side validation routine for land parcels.
// It deliberately avoids any external AI/LLM calls so that it can run in the demo environment.
// The implementation re‑uses the existing demo parcel data and the platform type definitions.

import type { AIValidationResult } from "../../client/src/types/platform";
import { demoParcels } from "../../client/src/lib/demoData/parcels";

/** Helper to parse an area string like "2.48 Acres" into a numeric value (Acres) */
function parseArea(areaStr: string): number {
  const match = areaStr.match(/([0-9.]+)\s*Acres/i);
  return match ? parseFloat(match[1]) : 0;
}

/** Simple deterministic rule‑based validation for a parcel */
export function validateParcel(parcelId: string): {
  parcelId: string;
  status: "VALID" | "WARNING" | "INVALID";
  score: number;
  checks: Array<{ type: string; status: string; message: string; severity: string }>;
  recommendations: string[];
} {
  const parcel = demoParcels.find((p) => p.id.toLowerCase() === parcelId.toLowerCase());

  // Base response template
  let result: {
    parcelId: string;
    status: "VALID" | "WARNING" | "INVALID";
    score: number;
    checks: Array<{ type: string; status: string; message: string; severity: string }>;
    recommendations: string[];
  } = {
    parcelId,
    status: "VALID",
    score: 100,
    checks: [],
    recommendations: [],
  };

  // Rule 1 – Missing parcel data
  if (!parcel) {
    result.status = "INVALID";
    result.score = 0;
    result.checks.push({
      type: "Missing parcel data",
      status: "INVALID",
      message: `Parcel ${parcelId} does not exist in the catalogue.`,
      severity: "high",
    });
    result.recommendations.push("Create the parcel record before validation.");
    return result;
  }

  // Rule 2 – Geometry validity (very light check – ensure geometry exists and has coordinates)
  const geom = (parcel as any).geometry;
  if (!geom || !geom.coordinates || geom.coordinates.length === 0) {
    result.status = "INVALID";
    result.score -= 30;
    result.checks.push({
      type: "Geometry validity",
      status: "INVALID",
      message: "Parcel geometry is missing or empty.",
      severity: "high",
    });
    result.recommendations.push("Provide a valid GeoJSON polygon for the parcel.");
  }

  // Rule 3 – Area consistency (simple deterministic check – flag parcels whose ID ends with an even digit)
  const recordedArea = parseArea(parcel.area);
  // Mock computed area: if parcel id ends with an even digit, assume it is off by 0.2 acres
  const lastChar = parcel.id.charAt(parcel.id.length - 1);
  const isEven = parseInt(lastChar, 10) % 2 === 0;
  const computedArea = isEven ? recordedArea - 0.2 : recordedArea;
  const areaDiff = Math.abs(recordedArea - computedArea);
  if (areaDiff > 0.1) {
    // treat as warning for small diff, invalid for large diff (>0.5)
    const severity = areaDiff > 0.5 ? "high" : "medium";
    const status = areaDiff > 0.5 ? "INVALID" : "WARNING";
    result.status = status === "INVALID" ? "INVALID" : result.status;
    if (status === "WARNING") result.status = "WARNING";
    result.score -= severity === "high" ? 25 : 15;
    result.checks.push({
      type: "Area consistency",
      status,
      message: `Recorded area (${recordedArea} acres) differs from computed area (${computedArea.toFixed(2)} acres) by ${areaDiff.toFixed(2)} acres.`,
      severity,
    });
    result.recommendations.push("Verify the parcel boundary survey data.");
  }

  // Rule 4 – Land‑use vs status consistency (example rule)
  if (parcel.landUse === "Mixed use" && parcel.status !== "Under review") {
    result.status = "WARNING";
    result.score -= 10;
    result.checks.push({
      type: "Land‑use consistency",
      status: "WARNING",
      message: "Mixed‑use parcels are expected to be under review.",
      severity: "low",
    });
    result.recommendations.push("Update the parcel status to \"Under review\".");
  }

  // Rule 5 – Ownership / RoR placeholder (demo rule)
  if (parcel.owner?.includes("Demo Citizen")) {
    result.status = "WARNING";
    result.score -= 5;
    result.checks.push({
      type: "Ownership consistency",
      status: "WARNING",
      message: "Ownership information appears to be a placeholder.",
      severity: "low",
    });
    result.recommendations.push("Confirm the official ownership record.");
  }

  // Rule 6 – Restriction / risk flag
  if (parcel.risk === "High") {
    result.status = "WARNING";
    result.score -= 10;
    result.checks.push({
      type: "Risk flag",
      status: "WARNING",
      message: "Parcel is marked with high risk; further manual review recommended.",
      severity: "medium",
    });
    result.recommendations.push("Prioritise this parcel for government inspection.");
  }

  // Clamp score to 0‑100
  if (result.score < 0) result.score = 0;

  // If no checks were added, keep status VALID and default recommendation
  if (result.checks.length === 0) {
    result.recommendations.push("No issues detected – parcel is clean.");
  }

  return result;
}
