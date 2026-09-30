export type ParcelStatus = "Verified" | "Under review" | "Flagged";
export type RiskLevel = "Low" | "Medium" | "High";
export type LandUse = "Residential" | "Mixed use" | "Agricultural" | "Institutional" | "Commercial";

export type GeoJSONPosition = [number, number];

export type ParcelPolygonGeometry = {
  type: "Polygon";
  coordinates: GeoJSONPosition[][];
};

export type ParcelMultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: GeoJSONPosition[][][];
};

/**
 * GeoJSON geometry accepted for a land parcel. PostGIS
 * `ST_AsGeoJSON` returns `Polygon` for the seeded `geometry(Polygon, 4326)`
 * column, but `MultiPolygon` is supported end-to-end so a parcel split over
 * several disjoint survey pieces is never silently dropped.
 */
export type ParcelGeometry = ParcelPolygonGeometry | ParcelMultiPolygonGeometry;

/**
 * Real land-status facts joined from PostgreSQL/PostGIS
 * (`parcel_owners`, `land_records`, `transactions`, `encumbrances`,
 * `property_taxes`, `ai_validations`, `restrictions`).
 *
 * `null` always means "no row exists in the database" — the UI renders that
 * as "Not recorded" instead of inventing a value.
 */
export interface ParcelDetailStatuses {
  /** Primary recorded owner as stored in `parcel_owners` -> `citizens`. */
  ownership: {
    ownerName: string | null;
    ownershipType: string | null;
    sharePercent: number | null;
    isPrimary: boolean;
    coOwnerCount: number;
    label: string;
  };
  /** Registration / record-of-rights state from `land_records`. */
  registration: {
    status: string | null;
    recordType: string | null;
    recordNumber: string | null;
    issuingAuthority: string | null;
    label: string;
  };
  /** Latest property-tax assessment from `property_taxes`. */
  propertyTax: {
    paymentStatus: string | null;
    assessmentYear: string | null;
    amountDue: number | null;
    amountPaid: number | null;
    label: string;
  };
  /** Latest encumbrance from `encumbrances`. */
  encumbrance: {
    status: string | null;
    encumbranceType: string | null;
    holderName: string | null;
    label: string;
  };
  /** Latest AI validation from `ai_validations`. */
  validation: {
    status: string | null;
    riskLevel: RiskLevel | null;
    issueTitle: string | null;
    validationType: string | null;
    label: string;
  };
  /** Restriction types from `restrictions` (empty array when unrestricted). */
  restrictions: string[];
  /** PostGIS metadata for the row this detail was read from. */
  geometry: {
    srid: number | null;
    geometryType: string | null;
  };
}

export interface Parcel {
  id: string;
  ulpin: string;
  owner: string;
  area: string;
  locality: string;
  coordinates: string;
  location: {
    locality: string;
    coordinates: string;
  };
  landUse: LandUse;
  status: ParcelStatus;
  risk: RiskLevel;
  lastUpdated: string;
  geometry: ParcelGeometry;
  /** Seeded survey number from PostgreSQL (`parcels.survey_number`). */
  surveyNumber?: string;
  /** Seeded district label from PostgreSQL (`parcels.district`). */
  district?: string;
  /** Seeded state label from PostgreSQL (`parcels.state`). */
  state?: string;
  /** Which backend produced this parcel: PostGIS rows or the bundled mirror. */
  source?: "postgis" | "bundled";
  /** Real land-status facts; present when read from PostgreSQL. */
  details?: ParcelDetailStatuses;
}

export interface ParcelFeatureProperties {
  parcelId: string;
  ULPIN: string;
  area: string;
  landUse: LandUse;
  status: ParcelStatus;
  risk: RiskLevel;
  /** Optional attributes supplied by the PostGIS GeoJSON endpoint. */
  owner?: string;
  locality?: string;
  /** Seeded survey number from PostgreSQL. */
  surveyNumber?: string;
  district?: string;
  state?: string;
  /** PostGIS `ST_SRID(geometry)` for the row the feature was built from. */
  srid?: number;
  /** PostGIS `GeometryType(geometry)` for the row the feature was built from. */
  geometryType?: string;
  /** Feature centroid in EPSG:4326, derived from the PostGIS geometry. */
  centroid?: GeoJSONPosition;
  /** Feature bbox `[minLng, minLat, maxLng, maxLat]`, derived from PostGIS. */
  bbox?: [number, number, number, number];
  /** Real land-status facts carried so the details panel needs no mock data. */
  details?: ParcelDetailStatuses;
  /** PostGIS `updated_at` for the parcel row (ISO date, `YYYY-MM-DD`). */
  updatedAt?: string;
  /**
   * Deterministic tint bucket (0-5) derived from the Parcel ID, used so
   * neighbouring polygons are visually distinguishable.
   */
  tint?: number;
  /** Seeded restriction types joined per parcel; absent when unrestricted. */
  restriction?: string;
}

export interface ParcelFeature {
  type: "Feature";
  properties: ParcelFeatureProperties;
  geometry: ParcelGeometry;
}

export interface ParcelFeatureCollection {
  type: "FeatureCollection";
  features: ParcelFeature[];
}


export interface ULPINRecord {
  value: string;
  parcelId: string;
  stateCode: string;
  districtCode: string;
  villageCode: string;
}

export interface OwnershipRecord {
  id: string;
  parcelId: string;
  ownerLabel: string;
  ownershipType: "Recorded owner" | "Co-owner" | "Authorized occupant";
  effectiveFrom: string;
  source: string;
}

export interface TransactionRecord {
  id: string;
  parcelId: string;
  type: "Registration" | "Mutation" | "Lease";
  status: "Completed" | "In review" | "Pending document";
  date: string;
}

export interface EncumbranceRecord {
  id: string;
  parcelId: string;
  type: "Mortgage" | "Court stay" | "None recorded";
  status: "Active" | "Released" | "Clear";
  source: string;
}
