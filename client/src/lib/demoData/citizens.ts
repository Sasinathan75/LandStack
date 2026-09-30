import type { PortalRole, UserIdentity } from "@/types/platform";

export interface DemoCitizenProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  registeredPropertiesCount: number;
  authorizedParcelIds: string[];
}

export const primaryCitizen: DemoCitizenProfile = {
  id: "CIT-DEMO-001",
  name: "Citizen",
  email: "citizen.demo@example.test",
  phone: "+91 90000 00000",
  registeredPropertiesCount: 3,
  authorizedParcelIds: ["LS-PAR-0428", "LS-PAR-0420", "LS-PAR-0421"],
};

export const demoCitizens: DemoCitizenProfile[] = [
  primaryCitizen,
  {
    id: "CIT-DEMO-002",
    name: "A. Sharma",
    email: "sharma.a@example.test",
    phone: "+91 91111 00000",
    registeredPropertiesCount: 1,
    authorizedParcelIds: ["LS-PAR-0401"],
  },
];

export const demoUsers: Record<PortalRole, UserIdentity> = {
  government: {
    id: "GOV-DEMO-01",
    displayName: "A. Officer",
    role: "government",
    organization: "District land office",
    permissions: [
      "parcel:read",
      "validation:review",
      "satellite:read",
      "reports:read",
      "audit:read",
    ],
  },
  citizen: {
    id: primaryCitizen.id,
    displayName: primaryCitizen.name,
    role: "citizen",
    organization: "Authorized citizen",
    permissions: [
      "parcel:read:authorized",
      "records:read",
      "requests:create",
      "notifications:read",
    ],
  },
};
