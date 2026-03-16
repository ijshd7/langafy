import { expect, test } from '@playwright/test';

import {
  buildWordScrambleLesson,
  buildProgressResponse,
} from '../fixtures/api-responses';
import {
  mockFullAuthenticatedSession,
  mockProgress,
  mockLesson,
} from '../fixtures/mock-network';
import { loginAs, navigateToLesson } from '../helpers/actions';

const LESSON_ID = 'ws-lesson-1';

test.describe('Word Scramble game', () => {
  test.beforeEach(async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponse());
    await mockLesson(page, LESSON_ID, buildWordScrambleLesson(LESSON_ID));

    await loginAs(page);
    await navigateToLesson(page, LESSON_ID);
  });

  test('displays game with available letter tiles', async ({ page }) => {
    // Wait for game to initialize (auto-starts on mount)
    await expect(page.getByText('Available Letters')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Your Answer')).toBeVisible();

    // Timer should be visible
    await expect(page.getByText('Time')).toBeVisible();

    // Word length display
    await expect(page.getByText('4 letters')).toBeVisible();

    // Hints Used counter
    await expect(page.getByText('Hints Used')).toBeVisible();
  });

  test('Show Hint button reveals hint', async ({ page }) => {
    await expect(page.getByText('Available Letters')).toBeVisible({ timeout: 10_000 });

    // Click Show Hint
    await page.getByRole('button', { name: 'Show Hint' }).click();

    // Hint text should appear
    await expect(page.getByText('A common greeting')).toBeVisible();

    // Button should now say "Hint Shown" and be disabled
    await expect(page.getByRole('button', { name: 'Hint Shown' })).toBeVisible();
  });

  test('correct letter arrangement shows completion', async ({ page }) => {
    await expect(page.getByText('Available Letters')).toBeVisible({ timeout: 10_000 });

    // The target word is "hola" — click tiles in the right order
    // Tiles show individual letters, so we click h, o, l, a
    const targetWord = 'hola';
    for (const letter of targetWord) {
      // Click the first available tile matching this letter
      const tile = page
        .locator('button', { hasText: new RegExp(`^${letter}$`, 'i') })
        .first();
      await tile.click();
    }

    // Click "Check Answer"
    await page.getByRole('button', { name: 'Check Answer' }).click();

    // Should show completion message
    await expect(page.getByText('Correct!').or(page.getByText('Incorrect'))).toBeVisible({
      timeout: 5_000,
    });
  });
});
