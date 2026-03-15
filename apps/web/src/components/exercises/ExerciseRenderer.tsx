'use client';

import { Exercise, ExerciseResult } from '@langafy/shared-types';
import { AlertCircle } from 'lucide-react';

import { FlashcardMatch } from '../games/FlashcardMatch';
import { WordScramble } from '../games/WordScramble';

import { FillInTheBlank } from './FillInTheBlank';
import { MultipleChoice } from './MultipleChoice';

interface ExerciseRendererProps {
  exercise: Exercise;
  onComplete: (result: ExerciseResult) => void;
  isLoading?: boolean;
}

/**
 * Exercise renderer component
 *
 * Delegates to the correct exercise component based on exercise type.
 * Handles the onComplete callback to advance to the next exercise.
 */
export function ExerciseRenderer({
  exercise,
  onComplete,
  isLoading = false,
}: ExerciseRendererProps) {
  // Use string literals instead of ExerciseType enum references to avoid
  // Turbopack/SWC module initialization ordering issues with same-named const+type exports
  switch (exercise.type) {
    case 'MultipleChoice':
      return <MultipleChoice exercise={exercise} onComplete={onComplete} isLoading={isLoading} />;

    case 'FillBlank':
      return <FillInTheBlank exercise={exercise} onComplete={onComplete} isLoading={isLoading} />;

    case 'WordScramble':
      return (
        <WordScramble exercise={exercise} onComplete={onComplete} basePoints={exercise.points} />
      );

    case 'FlashcardMatch':
      return (
        <FlashcardMatch exercise={exercise} onComplete={onComplete} basePoints={exercise.points} />
      );

    case 'FreeResponse':
      return (
        <div className="mx-auto w-full max-w-2xl rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-950">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                Free Response Coming Soon
              </h3>
              <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-200">
                This exercise type will be available in an upcoming update.
              </p>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="mx-auto w-full max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                Unknown Exercise Type
              </h3>
              <p className="mt-1 text-sm text-red-800 dark:text-red-200">
                The exercise type &quot;{exercise.type}&quot; is not recognized.
              </p>
            </div>
          </div>
        </div>
      );
  }
}
