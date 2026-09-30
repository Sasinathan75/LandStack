import { test, expect } from "@playwright/test";
import { authenticateAndGo, governmentToken } from "./helpers/auth";

test.describe("3 · Government Flow", () => {
  test("government dashboard loads with command center metrics and priority queue", async ({
    page,
    baseURL,
  }) => {
    await authenticateAndGo(page, "government", "/government", baseURL!);

    // Verify government portal shell and title
    await expect(page.getByRole("heading", { name: "Land Governance Overview" })).toBeVisible();

    // Verify key command center metric cards
    await expect(page.locator(".metric-grid").getByText("Total Parcels")).toBeVisible();
    await expect(page.locator(".metric-grid").getByText("Pending AI Validations")).toBeVisible();
    await expect(page.locator(".metric-grid").getByText("Satellite Changes")).toBeVisible();

    // Verify priority actions section
    await expect(page.getByRole("heading", { name: "Cases requiring attention" })).toBeVisible();
  });

  test("parcel 360 view displays unified identity, tabs and risk indicators", async ({
    page,
    baseURL,
  }) => {
    await authenticateAndGo(page, "government", "/government/parcel", baseURL!);

    // Verify Parcel 360 header
    await expect(page.getByRole("heading", { name: "Parcel 360°" })).toBeVisible();
    await expect(page.locator(".parcel-360-meta").getByText("ULPIN")).toBeVisible();

    // Verify tab navigation across intelligence dimensions
    const ownershipTab = page.locator(".pill-tabs button").getByText("Ownership");
    await expect(ownershipTab).toBeVisible();
    await ownershipTab.click();
    await expect(page.getByText("Recorded owner").first()).toBeVisible();

    const taxTab = page.locator(".pill-tabs button").getByText("Tax");
    await expect(taxTab).toBeVisible();
    await taxTab.click();
    await expect(page.getByText("TAX-DEMO-0881").first()).toBeVisible();
  });

  test("AI validation workspace displays findings, severity badges and review actions", async ({
    page,
    baseURL,
  }) => {
    await authenticateAndGo(page, "government", "/government/validation", baseURL!);

    // Verify AI validation page header and statistics
    await expect(page.getByRole("heading", { name: "AI Validation" })).toBeVisible();
    await expect(page.getByText("Assistive validation across land records")).toBeVisible();
    await expect(page.locator(".validation-stat-grid").getByText("Total validations")).toBeVisible();

    // Filter controls are present
    const issueSelect = page.locator("select[aria-label='Filter by issue type']");
    await expect(issueSelect).toBeVisible();
  });

  test("satellite monitoring displays observation feeds and change detection", async ({
    page,
    baseURL,
  }) => {
    await authenticateAndGo(page, "government", "/government/satellite", baseURL!);

    // Verify Satellite monitoring header and stats
    await expect(page.getByRole("heading", { name: "Satellite Monitoring" })).toBeVisible();
    await expect(page.locator(".module-stat-grid").getByText("Monitored parcels")).toBeVisible();
    await expect(page.getByText("BEFORE · 2024-06-15")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Observation list" })).toBeVisible();
  });

  test("government API access for governance operations", async ({ request }) => {
    const token = await governmentToken();

    // Government can query AI validations
    const valRes = await request.get("/api/validation", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(valRes.status()).toBe(200);
    const valData = await valRes.json();
    expect(valData.success).toBe(true);
    expect(Array.isArray(valData.validations)).toBe(true);

    // Government can query satellite observations
    const satRes = await request.get("/api/satellite?parcelId=LS-PAR-0428", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(satRes.status()).toBe(200);
    const satData = await satRes.json();
    expect(satData.success).toBe(true);
    expect(satData.satellite.parcelId).toBe("LS-PAR-0428");

    // Government can retrieve GIS monitor status
    const gisRes = await request.get("/api/gis/monitor", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(gisRes.status()).toBe(200);
    const gisData = await gisRes.json();
    expect(gisData.success).toBe(true);
    expect(gisData.status).toBe("operational");

    // Government can retrieve audit logs
    const auditRes = await request.get("/api/audit", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(auditRes.status()).toBe(200);
    const auditData = await auditRes.json();
    expect(auditData.success).toBe(true);
    expect(Array.isArray(auditData.auditLogs)).toBe(true);
  });
});
