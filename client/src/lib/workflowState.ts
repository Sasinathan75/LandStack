export type ReviewStatus = "Pending Review" | "Under Review" | "Approved" | "Escalated" | "Need Information" | "Completed";
export type RequestStatus = "Submitted" | "Under Review" | "Need Information" | "Completed" | "Escalated";

export type WorkflowAuditEvent = {
  id: string;
  timestamp: string;
  actor: string;
  role: "government" | "citizen" | "system";
  action: string;
  module: string;
  parcelId: string;
  caseId?: string;
  previousStatus?: string;
  newStatus?: string;
  detail?: string;
};

export type SharedWorkflowState = {
  citizenId: string;
  parcelId: string;
  ulpin: string;
  requestId: string;
  caseId: string;
  serviceType: string;
  issue: string;
  risk: "Low" | "Medium" | "High";
  reviewStatus: ReviewStatus;
  requestStatus: RequestStatus;
  reviewer: string;
  reviewerNotes: string;
  escalationReason: string;
  informationRequest: string;
  updatedAt: string;
  notifications: { id: string; title: string; detail: string; read: boolean; createdAt: string }[];
  auditEvents: WorkflowAuditEvent[];
};

export const initialWorkflowState: SharedWorkflowState = {
  citizenId: "CIT-DEMO-001",
  parcelId: "LS-PAR-0428",
  ulpin: "IN-AP-28-0428-019-7",
  requestId: "REQ-2026-0042",
  caseId: "CASE-2026-0042",
  serviceType: "Land Record Request",
  issue: "Potential Land-use Mismatch",
  risk: "High",
  reviewStatus: "Pending Review",
  requestStatus: "Submitted",
  reviewer: "Assigned Officer",
  reviewerNotes: "",
  escalationReason: "",
  informationRequest: "",
  updatedAt: "12 Sep 2026 10:14",
  notifications: [],
  auditEvents: [],
};

// NOTE: Business workflow data is now managed by the backend API. LocalStorage persistence has been removed to avoid storing sensitive or business‑critical information on the client.

export function readWorkflowState(): SharedWorkflowState {
  // For now we return the initial demo state. In a real deployment the state would be fetched from the backend.
  return initialWorkflowState;
}

export function persistWorkflowState(_state: SharedWorkflowState) {
  // No‑op: persistence is handled server‑side.
}

export function makeWorkflowEvent(action: string, previousStatus: string, newStatus: string, detail = ""): WorkflowAuditEvent {
  return { id: `AUD-DEMO-${Date.now()}`, timestamp: new Date().toISOString(), actor: "A. Officer", role: "government", action, module: "Review / Approval", parcelId: initialWorkflowState.parcelId, caseId: initialWorkflowState.caseId, previousStatus, newStatus, detail };
}
