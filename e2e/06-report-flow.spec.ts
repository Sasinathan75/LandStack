import { test, expect } from "@playwright/test";
import { authenticateAndGo, governmentToken } from "./helpers/auth";

test.describe("6 · Report Generation & Document Storage Flow", () => {
  test("government user can generate a parcel report via API and retrieve its document", async ({
    request,
  }) => {
    const token = await governmentToken();

    // 1. Generate report for canonical parcel LS-PAR-0428
    const genRes = await request.post("/api/reports/generate", {
      headers: { Authorization: `Bearer ${token}` },
      data: { parcelId: "LS-PAR-0428" },
    });
    expect(genRes.status()).toBe(201);
    const genData = await genRes.json();
    expect(genData.success).toBe(true);
    expect(genData.report).toBeDefined();
    expect(genData.report.parcelId).toBe("LS-PAR-0428");
    expect(genData.report.status).toBe("Ready");

    const reportId = genData.report.id;
    expect(reportId).toBeDefined();

    // 2. Retrieve the generated document by ID
    const docRes = await request.get(`/api/reports/${reportId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(docRes.status()).toBe(200);
    const docData = await docRes.json();
    expect(docData.success).toBe(true);
    expect(docData.report.id).toBe(reportId);
    expect(docData.report.content).toContain("LandSphere AI Report");
    expect(docData.report.metadata.parcelInfo.id).toBe("LS-PAR-0428");

    // 3. List reports and verify the newly generated report is listed
    const listRes = await request.get("/api/reports?parcelId=LS-PAR-0428", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.status()).toBe(200);
    const listData = await listRes.json();
    expect(listData.success).toBe(true);
    expect(listData.count).toBeGreaterThanOrEqual(1);
    expect(listData.reports.some((r: { id: string }) => r.id === reportId)).toBe(true);
  });

  test("generating report for invalid or non-existent parcel returns 404 or 400", async ({
    request,
  }) => {
    const token = await governmentToken();

    // Unknown parcel
    const notFoundRes = await request.post("/api/reports/generate", {
      headers: { Authorization: `Bearer ${token}` },
      data: { parcelId: "LS-PAR-UNKNOWN-999" },
    });
    expect(notFoundRes.status()).toBe(404);
    const notFoundData = await notFoundRes.json();
    expect(notFoundData.error).toBe("NOT_FOUND");
  });

  test("government reports page renders report types, generates preview, and displays library", async ({
    page,
    baseURL,
  }) => {
    await authenticateAndGo(page, "government", "/government/reports", baseURL!);

    // Verify Reports page header
    await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
    await expect(page.getByText("Generate explainable parcel")).toBeVisible();

    // Verify report type cards
    await expect(page.locator(".report-type-card").filter({ hasText: "Parcel Report" })).toBeVisible();
    await expect(page.locator(".report-type-card").filter({ hasText: "AI Validation Report" })).toBeVisible();
    await expect(page.locator(".report-type-card").filter({ hasText: "Satellite Change Report" })).toBeVisible();

    // Click 'Parcel Report' to trigger generation and preview
    const parcelReportCard = page.locator(".report-type-card").filter({ hasText: "Parcel Report" });
    await parcelReportCard.click();

    // Verify preview card appears
    await expect(page.getByRole("heading", { name: /Parcel Report · Preview/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(".report-preview .report-preview-head .status-badge")).toBeVisible();

    // Verify Report library section
    await expect(page.getByRole("heading", { name: "Recent reports" })).toBeVisible();
  });
});
