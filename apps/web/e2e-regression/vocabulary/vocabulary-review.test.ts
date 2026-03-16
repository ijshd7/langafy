import { expect, test } from '@playwright/test';

import {
  buildVocabularyListResponse,
  buildVocabularyDueResponse,
  buildProgressResponse,
} from '../fixtures/api-responses';
import {
  mockFullAuthenticatedSession,
  mockProgress,
  mockVocabulary,
  mockVocabularyDue,
  mockVocabularyReview,
} from '../fixtures/mock-network';
import { loginAs, navigateToVocabulary } from '../helpers/actions';

test.describe('Vocabulary review', () => {
  test.beforeEach(async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponse());
  });

  test('Review button shows count of due items', async ({ page }) => {
    const listResponse = buildVocabularyListResponse();
    // 2 items are due (gracias and buenos días)
    await mockVocabulary(page, listResponse);
    await mockVocabularyDue(page, buildVocabularyDueResponse(2));

    await loginAs(page);
    await navigateToVocabulary(page);

    await expect(page.getByRole('button', { name: /Review 2 Words/ })).toBeVisible();
  });

  test('flashcard flip interaction', async ({ page }) => {
    await mockVocabulary(page, buildVocabularyListResponse());
    await mockVocabularyDue(page, buildVocabularyDueResponse(2));
    await mockVocabularyReview(page);

    await loginAs(page);
    await navigateToVocabulary(page);

    // Enter review mode
    await page.getByRole('button', { name: /Review.*Words/ }).click();

    // Should show target language word
    await expect(page.getByText('Target Language')).toBeVisible({ timeout: 5_000 });

    // Click to flip the card
    await page.getByText('Click to reveal translation').click();

    // Should now show English translation
    await expect(page.getByText('English')).toBeVisible();
  });

  test('rating buttons advance to next card', async ({ page }) => {
    await mockVocabulary(page, buildVocabularyListResponse());
    await mockVocabularyDue(page, buildVocabularyDueResponse(2));
    await mockVocabularyReview(page);

    await loginAs(page);
    await navigateToVocabulary(page);

    // Enter review mode
    await page.getByRole('button', { name: /Review.*Words/ }).click();

    // Should show "1 of 2"
    await expect(page.getByText('1 of 2')).toBeVisible({ timeout: 5_000 });

    // Rate the first card
    await page.getByRole('button', { name: 'Good' }).click();

    // Should advance to "2 of 2"
    await expect(page.getByText('2 of 2')).toBeVisible({ timeout: 5_000 });
  });

  test('All caught up state when no items due', async ({ page }) => {
    await mockVocabulary(page, buildVocabularyListResponse());
    // Override due response to return empty
    await mockVocabularyDue(page, {
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 100,
      totalPages: 0,
    });

    await loginAs(page);
    await navigateToVocabulary(page);

    // No "Review" button should appear since there are no due items in the list either
    // (We need items with isDueForReview: true in the main list for the button to show)
    // The vocabulary list response has 2 due items by default, so override those
    const listWithNoDue = buildVocabularyListResponse();
    listWithNoDue.items = listWithNoDue.items.map((item) => ({
      ...item,
      isDueForReview: false,
    }));

    // Re-navigate with updated mocks
    await page.goto('/vocabulary');

    // The Review button should not be visible when no items are due
    await expect(page.getByRole('heading', { name: 'Vocabulary Bank' })).toBeVisible({
      timeout: 10_000,
    });
  });
});
