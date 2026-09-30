import { CANONICAL_CITIZEN, CANONICAL_PARCEL } from "./core";
import { CANONICAL_REQUEST, CANONICAL_REVIEW_CASE, CANONICAL_VALIDATION } from "./records";

/** Canonical reports RPT-2026-0042 … RPT-2026-0040. */
export const CANONICAL_REPORTS = [
  {
    reportId: "RPT-2026-0042",
    parcelId: CANONICAL_PARCEL.parcelId,
    caseId: CANONICAL_REVIEW_CASE.caseId,
    title: `Parcel Report — ${CANONICAL_PARCEL.parcelId}`,
    reportType: "Parcel Report",
    generatedBy: "Demo Officer",
    fileFormat: "PDF",
    fileSize: "1.8 MB",
    downloadUrl: "demo://reports/RPT-2026-0042.pdf",
    generatedAt: "2026-09-12T11:20:00.000Z",
  },
  {
    reportId: "RPT-2026-0041",
    parcelId: null,
    caseId: null,
    title: "AI Validation Report — West district · 32 records",
    reportType: "AI Validation Report",
    generatedBy: "LandSphere Vision",
    fileFormat: "PDF",
    fileSize: "4.2 MB",
    downloadUrl: "demo://reports/RPT-2026-0041.pdf",
    generatedAt: "2026-09-11T16:45:00.000Z",
  },
  {
    reportId: "RPT-2026-0040",
    parcelId: null,
    caseId: null,
    title: "Land Governance Summary — August 2026",
    reportType: "Land Governance Summary",
    generatedBy: "Demo Administrator",
    fileFormat: "XLSX",
    fileSize: "860 KB",
    downloadUrl: "demo://reports/RPT-2026-0040.xlsx",
    generatedAt: "2026-09-01T06:00:00.000Z",
  },
] as const;

/** Canonical audit logs AUD-001 … AUD-003. */
export const CANONICAL_AUDIT_LOGS = [
  {
    logId: "AUD-001",
    parcelId: CANONICAL_PARCEL.parcelId,
    action: "Opened validation queue",
    entityType: "Validation",
    entityId: CANONICAL_VALIDATION.validationId,
    actorName: "A. Officer",
    actorRole: "GOVERNMENT",
    details: "Government officer opened the AI validation queue for the flagged parcel.",
    createdAt: "2026-09-16T09:31:00.000Z",
  },
  {
    logId: "AUD-002",
    parcelId: CANONICAL_PARCEL.parcelId,
    action: "Parcel identity verified",
    entityType: "Parcel",
    entityId: CANONICAL_PARCEL.parcelId,
    actorName: "System demo",
    actorRole: "SYSTEM",
    details: `ULPIN ${CANONICAL_PARCEL.ulpin} reconciled against the synthetic Record of Rights snapshot.`,
    createdAt: "2026-09-16T09:12:00.000Z",
  },
  {
    logId: "AUD-003",
    parcelId: CANONICAL_PARCEL.parcelId,
    action: "Viewed request status",
    entityType: "Request",
    entityId: CANONICAL_REQUEST.requestId,
    actorName: CANONICAL_CITIZEN.fullName,
    actorRole: "CITIZEN",
    details: "Citizen viewed the status of the pending Land Conversion NOC request.",
    createdAt: "2026-09-16T08:55:00.000Z",
  },
] as const;
