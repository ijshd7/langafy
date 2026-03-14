'use client'

import { useState } from 'react'
import { Exercise, ExerciseResult, MultipleChoiceConfig } from '@langafy/shared-types'
import { apiClient } from '@/lib/api'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface MultipleChoiceProps {
  exercise: Exercise
  onComplete: (result: ExerciseResult) => void
  isLoading?: boolean
}

/**
 * Multiple-choice exercise component
 *
 * Displays a question with 4 answer options as selectable cards.
 * Users select an answer, submit it to the API, and receive immediate feedback
 * showing whether they were correct and displaying the right answer if wrong.
 */
export function MultipleChoice({ exercise, onComplete, isLoading = false }: MultipleChoiceProps) {
  const config = exercise.config as MultipleChoiceConfig
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<ExerciseResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = (index: number) => {
    if (!submitted) {
      setSelectedIndex(index)
      setError(null)
    }
  }

  const handleSubmit = async () => {
    if (selectedIndex === null) {
      setError('Please select an answer')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await apiClient.post<ExerciseResult>(
        `/exercises/${exercise.id}/submit`,
        {
          type: 'MultipleChoice',
          selectedIndex,
        }
      )

      setResult(result)
      setSubmitted(true)

      // Auto-advance after 2 seconds if correct
      if (result.correct) {
        setTimeout(() => {
          onComplete(result)
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContinue = () => {
    if (result) {
      onComplete(result)
    }
  }

  // Determine if an option is correct (only show after submission)
  const isCorrectOption = (index: number) => submitted && index === config.correctIndex

  // Determine if an option is selected and incorrect
  const isWrongSelection = (index: number) => submitted && selectedIndex === index && !result?.correct

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Question */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Question</p>
        <h3 className="text-xl font-semibold text-foreground">{config.question}</h3>
      </div>

      {/* Options Grid */}
      <div className="space-y-3">
        {config.options.map((option, index) => {
          const isSelected = selectedIndex === index
          const isCorrect = isCorrectOption(index)
          const isWrong = isWrongSelection(index)
          const isDisabled = submitted || isSubmitting || isLoading

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={isDisabled}
              className={`
                w-full px-4 py-4 text-left rounded-lg border-2 transition-all duration-200
                ${
                  isCorrect
                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                    : isWrong
                      ? 'border-red-500 bg-red-50 dark:bg-red-950'
                      : isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-border bg-card hover:border-blue-300 dark:hover:border-blue-700'
                }
                ${
                  isDisabled && !isCorrect && !isWrong
                    ? 'cursor-not-allowed opacity-75'
                    : 'cursor-pointer'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-background
              `}
            >
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
                  }`}
                >
                  {option}
                </span>

                {/* Feedback Icons */}
                {submitted && (
                  <div className="ml-3 flex-shrink-0">
                    {isCorrect && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
                    {isWrong && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                  </div>
                )}

                {/* Selection Indicator */}
                {!submitted && isSelected && (
                  <div className="ml-3 flex-shrink-0 w-5 h-5 rounded-full bg-blue-500" />
                )}
                {!submitted && !isSelected && (
                  <div className="ml-3 flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Explanation (after submission) */}
      {submitted && config.explanation && (
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Explanation</p>
          <p className="text-sm text-blue-800 dark:text-blue-200">{config.explanation}</p>
        </div>
      )}

      {/* Feedback Message and Action Button */}
      {submitted && result && (
        <div className="space-y-4">
          {/* Result Message */}
          <div
            className={`p-4 rounded-lg border ${
              result.correct
                ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.correct ? (
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={`font-semibold ${
                    result.correct ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
                  }`}
                >
                  {result.correct ? '✓ Correct!' : '✗ Incorrect'}
                </p>
                {!result.correct && result.correctAnswer && (
                  <p className={`text-sm mt-1 ${result.correct ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                    The correct answer is: <span className="font-semibold">{result.correctAnswer}</span>
                  </p>
                )}
                <p className={`text-sm mt-2 ${result.correct ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                  Points earned: <span className="font-semibold">{result.score}/{result.maxScore}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Continue Button (shown if incorrect or for immediate interaction) */}
          {!result.correct && (
            <button
              onClick={handleContinue}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-background"
            >
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
          className={`
            w-full px-4 py-3 font-semibold rounded-lg transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-background
            ${
              selectedIndex === null || isSubmitting || isLoading
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
            }
          `}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </div>
          ) : (
            'Submit Answer'
          )}
        </button>
      )}
    </div>
  )
}
