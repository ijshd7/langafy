'use client';

import type { Exercise, ExerciseResult } from '@langafy/shared-types';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

import { useWordScramble } from '@/hooks/games/useWordScramble';

interface WordScrambleProps {
  exercise: Exercise;
  onComplete: (result: ExerciseResult) => void;
  basePoints: number;
}

export function WordScramble({ exercise, onComplete, basePoints }: WordScrambleProps) {
  // Config comes from API as raw JSONB with snake_case keys
  const rawConfig = exercise.config as Record<string, unknown>;
  const targetWord = (rawConfig.target_word ?? rawConfig.targetWord) as string;
  const configHint = (rawConfig.hint as string) || 'No hint available';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    gameState,
    tiles,
    answer,
    hint,
    hintsUsed,
    elapsedMs,
    start,
    placeTile,
    removeTileFromAnswer,
    useHint,
    submit,
    result,
  } = useWordScramble(targetWord, configHint, basePoints, undefined);

  // Auto-start game on mount
  useEffect(() => {
    start();
  }, [start]);

  const handleSubmit = useCallback(
    async (gameResult: typeof result) => {
      if (!gameResult) return;

      try {
        setIsSubmitting(true);

        const exResult: ExerciseResult = {
          correct: gameResult.correct,
          score: gameResult.correct ? Math.round(gameResult.score.finalScore) : 0,
          maxScore: basePoints,
          timeTaken: gameResult.elapsedMs,
        };

        if (exResult.correct) {
          onComplete(exResult);
        } else {
          onComplete({
            ...exResult,
            correctAnswer: targetWord,
            explanation: rawConfig.explanation as string | undefined,
          });
        }
      } catch (error) {
        console.error('Error submitting game result:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [targetWord, rawConfig.explanation, basePoints, onComplete]
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

  const availableTiles = tiles.filter((t) => !t.usedInAnswer);
  const answerWord = answer.join('');

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
      {/* Header with timer and stats */}
      <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
        <div>
          <div className="text-sm font-medium text-gray-600">Time</div>
          <div className="text-2xl font-bold text-blue-600">{formatTime(elapsedMs)}</div>
        </div>

        <div className="text-center">
          <div className="text-sm font-medium text-gray-600">Word</div>
          <div className="text-2xl font-bold text-gray-700">{targetWord.length} letters</div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-600">Hints Used</div>
          <div className="text-2xl font-bold text-amber-600">{hintsUsed}</div>
        </div>
      </div>

      {/* Answer area */}
      <div className="rounded-lg border-2 border-dashed border-blue-300 bg-white p-6">
        <div className="mb-3 text-sm font-medium text-gray-600">Your Answer</div>
        <div className="flex min-h-16 flex-wrap items-center gap-2 rounded bg-blue-50 p-4">
          {answer.length === 0 ? (
            <span className="italic text-gray-400">Click letters below to arrange them</span>
          ) : (
            answer.map((letter, i) => (
              <motion.button
                key={i}
                onClick={() => removeTileFromAnswer(i)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="h-12 w-12 cursor-pointer rounded-lg bg-green-500 text-lg font-bold text-white transition-colors hover:bg-green-600"
                title="Click to remove">
                {letter}
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* Available tiles */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-3 text-sm font-medium text-gray-600">Available Letters</div>
        <div className="flex flex-wrap gap-2">
          {availableTiles.length === 0 ? (
            <span className="text-sm text-gray-500">All letters used</span>
          ) : (
            availableTiles.map((tile) => (
              <motion.button
                key={tile.id}
                onClick={() => placeTile(tile.id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="h-12 w-12 cursor-pointer rounded-lg bg-blue-500 text-lg font-bold text-white transition-colors hover:bg-blue-600"
                title="Click to add to answer">
                {tile.letter}
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* Hint display */}
      {hint && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="mb-1 text-sm font-medium text-amber-900">Hint</div>
          <div className="text-lg text-amber-800">{hint}</div>
        </motion.div>
      )}

      {/* Feedback messages */}
      {gameState === 'incorrect' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-lg border border-red-300 bg-red-50 p-4">
          <div className="text-sm font-medium text-red-800">Not quite right. Try again!</div>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <motion.button
          onClick={useHint}
          disabled={hint !== null || gameState !== 'playing'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="min-w-32 flex-1 rounded-lg bg-amber-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-gray-300">
          {hint ? 'Hint Shown' : 'Show Hint'}
        </motion.button>

        <motion.button
          onClick={submit}
          disabled={answer.length === 0 || gameState !== 'playing'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="min-w-32 flex-1 rounded-lg bg-green-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-gray-300">
          Check Answer
        </motion.button>
      </div>

      {/* Completion state */}
      {gameState === 'completed' && result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className={`rounded-lg border-2 p-6 ${
            result.correct
              ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50'
              : 'border-red-300 bg-gradient-to-r from-red-50 to-orange-50'
          }`}>
          <div className="space-y-4 text-center">
            <div>
              <h3 className="mb-2 text-2xl font-bold">
                {result.correct ? '🎉 Correct!' : '❌ Incorrect'}
              </h3>
              <p className="text-gray-600">
                {result.correct
                  ? `You unscrambled the word "${targetWord}" correctly!`
                  : `The word was "${targetWord}".`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-sm font-medium text-gray-600">Time</div>
                <div className="text-xl font-bold text-blue-600">
                  {formatTime(result.elapsedMs)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Hints</div>
                <div className="text-xl font-bold text-amber-600">{result.hintsUsed}</div>
              </div>
            </div>

            {result.correct && (
              <div className="text-center">
                <div className="text-sm font-medium text-gray-600">Points</div>
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(result.score.finalScore)}
                </div>
              </div>
            )}

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
          State: {gameState} | Answer: {answerWord || '(empty)'} | Target: {targetWord}
        </div>
      )}
    </div>
  );
}
