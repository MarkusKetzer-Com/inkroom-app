const { defineConfig, devices } = require('@playwright/test');

const PREVIEW_URL = 'https://preview-inkroom-app.mk-d93.workers.dev';

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8787',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/smoke.spec.js'],
    },
    {
      // Smoke tests run directly against the deployed preview
      name: 'smoke-preview',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: PREVIEW_URL,
      },
      testMatch: ['**/smoke.spec.js'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:8787',
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
});
