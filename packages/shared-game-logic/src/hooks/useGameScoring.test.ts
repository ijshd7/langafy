import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useGameScoring } from './useGameScoring';
import type { GameScore } from './useGameScoring';

describe('useGameScoring', () => {
  it('initializes with 0 mistakes and no score', () => {
    const { result } = renderHook(() => useGameScoring());
    expect(result.current.mistakes).toBe(0);
    expect(result.current.score).toBeNull();
  });

  it('recordMistake increments mistake count', () => {
    const { result } = renderHook(() => useGameScoring());
    act(() => {
      result.current.recordMistake();
    });
    expect(result.current.mistakes).toBe(1);
    act(() => {
      result.current.recordMistake();
    });
    expect(result.current.mistakes).toBe(2);
  });

  it('computeScore with no time limit gives 0 timeBonus', () => {
    const { result } = renderHook(() => useGameScoring());
    let score: GameScore;
    act(() => {
      score = result.current.computeScore(100, 5000);
    });
    expect(score!.timeBonus).toBe(0);
    expect(score!.accuracyMultiplier).toBe(1.0);
    expect(score!.basePoints).toBe(100);
    expect(score!.finalScore).toBe(100);
  });

  it('computeScore with time limit calculates time bonus', () => {
    const { result } = renderHook(() => useGameScoring());
    let score: GameScore;
    // elapsed=0, limit=10000 → timeBonus=1.0 → timeBonusPoints=50 → finalScore=150
    act(() => {
      score = result.current.computeScore(100, 0, 10000);
    });
    expect(score!.timeBonus).toBe(1.0);
    expect(score!.finalScore).toBe(150);
  });

  it('computeScore applies accuracy penalty for mistakes', () => {
    const { result } = renderHook(() => useGameScoring());
    // Record 1 mistake → accuracy = 0.8 → finalScore = round(100 * 0.8) = 80
    act(() => {
      result.current.recordMistake();
    });
    let score: GameScore;
    act(() => {
      score = result.current.computeScore(100, 5000);
    });
    expect(score!.accuracyMultiplier).toBe(0.8);
    expect(score!.finalScore).toBe(80);
  });

  it('score is stored in state after computeScore', () => {
    const { result } = renderHook(() => useGameScoring());
    act(() => {
      result.current.computeScore(100, 5000);
    });
    expect(result.current.score).not.toBeNull();
    expect(result.current.score!.basePoints).toBe(100);
  });

  it('reset clears mistakes and score', () => {
    const { result } = renderHook(() => useGameScoring());
    act(() => {
      result.current.recordMistake();
      result.current.computeScore(100, 5000);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.mistakes).toBe(0);
    expect(result.current.score).toBeNull();
  });
});
