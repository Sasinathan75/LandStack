import type { RiskLevel } from "./parcel";

export type PortalRole = "government" | "citizen";

export interface UserIdentity {
  id: string;
  displayName: string;
  role: PortalRole;
  organization?: string;
  permissions: string[];
}

export interface AIValidationResult {
  id: string;
  parcelId: string;
  issueType: "Ownership mismatch" | "Area mismatch" | "Land-use mismatch" | "Document inconsistency" | "Transaction anomaly" | "Restriction conflict";
  description: string;
  riskLevel: RiskLevel;
  source: "RoR comparison" | "Registration record" | "Master plan" | "AI rules engine";
  status: "Open" | "In review" | "Resolved" | "Dismissed";
  confidence: number;
  createdAt: string;
  humanReviewRequired: boolean;
}

export interface SatelliteObservation {
  id: string;
  parcelId: string;
  captureDate: string;
  provider: "Synthetic Sentinel demo" | "Synthetic Landsat demo";
  changeType: "No material change" | "New structure" | "Vegetation loss" | "Boundary change" | "Possible land-use change";
  changePercent: number;
  confidence: number;
  reviewStatus: "Clear" | "Needs review" | "Reviewed";
}

export interface ServiceRequest {
  id: string;
  citizenId: string;
  parcelId: string;
  serviceType: "Certified RoR copy" | "Contact update" | "Transaction status";
  submittedDate: string;
  status: "Submitted" | "In progress" | "Ready" | "Closed";
  lastUpdated: string;
}

export interface NotificationRecord {
  id: string;
  audience: PortalRole;
  title: string;
  detail: string;
  severity: "Info" | "Success" | "Action required";
  read: boolean;
  createdAt: string;
}

export interface ReportRecord {
  id: string;
  type: "Parcel Report" | "AI Validation Report" | "Satellite Change Report" | "Land Governance Summary";
  scope: string;
  status: "Ready" | "Generating" | "Archived";
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actor: string;
  role: PortalRole;
  action: string;
  entityType: "Parcel" | "Validation" | "Request" | "Report";
  entityId: string;
  timestamp: string;
}
