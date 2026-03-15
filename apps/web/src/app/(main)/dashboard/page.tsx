'use client';

import { ChevronRight, Flame, Trophy, BookOpen, Zap, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useCurrentUser, useAuthLoading } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';

/**
 * Mock progress data structure - will be replaced with actual API response
 * This matches the expected API response from GET /api/progress
 */
interface ProgressSummary {
  totalPoints: number;
  currentStreak: number;
  levelProgress: {
    level: string;
    levelName: string;
    percentage: number;
    units: {
      id: string;
      name: string;
      percentage: number;
    }[];
  }[];
  nextIncompleteLesson?: {
    id: string;
    title: string;
    unitId: string;
  };
}

/**
 * Skeleton loaders for loading state
 */
function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Header skeleton */}
      <div className="space-y-4">
        <div className="bg-linear-to-r h-8 w-48 rounded-lg from-slate-700 to-slate-600" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-linear-to-r h-20 rounded-lg from-slate-700 to-slate-600" />
          ))}
        </div>
      </div>

      {/* Units skeleton */}
      <div className="space-y-4">
        <div className="bg-linear-to-r h-6 w-32 rounded-lg from-slate-700 to-slate-600" />
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-linear-to-r space-y-3 rounded-xl from-slate-700 to-slate-600 p-6">
            <div className="h-5 w-32 rounded bg-slate-600" />
            <div className="h-3 w-full rounded-full bg-slate-600" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Progress bar component with smooth animation
 */
