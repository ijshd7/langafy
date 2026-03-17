import { expect, test } from '@playwright/test';

import {
  buildMultipleChoiceLesson,
  buildExerciseSubmitCorrect,
  buildExerciseSubmitIncorrect,
  buildProgressResponse,
} from '../fixtures/api-responses';
import {
  mockFullAuthenticatedSession,
  mockProgress,
  mockLesson,
  mockExerciseSubmit,
} from '../fixtures/mock-network';
import { loginAs, navigateToLesson } from '../helpers/actions';
import { SEL } from '../helpers/selectors';

const LESSON_ID = 'mc-lesson-1';

test.describe('Multiple Choice exercise', () => {
  test.beforeEach(async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponse());
    await mockLesson(page, LESSON_ID, buildMultipleChoiceLesson(LESSON_ID));

    await loginAs(page);
    await navigateToLesson(page, LESSON_ID);
  });

  test('displays question and options', async ({ page }) => {
    // Question
    await expect(
      page.locator('#mc-question', { hasText: 'How do you say "Hello" in Spanish?' })
    ).toBeVisible();

    // 4 option buttons in a group
    const group = page.locator('[role="group"]');
    await expect(group).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hola' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Adiós' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gracias' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Por favor' })).toBeVisible();
  });

  test('correct answer shows success feedback', async ({ page }) => {
    await mockExerciseSubmit(page, 'mc-exercise-1', buildExerciseSubmitCorrect(10));

    await page.getByRole('button', { name: 'Hola' }).click();
    await page.getByRole('button', { name: SEL.submitAnswerButton }).click();

    await expect(page.getByText(SEL.correctFeedback)).toBeVisible({ timeout: 5_000 });
    // Explanation should appear
    await expect(page.getByText('"Hola" means "Hello" in Spanish.')).toBeVisible();
  });

  test('incorrect answer shows error feedback with explanation', async ({ page }) => {
    await mockExerciseSubmit(
      page,
      'mc-exercise-1',
      buildExerciseSubmitIncorrect('Hola', '"Hola" means "Hello" in Spanish.')
    );

    await page.getByRole('button', { name: 'Adiós' }).click();
    await page.getByRole('button', { name: SEL.submitAnswerButton }).click();

    await expect(page.getByText(SEL.incorrectFeedback)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('The correct answer is:')).toBeVisible();
    await expect(page.getByRole('button', { name: SEL.continueButton })).toBeVisible();
  });

  test('submit button is disabled without selection', async ({ page }) => {
    await expect(page.getByRole('button', { name: SEL.submitAnswerButton })).toBeDisabled();
  });

  test('Continue button advances after incorrect answer', async ({ page }) => {
    await mockExerciseSubmit(
      page,
      'mc-exercise-1',
      buildExerciseSubmitIncorrect('Hola', '"Hola" means "Hello" in Spanish.')
    );

    // Select wrong answer and submit
    await page.getByRole('button', { name: 'Adiós' }).click();
    await page.getByRole('button', { name: SEL.submitAnswerButton }).click();

    await expect(page.getByText(SEL.incorrectFeedback)).toBeVisible({ timeout: 5_000 });

    // Click Continue
    await page.getByRole('button', { name: SEL.continueButton }).click();

    // Should advance — for a single-exercise lesson, this means completion screen
    await expect(page.getByText(SEL.lessonComplete)).toBeVisible({ timeout: 5_000 });
  });
});
