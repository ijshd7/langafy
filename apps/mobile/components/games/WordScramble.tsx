import { useEffect, useState } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import type {
  Exercise,
  ExerciseResult,
  WordScrambleConfig,
} from '@langafy/shared-types';
import { useWordScramble } from '@langafy/shared-game-logic';
import { Text } from '../ui/text';

interface WordScrambleProps {
  exercise: Exercise;
  onComplete: (result: ExerciseResult) => void;
  basePoints: number;
}

export function WordScramble({
  exercise,
  onComplete,
  basePoints,
}: WordScrambleProps) {
  const config = exercise.config as WordScrambleConfig;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    gameState,
    tiles,
    answer,
    hint,
    hintsUsed,
    elapsedMs,
    start,
    placeTile,
    removeTileFromAnswer,
    useHint,
    submit,
    result,
  } = useWordScramble(
    config.targetWord,
    config.hint || 'No hint available',
    basePoints,
    undefined,
  );

  // Auto-start game on mount
  useEffect(() => {
    start();
  }, [start]);

  // Handle game completion
  useEffect(() => {
    if (result && gameState === 'completed') {
      handleSubmit(result);
    }
  }, [result, gameState]);

  const handleSubmit = async (gameResult: typeof result) => {
    if (!gameResult) return;

    try {
      setIsSubmitting(true);

      const exResult: ExerciseResult = {
        correct: gameResult.correct,
        score: gameResult.correct ? Math.round(gameResult.score.finalScore) : 0,
        maxScore: basePoints,
        timeTaken: gameResult.elapsedMs,
      };

      if (exResult.correct) {
        onComplete(exResult);
      } else {
        onComplete({
          ...exResult,
          correctAnswer: config.targetWord,
          explanation: config.explanation,
        });
      }
    } catch (error) {
      console.error('Error submitting game result:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const availableTiles = tiles.filter((t) => !t.usedInAnswer);
  const answerWord = answer.join('');

  if (gameState === 'idle') {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-base text-gray-600">Initializing game...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-4 py-6">
      <View className="gap-6">
        {/* Header with stats */}
        <View className="flex-row items-center justify-between rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
          <View>
            <Text className="text-xs font-medium text-gray-600">Time</Text>
            <Text className="text-2xl font-bold text-blue-600">
              {formatTime(elapsedMs)}
            </Text>
          </View>

          <View className="items-center">
            <Text className="text-xs font-medium text-gray-600">Word</Text>
            <Text className="text-2xl font-bold text-gray-700">
              {config.targetWord.length} letters
            </Text>
          </View>

          <View>
            <Text className="text-xs font-medium text-gray-600">Hints Used</Text>
            <Text className="text-2xl font-bold text-amber-600">{hintsUsed}</Text>
          </View>
        </View>

        {/* Answer area */}
        <View className="gap-3 rounded-lg border-2 border-dashed border-blue-300 bg-white p-4">
          <Text className="text-sm font-medium text-gray-600">Your Answer</Text>
          <View className="min-h-20 flex-row flex-wrap items-center gap-2 rounded-lg bg-blue-50 p-4">
            {answer.length === 0 ? (
              <Text className="text-gray-400 italic">Tap letters to arrange them</Text>
            ) : (
              answer.map((letter, i) => (
                <Pressable
                  key={i}
                  onPress={() => removeTileFromAnswer(i)}
                  className="h-14 w-14 items-center justify-center rounded-lg bg-green-500"
                  accessibilityLabel={`Remove ${letter} from answer`}
                  accessibilityRole="button"
                >
                  <Text className="text-lg font-bold text-white">{letter}</Text>
                </Pressable>
              ))
            )}
          </View>
        </View>

        {/* Available tiles */}
        <View className="gap-3">
          <Text className="text-sm font-medium text-gray-600">Available Letters</Text>
          <View className="flex-row flex-wrap gap-2">
            {availableTiles.length === 0 ? (
              <Text className="text-sm text-gray-500">All letters used</Text>
            ) : (
              availableTiles.map((tile) => (
                <Pressable
                  key={tile.id}
                  onPress={() => placeTile(tile.id)}
                  className="h-14 w-14 items-center justify-center rounded-lg bg-blue-500"
                  accessibilityLabel={`Add ${tile.letter} to answer`}
                  accessibilityRole="button"
                >
                  <Text className="text-lg font-bold text-white">{tile.letter}</Text>
                </Pressable>
              ))
            )}
          </View>
        </View>

        {/* Hint display */}
        {hint && (
          <View className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <Text className="mb-1 text-sm font-medium text-amber-900">Hint</Text>
            <Text className="text-lg text-amber-800">{hint}</Text>
          </View>
        )}

        {/* Feedback messages */}
        {gameState === 'incorrect' && (
          <View className="rounded-lg border border-red-300 bg-red-50 p-4">
            <Text className="text-sm font-medium text-red-800">
              Not quite right. Try again!
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View className="gap-3">
          <Pressable
            onPress={useHint}
            disabled={hint !== null || gameState !== 'playing'}
            className="rounded-lg bg-amber-500 px-4 py-3 disabled:bg-gray-300"
            accessibilityLabel="Show hint"
            accessibilityRole="button"
          >
            <Text className="text-center font-semibold text-white">
              {hint ? 'Hint Shown' : 'Show Hint'}
            </Text>
          </Pressable>

          <Pressable
            onPress={submit}
            disabled={answer.length === 0 || gameState !== 'playing'}
            className="rounded-lg bg-green-500 px-4 py-3 disabled:bg-gray-300"
            accessibilityLabel="Check answer"
            accessibilityRole="button"
          >
            <Text className="text-center font-semibold text-white">Check Answer</Text>
          </Pressable>
        </View>

        {/* Completion state */}
        {gameState === 'completed' && result && (
          <View className="gap-4 rounded-lg border-2 border-green-300 bg-gradient-to-b from-green-50 to-emerald-50 p-6">
            <View className="items-center gap-2">
              <Text className="text-2xl font-bold text-green-700">
                {result.correct ? '🎉 Correct!' : '❌ Incorrect'}
              </Text>
              <Text className="text-center text-base text-gray-600">
                {result.correct
                  ? `You unscrambled "${config.targetWord}" correctly!`
                  : `The word was "${config.targetWord}".`}
              </Text>
            </View>

            <View className="gap-3">
              <View className="items-center">
                <Text className="text-sm font-medium text-gray-600">Time</Text>
                <Text className="text-xl font-bold text-blue-600">
                  {formatTime(result.elapsedMs)}
                </Text>
              </View>

              <View className="items-center">
                <Text className="text-sm font-medium text-gray-600">Hints</Text>
                <Text className="text-xl font-bold text-amber-600">
                  {result.hintsUsed}
                </Text>
              </View>

              {result.correct && (
                <View className="items-center">
                  <Text className="text-sm font-medium text-gray-600">Points</Text>
                  <Text className="text-xl font-bold text-green-600">
                    {Math.round(result.score.finalScore)}
                  </Text>
                </View>
              )}
            </View>

            {isSubmitting && (
              <View className="flex-row items-center justify-center gap-2">
                <ActivityIndicator size="small" color="#666" />
                <Text className="text-sm text-gray-600">Submitting result...</Text>
              </View>
            )}
          </View>
        )}

        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <View className="gap-1 rounded border border-gray-200 bg-gray-50 p-2">
            <Text className="text-xs text-gray-500">State: {gameState}</Text>
            <Text className="text-xs text-gray-500">
              Answer: {answerWord || '(empty)'}
            </Text>
            <Text className="text-xs text-gray-500">Target: {config.targetWord}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
