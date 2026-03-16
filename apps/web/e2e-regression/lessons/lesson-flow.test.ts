import { expect, test } from '@playwright/test';

import {
  buildMixedLesson,
  buildExerciseSubmitCorrect,
  buildProgressResponse,
} from '../fixtures/api-responses';
import {
  mockFullAuthenticatedSession,
  mockProgress,
  mockLesson,
  mockExerciseSubmit,
} from '../fixtures/mock-network';
import { loginAs, navigateToLesson, submitMultipleChoiceAnswer } from '../helpers/actions';

const LESSON_ID = 'lesson-flow-1';

test.describe('Lesson flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockFullAuthenticatedSession(page);
    await mockProgress(page, buildProgressResponse());
  });

  test('lesson page loads with exercise details and breadcrumb', async ({ page }) => {
    const lesson = buildMixedLesson(LESSON_ID);
    await mockLesson(page, LESSON_ID, lesson);

    await loginAs(page);
    await navigateToLesson(page, LESSON_ID);

    // Title visible
    await expect(page.getByRole('heading', { name: 'Mixed Exercises' })).toBeVisible();
    // Breadcrumb
    await expect(page.getByText('A1 • Greetings & Introductions')).toBeVisible();
    // Exercise count
    await expect(page.getByText('1 of 2')).toBeVisible();
    // Objective
    await expect(page.getByText('Master basic greetings through varied exercises')).toBeVisible();
  });

  test('progress bar updates as exercises complete', async ({ page }) => {
    const lesson = buildMixedLesson(LESSON_ID);
    await mockLesson(page, LESSON_ID, lesson);
    await mockExerciseSubmit(page, 'mixed-mc-1', buildExerciseSubmitCorrect(10));
    await mockExerciseSubmit(page, 'mixed-fb-1', buildExerciseSubmitCorrect(10));

    await loginAs(page);
    await navigateToLesson(page, LESSON_ID);

    // Initially "1 of 2"
    await expect(page.getByText('1 of 2')).toBeVisible();

    // Complete first exercise (MultipleChoice)
    await submitMultipleChoiceAnswer(page, 'Hola');

    // After auto-advance (2s), should show "2 of 2"
    await expect(page.getByText('2 of 2')).toBeVisible({ timeout: 5_000 });
  });

  test('lesson completion screen shows score', async ({ page }) => {
    const lesson = buildMixedLesson(LESSON_ID);
    await mockLesson(page, LESSON_ID, lesson);
    await mockExerciseSubmit(page, 'mixed-mc-1', buildExerciseSubmitCorrect(10));
    await mockExerciseSubmit(page, 'mixed-fb-1', buildExerciseSubmitCorrect(10));

    await loginAs(page);
    await navigateToLesson(page, LESSON_ID);

    // Complete exercise 1 (MC)
    await submitMultipleChoiceAnswer(page, 'Hola');

    // Wait for auto-advance to exercise 2 (FillBlank)
    await expect(page.getByLabel('Your answer')).toBeVisible({ timeout: 5_000 });

    // Complete exercise 2 (FillBlank)
    await page.getByLabel('Your answer').fill('días');
    await page.getByRole('button', { name: 'Submit Answer' }).click();

    // Wait for auto-advance to completion screen
    await expect(page.getByText('Lesson Complete!')).toBeVisible({ timeout: 5_000 });

    // Score display
    await expect(page.getByText('Score')).toBeVisible();
    await expect(page.getByText('Return to Dashboard')).toBeVisible();
  });

  test('points toast appears on correct answer', async ({ page }) => {
    const lesson = buildMixedLesson(LESSON_ID);
    await mockLesson(page, LESSON_ID, lesson);
    await mockExerciseSubmit(page, 'mixed-mc-1', buildExerciseSubmitCorrect(10));

    await loginAs(page);
    await navigateToLesson(page, LESSON_ID);

    await submitMultipleChoiceAnswer(page, 'Hola');

    // Points toast should appear
    await expect(page.getByText('+10 pts')).toBeVisible({ timeout: 3_000 });
  });

  test('Return to Dashboard navigates back', async ({ page }) => {
    const lesson = buildMixedLesson(LESSON_ID);
    await mockLesson(page, LESSON_ID, lesson);
    await mockExerciseSubmit(page, 'mixed-mc-1', buildExerciseSubmitCorrect(10));
    await mockExerciseSubmit(page, 'mixed-fb-1', buildExerciseSubmitCorrect(10));

    await loginAs(page);
    await navigateToLesson(page, LESSON_ID);

    // Complete both exercises
    await submitMultipleChoiceAnswer(page, 'Hola');
    await expect(page.getByLabel('Your answer')).toBeVisible({ timeout: 5_000 });
    await page.getByLabel('Your answer').fill('días');
    await page.getByRole('button', { name: 'Submit Answer' }).click();

    // Wait for completion screen
    await expect(page.getByText('Lesson Complete!')).toBeVisible({ timeout: 5_000 });

    // Click return
    await page.getByRole('button', { name: 'Return to Dashboard' }).click();

    await page.waitForURL('**/dashboard');
  });
});
