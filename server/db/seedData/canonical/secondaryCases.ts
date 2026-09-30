import { CANONICAL_CITIZEN, CANONICAL_PARCEL } from "./core";
import { CANONICAL_RECORD_NUMBERS } from "./records";

/** Remaining Prompt 10 review cases (each linked to its own AI validation). */
export const SECONDARY_REVIEW_CASES = [
  {
    caseId: "CASE-2026-0184",
    parcelId: "LS-PAR-0421",
    validationId: "VAL-2026-0184",
    issueType: "Ownership mismatch",
    priority: "High",
    status: "Pending Review",
    source: "RoR comparison",
    slaDaysRemaining: 4,
    createdAt: "2026-09-10T09:31:00.000Z",
  },
  {
    caseId: "CASE-2026-0185",
    parcelId: "LS-PAR-0420",
    validationId: "VAL-2026-0185",
    issueType: "Land-use mismatch",
    priority: "Medium",
    status: "Under Review",
    source: "Master plan",
    slaDaysRemaining: 6,
    createdAt: "2026-09-11T11:10:00.000Z",
  },
  {
    caseId: "CASE-2026-0186",
    parcelId: "LS-PAR-0423",
    validationId: "VAL-2026-0186",
    issueType: "Document inconsistency",
    priority: "Medium",
    status: "Pending Review",
    source: "AI rules engine",
    slaDaysRemaining: 5,
    createdAt: "2026-09-12T14:22:00.000Z",
  },
  {
    caseId: "CASE-2026-0187",
    parcelId: "LS-PAR-0410",
    validationId: "VAL-2026-0187",
    issueType: "Restriction conflict",
    priority: "High",
    status: "Pending Review",
    source: "AI rules engine",
    slaDaysRemaining: 3,
    createdAt: "2026-09-13T08:15:00.000Z",
  },
] as const;

/** Additional Prompt 10 land records (other parcels of the demo citizen). */
export const SECONDARY_LAND_RECORDS = [
  {
    recordNumber: "ROR-DEMO-10420",
    parcelId: "LS-PAR-0420",
    recordType: "Record of Rights",
    title: "Ownership Record — LS-PAR-0420",
    status: "Verified",
    documentUrl: "demo://records/ROR-DEMO-10420.pdf",
  },
  {
    recordNumber: "ROR-DEMO-10421",
    parcelId: "LS-PAR-0421",
    recordType: "Record of Rights",
    title: "Ownership Record — LS-PAR-0421",
    status: "Verified",
    documentUrl: "demo://records/ROR-DEMO-10421.pdf",
  },
  {
    recordNumber: "ROR-DEMO-10401",
    parcelId: "LS-PAR-0401",
    recordType: "Record of Rights",
    title: "Ownership Record — LS-PAR-0401",
    status: "Verified",
    documentUrl: "demo://records/ROR-DEMO-10401.pdf",
  },
] as const;

/** Additional Prompt 10 transactions (canonical parcel history + LS-PAR-0420). */
export const SECONDARY_TRANSACTIONS = [
  {
    transactionId: "TXN-0428-0210",
    parcelId: CANONICAL_PARCEL.parcelId,
    transactionType: "Ownership transfer recorded",
    amount: "1850000.00",
    buyerName: CANONICAL_CITIZEN.fullName,
    sellerName: "Synthetic Landholder 28",
    registrationDeedNumber: "DEED-2022-0210",
    transactionDate: "2022-03-03",
    status: "Completed",
  },
  {
    transactionId: "TXN-0428-0105",
    parcelId: CANONICAL_PARCEL.parcelId,
    transactionType: "Ownership record created",
    amount: "1200000.00",
    buyerName: "Synthetic Landholder 28",
    sellerName: "Demo State Revenue Authority",
    registrationDeedNumber: "DEED-2021-0105",
    transactionDate: "2021-04-01",
    status: "Completed",
  },
  {
    transactionId: CANONICAL_RECORD_NUMBERS.transaction.replace("0428", "0420"),
    parcelId: "LS-PAR-0420",
    transactionType: "Mutation registered",
    amount: "980000.00",
    buyerName: CANONICAL_CITIZEN.fullName,
    sellerName: "Synthetic Landholder 20",
    registrationDeedNumber: "DEED-2023-0420",
    transactionDate: "2023-05-18",
    status: "Completed",
  },
] as const;
