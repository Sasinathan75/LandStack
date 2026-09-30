import type { ServiceRequest } from "@/types/platform";

export const primaryServiceRequest: ServiceRequest = {
  id: "REQ-2026-0042",
  citizenId: "CIT-DEMO-001",
  parcelId: "LS-PAR-0428",
  serviceType: "Certified RoR copy",
  submittedDate: "2026-09-12",
  status: "In progress",
  lastUpdated: "2026-09-16",
};

export const serviceRequests: ServiceRequest[] = [
  primaryServiceRequest,
  {
    id: "REQ-2026-00984",
    citizenId: "CIT-DEMO-001",
    parcelId: "LS-PAR-0428",
    serviceType: "Certified RoR copy",
    submittedDate: "2026-09-14",
    status: "In progress",
    lastUpdated: "2026-09-16",
  },
  {
    id: "REQ-2026-00921",
    citizenId: "CIT-DEMO-001",
    parcelId: "LS-PAR-0420",
    serviceType: "Contact update",
    submittedDate: "2026-08-27",
    status: "Ready",
    lastUpdated: "2026-09-01",
  },
  {
    id: "REQ-2026-00935",
    citizenId: "CIT-DEMO-001",
    parcelId: "LS-PAR-0421",
    serviceType: "Transaction status",
    submittedDate: "2026-09-05",
    status: "Submitted",
    lastUpdated: "2026-09-05",
  },
];
