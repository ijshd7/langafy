'use client';

import { useWordScramble } from '@langafy/shared-game-logic';
import type {
  Exercise,
  ExerciseResult,
  WordScrambleConfig,
} from '@langafy/shared-types';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

interface WordScrambleProps {
  exercise: Exercise;
  onComplete: (result: ExerciseResult) => void;
  basePoints: number;
}

export function WordScramble({
  exercise,
  onComplete,
  basePoints,
}: WordScrambleProps) {
  const config = exercise.config as WordScrambleConfig;
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
  } = useWordScramble(
    config.targetWord,
    config.hint || 'No hint available',
    basePoints,
    undefined,
  );

  // Auto-start game on mount
  useEffect(() => {
    start();
  }, [start]);

  const handleSubmit = useCallback(async (gameResult: typeof result) => {
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
          correctAnswer: config.targetWord,
          explanation: config.explanation,
        });
      }
    } catch (error) {
      console.error('Error submitting game result:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [config.targetWord, config.explanation, basePoints, onComplete]);

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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <p className="mt-4 text-gray-600">Initializing game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header with timer and stats */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
        <div>
          <div className="text-sm font-medium text-gray-600">Time</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatTime(elapsedMs)}
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm font-medium text-gray-600">Word</div>
          <div className="text-2xl font-bold text-gray-700">
            {config.targetWord.length} letters
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-600">Hints Used</div>
          <div className="text-2xl font-bold text-amber-600">{hintsUsed}</div>
        </div>
      </div>

      {/* Answer area */}
      <div className="bg-white p-6 rounded-lg border-2 border-dashed border-blue-300">
        <div className="text-sm font-medium text-gray-600 mb-3">Your Answer</div>
        <div className="flex gap-2 flex-wrap min-h-16 items-center bg-blue-50 p-4 rounded">
          {answer.length === 0 ? (
            <span className="text-gray-400 italic">
              Click letters below to arrange them
            </span>
          ) : (
            answer.map((letter, i) => (
              <motion.button
                key={i}
                onClick={() => removeTileFromAnswer(i)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-12 h-12 bg-green-500 text-white font-bold rounded-lg text-lg hover:bg-green-600 transition-colors cursor-pointer"
                title="Click to remove"
              >
                {letter}
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* Available tiles */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="text-sm font-medium text-gray-600 mb-3">
          Available Letters
        </div>
        <div className="flex gap-2 flex-wrap">
          {availableTiles.length === 0 ? (
            <span className="text-gray-500 text-sm">All letters used</span>
          ) : (
            availableTiles.map((tile) => (
              <motion.button
                key={tile.id}
                onClick={() => placeTile(tile.id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-12 h-12 bg-blue-500 text-white font-bold rounded-lg text-lg hover:bg-blue-600 transition-colors cursor-pointer"
                title="Click to add to answer"
              >
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
          className="bg-amber-50 border border-amber-300 rounded-lg p-4"
        >
          <div className="text-sm font-medium text-amber-900 mb-1">Hint</div>
          <div className="text-lg text-amber-800">{hint}</div>
        </motion.div>
      )}

      {/* Feedback messages */}
      {gameState === 'incorrect' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-50 border border-red-300 rounded-lg p-4"
        >
          <div className="text-sm font-medium text-red-800">
            Not quite right. Try again!
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <motion.button
          onClick={useHint}
          disabled={hint !== null || gameState !== 'playing'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 min-w-32 px-4 py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {hint ? 'Hint Shown' : 'Show Hint'}
        </motion.button>

        <motion.button
          onClick={submit}
          disabled={answer.length === 0 || gameState !== 'playing'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 min-w-32 px-4 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Check Answer
        </motion.button>
      </div>

      {/* Completion state */}
      {gameState === 'completed' && result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className={`p-6 rounded-lg border-2 ${
            result.correct
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
              : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300'
          }`}
        >
          <div className="text-center space-y-4">
            <div>
              <h3 className="text-2xl font-bold mb-2">
                {result.correct ? '🎉 Correct!' : '❌ Incorrect'}
              </h3>
              <p className="text-gray-600">
                {result.correct
                  ? `You unscrambled the word "${config.targetWord}" correctly!`
                  : `The word was "${config.targetWord}".`}
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
                <div className="text-xl font-bold text-amber-600">
                  {result.hintsUsed}
                </div>
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
          State: {gameState} | Answer: {answerWord || '(empty)'} | Target:{' '}
          {config.targetWord}
        </div>
      )}
    </div>
  );
}
