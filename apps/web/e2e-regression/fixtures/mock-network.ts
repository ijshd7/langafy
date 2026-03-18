/**
 * Composable page.route() helpers for mocking network requests in E2E tests.
 *
 * Each helper registers Playwright route mocks for specific endpoints.
 * Tests opt into exactly the mocks they need, and can override default responses.
 */

import { Page } from '@playwright/test';

import {
  buildAuthSyncResponse,
  buildProfileResponse,
  buildConversationDetailResponse,
  buildConversationListResponse,
  buildExerciseSubmitCorrect,
  buildNewConversationResponse,
  buildProgressResponse,
  buildVocabularyDueResponse,
  buildVocabularyListResponse,
  buildVocabularyReviewResponse,
} from './api-responses';
import {
  buildAccountsLookupResponse,
  buildSignInResponse,
  buildSignUpResponse,
  buildTokenRefreshResponse,
  DEFAULT_USER,
  type TestUser,
} from './auth';

// ─── Firebase Auth Mocks ──────────────────────────────────────────────────────

/** Mock Firebase sign-in flow (Identity Toolkit + Secure Token) */
export async function mockFirebaseAuth(page: Page, user: TestUser = DEFAULT_USER) {
  // Firebase Identity Toolkit
  await page.route(/identitytoolkit\.googleapis\.com/, (route) => {
    const url = route.request().url();

    if (url.includes('accounts:lookup')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildAccountsLookupResponse(user)),
      });
    }

    // Default: signInWithEmailAndPassword / signUp response
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildSignInResponse(user)),
    });
  });

  // Firebase Secure Token API: token refresh
  await page.route(/securetoken\.googleapis\.com/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildTokenRefreshResponse(user)),
    })
  );
}

/** Mock Firebase sign-in failure */
export async function mockFirebaseAuthFailure(
  page: Page,
  errorMessage: string = 'INVALID_LOGIN_CREDENTIALS'
) {
  await page.route(/identitytoolkit\.googleapis\.com/, (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 400,
          message: errorMessage,
          errors: [{ message: errorMessage, domain: 'global', reason: 'invalid' }],
        },
      }),
    })
  );

  await page.route(/securetoken\.googleapis\.com/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildTokenRefreshResponse()),
    })
  );
}

/** Mock Firebase sign-up flow */
export async function mockFirebaseSignUp(page: Page, user: TestUser = DEFAULT_USER) {
  await page.route(/identitytoolkit\.googleapis\.com/, (route) => {
    const url = route.request().url();

    if (url.includes('accounts:lookup')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildAccountsLookupResponse(user)),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildSignUpResponse(user)),
    });
  });

  await page.route(/securetoken\.googleapis\.com/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildTokenRefreshResponse(user)),
    })
  );
}

/** Mock Firebase sign-up failure (e.g., EMAIL_EXISTS) */
export async function mockFirebaseSignUpFailure(page: Page, errorCode: string = 'EMAIL_EXISTS') {
  await page.route(/identitytoolkit\.googleapis\.com/, (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 400,
          message: errorCode,
          errors: [{ message: errorCode, domain: 'global', reason: 'invalid' }],
        },
      }),
    })
  );

  await page.route(/securetoken\.googleapis\.com/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildTokenRefreshResponse()),
    })
  );
}

// ─── App API Mocks ────────────────────────────────────────────────────────────

/** Mock POST /api/auth/sync */
export async function mockAuthSync(page: Page, response?: Record<string, unknown>) {
  await page.route(/localhost:5000\/api\/auth\/sync/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response ?? buildAuthSyncResponse()),
    })
  );
}

/** Mock GET /api/progress */
export async function mockProgress(page: Page, response?: Record<string, unknown>) {
  await page.route(/localhost:5000\/api\/progress/, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response ?? buildProgressResponse()),
      });
    }
    return route.continue();
  });
}

/** Mock GET /api/progress returning an error */
export async function mockProgressError(page: Page, statusCode: number = 500) {
  await page.route(/localhost:5000\/api\/progress/, (route) =>
    route.fulfill({
      status: statusCode,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      }),
    })
  );
}

/** Mock GET /api/lessons/:id */
export async function mockLesson(page: Page, lessonId: string, response: Record<string, unknown>) {
  await page.route(new RegExp(`localhost:5000/api/lessons/${lessonId}`), (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  );
}

/** Mock POST /api/exercises/:id/submit */
export async function mockExerciseSubmit(
  page: Page,
  exerciseId: string,
  response?: Record<string, unknown>
) {
  await page.route(new RegExp(`localhost:5000/api/exercises/${exerciseId}/submit`), (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response ?? buildExerciseSubmitCorrect()),
    })
  );
}

