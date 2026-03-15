import { describe, it, expect } from 'vitest';

import { calculateAccuracyMultiplier, calculateFinalScore, calculateTimeBonus } from './scoring';

describe('calculateTimeBonus', () => {
  it('returns 1.0 when elapsed is 0', () => {
    expect(calculateTimeBonus(0, 10000)).toBe(1);
  });

  it('returns 0.5 when elapsed is half the limit', () => {
    expect(calculateTimeBonus(5000, 10000)).toBe(0.5);
  });

  it('returns 0 when elapsed equals limit', () => {
    expect(calculateTimeBonus(10000, 10000)).toBe(0);
  });

  it('returns 0 when elapsed exceeds limit', () => {
    expect(calculateTimeBonus(15000, 10000)).toBe(0);
  });

  it('returns 0 for timeLimitMs of 0', () => {
    expect(calculateTimeBonus(1000, 0)).toBe(0);
  });

  it('returns 0 for negative timeLimitMs', () => {
    expect(calculateTimeBonus(1000, -100)).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    // 1 - 3333/10000 = 0.6667 → rounds to 0.67
    expect(calculateTimeBonus(3333, 10000)).toBe(0.67);
  });
});

describe('calculateAccuracyMultiplier', () => {
  it('returns 1.0 for 0 mistakes', () => {
    expect(calculateAccuracyMultiplier(0)).toBe(1.0);
  });

  it('returns 0.8 for 1 mistake', () => {
    expect(calculateAccuracyMultiplier(1)).toBe(0.8);
  });

  it('returns 0.6 for 2 mistakes', () => {
    expect(calculateAccuracyMultiplier(2)).toBe(0.6);
  });

  it('returns 0.5 for 3 mistakes (floor)', () => {
    expect(calculateAccuracyMultiplier(3)).toBe(0.5);
  });

  it('returns 0.5 for many mistakes (floor is 0.5)', () => {
    expect(calculateAccuracyMultiplier(10)).toBe(0.5);
  });
});

describe('calculateFinalScore', () => {
  it('returns base points when timeBonus is 0 and accuracy is 1.0', () => {
    expect(calculateFinalScore(100, 0, 1.0)).toBe(100);
  });

  it('adds time bonus points at full speed with default weight', () => {
    // basePoints=100, timeBonus=1.0, accuracy=1.0, weight=0.5
    // timeBonusPoints = round(100 * 0.5 * 1.0) = 50 → total = round(150 * 1.0) = 150
    expect(calculateFinalScore(100, 1.0, 1.0)).toBe(150);
  });

  it('applies accuracy multiplier', () => {
    // basePoints=100, timeBonus=0, accuracy=0.8 → round(100 * 0.8) = 80
    expect(calculateFinalScore(100, 0, 0.8)).toBe(80);
  });

  it('combines time bonus and accuracy', () => {
    // basePoints=100, timeBonus=0.5, accuracy=0.8
    // timeBonusPoints = round(100 * 0.5 * 0.5) = 25 → total = round(125 * 0.8) = 100
    expect(calculateFinalScore(100, 0.5, 0.8)).toBe(100);
  });

  it('never returns a negative score', () => {
    expect(calculateFinalScore(0, 0, 1.0)).toBe(0);
  });

  it('respects a custom timeBonusWeight', () => {
    // basePoints=100, timeBonus=1.0, accuracy=1.0, weight=1.0
    // timeBonusPoints = round(100 * 1.0 * 1.0) = 100 → total = round(200 * 1.0) = 200
    expect(calculateFinalScore(100, 1.0, 1.0, 1.0)).toBe(200);
  });
});
