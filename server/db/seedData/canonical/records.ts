import { CANONICAL_CITIZEN, CANONICAL_PARCEL } from "./core";

/** Canonical official record numbers for LS-PAR-0428. */
export const CANONICAL_RECORD_NUMBERS = {
  ror: "ROR-DEMO-10422",
  registration: "REG-DEMO-77891",
  propertyTax: "TAX-DEMO-0881",
  landUse: "LUR-DEMO-2025-019",
  transaction: "TXN-0428-0482",
} as const;

/** Canonical service request (Step 7): ₹1,200, Pending, linked to citizen + parcel. */
export const CANONICAL_REQUEST = {
  requestId: "REQ-2026-0042",
  title: "Land Conversion NOC & Boundary Survey",
  requestType: "Land Conversion NOC + Boundary Survey",
  serviceType: "Certified RoR copy",
  purpose:
    "Land Conversion NOC & Boundary Survey for LS-PAR-0428 — certified Record of Rights copy together with a boundary survey verification.",
  amount: "1200.00",
  currency: "INR",
  paymentStatus: "Completed",
  status: "Pending",
  submittedDate: "2026-09-12",
  lastUpdated: "2026-09-16",
  citizenId: CANONICAL_CITIZEN.citizenId,
  parcelId: CANONICAL_PARCEL.parcelId,
} as const;

/** Canonical review case (Step 7): Pending Review, High priority. */
export const CANONICAL_REVIEW_CASE = {
  caseId: "CASE-2026-0042",
  title: "Potential Land-use Mismatch — LS-PAR-0428",
  priority: "High",
  status: "Pending Review",
  reviewer: "Demo Officer",
  source: "Master plan",
  slaDaysRemaining: 5,
  createdAt: "2026-09-12T10:14:00.000Z",
  requestId: CANONICAL_REQUEST.requestId,
  parcelId: CANONICAL_PARCEL.parcelId,
} as const;

/** Canonical AI validation (Step 7): High risk, 92% confidence. */
export const CANONICAL_VALIDATION = {
  validationId: "VAL-2026-0042",
  parcelId: CANONICAL_PARCEL.parcelId,
  validationType: "Land-use Mismatch",
  issueTitle: "Potential Land-use Mismatch",
  description:
    "Potential Land-use Mismatch: Master plan reference classification differs from the current ground signal. Human verification is recommended.",
  riskLevel: "High",
  confidenceScore: "92.00",
  confidenceRatio: 0.92,
  source: "Master plan",
  status: "Open",
  createdAt: "2026-09-12T10:14:00.000Z",
} as const;

/** Canonical satellite observation (Step 7): NDVI delta -0.18 over 0.42 acres. */
export const CANONICAL_SATELLITE_OBSERVATION = {
  observationId: "SAT-2026-0908-0428",
  parcelId: CANONICAL_PARCEL.parcelId,
  provider: "Synthetic Sentinel demo",
  captureDate: "2026-09-08",
  resolutionMeters: "3.00",
  ndviBaseline: "0.62",
  ndviCurrent: "0.44",
  ndviDelta: "-0.18",
  changeStatus: "Potential Change Detected",
  changedAreaAcres: "0.42",
  classification: "Residential → Built-up (suspected)",
  changePercent: 6.4,
  confidenceRatio: 0.82,
} as const;

export const CANONICAL_TRANSACTION = {
  transactionId: CANONICAL_RECORD_NUMBERS.transaction,
  parcelId: CANONICAL_PARCEL.parcelId,
  transactionType: "Mutation registered",
  amount: "2450000.00",
  buyerName: CANONICAL_CITIZEN.fullName,
  sellerName: "Synthetic Landholder 28",
  registrationDeedNumber: "DEED-2024-77891",
  transactionDate: "2024-06-16",
  status: "Completed",
} as const;

export const CANONICAL_ENCUMBRANCE = {
  encumbranceType: "Ecological Buffer Notification",
  holderName: "Demo State Revenue Authority",
  amount: null,
  status: "Active",
  startDate: "2025-01-01",
  endDate: null,
  notes:
    "Synthetic buffer-zone note attached for the demo workflow. Illustrative only, not a legal encumbrance.",
} as const;

export const CANONICAL_PROPERTY_TAX = {
  taxReceiptNumber: CANONICAL_RECORD_NUMBERS.propertyTax,
  parcelId: CANONICAL_PARCEL.parcelId,
  assessmentYear: "2026-2027",
  amountDue: "4800.00",
  amountPaid: "4800.00",
  paymentStatus: "Paid",
  dueDate: "2026-07-31",
  paidDate: "2026-07-22",
} as const;

export const CANONICAL_BUILDING_PERMISSION = {
  permitNumber: "BP-DEMO-2024-0428",
  parcelId: CANONICAL_PARCEL.parcelId,
  permitType: "Residential Construction",
  structureType: "G+2 Residential",
  proposedFloors: 3,
  proposedAreaSqFt: "3200.00",
  status: "Approved",
  appliedDate: "2024-02-11",
  approvedDate: "2024-03-05",
  expiryDate: "2029-03-05",
} as const;

export const CANONICAL_LAND_USE_RECORD = {
  recordNumber: CANONICAL_RECORD_NUMBERS.landUse,
  parcelId: CANONICAL_PARCEL.parcelId,
  recordedLandUse: "Residential",
  actualLandUse: "Residential (mixed-use signal)",
  zoningCategory: "R2 — Residential",
  masterPlanZone: "MP-2026 West Residential",
  mismatchDetected: true,
  source: "Synthetic GIS",
  verifiedAt: "2025-01-01",
} as const;

export const CANONICAL_UTILITY = {
  utilityType: "Electricity",
  connectionStatus: "Connected",
  consumerNumber: "UTIL-ELEC-0428",
  provider: "Demo State Power Board",
  connectedDate: "2021-04-05",
} as const;

export const CANONICAL_RESTRICTION = {
  restrictionType: "Reserve Boundary Setback",
  description:
    "Demo setback advisory applies near the synthetic reserve boundary. Administrative check required before land conversion.",
  severity: "High",
  status: "Active",
  imposedBy: "Demo District Land Office",
  imposedDate: "2025-02-15",
} as const;
