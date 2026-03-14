import React, { useEffect, useRef } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  View,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useUnits, type Unit } from '@/hooks/useUnits';
import { AlertCircleIcon } from 'lucide-react-native';

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
  const shimmerAnim = useRef(new Animated.Value(0)).current;

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
        Couldn't load units
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
 * Unit card component
 */
function UnitCard({ unit, onPress }: { unit: Unit; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View className="rounded-xl border border-border bg-card p-4">
        <View className="flex-row items-start justify-between gap-3 mb-2">
          <Text className="font-semibold text-foreground text-base flex-1">
            {unit.title}
          </Text>
          <View className="rounded-full bg-muted px-2 py-1">
            <Text className="text-xs font-medium text-foreground">{unit.cefrLevel}</Text>
          </View>
        </View>
        <Text className="text-sm text-muted-foreground" numberOfLines={2}>
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
              data.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  onPress={() => router.push(`/learn/${levelId}/${unit.id}`)}
                />
              ))
            ) : (
              <Text className="text-center text-muted-foreground py-8">
                No units available
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}
