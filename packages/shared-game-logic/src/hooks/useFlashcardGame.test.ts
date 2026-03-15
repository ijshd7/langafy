import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFlashcardGame } from './useFlashcardGame';
import type { FlashcardPair } from './useFlashcardGame';

const PAIRS: FlashcardPair[] = [
  { target: 'Hola', english: 'Hello' },
  { target: 'Adiós', english: 'Goodbye' },
];

describe('useFlashcardGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in idle state with no cards', () => {
    const { result } = renderHook(() => useFlashcardGame(PAIRS, 100));
    expect(result.current.gameState).toBe('idle');
    expect(result.current.cards).toHaveLength(0);
    expect(result.current.selectedCardId).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.mistakes).toBe(0);
  });

  it('start() creates 2 cards per pair and enters playing state', () => {
    const { result } = renderHook(() => useFlashcardGame(PAIRS, 100));
    act(() => {
      result.current.start();
    });
    expect(result.current.gameState).toBe('playing');
    // 2 pairs × 2 cards = 4 cards
    expect(result.current.cards).toHaveLength(4);
    expect(result.current.cards.every((c) => !c.isFlipped && !c.isMatched)).toBe(true);
  });

  it('flipCard() flips the first card and sets selectedCardId', () => {
    const { result } = renderHook(() => useFlashcardGame(PAIRS, 100));
    act(() => {
      result.current.start();
    });
    const cardId = result.current.cards[0].id;
    act(() => {
      result.current.flipCard(cardId);
    });
    expect(result.current.cards.find((c) => c.id === cardId)!.isFlipped).toBe(true);
    expect(result.current.selectedCardId).toBe(cardId);
  });

  it('matching pair marks both cards as matched and clears selectedCardId', () => {
    const { result } = renderHook(() => useFlashcardGame(PAIRS, 100));
    act(() => {
      result.current.start();
    });
    // Find the target and english cards for pair 0 — pairIndex is stable after shuffle
    const targetCard = result.current.cards.find(
      (c) => c.side === 'target' && c.pairIndex === 0
    )!;
    const englishCard = result.current.cards.find(
      (c) => c.side === 'english' && c.pairIndex === 0
    )!;
    act(() => {
      result.current.flipCard(targetCard.id);
    });
    act(() => {
      result.current.flipCard(englishCard.id);
    });
    expect(result.current.cards.find((c) => c.id === targetCard.id)!.isMatched).toBe(true);
    expect(result.current.cards.find((c) => c.id === englishCard.id)!.isMatched).toBe(true);
    expect(result.current.selectedCardId).toBeNull();
    expect(result.current.mistakes).toBe(0);
  });

  it('mismatching pair records a mistake and flips cards back after 800ms', () => {
    const { result } = renderHook(() => useFlashcardGame(PAIRS, 100));
    act(() => {
      result.current.start();
    });
    // Two cards with the same side = mismatch
    const target0 = result.current.cards.find((c) => c.side === 'target' && c.pairIndex === 0)!;
    const target1 = result.current.cards.find((c) => c.side === 'target' && c.pairIndex === 1)!;
    act(() => {
      result.current.flipCard(target0.id);
    });
    act(() => {
      result.current.flipCard(target1.id);
    });
    expect(result.current.mistakes).toBe(1);
    expect(result.current.lastMismatchIds).toEqual([target0.id, target1.id]);
    // After 800ms, cards flip back
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(result.current.cards.find((c) => c.id === target0.id)!.isFlipped).toBe(false);
    expect(result.current.cards.find((c) => c.id === target1.id)!.isFlipped).toBe(false);
    expect(result.current.lastMismatchIds).toBeNull();
  });

  it('completing all pairs transitions game to completed with result', () => {
    const { result } = renderHook(() => useFlashcardGame(PAIRS, 100));
    act(() => {
      result.current.start();
    });
    // Match each pair in order
    for (let i = 0; i < PAIRS.length; i++) {
      const targetCard = result.current.cards.find(
        (c) => c.side === 'target' && c.pairIndex === i
      )!;
      const englishCard = result.current.cards.find(
        (c) => c.side === 'english' && c.pairIndex === i
      )!;
      act(() => {
        result.current.flipCard(targetCard.id);
      });
      act(() => {
        result.current.flipCard(englishCard.id);
      });
    }
    expect(result.current.gameState).toBe('completed');
    expect(result.current.result).not.toBeNull();
    expect(result.current.result!.matches).toHaveLength(PAIRS.length);
  });

  it('result includes score with correct basePoints', () => {
    const { result } = renderHook(() => useFlashcardGame(PAIRS, 50));
    act(() => {
      result.current.start();
    });
    for (let i = 0; i < PAIRS.length; i++) {
      const targetCard = result.current.cards.find(
        (c) => c.side === 'target' && c.pairIndex === i
      )!;
      const englishCard = result.current.cards.find(
        (c) => c.side === 'english' && c.pairIndex === i
      )!;
      act(() => {
        result.current.flipCard(targetCard.id);
      });
      act(() => {
        result.current.flipCard(englishCard.id);
      });
    }
    expect(result.current.result!.score.basePoints).toBe(50);
  });

  it('flipCard() is a no-op when game is not playing', () => {
    const { result } = renderHook(() => useFlashcardGame(PAIRS, 100));
    // idle state
    act(() => {
      result.current.flipCard('0-target');
    });
    expect(result.current.selectedCardId).toBeNull();
  });

  it('flipCard() is ignored after the game completes', () => {
    const { result } = renderHook(() => useFlashcardGame(PAIRS, 100));
    act(() => {
      result.current.start();
    });
    // Complete the game
    for (let i = 0; i < PAIRS.length; i++) {
      const targetCard = result.current.cards.find(
        (c) => c.side === 'target' && c.pairIndex === i
      )!;
      const englishCard = result.current.cards.find(
        (c) => c.side === 'english' && c.pairIndex === i
      )!;
      act(() => {
        result.current.flipCard(targetCard.id);
      });
      act(() => {
        result.current.flipCard(englishCard.id);
      });
    }
    expect(result.current.gameState).toBe('completed');
    // Any further flipCard calls are no-ops (gameState !== 'playing')
    act(() => {
      result.current.flipCard('0-target');
    });
    expect(result.current.selectedCardId).toBeNull();
  });

  it('start() resets state for a new game', () => {
    const { result } = renderHook(() => useFlashcardGame(PAIRS, 100));
    act(() => {
      result.current.start();
    });
    // Trigger a mismatch to accumulate state
    const target0 = result.current.cards.find((c) => c.side === 'target' && c.pairIndex === 0)!;
    const target1 = result.current.cards.find((c) => c.side === 'target' && c.pairIndex === 1)!;
    act(() => {
      result.current.flipCard(target0.id);
    });
    act(() => {
      result.current.flipCard(target1.id);
    });
    // Restart
    act(() => {
      result.current.start();
    });
    expect(result.current.mistakes).toBe(0);
    expect(result.current.selectedCardId).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.gameState).toBe('playing');
  });
});