/** Mock GET /api/languages/:code/levels/by-code/:code/units */
export async function mockUnits(page: Page, response: unknown) {
  await page.route(/localhost:5000\/api\/languages\/.*\/levels\/.*\/units/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  );
}

/** Mock GET /api/vocabulary */
export async function mockVocabulary(page: Page, response?: Record<string, unknown>) {
  await page.route(/localhost:5000\/api\/vocabulary(?!\/)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response ?? buildVocabularyListResponse()),
    })
  );
}

/** Mock GET /api/vocabulary/due */
export async function mockVocabularyDue(page: Page, response?: Record<string, unknown>) {
  await page.route(/localhost:5000\/api\/vocabulary\/due/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response ?? buildVocabularyDueResponse()),
    })
  );
}

/** Mock POST /api/vocabulary/:id/review */
export async function mockVocabularyReview(page: Page) {
  await page.route(/localhost:5000\/api\/vocabulary\/\d+\/review/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildVocabularyReviewResponse()),
    })
  );
}

/** Mock GET /api/conversations (list) */
export async function mockConversationList(page: Page, response?: Record<string, unknown>) {
  await page.route(/localhost:5000\/api\/conversations\?/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response ?? buildConversationListResponse()),
    })
  );
}

/** Mock GET /api/conversations/:id (detail) */
export async function mockConversationDetail(
  page: Page,
  id: number,
  response?: Record<string, unknown>
) {
  await page.route(new RegExp(`localhost:5000/api/conversations/${id}$`), (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response ?? buildConversationDetailResponse(id)),
      });
    }
    return route.continue();
  });
}

/** Mock POST /api/conversations (create) */
export async function mockConversationCreate(page: Page, response?: Record<string, unknown>) {
  await page.route(/localhost:5000\/api\/conversations$/, (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(response ?? buildNewConversationResponse()),
      });
    }
    return route.continue();
  });
}

/** Mock DELETE /api/conversations/:id */
export async function mockConversationDelete(page: Page, id?: number) {
  const pattern = id
    ? new RegExp(`localhost:5000/api/conversations/${id}$`)
    : /localhost:5000\/api\/conversations\/\d+$/;

  await page.route(pattern, (route) => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.continue();
  });
}

/** Mock POST /api/conversations/:id/messages/stream (SSE) */
export async function mockConversationStream(page: Page, id: number, chunks: string[]) {
  await page.route(
    new RegExp(`localhost:5000/api/conversations/${id}/messages/stream`),
    (route) => {
      const sseBody = chunks.map((c) => `data: ${c}`).join('\n') + '\ndata: [DONE]\n';
      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sseBody,
      });
    }
  );
}

/** Mock stream endpoint returning error (e.g., 429 rate limit) */
export async function mockConversationStreamError(
  page: Page,
  id: number,
  statusCode: number = 429
) {
  await page.route(new RegExp(`localhost:5000/api/conversations/${id}/messages/stream`), (route) =>
    route.fulfill({
      status: statusCode,
      contentType: 'application/json',
      headers: statusCode === 429 ? { 'Retry-After': '60' } : {},
      body: JSON.stringify({ error: 'Rate limit exceeded' }),
    })
  );
}

/** Mock GET /api/auth/profile */
export async function mockProfile(page: Page, response?: Record<string, unknown>) {
  await page.route(/localhost:5000\/api\/auth\/profile/, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response ?? buildProfileResponse()),
      });
    }
    if (route.request().method() === 'PUT') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response ?? buildProfileResponse()),
      });
    }
    return route.continue();
  });
}

/** Generic fallback for unmatched API server calls */
export async function mockApiFallback(page: Page) {
  await page.route(/localhost:5000\/api/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
}

/**
 * Convenience: set up a fully authenticated session.
 * Registers Firebase auth mocks + auth sync + API fallback.
 * Use in beforeEach for most authenticated test suites.
 */
export async function mockFullAuthenticatedSession(page: Page, user: TestUser = DEFAULT_USER) {
  // Register fallback first (lowest priority in Playwright LIFO)
  await mockApiFallback(page);
  // Then specific mocks on top
  await mockFirebaseAuth(page, user);
  await mockAuthSync(page);
}
