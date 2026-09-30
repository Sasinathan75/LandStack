import type {
  InsertBuildingPermission,
  InsertLandUseRecord,
  InsertPropertyTax,
  InsertRestriction,
  InsertUtility,
} from "../../../drizzle/schema";
import {
  CANONICAL_LAND_USE_RECORD,
  CANONICAL_PARCEL,
  CANONICAL_RECORD_NUMBERS,
  CANONICAL_RESTRICTION,
} from "./canonical";
import { canonicalParcelsById } from "./parcels";
import { dayTs, optionalDayTs } from "./time";

/**
 * Land attributes: `land_use_records`, `building_permissions`, `property_taxes`,
 * `utilities` and `restrictions`.
 *
 * Seeds reference parcels by canonical string ID; the runner resolves them to the
 * numeric `parcels.id` foreign key.
 */

export type LandUseSeed = Omit<InsertLandUseRecord, "parcelId"> & { parcelId: string };
export type BuildingPermissionSeed = Omit<InsertBuildingPermission, "parcelId"> & {
  parcelId: string;
};
export type PropertyTaxSeed = Omit<InsertPropertyTax, "parcelId"> & { parcelId: string };
export type UtilitySeed = Omit<InsertUtility, "parcelId"> & { parcelId: string };
export type RestrictionSeed = Omit<InsertRestriction, "parcelId"> & { parcelId: string };

function requireParcel(parcelId: string) {
  const parcel = canonicalParcelsById.get(parcelId.toLowerCase());
  if (!parcel) {
    throw new Error(`Seed references unknown canonical parcel: ${parcelId}`);
  }
  return parcel;
}

/** Canonical land-use record (mismatch flagged) plus records for the citizen parcels. */
export const landUseRecordSeeds: LandUseSeed[] = [
  {
    parcelId: CANONICAL_PARCEL.parcelId,
    recordedLandUse: CANONICAL_LAND_USE_RECORD.recordedLandUse,
    actualLandUse: CANONICAL_LAND_USE_RECORD.actualLandUse,
    zoningCategory: CANONICAL_LAND_USE_RECORD.zoningCategory,
    masterPlanZone: CANONICAL_LAND_USE_RECORD.masterPlanZone,
    mismatchDetected: CANONICAL_LAND_USE_RECORD.mismatchDetected,
    source: CANONICAL_LAND_USE_RECORD.source,
    verifiedAt: optionalDayTs(CANONICAL_LAND_USE_RECORD.verifiedAt),
  },
  {
    parcelId: "LS-PAR-0420",
    recordedLandUse: "Mixed use",
    actualLandUse: "Mixed use (residential dominant)",
    zoningCategory: "MU — Mixed Use",
    masterPlanZone: "MP-2026 West Mixed",
    mismatchDetected: true,
    source: "Synthetic GIS",
    verifiedAt: dayTs("2025-01-01"),
  },
  {
    parcelId: "LS-PAR-0421",
    recordedLandUse: "Agricultural",
    actualLandUse: "Agricultural (vegetation loss signal)",
    zoningCategory: "AG — Agricultural",
    masterPlanZone: "MP-2026 West Agricultural Buffer",
    mismatchDetected: true,
    source: "Synthetic Landsat demo",
    verifiedAt: dayTs("2025-01-01"),
  },
];

/** Building permissions, including the canonical residential permit for LS-PAR-0428. */
export const buildingPermissionSeeds: BuildingPermissionSeed[] = [
  {
    permitNumber: "BP-DEMO-2024-0428",
    parcelId: CANONICAL_PARCEL.parcelId,
    permitType: "Residential Construction",
    structureType: "G+2 Residential",
    proposedFloors: 3,
    proposedAreaSqFt: "3200.00",
    status: "Approved",
    appliedDate: dayTs("2024-02-11"),
    approvedDate: dayTs("2024-03-05"),
    expiryDate: dayTs("2029-03-05"),
  },
  {
    permitNumber: "BP-DEMO-2023-0420",
    parcelId: "LS-PAR-0420",
    permitType: "Mixed-use Construction",
    structureType: "G+1 Mixed Use",
    proposedFloors: 2,
    proposedAreaSqFt: "1850.00",
    status: "Under review",
    appliedDate: dayTs("2023-08-19"),
    approvedDate: null,
    expiryDate: null,
  },
  {
    permitNumber: "BP-DEMO-2022-0425",
    parcelId: "LS-PAR-0425",
    permitType: "Commercial Construction",
    structureType: "IT Block G+4",
    proposedFloors: 5,
    proposedAreaSqFt: "12400.00",
    status: "Approved",
    appliedDate: dayTs("2022-04-02"),
    approvedDate: dayTs("2022-06-14"),
    expiryDate: dayTs("2027-06-14"),
  },
];


