import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E smoke tests.
 *
 * Tests run against a local Next.js dev server (started automatically).
 * External services (Firebase, API) are mocked via page.route() inside tests.
 */
export default defineConfig({
  testDir: './e2e',

  // Run tests sequentially — we only have one smoke test suite
  fullyParallel: false,

  // Retry once on CI to handle flaky server startup
  retries: process.env.CI ? 1 : 0,

  // Single worker to avoid port conflicts with dev server
  workers: 1,

  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:3000',
    // Capture trace on retry to help debug CI failures
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    // Reuse existing dev server locally; always start fresh in CI
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // Provide fake-but-valid Firebase credentials so the SDK initialises
    // without throwing auth/invalid-api-key. All Firebase network calls are
    // intercepted by page.route() mocks inside the tests anyway.
    env: {
      NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyE2eTestFakeKeyForPlaywright000001',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'e2e-test-project.firebaseapp.com',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'e2e-test-project',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'e2e-test-project.appspot.com',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000001',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:000000000001:web:e2etestfakeappid001',
      NEXT_PUBLIC_API_URL: 'http://localhost:5000/api',
    },
  },
});
