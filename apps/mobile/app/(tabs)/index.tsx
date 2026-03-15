import { useRouter } from 'expo-router';
import {
  FireIcon,
  StarIcon,
  CheckIcon,
  ArrowRightIcon,
  AlertCircleIcon,
} from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { Animated, RefreshControl, ScrollView, View, Dimensions } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { useProgress, type ProgressSummary } from '@/hooks/useProgress';

const { width } = Dimensions.get('window');

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
 * Header section with greeting and language badge
 */
function HeaderSection({ data, loading }: { data?: ProgressSummary; loading: boolean }) {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <View className="gap-3 p-4">
        <SkeletonLine width="60%" height={24} />
        <SkeletonLine width="40%" height={16} />
      </View>
    );
  }

  const displayName = user?.displayName || 'Learner';
  const cefrLevel = data?.cefrLevel || 'A1';

  return (
    <View className="gap-3 px-4 pt-4">
      <Text className="text-foreground text-2xl font-bold">
        {getGreeting()}, {displayName}!
      </Text>
      <View className="flex-row items-center gap-2">
        <Text className="text-3xl">🇪🇸</Text>
        <Text className="text-muted-foreground text-base">Spanish</Text>
        <View className="ml-auto rounded-full bg-cyan-500 px-3 py-1">
          <Text className="font-semibold text-white">{cefrLevel}</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Stats row with 3 metric cards
 */
function StatsRow({ data, loading }: { data?: ProgressSummary; loading: boolean }) {
  if (loading) {
    return (
      <View className="flex-row gap-3 px-4 py-4">
        {[0, 1, 2].map((i) => (
          <View key={i} className="bg-card flex-1 rounded-xl p-4">
            <SkeletonLine width="30%" height={12} />
            <SkeletonLine width="60%" height={20} />
          </View>
        ))}
      </View>
    );
  }

  const stats = [
    {
      icon: FireIcon,
      label: 'Streak',
      value: data?.currentStreak || 0,
      suffix: 'days',
    },
    {
      icon: StarIcon,
      label: 'Points',
      value: data?.totalPoints || 0,
      suffix: '',
    },
    {
      icon: CheckIcon,
      label: 'Exercises',
      value: data?.completedExercises || 0,
      suffix: '',
    },
  ];

  return (
    <View className="flex-row gap-3 px-4 py-4">
      {stats.map((stat, idx) => (
        <View key={idx} className="border-border bg-card flex-1 rounded-xl border p-4">
          <View className="mb-2 flex-row items-center gap-2">
            <Icon as={stat.icon} className="size-5 text-cyan-500" />
            <Text className="text-muted-foreground text-xs">{stat.label}</Text>
          </View>
          <Text className="text-foreground text-2xl font-bold">
            {stat.value}
            {stat.suffix && <Text className="text-muted-foreground text-sm"> {stat.suffix}</Text>}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Progress bar component
 */
function ProgressBar({ percentage }: { percentage: number }) {
  const fillWidth = Math.min(Math.max(percentage, 0), 100);
  const filledWidth = ((width - 32) * fillWidth) / 100; // Account for padding

  return (
    <View className="bg-muted h-2 overflow-hidden rounded-full">
      <Animated.View
        className="h-full rounded-full bg-cyan-500"
        style={{ width: Math.max(filledWidth, 4) }} // Minimum visible width
      />
    </View>
  );
}

/**
 * Unit progress cards section
 */
function ProgressSection({ data, loading }: { data?: ProgressSummary; loading: boolean }) {
  if (loading) {
    return (
      <View className="gap-3 px-4 py-4">
        {[0, 1, 2].map((i) => (
          <View key={i} className="bg-card rounded-xl p-4">
            <SkeletonLine width="50%" height={16} />
            <SkeletonLine width="70%" height={12} />
          </View>
        ))}
      </View>
    );
  }

  if (!data?.units || data.units.length === 0) {
    return (
      <View className="px-4 py-4">
        <Text className="text-muted-foreground text-center">No units available yet</Text>
      </View>
    );
  }

  return (
    <View className="gap-3 px-4 py-4">
      <Text className="text-muted-foreground px-2 text-sm font-semibold">Your Progress</Text>
      {data.units.map((unit) => (
        <View key={unit.unitCode} className="border-border bg-card rounded-xl border p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <View>
              <Text className="text-foreground font-semibold">{unit.unitTitle}</Text>
              <Text className="text-muted-foreground text-xs">
                {unit.completedLessons} / {unit.totalLessons} lessons
              </Text>
            </View>
            <View className="bg-muted rounded-full px-2 py-1">
              <Text className="text-foreground text-xs font-medium">{unit.cefrLevel}</Text>
            </View>
          </View>
          <ProgressBar percentage={unit.percentage} />
        </View>
      ))}
    </View>
  );
}

/**
 * Continue Learning CTA
 */
function ContinueLearningButton({ data, loading }: { data?: ProgressSummary; loading: boolean }) {
  const router = useRouter();

  if (loading) {
    return (
      <View className="px-4 py-4">
        <SkeletonLine width="100%" height={48} />
      </View>
    );
  }

  const nextLessonId = data?.nextLessonId;
  const nextLessonTitle = data?.nextLessonTitle || 'Start Learning';

  const handlePress = () => {
    if (nextLessonId) {
      router.push(`/lessons/${nextLessonId}`);
    }
  };

  return (
    <View className="gap-3 px-4 py-4">
      <Button
        onPress={handlePress}
        className="flex-row items-center justify-center gap-2 rounded-xl bg-cyan-500 py-4">
        <Text className="font-semibold text-white">Continue: {nextLessonTitle}</Text>
        <Icon as={ArrowRightIcon} className="size-5 text-white" />
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
      <Icon as={AlertCircleIcon} className="text-destructive size-12" />
      <Text className="text-foreground text-center text-lg font-semibold">
        Couldn&apos;t load progress
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
 * Home screen
 */
export default function HomeScreen() {
  const { data, loading, refreshing, error, refresh } = useProgress();

  return (
    <ScrollView
      className="bg-background flex-1"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#06B6D4" />
      }>
      {error && data === null ? (
        <ErrorState onRetry={refresh} />
      ) : (
        <>
          <HeaderSection data={data} loading={loading} />
          <StatsRow data={data} loading={loading} />
          <ProgressSection data={data} loading={loading} />
          <ContinueLearningButton data={data} loading={loading} />
        </>
      )}
    </ScrollView>
  );
}
