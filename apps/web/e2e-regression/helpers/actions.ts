/**
 * Reusable action sequences for E2E regression tests.
 *
 * These helpers encapsulate common user flows (login, navigation, form submission)
 * to keep test files focused on assertions rather than setup.
 */

import { expect, Page } from '@playwright/test';

import { DEFAULT_USER, type TestUser } from '../fixtures/auth';

/**
 * Log in as a user via the login page.
 * Fills email + password, clicks Sign in, waits for dashboard redirect.
 */
export async function loginAs(page: Page, user: TestUser = DEFAULT_USER) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Langafy' })).toBeVisible();

  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

/**
 * Sign up as a new user via the signup page.
 * Fills email, password, confirm password, clicks Sign up, waits for dashboard.
 */
export async function signUp(page: Page, user: TestUser = DEFAULT_USER) {
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Langafy' })).toBeVisible();

  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByLabel('Confirm password').fill(user.password);
  await page.getByRole('button', { name: 'Sign up' }).click();

  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

/** Navigate to a lesson page and wait for it to load. */
export async function navigateToLesson(page: Page, lessonId: string) {
  await page.goto(`/lessons/${lessonId}`);
  // Wait for the lesson heading or skeleton to resolve
  await page.waitForSelector('h1', { timeout: 10_000 });
}

/** Navigate to a level page and wait for it to load. */
export async function navigateToLevel(page: Page, levelCode: string) {
  await page.goto(`/levels/${levelCode}`);
  await page.waitForSelector('h1', { timeout: 10_000 });
}

/** Navigate to the vocabulary page and wait for it to load. */
export async function navigateToVocabulary(page: Page) {
  await page.goto('/vocabulary');
  await expect(page.getByRole('heading', { name: 'Vocabulary Bank' })).toBeVisible({
    timeout: 10_000,
  });
}

/** Navigate to the conversation practice page and wait for it to load. */
export async function navigateToConversation(page: Page) {
  await page.goto('/practice/conversation');
  await expect(page.getByText('AI Conversation Practice')).toBeVisible({
    timeout: 10_000,
  });
}

/** Select a multiple choice answer and submit it. */
export async function submitMultipleChoiceAnswer(page: Page, optionText: string) {
  await page.getByRole('button', { name: optionText }).click();
  await page.getByRole('button', { name: 'Submit Answer' }).click();
}

/** Type an answer in a fill-in-the-blank exercise and submit. */
export async function submitFillBlankAnswer(page: Page, answerText: string) {
  await page.getByLabel('Your answer').fill(answerText);
  await page.getByRole('button', { name: 'Submit Answer' }).click();
}

/** Wait for exercise feedback (role="status") to appear. */
export async function waitForFeedback(page: Page) {
  await expect(page.locator('[role="status"]')).toBeVisible({ timeout: 5_000 });
}
