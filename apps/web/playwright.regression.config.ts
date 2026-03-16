import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the regression E2E test suite.
 *
 * Runs against a local Next.js dev server (started automatically).
 * External services (Firebase, API) are mocked via page.route() inside tests.
 * NOT included in CI — intended for local pre-release validation.
 */
export default defineConfig({
  testDir: './e2e-regression',

  // Tests are independent and can run in parallel
  fullyParallel: true,

  // No retries for fast local feedback
  retries: 0,

  // HTML reporter for interactive local reports with screenshots and traces
  reporter: 'html',

  // 30s per test — generous for mocked network tests
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:3000',
    // Capture trace on failure for debugging
    trace: 'retain-on-failure',
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
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
    // Reuse existing dev server locally
    reuseExistingServer: true,
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
      NEXT_PUBLIC_API_URL: 'http://localhost:5000',
    },
  },
});
