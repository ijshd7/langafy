import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api';

// ---------- Raw API response types (matches ProgressSummaryDto) ----------

interface ApiLessonProgress {
  id: number;
  title: string;
  totalExercises: number;
  completedExercises: number;
  completionPercentage: number;
  pointsEarned: number;
  maxPoints: number;
}

interface ApiUnitProgress {
  id: number;
  title: string;
  description: string;
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
  pointsEarned: number;
  maxPoints: number;
  lessons: ApiLessonProgress[];
}

interface ApiLevelProgress {
  id: number;
  code: string;
  name: string;
  totalUnits: number;
  completedUnits: number;
  completionPercentage: number;
  pointsEarned: number;
  maxPoints: number;
  units: ApiUnitProgress[];
}

interface ApiProgressSummary {
  languageCode: string;
  languageName: string;
  currentCefrLevel: string;
  totalExercisesCompleted: number;
  totalExercisesAttempted: number;
  totalPointsEarned: number;
  currentStreak: number;
  longestStreak: number;
  overallCompletionPercentage: number;
  lastActivityAt: string | null;
  levels: ApiLevelProgress[];
}

// ---------- Display types (consumed by UI components) ----------

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

// ---------- Mapping ----------

function mapApiProgress(api: ApiProgressSummary): ProgressSummary {
  const units: UnitProgress[] = [];
  let nextLessonId: string | undefined;
  let nextLessonTitle: string | undefined;

  for (const level of api.levels) {
    for (const unit of level.units) {
      units.push({
        unitCode: `${level.code}-${unit.id}`,
        unitTitle: unit.title,
        cefrLevel: level.code,
        completedLessons: unit.completedLessons,
        totalLessons: unit.totalLessons,
        percentage: unit.completionPercentage,
      });

      // Find the first incomplete lesson for "Continue Learning"
      if (!nextLessonId) {
        for (const lesson of unit.lessons) {
          if (lesson.completionPercentage < 100) {
            nextLessonId = lesson.id.toString();
            nextLessonTitle = lesson.title;
            break;
          }
        }
      }
    }
  }

  return {
    language: api.languageName,
    languageCode: api.languageCode,
    cefrLevel: api.currentCefrLevel,
    totalPoints: api.totalPointsEarned,
    currentStreak: api.currentStreak,
    completedExercises: api.totalExercisesCompleted,
    units,
    nextLessonId,
    nextLessonTitle,
  };
}

// ---------- Hook ----------

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

      const raw = await apiClient.get<ApiProgressSummary>('/progress');
      setData(mapApiProgress(raw));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load progress';
      setError(errorMessage);
      console.error('[useProgress] Error loading progress:', err);
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
