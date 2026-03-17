import { useState, useCallback } from 'react';
import {
  calculateTimeBonus,
  calculateAccuracyMultiplier,
  calculateFinalScore,
} from './scoring';

export interface GameScore {
  basePoints: number;
  timeBonus: number;
  accuracyMultiplier: number;
  finalScore: number;
}

export interface GameScoringState {
  mistakes: number;
  score: GameScore | null;
}

export interface GameScoringActions {
  recordMistake: () => void;
  computeScore: (basePoints: number, elapsedMs: number, timeLimitMs?: number) => GameScore;
  reset: () => void;
}

/**
 * Tracks mistakes and computes the final score for a game session.
 * Call `recordMistake()` on each wrong answer, then `computeScore()` at game end.
 */
export function useGameScoring(): GameScoringState & GameScoringActions {
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState<GameScore | null>(null);

  const recordMistake = useCallback(() => {
    setMistakes((m) => m + 1);
  }, []);

  const computeScore = useCallback(
    (basePoints: number, elapsedMs: number, timeLimitMs?: number): GameScore => {
      const timeBonus = timeLimitMs !== undefined ? calculateTimeBonus(elapsedMs, timeLimitMs) : 0;
      const accuracyMultiplier = calculateAccuracyMultiplier(mistakes);
      const finalScore = calculateFinalScore(basePoints, timeBonus, accuracyMultiplier);
      const result: GameScore = { basePoints, timeBonus, accuracyMultiplier, finalScore };
      setScore(result);
      return result;
    },
    [mistakes]
  );

  const reset = useCallback(() => {
    setMistakes(0);
    setScore(null);
  }, []);

  return { mistakes, score, recordMistake, computeScore, reset };
}
