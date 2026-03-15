import { expect, Page, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIREBASE_PROJECT_ID = 'e2e-test-project';
const SMOKE_USER = {
  localId: 'smoke-test-uid',
  email: 'smoke@example.com',
  displayName: 'Smoke Test User',
};

/**
 * Build a syntactically valid (but fake) Firebase JWT.
 *
 * The Firebase JS client SDK does NOT validate JWT signatures — it trusts
 * tokens that come from identitytoolkit.googleapis.com (which we mock).
 * The payload includes the `firebase` claim so the SDK can populate
 * providerData without extra network calls.
 */
function buildFakeFirebaseJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key' })).toString(
    'base64url'
  );
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: SMOKE_USER.localId,
      uid: SMOKE_USER.localId,
      email: SMOKE_USER.email,
      email_verified: true,
      name: SMOKE_USER.displayName,
      aud: FIREBASE_PROJECT_ID,
      iss: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      iat: now,
      exp: now + 3600,
      auth_time: now,
      // Firebase-specific claim: supplies providerData without needing accounts:lookup
      firebase: {
        identities: { email: [SMOKE_USER.email] },
        sign_in_provider: 'password',
      },
    })
  ).toString('base64url');
  return `${header}.${payload}.smoke-test-signature-not-validated-client-side`;
}

/**
 * Register all network intercepts needed for the smoke test:
 *  - Firebase Auth REST API (sign-in, token refresh)
 *  - App API (auth sync, progress, lesson detail, exercise submit)
 *
 * Routes are registered with a generic API fallback first (lowest priority
 * in Playwright's LIFO matching), then specific routes on top.
 */
