'use client';

import { Exercise, ExerciseResult, FillBlankConfig } from '@langafy/shared-types';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { apiClient } from '@/lib/api';

interface FillInTheBlankProps {
  exercise: Exercise;
  onComplete: (result: ExerciseResult) => void;
  isLoading?: boolean;
}

/**
 * Fill-in-the-blank exercise component
 *
 * Displays a sentence with a blank to fill in. Users enter their answer in a text input,
 * submit it to the API, and receive immediate feedback showing whether they were correct
 * and displaying the correct answer if wrong.
 */
export function FillInTheBlank({ exercise, onComplete, isLoading = false }: FillInTheBlankProps) {
  const config = exercise.config as FillBlankConfig;
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!answer.trim()) {
      setError('Please enter an answer');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.post<ExerciseResult>(`/exercises/${exercise.id}/submit`, {
        type: 'FillBlank',
        answer: answer.trim(),
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !submitted && !isSubmitting && !isLoading) {
      handleSubmit();
    }
  };

  const handleContinue = () => {
    if (result) {
      onComplete(result);
    }
  };

  // Replace the blank placeholder with a visual indicator in the sentence
  const displaySentence = config.sentence.replace('_____', '______');

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Instruction */}
      <div className="space-y-2">
        <p className="text-sm text-slate-400">Fill in the blank</p>
        <h3 className="text-lg font-medium text-white">Complete the sentence:</h3>
      </div>

      {/* Sentence with Blank */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
        <p className="text-foreground text-base leading-relaxed">
          {displaySentence.split('______').map((part, index) => (
            <span key={index}>
              {part}
              {index < displaySentence.split('______').length - 1 && (
                <span aria-label="blank" className="mx-2 inline-block h-8 w-24 border-b-2 border-blue-400 align-middle dark:border-blue-500" />
              )}
            </span>
          ))}
        </p>
      </div>

      {/* Answer Input */}
      <div className="space-y-2">
        <label htmlFor="answer" className="block text-sm font-medium text-slate-300">
          Your answer
        </label>
        <input
          id="answer"
          type="text"
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={submitted || isSubmitting || isLoading}
          placeholder="Type your answer here..."
          className={`bg-background text-foreground placeholder-muted-foreground w-full rounded-lg border-2 px-4 py-3 transition-all duration-200 ${
            submitted
              ? result?.correct
                ? 'border-green-500 bg-green-50 dark:bg-green-950'
                : 'border-red-500 bg-red-50 dark:bg-red-950'
              : 'border-border hover:border-blue-300 dark:hover:border-blue-700'
          } ${submitted || isSubmitting || isLoading ? 'cursor-not-allowed opacity-75' : ''} dark:focus:ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        />
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

          {/* Continue Button (shown if incorrect) */}
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
          disabled={!answer.trim() || isSubmitting || isLoading}
          className={`dark:focus:ring-offset-background w-full rounded-lg px-4 py-3 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            !answer.trim() || isSubmitting || isLoading
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
