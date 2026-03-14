'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  FlatList,
  TextInput,
  Animated,
  useColorScheme,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useVocabulary, useVocabularyDue, type VocabularyDto } from '@/hooks/useVocabulary';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  SearchIcon,
  AlertCircleIcon,
  RotateCw,
  ChevronDown,
  X,
  Volume2,
} from 'lucide-react-native';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
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
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
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
        Couldn't load vocabulary
      </Text>
      <Text className="text-center text-sm text-muted-foreground">
        Please check your connection and try again
      </Text>
      <Button onPress={onRetry} variant="outline" className="rounded-lg px-6 py-3">
        <Text className="font-semibold text-foreground">Retry</Text>
      </Button>
    </View>
  );
}

/**
 * Vocabulary card in list view
 */
function VocabularyCard({
  item,
  onPress,
}: {
  item: VocabularyDto;
  onPress: () => void;
}) {
  const isDueForReview = item.nextReviewAt && new Date(item.nextReviewAt) <= new Date();

  return (
    <Pressable
      onPress={onPress}
      className="rounded-lg border border-border bg-card p-4 mb-3"
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-cyan-400 mb-1">{item.wordTarget}</Text>
          <Text className="text-sm text-foreground">{item.wordEn}</Text>
        </View>
        <View className="flex-row gap-2 ml-4">
          {isDueForReview && (
            <View className="rounded-full bg-emerald-500/30 px-2.5 py-1">
              <Text className="text-xs font-semibold text-emerald-300">Due</Text>
            </View>
          )}
          <View className="rounded-full bg-cyan-500/20 px-2.5 py-1">
            <Text className="text-xs font-semibold text-cyan-300">{item.cefrLevel.code}</Text>
          </View>
        </View>
      </View>

      <Text className="text-xs text-muted-foreground mb-2">{item.partOfSpeech}</Text>
      <Text className="text-sm text-muted-foreground italic" numberOfLines={2}>
        {item.exampleSentenceTarget}
      </Text>
    </Pressable>
  );
}

/**
 * Flashcard review component with flip animation
 */
function ReviewCard({
  item,
  currentIndex,
  total,
  onRate,
  isSubmitting,
}: {
  item: VocabularyDto;
  currentIndex: number;
  total: number;
  onRate: (quality: number) => void;
  isSubmitting: boolean;
}) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  return (
    <View className="flex-1 items-center justify-center px-4 gap-6">
      {/* Card */}
      <TouchableOpacity
        onPress={handleFlip}
        activeOpacity={0.7}
        className="w-full"
      >
        {/* Front side */}
        <Animated.View
          className="rounded-2xl border-2 border-cyan-500/30 bg-cyan-500/10 p-8 items-center justify-center min-h-64"
          style={{
            transform: [{ rotateY: frontInterpolate }],
            opacity: flipAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 0, 0],
            }),
          }}
        >
          <Text className="text-sm text-muted-foreground mb-4 uppercase">
            Tap to reveal
          </Text>
          <Text className="text-5xl font-extrabold text-cyan-300 text-center">
            {item.wordTarget}
          </Text>
        </Animated.View>

        {/* Back side */}
        <Animated.View
          className="absolute inset-0 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 p-8 items-center justify-center min-h-64"
          style={{
            transform: [{ rotateY: backInterpolate }],
            opacity: flipAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0, 1],
            }),
          }}
        >
          <View className="items-center gap-4">
            <Text className="text-3xl font-bold text-emerald-300">{item.wordEn}</Text>
            <View className="rounded-lg bg-foreground/5 px-4 py-2">
              <Text className="text-xs uppercase font-semibold text-muted-foreground">
                {item.partOfSpeech}
              </Text>
            </View>
            <Text className="text-sm text-muted-foreground italic text-center mt-4">
              {item.exampleSentenceTarget}
            </Text>
            <Text className="text-xs text-muted-foreground text-center mt-2">
              {item.exampleSentenceEn}
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Progress */}
      <View className="w-full items-center gap-3">
        <View className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <View
            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </View>
        <Text className="text-sm font-semibold text-muted-foreground">
          {currentIndex + 1} of {total}
        </Text>
      </View>

      {/* Rating buttons */}
      <View className="w-full gap-3">
        <Text className="text-sm font-medium text-muted-foreground text-center">
          How well did you remember this?
        </Text>
        <View className="gap-2">
          <Pressable
            onPress={() => onRate(0)}
            disabled={isSubmitting}
            className="flex-row items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 active:bg-red-500/20"
          >
            <Text className="flex-1 font-semibold text-red-300">Again</Text>
            <Text className="text-xs text-red-300/70">Forgot it</Text>
          </Pressable>

          <Pressable
            onPress={() => onRate(2)}
            disabled={isSubmitting}
            className="flex-row items-center gap-2 rounded-lg bg-orange-500/10 border border-orange-500/30 px-4 py-3 active:bg-orange-500/20"
          >
            <Text className="flex-1 font-semibold text-orange-300">Hard</Text>
            <Text className="text-xs text-orange-300/70">Difficult</Text>
          </Pressable>

          <Pressable
            onPress={() => onRate(3)}
            disabled={isSubmitting}
            className="flex-row items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/30 px-4 py-3 active:bg-blue-500/20"
          >
            <Text className="flex-1 font-semibold text-blue-300">Good</Text>
            <Text className="text-xs text-blue-300/70">Correct response</Text>
          </Pressable>

          <Pressable
            onPress={() => onRate(5)}
            disabled={isSubmitting}
            className="flex-row items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 active:bg-emerald-500/20"
          >
            <Text className="flex-1 font-semibold text-emerald-300">Easy</Text>
            <Text className="text-xs text-emerald-300/70">Perfect</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/**
 * Main vocabulary screen
 */
