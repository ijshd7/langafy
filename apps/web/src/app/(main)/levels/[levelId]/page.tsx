'use client';

import { ChevronRight, BookOpen, Lock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useCurrentUser, useAuthLoading } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';

// ---------- Types ----------

interface LessonProgress {
  id: number;
  title: string;
  totalExercises: number;
  completedExercises: number;
  completionPercentage: number;
  pointsEarned: number;
  maxPoints: number;
}

interface UnitProgressApi {
  id: number;
  title: string;
  description: string;
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
  pointsEarned: number;
  maxPoints: number;
  lessons: LessonProgress[];
}

interface LevelProgressApi {
  id: number;
  code: string;
  name: string;
  units: UnitProgressApi[];
}

interface ProgressSummaryApi {
  levels: LevelProgressApi[];
}

interface ApiUnit {
  id: number;
  title: string;
  description: string;
  sortOrder: number;
  cefrLevel: { id: number; code: string; name: string };
}

interface ApiLesson {
  id: number;
  title: string;
  description: string;
  objective: string;
  sortOrder: number;
}

// Display types
interface Unit {
  id: number;
  name: string;
  description: string;
  lessons: Lesson[];
}

interface Lesson {
  id: number;
  title: string;
  description: string;
  objective: string;
  completionPercentage: number;
  exerciseCount: number;
}

// ---------- Sub-components ----------

function UnitsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-linear-to-br space-y-4 rounded-xl from-slate-800/50 to-slate-700/30 p-6">
          <div className="h-6 w-48 rounded bg-slate-700" />
          <div className="h-4 w-full rounded bg-slate-700" />
          <div className="space-y-3">
            {[...Array(2)].map((_, j) => (
              <div key={j} className="h-12 rounded-lg bg-slate-700" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LessonCard({ lesson, onLessonClick }: { lesson: Lesson; onLessonClick: () => void }) {
  const isCompleted = lesson.completionPercentage === 100;

  return (
    <button
      onClick={onLessonClick}
      aria-label={`${lesson.title}: ${lesson.exerciseCount} exercises, ${Math.round(lesson.completionPercentage)}% complete${isCompleted ? ' (completed)' : ''}`}
      className="group w-full rounded-lg border border-slate-600/50 bg-gradient-to-r from-slate-700/40 to-slate-600/30 p-4 text-left transition-all duration-200 hover:border-slate-500 hover:from-slate-700/60 hover:to-slate-600/50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3
            className="truncate font-semibold text-slate-100 transition-colors group-hover:text-cyan-300"
            aria-hidden="true">
            {lesson.title}
          </h3>
          {lesson.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-400">{lesson.description}</p>
          )}
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500" aria-hidden="true">
            {lesson.exerciseCount > 0 && <span>{lesson.exerciseCount} exercises</span>}
            <span>{Math.round(lesson.completionPercentage)}% Complete</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          ) : (
            <ChevronRight
              className="h-5 w-5 transform text-slate-500 transition-all group-hover:translate-x-1 group-hover:text-cyan-400"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {lesson.completionPercentage > 0 && (
        <div
          className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-700/40"
          role="progressbar"
          aria-valuenow={Math.round(lesson.completionPercentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-hidden="true">
          <div
            className="bg-linear-to-r h-full rounded-full from-cyan-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${lesson.completionPercentage}%` }}
          />
        </div>
      )}
    </button>
  );
}

function UnitSection({
  unit,
  onLessonClick,
}: {
  unit: Unit;
  onLessonClick: (lessonId: number) => void;
}) {
  const completedLessons = unit.lessons.filter((l) => l.completionPercentage === 100).length;
  const totalLessons = unit.lessons.length;
  const completionPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <div className="bg-linear-to-br space-y-4 rounded-xl border border-slate-700/40 from-slate-800/40 to-slate-700/20 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-100">{unit.name}</h2>
        {unit.description && <p className="text-sm text-slate-400">{unit.description}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Unit Progress</span>
          <span className="font-medium text-slate-300">
            {completedLessons} of {totalLessons} Lessons
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-700/40"
          role="progressbar"
          aria-valuenow={Math.round(completionPercentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${unit.name} progress: ${completedLessons} of ${totalLessons} lessons complete`}>
          <div
            className="bg-linear-to-r h-full rounded-full from-cyan-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {unit.lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            onLessonClick={() => onLessonClick(lesson.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- Main page ----------

type LevelPageProps = {
  params: Promise<{ levelId: string }>;
};

export default function LevelPage(props: LevelPageProps) {
  const router = useRouter();
  const user = useCurrentUser();
  const authLoading = useAuthLoading();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelId, setLevelId] = useState<string>('');

  useEffect(() => {
    props.params.then((p) => setLevelId(p.levelId));
  }, [props.params]);

  useEffect(() => {
    const fetchUnits = async () => {
      if (!user || authLoading || !levelId) return;

      try {
        setLoading(true);
        setError(null);

        // Try progress endpoint first — has full hierarchy with completion data
        const progress = await apiClient.get<ProgressSummaryApi>('/progress');
        const targetLevel = progress.levels.find(
          (l) => l.code.toUpperCase() === levelId.toUpperCase()
        );

        if (targetLevel && targetLevel.units.length > 0) {
          const mappedUnits: Unit[] = targetLevel.units.map((u) => ({
            id: u.id,
            name: u.title,
            description: u.description,
            lessons: u.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              description: '',
              objective: '',
              completionPercentage: l.completionPercentage,
              exerciseCount: l.totalExercises,
            })),
          }));
          setUnits(mappedUnits);
        } else {
          // Fallback: fetch units directly via CEFR code endpoint
          const apiUnits = await apiClient.get<ApiUnit[]>(
            `/languages/es/levels/by-code/${levelId.toUpperCase()}/units`
          );
          const mappedUnits = await Promise.all(
            apiUnits.map(async (u) => {
              const lessons = await apiClient.get<ApiLesson[]>(`/units/${u.id}/lessons`);
              return {
                id: u.id,
                name: u.title,
                description: u.description,
                lessons: lessons.map((l) => ({
                  id: l.id,
                  title: l.title,
                  description: l.description,
                  objective: l.objective,
                  completionPercentage: 0,
                  exerciseCount: 0,
                })),
              };
            })
          );
          setUnits(mappedUnits);
        }
      } catch (err) {
        console.error('Failed to fetch units:', err);
        setError(err instanceof Error ? err.message : 'Failed to load units');
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, [user, authLoading, levelId]);

  const handleLessonClick = (lessonId: number) => {
    router.push(`/lessons/${lessonId}`);
  };

  const getLevelName = () => {
    const levelNames: Record<string, string> = {
      A1: 'Beginner',
      A2: 'Elementary',
      B1: 'Intermediate',
      B2: 'Upper-Intermediate',
      C1: 'Advanced',
      C2: 'Mastery',
    };
    return levelNames[levelId.toUpperCase()] || levelId;
  };

  if (authLoading || loading) {
    return (
      <div className="bg-linear-to-br min-h-screen from-slate-900 via-slate-800 to-slate-700">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <UnitsSkeleton />
        </div>
      </div>
    );
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="bg-linear-to-br min-h-screen from-slate-900 via-slate-800 to-slate-700 text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute right-1/4 top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-32 left-1/3 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12">
          <Link
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-2 text-cyan-400 transition-colors hover:text-cyan-300">
            <ChevronRight className="h-4 w-4 rotate-180" aria-hidden="true" />
            Back to Dashboard
          </Link>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-linear-to-br flex h-12 w-12 items-center justify-center rounded-lg from-cyan-500 to-emerald-500">
                <BookOpen className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <h1 className="text-4xl font-bold text-slate-50">
                {levelId.toUpperCase()} - {getLevelName()}
              </h1>
            </div>
            <p className="text-slate-400">
              Learn Spanish at the {getLevelName()} level. Browse units and complete lessons to
              progress.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-8 rounded-xl border border-red-500/50 bg-red-500/10 p-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {units.length === 0 ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-12 text-center">
              <Lock className="mx-auto mb-4 h-12 w-12 text-slate-500" aria-hidden="true" />
              <p className="text-slate-400">No units available for this level yet.</p>
            </div>
          ) : (
            units.map((unit) => (
              <UnitSection key={unit.id} unit={unit} onLessonClick={handleLessonClick} />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
