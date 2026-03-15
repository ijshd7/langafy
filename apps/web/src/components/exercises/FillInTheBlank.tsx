'use client'

import { Exercise, ExerciseResult, FillBlankConfig } from '@langafy/shared-types'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { apiClient } from '@/lib/api'


interface FillInTheBlankProps {
  exercise: Exercise
  onComplete: (result: ExerciseResult) => void
  isLoading?: boolean
}

/**
 * Fill-in-the-blank exercise component
 *
 * Displays a sentence with a blank to fill in. Users enter their answer in a text input,
 * submit it to the API, and receive immediate feedback showing whether they were correct
 * and displaying the correct answer if wrong.
 */
export function FillInTheBlank({ exercise, onComplete, isLoading = false }: FillInTheBlankProps) {
  const config = exercise.config as FillBlankConfig
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<ExerciseResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!answer.trim()) {
      setError('Please enter an answer')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await apiClient.post<ExerciseResult>(
        `/exercises/${exercise.id}/submit`,
        {
          type: 'FillBlank',
          answer: answer.trim(),
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !submitted && !isSubmitting && !isLoading) {
      handleSubmit()
    }
  }

  const handleContinue = () => {
    if (result) {
      onComplete(result)
    }
  }

  // Replace the blank placeholder with a visual indicator in the sentence
  const displaySentence = config.sentence.replace('_____', '______')

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Instruction */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Fill in the blank</p>
        <h3 className="text-lg font-medium text-foreground">Complete the sentence:</h3>
      </div>

      {/* Sentence with Blank */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
        <p className="text-base text-foreground leading-relaxed">
          {displaySentence.split('______').map((part, index) => (
            <span key={index}>
              {part}
              {index < displaySentence.split('______').length - 1 && (
                <span className="inline-block w-24 h-8 mx-2 border-b-2 border-blue-400 dark:border-blue-500 align-middle" />
              )}
            </span>
          ))}
        </p>
      </div>

      {/* Answer Input */}
      <div className="space-y-2">
        <label htmlFor="answer" className="block text-sm font-medium text-foreground">
          Your answer
        </label>
        <input
          id="answer"
          type="text"
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          disabled={submitted || isSubmitting || isLoading}
          placeholder="Type your answer here..."
          className={`
            w-full px-4 py-3 rounded-lg border-2 transition-all duration-200
            bg-background text-foreground placeholder-muted-foreground
            ${
              submitted
                ? result?.correct
                  ? 'border-green-500 bg-green-50 dark:bg-green-950'
                  : 'border-red-500 bg-red-50 dark:bg-red-950'
                : 'border-border hover:border-blue-300 dark:hover:border-blue-700'
            }
            ${submitted || isSubmitting || isLoading ? 'cursor-not-allowed opacity-75' : ''}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-background
          `}
        />
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

          {/* Continue Button (shown if incorrect) */}
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
          disabled={!answer.trim() || isSubmitting || isLoading}
          className={`
            w-full px-4 py-3 font-semibold rounded-lg transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-background
            ${
              !answer.trim() || isSubmitting || isLoading
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
