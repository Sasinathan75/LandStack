export const parcelIntelligenceChain = [
  "Parcel",
  "ULPIN",
  "Ownership",
  "Transactions",
  "Encumbrance",
  "LandUse",
  "BuildingPermission",
  "PropertyTax",
  "Utilities",
  "Restrictions",
  "AIValidation",
  "SatelliteObservation",
] as const;

export const conceptualEntities = [
  "User",
  "Role",
  ...parcelIntelligenceChain,
  "ServiceRequest",
  "Notification",
  "Report",
  "AuditLog",
] as const;

export const futureProcessingTasks = [
  "satellite_processing",
  "large_gis_processing",
  "ai_validation",
  "batch_data_ingestion",
  "report_generation",
] as const;

export const objectStorageScopes = ["documents", "satellite-imagery", "generated-reports", "uploaded-files"] as const;

export const securityFoundations = {
  authentication: ["OAuth2", "OIDC", "JWT"],
  authorization: "Role-based access control with server-side permission checks",
  validation: "Typed request schemas and explicit error envelopes",
  audit: "Append-only audit events for governance actions",
  secrets: "Environment variables only; never embed API keys in frontend code",
} as const;

export const deploymentTargets = ["Docker", "Cloud hosting", "Environment-variable configuration", "CI/CD"] as const;

export const databaseReadiness = {
  engine: "PostgreSQL",
  spatialExtension: "PostGIS",
  geometryColumn: "Parcel.geometry",
  processingTools: ["GeoPandas", "Shapely", "Rasterio"],
} as const;
