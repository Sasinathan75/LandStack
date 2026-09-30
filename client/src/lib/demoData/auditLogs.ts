import type { AuditLogRecord } from "@/types/platform";

export const auditLogs: AuditLogRecord[] = [
  {
    id: "AUD-001",
    actor: "A. Officer",
    role: "government",
    action: "Opened validation queue",
    entityType: "Validation",
    entityId: "VAL-2026-0042",
    timestamp: "2026-09-16T09:31:00Z",
  },
  {
    id: "AUD-002",
    actor: "System demo",
    role: "government",
    action: "Parcel identity verified",
    entityType: "Parcel",
    entityId: "LS-PAR-0428",
    timestamp: "2026-09-16T09:12:00Z",
  },
  {
    id: "AUD-003",
    actor: "Citizen",
    role: "citizen",
    action: "Viewed request status",
    entityType: "Request",
    entityId: "REQ-2026-0042",
    timestamp: "2026-09-16T08:55:00Z",
  },
];
