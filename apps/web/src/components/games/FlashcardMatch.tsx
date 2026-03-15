'use client';

import { useFlashcardGame, type FlashcardGameResult } from '@langafy/shared-game-logic';
import type {
  Exercise,
  ExerciseResult,
  FlashcardMatchConfig,
} from '@langafy/shared-types';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

interface FlashcardMatchProps {
  exercise: Exercise;
  onComplete: (result: ExerciseResult) => void;
  basePoints: number;
}

export function FlashcardMatch({
  exercise,
  onComplete,
  basePoints,
}: FlashcardMatchProps) {
  const config = exercise.config as FlashcardMatchConfig;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    gameState,
    cards,
    selectedCardId,
    lastMismatchIds,
    elapsedMs,
    mistakes,
    start,
    flipCard,
    result,
  } = useFlashcardGame(
    config.pairs,
    basePoints,
    config.timeLimit ? config.timeLimit * 1000 : undefined,
  );

  // Auto-start game on mount
  useEffect(() => {
    start();
  }, [start]);

  const handleSubmit = useCallback(async (gameResult: FlashcardGameResult) => {
    try {
      setIsSubmitting(true);

      // In a real app, this would POST to the API
      // For now, we'll simulate and call onComplete with a result
      const exResult: ExerciseResult = {
        correct: gameResult.matches.length === config.pairs.length,
        score: Math.round(gameResult.score.finalScore),
        maxScore: basePoints,
        timeTaken: gameResult.elapsedMs,
      };

      if (exResult.correct) {
        onComplete(exResult);
      } else {
        onComplete({
          ...exResult,
          correctAnswer: `Match all ${config.pairs.length} pairs`,
        });
      }
    } catch (error) {
      console.error('Error submitting game result:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [config.pairs.length, basePoints, onComplete]);

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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <p className="mt-4 text-gray-600">Initializing game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header with timer and score */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
        <div>
          <div className="text-sm font-medium text-gray-600">Time</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatTime(elapsedMs)}
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm font-medium text-gray-600">Matches</div>
          <div className="text-2xl font-bold text-green-600">
            {cards.filter((c) => c.isMatched).length / 2} / {config.pairs.length}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-600">Mistakes</div>
          <div className="text-2xl font-bold text-red-600">{mistakes}</div>
        </div>
      </div>

      {/* Game grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <motion.button
            key={card.id}
            onClick={() => flipCard(card.id)}
            disabled={
              gameState === 'completed' ||
              card.isMatched ||
              selectedCardId !== null
            }
            className={`aspect-square rounded-lg font-semibold text-sm transition-colors ${
              card.isMatched
                ? 'bg-green-100 text-green-700 cursor-default'
                : 'bg-white border-2 border-blue-300 hover:border-blue-500 hover:shadow-md cursor-pointer'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            whileHover={!card.isMatched && gameState !== 'completed' ? { scale: 1.05 } : {}}
            whileTap={!card.isMatched && gameState !== 'completed' ? { scale: 0.95 } : {}}
            aria-label={
              card.isFlipped || card.isMatched
                ? `${card.text}, ${card.side === 'target' ? 'Target' : 'English'}`
                : 'Hidden card'
            }
          >
            <motion.div
              initial={{ rotateY: 0 }}
              animate={{ rotateY: card.isFlipped ? 180 : 0 }}
              transition={{ duration: 0.4 }}
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                style={{
                  backfaceVisibility: 'hidden',
                }}
                className={`flex items-center justify-center h-full ${
                  card.isMatched ? 'block' : 'hidden'
                }`}
              >
                <div className="text-center">
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    {card.side === 'target' ? 'ES' : 'EN'}
                  </div>
                  <div className="break-words px-1">{card.text}</div>
                </div>
              </div>

              {!card.isMatched && (
                <div
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        {card.side === 'target' ? 'ES' : 'EN'}
                      </div>
                      <div className="break-words px-1 line-clamp-3">
                        {card.text}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fallback for non-matched cards shown face-up */}
              {!card.isMatched && card.isFlipped && (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      {card.side === 'target' ? 'ES' : 'EN'}
                    </div>
                    <div className="break-words px-1 line-clamp-3">{card.text}</div>
                  </div>
                </div>
              )}

              {!card.isMatched && !card.isFlipped && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-3xl font-light text-blue-400">?</div>
                </div>
              )}
            </motion.div>

            {/* Mismatch shake animation */}
            {lastMismatchIds && lastMismatchIds.includes(card.id) && (
              <motion.div
                initial={{ x: 0 }}
                animate={{ x: [-10, 10, -10, 10, 0] }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 pointer-events-none"
              />
            )}

            {/* Match glow animation */}
            {card.isMatched && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 rounded-lg border-2 border-green-400 pointer-events-none"
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Completion state */}
      {gameState === 'completed' && result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border-2 border-green-300"
        >
          <div className="text-center space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-green-700 mb-2">
                🎉 Game Complete!
              </h3>
              <p className="text-gray-600">
                You matched all {config.pairs.length} pairs!
              </p>
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
                <div className="text-xl font-bold text-red-600">
                  {mistakes}
                </div>
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
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                Submitting result...
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Debug info (optional) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 p-2 bg-gray-50 rounded border border-gray-200">
          State: {gameState} | Cards flipped: {cards.filter((c) => c.isFlipped || c.isMatched).length}/
          {cards.length}
        </div>
      )}
    </div>
  );
}
