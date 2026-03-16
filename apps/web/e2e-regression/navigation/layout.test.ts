import { expect, test } from '@playwright/test';

import { buildProgressResponse } from '../fixtures/api-responses';
import {
  mockFullAuthenticatedSession,
  mockProgress,
  mockVocabulary,
  mockVocabularyDue,
  mockConversationList,
  mockApiFallback,
} from '../fixtures/mock-network';
import { loginAs } from '../helpers/actions';

test.describe('Navigation and layout', () => {
  test.beforeEach(async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponse());
    await mockVocabulary(page);
    await mockVocabularyDue(page);
    await mockConversationList(page);
  });

  test('header shows nav links', async ({ page }) => {
    await loginAs(page);

    // Nav links in header
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Vocabulary' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Practice' })).toBeVisible();
  });

  test('active nav link is highlighted on dashboard', async ({ page }) => {
    await loginAs(page);

    // Dashboard link should have active styling (cyan-400 text)
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    await expect(dashboardLink).toHaveClass(/text-cyan-400/);
  });

  test('logo links to dashboard', async ({ page }) => {
    await loginAs(page);

    // Navigate away from dashboard first
    await page.goto('/vocabulary');
    await expect(page.getByRole('heading', { name: 'Vocabulary Bank' })).toBeVisible({
      timeout: 10_000,
    });

    // Click logo
    await page.getByRole('link', { name: 'Langafy' }).click();

    await page.waitForURL('**/dashboard');
  });

  test('sign out redirects to login', async ({ page }) => {
    await loginAs(page);

    // Click sign out
    await page.getByRole('button', { name: 'Sign out' }).click();

    // Should redirect to login
    await page.waitForURL('**/login', { timeout: 10_000 });
  });

  test('mobile viewport hides nav links', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAs(page);

    // Nav links should be hidden (they have class "hidden sm:flex")
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeHidden();

    // But sign out button should still be visible
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });
});
