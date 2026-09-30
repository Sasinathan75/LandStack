import { test, expect } from "@playwright/test";
import { authenticateAndGo } from "./helpers/auth";

test.describe("4 · GIS & MapLibre Flow", () => {
  test("government GIS explorer renders MapLibre container, layer options, and parcel list", async ({
    page,
    baseURL,
  }) => {
    await authenticateAndGo(page, "government", "/government/gis", baseURL!);

    // Verify GIS Explorer header
    await expect(page.getByRole("heading", { name: "Explore the land fabric" })).toBeVisible();

    // Verify MapLibre container element exists in DOM
    const mapContainer = page.locator(".map-container");
    await expect(mapContainer).toBeVisible();

    // The map must draw the seeded PostgreSQL/PostGIS parcels served by
    // /api/gis/parcels.geojson — not the bundled demo fallback.
    await expect(mapContainer).toHaveAttribute("data-map-ready", "true");
    await expect(mapContainer).toHaveAttribute("data-source", "postgis");
    await expect(mapContainer).toHaveAttribute("data-parcel-count", /^[1-9]\d*$/);

    // Verify layer list panel
    await expect(page.getByRole("heading", { name: "Intelligence layers" })).toBeVisible();
    await expect(page.locator(".layer-list .layer-row").filter({ hasText: "Parcel boundaries" })).toBeVisible();
    await expect(page.locator(".layer-list .layer-row").filter({ hasText: "Land use" })).toBeVisible();
    await expect(page.locator(".layer-list .layer-row").filter({ hasText: "Risk indicators" })).toBeVisible();

    // Verify extent list and select a parcel
    await expect(page.locator(".map-extent-list .card-kicker")).toBeVisible();
    const parcelButton = page.locator(".map-extent-list button").first();
    await expect(parcelButton).toBeVisible();
    await parcelButton.click();

    // Verify selected parcel panel updates with details
    const selectedPanel = page.locator(".gis-selected-panel");
    await expect(selectedPanel).toBeVisible();
    await expect(selectedPanel.locator(".selected-panel-kicker")).toBeVisible();
    await expect(selectedPanel.locator(".feature-grid").getByText("ULPIN")).toBeVisible();
  });

  test("government GIS layer switcher changes active map layer context", async ({
    page,
    baseURL,
  }) => {
    await authenticateAndGo(page, "government", "/government/gis", baseURL!);

    // Switch to 'Land use' layer
    const landUseLayerBtn = page.locator(".layer-list .layer-row").filter({ hasText: "Land use" });
    await landUseLayerBtn.click();
    await expect(landUseLayerBtn).toHaveClass(/layer-row-active/);

    // Switch to 'Risk indicators' layer
    const riskLayerBtn = page.locator(".layer-list .layer-row").filter({ hasText: "Risk indicators" });
    await riskLayerBtn.click();
    await expect(riskLayerBtn).toHaveClass(/layer-row-active/);
  });

  test("citizen parcel map loads authorized single-parcel boundary view", async ({
    page,
    baseURL,
  }) => {
    await authenticateAndGo(page, "citizen", "/citizen/map", baseURL!);

    // Verify Citizen My Parcel Map header
    await expect(page.getByRole("heading", { name: "My Parcel Map" })).toBeVisible();

    // Verify MapLibre container is present
    const mapContainer = page.locator(".map-container");
    await expect(mapContainer).toBeVisible();

    // Citizen sessions still read the authorized parcel extent from PostGIS.
    await expect(mapContainer).toHaveAttribute("data-map-ready", "true");
    await expect(mapContainer).toHaveAttribute("data-source", "postgis");

    // Verify private authorized map view label and legend
    await expect(page.getByText("AUTHORIZED MAP VIEW")).toBeVisible();
    await expect(page.getByText("Private view")).toBeVisible();
    await expect(page.locator(".citizen-legend").getByText("Your authorized parcel")).toBeVisible();
  });
});
