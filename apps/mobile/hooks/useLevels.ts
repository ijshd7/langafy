import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

/**
 * CEFR level data
 */
export interface CefrLevel {
  id: number;
  code: string;
  name: string;
  description: string;
  sortOrder: number;
}

/**
 * Hook for fetching CEFR levels
 */
export function useLevels() {
  const [data, setData] = useState<CefrLevel[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);

      const response = await apiClient.get<CefrLevel[]>('/levels');
      setData(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load levels';
      setError(errorMessage);
      console.error('[useLevels] Error loading levels:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load(true);
  };

  return { data, loading, refreshing, error, refresh };
}
