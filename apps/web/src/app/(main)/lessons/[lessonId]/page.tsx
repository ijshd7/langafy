'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser, useAuthLoading } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api'
import Link from 'next/link'
import { ChevronRight, BookOpen, CheckCircle2, Clock, Zap } from 'lucide-react'

interface Exercise {
  id: string
  type: string
  title: string
  description: string
  question?: string
}

interface Lesson {
  id: string
  title: string
  description: string
  objective: string
  unitName: string
  levelCode: string
  exercises: Exercise[]
  completionPercentage: number
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
  )
}

function ExerciseCard({
  exercise,
  index,
  totalExercises,
  isCompleted,
}: {
  exercise: Exercise
  index: number
  totalExercises: number
  isCompleted: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-6 transition-all ${
        isCompleted
          ? 'bg-emerald-500/10 border-emerald-500/50'
          : 'bg-slate-700/40 border-slate-600/50 hover:border-slate-500'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/30 text-cyan-300 text-sm font-semibold">
              {index + 1}
            </span>
            <h3 className="text-lg font-semibold text-slate-100">{exercise.title}</h3>
          </div>
          <p className="text-slate-400 text-sm">{exercise.description}</p>
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
            <span className="capitalize bg-slate-700/50 px-2 py-1 rounded">
              {exercise.type.replace('_', ' ')}
            </span>
          </div>
        </div>
        {isCompleted && <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 mt-1" />}
      </div>
    </div>
  )
}

type LessonPageProps = {
  params: Promise<{ lessonId: string }>
}

export default function LessonPage(props: LessonPageProps) {
  const router = useRouter()
  const user = useCurrentUser()
  const authLoading = useAuthLoading()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string>('')

  useEffect(() => {
    const initTokenProvider = async () => {
      const { getAuth } = await import('firebase/auth')
      const auth = getAuth()

      apiClient.setTokenProvider(async () => {
        const currentUser = auth.currentUser
        if (currentUser) {
          return await currentUser.getIdToken()
        }
        return null
      })
    }

    initTokenProvider()
    props.params.then((p) => setLessonId(p.lessonId))
  }, [props.params])

  useEffect(() => {
    const fetchLesson = async () => {
      if (!user || authLoading || !lessonId) return

      try {
        setLoading(true)
        setError(null)

        // Mock data for demo
        const mockLesson: Lesson = {
          id: lessonId,
          title: 'Basic Greetings in Spanish',
          description: 'Learn how to greet people in Spanish with common phrases and expressions',
          objective:
            'Master fundamental Spanish greetings and understand when to use formal vs informal greetings',
          unitName: 'Greetings & Introductions',
          levelCode: 'A1',
          completionPercentage: 0,
          exercises: [
            {
              id: 'ex-1',
              type: 'multiple_choice',
              title: 'Greeting Selection',
              description: 'Choose the correct greeting for different situations',
              question: 'What do you say when greeting someone in the morning?',
            },
            {
              id: 'ex-2',
              type: 'fill_blank',
              title: 'Fill in the Blank',
              description: 'Complete the Spanish greeting',
              question: 'Hola, ¿cómo _____?',
            },
            {
              id: 'ex-3',
              type: 'word_scramble',
              title: 'Unscramble the Word',
              description: 'Rearrange letters to form a Spanish greeting',
              question: 'unscramble: s-a-d-a-n-o-b',
            },
            {
              id: 'ex-4',
              type: 'flashcard_match',
              title: 'Match Greetings',
              description: 'Match Spanish greetings with their English translations',
              question: 'Match pairs of greetings',
            },
          ],
        }

        setLesson(mockLesson)
      } catch (err) {
        console.error('Failed to fetch lesson:', err)
        setError(err instanceof Error ? err.message : 'Failed to load lesson')
      } finally {
        setLoading(false)
      }
    }

    fetchLesson()
  }, [user, authLoading, lessonId])

  const handleCompleteExercise = () => {
    if (currentExerciseIndex < (lesson?.exercises.length || 0) - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1)
    }
  }

  const handleReturnToDashboard = () => {
    router.push('/dashboard')
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-700">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <LessonSkeleton />
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Lesson not found</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const currentExercise = lesson.exercises[currentExerciseIndex]
  const isLastExercise = currentExerciseIndex === lesson.exercises.length - 1
  const progressPercentage = ((currentExerciseIndex + 1) / lesson.exercises.length) * 100

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-700 text-slate-100">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-32 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-4"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
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
        <div className="mb-8 rounded-xl bg-slate-800/50 border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Lesson Progress
            </h2>
            <span className="text-sm font-bold text-cyan-300">
              {currentExerciseIndex + 1} of {lesson.exercises.length}
            </span>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700/40">
            <div
              className="h-full rounded-full bg-linear-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <p className="mt-4 text-sm text-slate-400 leading-relaxed">{lesson.objective}</p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/50 p-6 mb-8">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Current exercise display */}
        <div className="mb-8 rounded-xl bg-slate-800/40 border border-slate-700/40 p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/30 text-cyan-300 text-lg font-bold">
                  {currentExerciseIndex + 1}
                </span>
                <h2 className="text-2xl font-bold text-slate-100">{currentExercise.title}</h2>
              </div>
              <p className="text-slate-400 ml-13">{currentExercise.description}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/20 px-3 py-1 text-sm text-cyan-300 capitalize">
              <Zap className="h-4 w-4" />
              {currentExercise.type.replace('_', ' ')}
            </span>
          </div>

          {/* Exercise content placeholder */}
          <div className="rounded-lg bg-gradient-to-br from-slate-700/40 to-slate-600/30 border border-slate-600/50 p-8 my-8">
            <div className="text-center space-y-4">
              <BookOpen className="h-12 w-12 text-slate-500 mx-auto" />
              <p className="text-slate-400">
                <span className="font-semibold">{currentExercise.question}</span>
              </p>
              <p className="text-sm text-slate-500">
                Exercise component will be implemented in Phase 5 (Step 5.2-5.7)
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={handleCompleteExercise}
              className="flex-1 rounded-lg bg-linear-to-r from-cyan-500 to-emerald-500 px-6 py-3 font-semibold text-slate-900 hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              {isLastExercise ? 'Complete Lesson' : 'Next Exercise'}
            </button>
            {isLastExercise && (
              <button
                onClick={handleReturnToDashboard}
                className="flex-1 rounded-lg border border-slate-600 px-6 py-3 font-semibold text-slate-100 hover:border-slate-500 hover:bg-slate-700/50 transition-all"
              >
                Return to Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Exercise list */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">All Exercises</h3>
          <div className="space-y-3">
            {lesson.exercises.map((exercise, index) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                totalExercises={lesson.exercises.length}
                isCompleted={index < currentExerciseIndex}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
