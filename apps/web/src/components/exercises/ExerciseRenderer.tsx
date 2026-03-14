'use client'

import { Exercise, ExerciseResult, ExerciseType } from '@langafy/shared-types'
import { MultipleChoice } from './MultipleChoice'
import { FillInTheBlank } from './FillInTheBlank'
import { AlertCircle } from 'lucide-react'

interface ExerciseRendererProps {
  exercise: Exercise
  onComplete: (result: ExerciseResult) => void
  isLoading?: boolean
}

/**
 * Exercise renderer component
 *
 * Delegates to the correct exercise component based on exercise type.
 * Handles the onComplete callback to advance to the next exercise.
 */
export function ExerciseRenderer({ exercise, onComplete, isLoading = false }: ExerciseRendererProps) {
  switch (exercise.type) {
    case ExerciseType.MultipleChoice:
      return <MultipleChoice exercise={exercise} onComplete={onComplete} isLoading={isLoading} />

    case ExerciseType.FillBlank:
      return <FillInTheBlank exercise={exercise} onComplete={onComplete} isLoading={isLoading} />

    case ExerciseType.WordScramble:
      return (
        <div className="w-full max-w-2xl mx-auto p-6 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Word Scramble Coming Soon</h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">This exercise type will be available in an upcoming update.</p>
            </div>
          </div>
        </div>
      )

    case ExerciseType.FlashcardMatch:
      return (
        <div className="w-full max-w-2xl mx-auto p-6 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Flashcard Matching Coming Soon</h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">This exercise type will be available in an upcoming update.</p>
            </div>
          </div>
        </div>
      )

    case ExerciseType.FreeResponse:
      return (
        <div className="w-full max-w-2xl mx-auto p-6 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Free Response Coming Soon</h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">This exercise type will be available in an upcoming update.</p>
            </div>
          </div>
        </div>
      )

    default:
      return (
        <div className="w-full max-w-2xl mx-auto p-6 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100">Unknown Exercise Type</h3>
              <p className="text-sm text-red-800 dark:text-red-200 mt-1">The exercise type "{exercise.type}" is not recognized.</p>
            </div>
          </div>
        </div>
      )
  }
}
