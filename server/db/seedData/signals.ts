import type { InsertAiValidation, InsertSatelliteObservation } from "../../../drizzle/schema";
import {
  CANONICAL_SATELLITE_OBSERVATION,
  CANONICAL_VALIDATION,
  SECONDARY_SATELLITE_OBSERVATIONS,
  SECONDARY_VALIDATIONS,
} from "./canonical";
import { canonicalParcelsById } from "./parcels";
import { dayTs, ts } from "./time";

/**
 * Evidence signals: `ai_validations` and `satellite_observations`.
 *
 * Each seed keeps the canonical *string* parcel ID (`LS-PAR-04xx`); the runner resolves
 * it to the numeric `parcels.id` foreign key so this module stays database-free and
 * unit-testable.
 */

export const AI_MODEL_VERSION = "LandSphere-Vision-v2.4" as const;

export type AiValidationSeed = Omit<InsertAiValidation, "parcelId"> & { parcelId: string };
export type SatelliteObservationSeed = Omit<InsertSatelliteObservation, "parcelId"> & {
  parcelId: string;
};

function validationFlags(source: string): Record<string, unknown> {
  return { source, humanReviewRequired: true, synthetic: true };
}

/** Canonical high-risk validation (92% confidence) plus the Prompt 10 findings. */
export const aiValidationSeeds: AiValidationSeed[] = [
  {
    validationId: CANONICAL_VALIDATION.validationId,
    parcelId: CANONICAL_VALIDATION.parcelId,
    validationType: CANONICAL_VALIDATION.validationType,
    issueTitle: CANONICAL_VALIDATION.issueTitle,
    description: CANONICAL_VALIDATION.description,
    riskLevel: CANONICAL_VALIDATION.riskLevel,
    confidenceScore: CANONICAL_VALIDATION.confidenceScore,
    aiAssisted: true,
    modelVersion: AI_MODEL_VERSION,
    flags: validationFlags(CANONICAL_VALIDATION.source),
    status: CANONICAL_VALIDATION.status,
    createdAt: ts(CANONICAL_VALIDATION.createdAt),
  },
  ...SECONDARY_VALIDATIONS.map((validation) => ({
    validationId: validation.validationId,
    parcelId: validation.parcelId,
    validationType: validation.validationType,
    issueTitle: validation.issueTitle,
    description: validation.description,
    riskLevel: validation.riskLevel,
    confidenceScore: validation.confidenceScore,
    aiAssisted: true,
    modelVersion: AI_MODEL_VERSION,
    flags: validationFlags(validation.validationType) as Record<string, unknown>,
    status: validation.status,
    createdAt: ts(validation.createdAt),
  })),
];

/** Deterministic NDVI delta for a percentage change signal (3 decimals). */
function deriveNdviDelta(changePercent: number): number {
  const delta = -(changePercent / 100);
  return Math.round(delta * 1000) / 1000;
}

/** Deterministic changed acreage: parcel acreage × percentage change (2 decimals). */
function deriveChangedAreaAcres(parcelId: string, changePercent: number): string {
  const parcel = canonicalParcelsById.get(parcelId.toLowerCase());
  if (!parcel) {
    throw new Error(`Satellite observation references unknown parcel: ${parcelId}`);
  }
  const area = (Number.parseFloat(parcel.areaAcres) * changePercent) / 100;
  return area.toFixed(2);
}

/** NDVI baseline shared by the synthetic secondary observations. */
const SECONDARY_NDVI_BASELINE = 0.62;

function ndviMetadata(changePercent: number, confidenceRatio: number): Record<string, unknown> {
  return {
    changePercent,
    confidence: confidenceRatio,
    synthetic: true,
    providerMode: "offline-replay",
  };
}

/**
 * Canonical observation: NDVI delta -0.18 across 0.42 acres on LS-PAR-0428
 * ("Potential Change Detected") plus the Prompt 10 secondary signals.
 */
export const satelliteObservationSeeds: SatelliteObservationSeed[] = [
  {
    observationId: CANONICAL_SATELLITE_OBSERVATION.observationId,
    parcelId: CANONICAL_SATELLITE_OBSERVATION.parcelId,
    provider: CANONICAL_SATELLITE_OBSERVATION.provider,
    captureDate: dayTs(CANONICAL_SATELLITE_OBSERVATION.captureDate),
    resolutionMeters: CANONICAL_SATELLITE_OBSERVATION.resolutionMeters,
    ndviBaseline: CANONICAL_SATELLITE_OBSERVATION.ndviBaseline,
    ndviCurrent: CANONICAL_SATELLITE_OBSERVATION.ndviCurrent,
    ndviDelta: CANONICAL_SATELLITE_OBSERVATION.ndviDelta,
    changeStatus: CANONICAL_SATELLITE_OBSERVATION.changeStatus,
    changedAreaAcres: CANONICAL_SATELLITE_OBSERVATION.changedAreaAcres,
    classification: CANONICAL_SATELLITE_OBSERVATION.classification,
    metadata: ndviMetadata(
      CANONICAL_SATELLITE_OBSERVATION.changePercent,
      CANONICAL_SATELLITE_OBSERVATION.confidenceRatio
    ),
  },
  ...SECONDARY_SATELLITE_OBSERVATIONS.map((observation) => {
    const ndviDelta = deriveNdviDelta(observation.changePercent);
    return {
      observationId: observation.observationId,
      parcelId: observation.parcelId,
      provider: observation.provider,
      captureDate: dayTs(observation.captureDate),
      resolutionMeters: "3.00",
      ndviBaseline: SECONDARY_NDVI_BASELINE.toFixed(3),
      ndviCurrent: (SECONDARY_NDVI_BASELINE + ndviDelta).toFixed(3),
      ndviDelta: ndviDelta.toFixed(3),
      changeStatus: observation.changeStatus,
      changedAreaAcres: deriveChangedAreaAcres(observation.parcelId, observation.changePercent),
      classification: observation.classification,
      metadata: ndviMetadata(observation.changePercent, observation.confidenceRatio),
    };
  }),
];

/** Validations that Prompt 10 marks as high risk. */
export const highRiskValidationSeeds: AiValidationSeed[] = aiValidationSeeds.filter(
  (validation) => validation.riskLevel === "High"
);
