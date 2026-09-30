import { describe, expect, it } from "vitest";
import { initialWorkflowState, makeWorkflowEvent } from "../client/src/lib/workflowState";

describe("Stage 8 shared workflow demo state", () => {
  it("keeps the citizen, parcel, request, case and issue connected", () => {
    expect(initialWorkflowState.citizenId).toBe("CIT-DEMO-001");
    expect(initialWorkflowState.parcelId).toBe("LS-PAR-0428");
    expect(initialWorkflowState.ulpin).toBe("IN-AP-28-0428-019-7");
    expect(initialWorkflowState.requestId).toBe("REQ-2026-0042");
    expect(initialWorkflowState.caseId).toBe("CASE-2026-0042");
    expect(initialWorkflowState.reviewStatus).toBe("Pending Review");
  });

  it("creates an auditable status transition event", () => {
    const event = makeWorkflowEvent("Case approved", "Pending Review", "Approved", "Synthetic review note");
    expect(event.role).toBe("government");
    expect(event.module).toBe("Review / Approval");
    expect(event.previousStatus).toBe("Pending Review");
    expect(event.newStatus).toBe("Approved");
    expect(event.parcelId).toBe(initialWorkflowState.parcelId);
    expect(event.caseId).toBe(initialWorkflowState.caseId);
  });
});
