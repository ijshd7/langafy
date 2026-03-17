import { expect, test } from '@playwright/test';

import {
  buildConversationListResponse,
  buildConversationListEmpty,
  buildNewConversationResponse,
  buildProgressResponse,
} from '../fixtures/api-responses';
import {
  mockFullAuthenticatedSession,
  mockProgress,
  mockConversationList,
  mockConversationDetail,
  mockConversationCreate,
  mockConversationDelete,
  mockConversationStream,
  mockConversationStreamError,
} from '../fixtures/mock-network';
import { loginAs, navigateToConversation } from '../helpers/actions';
import { SEL } from '../helpers/selectors';

test.describe('Conversation practice', () => {
  test.beforeEach(async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponse());
  });

  test('conversation list loads in sidebar', async ({ page }) => {
    await mockConversationList(page, buildConversationListResponse());

    await loginAs(page);
    await navigateToConversation(page);

    // Sidebar should show conversations
    await expect(page.getByText('Greetings & introductions')).toBeVisible();
    await expect(page.getByText('Ordering food at a restaurant')).toBeVisible();

    // Metadata visible
    await expect(page.getByText('4 msgs')).toBeVisible();
  });

  test('empty state with Start a conversation', async ({ page }) => {
    await mockConversationList(page, buildConversationListEmpty());

    await loginAs(page);
    await navigateToConversation(page);

    await expect(page.getByText(SEL.startConversation)).toBeVisible();
    await expect(page.getByText('No conversations yet')).toBeVisible();
  });

  test('new conversation modal opens with topic input', async ({ page }) => {
    await mockConversationList(page, buildConversationListResponse());

    await loginAs(page);
    await navigateToConversation(page);

    // Click "New" button in sidebar
    await page.getByRole('button', { name: 'New', exact: true }).click();

    // Modal should appear
    await expect(page.getByRole('heading', { name: SEL.newConversationHeading })).toBeVisible();
    await expect(page.getByPlaceholder('e.g. Ordering food at a restaurant')).toBeVisible();

    // Topic suggestions
    await expect(page.getByText('Suggestions')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Asking for directions' })).toBeVisible();

    // Start and Cancel buttons
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('start new conversation', async ({ page }) => {
    const newConv = buildNewConversationResponse('Travel vocabulary');
    await mockConversationList(page, buildConversationListResponse());
    await mockConversationCreate(page, newConv);
    // After creation, the list will be refreshed — include the new conversation
    const updatedList = buildConversationListResponse([
      ...buildConversationListResponse().items,
      {
        id: 99,
        languageCode: 'es',
        languageName: 'Spanish',
        cefrLevel: 'A1',
        topic: 'Travel vocabulary',
        lessonId: null,
        createdAt: new Date().toISOString(),
        messageCount: 0,
      },
    ]);
    // Re-register to include updated list on refresh
    await page.route(/localhost:5000\/api\/conversations\?/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(updatedList),
      })
    );
    await mockConversationDetail(page, 99, {
      ...newConv,
      messages: [],
    });

    await loginAs(page);
    await navigateToConversation(page);

    // Open modal
    await page.getByRole('button', { name: 'New', exact: true }).click();

    // Type topic
    await page.getByPlaceholder('e.g. Ordering food at a restaurant').fill('Travel vocabulary');

    // Start
    await page.getByRole('button', { name: 'Start' }).click();

    // Modal should close and the new conversation should be active
    await expect(page.getByText('Send your first message to start practicing!')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('send message and receive response', async ({ page }) => {
    await mockConversationList(page, buildConversationListResponse());
    await mockConversationDetail(page, 1);
    await mockConversationStream(page, 1, ['¡Muy bien! ', 'Tu nombre es bonito.']);

    await loginAs(page);
    await navigateToConversation(page);

    // Open first conversation
    await page.getByText('Greetings & introductions').click();

    // Wait for conversation to load
    await expect(page.getByText('¿Cómo te llamas?')).toBeVisible({ timeout: 10_000 });

    // Type and send message
    const input = page.locator('textarea');
    await input.fill('Hola, me llamo Juan');
    await input.press('Enter');

    // User message should appear
    await expect(page.getByText('Hola, me llamo Juan')).toBeVisible({ timeout: 5_000 });

    // AI response should stream in
    await expect(page.getByText('¡Muy bien!')).toBeVisible({ timeout: 10_000 });
  });

  test('streaming response displays', async ({ page }) => {
    await mockConversationList(page, buildConversationListResponse());
    await mockConversationDetail(page, 1);
    await mockConversationStream(page, 1, [
      '¡Hola ',
      'Juan! ',
      '¿Cómo ',
      'estás ',
      'hoy?',
    ]);

    await loginAs(page);
    await navigateToConversation(page);

    // Open conversation
    await page.getByText('Greetings & introductions').click();
    await expect(page.getByText('¿Cómo te llamas?')).toBeVisible({ timeout: 10_000 });

    // Send message
    const input = page.locator('textarea');
    await input.fill('¡Hola!');
    await input.press('Enter');

    // Wait for streamed content to arrive
    await expect(page.getByText('¡Hola Juan!')).toBeVisible({ timeout: 10_000 });
  });

  test('delete conversation shows confirmation and sends delete request', async ({ page }) => {
    await mockConversationList(page, buildConversationListResponse());
    await mockConversationDelete(page, 1);

    await loginAs(page);
    await navigateToConversation(page);

    const convButton = page.getByRole('button', { name: /Greetings & introductions/ });
    await expect(convButton).toBeVisible();

    // Hover to reveal the trash icon button
    await convButton.hover();

    // Click the trash button (nested inside the conversation button)
    const trashButton = convButton.locator('button').first();
    await trashButton.click({ force: true });

    // Delete confirmation should appear
    await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();

    // Click Cancel to dismiss
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();

    // Confirmation should disappear and conversation should still be visible
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeHidden();
    await expect(convButton).toBeVisible();
  });

  test('rate limit error shows error banner', async ({ page }) => {
    await mockConversationList(page, buildConversationListResponse());
    await mockConversationDetail(page, 1);
    await mockConversationStreamError(page, 1, 429);

    await loginAs(page);
    await navigateToConversation(page);

    // Open conversation
    await page.getByText('Greetings & introductions').click();
    await expect(page.getByText('¿Cómo te llamas?')).toBeVisible({ timeout: 10_000 });

    // Send message
    const input = page.locator('textarea');
    await input.fill('Hello');
    await input.press('Enter');

    // Error banner should appear
    await expect(page.getByText(/Rate limit reached/)).toBeVisible({ timeout: 10_000 });
  });
});
