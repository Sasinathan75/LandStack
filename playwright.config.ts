import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for LandSphere AI (Prompt 19).
 *
 * Uses the existing dev server (tsx + vite) on a dedicated port (3099)
 * so it doesn't collide with any manually-running dev instance.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,           // sequential to avoid port conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,

  use: {
    baseURL: "http://localhost:3099",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npx tsx server/_core/index.ts",
    port: 3099,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      NODE_ENV: "development",
      PORT: "3099",
    },
  },
});
