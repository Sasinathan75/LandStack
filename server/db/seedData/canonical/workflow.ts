import { CANONICAL_CITIZEN, CANONICAL_PARCEL, CANONICAL_USER_OPEN_IDS } from "./core";
import { CANONICAL_VALIDATION } from "./records";

/** Canonical attachment set for REQ-2026-0042. */
export const CANONICAL_REQUEST_DOCUMENTS = [
  {
    documentName: "Record of Rights extract",
    documentType: "ROR",
    fileUrl: "demo://documents/ROR-DEMO-10422.pdf",
    fileSizeBytes: 184320,
    mimeType: "application/pdf",
    verified: true,
  },
  {
    documentName: "Registration extract",
    documentType: "Registration",
    fileUrl: "demo://documents/REG-DEMO-77891.pdf",
    fileSizeBytes: 212992,
    mimeType: "application/pdf",
    verified: true,
  },
  {
    documentName: "Property tax receipt",
    documentType: "Tax",
    fileUrl: "demo://documents/TAX-DEMO-0881.pdf",
    fileSizeBytes: 102400,
    mimeType: "application/pdf",
    verified: true,
  },
  {
    documentName: "Boundary survey sketch",
    documentType: "Survey",
    fileUrl: "demo://documents/SURVEY-0428-284-2A.pdf",
    fileSizeBytes: 262144,
    mimeType: "application/pdf",
    verified: false,
  },
] as const;

/** Canonical workflow timeline for CASE-2026-0042. */
export const CANONICAL_REVIEW_EVENTS = [
  {
    eventType: "Case created",
    authorName: "Demo Officer",
    authorRole: "GOVERNMENT",
    comments: `CASE-2026-0042 opened automatically after the AI validation ${CANONICAL_VALIDATION.validationId} was flagged as high risk.`,
    previousStatus: null,
    newStatus: "Pending Review",
    createdAt: "2026-09-12T10:14:00.000Z",
  },
  {
    eventType: "AI validation attached",
    authorName: "LandSphere Vision",
    authorRole: "SYSTEM",
    comments: `${CANONICAL_VALIDATION.validationId} attached with ${CANONICAL_VALIDATION.confidenceScore}% confidence: potential land-use mismatch against the master plan reference.`,
    previousStatus: "Pending Review",
    newStatus: "Pending Review",
    createdAt: "2026-09-12T10:15:30.000Z",
  },
  {
    eventType: "Satellite evidence attached",
    authorName: "Synthetic Sentinel demo",
    authorRole: "SYSTEM",
    comments:
      "SAT-2026-0908-0428 attached: NDVI delta -0.18 across 0.42 acres captured on 2026-09-08.",
    previousStatus: "Pending Review",
    newStatus: "Pending Review",
    createdAt: "2026-09-13T07:05:00.000Z",
  },
  {
    eventType: "Document verification pending",
    authorName: "Demo Officer",
    authorRole: "GOVERNMENT",
    comments: "Boundary survey sketch awaiting manual verification before conversion approval.",
    previousStatus: "Pending Review",
    newStatus: "Pending Review",
    createdAt: "2026-09-16T09:31:00.000Z",
  },
] as const;

/** Canonical notifications NOT-001 … NOT-003. */
export const CANONICAL_NOTIFICATIONS = [
  {
    notificationId: "NOT-001",
    audience: "citizen",
    title: "Your RoR request is under review",
    message: `REQ-2026-0042 has moved to document review for parcel ${CANONICAL_PARCEL.parcelId}.`,
    type: "Info",
    isRead: false,
    linkUrl: "/citizen/requests",
    citizenId: CANONICAL_CITIZEN.citizenId,
    userOpenId: CANONICAL_USER_OPEN_IDS.citizen,
    createdAt: "2026-09-16T10:00:00.000Z",
  },
  {
    notificationId: "NOT-002",
    audience: "citizen",
    title: "A record is ready to view",
    message: "Your contact update request is ready.",
    type: "Success",
    isRead: false,
    linkUrl: "/citizen/records",
    citizenId: CANONICAL_CITIZEN.citizenId,
    userOpenId: CANONICAL_USER_OPEN_IDS.citizen,
    createdAt: "2026-09-01T09:00:00.000Z",
  },
  {
    notificationId: "NOT-003",
    audience: "government",
    title: "AI validation requires review",
    message: `AI validation queue has new findings for ${CANONICAL_PARCEL.parcelId}.`,
    type: "Action required",
    isRead: false,
    linkUrl: "/government/validation",
    citizenId: null,
    userOpenId: CANONICAL_USER_OPEN_IDS.governmentReviewer,
    createdAt: "2026-09-16T08:30:00.000Z",
  },
] as const;
