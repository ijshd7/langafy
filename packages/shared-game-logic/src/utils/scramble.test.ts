import { describe, it, expect } from 'vitest';

import { isWordMatch, scrambleWord, shuffleArray } from './scramble';

describe('shuffleArray', () => {
  it('returns a new array with the same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result).toHaveLength(5);
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate the original array', () => {
    const input = [1, 2, 3];
    shuffleArray(input);
    expect(input).toEqual([1, 2, 3]);
  });

  it('returns a new array reference', () => {
    const input = [1, 2, 3];
    expect(shuffleArray(input)).not.toBe(input);
  });

  it('handles a single-element array', () => {
    expect(shuffleArray([42])).toEqual([42]);
  });

  it('handles an empty array', () => {
    expect(shuffleArray([])).toEqual([]);
  });
});

describe('scrambleWord', () => {
  it('returns the same letters as the original word', () => {
    const result = scrambleWord('hello');
    expect(result).toHaveLength(5);
    expect([...result].sort()).toEqual('hello'.split('').sort());
  });

  it('returns individual single-character strings', () => {
    const result = scrambleWord('abc');
    expect(result.every((c) => c.length === 1)).toBe(true);
  });

  it('returns a single-letter word as-is', () => {
    expect(scrambleWord('a')).toEqual(['a']);
  });

  it('produces a different ordering than the original at least once over many tries', () => {
    // 4-char word: 1/24 chance of same ordering — running 20 times makes failure ~(1/24)^20 ≈ 0
    const word = 'test';
    let foundDifferent = false;
    for (let i = 0; i < 20; i++) {
      if (scrambleWord(word).join('') !== word) {
        foundDifferent = true;
        break;
      }
    }
    expect(foundDifferent).toBe(true);
  });
});

describe('isWordMatch', () => {
  it('matches identical strings', () => {
    expect(isWordMatch('hello', 'hello')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isWordMatch('Hello', 'hello')).toBe(true);
    expect(isWordMatch('HELLO', 'hello')).toBe(true);
  });

  it('trims leading and trailing whitespace', () => {
    expect(isWordMatch('  hello  ', 'hello')).toBe(true);
    expect(isWordMatch('hello', '  hello  ')).toBe(true);
  });

  it('returns false for different words', () => {
    expect(isWordMatch('hello', 'world')).toBe(false);
  });

  it('returns false for empty string vs non-empty', () => {
    expect(isWordMatch('', 'hello')).toBe(false);
  });

  it('returns true for two empty strings', () => {
    expect(isWordMatch('', '')).toBe(true);
  });
});
