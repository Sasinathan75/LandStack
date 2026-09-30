export interface ReviewCase {
  id: string;
  parcelId: string;
  requestId?: string;
  validationId: string;
  issueType: string;
  riskLevel: "Low" | "Medium" | "High";
  status: "Pending Review" | "Under Review" | "Approved" | "Escalated" | "Need Information" | "Completed";
  reviewer: string;
  source: string;
  createdAt: string;
}

export const demoReviewCases: ReviewCase[] = [
  {
    id: "CASE-2026-0042",
    parcelId: "LS-PAR-0428",
    requestId: "REQ-2026-0042",
    validationId: "VAL-2026-0042",
    issueType: "Potential Land-use Mismatch",
    riskLevel: "High",
    status: "Pending Review",
    reviewer: "Assigned Officer",
    source: "Master plan",
    createdAt: "2026-09-12T10:14:00Z",
  },
  {
    id: "CASE-2026-0184",
    parcelId: "LS-PAR-0421",
    validationId: "VAL-2026-0184",
    issueType: "Ownership mismatch",
    riskLevel: "High",
    status: "Pending Review",
    reviewer: "Assigned Officer",
    source: "RoR comparison",
    createdAt: "2026-09-10T09:31:00Z",
  },
  {
    id: "CASE-2026-0185",
    parcelId: "LS-PAR-0420",
    validationId: "VAL-2026-0185",
    issueType: "Land-use mismatch",
    riskLevel: "Medium",
    status: "Under Review",
    reviewer: "Assigned Officer",
    source: "Master plan",
    createdAt: "2026-09-11T11:10:00Z",
  },
  {
    id: "CASE-2026-0186",
    parcelId: "LS-PAR-0423",
    validationId: "VAL-2026-0186",
    issueType: "Document inconsistency",
    riskLevel: "Medium",
    status: "Pending Review",
    reviewer: "Assigned Officer",
    source: "AI rules engine",
    createdAt: "2026-09-12T14:22:00Z",
  },
  {
    id: "CASE-2026-0187",
    parcelId: "LS-PAR-0410",
    validationId: "VAL-2026-0187",
    issueType: "Restriction conflict",
    riskLevel: "High",
    status: "Pending Review",
    reviewer: "Assigned Officer",
    source: "AI rules engine",
    createdAt: "2026-09-13T08:15:00Z",
  },
];
