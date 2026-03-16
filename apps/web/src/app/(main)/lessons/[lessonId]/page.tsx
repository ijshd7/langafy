'use client';

import { Exercise, ExerciseResult, ExerciseType } from '@langafy/shared-types';
import { ChevronRight, CheckCircle2, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ExerciseRenderer } from '@/components/exercises';
import { useCurrentUser, useAuthLoading } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';

interface ApiLesson {
  id: number;
  title: string;
  description: string;
  objective: string;
  unit: { id: number; title: string; cefrLevel: { code: string } };
  exercises: Array<{
    id: number;
    type: string;
    config: Record<string, unknown>;
    points: number;
    sortOrder: number;
  }>;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  objective: string;
  unitName: string;
  levelCode: string;
  exercises: Exercise[];
  completionPercentage: number;
}

function LessonSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-slate-700" />
        <div className="h-4 w-full rounded bg-slate-700" />
      </div>

      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-slate-700" />
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  index,
  isCompleted,
}: {
  exercise: Exercise;
  index: number;
  isCompleted: boolean;
}) {
  const typeLabel = exercise.type.replace(/([A-Z])/g, ' $1').trim();

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        isCompleted
          ? 'border-emerald-500/50 bg-emerald-500/10'
          : 'border-slate-600/50 bg-slate-700/40 hover:border-slate-500'
      }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/30 text-sm font-semibold text-cyan-300">
            {index + 1}
          </span>
          <span className="text-sm font-medium capitalize text-slate-200">{typeLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <>
              <span className="text-xs font-medium text-emerald-300">{exercise.points} pts</span>
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" aria-hidden="true" />
            </>
          ) : (
            <span className="text-xs text-slate-500">{exercise.points} pts</span>
          )}
        </div>
      </div>
    </div>
  );
}

type LessonPageProps = {
  params: Promise<{ lessonId: string }>;
};

