export interface LandRecordItem {
  id: string;
  name: string;
  number: string;
  parcelId: string;
  date: string;
  status: string;
  source: string;
  type: string;
}

export const demoLandRecords: LandRecordItem[] = [
  {
    id: "REC-001",
    name: "Ownership Record",
    number: "ROR-DEMO-10422",
    parcelId: "LS-PAR-0428",
    date: "12 Sep 2026",
    status: "Verified",
    source: "Synthetic RoR",
    type: "Record of Rights",
  },
  {
    id: "REC-002",
    name: "Registration extract",
    number: "REG-DEMO-77891",
    parcelId: "LS-PAR-0428",
    date: "16 Jun 2024",
    status: "Available",
    source: "Synthetic registry",
    type: "Registration",
  },
  {
    id: "REC-003",
    name: "Property tax receipt",
    number: "TAX-DEMO-0881",
    parcelId: "LS-PAR-0428",
    date: "22 Jul 2026",
    status: "Paid",
    source: "Synthetic tax register",
    type: "Tax",
  },
  {
    id: "REC-004",
    name: "Land-use record",
    number: "LUR-DEMO-2025-019",
    parcelId: "LS-PAR-0428",
    date: "01 Jan 2025",
    status: "Verified",
    source: "Synthetic GIS",
    type: "Land Use",
  },
  {
    id: "REC-005",
    name: "Ownership Record",
    number: "ROR-DEMO-10420",
    parcelId: "LS-PAR-0420",
    date: "11 Sep 2026",
    status: "Verified",
    source: "Synthetic RoR",
    type: "Record of Rights",
  },
  {
    id: "REC-006",
    name: "Ownership Record",
    number: "ROR-DEMO-10421",
    parcelId: "LS-PAR-0421",
    date: "10 Sep 2026",
    status: "Verified",
    source: "Synthetic RoR",
    type: "Record of Rights",
  },
];

export const demoTransactions = [
  {
    id: "TXN-0428-0482",
    parcelId: "LS-PAR-0428",
    type: "Mutation registered",
    date: "16 Jun 2024",
    status: "Completed",
    source: "Synthetic registration",
  },
  {
    id: "TXN-0428-0210",
    parcelId: "LS-PAR-0428",
    type: "Ownership transfer recorded",
    date: "03 Mar 2022",
    status: "Completed",
    source: "Synthetic registration",
  },
  {
    id: "TXN-0428-0105",
    parcelId: "LS-PAR-0428",
    type: "Ownership record created",
    date: "01 Apr 2021",
    status: "Completed",
    source: "Synthetic RoR",
  },
];
