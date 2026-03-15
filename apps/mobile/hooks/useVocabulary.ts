import { useEffect, useState, useCallback } from 'react';

import { apiClient } from '@/lib/api';

export interface VocabularyDto {
  id: number;
  wordTarget: string;
  wordEn: string;
  partOfSpeech: string;
  exampleSentenceTarget: string;
  exampleSentenceEn: string;
  cefrLevel: {
    code: string;
    name: string;
  };
  easeFactor: number;
  nextReviewAt: string | null;
}

export interface PaginatedVocabularyResponse {
  data: VocabularyDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UseVocabularyOptions {
  page?: number;
  search?: string;
  cefrLevel?: string | null;
  dueOnly?: boolean;
}

/**
 * Hook for fetching and managing vocabulary with search, filter, and review features
 */
export function useVocabulary(options: UseVocabularyOptions = {}) {
  const { page = 1, search = '', cefrLevel = null, dueOnly = false } = options;

  const [data, setData] = useState<VocabularyDto[] | null>(null);
  const [totalPages, setTotalPages] = useState(0);
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

        let endpoint = '/vocabulary';
        const params: Record<string, string | number | boolean> = {
          page,
          pageSize: 20,
        };

        // Handle due-only mode
        if (dueOnly) {
          endpoint = '/vocabulary/due';
          params.pageSize = 100;
        }

        if (search) {
          params.search = search;
        }
        if (cefrLevel) {
          params.cefrLevel = cefrLevel;
        }

        const response = await apiClient.get<PaginatedVocabularyResponse>(endpoint, {
          params,
        });

        setData(response.data);
        setTotalPages(response.totalPages);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load vocabulary';
        setError(errorMessage);
        console.error('[useVocabulary] Error loading vocabulary:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, cefrLevel, dueOnly]
  );

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
  }, [load]);

  const submitReview = useCallback(
    async (vocabId: number, quality: number) => {
      try {
        await apiClient.post(`/vocabulary/${vocabId}/review`, { quality });
        // Refetch after review
        await load(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to submit review';
        setError(errorMessage);
        console.error('[useVocabulary] Error submitting review:', err);
      }
    },
    [load]
  );

  return { data, totalPages, loading, refreshing, error, refresh, submitReview };
}

/**
 * Hook for fetching vocabulary items due for review
 */
export function useVocabularyDue() {
  const [data, setData] = useState<VocabularyDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<PaginatedVocabularyResponse>('/vocabulary/due', {
        params: { pageSize: 100 },
      });

      setData(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load vocabulary';
      setError(errorMessage);
      console.error('[useVocabularyDue] Error loading vocabulary:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitReview = useCallback(
    async (vocabId: number, quality: number) => {
      try {
        await apiClient.post(`/vocabulary/${vocabId}/review`, { quality });
        await load();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to submit review';
        setError(errorMessage);
        console.error('[useVocabularyDue] Error submitting review:', err);
      }
    },
    [load]
  );

  return { data, loading, error, refresh: load, submitReview };
}
