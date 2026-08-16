import { defineConfig, devices } from "@playwright/test"

/**
 * Tests E2E du SAS et de l'application étudiante.
 * Réutilise le serveur de dev déjà lancé (port 3000) — `reuseExistingServer`.
 * Lancement : `bun run test:e2e` (ou `npx playwright test`).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  // Réutilise le serveur de dev déjà lancé sur le port 3000 ; s'il est
  // absent, en démarre un (la base de dev est partagée).
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
