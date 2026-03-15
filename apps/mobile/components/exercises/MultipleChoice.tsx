import { Exercise, ExerciseResult, MultipleChoiceConfig } from '@langafy/shared-types'
import { CheckCircle, XCircle } from 'lucide-react-native'
import { useState } from 'react'
import { View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

import { Text } from '@/components/ui/text'
import { apiClient } from '@/lib/api'


interface MultipleChoiceProps {
  exercise: Exercise
  onComplete: (result: ExerciseResult) => void
  isLoading?: boolean
}

/**
 * Multiple-choice exercise component for mobile
 *
 * Displays a question with 4 answer options as touchable cards.
 * Users select an answer, submit it to the API, and receive immediate feedback
 * showing whether they were correct and displaying the right answer if wrong.
 * Uses react-native-reanimated for smooth animations.
 */
export function MultipleChoice({
  exercise,
  onComplete,
  isLoading = false,
}: MultipleChoiceProps) {
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

  const isCorrectOption = (index: number) => submitted && index === config.correctIndex
  const isWrongSelection = (index: number) => submitted && selectedIndex === index && !result?.correct
  const isDisabled = submitted || isSubmitting || isLoading

  return (
    <ScrollView className="flex-1 px-4 py-6">
      <View className="space-y-6">
        {/* Question */}
        <View className="space-y-2">
          <Text className="text-sm text-muted-foreground font-medium">Question</Text>
          <Text className="text-xl font-semibold text-foreground">{config.question}</Text>
        </View>

        {/* Options Grid */}
        <View className="space-y-3">
          {config.options.map((option, index) => {
            const isSelected = selectedIndex === index
            const isCorrect = isCorrectOption(index)
            const isWrong = isWrongSelection(index)

            let bgColor = 'bg-card border-border'
            let borderColor = 'border-2'
            let textColor = 'text-foreground'

            if (isCorrect) {
              bgColor = 'bg-green-50 dark:bg-green-950'
              borderColor = 'border-2 border-green-500'
              textColor = 'text-green-700 dark:text-green-300'
            } else if (isWrong) {
              bgColor = 'bg-red-50 dark:bg-red-950'
              borderColor = 'border-2 border-red-500'
              textColor = 'text-red-700 dark:text-red-300'
            } else if (isSelected) {
              bgColor = 'bg-blue-50 dark:bg-blue-950'
              borderColor = 'border-2 border-blue-500'
              textColor = 'text-blue-700 dark:text-blue-300'
            }

            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleSelect(index)}
                disabled={isDisabled}
                activeOpacity={isDisabled ? 1 : 0.7}
                className={`px-4 py-4 rounded-lg ${bgColor} ${borderColor} ${isDisabled && !isCorrect && !isWrong ? 'opacity-75' : ''}`}
              >
                <View className="flex-row items-center justify-between">
                  <Text className={`font-medium flex-1 ${textColor}`}>{option}</Text>

                  {/* Feedback Icons */}
                  {submitted && (
                    <View className="ml-3">
                      {isCorrect && (
                        <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                      )}
                      {isWrong && (
                        <XCircle size={20} className="text-red-600 dark:text-red-400" />
                      )}
                    </View>
                  )}

                  {/* Selection Indicator */}
                  {!submitted && isSelected && (
                    <View className="ml-3 w-5 h-5 rounded-full bg-blue-500" />
                  )}
                  {!submitted && !isSelected && (
                    <View className="ml-3 w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Error Message */}
        {error && (
          <Animated.View entering={FadeIn} exiting={FadeOut} className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
          </Animated.View>
        )}

        {/* Explanation (after submission) */}
        {submitted && config.explanation && (
          <Animated.View
            entering={FadeIn}
            className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 space-y-2"
          >
            <Text className="text-sm font-semibold text-blue-900 dark:text-blue-100">Explanation</Text>
            <Text className="text-sm text-blue-800 dark:text-blue-200">{config.explanation}</Text>
          </Animated.View>
        )}

        {/* Feedback Message and Action Button */}
        {submitted && result && (
          <Animated.View entering={FadeIn} className="space-y-4">
            {/* Result Message */}
            <View
              className={`p-4 rounded-lg border ${
                result.correct
                  ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
              }`}
            >
              <View className="flex-row gap-3">
                {result.correct ? (
                  <CheckCircle size={24} className="text-green-600 dark:text-green-400 mt-1" />
                ) : (
                  <XCircle size={24} className="text-red-600 dark:text-red-400 mt-1" />
                )}
                <View className="flex-1">
                  <Text
                    className={`font-semibold ${
                      result.correct ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
                    }`}
                  >
                    {result.correct ? '✓ Correct!' : '✗ Incorrect'}
                  </Text>

                  {!result.correct && result.correctAnswer && (
                    <Text
                      className={`text-sm mt-1 ${
                        result.correct ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                      }`}
                    >
                      The correct answer is:{' '}
                      <Text className="font-semibold">{result.correctAnswer}</Text>
                    </Text>
                  )}

                  <Text
                    className={`text-sm mt-2 ${
                      result.correct ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                    }`}
                  >
                    Points earned:{' '}
                    <Text className="font-semibold">
                      {result.score}/{result.maxScore}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Continue Button (shown if incorrect) */}
            {!result.correct && (
              <TouchableOpacity
                onPress={handleContinue}
                activeOpacity={0.7}
                className="px-4 py-3 bg-blue-600 rounded-lg"
              >
                <Text className="text-center font-semibold text-white">Continue</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Submit Button (shown before submission) */}
        {!submitted && (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={selectedIndex === null || isSubmitting || isLoading}
            activeOpacity={selectedIndex === null || isSubmitting || isLoading ? 1 : 0.7}
            className={`px-4 py-3 rounded-lg ${
              selectedIndex === null || isSubmitting || isLoading
                ? 'bg-gray-300 dark:bg-gray-700'
                : 'bg-blue-600'
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`text-center font-semibold ${
                  selectedIndex === null || isSubmitting || isLoading
                    ? 'text-gray-500 dark:text-gray-400'
                    : 'text-white'
                }`}
              >
                Submit Answer
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}
