import { useFlashcardGame } from '@langafy/shared-game-logic';
import type { FlashcardGameCard } from '@langafy/shared-game-logic';
import type { Exercise, ExerciseResult, FlashcardMatchConfig } from '@langafy/shared-types';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

import { Text } from '../ui/text';

interface FlashcardMatchProps {
  exercise: Exercise;
  onComplete: (result: ExerciseResult) => void;
  basePoints: number;
}

export function FlashcardMatch({ exercise, onComplete, basePoints }: FlashcardMatchProps) {
  const config = exercise.config as FlashcardMatchConfig;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    gameState,
    cards,
    selectedCardId,
    lastMismatchIds,
    elapsedMs,
    mistakes,
    start,
    flipCard,
    result,
  } = useFlashcardGame(
    config.pairs,
    basePoints,
    config.timeLimit ? config.timeLimit * 1000 : undefined
  );

  // Auto-start game on mount
  useEffect(() => {
    start();
  }, [start]);

  const handleSubmit = useCallback(
    async (gameResult: typeof result) => {
      if (!gameResult) return;

      try {
        setIsSubmitting(true);

        const exResult: ExerciseResult = {
          correct: gameResult.matches.length === config.pairs.length,
          score: Math.round(gameResult.score.finalScore),
          maxScore: basePoints,
          timeTaken: gameResult.elapsedMs,
        };

        if (exResult.correct) {
          onComplete(exResult);
        } else {
          onComplete({
            ...exResult,
            correctAnswer: `Match all ${config.pairs.length} pairs`,
          });
        }
      } catch (error) {
        console.error('Error submitting game result:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [config.pairs.length, basePoints, onComplete]
  );

  // Handle game completion
  useEffect(() => {
    if (result && gameState === 'completed') {
      handleSubmit(result);
    }
  }, [result, gameState, handleSubmit]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (gameState === 'idle') {
    return (
      <View className="flex-1 items-center justify-center bg-white p-4">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-base text-gray-600">Initializing game...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-4 py-6">
      <View className="gap-6">
        {/* Header with timer and score */}
        <View className="flex-row items-center justify-between rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
          <View>
            <Text className="text-xs font-medium text-gray-600">Time</Text>
            <Text className="text-2xl font-bold text-blue-600">{formatTime(elapsedMs)}</Text>
          </View>

          <View className="items-center">
            <Text className="text-xs font-medium text-gray-600">Matches</Text>
            <Text className="text-2xl font-bold text-green-600">
              {cards.filter((c) => c.isMatched).length / 2} / {config.pairs.length}
            </Text>
          </View>

          <View>
            <Text className="text-xs font-medium text-gray-600">Mistakes</Text>
            <Text className="text-2xl font-bold text-red-600">{mistakes}</Text>
          </View>
        </View>

        {/* Game grid */}
        <View className="gap-3">
          {Array.from({ length: Math.ceil(cards.length / 2) }).map((_, rowIdx) => (
            <View key={rowIdx} className="flex-row gap-3">
              {cards.slice(rowIdx * 2, (rowIdx + 1) * 2).map((card) => (
                <FlashcardTile
                  key={card.id}
                  card={card}
                  isSelected={selectedCardId === card.id}
                  isMismatched={lastMismatchIds?.includes(card.id) ?? false}
                  onPress={() => flipCard(card.id)}
                  disabled={gameState === 'completed' || card.isMatched || selectedCardId !== null}
                />
              ))}
            </View>
          ))}
        </View>

        {/* Completion state */}
        {gameState === 'completed' && result && (
          <View className="gap-4 rounded-lg border-2 border-green-300 bg-gradient-to-b from-green-50 to-emerald-50 p-6">
            <View className="items-center gap-2">
              <Text className="text-2xl font-bold text-green-700">🎉 Game Complete!</Text>
              <Text className="text-base text-gray-600">
                You matched all {config.pairs.length} pairs!
              </Text>
            </View>

            <View className="flex-row justify-around">
              <View className="items-center">
                <Text className="text-xs font-medium text-gray-600">Time</Text>
                <Text className="text-xl font-bold text-blue-600">
                  {formatTime(result.elapsedMs)}
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-xs font-medium text-gray-600">Mistakes</Text>
                <Text className="text-xl font-bold text-red-600">{mistakes}</Text>
              </View>
              <View className="items-center">
                <Text className="text-xs font-medium text-gray-600">Points</Text>
                <Text className="text-xl font-bold text-green-600">
                  {Math.round(result.score.finalScore)}
                </Text>
              </View>
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
              Cards flipped: {cards.filter((c) => c.isFlipped || c.isMatched).length}/{cards.length}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

interface FlashcardTileProps {
  card: FlashcardGameCard;
  isSelected: boolean;
  isMismatched: boolean;
  onPress: () => void;
  disabled: boolean;
}

function FlashcardTile({
  card,
  isSelected: _isSelected,
  isMismatched,
  onPress,
  disabled,
}: FlashcardTileProps) {
  const rotateZ = useSharedValue(0);
  const shakeX = useSharedValue(0);

  // Trigger flip animation when card flips
  useEffect(() => {
    if (card.isFlipped) {
      rotateZ.value = withSpring(180, { damping: 10, mass: 1, overshootClamping: false });
    } else {
      rotateZ.value = withSpring(0, { damping: 10, mass: 1, overshootClamping: false });
    }
  }, [card.isFlipped, rotateZ]);

  // Trigger shake animation on mismatch
  useEffect(() => {
    if (isMismatched) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      shakeX.value = withTiming(0, { duration: 400 }, () => {
        shakeX.value = 0;
      });
      // Animate shake
      shakeX.value = withSpring(-10, { damping: 5 });
    }
  }, [isMismatched, shakeX]);

  // Trigger haptic on match
  useEffect(() => {
    if (card.isMatched) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [card.isMatched]);

  const animatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(rotateZ.value, [0, 180], [0, 180], Extrapolate.CLAMP);
    return {
      transform: [{ rotateY: `${rotation}deg` }, { translateX: isMismatched ? shakeX.value : 0 }],
    };
  });

  const backfaceHiddenStyle = useAnimatedStyle(() => {
    const rotation = interpolate(rotateZ.value, [0, 180], [0, 180], Extrapolate.CLAMP);
    return {
      opacity: rotation > 90 ? 1 : 0,
    };
  });

  const frontfaceHiddenStyle = useAnimatedStyle(() => {
    const rotation = interpolate(rotateZ.value, [0, 180], [0, 180], Extrapolate.CLAMP);
    return {
      opacity: rotation > 90 ? 0 : 1,
    };
  });

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-1 overflow-hidden rounded-lg"
      style={{
        opacity: disabled && !card.isMatched ? 0.5 : 1,
      }}>
      <Animated.View
        style={[
          {
            width: '100%',
            aspectRatio: 1,
            perspective: 1000,
          },
          animatedStyle,
        ]}>
        {/* Front face (question mark) */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: '100%',
              height: '100%',
              backgroundColor: card.isMatched ? '#dcfce7' : '#eff6ff',
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: card.isMatched ? '#86efac' : '#93c5fd',
            },
            frontfaceHiddenStyle,
          ]}>
          <Text className="text-4xl font-light text-blue-400">?</Text>
        </Animated.View>

        {/* Back face (text) */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: '100%',
              height: '100%',
              backgroundColor: '#f0fdf4',
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: '#86efac',
              padding: 8,
              transform: [{ rotateY: '180deg' }],
            },
            backfaceHiddenStyle,
          ]}>
          <View className="items-center gap-1">
            <Text className="text-xs font-medium text-gray-500">
              {card.side === 'target' ? 'ES' : 'EN'}
            </Text>
            <Text className="text-center text-sm font-semibold text-gray-800">{card.text}</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