function ProgressBar({ percentage, label }: { percentage: number; label?: string }) {
  return (
    <div
      className="relative h-2 w-full overflow-hidden rounded-full bg-slate-700/40"
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${Math.round(percentage)}% complete`}>
      <div
        className="bg-linear-to-r h-full rounded-full from-cyan-400 to-emerald-400 transition-all duration-1000 ease-out"
        style={{
          width: `${percentage}%`,
        }}
      />
    </div>
  );
}

/**
 * CEFR level badge with gradient circle
 */
function CefrLevelBadge({ level }: { level: string }) {
  const colors: Record<string, { bg: string; text: string; ring: string }> = {
    A1: { bg: 'from-blue-500 to-cyan-500', text: 'text-white', ring: 'ring-blue-400/50' },
    A2: { bg: 'from-cyan-500 to-teal-500', text: 'text-white', ring: 'ring-cyan-400/50' },
    B1: { bg: 'from-teal-500 to-emerald-500', text: 'text-white', ring: 'ring-teal-400/50' },
    B2: { bg: 'from-emerald-500 to-green-500', text: 'text-white', ring: 'ring-emerald-400/50' },
    C1: { bg: 'from-amber-500 to-orange-500', text: 'text-white', ring: 'ring-amber-400/50' },
    C2: { bg: 'from-orange-500 to-red-500', text: 'text-white', ring: 'ring-orange-400/50' },
  };

  const color = colors[level] || colors.A1;

  return (
    <div
      className={`bg-linear-to-br inline-flex h-24 w-24 items-center justify-center rounded-full ${color.bg} ring-4 ${color.ring} transform shadow-lg transition-transform duration-300 hover:scale-110`}>
      <span className={`text-2xl font-bold ${color.text}`}>{level}</span>
    </div>
  );
}

/**
 * Stats card component
 */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Trophy;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-linear-to-br rounded-xl border border-slate-700/50 from-slate-800/60 to-slate-700/40 p-4 backdrop-blur-sm transition-all duration-300 hover:border-slate-600/80">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-0.5 text-xl font-bold text-slate-100">{value}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Unit progress card
 */
function UnitCard({
  unit,
  onLessonClick,
}: {
  unit: ProgressSummary['levelProgress'][0]['units'][0];
  onLessonClick: () => void;
}) {
  return (
    <button
      onClick={onLessonClick}
      aria-label={`${unit.name}: ${Math.round(unit.percentage)}% complete`}
      className="bg-linear-to-br group relative w-full rounded-xl border border-slate-700/50 from-slate-800/50 to-slate-700/30 p-6 text-left backdrop-blur-sm transition-all duration-300 hover:border-slate-600 hover:from-slate-800/80 hover:to-slate-700/50">
      <div className="mb-4 flex items-start justify-between">
        <h3 className="font-semibold text-slate-100 transition-colors group-hover:text-cyan-300" aria-hidden="true">
          {unit.name}
        </h3>
        <ChevronRight className="h-5 w-5 transform text-slate-500 transition-all group-hover:translate-x-1 group-hover:text-cyan-400" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <ProgressBar percentage={unit.percentage} label={`${unit.name} progress: ${Math.round(unit.percentage)}%`} />
        <p className="text-sm text-slate-400" aria-hidden="true">{Math.round(unit.percentage)}% Complete</p>
      </div>
    </button>
  );
}

/**
 * Continue learning card with CTA
 */
function ContinueLearningCard({
  lesson,
  onClick,
}: {
  lesson: ProgressSummary['nextIncompleteLesson'];
  onClick: () => void;
}) {
  if (!lesson) return null;

  return (
    <button
      onClick={onClick}
      className="bg-linear-to-r group relative w-full overflow-hidden rounded-xl border border-cyan-500/40 from-cyan-600/20 via-emerald-600/20 to-teal-600/20 p-6 transition-all duration-300 hover:border-cyan-500/80">
      {/* Animated background effect */}
      <div className="bg-linear-to-r absolute inset-0 from-cyan-500/10 to-emerald-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-linear-to-br flex h-12 w-12 items-center justify-center rounded-lg from-cyan-500 to-emerald-500">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-slate-300">Continue Learning</p>
            <p className="text-lg font-bold text-cyan-300 transition-colors group-hover:text-cyan-200">
              {lesson.title}
            </p>
          </div>
        </div>
        <ChevronRight className="h-6 w-6 text-emerald-400 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  );
}

/**
 * Main dashboard page
 */
export default function DashboardPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const authLoading = useAuthLoading();
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize token provider for API client
   */
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
  }, []);

  /**
   * Fetch progress data from API
   */
  useEffect(() => {
    const fetchProgress = async () => {
      if (!user || authLoading) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch progress from API
        const data = await apiClient.get<ProgressSummary>('/progress');
        setProgress(data);
      } catch (err) {
        console.error('Failed to fetch progress:', err);
        setError(err instanceof Error ? err.message : 'Failed to load progress');

        // Set mock data for demonstration if API fails
        setProgress({
          totalPoints: 2450,
          currentStreak: 12,
          levelProgress: [
            {
              level: 'A1',
              levelName: 'Beginner',
              percentage: 100,
              units: [
                { id: '1', name: 'Greetings & Introductions', percentage: 100 },
                { id: '2', name: 'Numbers & Colors', percentage: 100 },
              ],
            },
            {
              level: 'A2',
              levelName: 'Elementary',
              percentage: 45,
              units: [
                { id: '3', name: 'Daily Routines', percentage: 75 },
                { id: '4', name: 'Food & Drinks', percentage: 30 },
              ],
            },
          ],
          nextIncompleteLesson: {
            id: 'lesson-4',
            title: 'Ordering Food in Spanish',
            unitId: '4',
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user, authLoading]);

  /**
   * Navigate to lesson
   */
  const handleContinueLearning = () => {
    if (progress?.nextIncompleteLesson) {
      router.push(`/lessons/${progress.nextIncompleteLesson.id}`);
    }
  };

  /**
   * Navigate to level
   */
  const handleViewLevel = (levelName: string) => {
    const levelCode = levelName.split(' ')[0];
    router.push(`/levels/${levelCode}`);
  };

  // Show loading state if auth is still loading
  if (authLoading) {
    return (
      <div className="bg-linear-to-br min-h-screen from-slate-900 via-slate-800 to-slate-700">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  // Show loading state while fetching progress
  if (loading) {
    return (
      <div className="bg-linear-to-br min-h-screen from-slate-900 via-slate-800 to-slate-700">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !progress) {
    return (
      <div className="bg-linear-to-br min-h-screen from-slate-900 via-slate-800 to-slate-700">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-6">
            <p className="text-red-300">Error loading dashboard. Please try again.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!progress) return null;

  const currentLevel = progress.levelProgress[progress.levelProgress.length - 1];

  return (
    <main id="main-content" tabIndex={-1} className="bg-linear-to-br min-h-screen from-slate-900 via-slate-800 to-slate-700 text-slate-100">
      {/* Background decorative elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute right-1/4 top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-32 left-1/3 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header section */}
        <div className="mb-12 space-y-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">
              Welcome back, {user?.email?.split('@')[0]}
            </p>
            <h1 className="mt-2 text-4xl font-bold text-slate-50 sm:text-5xl">
              Your Learning Journey
            </h1>
          </div>

          {/* Level and stats section */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:items-center">
            {/* Current level display */}
            <div className="space-y-4 lg:col-span-2">
              <p className="text-sm font-medium uppercase tracking-wider text-slate-400">
                Current Level
              </p>
              <div className="flex items-center gap-6">
                <CefrLevelBadge level={currentLevel.level} />
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-100">{currentLevel.level}</h2>
                  <p className="text-slate-400">{currentLevel.levelName}</p>
                  <p className="text-sm text-cyan-400">
                    {Math.round(currentLevel.percentage)}% Complete
                  </p>
                </div>
              </div>
            </div>

            {/* Stats cards */}
            <StatCard
              icon={Trophy}
              label="Total Points"
              value={progress.totalPoints}
              color="bg-linear-to-br from-amber-500/50 to-orange-500/50"
            />
            <StatCard
              icon={Flame}
              label="Current Streak"
              value={`${progress.currentStreak} days`}
              color="bg-linear-to-br from-rose-500/50 to-pink-500/50"
            />
          </div>
        </div>

        {/* Continue learning CTA */}
        <div className="mb-12">
          <ContinueLearningCard
            lesson={progress.nextIncompleteLesson}
            onClick={handleContinueLearning}
          />
        </div>

        {/* Progress by level */}
        <div className="space-y-8">
          {progress.levelProgress.map((level) => (
            <div key={level.level} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">
                    {level.level} - {level.levelName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {Math.round(level.percentage)}% Complete
                  </p>
                </div>
                <button
                  onClick={() => handleViewLevel(level.level)}
                  aria-label={`View all units for ${level.level} - ${level.levelName}`}
                  className="flex items-center gap-2 rounded-lg bg-slate-700/50 px-4 py-2 text-sm font-medium text-cyan-400 transition-all hover:bg-slate-700 hover:text-cyan-300">
                  View All <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Level progress bar */}
              <ProgressBar
                percentage={level.percentage}
                label={`${level.level} - ${level.levelName}: ${Math.round(level.percentage)}% complete`}
              />

              {/* Units grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {level.units.map((unit) => (
                  <UnitCard
                    key={unit.id}
                    unit={unit}
                    onLessonClick={() => handleViewLevel(level.level)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Additional resources section */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="bg-linear-to-r rounded-xl border border-slate-700/50 from-slate-800/50 to-slate-700/30 p-8 backdrop-blur-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-emerald-400" />
                <div>
                  <h3 className="font-semibold text-slate-100">Explore Vocabulary</h3>
                  <p className="text-sm text-slate-400">
                    Review and practice vocabulary from all levels
                  </p>
                </div>
              </div>
              <Link
                href="/vocabulary"
                className="bg-linear-to-r inline-flex items-center gap-2 rounded-lg from-cyan-500 to-emerald-500 px-6 py-2 font-medium text-slate-900 transition-all hover:shadow-lg hover:shadow-cyan-500/25">
                View Dictionary <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="bg-linear-to-r rounded-xl border border-cyan-700/40 from-cyan-900/30 to-emerald-900/20 p-8 backdrop-blur-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-6 w-6 text-cyan-400" />
                <div>
                  <h3 className="font-semibold text-slate-100">AI Conversation Practice</h3>
                  <p className="text-sm text-slate-400">
                    Chat with an AI tutor to practice speaking
                  </p>
                </div>
              </div>
              <Link
                href="/practice/conversation"
                className="bg-linear-to-r inline-flex items-center gap-2 rounded-lg from-cyan-500/80 to-emerald-500/80 px-6 py-2 font-medium text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25">
                Start Chatting <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
