import { test, expect } from "@playwright/test";
import { authenticateAndGo, citizenToken } from "./helpers/auth";

test.describe("2 · Citizen Flow", () => {
  test("citizen dashboard loads with authorized properties and metrics", async ({
    page,
    baseURL,
  }) => {
    await authenticateAndGo(page, "citizen", "/citizen", baseURL!);

    // Verify citizen portal shell header and greeting
    await expect(page.getByRole("heading", { name: "My Land Dashboard" })).toBeVisible();
    await expect(page.getByText("Hello, Demo Citizen")).toBeVisible();

    // Verify authorized properties section
    await expect(page.getByRole("heading", { name: "Your authorized properties" })).toBeVisible();
    await expect(page.locator(".citizen-dashboard-property-grid").getByText("LS-PAR-0428").first()).toBeVisible();
  });

  test("citizen search for parcel and navigation to parcel details", async ({
    page,
    baseURL,
  }) => {
    await authenticateAndGo(page, "citizen", "/citizen", baseURL!);

    // 1. Search for a parcel in citizen search box
    const searchInput = page.locator("input[placeholder*='Search your parcels']");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("LS-PAR-0428");

    // Click matching search result
    const searchResult = page.locator(".citizen-search-results button").first();
    await expect(searchResult).toBeVisible();
    await searchResult.click();

    // Verify navigation to parcel details
    await expect(page).toHaveURL(/.*\/citizen\/parcel/);
    await expect(page.getByRole("heading", { name: "Parcel details" })).toBeVisible();
    await expect(page.locator(".citizen-parcel-header")).toBeVisible();
    await expect(page.getByText("Ownership verified").first()).toBeVisible();

    // 2. Select specific property card from citizen dashboard
    await page.goto("/citizen");
    const propertyCard = page.locator(".citizen-dashboard-property-grid button").filter({ hasText: "LS-PAR-0428" });
    await expect(propertyCard).toBeVisible();
    await propertyCard.click();

    // Verify selected parcel details reflect LS-PAR-0428
    await expect(page).toHaveURL(/.*\/citizen\/parcel/);
    await expect(page.locator(".citizen-parcel-header").getByText("LS-PAR-0428")).toBeVisible();
  });

  test("citizen service request creation and tracking flow", async ({
    page,
    baseURL,
  }) => {
    await authenticateAndGo(page, "citizen", "/citizen/requests", baseURL!);

    // Verify requests page loads
    await expect(page.getByRole("heading", { name: "My Requests" })).toBeVisible();
    await expect(page.getByText("Request history").first()).toBeVisible();

    // Click Create new request
    const createBtn = page.getByRole("button", { name: "Create new request" }).first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Fill the new request form
    await expect(page.getByRole("heading", { name: "What do you need help with?" })).toBeVisible();
    const textarea = page.locator("textarea[placeholder*='Please describe your request']");
    await textarea.fill("Need a verified copy of ownership record for loan application");

    // Submit the request
    const submitBtn = page.getByRole("button", { name: "Submit request" });
    await submitBtn.click();

    // Verify success banner appears
    await expect(page.getByText("Your request has been submitted")).toBeVisible();
  });

  test("citizen API endpoints work with authenticated token", async ({
    request,
  }) => {
    const token = await citizenToken();

    // Citizen can retrieve parcels list
    const parcelsRes = await request.get("/api/parcels", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(parcelsRes.status()).toBe(200);
    const parcelsData = await parcelsRes.json();
    expect(parcelsData.success).toBe(true);
    expect(parcelsData.parcels.length).toBeGreaterThan(0);

    // Citizen can submit a service request
    const submitRes = await request.post("/api/requests", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        parcelId: "LS-PAR-0428",
        serviceType: "Certified RoR copy",
        purpose: "E2E verification test",
      },
    });
    expect(submitRes.status()).toBe(201);
    const submitData = await submitRes.json();
    expect(submitData.success).toBe(true);
    expect(submitData.request.citizenId).toBe("CIT-DEMO-001");

    // Citizen can retrieve their own service requests
    const reqListRes = await request.get("/api/requests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(reqListRes.status()).toBe(200);
    const reqListData = await reqListRes.json();
    expect(reqListData.success).toBe(true);
    expect(
      reqListData.requests.every(
        (r: { citizenId: string }) => r.citizenId === "CIT-DEMO-001"
      )
    ).toBe(true);
  });
});
