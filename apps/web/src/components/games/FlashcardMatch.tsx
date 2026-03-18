'use client';

import type { Exercise, ExerciseResult } from '@langafy/shared-types';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useFlashcardGame, type FlashcardGameResult } from '@/hooks/games/useFlashcardGame';
import { apiClient } from '@/lib/api';

interface FlashcardMatchProps {
  exercise: Exercise;
  onComplete: (result: ExerciseResult) => void;
  basePoints: number;
}

export function FlashcardMatch({ exercise, onComplete, basePoints }: FlashcardMatchProps) {
  // Config comes from API as raw JSONB with snake_case keys
  const rawConfig = exercise.config as Record<string, unknown>;
  // Normalize pair fields: seed data uses 'en', shared type expects 'english'
  const rawPairs = rawConfig.pairs as Array<Record<string, string>> | undefined;
  const pairs = useMemo(
    () =>
      (rawPairs ?? []).map((p) => ({
        target: p.target ?? '',
        english: p.english ?? p.en ?? '',
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawPairs)]
  );
  const timeLimitSeconds = (rawConfig.time_limit_seconds ?? rawConfig.timeLimit) as
    | number
    | undefined;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { gameState, cards, lastMismatchIds, elapsedMs, mistakes, start, flipCard, result } =
    useFlashcardGame(pairs, basePoints, timeLimitSeconds ? timeLimitSeconds * 1000 : undefined);

  // Auto-start game on mount
  useEffect(() => {
    start();
  }, [start]);

  const handleSubmit = useCallback(
    async (gameResult: FlashcardGameResult) => {
      try {
        setIsSubmitting(true);

        const apiResult = await apiClient.post<{
          isCorrect: boolean;
          score: number;
          pointsEarned: number;
          correctAnswer?: string;
          feedback: string;
          explanation?: string;
        }>(`/exercises/${exercise.id}/submit`, {
          type: 'FlashcardMatch',
          matches: gameResult.matches.map((m) => ({
            target: m.target,
            en: m.english,
          })),
          timeSpentMs: gameResult.elapsedMs,
        });

        const exResult: ExerciseResult = {
          correct: apiResult.isCorrect,
          score: apiResult.pointsEarned,
          maxScore: basePoints,
          timeTaken: gameResult.elapsedMs,
          correctAnswer: apiResult.correctAnswer,
          explanation: apiResult.explanation,
        };

        onComplete(exResult);
      } catch (error) {
        console.error('Error submitting game result:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [exercise.id, basePoints, onComplete]
  );

  // Handle game completion
  useEffect(() => {
    if (result && gameState === 'completed') {
      handleSubmit(result);
    }
  }, [result, gameState, handleSubmit]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (gameState === 'idle') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
          <p className="mt-4 text-gray-600">Initializing game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header with timer and score */}
      <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
        <div>
          <div className="text-sm font-medium text-gray-600">Time</div>
          <div className="text-2xl font-bold text-blue-600">{formatTime(elapsedMs)}</div>
        </div>

        <div className="text-center">
          <div className="text-sm font-medium text-gray-600">Matches</div>
          <div className="text-2xl font-bold text-green-600">
            {cards.filter((c) => c.isMatched).length / 2} / {pairs.length}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-600">Mistakes</div>
          <div className="text-2xl font-bold text-red-600">{mistakes}</div>
        </div>
      </div>

      {/* Game grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {cards.map((card) => {
          const isRevealed = card.isFlipped || card.isMatched;
          const isMismatched = lastMismatchIds?.includes(card.id) ?? false;

          return (
            <motion.button
              key={card.id}
              onClick={() => flipCard(card.id)}
              disabled={gameState === 'completed' || card.isMatched}
              className={`relative aspect-square rounded-lg text-sm font-semibold transition-colors ${
                card.isMatched
                  ? 'cursor-default bg-green-100 text-green-700'
                  : 'cursor-pointer border-2 border-blue-300 bg-white hover:border-blue-500 hover:shadow-md'
              } disabled:cursor-not-allowed disabled:opacity-50`}
              style={{ perspective: '1000px' }}
              animate={isMismatched ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
              transition={isMismatched ? { duration: 0.4 } : undefined}
              whileHover={!card.isMatched && gameState !== 'completed' ? { scale: 1.05 } : {}}
              whileTap={!card.isMatched && gameState !== 'completed' ? { scale: 0.95 } : {}}
              aria-label={
                isRevealed
                  ? `${card.text}, ${card.side === 'target' ? 'Target' : 'English'}`
                  : 'Hidden card'
              }>
              <motion.div
                className="relative h-full w-full"
                initial={false}
                animate={{ rotateY: isRevealed ? 180 : 0 }}
                transition={{ duration: 0.4 }}
                style={{ transformStyle: 'preserve-3d' }}>
                {/* Front face — question mark */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-lg"
                  style={{ backfaceVisibility: 'hidden' }}>
                  <div className="text-3xl font-light text-blue-400">?</div>
                </div>

                {/* Back face — card content */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-lg"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                  <div className="text-center">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-500">
                      {card.side === 'target' ? 'ES' : 'EN'}
                    </div>
                    <div className="line-clamp-3 break-words px-2 text-base font-bold text-gray-900">
                      {card.text}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Match glow animation */}
              {card.isMatched && (
                <motion.div
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 1.2, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="pointer-events-none absolute inset-0 rounded-lg border-2 border-green-400"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Completion state */}
      {gameState === 'completed' && result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="rounded-lg border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
          <div className="space-y-4 text-center">
            <div>
              <h3 className="mb-2 text-2xl font-bold text-green-700">🎉 Game Complete!</h3>
              <p className="text-gray-600">You matched all {pairs.length} pairs!</p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm font-medium text-gray-600">Time</div>
                <div className="text-xl font-bold text-blue-600">
                  {formatTime(result.elapsedMs)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Mistakes</div>
                <div className="text-xl font-bold text-red-600">{mistakes}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Points</div>
                <div className="text-xl font-bold text-green-600">
                  {Math.round(result.score.finalScore)}
                </div>
              </div>
            </div>

            {isSubmitting && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600" />
                Submitting result...
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Debug info (optional) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-400">
          State: {gameState} | Cards flipped:{' '}
          {cards.filter((c) => c.isFlipped || c.isMatched).length}/{cards.length}
        </div>
      )}
    </div>
  );
}
