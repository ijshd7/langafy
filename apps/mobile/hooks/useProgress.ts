import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api';

/**
 * Unit progress data
 */
export interface UnitProgress {
  unitCode: string;
  unitTitle: string;
  cefrLevel: string;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
}

/**
 * Overall progress summary
 */
export interface ProgressSummary {
  language: string;
  languageCode: string;
  cefrLevel: string;
  totalPoints: number;
  currentStreak: number;
  completedExercises: number;
  units: UnitProgress[];
  nextLessonId?: string;
  nextLessonTitle?: string;
}

/**
 * Hook for fetching user progress data
 */
export function useProgress() {
  const [data, setData] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);

      // Fetch progress data from API
      const response = await apiClient.get<ProgressSummary>('/progress');
      setData(response);
    } catch (err) {
      // Silently handle errors — set error state but don't throw
      const errorMessage = err instanceof Error ? err.message : 'Failed to load progress';
      setError(errorMessage);
      console.error('[useProgress] Error loading progress:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load on mount
  useEffect(() => {
    load();
  }, []);

  // Refresh function for pull-to-refresh
  const refresh = async () => {
    setRefreshing(true);
    await load(true);
  };

  return { data, loading, refreshing, error, refresh };
}
