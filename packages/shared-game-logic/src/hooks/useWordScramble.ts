import { useState, useCallback } from 'react';
import { scrambleWord, isWordMatch } from '../utils/scramble';
import { useGameTimer } from './useGameTimer';
import { useGameScoring } from './useGameScoring';
import type { GameScore } from './useGameScoring';

export type WordScrambleGameState = 'idle' | 'playing' | 'correct' | 'incorrect' | 'completed';

export interface ScrambleTile {
  id: string;
  letter: string;
  usedInAnswer: boolean;
}

export interface WordScrambleResult {
  correct: boolean;
  target: string;
  score: GameScore;
  elapsedMs: number;
  hintsUsed: number;
}

export interface WordScrambleHook {
  gameState: WordScrambleGameState;
  tiles: ScrambleTile[];
  answer: string[];
  hint: string | null;
  hintsUsed: number;
  elapsedMs: number;
  remainingMs: number | null;
  start: () => void;
  placeTile: (tileId: string) => void;
  removeTileFromAnswer: (index: number) => void;
  useHint: () => void;
  submit: () => void;
  result: WordScrambleResult | null;
}

/**
 * Word scramble game state hook.
 *
 * The player assembles a word by clicking/dragging scrambled letter tiles into an answer area.
 * Tiles can be removed from the answer back to the pool. A hint reveals the English translation.
 *
 * @param targetWord - The correct word to unscramble
 * @param hintText - English translation shown when the hint button is pressed
 * @param basePoints - Points value from the exercise config
 * @param timeLimitMs - Optional countdown limit
 */
export function useWordScramble(
  targetWord: string,
  hintText: string,
  basePoints: number,
  timeLimitMs?: number
): WordScrambleHook {
  const [gameState, setGameState] = useState<WordScrambleGameState>('idle');
  const [tiles, setTiles] = useState<ScrambleTile[]>([]);
  const [answer, setAnswer] = useState<string[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [result, setResult] = useState<WordScrambleResult | null>(null);

  const {
    elapsedMs,
    remainingMs,
    start: startTimer,
    reset: resetTimer,
  } = useGameTimer(timeLimitMs !== undefined ? 'countdown' : 'countup', timeLimitMs);
  const scoring = useGameScoring();

  const buildTiles = (word: string): ScrambleTile[] =>
    scrambleWord(word).map((letter, i) => ({
      id: `tile-${i}-${letter}`,
      letter,
      usedInAnswer: false,
    }));

  const start = useCallback(() => {
    setTiles(buildTiles(targetWord));
    setAnswer([]);
    setHint(null);
    setHintsUsed(0);
    setResult(null);
    scoring.reset();
    resetTimer();
    setGameState('playing');
    startTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetWord]);

  const placeTile = useCallback(
    (tileId: string) => {
      if (gameState !== 'playing') return;
      setTiles((prev) => {
        const tile = prev.find((t) => t.id === tileId);
        if (!tile || tile.usedInAnswer) return prev;
        setAnswer((a) => [...a, tile.letter]);
        return prev.map((t) => (t.id === tileId ? { ...t, usedInAnswer: true } : t));
      });
    },
    [gameState]
  );

  const removeTileFromAnswer = useCallback(
    (index: number) => {
      if (gameState !== 'playing') return;
      setAnswer((prev) => {
        const removedLetter = prev[index];
        const updated = prev.filter((_, i) => i !== index);
        // Find the first matching tile not yet used and free it
        setTiles((tiles) => {
          let freed = false;
          return tiles.map((t) => {
            if (!freed && t.usedInAnswer && t.letter === removedLetter) {
              freed = true;
              return { ...t, usedInAnswer: false };
            }
            return t;
          });
        });
        return updated;
      });
    },
    [gameState]
  );

  const useHint = useCallback(() => {
    if (gameState !== 'playing' || hint !== null) return;
    setHint(hintText);
    setHintsUsed((h) => h + 1);
    // Using a hint counts as a mistake for scoring purposes
    scoring.recordMistake();
  }, [gameState, hint, hintText, scoring]);

  const submit = useCallback(() => {
    if (gameState !== 'playing') return;
    const userAnswer = answer.join('');
    const correct = isWordMatch(userAnswer, targetWord);

    if (!correct) {
      scoring.recordMistake();
      setGameState('incorrect');
      setTimeout(() => setGameState('playing'), 1000);
      return;
    }

    const finalScore = scoring.computeScore(basePoints, elapsedMs, timeLimitMs);
    setResult({ correct: true, target: targetWord, score: finalScore, elapsedMs, hintsUsed });
    setGameState('completed');
  }, [gameState, answer, targetWord, scoring, basePoints, elapsedMs, timeLimitMs, hintsUsed]);

  return {
    gameState,
    tiles,
    answer,
    hint,
    hintsUsed,
    elapsedMs,
    remainingMs,
    start,
    placeTile,
    removeTileFromAnswer,
    useHint,
    submit,
    result,
  };
}
