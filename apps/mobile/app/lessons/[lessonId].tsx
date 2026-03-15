import { ExerciseResult } from '@langafy/shared-types';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { AlertCircleIcon, CheckCircleIcon, CheckIcon } from 'lucide-react-native';
import React, { useState, useMemo, useEffect } from 'react';
import { ScrollView, View, Dimensions, Animated } from 'react-native';

import { ExerciseRenderer } from '@/components/exercises/ExerciseRenderer';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useLesson } from '@/hooks/useLesson';

const { width } = Dimensions.get('window');

/**
 * Progress bar component
 */
function ProgressBar({ percentage, label }: { percentage: number; label?: string }) {
  const fillWidth = Math.min(Math.max(percentage, 0), 100);
  const filledWidth = ((width - 32) * fillWidth) / 100;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fillWidth) }}
      accessibilityLabel={label ?? `${Math.round(fillWidth)}% complete`}
      className="bg-muted h-2 overflow-hidden rounded-full">
      <Animated.View
        accessible={false}
        className="h-full rounded-full bg-cyan-500"
        style={{ width: Math.max(filledWidth, 4) }}
      />
    </View>
  );
}

/**
 * Exercise indicator component showing completion status
 */
function ExerciseIndicators({
  totalExercises,
  currentIndex,
  completedIndices,
}: {
  totalExercises: number;
  currentIndex: number;
  completedIndices: Set<number>;
}) {
  return (
    <View className="flex-row gap-2 px-4 py-3">
      {Array.from({ length: totalExercises }).map((_, index) => {
        const isCompleted = completedIndices.has(index);
        const isCurrent = index === currentIndex;
        const label = isCompleted
          ? `Exercise ${index + 1}: completed`
          : isCurrent
            ? `Exercise ${index + 1}: current`
            : `Exercise ${index + 1}: upcoming`;
        return (
          <View
            key={index}
            accessibilityLabel={label}
            className={`h-10 flex-1 items-center justify-center rounded-lg ${
              isCompleted ? 'bg-green-500' : isCurrent ? 'bg-cyan-500' : 'bg-muted'
            }`}>
            {isCompleted ? (
              <Icon as={CheckIcon} className="size-5 text-white" accessible={false} />
            ) : (
              <Text
                className={`font-semibold ${isCurrent ? 'text-white' : 'text-muted-foreground'}`}>
                {index + 1}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Points summary component
 */
function PointsSummary({
  earnedPoints,
  totalPoints,
}: {
  earnedPoints: number;
  totalPoints: number;
}) {
  return (
    <View className="bg-card border-border mx-4 flex-row items-center justify-between rounded-lg border px-4 py-3">
      <Text className="text-muted-foreground text-sm font-medium">Points Earned</Text>
      <Text className="text-lg font-bold text-cyan-500">
        {earnedPoints} / {totalPoints}
      </Text>
    </View>
  );
}

/**
 * Lesson completion screen
 */
function CompletionScreen({
  earnedPoints,
  totalPoints,
  onBack,
}: {
  earnedPoints: number;
  totalPoints: number;
  onBack: () => void;
}) {
  const scaleAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 8,
    }).start();
  }, [scaleAnim]);

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Lesson complete! You earned ${earnedPoints} out of ${totalPoints} points`}
      className="flex-1 items-center justify-center gap-6 px-4 pb-8">
      <Animated.View
        accessible={false}
        style={{
          transform: [{ scale: scaleAnim }],
        }}>
        <Icon as={CheckCircleIcon} className="size-16 text-green-500" accessible={false} />
      </Animated.View>

      <Text className="text-foreground text-center text-2xl font-bold">Lesson Complete!</Text>

      <View accessible={false} className="bg-card border-border items-center gap-2 rounded-lg border p-6">
        <Text className="text-muted-foreground text-sm">Points Earned</Text>
        <Text className="text-5xl font-bold text-cyan-500">{earnedPoints}</Text>
        <Text className="text-muted-foreground mt-2 text-xs">
          out of {totalPoints} possible points
        </Text>
      </View>

      <Button onPress={onBack} accessibilityLabel="Back to lessons" className="rounded-lg bg-cyan-500 px-8 py-3">
        <Text className="font-semibold text-white">Back to Lessons</Text>
      </Button>
    </View>
  );
}

/**
 * Error state
 */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-4 py-8">
      <Icon as={AlertCircleIcon} className="text-destructive size-12" accessible={false} />
      <Text className="text-foreground text-center text-lg font-semibold">
        Couldn&apos;t load lesson
      </Text>
      <Text className="text-muted-foreground text-center text-sm">
        Please check your connection and try again
      </Text>
      <Button onPress={onRetry} variant="outline" accessibilityLabel="Retry loading lesson" className="rounded-lg px-6 py-3">
        <Text className="text-foreground font-semibold">Retry</Text>
      </Button>
    </View>
  );
}

/**
 * Lesson detail screen (full-screen lesson player)
 */
export default function LessonDetailScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { data: lesson, loading, error, refresh } = useLesson(lessonId || '');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Map<number, ExerciseResult>>(
    new Map()
  );

  const isComplete = lesson && currentIndex >= lesson.exercises.length;
  const currentExercise = lesson && lesson.exercises[currentIndex];
  const totalPoints = lesson?.exercises.reduce((sum, ex) => sum + ex.points, 0) || 0;

  // Calculate earned points from completed exercises
  const earnedPoints = Array.from(completedExercises.values()).reduce(
    (sum, result) => sum + (result.score || 0),
    0
  );

  const handleExerciseComplete = (result: ExerciseResult) => {
    // Track the completed exercise
    setCompletedExercises((prev) => new Map(prev).set(currentIndex, result));

    // Advance to next exercise
    setCurrentIndex(currentIndex + 1);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: lesson?.title || 'Lesson',
          headerShown: true,
        }}
      />
      <ScrollView className="bg-background flex-1">
        {error && !lesson ? (
          <ErrorState onRetry={refresh} />
        ) : loading || !lesson ? (
          <View className="gap-4 px-4 py-6">
            <View className="bg-muted h-2 rounded-full" />
            <View className="bg-card h-40 rounded-xl p-6" />
          </View>
        ) : isComplete ? (
          <CompletionScreen
            earnedPoints={earnedPoints}
            totalPoints={totalPoints}
            onBack={() => router.back()}
          />
        ) : (
          <View className="gap-4 px-4 py-4">
            {/* Header */}
            <View className="gap-2">
              <Text className="text-muted-foreground text-base font-semibold">
                Lesson: {lesson.title}
              </Text>
              <Text className="text-muted-foreground text-sm">{lesson.objective}</Text>
            </View>

            {/* Exercise indicators */}
            <ExerciseIndicators
              totalExercises={lesson.exercises.length}
              currentIndex={currentIndex}
              completedIndices={new Set(completedExercises.keys())}
            />

            {/* Progress bar and counter */}
            <View className="gap-3">
              <ProgressBar
                percentage={(currentIndex / lesson.exercises.length) * 100}
                label={`Lesson progress: exercise ${currentIndex + 1} of ${lesson.exercises.length}`}
              />
              <Text className="text-muted-foreground text-center text-sm">
                Exercise {currentIndex + 1} of {lesson.exercises.length}
              </Text>
            </View>

            {/* Points summary */}
            <PointsSummary earnedPoints={earnedPoints} totalPoints={totalPoints} />

            {/* Current exercise */}
            {currentExercise && (
              <ExerciseRenderer
                exercise={currentExercise}
                onComplete={handleExerciseComplete}
                isLoading={loading}
              />
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}
