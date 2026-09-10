import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["json", { outputFile: "test-results/playwright-results.json" }]],
  use: { baseURL: "http://127.0.0.1:3018", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: { command: "npm run dev -- --hostname 127.0.0.1 --port 3018", url: "http://127.0.0.1:3018", reuseExistingServer: false, timeout: 120_000 },
});
