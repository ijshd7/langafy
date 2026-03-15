import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { AlertCircleIcon } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { Animated, RefreshControl, ScrollView, View, TouchableOpacity } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useLessons, type Lesson } from '@/hooks/useLessons';

/**
 * Skeleton loading component
 */
function SkeletonLine({
  width: w = '100%',
  height = 12,
}: {
  width?: string | number;
  height?: number;
}) {
  const shimmerAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  return (
    <Animated.View
      className="bg-muted rounded-lg"
      style={{
        width: w,
        height,
        opacity: shimmerAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 0.8],
        }),
      }}
    />
  );
}

/**
 * Error state
 */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-4 py-8">
      <Icon as={AlertCircleIcon} className="text-destructive size-12" />
      <Text className="text-foreground text-center text-lg font-semibold">
        Couldn&apos;t load lessons
      </Text>
      <Text className="text-muted-foreground text-center text-sm">
        Please check your connection and try again
      </Text>
      <Button onPress={onRetry} variant="outline" className="rounded-lg px-6 py-3">
        <Text className="text-foreground font-semibold">Retry</Text>
      </Button>
    </View>
  );
}

/**
 * Lesson card component
 */
function LessonCard({ lesson, onPress }: { lesson: Lesson; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View className="border-border bg-card rounded-xl border p-4">
        <Text className="text-foreground mb-1 text-base font-semibold">{lesson.title}</Text>
        <Text className="text-muted-foreground mb-3 text-sm" numberOfLines={2}>
          {lesson.objective}
        </Text>
        {lesson.exerciseCount && (
          <Text className="text-muted-foreground text-xs">
            {lesson.exerciseCount} exercise{lesson.exerciseCount !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Lesson list screen
 */
export default function LessonListScreen() {
  const router = useRouter();
  const { unitId } = useLocalSearchParams<{
    levelId: string;
    unitId: string;
  }>();
  const { data, loading, refreshing, error, refresh } = useLessons(unitId || '');

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Lessons',
        }}
      />
      <ScrollView
        className="bg-background flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#06B6D4" />
        }>
        {error && data === null ? (
          <ErrorState onRetry={refresh} />
        ) : (
          <View className="gap-3 px-4 py-4">
            {loading ? (
              <>
                <SkeletonLine width="100%" height={100} />
                <SkeletonLine width="100%" height={100} />
                <SkeletonLine width="100%" height={100} />
              </>
            ) : data && data.length > 0 ? (
              data.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  onPress={() => router.push(`/lessons/${lesson.id}`)}
                />
              ))
            ) : (
              <Text className="text-muted-foreground py-8 text-center">No lessons available</Text>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}
