'use client';

import { SearchIcon, RotateCw, ChevronDown, X } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import {
  View,
  RefreshControl,
  Pressable,
  FlatList,
  TextInput,
  Animated,
  TouchableOpacity,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useVocabulary, useVocabularyDue, type VocabularyDto } from '@/hooks/useVocabulary';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

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
      accessible={false}
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
 * Vocabulary card in list view
 */
function VocabularyCard({ item, onPress }: { item: VocabularyDto; onPress: () => void }) {
  const isDueForReview = item.nextReviewAt && new Date(item.nextReviewAt) <= new Date();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.wordTarget}: ${item.wordEn}${isDueForReview ? ', due for review' : ''}`}
      className="border-border bg-card mb-3 rounded-lg border p-4">
      <View className="mb-3 flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="mb-1 text-lg font-bold text-cyan-400">{item.wordTarget}</Text>
          <Text className="text-foreground text-sm">{item.wordEn}</Text>
        </View>
        <View className="ml-4 flex-row gap-2">
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

      <Text className="text-muted-foreground mb-2 text-xs">{item.partOfSpeech}</Text>
      <Text className="text-muted-foreground text-sm italic" numberOfLines={2}>
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
  const flipAnim = useMemo(() => new Animated.Value(0), []);
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
    <View className="flex-1 items-center justify-center gap-6 px-4">
      {/* Card */}
      <TouchableOpacity
        onPress={handleFlip}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={isFlipped ? `Translation: ${item.wordEn}` : item.wordTarget}
        accessibilityHint={isFlipped ? 'Tap to show the target word' : 'Tap to reveal the translation'}
        className="w-full">
        {/* Front side */}
        <Animated.View
          className="min-h-64 items-center justify-center rounded-2xl border-2 border-cyan-500/30 bg-cyan-500/10 p-8"
          style={{
            transform: [{ rotateY: frontInterpolate }],
            opacity: flipAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 0, 0],
            }),
          }}>
          <Text className="text-muted-foreground mb-4 text-sm uppercase">Tap to reveal</Text>
          <Text className="text-center text-5xl font-extrabold text-cyan-300">
            {item.wordTarget}
          </Text>
        </Animated.View>

        {/* Back side */}
        <Animated.View
          className="absolute inset-0 min-h-64 items-center justify-center rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 p-8"
          style={{
            transform: [{ rotateY: backInterpolate }],
            opacity: flipAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0, 1],
            }),
          }}>
          <View className="items-center gap-4">
            <Text className="text-3xl font-bold text-emerald-300">{item.wordEn}</Text>
            <View className="bg-foreground/5 rounded-lg px-4 py-2">
              <Text className="text-muted-foreground text-xs font-semibold uppercase">
                {item.partOfSpeech}
              </Text>
            </View>
            <Text className="text-muted-foreground mt-4 text-center text-sm italic">
              {item.exampleSentenceTarget}
            </Text>
            <Text className="text-muted-foreground mt-2 text-center text-xs">
              {item.exampleSentenceEn}
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Progress */}
      <View className="w-full items-center gap-3">
        <View className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <View
            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </View>
        <Text className="text-muted-foreground text-sm font-semibold">
          {currentIndex + 1} of {total}
        </Text>
      </View>

      {/* Rating buttons */}
      <View className="w-full gap-3">
        <Text className="text-muted-foreground text-center text-sm font-medium">
          How well did you remember this?
        </Text>
        <View className="gap-2">
          <Pressable
            onPress={() => onRate(0)}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Again"
            accessibilityHint="I forgot this word — review it soon"
            accessibilityState={{ disabled: isSubmitting }}
            className="flex-row items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 active:bg-red-500/20">
            <Text className="flex-1 font-semibold text-red-300">Again</Text>
            <Text className="text-xs text-red-300/70">Forgot it</Text>
          </Pressable>

          <Pressable
            onPress={() => onRate(2)}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Hard"
            accessibilityHint="I found this word difficult"
            accessibilityState={{ disabled: isSubmitting }}
            className="flex-row items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 active:bg-orange-500/20">
            <Text className="flex-1 font-semibold text-orange-300">Hard</Text>
            <Text className="text-xs text-orange-300/70">Difficult</Text>
          </Pressable>

          <Pressable
            onPress={() => onRate(3)}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Good"
            accessibilityHint="I remembered this word correctly"
            accessibilityState={{ disabled: isSubmitting }}
            className="flex-row items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 active:bg-blue-500/20">
            <Text className="flex-1 font-semibold text-blue-300">Good</Text>
            <Text className="text-xs text-blue-300/70">Correct response</Text>
          </Pressable>

          <Pressable
            onPress={() => onRate(5)}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Easy"
            accessibilityHint="I remembered this word perfectly"
            accessibilityState={{ disabled: isSubmitting }}
            className="flex-row items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 active:bg-emerald-500/20">
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
  const [_showDueOnly, setShowDueOnly] = useState(false);
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
      <View className="bg-background flex-1">
        {/* Header */}
        <View className="border-border bg-card border-b px-4 py-4 pt-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-foreground text-lg font-bold">Vocabulary Review</Text>
            <Pressable
              onPress={() => setViewMode('list')}
              accessibilityRole="button"
              accessibilityLabel="Close vocabulary review"
              className="active:bg-accent rounded-lg p-2">
              <Icon as={X} className="text-muted-foreground size-5" accessible={false} />
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
      className="bg-background flex-1"
      contentContainerClassName="px-4 py-4"
      ListHeaderComponent={
        <View className="mb-6 gap-4">
          {/* Title */}
          <View>
            <Text className="text-foreground mb-1 text-2xl font-bold">Vocabulary</Text>
            <Text className="text-muted-foreground text-sm">
              {listData.data?.length === 0 ? 'No words yet' : `${listData.data?.length || 0} words`}
            </Text>
          </View>

          {/* Search input */}
          <View className="border-border bg-card flex-row items-center gap-3 rounded-lg border px-4 py-2">
            <Icon as={SearchIcon} className="text-muted-foreground size-4" accessible={false} />
            <TextInput
              className="text-foreground placeholder:text-muted-foreground flex-1 py-2"
              placeholder="Search words..."
              placeholderTextColor="#94A3B8"
              value={searchTerm}
              onChangeText={setSearchTerm}
              accessibilityLabel="Search vocabulary"
            />
            {searchTerm && (
              <Pressable
                onPress={() => setSearchTerm('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                className="p-1">
                <Icon as={X} className="text-muted-foreground size-4" accessible={false} />
              </Pressable>
            )}
          </View>

          {/* Filters */}
          <View className="gap-3">
            {/* CEFR level dropdown */}
            <View>
              <Pressable
                onPress={() => setShowCefrDropdown(!showCefrDropdown)}
                accessibilityRole="button"
                accessibilityLabel={cefrFilter ? `Filter by level: ${cefrFilter}` : 'Filter by level: All Levels'}
                accessibilityHint="Opens a dropdown to select a CEFR level filter"
                accessibilityState={{ expanded: showCefrDropdown }}
                className="border-border bg-card flex-row items-center justify-between rounded-lg border px-4 py-3">
                <Text className="text-foreground text-sm font-medium">
                  {cefrFilter ? `Level: ${cefrFilter}` : 'All Levels'}
                </Text>
                <Icon
                  as={ChevronDown}
                  className="text-muted-foreground size-4"
                  accessible={false}
                  style={{ transform: [{ rotate: showCefrDropdown ? '180deg' : '0deg' }] }}
                />
              </Pressable>

              {showCefrDropdown && (
                <View className="border-border bg-card overflow-hidden rounded-b-lg border border-t-0">
                  <Pressable
                    onPress={() => {
                      setCefrFilter(null);
                      setShowCefrDropdown(false);
                      setPage(1);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="All levels"
                    accessibilityState={{ selected: cefrFilter === null }}
                    className="border-border active:bg-accent border-b px-4 py-3">
                    <Text
                      className={`text-sm ${cefrFilter === null ? 'font-semibold text-cyan-400' : 'text-foreground'}`}>
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
                      accessibilityRole="button"
                      accessibilityLabel={`Level ${level}`}
                      accessibilityState={{ selected: cefrFilter === level }}
                      className="border-border active:bg-accent border-b px-4 py-3 last:border-b-0">
                      <Text
                        className={`text-sm ${cefrFilter === level ? 'font-semibold text-cyan-400' : 'text-foreground'}`}>
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
                  className="flex-1 rounded-lg">
                  <Icon as={X} className="size-4" />
                  <Text>Reset</Text>
                </Button>
              )}

              {currentReviewItems.length > 0 && (
                <Button
                  onPress={handleStartReview}
                  size="sm"
                  className="flex-1 rounded-lg bg-emerald-600">
                  <Icon as={RotateCw} className="size-4" />
                  <Text className="font-semibold text-white">
                    Review {currentReviewItems.length}
                  </Text>
                </Button>
              )}
            </View>
          </View>

          {/* Error state */}
          {listData.error && !listData.loading && (
            <View
              accessibilityLiveRegion="assertive"
              className="border-destructive/50 bg-destructive/10 rounded-lg border p-4">
              <Text className="text-destructive text-sm">{listData.error}</Text>
            </View>
          )}
        </View>
      }
      data={listData.loading ? Array(5).fill(null) : listData.data || []}
      keyExtractor={(item, idx) => item?.id.toString() ?? `skeleton-${idx}`}
      renderItem={({ item }) =>
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
            <Icon as={SearchIcon} className="text-muted-foreground mb-2 size-8" />
            <Text className="text-muted-foreground text-center">No vocabulary found</Text>
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
