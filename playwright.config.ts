import { defineConfig, devices } from '@playwright/test';

/**
 * The two flows that can never break are E2E-1 (Client Magic link view to
 * Approve) and E2E-2 (Razorpay webhook to paid). docs/16-TESTING-STRATEGY.md §4.
 *
 * The Client project runs on a mobile viewport with no stored state, because a
 * Client never has an account and must never inherit one from a previous test.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'agency',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.agency\.spec\.ts/,
    },
    {
      name: 'client',
      // Mid-range Android profile. The Client surface is mobile-first and must
      // work inside the WhatsApp in-app browser. docs/09 §3.2.
      use: { ...devices['Pixel 5'], storageState: { cookies: [], origins: [] } },
      testMatch: /.*\.client\.spec\.ts/,
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: 'npm run build && npm run start', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI, timeout: 180_000 },
});
