import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

/**
 * Lesson data for a unit
 */
export interface Lesson {
  id: number;
  code: string;
  title: string;
  description: string;
  objective: string;
  sortOrder: number;
  exerciseCount?: number;
}

/**
 * Hook for fetching lessons for a unit
 */
export function useLessons(unitId: string) {
  const [data, setData] = useState<Lesson[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);

      // Fetch lessons for the unit
      const response = await apiClient.get<Lesson[]>(`/units/${unitId}/lessons`);
      setData(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load lessons';
      setError(errorMessage);
      console.error('[useLessons] Error loading lessons:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Re-fetch when unitId changes
  useEffect(() => {
    load();
  }, [unitId]);

  const refresh = async () => {
    setRefreshing(true);
    await load(true);
  };

  return { data, loading, refreshing, error, refresh };
}
