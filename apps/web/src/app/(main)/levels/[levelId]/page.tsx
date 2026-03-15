'use client';

import { ChevronRight, BookOpen, Lock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useCurrentUser, useAuthLoading } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';

interface Unit {
  id: string;
  name: string;
  description: string;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  objective: string;
  completionPercentage: number;
  exerciseCount: number;
}

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
          <h3 className="truncate font-semibold text-slate-100 transition-colors group-hover:text-cyan-300" aria-hidden="true">
            {lesson.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-400">{lesson.description}</p>
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500" aria-hidden="true">
            <span>{lesson.exerciseCount} exercises</span>
            <span>{Math.round(lesson.completionPercentage)}% Complete</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-5 w-5 transform text-slate-500 transition-all group-hover:translate-x-1 group-hover:text-cyan-400" aria-hidden="true" />
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
  onLessonClick: (lessonId: string) => void;
}) {
  const completedLessons = unit.lessons.filter((l) => l.completionPercentage === 100).length;
  const totalLessons = unit.lessons.length;
  const completionPercentage = (completedLessons / totalLessons) * 100;

  return (
    <div className="bg-linear-to-br space-y-4 rounded-xl border border-slate-700/40 from-slate-800/40 to-slate-700/20 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-100">{unit.name}</h2>
        <p className="text-sm text-slate-400">{unit.description}</p>
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
    const initTokenProvider = async () => {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();

      apiClient.setTokenProvider(async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
          return await currentUser.getIdToken();
        }
        return null;
      });
    };

    initTokenProvider();
    props.params.then((p) => setLevelId(p.levelId));
  }, [props.params]);

  useEffect(() => {
    const fetchUnits = async () => {
      if (!user || authLoading || !levelId) return;

      try {
        setLoading(true);
        setError(null);

        // Mock data for demo - replace with API call once endpoint is available
        const mockUnits: Unit[] = [
          {
            id: 'unit-1',
            name: 'Greetings & Introductions',
            description: 'Learn how to greet people and introduce yourself in Spanish',
            lessons: [
              {
                id: 'lesson-1',
                title: 'Basic Greetings',
                description:
                  'Learn common Spanish greetings like hola, buenos días, and buenas noches',
                objective: 'Understand and use basic greetings',
                completionPercentage: 100,
                exerciseCount: 5,
              },
              {
                id: 'lesson-2',
                title: 'Introductions',
                description: 'Learn how to introduce yourself and ask others their names',
                objective: 'Introduce yourself and others in Spanish',
                completionPercentage: 60,
                exerciseCount: 6,
              },
            ],
          },
          {
            id: 'unit-2',
            name: 'Numbers & Colors',
            description: 'Master numbers and color vocabulary in Spanish',
            lessons: [
              {
                id: 'lesson-3',
                title: 'Numbers 1-20',
                description: 'Learn to count from 1 to 20 in Spanish',
                objective: 'Count and recognize numbers 1-20',
                completionPercentage: 40,
                exerciseCount: 7,
              },
              {
                id: 'lesson-4',
                title: 'Basic Colors',
                description: 'Learn primary and secondary colors in Spanish',
                objective: 'Name colors and describe objects',
                completionPercentage: 0,
                exerciseCount: 6,
              },
            ],
          },
        ];

        setUnits(mockUnits);
      } catch (err) {
        console.error('Failed to fetch units:', err);
        setError(err instanceof Error ? err.message : 'Failed to load units');
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, [user, authLoading, levelId]);

  const handleLessonClick = (lessonId: string) => {
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
    <main id="main-content" tabIndex={-1} className="bg-linear-to-br min-h-screen from-slate-900 via-slate-800 to-slate-700 text-slate-100">
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
