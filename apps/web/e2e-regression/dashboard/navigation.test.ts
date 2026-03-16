import { expect, test } from '@playwright/test';

import { buildProgressResponse } from '../fixtures/api-responses';
import {
  mockFullAuthenticatedSession,
  mockProgress,
  mockVocabulary,
  mockVocabularyDue,
  mockConversationList,
} from '../fixtures/mock-network';
import { loginAs } from '../helpers/actions';

test.describe('Dashboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponse());
    await mockVocabulary(page);
    await mockVocabularyDue(page);
    await mockConversationList(page);
  });

  test('View Dictionary link navigates to /vocabulary', async ({ page }) => {
    await loginAs(page);

    await page.getByRole('link', { name: 'View Dictionary' }).click();

    await page.waitForURL('**/vocabulary');
  });

  test('Start Chatting link navigates to /practice/conversation', async ({ page }) => {
    await loginAs(page);

    await page.getByRole('link', { name: 'Start Chatting' }).click();

    await page.waitForURL('**/practice/conversation');
  });

  test('View All button navigates to level page', async ({ page }) => {
    await loginAs(page);

    // Click "View All" for the A1 level
    await page
      .getByRole('button', { name: /View all units for A1/ })
      .click();

    await page.waitForURL('**/levels/A1');
  });
});
