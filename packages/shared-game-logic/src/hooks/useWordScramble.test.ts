import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWordScramble } from './useWordScramble';

describe('useWordScramble', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in idle state with no tiles', () => {
    const { result } = renderHook(() => useWordScramble('hola', 'hello', 100));
    expect(result.current.gameState).toBe('idle');
    expect(result.current.tiles).toHaveLength(0);
    expect(result.current.answer).toHaveLength(0);
    expect(result.current.hint).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it('start() initializes tiles and enters playing state', () => {
    const { result } = renderHook(() => useWordScramble('hola', 'hello', 100));
    act(() => {
      result.current.start();
    });
    expect(result.current.gameState).toBe('playing');
    // 'hola' has 4 letters
    expect(result.current.tiles).toHaveLength(4);
    expect(result.current.tiles.every((t) => !t.usedInAnswer)).toBe(true);
    expect(result.current.answer).toHaveLength(0);
  });

  it('placeTile() moves a tile into the answer', () => {
    const { result } = renderHook(() => useWordScramble('hola', 'hello', 100));
    act(() => {
      result.current.start();
    });
    const tileId = result.current.tiles[0].id;
    act(() => {
      result.current.placeTile(tileId);
    });
    expect(result.current.answer).toHaveLength(1);
    expect(result.current.tiles.find((t) => t.id === tileId)!.usedInAnswer).toBe(true);
  });

  it('placeTile() is a no-op when game is not playing', () => {
    const { result } = renderHook(() => useWordScramble('hola', 'hello', 100));
    // still idle — placing should do nothing
    act(() => {
      result.current.placeTile('tile-0-h');
    });
    expect(result.current.answer).toHaveLength(0);
  });

  it('removeTileFromAnswer() returns tile to pool', () => {
    const { result } = renderHook(() => useWordScramble('hola', 'hello', 100));
    act(() => {
      result.current.start();
    });
    const tileId = result.current.tiles[0].id;
    act(() => {
      result.current.placeTile(tileId);
    });
    act(() => {
      result.current.removeTileFromAnswer(0);
    });
    expect(result.current.answer).toHaveLength(0);
    expect(result.current.tiles.find((t) => t.id === tileId)!.usedInAnswer).toBe(false);
  });

  it('useHint() reveals hint text and increments hintsUsed', () => {
    const { result } = renderHook(() => useWordScramble('hola', 'hello', 100));
    act(() => {
      result.current.start();
    });
    expect(result.current.hint).toBeNull();
    act(() => {
      result.current.useHint();
    });
    expect(result.current.hint).toBe('hello');
    expect(result.current.hintsUsed).toBe(1);
  });

  it('useHint() can only be used once', () => {
    const { result } = renderHook(() => useWordScramble('hola', 'hello', 100));
    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.useHint();
    });
    // Second call must be in a separate act() so the hint state flushes first
    act(() => {
      result.current.useHint();
    });
    expect(result.current.hintsUsed).toBe(1);
  });

  it('submit() with incorrect answer transitions to incorrect then back to playing', () => {
    const { result } = renderHook(() => useWordScramble('hola', 'hello', 100));
    act(() => {
      result.current.start();
    });
    // Submit with empty answer → wrong
    act(() => {
      result.current.submit();
    });
    expect(result.current.gameState).toBe('incorrect');
    // After 1000ms timeout, reverts to playing
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.gameState).toBe('playing');
  });

  it('submit() with correct answer completes the game', () => {
    // Use a 2-letter word so tile finding is straightforward
    const { result } = renderHook(() => useWordScramble('hi', 'hello', 100));
    act(() => {
      result.current.start();
    });
    // Place 'h' then 'i'
    act(() => {
      const hTile = result.current.tiles.find((t) => t.letter === 'h')!;
      result.current.placeTile(hTile.id);
    });
    act(() => {
      const iTile = result.current.tiles.find((t) => t.letter === 'i' && !t.usedInAnswer)!;
      result.current.placeTile(iTile.id);
    });
    act(() => {
      result.current.submit();
    });
    expect(result.current.gameState).toBe('completed');
    expect(result.current.result).not.toBeNull();
    expect(result.current.result!.correct).toBe(true);
    expect(result.current.result!.target).toBe('hi');
  });

  it('result includes a score with correct basePoints', () => {
    const { result } = renderHook(() => useWordScramble('hi', 'hello', 50));
    act(() => {
      result.current.start();
    });
    act(() => {
      const hTile = result.current.tiles.find((t) => t.letter === 'h')!;
      result.current.placeTile(hTile.id);
    });
    act(() => {
      const iTile = result.current.tiles.find((t) => t.letter === 'i' && !t.usedInAnswer)!;
      result.current.placeTile(iTile.id);
    });
    act(() => {
      result.current.submit();
    });
    expect(result.current.result!.score.basePoints).toBe(50);
  });

  it('start() resets state for a new game', () => {
    const { result } = renderHook(() => useWordScramble('hola', 'hello', 100));
    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.useHint();
    });
    // Restart
    act(() => {
      result.current.start();
    });
    expect(result.current.hint).toBeNull();
    expect(result.current.hintsUsed).toBe(0);
    expect(result.current.answer).toHaveLength(0);
    expect(result.current.gameState).toBe('playing');
  });
});
