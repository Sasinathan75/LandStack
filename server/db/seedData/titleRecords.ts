import type {
  InsertEncumbrance,
  InsertLandRecord,
  InsertTransaction,
} from "../../../drizzle/schema";
import {
  CANONICAL_ENCUMBRANCE,
  CANONICAL_PARCEL,
  CANONICAL_RECORD_NUMBERS,
  CANONICAL_TRANSACTION,
  SECONDARY_LAND_RECORDS,
  SECONDARY_TRANSACTIONS,
} from "./canonical";
import { dayTs, optionalDayTs } from "./time";

/**
 * Title / tenure records: `land_records`, `transactions`, `encumbrances`.
 *
 * Each seed carries the canonical *string* parcel ID; the runner resolves it to the
 * numeric `parcels.id` foreign key, so this module stays DB-free and unit-testable.
 */

export type LandRecordSeed = Omit<InsertLandRecord, "parcelId"> & { parcelId: string };
export type TransactionSeed = Omit<InsertTransaction, "parcelId"> & { parcelId: string };
export type EncumbranceSeed = Omit<InsertEncumbrance, "parcelId"> & { parcelId: string };

/** Official records of LS-PAR-0428: RoR, registration, tax and land-use extracts. */
export const landRecordSeeds: LandRecordSeed[] = [
  {
    recordNumber: CANONICAL_RECORD_NUMBERS.ror,
    parcelId: CANONICAL_PARCEL.parcelId,
    recordType: "Record of Rights",
    title: `Ownership Record — ${CANONICAL_PARCEL.parcelId}`,
    issueDate: dayTs("2026-09-12"),
    issuingAuthority: "Demo District Land Office",
    status: "Verified",
    documentUrl: "demo://records/ROR-DEMO-10422.pdf",
    metadata: {
      ulpin: CANONICAL_PARCEL.ulpin,
      surveyNumber: CANONICAL_PARCEL.surveyNumber,
      synthetic: true,
    },
  },
  {
    recordNumber: CANONICAL_RECORD_NUMBERS.registration,
    parcelId: CANONICAL_PARCEL.parcelId,
    recordType: "Registration",
    title: `Registration Extract — ${CANONICAL_PARCEL.parcelId}`,
    issueDate: dayTs("2024-06-16"),
    issuingAuthority: "Demo State Registration Department",
    status: "Verified",
    documentUrl: "demo://records/REG-DEMO-77891.pdf",
    metadata: { deedNumber: "DEED-2024-77891", synthetic: true },
  },
  {
    recordNumber: CANONICAL_RECORD_NUMBERS.propertyTax,
    parcelId: CANONICAL_PARCEL.parcelId,
    recordType: "Tax",
    title: `Property Tax Receipt — ${CANONICAL_PARCEL.parcelId}`,
    issueDate: dayTs("2026-07-22"),
    issuingAuthority: "Demo District Revenue Office",
    status: "Paid",
    documentUrl: "demo://records/TAX-DEMO-0881.pdf",
    metadata: { assessmentYear: "2026-2027", synthetic: true },
  },
  {
    recordNumber: CANONICAL_RECORD_NUMBERS.landUse,
    parcelId: CANONICAL_PARCEL.parcelId,
    recordType: "Land Use",
    title: `Land-use Record — ${CANONICAL_PARCEL.parcelId}`,
    issueDate: dayTs("2025-01-01"),
    issuingAuthority: "Demo State Town Planning Cell",
    status: "Verified",
    documentUrl: "demo://records/LUR-DEMO-2025-019.pdf",
    metadata: { recordedLandUse: "Residential", masterPlanZone: "MP-2026 West Residential", synthetic: true },
  },
  ...SECONDARY_LAND_RECORDS.map((record, index) => ({
    recordNumber: record.recordNumber,
    parcelId: record.parcelId,
    recordType: record.recordType,
    title: record.title,
    issueDate: dayTs(["2026-09-11", "2026-09-10", "2026-09-05"][index] ?? "2026-09-05"),
    issuingAuthority: "Demo District Land Office",
    status: record.status,
    documentUrl: record.documentUrl,
    metadata: { synthetic: true } as Record<string, unknown>,
  })),
];

/** Mutation / registration history, including the canonical TXN-0428-0482. */
export const transactionSeeds: TransactionSeed[] = [
  {
    transactionId: CANONICAL_TRANSACTION.transactionId,
    parcelId: CANONICAL_TRANSACTION.parcelId,
    transactionType: CANONICAL_TRANSACTION.transactionType,
    amount: CANONICAL_TRANSACTION.amount,
    buyerName: CANONICAL_TRANSACTION.buyerName,
    sellerName: CANONICAL_TRANSACTION.sellerName,
    registrationDeedNumber: CANONICAL_TRANSACTION.registrationDeedNumber,
    transactionDate: dayTs(CANONICAL_TRANSACTION.transactionDate),
    status: CANONICAL_TRANSACTION.status,
  },
  ...SECONDARY_TRANSACTIONS.map((transaction) => ({
    transactionId: transaction.transactionId,
    parcelId: transaction.parcelId,
    transactionType: transaction.transactionType,
    amount: transaction.amount,
    buyerName: transaction.buyerName,
    sellerName: transaction.sellerName,
    registrationDeedNumber: transaction.registrationDeedNumber,
    transactionDate: dayTs(transaction.transactionDate),
    status: transaction.status,
  })),
];

/** Encumbrances: canonical LS-PAR-0428 plus the flagged parcels from Prompt 10. */
export const encumbranceSeeds: EncumbranceSeed[] = [
  {
    parcelId: CANONICAL_PARCEL.parcelId,
    encumbranceType: CANONICAL_ENCUMBRANCE.encumbranceType,
    holderName: CANONICAL_ENCUMBRANCE.holderName,
    amount: CANONICAL_ENCUMBRANCE.amount,
    status: CANONICAL_ENCUMBRANCE.status,
    startDate: optionalDayTs(CANONICAL_ENCUMBRANCE.startDate),
    endDate: optionalDayTs(CANONICAL_ENCUMBRANCE.endDate),
    notes: CANONICAL_ENCUMBRANCE.notes,
  },
  {
    parcelId: "LS-PAR-0410",
    encumbranceType: "Public Reserve Notification",
    holderName: "Demo State Forest Cell",
    amount: null,
    status: "Active",
    startDate: dayTs("2024-11-20"),
    endDate: null,
    notes: "Synthetic reserve-boundary notification used by the restriction-conflict demo case.",
  },
  {
    parcelId: "LS-PAR-0421",
    encumbranceType: "Agricultural Buffer Advisory",
    holderName: "Demo State Agriculture Department",
    amount: null,
    status: "Active",
    startDate: dayTs("2025-06-10"),
    endDate: null,
    notes: "Synthetic vegetation-loss advisory linked to the satellite monitoring demo signal.",
  },
];
