import { demoParcels } from "../../../client/src/lib/demoData/parcels";
import type { InsertParcel } from "../../../drizzle/schema";
import { geoJsonGeometryToEwkt, parseAcres, roundTo, type GeoJsonParcelGeometry } from "../geometry";
import {
  CANONICAL_PARCEL,
  CANONICAL_PARCEL_IDS,
  parcelNumber,
  syntheticSurveyNumber,
} from "./canonical";

/**
 * Canonical parcel rows derived directly from the Prompt 10 dataset.
 *
 * The parcel IDs, ULPINs, land-use values, statuses, risk levels and polygon geometry
 * are taken verbatim from `client/src/lib/demoData/parcels.ts`; no second ID system is
 * generated. Only the columns that Prompt 10 does not model (survey number for the
 * non-canonical parcels, district/state labels) are derived deterministically.
 *
 * Geometry is emitted as EWKT (`SRID=4326;POLYGON(...)`) so it lands in the
 * `geometry(Polygon, 4326)` PostGIS column with the correct spatial reference.
 */

export interface CanonicalParcelSeed {
  /** Canonical parcel identifier (`LS-PAR-04xx`). */
  parcelId: string;
  /** Owner name exactly as recorded in Prompt 10. */
  ownerName: string;
  /** Canonical ULPIN. */
  ulpin: string;
  /** Survey number (canonical `284/2A` for LS-PAR-0428). */
  surveyNumber: string;
  /** Acreage as a numeric string. */
  areaAcres: string;
  /** Land-use classification. */
  landUse: string;
  /** Human-readable location label. */
  location: string;
  /** Canonical district label. */
  district: string;
  /** Canonical state label. */
  state: string;
  /** Parcel status from Prompt 10 (`Verified` | `Under review` | `Flagged`). */
  status: string;
  /** Risk level from Prompt 10 (`Low` | `Medium` | `High`). */
  riskLevel: string;
  /** PostGIS EWKT geometry (SRID 4326). */
  geometryEwkt: string;
  /** GeoJSON mirror of the same geometry for UI/API convenience. */
  geojson: GeoJsonParcelGeometry;
}

function buildCanonicalParcels(): CanonicalParcelSeed[] {
  const parcels = demoParcels.map<CanonicalParcelSeed>((parcel) => {
    const isCanonical = parcel.id === CANONICAL_PARCEL.parcelId;
    return {
      parcelId: parcel.id,
      ownerName: parcel.owner,
      ulpin: parcel.ulpin,
      surveyNumber: isCanonical ? CANONICAL_PARCEL.surveyNumber : syntheticSurveyNumber(parcel.id),
      areaAcres: roundTo(parseAcres(parcel.area), 2),
      landUse: parcel.landUse,
      location: isCanonical
        ? CANONICAL_PARCEL.location
        : `${parcel.locality}, ${CANONICAL_PARCEL.district}, ${CANONICAL_PARCEL.state}`,
      district: CANONICAL_PARCEL.district,
      state: CANONICAL_PARCEL.state,
      status: parcel.status,
      riskLevel: parcel.risk,
      geometryEwkt: geoJsonGeometryToEwkt(parcel.geometry),
      geojson: parcel.geometry as GeoJsonParcelGeometry,
    };
  });

  assertCanonicalParcelCoverage(parcels);
  return parcels;
}

/** Guards the hard requirement that all 32 Prompt 10 parcel IDs are present. */
function assertCanonicalParcelCoverage(parcels: CanonicalParcelSeed[]): void {
  if (parcels.length !== CANONICAL_PARCEL_IDS.length) {
    throw new Error(
      `Canonical parcel count mismatch: expected ${CANONICAL_PARCEL_IDS.length}, received ${parcels.length}`
    );
  }
  const seen = new Set(parcels.map((parcel) => parcel.parcelId));
  const missing = CANONICAL_PARCEL_IDS.filter((parcelId) => !seen.has(parcelId));
  if (missing.length > 0) {
    throw new Error(`Missing canonical parcel IDs in seed data: ${missing.join(", ")}`);
  }
  const canonical = parcels.find((parcel) => parcel.parcelId === CANONICAL_PARCEL.parcelId);
  if (!canonical) {
    throw new Error(`Canonical parcel ${CANONICAL_PARCEL.parcelId} is missing from the seed data`);
  }
  if (canonical.ulpin !== CANONICAL_PARCEL.ulpin) {
    throw new Error(
      `Canonical ULPIN mismatch: expected ${CANONICAL_PARCEL.ulpin}, received ${canonical.ulpin}`
    );
  }
}

export const canonicalParcels: CanonicalParcelSeed[] = buildCanonicalParcels();

/** Lowercase parcel-ID → seed row lookup. */
export const canonicalParcelsById: Map<string, CanonicalParcelSeed> = new Map(
  canonicalParcels.map((parcel) => [parcel.parcelId.toLowerCase(), parcel])
);

/** Throws when a seed references a parcel ID that is not part of the canonical set. */
export function assertParcelExists(parcelId: string): CanonicalParcelSeed {
  const parcel = canonicalParcelsById.get(parcelId.toLowerCase());
  if (!parcel) {
    throw new Error(
      `Seed references unknown canonical parcel: ${parcelId}. ` +
        `Canonical IDs are LS-PAR-0401 … LS-PAR-0432.`
    );
  }
  return parcel;
}

/** Drizzle insert rows for the `parcels` table (ids assigned by the database). */
export function parcelInsertRows(): Omit<InsertParcel, "id">[] {
  return canonicalParcels.map((parcel) => ({
    parcelId: parcel.parcelId,
    ulpin: parcel.ulpin,
    surveyNumber: parcel.surveyNumber,
    areaAcres: parcel.areaAcres,
    landUse: parcel.landUse,
    location: parcel.location,
    district: parcel.district,
    state: parcel.state,
    status: parcel.status,
    riskLevel: parcel.riskLevel,
    geometry: parcel.geometryEwkt,
    geojson: parcel.geojson,
  }));
}

/** Total seeded acreage, used by verification output. */
export function canonicalTotalAcres(): string {
  const total = canonicalParcels.reduce(
    (sum, parcel) => sum + Number.parseFloat(parcel.areaAcres),
    0
  );
  return roundTo(total, 2);
}

/** Citizen-owned parcel IDs for the canonical demo citizen. */
export function demoCitizenOwnedParcels(): CanonicalParcelSeed[] {
  return canonicalParcels.filter((parcel) => parcel.ownerName === "Demo Citizen");
}

/** Parcels owned by synthetic landholders (everything the demo citizen does not own). */
export function syntheticOwnedParcels(): CanonicalParcelSeed[] {
  return canonicalParcels.filter((parcel) => parcel.ownerName !== "Demo Citizen");
}

/** Number of parcels a synthetic owner seed row is created for. */
export function syntheticOwnerCitizenSeeds(): Array<{
  citizenId: string;
  fullName: string;
  parcelId: string;
}> {
  return syntheticOwnedParcels().map((parcel) => ({
    citizenId: `CIT-SYN-${parcelNumber(parcel.parcelId)}`,
    fullName: parcel.ownerName,
    parcelId: parcel.parcelId,
  }));
}
