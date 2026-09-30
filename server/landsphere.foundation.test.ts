import { describe, expect, it } from "vitest";
import { citizenNav, demoParcels, governmentNav, parcelFeatureCollection, statusStyles, validationResults, satelliteObservations, serviceRequests } from "../client/src/lib/demoData";
import { getParcelCentroid } from "../client/src/lib/gis";
import { hasPermission } from "../client/src/contexts/LandStackContext";
import { apiCatalog } from "./api/catalog";
import { conceptualEntities, databaseReadiness, parcelIntelligenceChain } from "../shared/architecture";

describe("LandSphere foundation demo model", () => {
  it("ships a realistic synthetic parcel register with stable identities", () => {
    expect(demoParcels.length).toBeGreaterThanOrEqual(30);
    expect(new Set(demoParcels.map((parcel) => parcel.id)).size).toBe(demoParcels.length);
    expect(demoParcels.every((parcel) => parcel.ulpin.startsWith("IN-AP-"))).toBe(true);
    expect(demoParcels.every((parcel) => Boolean(parcel.owner))).toBe(true);
    expect(demoParcels.some((parcel) => parcel.owner === "Citizen")).toBe(true);
    expect(demoParcels.some((parcel) => parcel.status === "Flagged")).toBe(true);
    expect(demoParcels.some((parcel) => parcel.status === "Under review")).toBe(true);
  });

  it("keeps government and citizen navigation intentionally distinct", () => {
    const governmentLabels = governmentNav.map((item) => item.label);
    const citizenLabels = citizenNav.map((item) => item.label);

    expect(governmentLabels).toContain("GIS Explorer");
    expect(governmentLabels).toContain("Review / Approval");
    expect(governmentLabels).toContain("Audit Logs");
    expect(citizenLabels).toContain("My Land");
    expect(citizenLabels).toContain("My Requests");
    expect(citizenLabels).toContain("AI Land Assistant");
    expect(governmentLabels).not.toContain("My Requests");
    expect(citizenLabels).not.toContain("Audit Logs");
  });

  it("provides a style token for every parcel lifecycle state", () => {
    expect(Object.keys(statusStyles).sort()).toEqual(["Flagged", "Under review", "Verified"].sort());
  });

  it("keeps parcel geometry and related mock records connected", () => {
    expect(parcelFeatureCollection.type).toBe("FeatureCollection");
    expect(parcelFeatureCollection.features).toHaveLength(demoParcels.length);
    expect(getParcelCentroid(demoParcels[0].id)).toHaveLength(2);
    expect(validationResults.every((item) => demoParcels.some((parcel) => parcel.id === item.parcelId))).toBe(true);
    expect(satelliteObservations.every((item) => demoParcels.some((parcel) => parcel.id === item.parcelId))).toBe(true);
    expect(serviceRequests.every((item) => demoParcels.some((parcel) => parcel.id === item.parcelId))).toBe(true);
  });

  it("exposes role-scoped permissions and an API integration boundary", () => {
    const government = { id: "gov", displayName: "Demo officer", role: "government" as const, permissions: ["parcel:read", "validation:review"] };
    const citizen = { id: "cit", displayName: "Demo resident", role: "citizen" as const, permissions: ["parcel:read:authorized", "requests:create"] };
    expect(hasPermission(government, "validation:review")).toBe(true);
    expect(hasPermission(citizen, "validation:review")).toBe(false);
    expect(apiCatalog.some((endpoint) => endpoint.path === "/api/validation" && endpoint.roles.includes("government"))).toBe(true);
    expect(apiCatalog.some((endpoint) => endpoint.path === "/api/requests" && endpoint.method === "POST" && endpoint.roles.includes("citizen"))).toBe(true);
  });

  it("keeps the parcel-centric intelligence chain explicit for future services", () => {
    expect(parcelIntelligenceChain[0]).toBe("Parcel");
    expect(parcelIntelligenceChain).toContain("AIValidation");
    expect(parcelIntelligenceChain.at(-1)).toBe("SatelliteObservation");
    expect(conceptualEntities).toContain("AuditLog");
    expect(databaseReadiness.engine).toBe("PostgreSQL");
    expect(databaseReadiness.spatialExtension).toBe("PostGIS");
  });
});
