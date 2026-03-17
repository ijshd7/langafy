import { expect, test } from '@playwright/test';

import {
  buildFillBlankLesson,
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

const LESSON_ID = 'fb-lesson-1';

test.describe('Fill in the Blank exercise', () => {
  test.beforeEach(async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponse());
    await mockLesson(page, LESSON_ID, buildFillBlankLesson(LESSON_ID));

    await loginAs(page);
    await navigateToLesson(page, LESSON_ID);
  });

  test('displays sentence with blank and input field', async ({ page }) => {
    await expect(page.getByText('Fill in the blank')).toBeVisible();
    await expect(page.getByText('Complete the sentence:')).toBeVisible();

    // The sentence with blank marker
    await expect(page.getByText('Buenos')).toBeVisible();

    // Input field
    await expect(page.getByLabel('Your answer')).toBeVisible();
    await expect(page.getByPlaceholder('Type your answer here...')).toBeVisible();
  });

  test('correct answer shows success feedback', async ({ page }) => {
    await mockExerciseSubmit(page, 'fb-exercise-1', buildExerciseSubmitCorrect(10));

    await page.getByLabel('Your answer').fill('días');
    await page.getByRole('button', { name: SEL.submitAnswerButton }).click();

    await expect(page.getByText(SEL.correctFeedback)).toBeVisible({ timeout: 5_000 });
  });

  test('incorrect answer shows correct answer', async ({ page }) => {
    await mockExerciseSubmit(
      page,
      'fb-exercise-1',
      buildExerciseSubmitIncorrect('días', '"Buenos días" means "Good morning" in Spanish.')
    );

    await page.getByLabel('Your answer').fill('noches');
    await page.getByRole('button', { name: SEL.submitAnswerButton }).click();

    await expect(page.getByText(SEL.incorrectFeedback)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('The correct answer is:')).toBeVisible();
    await expect(page.getByText('días', { exact: true })).toBeVisible();
  });

  test('submit button is disabled when answer is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: SEL.submitAnswerButton })).toBeDisabled();
  });

  test('Enter key submits answer', async ({ page }) => {
    await mockExerciseSubmit(page, 'fb-exercise-1', buildExerciseSubmitCorrect(10));

    await page.getByLabel('Your answer').fill('días');
    await page.getByLabel('Your answer').press('Enter');

    await expect(page.getByText(SEL.correctFeedback)).toBeVisible({ timeout: 5_000 });
  });
});