export default function LessonPage(props: LessonPageProps) {
  const router = useRouter();
  const user = useCurrentUser();
  const authLoading = useAuthLoading();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string>('');
  const [completedResults, setCompletedResults] = useState<ExerciseResult[]>([]);
  const [lastEarnedPoints, setLastEarnedPoints] = useState<number | null>(null);
  const [showPointsToast, setShowPointsToast] = useState(false);

  useEffect(() => {
    props.params.then((p) => setLessonId(p.lessonId));
  }, [props.params]);

  useEffect(() => {
    const fetchLesson = async () => {
      if (!user || authLoading || !lessonId) return;

      try {
        setLoading(true);
        setError(null);

        const data = await apiClient.get<ApiLesson>(`/lessons/${lessonId}`);
        const mappedLesson: Lesson = {
          id: data.id.toString(),
          title: data.title,
          description: data.description,
          objective: data.objective,
          unitName: data.unit.title,
          levelCode: data.unit.cefrLevel.code,
          completionPercentage: 0,
          exercises: data.exercises.map((ex) => ({
            id: ex.id.toString(),
            lessonId: data.id.toString(),
            type: ex.type as ExerciseType,
            config: ex.config,
            sortOrder: ex.sortOrder,
            points: ex.points,
          })),
        };

        setLesson(mappedLesson);
      } catch (err) {
        console.error('Failed to fetch lesson:', err);
        setError(err instanceof Error ? err.message : 'Failed to load lesson');
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [user, authLoading, lessonId]);

  const handleExerciseComplete = (result: ExerciseResult) => {
    if (result.score > 0) {
      setLastEarnedPoints(result.score);
      setShowPointsToast(true);
      setTimeout(() => setShowPointsToast(false), 1500);
    }
    setCompletedResults((prev) => [...prev, result]);
    setCurrentExerciseIndex((prev) => prev + 1);
  };

  const handleReturnToDashboard = () => {
    router.push('/dashboard');
  };

  if (authLoading || loading) {
    return (
      <div className="bg-linear-to-br min-h-screen from-slate-900 via-slate-800 to-slate-700">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <LessonSkeleton />
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="bg-linear-to-br flex min-h-screen items-center justify-center from-slate-900 via-slate-800 to-slate-700">
        <div className="text-center">
          <p className="mb-4 text-slate-400">Lesson not found</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-white transition-colors hover:bg-cyan-700">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentExercise = lesson.exercises[currentExerciseIndex];
  const progressPercentage = ((currentExerciseIndex + 1) / lesson.exercises.length) * 100;

  return (
    <main id="main-content" tabIndex={-1} className="bg-linear-to-br min-h-screen from-slate-900 via-slate-800 to-slate-700 text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute right-1/4 top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-32 left-1/3 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-2 text-cyan-400 transition-colors hover:text-cyan-300">
            <ChevronRight className="h-4 w-4 rotate-180" aria-hidden="true" />
            Back to Dashboard
          </Link>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-50">{lesson.title}</h1>
            <p className="text-sm text-slate-400">
              {lesson.levelCode} • {lesson.unitName}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8 rounded-xl border border-slate-700/50 bg-slate-800/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Lesson Progress
            </h2>
            <div className="flex items-center gap-4">
              {completedResults.length > 0 && (
                <span className="flex items-center gap-1 text-sm font-bold text-emerald-300">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  {completedResults.reduce((s, r) => s + r.score, 0)} pts
                </span>
              )}
              <span className="text-sm font-bold text-cyan-300">
                {currentExerciseIndex + 1} of {lesson.exercises.length}
              </span>
            </div>
          </div>

          <div
            role="progressbar"
            aria-valuenow={Math.round(progressPercentage)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Lesson progress: exercise ${currentExerciseIndex + 1} of ${lesson.exercises.length}`}
            className="h-3 w-full overflow-hidden rounded-full bg-slate-700/40">
            <div
              className="bg-linear-to-r h-full rounded-full from-cyan-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-400">{lesson.objective}</p>
        </div>

        {error && (
          <div role="alert" className="mb-8 rounded-xl border border-red-500/50 bg-red-500/10 p-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Current exercise display or completion screen */}
        {currentExerciseIndex >= lesson.exercises.length ? (
          <div className="relative mb-8 overflow-hidden rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-8">
            {/* Confetti particles */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className="pointer-events-none absolute h-2 w-2 rounded-sm"
                style={{
                  left: `${10 + i * 11}%`,
                  top: '-8px',
                  backgroundColor: ['#22d3ee', '#34d399', '#fbbf24', '#f87171', '#a78bfa'][i % 5],
                  animation: `confetti-drop ${0.8 + i * 0.15}s ease-in ${i * 0.08}s both`,
                }}
              />
            ))}

            <div
              role="status"
              aria-live="polite"
              aria-label="Lesson complete"
              className="space-y-6 text-center"
              style={{ animation: 'fade-in-up 0.5s ease-out' }}>
              <div
                style={{ animation: 'celebration-pop 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both' }}>
                <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" aria-hidden="true" />
              </div>
              <div>
                <h2 className="mb-2 text-3xl font-bold text-slate-100">Lesson Complete!</h2>
                <div className="mt-4 flex items-center justify-center gap-4">
                  <div className="rounded-lg bg-slate-700/50 px-4 py-2 text-center">
                    <p className="text-xs uppercase tracking-wider text-slate-400">Score</p>
                    <p className="text-2xl font-bold text-emerald-300">
                      {completedResults.reduce((s, r) => s + r.score, 0)}
                      <span className="text-sm font-normal text-slate-400">
                        {' '}
                        /{completedResults.reduce((s, r) => s + r.maxScore, 0)}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-700/50 px-4 py-2 text-center">
                    <p className="text-xs uppercase tracking-wider text-slate-400">Accuracy</p>
                    <p className="text-2xl font-bold text-cyan-300">
                      {completedResults.reduce((s, r) => s + r.maxScore, 0) > 0
                        ? Math.round(
                            (completedResults.reduce((s, r) => s + r.score, 0) /
                              completedResults.reduce((s, r) => s + r.maxScore, 0)) *
                              100
                          )
                        : 0}
                      %
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleReturnToDashboard}
                className="bg-linear-to-r inline-flex items-center gap-2 rounded-lg from-cyan-500 to-emerald-500 px-6 py-3 font-semibold text-slate-900 transition-all hover:shadow-lg hover:shadow-cyan-500/25">
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="relative mb-8 rounded-xl border border-slate-700/40 bg-slate-800/40 p-8">
            {showPointsToast && lastEarnedPoints !== null && (
              <div
                role="status"
                aria-live="polite"
                aria-label={`+${lastEarnedPoints} points earned`}
                className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/30"
                style={{ animation: 'points-float 1.5s ease-out forwards' }}>
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />+{lastEarnedPoints} pts
              </div>
            )}

            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/30 text-lg font-bold text-cyan-300">
                  {currentExerciseIndex + 1}
                </span>
                <h2 className="text-2xl font-bold text-slate-100">
                  Exercise {currentExerciseIndex + 1}
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/20 px-3 py-1 text-sm capitalize text-cyan-300">
                <Zap className="h-4 w-4" aria-hidden="true" />
                {currentExercise.type.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>

            {/* Exercise renderer */}
            <div className="mt-8">
              <ExerciseRenderer exercise={currentExercise} onComplete={handleExerciseComplete} />
            </div>
          </div>
        )}

        {/* Exercise list */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-slate-200">All Exercises</h3>
          <div className="space-y-2">
            {lesson.exercises.map((exercise, index) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                isCompleted={index < currentExerciseIndex}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
