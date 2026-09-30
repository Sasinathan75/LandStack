import {
  CANONICAL_CITIZEN,
  CANONICAL_PARCEL,
  CANONICAL_USER_OPEN_IDS,
  SECONDARY_CITIZEN,
  syntheticOwnerCitizenId,
} from "./canonical";
import { demoCitizenOwnedParcels, syntheticOwnedParcels } from "./parcels";

/**
 * Roles, users, user-role links, citizens and ownership links (Prompt 11, Steps 5–7).
 *
 * Authentication is intentionally NOT implemented in Prompt 11 — this module only
 * creates the relational foundation (users ↔ user_roles ↔ roles, citizens.user_id).
 */

export const ROLE_NAMES = ["GOVERNMENT", "CITIZEN", "ADMIN"] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export interface RoleSeed {
  name: RoleName;
  description: string;
}

export const roleSeeds: RoleSeed[] = [
  {
    name: "GOVERNMENT",
    description: "District land office officer: reviews parcels, AI validations and requests.",
  },
  {
    name: "CITIZEN",
    description: "Authorised land owner: views owned parcels, records and service requests.",
  },
  {
    name: "ADMIN",
    description: "Platform administrator: manages roles, audit logs and system configuration.",
  },
];

export interface UserSeed {
  openId: string;
  name: string;
  email: string;
  loginMethod: string;
  /** Legacy single-role column kept for backwards compatibility with Prompt 10 auth. */
  role: string;
  /** Roles linked through the `user_roles` join table. */
  roleNames: RoleName[];
  /** Links this user to a citizen profile when applicable. */
  citizenId?: string;
}

export const userSeeds: UserSeed[] = [
  {
    openId: CANONICAL_USER_OPEN_IDS.admin,
    name: "Demo Administrator",
    email: "admin.demo@example.test",
    loginMethod: "demo",
    role: "admin",
    roleNames: ["ADMIN"],
  },
  {
    openId: CANONICAL_USER_OPEN_IDS.governmentOfficer,
    name: "A. Officer",
    email: "officer.demo@example.test",
    loginMethod: "demo",
    role: "government",
    roleNames: ["GOVERNMENT"],
  },
  {
    openId: CANONICAL_USER_OPEN_IDS.governmentReviewer,
    name: "Demo Officer",
    email: "reviewer.demo@example.test",
    loginMethod: "demo",
    role: "government",
    roleNames: ["GOVERNMENT"],
  },
  {
    openId: CANONICAL_USER_OPEN_IDS.citizen,
    name: CANONICAL_CITIZEN.fullName,
    email: CANONICAL_CITIZEN.email,
    loginMethod: "demo",
    role: "user",
    roleNames: ["CITIZEN"],
    citizenId: CANONICAL_CITIZEN.citizenId,
  },
];

export interface CitizenSeed {
  citizenId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  aadhaarMasked: string | null;
  panMasked: string | null;
  address: string | null;
  district: string;
  state: string;
  /** Optional user link (`users.open_id`). */
  userOpenId?: string;
}

function syntheticCitizenSeeds(): CitizenSeed[] {
  return syntheticOwnedParcels().map((parcel) => {
    const citizenId = syntheticOwnerCitizenId(parcel.parcelId);
    const suffix = citizenId.replace("CIT-SYN-", "");
    return {
      citizenId,
      fullName: parcel.ownerName,
      email: null,
      phone: null,
      aadhaarMasked: `XXXX-XXXX-${suffix}`,
      panMasked: null,
      address: parcel.location,
      district: parcel.district,
      state: parcel.state,
    };
  });
}

export const citizenSeeds: CitizenSeed[] = [
  {
    citizenId: CANONICAL_CITIZEN.citizenId,
    fullName: CANONICAL_CITIZEN.fullName,
    email: CANONICAL_CITIZEN.email,
    phone: CANONICAL_CITIZEN.phone,
    aadhaarMasked: "XXXX-XXXX-0001",
    panMasked: "XXXXX0001X",
    address: `${CANONICAL_PARCEL.location} — authorised landholder`,
    district: CANONICAL_CITIZEN.district,
    state: CANONICAL_CITIZEN.state,
    userOpenId: CANONICAL_USER_OPEN_IDS.citizen,
  },
  {
    citizenId: SECONDARY_CITIZEN.citizenId,
    fullName: SECONDARY_CITIZEN.fullName,
    email: SECONDARY_CITIZEN.email,
    phone: SECONDARY_CITIZEN.phone,
    aadhaarMasked: "XXXX-XXXX-0002",
    panMasked: "XXXXX0002X",
    address: `Kondapur Sector 1, ${CANONICAL_PARCEL.district}, ${CANONICAL_PARCEL.state}`,
    district: CANONICAL_PARCEL.district,
    state: CANONICAL_PARCEL.state,
  },
  ...syntheticCitizenSeeds(),
];

export interface OwnershipSeed {
  parcelId: string;
  citizenId: string;
  ownershipPercentage: string;
  ownershipType: string;
  isPrimary: boolean;
}

function buildOwnershipSeeds(): OwnershipSeed[] {
  const seeds: OwnershipSeed[] = [];

  for (const parcel of demoCitizenOwnedParcels()) {
    seeds.push({
      parcelId: parcel.parcelId,
      citizenId: CANONICAL_CITIZEN.citizenId,
      ownershipPercentage: "100.00",
      ownershipType: "Sole Owner",
      isPrimary: true,
    });
  }

  for (const parcel of syntheticOwnedParcels()) {
    seeds.push({
      parcelId: parcel.parcelId,
      citizenId: syntheticOwnerCitizenId(parcel.parcelId),
      ownershipPercentage: "100.00",
      ownershipType: "Sole Owner",
      isPrimary: true,
    });
  }

  // Prompt 10 records CIT-DEMO-002 as *authorised* for LS-PAR-0401 (not a co-owner):
  // modelled as a 0% authorised-representative link so the ownership record of the
  // registered landholder stays intact.
  seeds.push({
    parcelId: SECONDARY_CITIZEN.authorizedParcelId,
    citizenId: SECONDARY_CITIZEN.citizenId,
    ownershipPercentage: "0.00",
    ownershipType: "Authorized Representative",
    isPrimary: false,
  });

  return seeds;
}

export const ownershipSeeds: OwnershipSeed[] = buildOwnershipSeeds();

/** Canonical citizen ownership rows, used by the verification step. */
export const canonicalCitizenOwnership: OwnershipSeed[] = ownershipSeeds.filter(
  (seed) => seed.citizenId === CANONICAL_CITIZEN.citizenId
);
