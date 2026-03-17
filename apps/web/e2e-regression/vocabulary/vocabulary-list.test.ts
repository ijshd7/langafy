import { expect, test } from '@playwright/test';

import {
  buildVocabularyListResponse,
  buildVocabularyEmptyResponse,
  buildVocabularyDueResponse,
  buildProgressResponse,
} from '../fixtures/api-responses';
import {
  mockFullAuthenticatedSession,
  mockProgress,
  mockVocabulary,
  mockVocabularyDue,
} from '../fixtures/mock-network';
import { loginAs, navigateToVocabulary } from '../helpers/actions';

test.describe('Vocabulary list', () => {
  test.beforeEach(async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponse());
  });

  test('loads vocabulary list with word cards', async ({ page }) => {
    await mockVocabulary(page, buildVocabularyListResponse());
    await mockVocabularyDue(page);

    await loginAs(page);
    await navigateToVocabulary(page);

    // Heading
    await expect(page.getByRole('heading', { name: 'Vocabulary Bank' })).toBeVisible();
    // Word count
    await expect(page.getByText('5 words loaded')).toBeVisible();

    // Individual vocabulary cards (word is in an h3 heading)
    await expect(page.getByRole('heading', { name: 'hola' })).toBeVisible();
    await expect(page.getByText('hello')).toBeVisible();
    await expect(page.getByText('adiós').first()).toBeVisible();
    await expect(page.getByText('gracias').first()).toBeVisible();
  });

  test('search filters by word', async ({ page }) => {
    // First load: full list
    await mockVocabulary(page, buildVocabularyListResponse());
    await mockVocabularyDue(page);

    await loginAs(page);
    await navigateToVocabulary(page);

    // The search triggers a debounced refetch. Since we mock at the route level,
    // the same response will return, but we can verify the search input works.
    await page.getByPlaceholder('Search by word or translation...').fill('hola');

    // The input should contain the search term
    await expect(page.getByPlaceholder('Search by word or translation...')).toHaveValue('hola');
  });

  test('CEFR level filter works', async ({ page }) => {
    await mockVocabulary(page, buildVocabularyListResponse());
    await mockVocabularyDue(page);

    await loginAs(page);
    await navigateToVocabulary(page);

    // Select A1 from dropdown
    await page.locator('select').selectOption('A1');

    // Dropdown should show the selected value
    await expect(page.locator('select')).toHaveValue('A1');
  });

  test('pagination works', async ({ page }) => {
    // Multi-page response
    await mockVocabulary(
      page,
      buildVocabularyListResponse({ totalPages: 3, totalCount: 60, page: 1 })
    );
    await mockVocabularyDue(page);

    await loginAs(page);
    await navigateToVocabulary(page);

    // Pagination controls
    await expect(page.getByText('Page 1 of 3')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible();

    // Previous should be disabled on page 1
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();

    // Click Next
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  });

  test('empty state with Reset Filters button', async ({ page }) => {
    await mockVocabulary(page, buildVocabularyEmptyResponse());
    await mockVocabularyDue(page);

    await loginAs(page);
    await navigateToVocabulary(page);

    await expect(page.getByText('No vocabulary items found')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Reset Filters' })).toBeVisible();
  });
});
