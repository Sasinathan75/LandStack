import { createServer, type Server } from "http";
import express from "express";
import axios, { type AxiosInstance } from "axios";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiRouter } from "./api/routes";
import { createAuthToken } from "./auth/authorization";
import { auditService } from "./audit/auditService";
import { sensitiveRateLimiter } from "./security/rateLimiter";

describe("Prompt 18 — Audit & Security Hardening", () => {
  let server: Server;
  let client: AxiosInstance;
  let citizenToken: string;
  let citizenToken2: string;
  let governmentToken: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use(apiRouter);

    await new Promise<void>((resolve) => {
      server = createServer(app);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (address && typeof address === "object") {
          client = axios.create({
            baseURL: `http://127.0.0.1:${address.port}`,
            validateStatus: () => true,
          });
        }
        resolve();
      });
    });

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
    sensitiveRateLimiter.reset();
    sensitiveRateLimiter.setLimit(50);
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // =========================================================================
  // 1. Security Headers
  // =========================================================================
  describe("1. Security Headers & Cache Control", () => {
    it("returns expected security headers on protected API responses", async () => {
      const res = await client.get("/api/parcels", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
      expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(res.headers["cache-control"]).toContain("no-store");
      expect(res.headers["pragma"]).toBe("no-cache");
    });
  });

  // =========================================================================
  // 2. Input Validation (HTTP 400)
  // =========================================================================
  describe("2. Input Validation & Parameter Hardening", () => {
    it("rejects POST /api/requests with missing required fields with HTTP 400", async () => {
      const res = await client.post(
        "/api/requests",
        {},
        { headers: { Authorization: `Bearer ${citizenToken}` } }
      );
      expect(res.status).toBe(400);
      expect(res.data.error).toBe("VALIDATION_ERROR");
    });

    it("rejects path traversal sequence in parcel ID with HTTP 400", async () => {
      const res = await client.get("/api/parcels/..%2F..%2Fetc", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(400);
      expect(res.data.error).toBe("VALIDATION_ERROR");
    });

    it("rejects POST /api/validation with missing parcelId with HTTP 400", async () => {
      const res = await client.post(
        "/api/validation",
        {},
        { headers: { Authorization: `Bearer ${governmentToken}` } }
      );
      expect(res.status).toBe(400);
      expect(res.data.error).toBe("VALIDATION_ERROR");
    });

    it("rejects GET /api/satellite with missing parcelId query parameter with HTTP 400", async () => {
      const res = await client.get("/api/satellite", {
        headers: { Authorization: `Bearer ${governmentToken}` },
      });
      expect(res.status).toBe(400);
      expect(res.data.error).toBe("VALIDATION_ERROR");
    });
  });

  // =========================================================================
  // 3. Authorization & Ownership Boundaries
  // =========================================================================
  describe("3. Authorization & Cross-Tenant Boundary Enforcement", () => {
    it("rejects unauthenticated request with HTTP 401", async () => {
      const res = await client.get("/api/parcels");
      expect(res.status).toBe(401);
      expect(res.data.error).toBe("UNAUTHORIZED");
    });

    it("rejects CITIZEN attempting to access Government validation with HTTP 403", async () => {
      const res = await client.get("/api/validation", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(403);
      expect(res.data.error).toBe("FORBIDDEN");
    });

    it("rejects CIT-DEMO-001 attempting to access CIT-DEMO-002 request with HTTP 403", async () => {
      const res = await client.get("/api/requests/REQ-2026-00999", {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      expect(res.status).toBe(403);
      expect(res.data.error).toBe("FORBIDDEN");
    });
  });

  // =========================================================================
  // 4. Rate Limiting (HTTP 429)
  // =========================================================================
  describe("4. Rate Limiting & Abuse Protection", () => {
    it("returns HTTP 429 with Retry-After when rate limit is exceeded on sensitive endpoint", async () => {
      sensitiveRateLimiter.reset();
      // Configure temporary low threshold for deterministic testing
      sensitiveRateLimiter.setLimit(2, 60000);

      // Request 1: OK
      const res1 = await client.post(
        "/api/validation",
        { parcelId: "LS-PAR-0428" },
        { headers: { Authorization: `Bearer ${governmentToken}` } }
      );
      expect(res1.status).toBe(200);

      // Request 2: OK
      const res2 = await client.post(
        "/api/validation",
        { parcelId: "LS-PAR-0428" },
        { headers: { Authorization: `Bearer ${governmentToken}` } }
      );
      expect(res2.status).toBe(200);

      // Request 3: Exceeds threshold -> 429
      const res3 = await client.post(
        "/api/validation",
        { parcelId: "LS-PAR-0428" },
        { headers: { Authorization: `Bearer ${governmentToken}` } }
      );
      expect(res3.status).toBe(429);
      expect(res3.data.error).toBe("RATE_LIMITED");
      expect(res3.headers["retry-after"]).toBeDefined();

      // Reset limiter back to default
      sensitiveRateLimiter.reset();
      sensitiveRateLimiter.setLimit(50, 60000);
    });
  });

  // =========================================================================
  // 5. Audit Logging Hardening & Sanitization
  // =========================================================================
  describe("5. Centralized Audit Service & Data Sanitization", () => {
    it("records audit entry when report is generated", async () => {
      const res = await client.post(
        "/api/reports/generate",
        { parcelId: "LS-PAR-0428" },
        { headers: { Authorization: `Bearer ${governmentToken}` } }
      );
      expect(res.status).toBe(201);
      const reportId = res.data.report.id;

      const logs = auditService.getLogs();
      const match = logs.find((l) => l.entityId === reportId && l.entityType === "Report");
      expect(match).toBeDefined();
      expect(match?.action).toContain("Generate Report");
      expect(match?.status).toBe("SUCCESS");
    });

    it("records audit entry when validation is performed", async () => {
      const res = await client.post(
        "/api/validation",
        { parcelId: "LS-PAR-0428" },
        { headers: { Authorization: `Bearer ${governmentToken}` } }
      );
      expect(res.status).toBe(200);

      const logs = auditService.getLogs();
      const match = logs.find((l) => l.entityId === "LS-PAR-0428" && l.action === "Validate Parcel");
      expect(match).toBeDefined();
      expect(match?.role).toBe("government");
    });

    it("records audit entry when satellite imagery is accessed", async () => {
      const res = await client.get("/api/satellite", {
        headers: { Authorization: `Bearer ${governmentToken}` },
        params: { parcelId: "LS-PAR-0428" },
      });
      expect(res.status).toBe(200);

      const logs = auditService.getLogs();
      const match = logs.find((l) => l.entityId === "LS-PAR-0428" && l.action === "View Satellite Imagery");
      expect(match).toBeDefined();
    });

    it("sanitizes sensitive credentials, passwords, and tokens before logging", () => {
      const recorded = auditService.recordEvent({
        actor: "Security Test",
        role: "system",
        action: "Sanitization Verification",
        entityType: "Request",
        entityId: "SEC-TEST-01",
        details: {
          password: "SuperSecretPassword123!",
          authToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake",
          bearerHeader: "Bearer secret-token-value",
          safeField: "safe-unrestricted-value",
        },
      });

      expect(recorded.details).toBeDefined();
      expect(recorded.details).not.toContain("SuperSecretPassword123!");
      expect(recorded.details).not.toContain("secret-token-value");
      expect(recorded.details).toContain("[REDACTED]");
      expect(recorded.details).toContain("safe-unrestricted-value");
    });
  });
});
