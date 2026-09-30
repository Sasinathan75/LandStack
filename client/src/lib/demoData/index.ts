export * from "./parcels";
export * from "./citizens";
export * from "./validations";
export * from "./satellite";
export * from "./requests";
export * from "./reviews";
export * from "./notifications";
export * from "./reports";
export * from "./auditLogs";
export * from "./landRecords";
export * from "./lookups";

export type { Parcel } from "@/types/parcel";
export type PortalRole = "government" | "citizen";

export const governmentNav = [
  { label: "Dashboard", href: "/government", icon: "grid" },
  { label: "GIS Explorer", href: "/government/gis", icon: "map" },
  { label: "Parcel 360°", href: "/government/parcel", icon: "layers" },
  { label: "AI Validation", href: "/government/validation", icon: "scan" },
  { label: "Satellite Monitoring", href: "/government/satellite", icon: "satellite" },
  { label: "Analytics", href: "/government/analytics", icon: "chart" },
  { label: "Reports", href: "/government/reports", icon: "file" },
  { label: "Review / Approval", href: "/government/review", icon: "check" },
  { label: "Audit Logs", href: "/government/audit", icon: "history" },
];

export const citizenNav = [
  { label: "Dashboard", href: "/citizen", icon: "grid" },
  { label: "My Land", href: "/citizen/land", icon: "land" },
  { label: "My Records", href: "/citizen/records", icon: "file" },
  { label: "My Parcel Map", href: "/citizen/map", icon: "map" },
  { label: "My Requests", href: "/citizen/requests", icon: "inbox" },
  { label: "Notifications", href: "/citizen/notifications", icon: "bell" },
  { label: "AI Land Assistant", href: "/citizen/assistant", icon: "spark" },
];

export const statusStyles = {
  Verified: "status-verified",
  "Under review": "status-review",
  Flagged: "status-flagged",
} as const;
