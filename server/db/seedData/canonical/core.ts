/**
 * Core canonical LandSphere AI demo identifiers shared by the PostgreSQL seed and the
 * Prompt 10 frontend dataset. Nothing here is generated at runtime.
 */

export const DEMO_DISTRICT = "Demo District" as const;
export const DEMO_STATE = "Demo State" as const;

/** All 32 canonical parcel IDs created by Prompt 10. */
export const CANONICAL_PARCEL_IDS: string[] = Array.from(
  { length: 32 },
  (_, index) => `LS-PAR-${String(401 + index).padStart(4, "0")}`
);

/** The primary demo story parcel (Prompt 11, Step 6/7). */
export const CANONICAL_PARCEL = {
  parcelId: "LS-PAR-0428",
  ulpin: "IN-AP-28-0428-019-7",
  surveyNumber: "284/2A",
  areaAcres: "2.48",
  landUse: "Residential",
  location: `${DEMO_DISTRICT}, ${DEMO_STATE}`,
  district: DEMO_DISTRICT,
  state: DEMO_STATE,
  status: "Verified",
  riskLevel: "High",
} as const;

/** Canonical citizen: owns 2.48 + 1.16 + 2.08 = 5.72 acres. */
export const CANONICAL_CITIZEN = {
  citizenId: "CIT-DEMO-001",
  fullName: "Demo Citizen",
  email: "citizen.demo@example.test",
  phone: "+91 90000 00000",
  registeredPropertiesCount: 3,
  ownedParcelIds: ["LS-PAR-0428", "LS-PAR-0420", "LS-PAR-0421"],
  totalOwnedAcres: "5.72",
  district: DEMO_DISTRICT,
  state: DEMO_STATE,
} as const;

/** Additional Prompt 10 citizen profile (authorised for LS-PAR-0401). */
export const SECONDARY_CITIZEN = {
  citizenId: "CIT-DEMO-002",
  fullName: "A. Sharma",
  email: "sharma.a@example.test",
  phone: "+91 91111 00000",
  authorizedParcelId: "LS-PAR-0401",
} as const;

/** Deterministic synthetic landholder citizens (`CIT-SYN-04xx`). */
export const SYNTHETIC_CITIZEN_PREFIX = "CIT-SYN-" as const;

/** Stable demo user identities used by the users / user_roles tables (Step 5). */
export const CANONICAL_USER_OPEN_IDS = {
  admin: "demo-admin-owner",
  governmentOfficer: "GOV-DEMO-01",
  governmentReviewer: "GOV-DEMO-02",
  citizen: "CIT-DEMO-001",
} as const;

/** `LS-PAR-0428` → `0428`. */
export function parcelNumber(parcelId: string): string {
  const match = /(\d{4})$/.exec(parcelId);
  if (!match) {
    throw new RangeError(`Unable to derive a parcel number from: ${parcelId}`);
  }
  return match[1];
}

/**
 * Deterministic survey number for parcels whose survey number Prompt 10 does not
 * publish. The canonical parcel keeps its authoritative `284/2A` value.
 */
export function syntheticSurveyNumber(parcelId: string): string {
  const number = parcelNumber(parcelId);
  return `${Number.parseInt(number, 10) % 1000}/1A`;
}

/** Deterministic synthetic landholder citizen ID for a parcel. */
export function syntheticOwnerCitizenId(parcelId: string): string {
  return `${SYNTHETIC_CITIZEN_PREFIX}${parcelNumber(parcelId)}`;
}
