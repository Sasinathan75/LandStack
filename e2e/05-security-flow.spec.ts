import { test, expect } from "@playwright/test";
import { citizenToken, createToken } from "./helpers/auth";

test.describe("5 · Security & Authorization Flow", () => {
  test("unauthenticated requests to protected endpoints return HTTP 401", async ({
    request,
  }) => {
    // Endpoints requiring authentication
    const endpoints = [
      { method: "GET", path: "/api/parcels" },
      { method: "GET", path: "/api/validation" },
      { method: "GET", path: "/api/satellite?parcelId=LS-PAR-0428" },
      { method: "GET", path: "/api/audit" },
      { method: "GET", path: "/api/reports" },
      { method: "GET", path: "/api/requests" },
      { method: "POST", path: "/api/requests" },
      { method: "POST", path: "/api/reports/generate" },
    ];

    for (const ep of endpoints) {
      const res =
        ep.method === "POST"
          ? await request.post(ep.path, { data: {} })
          : await request.get(ep.path);

      expect(res.status()).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("UNAUTHORIZED");
    }
  });

  test("citizen token accessing government-only endpoints returns HTTP 403", async ({
    request,
  }) => {
    const token = await citizenToken();
    const govOnlyEndpoints = [
      "/api/validation",
      "/api/satellite?parcelId=LS-PAR-0428",
      "/api/audit",
      "/api/gis/monitor",
      "/api/analytics",
      "/api/reports",
      "/api/reports/REP-TEST-001",
    ];

    for (const path of govOnlyEndpoints) {
      const res = await request.get(path, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("FORBIDDEN");
    }

    // Citizen attempting to generate a report returns 403
    const postRes = await request.post("/api/reports/generate", {
      headers: { Authorization: `Bearer ${token}` },
      data: { parcelId: "LS-PAR-0428" },
    });
    expect(postRes.status()).toBe(403);
    const postData = await postRes.json();
    expect(postData.error).toBe("FORBIDDEN");
  });

  test("citizen attempting to access another citizen's service request returns HTTP 403", async ({
    request,
  }) => {
    // Token for Citizen 1 (CIT-DEMO-001)
    const token1 = await citizenToken();

    // Token for Citizen 2 (CIT-DEMO-002)
    const token2 = await createToken({
      openId: "CIT-DEMO-002",
      name: "A. Sharma",
      role: "citizen",
      citizenId: "CIT-DEMO-002",
    });

    // CIT-DEMO-001 tries to access REQ-2026-00999 (owned by CIT-DEMO-002)
    const resForbidden = await request.get("/api/requests/REQ-2026-00999", {
      headers: { Authorization: `Bearer ${token1}` },
    });
    expect(resForbidden.status()).toBe(403);
    const dataForbidden = await resForbidden.json();
    expect(dataForbidden.error).toBe("FORBIDDEN");

    // CIT-DEMO-002 can access REQ-2026-00999
    const resAllowed = await request.get("/api/requests/REQ-2026-00999", {
      headers: { Authorization: `Bearer ${token2}` },
    });
    expect(resAllowed.status()).toBe(200);
    const dataAllowed = await resAllowed.json();
    expect(dataAllowed.success).toBe(true);
    expect(dataAllowed.request.id).toBe("REQ-2026-00999");
  });

  test("privilege escalation via request body, query params or headers is blocked", async ({
    request,
  }) => {
    const token = await citizenToken();

    // Body override attempt
    const bodyAttempt = await request.get("/api/validation", {
      headers: { Authorization: `Bearer ${token}` },
      data: { role: "GOVERNMENT", userRole: "ADMIN" },
    });
    expect(bodyAttempt.status()).toBe(403);

    // Query param override attempt
    const queryAttempt = await request.get("/api/validation?role=GOVERNMENT&role=ADMIN", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(queryAttempt.status()).toBe(403);

    // Custom header override attempt
    const headerAttempt = await request.get("/api/validation", {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-role": "GOVERNMENT",
        "x-user-role": "admin",
      },
    });
    expect(headerAttempt.status()).toBe(403);
  });

  test("no sensitive secrets or keys are leaked in DOM or response bodies", async ({
    page,
    request,
    baseURL,
  }) => {
    await page.goto("/");
    const pageContent = await page.content();

    // JWT secret string should never appear in frontend DOM
    expect(pageContent).not.toContain("landsphere-demo-jwt-secret");
    expect(pageContent).not.toContain("BUILT_IN_FORGE_API_KEY");

    // Public health endpoint should not expose raw database passwords or credentials
    const healthRes = await request.get("/api/health");
    const healthText = await healthRes.text();
    expect(healthText).not.toContain("postgres://");
    expect(healthText).not.toContain("password=");
  });
});
