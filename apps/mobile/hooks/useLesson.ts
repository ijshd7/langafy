import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

/**
 * Exercise data within a lesson
 */
export interface Exercise {
  id: number;
  type: string;
  sortOrder: number;
  points: number;
}

/**
 * Detailed lesson data including exercises
 */
export interface LessonDetail {
  id: number;
  code: string;
  title: string;
  description: string;
  objective: string;
  exercises: Exercise[];
}

/**
 * Hook for fetching a lesson's details and exercises
 */
export function useLesson(lessonId: string) {
  const [data, setData] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);

      // Fetch lesson detail including exercises
      const response = await apiClient.get<LessonDetail>(`/lessons/${lessonId}`);
      setData(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load lesson';
      setError(errorMessage);
      console.error('[useLesson] Error loading lesson:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Re-fetch when lessonId changes
  useEffect(() => {
    load();
  }, [lessonId]);

  const refresh = async () => {
    setRefreshing(true);
    await load(true);
  };

  return { data, loading, refreshing, error, refresh };
}