export default function VocabularyScreen() {
  const [viewMode, setViewMode] = useState<'list' | 'review'>('list');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [cefrFilter, setCefrFilter] = useState<string | null>(null);
  const [showCefrDropdown, setShowCefrDropdown] = useState(false);
  const [showDueOnly, setShowDueOnly] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // List view data
  const listData = useVocabulary({
    page,
    search: searchTerm,
    cefrLevel: cefrFilter,
    dueOnly: false,
  });

  // Review mode data (items due for review)
  const reviewData = useVocabularyDue();

  const currentReviewItems = reviewData.data || [];
  const currentReviewItem = currentReviewItems[currentReviewIndex];

  const handleReviewComplete = async (quality: number) => {
    if (!currentReviewItem) return;

    setReviewSubmitting(true);
    try {
      await reviewData.submitReview(currentReviewItem.id, quality);

      if (currentReviewIndex < currentReviewItems.length - 1) {
        setCurrentReviewIndex(currentReviewIndex + 1);
      } else {
        // Review session complete
        setViewMode('list');
        setCurrentReviewIndex(0);
        await listData.refresh();
      }
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleResetFilters = () => {
    setPage(1);
    setSearchTerm('');
    setCefrFilter(null);
    setShowDueOnly(false);
  };

  const handleStartReview = () => {
    setViewMode('review');
    setCurrentReviewIndex(0);
  };

  // Review mode
  if (viewMode === 'review' && currentReviewItem) {
    return (
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="border-b border-border bg-card px-4 py-4 pt-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">Vocabulary Review</Text>
            <Pressable
              onPress={() => setViewMode('list')}
              className="rounded-lg p-2 active:bg-accent"
            >
              <Icon as={X} className="size-5 text-muted-foreground" />
            </Pressable>
          </View>
        </View>

        {/* Card */}
        <ReviewCard
          item={currentReviewItem}
          currentIndex={currentReviewIndex}
          total={currentReviewItems.length}
          onRate={handleReviewComplete}
          isSubmitting={reviewSubmitting}
        />
      </View>
    );
  }

  // List view
  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4"
      ListHeaderComponent={
        <View className="mb-6 gap-4">
          {/* Title */}
          <View>
            <Text className="text-2xl font-bold text-foreground mb-1">Vocabulary</Text>
            <Text className="text-sm text-muted-foreground">
              {listData.data?.length === 0 ? 'No words yet' : `${listData.data?.length || 0} words`}
            </Text>
          </View>

          {/* Search input */}
          <View className="flex-row items-center gap-3 rounded-lg border border-border bg-card px-4 py-2">
            <Icon as={SearchIcon} className="size-4 text-muted-foreground" />
            <TextInput
              className="flex-1 py-2 text-foreground placeholder:text-muted-foreground"
              placeholder="Search words..."
              placeholderTextColor="#94A3B8"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm && (
              <Pressable onPress={() => setSearchTerm('')} className="p-1">
                <Icon as={X} className="size-4 text-muted-foreground" />
              </Pressable>
            )}
          </View>

          {/* Filters */}
          <View className="gap-3">
            {/* CEFR level dropdown */}
            <View>
              <Pressable
                onPress={() => setShowCefrDropdown(!showCefrDropdown)}
                className="flex-row items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <Text className="text-sm font-medium text-foreground">
                  {cefrFilter ? `Level: ${cefrFilter}` : 'All Levels'}
                </Text>
                <Icon
                  as={ChevronDown}
                  className="size-4 text-muted-foreground"
                  style={{ transform: [{ rotate: showCefrDropdown ? '180deg' : '0deg' }] }}
                />
              </Pressable>

              {showCefrDropdown && (
                <View className="border border-t-0 border-border bg-card rounded-b-lg overflow-hidden">
                  <Pressable
                    onPress={() => {
                      setCefrFilter(null);
                      setShowCefrDropdown(false);
                      setPage(1);
                    }}
                    className="border-b border-border px-4 py-3 active:bg-accent"
                  >
                    <Text className={`text-sm ${cefrFilter === null ? 'font-semibold text-cyan-400' : 'text-foreground'}`}>
                      All Levels
                    </Text>
                  </Pressable>

                  {CEFR_LEVELS.map((level) => (
                    <Pressable
                      key={level}
                      onPress={() => {
                        setCefrFilter(level);
                        setShowCefrDropdown(false);
                        setPage(1);
                      }}
                      className="border-b border-border px-4 py-3 active:bg-accent last:border-b-0"
                    >
                      <Text className={`text-sm ${cefrFilter === level ? 'font-semibold text-cyan-400' : 'text-foreground'}`}>
                        {level}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Filter buttons */}
            <View className="flex-row gap-2">
              {(searchTerm || cefrFilter) && (
                <Button
                  onPress={handleResetFilters}
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-lg"
                >
                  <Icon as={X} className="size-4" />
                  <Text>Reset</Text>
                </Button>
              )}

              {currentReviewItems.length > 0 && (
                <Button
                  onPress={handleStartReview}
                  size="sm"
                  className="flex-1 rounded-lg bg-emerald-600"
                >
                  <Icon as={RotateCw} className="size-4" />
                  <Text className="text-white font-semibold">
                    Review {currentReviewItems.length}
                  </Text>
                </Button>
              )}
            </View>
          </View>

          {/* Error state */}
          {listData.error && !listData.loading && (
            <View className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <Text className="text-sm text-destructive">{listData.error}</Text>
            </View>
          )}
        </View>
      }
      data={listData.loading ? Array(5).fill(null) : listData.data || []}
      keyExtractor={(item, idx) => item?.id.toString() ?? `skeleton-${idx}`}
      renderItem={({ item, index }) =>
        listData.loading ? (
          <View className="mb-3 gap-2">
            <SkeletonLine width="100%" height={20} />
            <SkeletonLine width="80%" height={16} />
          </View>
        ) : item ? (
          <VocabularyCard item={item} onPress={() => {}} />
        ) : null
      }
      ListFooterComponent={
        !listData.loading && listData.data?.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Icon as={SearchIcon} className="size-8 text-muted-foreground mb-2" />
            <Text className="text-center text-muted-foreground">
              No vocabulary found
            </Text>
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={listData.refreshing}
          onRefresh={listData.refresh}
          tintColor="#06B6D4"
        />
      }
      scrollEnabled={!listData.loading}
    />
  );
}
