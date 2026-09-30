import type {
  InsertAuditLog,
  InsertNotification,
  InsertReport,
  InsertRequestDocument,
  InsertReviewCase,
  InsertReviewEvent,
  InsertServiceRequest,
} from "../../../drizzle/schema";
import {
  CANONICAL_AUDIT_LOGS,
  CANONICAL_CITIZEN,
  CANONICAL_NOTIFICATIONS,
  CANONICAL_PARCEL,
  CANONICAL_REPORTS,
  CANONICAL_REQUEST,
  CANONICAL_REQUEST_DOCUMENTS,
  CANONICAL_REVIEW_CASE,
  CANONICAL_REVIEW_EVENTS,
  CANONICAL_VALIDATION,
  SECONDARY_REVIEW_CASES,
  SECONDARY_SERVICE_REQUESTS,
  SECONDARY_VALIDATIONS,
} from "./canonical";
import { integrityHash } from "../geometry";
import { assertParcelExists } from "./parcels";
import { dayTs, ts } from "./time";

/**
 * Workflow aggregates: `service_requests`, `request_documents`, `review_cases`,
 * `review_events`, `notifications`, `reports` and `audit_logs`.
 *
 * Seeds carry canonical *string* identifiers (`REQ-…`, `CASE-…`, `CIT-…`, `LS-PAR-…`)
 * and the runner resolves them to numeric foreign keys, keeping this module
 * database-free and unit-testable.
 */

export type ServiceRequestSeed = Omit<InsertServiceRequest, "citizenId" | "parcelId"> & {
  citizenId: string;
  parcelId: string;
};
export type RequestDocumentSeed = Omit<InsertRequestDocument, "requestId"> & {
  requestId: string;
};
export type ReviewCaseSeed = Omit<
  InsertReviewCase,
  "parcelId" | "requestId" | "validationId"
> & {
  parcelId: string;
  requestId: string | null;
  validationId: string | null;
};
export type ReviewEventSeed = Omit<InsertReviewEvent, "caseId"> & { caseId: string };
export type NotificationSeed = Omit<InsertNotification, "citizenId" | "userId"> & {
  citizenId: string | null;
  userOpenId: string | null;
};
export type ReportSeed = Omit<InsertReport, "parcelId" | "caseId"> & {
  parcelId: string | null;
  caseId: string | null;
};
export type AuditLogSeed = Omit<InsertAuditLog, "parcelId"> & { parcelId: string | null };

/** Canonical REQ-2026-0042 (₹1,200, Pending) plus the remaining Prompt 10 requests. */
export const serviceRequestSeeds: ServiceRequestSeed[] = [
  {
    requestId: CANONICAL_REQUEST.requestId,
    citizenId: CANONICAL_REQUEST.citizenId,
    parcelId: CANONICAL_REQUEST.parcelId,
    requestType: CANONICAL_REQUEST.requestType,
    purpose: CANONICAL_REQUEST.purpose,
    amount: CANONICAL_REQUEST.amount,
    currency: CANONICAL_REQUEST.currency,
    paymentStatus: CANONICAL_REQUEST.paymentStatus,
    status: CANONICAL_REQUEST.status,
    remarks: "Awaiting boundary survey sketch verification before conversion approval.",
    createdAt: dayTs(CANONICAL_REQUEST.submittedDate),
    updatedAt: dayTs(CANONICAL_REQUEST.lastUpdated),
  },
  ...SECONDARY_SERVICE_REQUESTS.map((request) => ({
    requestId: request.requestId,
    citizenId: CANONICAL_CITIZEN.citizenId,
    parcelId: request.parcelId,
    requestType: request.requestType,
    purpose: request.purpose,
    amount: request.amount,
    currency: "INR",
    paymentStatus: request.paymentStatus,
    status: request.status,
    remarks: null,
    createdAt: dayTs(request.submittedDate),
    updatedAt: dayTs(request.lastUpdated),
  })),
];

/** Supporting documents attached to the canonical request. */
export const requestDocumentSeeds: RequestDocumentSeed[] = CANONICAL_REQUEST_DOCUMENTS.map(
  (document) => ({
    requestId: CANONICAL_REQUEST.requestId,
    documentName: document.documentName,
    documentType: document.documentType,
    fileUrl: document.fileUrl,
    fileSizeBytes: document.fileSizeBytes,
    mimeType: document.mimeType,
    verified: document.verified,
    uploadedAt: dayTs(CANONICAL_REQUEST.submittedDate),
  })
);

/** Canonical case CASE-2026-0042 (linked to REQ-2026-0042 + VAL-2026-0042) plus the Prompt 10 review queue. */
export const reviewCaseSeeds: ReviewCaseSeed[] = [
  {
    caseId: CANONICAL_REVIEW_CASE.caseId,
    parcelId: CANONICAL_REVIEW_CASE.parcelId,
    requestId: CANONICAL_REVIEW_CASE.requestId,
    validationId: CANONICAL_VALIDATION.validationId,
    title: CANONICAL_REVIEW_CASE.title,
    priority: CANONICAL_REVIEW_CASE.priority,
    status: CANONICAL_REVIEW_CASE.status,
    assignedOfficer: CANONICAL_REVIEW_CASE.reviewer,
    slaDaysRemaining: CANONICAL_REVIEW_CASE.slaDaysRemaining,
    recommendation: null,
    createdAt: ts(CANONICAL_REVIEW_CASE.createdAt),
    updatedAt: ts(CANONICAL_REVIEW_CASE.createdAt),
  },
  ...SECONDARY_REVIEW_CASES.map((reviewCase) => ({
    caseId: reviewCase.caseId,
    parcelId: reviewCase.parcelId,
    requestId: null,
    validationId: reviewCase.validationId,
    title: `${reviewCase.issueType} — ${reviewCase.parcelId}`,
    priority: reviewCase.priority,
    status: reviewCase.status,
    assignedOfficer: null,
    slaDaysRemaining: reviewCase.slaDaysRemaining,
    recommendation: null,
    createdAt: ts(reviewCase.createdAt),
    updatedAt: ts(reviewCase.createdAt),
  })),
];

