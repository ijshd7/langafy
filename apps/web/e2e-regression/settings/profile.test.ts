import { expect, test } from '@playwright/test';

import { buildProfileResponse, buildProgressResponse } from '../fixtures/api-responses';
import { DEFAULT_USER } from '../fixtures/auth';
import {
  mockFirebaseAuth,
  mockAuthSync,
  mockProgress,
  mockProfile,
  mockApiFallback,
} from '../fixtures/mock-network';

test.describe('Settings / Profile page', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiFallback(page);
    await mockFirebaseAuth(page);
    await mockAuthSync(page);
    await mockProgress(page, buildProgressResponse());
    await mockProfile(page);
  });

  test('loads and displays profile form with current data', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Manage your profile information')).toBeVisible();
    await expect(page.getByText(DEFAULT_USER.email)).toBeVisible();

    const firstNameInput = page.getByLabel('First name');
    const lastNameInput = page.getByLabel('Last name');

    await expect(firstNameInput).toBeVisible();
    await expect(lastNameInput).toBeVisible();
    await expect(firstNameInput).toHaveValue('Test');
    await expect(lastNameInput).toHaveValue('User');
  });

  test('successfully updates profile', async ({ page }) => {
    // Override PUT response with updated values
    await page.route(/localhost:5000\/api\/auth\/profile/, (route) => {
      if (route.request().method() === 'PUT') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            buildProfileResponse({
              firstName: 'Updated',
              lastName: 'Name',
              displayName: 'Updated Name',
            })
          ),
        });
      }
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildProfileResponse()),
        });
      }
      return route.continue();
    });

    await page.goto('/settings');

    await page.getByLabel('First name').fill('Updated');
    await page.getByLabel('Last name').fill('Name');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Profile updated successfully.')).toBeVisible();
  });

  test('shows validation errors for empty names', async ({ page }) => {
    await page.goto('/settings');

    await page.getByLabel('First name').clear();
    await page.getByLabel('Last name').clear();
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('First name is required')).toBeVisible();
    await expect(page.getByText('Last name is required')).toBeVisible();
  });

  test('Settings link is visible in navigation', async ({ page }) => {
    await page.goto('/dashboard');

    const settingsLink = page.getByRole('link', { name: 'Settings' });
    await expect(settingsLink).toBeVisible();
  });
});
