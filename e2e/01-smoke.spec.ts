import { test, expect } from "@playwright/test";

/**
 * 1. APPLICATION SMOKE — Verify the app starts and serves without fatal errors.
 */
test.describe("1 · Application Smoke", () => {
  test("home page loads with correct title and content", async ({ page }) => {
    await page.goto("/");
    // Wait for body content
    await expect(page.locator("body")).not.toBeEmpty();
    // The Home page renders brand text
    await expect(page.getByRole("link", { name: /LANDSPHERE/i }).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("no fatal console errors on home page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/", { waitUntil: "networkidle" });
    // Allow React dev warnings but reject actual runtime errors
    const fatalErrors = errors.filter(
      (e) =>
        !e.includes("Warning:") &&
        !e.includes("DevTools") &&
        !e.includes("third-party cookie")
    );
    expect(fatalErrors).toEqual([]);
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Sign in to LandSphere AI" })
    ).toBeVisible({ timeout: 15000 });
  });

  test("health endpoint responds", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.status).toBeDefined();
  });

  test("404 page renders for unknown routes", async ({ page }) => {
    await page.goto("/unknown-route-xyz");
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