/** Audit timeline for the canonical case (Prompt 10 workflow events). */
export const reviewEventSeeds: ReviewEventSeed[] = CANONICAL_REVIEW_EVENTS.map((event) => ({
  caseId: CANONICAL_REVIEW_CASE.caseId,
  eventType: event.eventType,
  authorName: event.authorName,
  authorRole: event.authorRole,
  comments: event.comments,
  previousStatus: event.previousStatus,
  newStatus: event.newStatus,
  createdAt: ts(event.createdAt),
}));

/** Prompt 10 notifications (citizen + government audiences). */
export const notificationSeeds: NotificationSeed[] = CANONICAL_NOTIFICATIONS.map((notification) => ({
  notificationId: notification.notificationId,
  citizenId: notification.citizenId,
  userOpenId: notification.userOpenId,
  audience: notification.audience,
  title: notification.title,
  message: notification.message,
  type: notification.type,
  isRead: notification.isRead,
  linkUrl: notification.linkUrl,
  createdAt: ts(notification.createdAt),
}));

/** Generated reports (parcel report + district summaries). */
export const reportSeeds: ReportSeed[] = CANONICAL_REPORTS.map((report) => ({
  reportId: report.reportId,
  parcelId: report.parcelId,
  caseId: report.caseId,
  title: report.title,
  reportType: report.reportType,
  generatedBy: report.generatedBy,
  fileFormat: report.fileFormat,
  fileSize: report.fileSize,
  downloadUrl: report.downloadUrl,
  generatedAt: ts(report.generatedAt),
}));

/** Immutable audit trail entries (deterministic demo integrity hash). */
export const auditLogSeeds: AuditLogSeed[] = CANONICAL_AUDIT_LOGS.map((log) => ({
  logId: log.logId,
  parcelId: log.parcelId,
  action: log.action,
  entityType: log.entityType,
  entityId: log.entityId,
  actorName: log.actorName,
  actorRole: log.actorRole,
  details: log.details,
  previousState: null,
  newState: null,
  integrityHash: integrityHash(log.logId, log.entityId, log.createdAt),
  createdAt: ts(log.createdAt),
}));

/**
 * Offline referential checks run before the database runner starts: every
 * workflow seed must point at canonical Prompt 10 identifiers.
 */
export function assertWorkflowSeedReferences(): void {
  const parcelSeeds: Array<{ parcelId: string | null }> = [
    ...serviceRequestSeeds,
    ...reviewCaseSeeds,
    ...auditLogSeeds,
    ...reportSeeds,
  ];
  for (const seed of parcelSeeds) {
    if (seed.parcelId !== null) {
      assertParcelExists(seed.parcelId);
    }
  }

  const canonicalCase = reviewCaseSeeds.find((seed) => seed.caseId === CANONICAL_REVIEW_CASE.caseId);
  if (!canonicalCase) {
    throw new Error(
      `Canonical review case ${CANONICAL_REVIEW_CASE.caseId} is missing from reviewCaseSeeds`
    );
  }
  if (canonicalCase.parcelId !== CANONICAL_PARCEL.parcelId) {
    throw new Error(
      `Canonical case must reference ${CANONICAL_PARCEL.parcelId}, received ${canonicalCase.parcelId}`
    );
  }

  const knownValidationIds = new Set<string>([
    CANONICAL_VALIDATION.validationId,
    ...SECONDARY_VALIDATIONS.map((validation) => validation.validationId),
  ]);
  for (const reviewCase of reviewCaseSeeds) {
    if (reviewCase.validationId !== null && !knownValidationIds.has(reviewCase.validationId)) {
      throw new Error(
        `Review case ${reviewCase.caseId} references unknown validation ${reviewCase.validationId}`
      );
    }
  }

  const knownRequestIds = new Set(serviceRequestSeeds.map((seed) => seed.requestId));
  for (const document of requestDocumentSeeds) {
    if (!knownRequestIds.has(document.requestId)) {
      throw new Error(`Request document references unknown request ${document.requestId}`);
    }
  }

  const knownCaseIds = new Set(reviewCaseSeeds.map((seed) => seed.caseId));
  for (const event of reviewEventSeeds) {
    if (!knownCaseIds.has(event.caseId)) {
      throw new Error(`Review event references unknown case ${event.caseId}`);
    }
  }
  for (const report of reportSeeds) {
    if (report.caseId !== null && !knownCaseIds.has(report.caseId)) {
      throw new Error(`Report ${report.reportId} references unknown case ${report.caseId}`);
    }
  }
}
