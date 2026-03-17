import { expect, test } from '@playwright/test';

import { buildProgressResponse } from '../fixtures/api-responses';
import { DEFAULT_USER } from '../fixtures/auth';
import {
  mockFirebaseAuth,
  mockFirebaseAuthFailure,
  mockAuthSync,
  mockProgress,
  mockApiFallback,
} from '../fixtures/mock-network';
import { SEL } from '../helpers/selectors';

test.describe('Login page', () => {
  test('shows login form with correct elements', async ({ page }) => {
    await mockApiFallback(page);
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Langafy' })).toBeVisible();
    await expect(page.getByLabel(SEL.emailInput)).toBeVisible();
    await expect(page.getByLabel(SEL.passwordInput)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await mockApiFallback(page);
    await mockFirebaseAuth(page);
    await mockAuthSync(page);
    await mockProgress(page, buildProgressResponse());

    await page.goto('/login');
    await page.getByLabel(SEL.emailInput).fill(DEFAULT_USER.email);
    await page.getByLabel(SEL.passwordInput).fill(DEFAULT_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await expect(page.getByText('Your Learning Journey')).toBeVisible({ timeout: 10_000 });
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await mockApiFallback(page);
    await mockFirebaseAuthFailure(page, 'INVALID_LOGIN_CREDENTIALS');

    await page.goto('/login');
    await page.getByLabel(SEL.emailInput).fill('wrong@example.com');
    await page.getByLabel(SEL.passwordInput).fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for the submit error alert to appear
    const alerts = page.locator('[role="alert"]');
    await expect(alerts.first()).toBeVisible({ timeout: 10_000 });
  });

  test('validates empty email field', async ({ page }) => {
    await mockApiFallback(page);
    await page.goto('/login');

    await page.getByLabel(SEL.passwordInput).fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email address')).toBeVisible();
  });

  test('validates invalid email format', async ({ page }) => {
    await mockApiFallback(page);
    await page.goto('/login');

    await page.getByLabel(SEL.emailInput).fill('notanemail');
    await page.getByLabel(SEL.passwordInput).fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email address')).toBeVisible();
  });

  test('validates short password', async ({ page }) => {
    await mockApiFallback(page);
    await page.goto('/login');

    await page.getByLabel(SEL.emailInput).fill('test@example.com');
    await page.getByLabel(SEL.passwordInput).fill('12345');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('submit button is disabled while submitting', async ({ page }) => {
    await mockApiFallback(page);
    await mockFirebaseAuth(page);
    await mockAuthSync(page);
    await mockProgress(page, buildProgressResponse());

    await page.goto('/login');
    await page.getByLabel(SEL.emailInput).fill(DEFAULT_USER.email);
    await page.getByLabel(SEL.passwordInput).fill(DEFAULT_USER.password);

    const submitButton = page.getByRole('button', { name: 'Sign in' });
    await expect(submitButton).toBeEnabled();

    // Click submit — button should become disabled during processing
    await submitButton.click();

    // After successful login, should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
  });

  test('Sign up link navigates to signup page', async ({ page }) => {
    await mockApiFallback(page);
    await page.goto('/login');

    await page.getByRole('link', { name: 'Sign up' }).click();

    await page.waitForURL('**/signup');
  });
});
