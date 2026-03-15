'use client';

import { Exercise, ExerciseResult, MultipleChoiceConfig } from '@langafy/shared-types';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { apiClient } from '@/lib/api';

interface MultipleChoiceProps {
  exercise: Exercise;
  onComplete: (result: ExerciseResult) => void;
  isLoading?: boolean;
}

/**
 * Multiple-choice exercise component
 *
 * Displays a question with 4 answer options as selectable cards.
 * Users select an answer, submit it to the API, and receive immediate feedback
 * showing whether they were correct and displaying the right answer if wrong.
 */
export function MultipleChoice({ exercise, onComplete, isLoading = false }: MultipleChoiceProps) {
  const config = exercise.config as MultipleChoiceConfig;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (index: number) => {
    if (!submitted) {
      setSelectedIndex(index);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (selectedIndex === null) {
      setError('Please select an answer');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.post<ExerciseResult>(`/exercises/${exercise.id}/submit`, {
        type: 'MultipleChoice',
        selectedIndex,
      });

      setResult(result);
      setSubmitted(true);

      // Auto-advance after 2 seconds if correct
      if (result.correct) {
        setTimeout(() => {
          onComplete(result);
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (result) {
      onComplete(result);
    }
  };

  // Determine if an option is correct (only show after submission)
  const isCorrectOption = (index: number) => submitted && index === config.correctIndex;

  // Determine if an option is selected and incorrect
  const isWrongSelection = (index: number) =>
    submitted && selectedIndex === index && !result?.correct;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Question */}
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">Question</p>
        <h3 id="mc-question" className="text-foreground text-xl font-semibold">{config.question}</h3>
      </div>

      {/* Options Grid */}
      <div role="group" aria-labelledby="mc-question" className="space-y-3">
        {config.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = isCorrectOption(index);
          const isWrong = isWrongSelection(index);
          const isDisabled = submitted || isSubmitting || isLoading;

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={isDisabled}
              aria-pressed={isSelected}
              className={`w-full rounded-lg border-2 px-4 py-4 text-left transition-all duration-200 ${
                isCorrect
                  ? 'border-green-500 bg-green-50 dark:bg-green-950'
                  : isWrong
                    ? 'border-red-500 bg-red-50 dark:bg-red-950'
                    : isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-border bg-card hover:border-blue-300 dark:hover:border-blue-700'
              } ${
                isDisabled && !isCorrect && !isWrong
                  ? 'cursor-not-allowed opacity-75'
                  : 'cursor-pointer'
              } dark:focus:ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}>
              <div className="flex items-center justify-between">
                <span
                  className={`font-medium ${
                    isCorrect
                      ? 'text-green-700 dark:text-green-300'
                      : isWrong
                        ? 'text-red-700 dark:text-red-300'
                        : isSelected
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-foreground'
                  }`}>
                  {option}
                </span>

                {/* Feedback Icons */}
                {submitted && (
                  <div className="ml-3 flex-shrink-0">
                    {isCorrect && (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                    )}
                    {isWrong && <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />}
                  </div>
                )}

                {/* Selection Indicator */}
                {!submitted && isSelected && (
                  <div className="ml-3 h-5 w-5 flex-shrink-0 rounded-full bg-blue-500" />
                )}
                {!submitted && !isSelected && (
                  <div className="ml-3 h-5 w-5 flex-shrink-0 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Explanation (after submission) */}
      {submitted && config.explanation && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
          <p className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">Explanation</p>
          <p className="text-sm text-blue-800 dark:text-blue-200">{config.explanation}</p>
        </div>
      )}

      {/* Feedback Message and Action Button */}
      {submitted && result && (
        <div className="space-y-4">
          {/* Result Message */}
          <div
            role="status"
            aria-live="polite"
            className={`rounded-lg border p-4 ${
              result.correct
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
            }`}>
            <div className="flex items-start gap-3">
              {result.correct ? (
                <CheckCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-green-600 dark:text-green-400" aria-hidden="true" />
              ) : (
                <XCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
              )}
              <div>
                <p
                  className={`font-semibold ${
                    result.correct
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-red-900 dark:text-red-100'
                  }`}>
                  {result.correct ? '✓ Correct!' : '✗ Incorrect'}
                </p>
                {!result.correct && result.correctAnswer && (
                  <p
                    className={`mt-1 text-sm ${result.correct ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                    The correct answer is:{' '}
                    <span className="font-semibold">{result.correctAnswer}</span>
                  </p>
                )}
                <p
                  className={`mt-2 text-sm ${result.correct ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                  Points earned:{' '}
                  <span className="font-semibold">
                    {result.score}/{result.maxScore}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Continue Button (shown if incorrect or for immediate interaction) */}
          {!result.correct && (
            <button
              onClick={handleContinue}
              className="dark:focus:ring-offset-background w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Continue
            </button>
          )}
        </div>
      )}

      {/* Submit Button (shown before submission) */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={selectedIndex === null || isSubmitting || isLoading}
          className={`dark:focus:ring-offset-background w-full rounded-lg px-4 py-3 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            selectedIndex === null || isSubmitting || isLoading
              ? 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              : 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700'
          } `}>
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Submitting...
            </div>
          ) : (
            'Submit Answer'
          )}
        </button>
      )}
    </div>
  );
}
