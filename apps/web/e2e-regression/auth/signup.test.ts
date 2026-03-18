import { expect, test } from '@playwright/test';

import { buildProgressResponse } from '../fixtures/api-responses';
import {
  mockFirebaseSignUp,
  mockFirebaseSignUpFailure,
  mockAuthSync,
  mockProgress,
  mockApiFallback,
} from '../fixtures/mock-network';
import { SEL } from '../helpers/selectors';

test.describe('Signup page', () => {
  test('shows signup form with correct elements', async ({ page }) => {
    await mockApiFallback(page);
    await page.goto('/signup');

    await expect(page.getByRole('heading', { name: 'Langafy' })).toBeVisible();
    await expect(page.getByText('Create your account to start learning')).toBeVisible();
    await expect(page.getByLabel(SEL.firstNameInput)).toBeVisible();
    await expect(page.getByLabel(SEL.lastNameInput)).toBeVisible();
    await expect(page.getByLabel(SEL.emailInput)).toBeVisible();
    await expect(page.getByLabel(SEL.passwordInput, { exact: true })).toBeVisible();
    await expect(page.getByLabel(SEL.confirmPasswordInput)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  test('successful signup redirects to dashboard', async ({ page }) => {
    await mockApiFallback(page);
    await mockFirebaseSignUp(page);
    await mockAuthSync(page);
    await mockProgress(page, buildProgressResponse());

    await page.goto('/signup');
    await page.getByLabel(SEL.firstNameInput).fill('New');
    await page.getByLabel(SEL.lastNameInput).fill('User');
    await page.getByLabel(SEL.emailInput).fill('newuser@example.com');
    await page.getByLabel(SEL.passwordInput, { exact: true }).fill('password123');
    await page.getByLabel(SEL.confirmPasswordInput).fill('password123');
    await page.getByRole('button', { name: 'Sign up' }).click();

    await page.waitForURL('**/dashboard', { timeout: 15_000 });
  });

  test('validates password mismatch', async ({ page }) => {
    await mockApiFallback(page);
    await page.goto('/signup');

    await page.getByLabel(SEL.firstNameInput).fill('Test');
    await page.getByLabel(SEL.lastNameInput).fill('User');
    await page.getByLabel(SEL.emailInput).fill('test@example.com');
    await page.getByLabel(SEL.passwordInput, { exact: true }).fill('password123');
    await page.getByLabel(SEL.confirmPasswordInput).fill('different456');
    await page.getByRole('button', { name: 'Sign up' }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('validates weak password', async ({ page }) => {
    await mockApiFallback(page);
    await page.goto('/signup');

    await page.getByLabel(SEL.firstNameInput).fill('Test');
    await page.getByLabel(SEL.lastNameInput).fill('User');
    await page.getByLabel(SEL.emailInput).fill('test@example.com');
    await page.getByLabel(SEL.passwordInput, { exact: true }).fill('12345');
    await page.getByLabel(SEL.confirmPasswordInput).fill('12345');
    await page.getByRole('button', { name: 'Sign up' }).click();

    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('validates empty fields', async ({ page }) => {
    await mockApiFallback(page);
    await page.goto('/signup');

    await page.getByRole('button', { name: 'Sign up' }).click();

    await expect(page.getByText('First name is required')).toBeVisible();
    await expect(page.getByText('Last name is required')).toBeVisible();
    await expect(page.getByText('Invalid email address')).toBeVisible();
  });

  test('shows error for existing email', async ({ page }) => {
    await mockApiFallback(page);
    await mockFirebaseSignUpFailure(page, 'EMAIL_EXISTS');

    await page.goto('/signup');
    await page.getByLabel(SEL.firstNameInput).fill('Existing');
    await page.getByLabel(SEL.lastNameInput).fill('User');
    await page.getByLabel(SEL.emailInput).fill('existing@example.com');
    await page.getByLabel(SEL.passwordInput, { exact: true }).fill('password123');
    await page.getByLabel(SEL.confirmPasswordInput).fill('password123');
    await page.getByRole('button', { name: 'Sign up' }).click();

    const alerts = page.locator('[role="alert"]');
    await expect(alerts.first()).toBeVisible({ timeout: 10_000 });
  });

  test('Sign in link navigates to login page', async ({ page }) => {
    await mockApiFallback(page);
    await page.goto('/signup');

    await page.getByRole('link', { name: 'Sign in' }).click();

    await page.waitForURL('**/login');
  });
});
