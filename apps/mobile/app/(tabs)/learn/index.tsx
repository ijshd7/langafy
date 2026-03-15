import { useRouter } from 'expo-router';
import { AlertCircleIcon } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  View,
  TouchableOpacity,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useLevels, type CefrLevel } from '@/hooks/useLevels';


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
      className="rounded-lg bg-muted"
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
      <Icon as={AlertCircleIcon} className="size-12 text-destructive" />
      <Text className="text-center text-lg font-semibold text-foreground">
        Couldn&apos;t load levels
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
 * Get color badge for level (A=green, B=blue, C=purple)
 */
function getLevelBadgeColor(code: string): string {
  const first = code.charAt(0);
  if (first === 'A') return 'bg-green-500';
  if (first === 'B') return 'bg-blue-500';
  if (first === 'C') return 'bg-purple-500';
  return 'bg-gray-500';
}

/**
 * Level card component
 */
function LevelCard({ level, onPress }: { level: CefrLevel; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View className="rounded-xl border border-border bg-card p-4">
        <View className="flex-row items-center gap-3 mb-3">
          <View className={`${getLevelBadgeColor(level.code)} rounded-full px-3 py-1`}>
            <Text className="font-bold text-white">{level.code}</Text>
          </View>
          <Text className="font-semibold text-foreground text-lg flex-1">
            {level.name}
          </Text>
        </View>
        <Text className="text-sm text-muted-foreground" numberOfLines={2}>
          {level.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Level list screen
 */
export default function LevelListScreen() {
  const router = useRouter();
  const { data, loading, refreshing, error, refresh } = useLevels();

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor="#06B6D4"
        />
      }
    >
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
            data.map((level) => (
              <LevelCard
                key={level.id}
                level={level}
                onPress={() => router.push(`/learn/${level.code}`)}
              />
            ))
          ) : (
            <Text className="text-center text-muted-foreground py-8">
              No levels available
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}
