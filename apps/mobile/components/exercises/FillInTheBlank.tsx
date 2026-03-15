import { Exercise, ExerciseResult, FillBlankConfig } from '@langafy/shared-types'
import { CheckCircle, XCircle } from 'lucide-react-native'
import { useState } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

import { Text } from '@/components/ui/text'
import { apiClient } from '@/lib/api'


interface FillInTheBlankProps {
  exercise: Exercise
  onComplete: (result: ExerciseResult) => void
  isLoading?: boolean
}

/**
 * Fill-in-the-blank exercise component for mobile
 *
 * Displays a sentence with a blank to fill in. Users enter their answer in a text input,
 * submit it to the API, and receive immediate feedback showing whether they were correct
 * and displaying the correct answer if wrong.
 * Uses KeyboardAvoidingView to adjust layout when keyboard appears.
 */
export function FillInTheBlank({
  exercise,
  onComplete,
  isLoading = false,
}: FillInTheBlankProps) {
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

  const handleContinue = () => {
    if (result) {
      onComplete(result)
    }
  }

  const displaySentence = config.sentence.replace('_____', '______')
  const isDisabled = submitted || isSubmitting || isLoading

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1">
      <ScrollView className="flex-1 px-4 py-6">
        <View className="space-y-6">
          {/* Instruction */}
          <View className="space-y-2">
            <Text className="text-sm text-muted-foreground font-medium">
              Fill in the blank
            </Text>
            <Text className="text-lg font-semibold text-foreground">
              Complete the sentence:
            </Text>
          </View>

          {/* Sentence with Blank */}
          <View className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
            <Text className="text-base text-foreground leading-relaxed">
              {displaySentence.split('______').map((part, index) => (
                <Text key={index}>
                  {part}
                  {index < displaySentence.split('______').length - 1 && (
                    <View className="inline-block w-24 h-2 mx-2 border-b-2 border-blue-400 dark:border-blue-500" />
                  )}
                </Text>
              ))}
            </Text>
          </View>

          {/* Answer Input */}
          <View className="space-y-2">
            <Text className="text-sm font-medium text-foreground">Your answer</Text>
            <TextInput
              value={answer}
              onChangeText={(text) => {
                setAnswer(text)
                setError(null)
              }}
              editable={!isDisabled}
              placeholder="Type your answer here..."
              placeholderTextColor="#888"
              className={`px-4 py-3 rounded-lg border-2 text-foreground ${
                submitted
                  ? result?.correct
                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                    : 'border-red-500 bg-red-50 dark:bg-red-950'
                  : 'border-border bg-background'
              } ${isDisabled ? 'opacity-75' : ''}`}
            />
          </View>

          {/* Error Message */}
          {error && (
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              <View className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
              </View>
            </Animated.View>
          )}

          {/* Explanation (after submission) */}
          {submitted && config.explanation && (
            <Animated.View entering={FadeIn}>
              <View className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 space-y-2">
                <Text className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Explanation
                </Text>
                <Text className="text-sm text-blue-800 dark:text-blue-200">
                  {config.explanation}
                </Text>
              </View>
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
                        result.correct
                          ? 'text-green-900 dark:text-green-100'
                          : 'text-red-900 dark:text-red-100'
                      }`}
                    >
                      {result.correct ? '✓ Correct!' : '✗ Incorrect'}
                    </Text>

                    {!result.correct && result.correctAnswer && (
                      <Text
                        className={`text-sm mt-1 ${
                          result.correct
                            ? 'text-green-800 dark:text-green-200'
                            : 'text-red-800 dark:text-red-200'
                        }`}
                      >
                        The correct answer is:{' '}
                        <Text className="font-semibold">{result.correctAnswer}</Text>
                      </Text>
                    )}

                    <Text
                      className={`text-sm mt-2 ${
                        result.correct
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-red-800 dark:text-red-200'
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
              disabled={!answer.trim() || isSubmitting || isLoading}
              activeOpacity={!answer.trim() || isSubmitting || isLoading ? 1 : 0.7}
              className={`px-4 py-3 rounded-lg ${
                !answer.trim() || isSubmitting || isLoading
                  ? 'bg-gray-300 dark:bg-gray-700'
                  : 'bg-blue-600'
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  className={`text-center font-semibold ${
                    !answer.trim() || isSubmitting || isLoading
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
    </KeyboardAvoidingView>
  )
}