async function mockNetwork(page: Page) {
  const FAKE_JWT = buildFakeFirebaseJwt();

  // Generic fallback for any unmatched API server call (localhost:5000)
  // NOTE: apiClient uses `new URL(path, baseUrl)` — when path starts with '/',
  // the URL constructor drops baseUrl's path, so '/auth/sync' resolves to
  // http://localhost:5000/auth/sync (not /api/auth/sync).
  await page.route(/localhost:5000/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );

  // --- Firebase ---

  // Firebase Identity Toolkit — handle each endpoint separately because
  // Firebase SDK calls multiple endpoints after signIn (e.g. accounts:lookup
  // to reload user profile) and each expects a different response shape.
  await page.route(/identitytoolkit\.googleapis\.com/, (route) => {
    const url = route.request().url();

    if (url.includes('accounts:lookup')) {
      // Called by Firebase SDK after signIn to reload the user's profile
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'identitytoolkit#GetAccountInfoResponse',
          users: [
            {
              localId: SMOKE_USER.localId,
              email: SMOKE_USER.email,
              displayName: SMOKE_USER.displayName,
              emailVerified: true,
              providerUserInfo: [
                {
                  providerId: 'password',
                  email: SMOKE_USER.email,
                  federatedId: SMOKE_USER.email,
                },
              ],
              passwordUpdatedAt: 1_600_000_000_000,
              lastLoginAt: '1600000000000',
              createdAt: '1600000000000',
            },
          ],
        }),
      });
    }

    // Default: signInWithEmailAndPassword response
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'identitytoolkit#VerifyPasswordResponse',
        localId: SMOKE_USER.localId,
        email: SMOKE_USER.email,
        displayName: SMOKE_USER.displayName,
        idToken: FAKE_JWT,
        registered: true,
        refreshToken: 'fake-refresh-token',
        expiresIn: '3600',
      }),
    });
  });

  // Firebase Secure Token API: token refresh
  await page.route(/securetoken\.googleapis\.com/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: FAKE_JWT,
        expires_in: '3600',
        token_type: 'Bearer',
        refresh_token: 'fake-refresh-token',
        id_token: FAKE_JWT,
        user_id: SMOKE_USER.localId,
        project_id: FIREBASE_PROJECT_ID,
      }),
    })
  );

  // --- App API ---

  // POST /auth/sync — sync Firebase user to the database (API server on :5000)
  await page.route(/localhost:5000\/auth\/sync/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        email: 'smoke@example.com',
        displayName: 'Smoke Test User',
        activeLanguage: 'es',
        cefrLevel: 'A1',
      }),
    })
  );

  // GET /progress — dashboard progress summary (API server on :5000)
  await page.route(/localhost:5000\/progress/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalPoints: 0,
        currentStreak: 0,
        levels: [
          {
            id: '1',
            code: 'A1',
            name: 'Beginner',
            completionPercentage: 0,
            units: [
              {
                id: '1',
                title: 'Greetings & Introductions',
                completionPercentage: 0,
                lessons: [
                  {
                    id: 'smoke-lesson-1',
                    title: 'Basic Greetings',
                    completed: false,
                    completionPercentage: 0,
                  },
                ],
              },
            ],
          },
        ],
      }),
    })
  );

  // GET /lessons/smoke-lesson-1 — lesson detail with one exercise (API server on :5000)
  // NOTE: lesson page maps data.unit.title and data.unit.cefrLevel.code, so the response
  // must use the nested ApiLesson shape, not flat fields like unitName/levelCode.
  await page.route(/localhost:5000\/lessons\/smoke-lesson-1/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'smoke-lesson-1',
        title: 'Basic Greetings',
        description: 'Learn basic Spanish greetings',
        objective: 'Greet people in Spanish',
        unit: {
          title: 'Greetings & Introductions',
          cefrLevel: { code: 'A1' },
        },
        completionPercentage: 0,
        exercises: [
          {
            id: 'smoke-exercise-1',
            lessonId: 'smoke-lesson-1',
            type: 'MultipleChoice',
            sortOrder: 1,
            points: 10,
            config: {
              question: 'How do you say "Hello" in Spanish?',
              options: ['Hola', 'Adiós', 'Gracias', 'Por favor'],
              correctIndex: 0,
              explanation: '"Hola" means "Hello" in Spanish.',
            },
          },
        ],
      }),
    })
  );

  // POST /exercises/smoke-exercise-1/submit — correct answer result (API server on :5000)
  await page.route(/localhost:5000\/exercises\/smoke-exercise-1\/submit/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        correct: true,
        score: 10,
        maxScore: 10,
      }),
    })
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Smoke: core user journey', () => {
  test.beforeEach(async ({ page }) => {
    await mockNetwork(page);
  });

  test('login → lesson → complete MultipleChoice exercise → see correct feedback', async ({
    page,
  }) => {
    // ── Step 1: Login ───────────────────────────────────────────────────────
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Langafy' })).toBeVisible();

    await page.getByLabel('Email address').fill('smoke@example.com');
    await page.getByLabel('Password').fill('smoke-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // ── Step 2: Dashboard redirect confirms auth succeeded ──────────────────
    await page.waitForURL('**/dashboard', { timeout: 15_000 });

    // ── Step 3: Navigate to lesson ──────────────────────────────────────────
    await page.goto('/lessons/smoke-lesson-1');

    await expect(page.getByRole('heading', { name: 'Basic Greetings' })).toBeVisible({
      timeout: 10_000,
    });

    // ── Step 4: Exercise renders ────────────────────────────────────────────
    await expect(page.getByText('How do you say "Hello" in Spanish?')).toBeVisible();

    // ── Step 5: Select correct answer ───────────────────────────────────────
    await page.getByRole('button', { name: 'Hola' }).click();

    // ── Step 6: Submit ──────────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Submit Answer' }).click();

    // ── Step 7: Verify correct feedback ─────────────────────────────────────
    await expect(page.getByText('✓ Correct!')).toBeVisible({ timeout: 5_000 });

    // Explanation should also appear
    await expect(page.getByText('"Hola" means "Hello" in Spanish.')).toBeVisible();
  });
});
