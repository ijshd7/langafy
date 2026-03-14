import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Dimensions,
  Animated,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useLesson } from '@/hooks/useLesson';
import { AlertCircleIcon, CheckCircleIcon } from 'lucide-react-native';
import { ExerciseRenderer } from '@/components/exercises/ExerciseRenderer';

const { width } = Dimensions.get('window');

/**
 * Progress bar component
 */
function ProgressBar({ percentage }: { percentage: number }) {
  const fillWidth = Math.min(Math.max(percentage, 0), 100);
  const filledWidth = ((width - 32) * fillWidth) / 100;

  return (
    <View className="h-2 overflow-hidden rounded-full bg-muted">
      <Animated.View
        className="h-full rounded-full bg-cyan-500"
        style={{ width: Math.max(filledWidth, 4) }}
      />
    </View>
  );
}


/**
 * Lesson completion screen
 */
function CompletionScreen({ totalPoints, onBack }: { totalPoints: number; onBack: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-4 gap-6 pb-8">
      <Icon as={CheckCircleIcon} className="size-16 text-green-500" />
      <Text className="text-2xl font-bold text-foreground text-center">
        Lesson Complete!
      </Text>
      <View className="items-center gap-2">
        <Text className="text-lg text-muted-foreground">Points Earned</Text>
        <Text className="text-4xl font-bold text-cyan-500">{totalPoints}</Text>
      </View>
      <Button onPress={onBack} className="bg-cyan-500 px-8 py-3 rounded-lg">
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
      <Icon as={AlertCircleIcon} className="size-12 text-destructive" />
      <Text className="text-center text-lg font-semibold text-foreground">
        Couldn't load lesson
      </Text>
      <Text className="text-center text-sm text-muted-foreground">
        Please check your connection and try again
      </Text>
      <Button
        onPress={onRetry}
        variant="outline"
        className="rounded-lg px-6 py-3"
      >
        <Text className="font-semibold text-foreground">Retry</Text>
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

  const isComplete = lesson && currentIndex >= lesson.exercises.length;
  const currentExercise = lesson && lesson.exercises[currentIndex];
  const totalPoints = lesson?.exercises.reduce((sum, ex) => sum + ex.points, 0) || 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: lesson?.title || 'Lesson',
          headerShown: true,
        }}
      />
      <ScrollView className="flex-1 bg-background">
        {error && !lesson ? (
          <ErrorState onRetry={refresh} />
        ) : loading || !lesson ? (
          <View className="px-4 py-6 gap-4">
            <View className="h-2 rounded-full bg-muted" />
            <View className="rounded-xl bg-card p-6 h-40" />
          </View>
        ) : isComplete ? (
          <CompletionScreen
            totalPoints={totalPoints}
            onBack={() => router.back()}
          />
        ) : (
          <View className="px-4 py-4 gap-6">
            {/* Header */}
            <View className="gap-2">
              <Text className="text-base font-semibold text-muted-foreground">
                Lesson: {lesson.title}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {lesson.objective}
              </Text>
            </View>

            {/* Progress bar and counter */}
            <View className="gap-3">
              <ProgressBar
                percentage={(currentIndex / lesson.exercises.length) * 100}
              />
              <Text className="text-sm text-muted-foreground text-center">
                Exercise {currentIndex + 1} of {lesson.exercises.length}
              </Text>
            </View>

            {/* Current exercise */}
            {currentExercise && (
              <ExerciseRenderer
                exercise={currentExercise}
                onComplete={() => setCurrentIndex(currentIndex + 1)}
                isLoading={loading}
              />
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}
