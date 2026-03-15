import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { AlertCircleIcon } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { Animated, RefreshControl, ScrollView, View, TouchableOpacity } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useUnits, type Unit } from '@/hooks/useUnits';

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
        Couldn&apos;t load units
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
 * Unit card component
 */
function UnitCard({ unit, onPress }: { unit: Unit; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View className="border-border bg-card rounded-xl border p-4">
        <View className="mb-2 flex-row items-start justify-between gap-3">
          <Text className="text-foreground flex-1 text-base font-semibold">{unit.title}</Text>
          <View className="bg-muted rounded-full px-2 py-1">
            <Text className="text-foreground text-xs font-medium">{unit.cefrLevel}</Text>
          </View>
        </View>
        <Text className="text-muted-foreground text-sm" numberOfLines={2}>
          {unit.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Unit list screen
 */
export default function UnitListScreen() {
  const router = useRouter();
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const { data, loading, refreshing, error, refresh } = useUnits(levelId || '');

  return (
    <>
      <Stack.Screen
        options={{
          title: levelId || 'Units',
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
              data.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  onPress={() => router.push(`/learn/${levelId}/${unit.id}`)}
                />
              ))
            ) : (
              <Text className="text-muted-foreground py-8 text-center">No units available</Text>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}
