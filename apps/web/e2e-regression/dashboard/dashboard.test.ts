import { expect, test } from '@playwright/test';

import {
  buildProgressResponse,
  buildProgressResponseEmpty,
} from '../fixtures/api-responses';
import {
  mockFullAuthenticatedSession,
  mockProgress,
  mockProgressError,
} from '../fixtures/mock-network';
import { loginAs } from '../helpers/actions';

test.describe('Dashboard', () => {
  test('displays progress data after login', async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponse());

    await loginAs(page);

    // Stats visible
    await expect(page.getByText('Total Points')).toBeVisible();
    await expect(page.getByText('150')).toBeVisible();
    await expect(page.getByText('Current Streak')).toBeVisible();
    await expect(page.getByText('3 days')).toBeVisible();

    // Level badge
    await expect(page.getByRole('heading', { name: 'A1', exact: true })).toBeVisible();
    await expect(page.getByText('Beginner', { exact: true })).toBeVisible();

    // Unit card
    await expect(page.getByText('Greetings & Introductions')).toBeVisible();
  });

  test('displays Continue Learning CTA for incomplete lesson', async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponse());

    await loginAs(page);

    // The first incomplete lesson is "Introducing Yourself" (25% complete)
    await expect(page.getByText('Continue Learning')).toBeVisible();
    await expect(page.getByText('Introducing Yourself')).toBeVisible();
  });

  test('displays empty state for new user', async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponseEmpty());

    await loginAs(page);

    // With empty levels, no unit cards or Continue Learning CTA
    await expect(page.getByText('Your Learning Journey')).toBeVisible();
    await expect(page.locator('#main-content').getByText('0', { exact: true })).toBeVisible(); // 0 points
    await expect(page.getByText('0 days')).toBeVisible(); // 0 streak
  });

  test('displays error state when API fails', async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgressError(page, 500);

    await loginAs(page);

    await expect(
      page.getByText('Error loading dashboard. Please try again.')
    ).toBeVisible({ timeout: 10_000 });
  });
});
