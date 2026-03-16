import { expect, test } from '@playwright/test';

import { buildProgressResponse } from '../fixtures/api-responses';
import {
  mockFullAuthenticatedSession,
  mockProgress,
  mockApiFallback,
} from '../fixtures/mock-network';
import { loginAs } from '../helpers/actions';

test.describe('Protected routes', () => {
  test('redirects unauthenticated user from /dashboard to /login', async ({ page }) => {
    await mockApiFallback(page);
    await page.goto('/dashboard');

    // The layout checks auth state and redirects unauthenticated users
    await page.waitForURL('**/login', { timeout: 15_000 });
  });

  test('redirects unauthenticated user from /vocabulary to /login', async ({ page }) => {
    await mockApiFallback(page);
    await page.goto('/vocabulary');

    await page.waitForURL('**/login', { timeout: 15_000 });
  });

  test('redirects unauthenticated user from /practice/conversation to /login', async ({
    page,
  }) => {
    await mockApiFallback(page);
    await page.goto('/practice/conversation');

    await page.waitForURL('**/login', { timeout: 15_000 });
  });

  test('redirects authenticated user from /login to /dashboard', async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponse());

    // First, log in to establish auth state
    await loginAs(page);

    // Now navigate to /login — should redirect back to /dashboard
    await page.goto('/login');
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
  });
});
