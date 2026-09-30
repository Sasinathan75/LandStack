import { createServer, type Server } from "http";
import express from "express";
import axios, { type AxiosInstance } from "axios";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiRouter } from "./api/routes";
import { createAuthToken } from "./auth/authorization";

describe("Prompt 12 — Server-Side Authentication & Role Authorization", () => {
  let server: Server;
  let client: AxiosInstance;
  let baseUrl: string;

  let citizenToken: string;
  let citizenToken2: string;
  let governmentToken: string;

  beforeAll(async () => {
    // Spin up lightweight Express test server with the protected API router
    const app = express();
    app.use(express.json());
    app.use(apiRouter);

    await new Promise<void>((resolve) => {
      server = createServer(app);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (address && typeof address === "object") {
          baseUrl = `http://127.0.0.1:${address.port}`;
          client = axios.create({
            baseURL: baseUrl,
            validateStatus: () => true, // Don't throw on 4xx/5xx to inspect status and body
          });
        }
        resolve();
      });
    });

    // Generate valid tokens using server secret
    citizenToken = await createAuthToken({
      openId: "CIT-DEMO-001",
      name: "Demo Citizen",
      role: "CITIZEN",
      citizenId: "CIT-DEMO-001",
    });

    citizenToken2 = await createAuthToken({
      openId: "CIT-DEMO-002",
      name: "A. Sharma",
      role: "CITIZEN",
      citizenId: "CIT-DEMO-002",
    });

    governmentToken = await createAuthToken({
      openId: "GOV-DEMO-01",
      name: "A. Officer",
      role: "GOVERNMENT",
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // =========================================================================
  // 1. Unauthenticated Requests → 401
  // =========================================================================
  describe("1. Unauthenticated requests", () => {
    it("rejects unauthenticated GET /api/parcels with HTTP 401 and standard envelope", async () => {
      const res = await client.get("/api/parcels");
      expect(res.status).toBe(401);
      expect(res.data).toEqual({
        success: false,
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
    });

    it("rejects unauthenticated GET /api/validation with HTTP 401", async () => {
      const res = await client.get("/api/validation");
      expect(res.status).toBe(401);
      expect(res.data.error).toBe("UNAUTHORIZED");
    });

    it("rejects unauthenticated POST /api/requests with HTTP 401", async () => {
      const res = await client.post("/api/requests", {
        parcelId: "LS-PAR-0428",
        serviceType: "Certified RoR copy",
      });
      expect(res.status).toBe(401);
      expect(res.data.error).toBe("UNAUTHORIZED");
    });
  });

  // =========================================================================
  // 2. Invalid or Malformed Authentication → 401
  // =========================================================================
  describe("2. Invalid/missing authentication", () => {
    it("rejects malformed Bearer token with HTTP 401", async () => {
      const res = await client.get("/api/parcels", {
        headers: { Authorization: "Bearer bogus.malformed.token" },
      });
      expect(res.status).toBe(401);
      expect(res.data).toEqual({
        success: false,
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
    });

    it("rejects invalid cookie token with HTTP 401", async () => {
      const res = await client.get("/api/parcels", {
        headers: { Cookie: "app_session_id=totally-fake-cookie" },
      });
      expect(res.status).toBe(401);
      expect(res.data.error).toBe("UNAUTHORIZED");
    });
  });

  // =========================================================================
  // 3. Authenticated CITIZEN accessing Citizen Endpoints → 200 / 201
  // =========================================================================
  describe("3. Authenticated CITIZEN accessing citizen endpoints", () => {
    it("allows CITIZEN to list parcels via Bearer token", async () => {
      const res = await client.get("/api/parcels", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.parcels)).toBe(true);
      expect(res.data.count).toBeGreaterThanOrEqual(1);
    });

    it("allows CITIZEN to list parcels via Cookie", async () => {
      const res = await client.get("/api/parcels", {
        headers: { Cookie: `app_session_id=${citizenToken}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    it("allows CITIZEN to retrieve a specific parcel by ID", async () => {
      const res = await client.get("/api/parcels/LS-PAR-0428", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.parcel.id).toBe("LS-PAR-0428");
    });

    it("allows CITIZEN to submit a new service request", async () => {
      const res = await client.post(
        "/api/requests",
        {
          parcelId: "LS-PAR-0428",
          serviceType: "Certified RoR copy",
          purpose: "Home loan verification",
        },
        { headers: { Authorization: `Bearer ${citizenToken}` } }
      );
      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      expect(res.data.request.citizenId).toBe("CIT-DEMO-001");
      expect(res.data.request.parcelId).toBe("LS-PAR-0428");
    });

    it("allows CITIZEN to view their own service requests queue", async () => {
      const res = await client.get("/api/requests", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      // All returned requests must belong to CIT-DEMO-001
      expect(
        res.data.requests.every((r: { citizenId: string }) => r.citizenId === "CIT-DEMO-001")
      ).toBe(true);
    });
  });

  // =========================================================================
  // 4. Authenticated GOVERNMENT accessing Government Endpoints → 200 / 201
  // =========================================================================
  describe("4. Authenticated GOVERNMENT accessing government endpoints", () => {
    it("allows GOVERNMENT to access AI validation results", async () => {
      const res = await client.get("/api/validation", {
        headers: { Authorization: `Bearer ${governmentToken}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.validations)).toBe(true);
    });

    it("allows GOVERNMENT to retrieve satellite preview for a valid parcel", async () => {
      const res = await client.get("/api/satellite", {
        headers: { Authorization: `Bearer ${governmentToken}` },
        params: { parcelId: "LS-PAR-0428" },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.satellite).toBeDefined();
      expect(res.data.satellite.parcelId).toBe("LS-PAR-0428");
    });

    it("returns 400 when parcelId query parameter is missing", async () => {
      const res = await client.get("/api/satellite", {
        headers: { Authorization: `Bearer ${governmentToken}` },
      });
      expect(res.status).toBe(400);
      expect(res.data.success).toBe(false);
      expect(res.data.error).toBe("VALIDATION_ERROR");
    });

    it("returns 404 for unknown parcelId", async () => {
      const res = await client.get("/api/satellite", {
        headers: { Authorization: `Bearer ${governmentToken}` },
        params: { parcelId: "UNKNOWN-9999" },
      });
      expect(res.status).toBe(404);
      expect(res.data.success).toBe(false);
      expect(res.data.error).toBe("NOT_FOUND");
    });

    it("allows GOVERNMENT to access audit logs", async () => {
      const res = await client.get("/api/audit", {
        headers: { Authorization: `Bearer ${governmentToken}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.auditLogs)).toBe(true);
    });

    it("allows GOVERNMENT to access GIS monitor", async () => {
      const res = await client.get("/api/gis/monitor", {
        headers: { Authorization: `Bearer ${governmentToken}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.totalParcelsMonitored).toBeGreaterThan(0);
    });

    it("allows GOVERNMENT to access analytics", async () => {
      const res = await client.get("/api/analytics", {
        headers: { Authorization: `Bearer ${governmentToken}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.parcelsTotal).toBeGreaterThan(0);
    });

    it("allows GOVERNMENT to record a review decision", async () => {
      const res = await client.post(
        "/api/reviews/CASE-2026-0042/decision",
        { decision: "Approved", comments: "Valid boundary sketch confirmed." },
        { headers: { Authorization: `Bearer ${governmentToken}` } }
      );
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.review.decision).toBe("Approved");
    });

    it("allows GOVERNMENT to generate a report", async () => {
      const res = await client.post(
        "/api/reports/generate",
        { parcelId: "LS-PAR-0428" },
        { headers: { Authorization: `Bearer ${governmentToken}` } }
      );
      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      expect(res.data.report.status).toBe("Ready");
      expect(res.data.report.parcelId).toBe("LS-PAR-0428");
      expect(res.data.report.id).toBeDefined();

      // Retrieve the generated report
      const reportId = res.data.report.id;
      const getRes = await client.get(`/api/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${governmentToken}` },
      });
      expect(getRes.status).toBe(200);
      expect(getRes.data.success).toBe(true);
      expect(getRes.data.report.id).toBe(reportId);
      expect(getRes.data.report.content).toContain("LandSphere AI Report");
      expect(getRes.data.report.metadata.parcelInfo.id).toBe("LS-PAR-0428");

      // List reports and filter by parcelId
      const listRes = await client.get("/api/reports", {
        headers: { Authorization: `Bearer ${governmentToken}` },
        params: { parcelId: "LS-PAR-0428" },
      });
      expect(listRes.status).toBe(200);
      expect(listRes.data.success).toBe(true);
      expect(listRes.data.count).toBeGreaterThanOrEqual(1);
      expect(listRes.data.reports.some((r: { id: string }) => r.id === reportId)).toBe(true);
    });

    it("returns 404 when generating report for unknown parcel", async () => {
      const res = await client.post(
        "/api/reports/generate",
        { parcelId: "UNKNOWN-PARCEL-999" },
        { headers: { Authorization: `Bearer ${governmentToken}` } }
      );
      expect(res.status).toBe(404);
      expect(res.data.success).toBe(false);
      expect(res.data.error).toBe("NOT_FOUND");
    });

    it("returns 404 when retrieving unknown report", async () => {
      const res = await client.get("/api/reports/UNKNOWN-RPT-999", {
        headers: { Authorization: `Bearer ${governmentToken}` },
      });
      expect(res.status).toBe(404);
      expect(res.data.success).toBe(false);
      expect(res.data.error).toBe("NOT_FOUND");
    });
  });

  // =========================================================================
  // 5. CITIZEN accessing Government Endpoints → 403 FORBIDDEN
  // =========================================================================
  describe("5. CITIZEN accessing government endpoints is rejected with HTTP 403", () => {
    it("rejects CITIZEN accessing /api/validation with HTTP 403", async () => {
      const res = await client.get("/api/validation", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(403);
      expect(res.data).toEqual({
        success: false,
        error: "FORBIDDEN",
        message: "You do not have permission to access this resource",
      });
    });

    it("rejects CITIZEN accessing /api/satellite with HTTP 403", async () => {
      const res = await client.get("/api/satellite", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(403);
      expect(res.data.error).toBe("FORBIDDEN");
    });

    it("rejects CITIZEN accessing /api/audit with HTTP 403", async () => {
      const res = await client.get("/api/audit", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(403);
      expect(res.data.error).toBe("FORBIDDEN");
    });

    it("rejects CITIZEN accessing /api/gis/monitor with HTTP 403", async () => {
      const res = await client.get("/api/gis/monitor", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(403);
      expect(res.data.error).toBe("FORBIDDEN");
    });

    it("rejects CITIZEN accessing /api/analytics with HTTP 403", async () => {
      const res = await client.get("/api/analytics", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(403);
      expect(res.data.error).toBe("FORBIDDEN");
    });

    it("rejects CITIZEN attempting to record a review decision", async () => {
      const res = await client.post(
        "/api/reviews/CASE-2026-0042/decision",
        { decision: "Approved" },
        { headers: { Authorization: `Bearer ${citizenToken}` } }
      );
      expect(res.status).toBe(403);
      expect(res.data.error).toBe("FORBIDDEN");
    });

    it("rejects CITIZEN attempting to generate a governance report", async () => {
      const res = await client.post(
        "/api/reports/generate",
        { type: "Land Governance Summary" },
        { headers: { Authorization: `Bearer ${citizenToken}` } }
      );
      expect(res.status).toBe(403);
      expect(res.data.error).toBe("FORBIDDEN");
    });

    it("rejects CITIZEN accessing /api/reports with HTTP 403", async () => {
      const res = await client.get("/api/reports", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(403);
      expect(res.data.error).toBe("FORBIDDEN");
    });

    it("rejects CITIZEN accessing /api/reports/:id with HTTP 403", async () => {
      const res = await client.get("/api/reports/REP-TEST-001", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(403);
      expect(res.data.error).toBe("FORBIDDEN");
    });
  });

  // =========================================================================
  // 6. Privilege Escalation Prevention
  // =========================================================================
  describe("6. Prevent privilege escalation", () => {
    it("does not elevate privileges when CITIZEN sends role='GOVERNMENT' in body", async () => {
      const res = await client.get("/api/validation", {
        headers: { Authorization: `Bearer ${citizenToken}` },
        data: { role: "GOVERNMENT", userRole: "GOVERNMENT" },
      });
      expect(res.status).toBe(403);
      expect(res.data.error).toBe("FORBIDDEN");
    });

    it("does not elevate privileges when CITIZEN sends ?role=GOVERNMENT in query parameter", async () => {
      const res = await client.get("/api/validation?role=GOVERNMENT&role=ADMIN", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(403);
      expect(res.data.error).toBe("FORBIDDEN");
    });

    it("does not elevate privileges when CITIZEN sends custom x-role header", async () => {
      const res = await client.get("/api/validation", {
        headers: {
          Authorization: `Bearer ${citizenToken}`,
          "x-role": "GOVERNMENT",
          "x-user-role": "admin",
        },
      });
      expect(res.status).toBe(403);
      expect(res.data.error).toBe("FORBIDDEN");
    });

    it("prevents citizen from spoofing citizenId in POST /api/requests", async () => {
      // Authenticated citizen CIT-DEMO-001 sends citizenId: 'CIT-DEMO-002' in body
      const res = await client.post(
        "/api/requests",
        {
          citizenId: "CIT-DEMO-002",
          parcelId: "LS-PAR-0428",
          serviceType: "Certified RoR copy",
        },
        { headers: { Authorization: `Bearer ${citizenToken}` } }
      );
      expect(res.status).toBe(201);
      // The server MUST enforce the authenticated user's citizenId (CIT-DEMO-001)
      expect(res.data.request.citizenId).toBe("CIT-DEMO-001");
      expect(res.data.request.citizenId).not.toBe("CIT-DEMO-002");
    });
  });

  // =========================================================================
  // 7. Service-Request Ownership Protection
  // =========================================================================
  describe("7. Protect service-request operations & ownership boundaries", () => {
    it("allows CIT-DEMO-001 to access their own request (REQ-2026-0042)", async () => {
      const res = await client.get("/api/requests/REQ-2026-0042", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.request.id).toBe("REQ-2026-0042");
      expect(res.data.request.citizenId).toBe("CIT-DEMO-001");
    });

    it("rejects CIT-DEMO-001 attempting to access CIT-DEMO-002's request (REQ-2026-00999) with HTTP 403", async () => {
      const res = await client.get("/api/requests/REQ-2026-00999", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(403);
      expect(res.data).toEqual({
        success: false,
        error: "FORBIDDEN",
        message: "You do not have permission to access this resource",
      });
    });

    it("allows CIT-DEMO-002 to access their own request (REQ-2026-00999)", async () => {
      const res = await client.get("/api/requests/REQ-2026-00999", {
        headers: { Authorization: `Bearer ${citizenToken2}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.request.id).toBe("REQ-2026-00999");
      expect(res.data.request.citizenId).toBe("CIT-DEMO-002");
    });

    it("allows GOVERNMENT to access any citizen's request (REQ-2026-00999)", async () => {
      const res = await client.get("/api/requests/REQ-2026-00999", {
        headers: { Authorization: `Bearer ${governmentToken}` },
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.request.id).toBe("REQ-2026-00999");
    });
  });
});
