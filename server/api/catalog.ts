import type { ApiEndpoint } from "../../shared/api-contracts";

export const apiCatalog: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/parcels",
    purpose: "List or search parcels with GIS boundaries",
    roles: ["government", "citizen"],
  },
  {
    method: "GET",
    path: "/api/parcels/:id",
    purpose: "Retrieve single unified parcel identity and 360 profile",
    roles: ["government", "citizen"],
  },
  {
    method: "GET",
    path: "/api/gis/parcels.geojson",
    purpose: "Serve PostGIS parcel boundaries as GeoJSON for the MapLibre map",
    roles: ["government", "citizen"],
  },
  {
    method: "GET",
    path: "/api/validation",
    purpose: "Query AI validation findings and risk scores",
    roles: ["government"],
  },
  {
    method: "GET",
    path: "/api/satellite",
    purpose: "Query satellite change detection observations",
    roles: ["government"],
  },
  {
    method: "POST",
    path: "/api/requests",
    purpose: "Submit citizen service requests",
    roles: ["citizen"],
  },
  {
    method: "GET",
    path: "/api/requests",
    purpose: "Retrieve citizen or government service request queues",
    roles: ["government", "citizen"],
  },
  {
    method: "POST",
    path: "/api/reviews/:id/decision",
    purpose: "Record government officer review decisions",
    roles: ["government"],
  },
  {
    method: "GET",
    path: "/api/audit",
    purpose: "Query immutable audit logs",
    roles: ["government"],
  },
  {
    method: "POST",
    path: "/api/reports/generate",
    purpose: "Generate structured parcel and governance reports",
    roles: ["government"],
  },
];
