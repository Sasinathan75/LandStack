import type { NotificationRecord } from "@/types/platform";

export const notifications: NotificationRecord[] = [
  {
    id: "NOT-001",
    audience: "citizen",
    title: "Your RoR request is under review",
    detail: "REQ-2026-0042 has moved to document review for parcel LS-PAR-0428.",
    severity: "Info",
    read: false,
    createdAt: "2026-09-16T10:00:00Z",
  },
  {
    id: "NOT-002",
    audience: "citizen",
    title: "A record is ready to view",
    detail: "Your contact update request is ready.",
    severity: "Success",
    read: false,
    createdAt: "2026-09-01T09:00:00Z",
  },
  {
    id: "NOT-003",
    audience: "government",
    title: "AI validation requires review",
    detail: "AI validation queue has new findings for LS-PAR-0428.",
    severity: "Action required",
    read: false,
    createdAt: "2026-09-16T08:30:00Z",
  },
];
