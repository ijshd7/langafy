import { useCallback, useEffect, useState } from 'react';

import { apiClient } from '@/lib/api';

/**
 * Unit data for a CEFR level
 */
export interface Unit {
  id: number;
  code: string;
  cefrLevel: string;
  title: string;
  description: string;
  sortOrder: number;
}

/**
 * Hook for fetching units for a CEFR level
 */
export function useUnits(levelId: string) {
  const [data, setData] = useState<Unit[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) {
          setLoading(true);
        }
        setError(null);

        // Fetch units for the level and language
        const response = await apiClient.get<Unit[]>(`/languages/es/levels/${levelId}/units`);
        setData(response);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load units';
        setError(errorMessage);
        console.error('[useUnits] Error loading units:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [levelId]
  );

  // Re-fetch when levelId changes
  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load(true);
  };

  return { data, loading, refreshing, error, refresh };
}
