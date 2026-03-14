'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser, useAuthLoading } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api'
import Link from 'next/link'
import { ChevronRight, BookOpen, Clock, Zap, Search, Filter, RotateCcw } from 'lucide-react'

interface VocabularyDto {
  id: number
  wordTarget: string
  wordEn: string
  partOfSpeech: string
  exampleSentenceTarget: string
  exampleSentenceEn: string
  cefrLevel: string
  easeFactor: number | null
  intervalDays: number
  repetitions: number
  nextReviewAt: string | null
  isDueForReview: boolean
}

interface PaginatedVocabularyResponse {
  items: VocabularyDto[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

type ViewMode = 'list' | 'review'

function VocabularySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-20 rounded-lg bg-slate-700" />
      ))}
    </div>
  )
}

function VocabularyCard({
  vocab,
  isSelected,
  isDueForReview,
  onSelect,
}: {
  vocab: VocabularyDto
  isSelected: boolean
  isDueForReview: boolean
  onSelect: (vocab: VocabularyDto) => void
}) {
  return (
    <button
      onClick={() => onSelect(vocab)}
      className={`w-full text-left rounded-lg border p-4 transition-all ${
        isSelected
          ? 'bg-cyan-500/20 border-cyan-500 shadow-lg shadow-cyan-500/20'
          : 'bg-slate-700/40 border-slate-600/50 hover:border-slate-500'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-slate-100 truncate">{vocab.wordTarget}</h3>
            <span className="inline-flex items-center rounded-full bg-slate-700/50 px-2.5 py-0.5 text-xs font-medium text-slate-300">
              {vocab.cefrLevel}
            </span>
          </div>
          <p className="text-sm text-slate-400 mb-2">{vocab.wordEn}</p>
          {vocab.partOfSpeech && (
            <p className="text-xs text-slate-500 italic mb-2">{vocab.partOfSpeech}</p>
          )}
          {vocab.exampleSentenceTarget && (
            <p className="text-sm text-slate-300 line-clamp-2">&quot;{vocab.exampleSentenceTarget}&quot;</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {isDueForReview && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs font-medium text-orange-300">
              <Clock className="h-3 w-3" />
              Due
            </span>
          )}
          {vocab.easeFactor !== null && (
            <div className="text-right">
              <p className="text-xs text-slate-500">Ease Factor</p>
              <p className="text-sm font-semibold text-slate-200">{vocab.easeFactor.toFixed(2)}</p>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

interface ReviewRatingProps {
  onRate: (quality: number) => void
  isLoading: boolean
}

function ReviewCard({
  vocab,
  onRate,
  isLoading,
}: {
  vocab: VocabularyDto
} & ReviewRatingProps) {
  const [flipped, setFlipped] = useState(false)

  const handleRate = (label: string) => {
    // Map UI labels to SM-2 quality ratings
    const qualityMap: Record<string, number> = {
      Again: 0, // Complete blackout
      Hard: 2, // Correct but required serious effort
      Good: 3, // Correct after some hesitation
      Easy: 5, // Correct without hesitation
    }
    onRate(qualityMap[label])
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-700">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-32 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-screen">
        <div className="w-full max-w-lg">
          {/* Flashcard */}
          <div
            className="h-80 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 p-8 flex flex-col items-center justify-center cursor-pointer transition-all shadow-2xl shadow-slate-900/50 mb-8"
            onClick={() => setFlipped(!flipped)}
          >
            <div className="text-center space-y-6">
              {!flipped ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm uppercase tracking-widest text-slate-500">Target Language</p>
                    <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                      {vocab.wordTarget}
                    </h2>
                  </div>
                  <p className="text-slate-500 text-sm">Click to reveal translation</p>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <p className="text-sm uppercase tracking-widest text-slate-500">English</p>
                    <h2 className="text-3xl font-bold text-slate-100">{vocab.wordEn}</h2>
                    {vocab.partOfSpeech && (
                      <p className="text-sm text-slate-400 italic">{vocab.partOfSpeech}</p>
                    )}
                  </div>
                  {vocab.exampleSentenceEn && (
                    <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-300">
                      <p className="text-xs text-slate-500 mb-2">Example:</p>
                      <p>&quot;{vocab.exampleSentenceEn}&quot;</p>
                    </div>
                  )}
                  <p className="text-slate-500 text-sm">Click to show target word</p>
                </>
              )}
            </div>
          </div>

          {/* Rating buttons */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <button
              onClick={() => handleRate('Again')}
              disabled={isLoading}
              className="rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/30 disabled:opacity-50 transition-colors"
            >
              Again
            </button>
            <button
              onClick={() => handleRate('Hard')}
              disabled={isLoading}
              className="rounded-lg bg-orange-500/20 border border-orange-500/50 px-4 py-3 text-sm font-semibold text-orange-300 hover:bg-orange-500/30 disabled:opacity-50 transition-colors"
            >
              Hard
            </button>
            <button
              onClick={() => handleRate('Good')}
              disabled={isLoading}
              className="rounded-lg bg-emerald-500/20 border border-emerald-500/50 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
            >
              Good
            </button>
            <button
              onClick={() => handleRate('Easy')}
              disabled={isLoading}
              className="rounded-lg bg-cyan-500/20 border border-cyan-500/50 px-4 py-3 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-50 transition-colors"
            >
              Easy
            </button>
          </div>

          <div className="bg-slate-800/40 rounded-lg border border-slate-700/50 p-4">
            <p className="text-xs text-slate-400 text-center mb-3">
              <strong>How to rate:</strong> How easily did you recall this word?
            </p>
            <div className="space-y-1 text-xs text-slate-500">
              <p>• <strong>Again</strong> = Complete blackout, don't remember</p>
              <p>• <strong>Hard</strong> = Correct but required effort</p>
              <p>• <strong>Good</strong> = Correct after hesitation</p>
              <p>• <strong>Easy</strong> = Correct without hesitation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type PageProps = {
  params: Promise<Record<string, never>>
}

export default function VocabularyPage(props: PageProps) {
  const router = useRouter()
  const user = useCurrentUser()
  const authLoading = useAuthLoading()

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [items, setItems] = useState<VocabularyDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // List view state
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [cefrFilter, setCefrFilter] = useState<string | null>(null)
  const [showDueOnly, setShowDueOnly] = useState(false)

  // Review mode state
  const [reviewItems, setReviewItems] = useState<VocabularyDto[]>([])
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)
  const [reviewLoading, setReviewLoading] = useState(false)

  // Token provider setup
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
  }, [])

  // Fetch vocabulary list
  useEffect(() => {
    const fetchVocabulary = async () => {
      if (!user || authLoading) return

      try {
        setLoading(true)
        setError(null)

        const endpoint = showDueOnly ? '/vocabulary/due' : '/vocabulary'
        const data = await apiClient.get<PaginatedVocabularyResponse>(endpoint, {
          params: {
            page,
            pageSize: 20,
            ...(searchTerm && { search: searchTerm }),
            ...(cefrFilter && { cefrLevel: cefrFilter }),
          },
        })

        setItems(data.items)
        setTotalPages(data.totalPages)
      } catch (err) {
        console.error('Failed to fetch vocabulary:', err)
        setError(err instanceof Error ? err.message : 'Failed to load vocabulary')
      } finally {
        setLoading(false)
      }
    }

    const timeout = setTimeout(fetchVocabulary, 300) // Debounce search
    return () => clearTimeout(timeout)
  }, [user, authLoading, page, searchTerm, cefrFilter, showDueOnly])

  const handleStartReview = async () => {
    try {
      setReviewLoading(true)
      const data = await apiClient.get<PaginatedVocabularyResponse>('/vocabulary/due', {
        params: { pageSize: 100 },
      })
      setReviewItems(data.items)
      setCurrentReviewIndex(0)
      setViewMode('review')
    } catch (err) {
      console.error('Failed to fetch due items:', err)
      setError(err instanceof Error ? err.message : 'Failed to load items due for review')
    } finally {
      setReviewLoading(false)
    }
  }

  const handleRateVocab = async (quality: number) => {
    if (currentReviewIndex >= reviewItems.length) return

    try {
      setReviewLoading(true)
      const vocabId = reviewItems[currentReviewIndex].id

      await apiClient.post(`/vocabulary/${vocabId}/review`, { quality })

      // Move to next item or finish
      if (currentReviewIndex + 1 >= reviewItems.length) {
        // Review complete
        setViewMode('list')
        setReviewItems([])
        setCurrentReviewIndex(0)
        // Refresh the vocabulary list
        setPage(1)
      } else {
        setCurrentReviewIndex((prev) => prev + 1)
      }
    } catch (err) {
      console.error('Failed to record review:', err)
      setError(err instanceof Error ? err.message : 'Failed to record review')
    } finally {
      setReviewLoading(false)
    }
  }

  useEffect(() => {
    props.params
  }, [props.params])

  if (authLoading || (loading && viewMode === 'list')) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-700">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <VocabularySkeleton />
        </div>
      </div>
    )
  }

  // Review mode view
  if (viewMode === 'review') {
    if (reviewItems.length === 0) {
      return (
        <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-100 mb-2">All caught up!</h2>
            <p className="text-slate-400 mb-6">No vocabulary items due for review right now.</p>
            <button
              onClick={() => setViewMode('list')}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-2 text-white hover:bg-cyan-700 transition-colors"
            >
              Back to Vocabulary
            </button>
          </div>
        </div>
      )
    }

    return (
      <>
        <ReviewCard vocab={reviewItems[currentReviewIndex]} onRate={handleRateVocab} isLoading={reviewLoading} />
        <div className="fixed top-8 left-8">
          <button
            onClick={() => {
              setViewMode('list')
              setReviewItems([])
            }}
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Exit Review
          </button>
        </div>
        <div className="fixed bottom-8 right-8 text-center">
          <p className="text-sm text-slate-400">
            {currentReviewIndex + 1} of {reviewItems.length}
          </p>
        </div>
      </>
    )
  }

  // List view
  const dueCount = items.filter((v) => v.isDueForReview).length

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-700 text-slate-100">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-32 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-4"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-50 flex items-center gap-2">
                <BookOpen className="h-8 w-8 text-cyan-400" />
                Vocabulary Bank
              </h1>
              <p className="text-slate-400 mt-2">{items.length} words loaded</p>
            </div>

            {dueCount > 0 && (
              <button
                onClick={handleStartReview}
                disabled={reviewLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-orange-500 to-red-500 px-6 py-3 font-semibold text-white hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-50"
              >
                <Clock className="h-4 w-4" />
                Review {dueCount} Words
              </button>
            )}
          </div>
        </div>

        {/* Search and filters */}
        <div className="mb-8 rounded-xl bg-slate-800/50 border border-slate-700/50 p-6">
          <div className="space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by word or translation..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                className="w-full rounded-lg bg-slate-700/40 border border-slate-600/50 pl-10 pr-4 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>

            {/* Filter options */}
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="h-4 w-4 text-slate-400" />

              {/* CEFR level filter */}
              <select
                value={cefrFilter || ''}
                onChange={(e) => {
                  setCefrFilter(e.target.value || null)
                  setPage(1)
                }}
                className="rounded-lg bg-slate-700/40 border border-slate-600/50 px-3 py-2 text-slate-100 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              >
                <option value="">All CEFR Levels</option>
                <option value="A1">A1 (Beginner)</option>
                <option value="A2">A2 (Elementary)</option>
                <option value="B1">B1 (Intermediate)</option>
                <option value="B2">B2 (Upper Intermediate)</option>
                <option value="C1">C1 (Advanced)</option>
                <option value="C2">C2 (Mastery)</option>
              </select>

              {/* Due only toggle */}
              <button
                onClick={() => {
                  setShowDueOnly(!showDueOnly)
                  setPage(1)
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  showDueOnly
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-700/40 border-slate-600/50 text-slate-300 hover:border-slate-500'
                }`}
              >
                <Clock className="inline-block h-4 w-4 mr-2" />
                Due Only
              </button>

              {/* Reset filters */}
              {(searchTerm || cefrFilter || showDueOnly) && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setCefrFilter(null)
                    setShowDueOnly(false)
                    setPage(1)
                  }}
                  className="rounded-lg border border-slate-600/50 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-500 transition-colors"
                >
                  <RotateCcw className="inline-block h-4 w-4 mr-2" />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/50 p-6 mb-8">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Vocabulary list */}
        {items.length > 0 ? (
          <>
            <div className="space-y-3 mb-8">
              {items.map((vocab) => (
                <VocabularyCard
                  key={vocab.id}
                  vocab={vocab}
                  isSelected={false}
                  isDueForReview={vocab.isDueForReview}
                  onSelect={() => {}}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg bg-slate-700/40 border border-slate-600/50 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-500 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg bg-slate-700/40 border border-slate-600/50 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-500 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No vocabulary items found</p>
            <button
              onClick={() => {
                setSearchTerm('')
                setCefrFilter(null)
                setShowDueOnly(false)
                setPage(1)
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

// Import CheckCircle icon
import { CheckCircle } from 'lucide-react'
