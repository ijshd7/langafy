import { expect, test } from '@playwright/test';

import {
  buildProgressResponse,
  buildProgressResponseEmpty,
} from '../fixtures/api-responses';
import {
  mockFullAuthenticatedSession,
  mockProgress,
} from '../fixtures/mock-network';
import { loginAs, navigateToLevel } from '../helpers/actions';

test.describe('Level browsing', () => {
  test('shows units with lessons for a level', async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponse());

    await loginAs(page);
    await navigateToLevel(page, 'A1');

    // Level heading
    await expect(page.getByRole('heading', { name: 'A1 - Beginner' })).toBeVisible();

    // Units visible
    await expect(page.getByText('Greetings & Introductions')).toBeVisible();
    await expect(page.getByText('Numbers & Counting')).toBeVisible();

    // Lessons within a unit
    await expect(page.getByText('Basic Greetings')).toBeVisible();
    await expect(page.getByText('Introducing Yourself')).toBeVisible();
  });

  test('shows unit progress bars', async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponse());

    await loginAs(page);
    await navigateToLevel(page, 'A1');

    // Progress bars should be present (the first unit has 50% completion)
    const progressBars = page.locator('[role="progressbar"]');
    await expect(progressBars.first()).toBeVisible();

    // Check the "1 of 2 Lessons" text for first unit
    await expect(page.getByText('1 of 2 Lessons')).toBeVisible();
  });

  test('shows lesson completion status', async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponse());

    await loginAs(page);
    await navigateToLevel(page, 'A1');

    // "Basic Greetings" is 100% complete — should show "100% Complete"
    await expect(page.getByText('100% Complete').first()).toBeVisible();
  });

  test('shows empty state when no units available', async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponseEmpty());

    await loginAs(page);
    await navigateToLevel(page, 'B2');

    await expect(
      page.getByText('No units available for this level yet.')
    ).toBeVisible({ timeout: 10_000 });
  });
});