/** Property taxes, including the canonical TAX-DEMO-0881 receipt. */
export const propertyTaxSeeds: PropertyTaxSeed[] = [
  {
    taxReceiptNumber: CANONICAL_RECORD_NUMBERS.propertyTax,
    parcelId: CANONICAL_PARCEL.parcelId,
    assessmentYear: "2026-2027",
    amountDue: "4800.00",
    amountPaid: "4800.00",
    paymentStatus: "Paid",
    dueDate: dayTs("2026-07-31"),
    paidDate: dayTs("2026-07-22"),
  },
  {
    taxReceiptNumber: "TAX-DEMO-0880",
    parcelId: "LS-PAR-0420",
    assessmentYear: "2026-2027",
    amountDue: "2250.00",
    amountPaid: "2250.00",
    paymentStatus: "Paid",
    dueDate: dayTs("2026-07-31"),
    paidDate: dayTs("2026-07-18"),
  },
  {
    taxReceiptNumber: "TAX-DEMO-0879",
    parcelId: "LS-PAR-0421",
    assessmentYear: "2026-2027",
    amountDue: "1400.00",
    amountPaid: "700.00",
    paymentStatus: "Partially Paid",
    dueDate: dayTs("2026-07-31"),
    paidDate: null,
  },
];

/** Utility connections (electricity/water) for the canonical parcel and its siblings. */
export const utilitySeeds: UtilitySeed[] = [
  {
    parcelId: CANONICAL_PARCEL.parcelId,
    utilityType: "Electricity",
    connectionStatus: "Connected",
    consumerNumber: "UTIL-ELEC-0428",
    provider: "Demo State Power Board",
    connectedDate: dayTs("2021-04-05"),
  },
  {
    parcelId: CANONICAL_PARCEL.parcelId,
    utilityType: "Water",
    connectionStatus: "Connected",
    consumerNumber: "UTIL-WATER-0428",
    provider: "Demo Municipal Water Board",
    connectedDate: dayTs("2021-04-12"),
  },
  {
    parcelId: "LS-PAR-0420",
    utilityType: "Electricity",
    connectionStatus: "Connected",
    consumerNumber: "UTIL-ELEC-0420",
    provider: "Demo State Power Board",
    connectedDate: dayTs("2020-11-02"),
  },
];

/** Canonical reserve-boundary setback plus the Prompt 10 restriction conflicts. */
export const restrictionSeeds: RestrictionSeed[] = [
  {
    parcelId: CANONICAL_PARCEL.parcelId,
    restrictionType: CANONICAL_RESTRICTION.restrictionType,
    description: CANONICAL_RESTRICTION.description,
    severity: CANONICAL_RESTRICTION.severity,
    status: CANONICAL_RESTRICTION.status,
    imposedBy: CANONICAL_RESTRICTION.imposedBy,
    imposedDate: optionalDayTs(CANONICAL_RESTRICTION.imposedDate),
  },
  {
    parcelId: "LS-PAR-0410",
    restrictionType: "Public Reserve Boundary",
    description:
      "Parcel intersects the synthetic public reserve buffer. Construction is restricted pending administrative clearance.",
    severity: "High",
    status: "Active",
    imposedBy: "Demo State Forest Cell",
    imposedDate: dayTs("2024-11-20"),
  },
  {
    parcelId: "LS-PAR-0421",
    restrictionType: "Agricultural Buffer",
    description:
      "Synthetic agricultural buffer advisory: vegetation change requires verification before conversion.",
    severity: "Medium",
    status: "Active",
    imposedBy: "Demo State Agriculture Department",
    imposedDate: dayTs("2025-06-10"),
  },
];

/** Asserts every land-detail seed points at a real canonical parcel. */
export function assertLandDetailParcelReferences(): void {
  for (const seed of [
    ...landUseRecordSeeds,
    ...buildingPermissionSeeds,
    ...propertyTaxSeeds,
    ...utilitySeeds,
    ...restrictionSeeds,
  ]) {
    requireParcel(seed.parcelId);
  }
}
