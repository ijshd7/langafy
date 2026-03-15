import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGameTimer } from './useGameTimer';

describe('useGameTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes in stopped state', () => {
    const { result } = renderHook(() => useGameTimer());
    expect(result.current.isRunning).toBe(false);
    expect(result.current.elapsedMs).toBe(0);
    expect(result.current.isExpired).toBe(false);
  });

  it('countup mode returns null for remainingMs', () => {
    const { result } = renderHook(() => useGameTimer('countup'));
    expect(result.current.remainingMs).toBeNull();
  });

  it('countdown mode populates remainingMs with timeLimitMs before start', () => {
    const { result } = renderHook(() => useGameTimer('countdown', 5000));
    expect(result.current.remainingMs).toBe(5000);
  });

  it('start() sets isRunning to true', () => {
    const { result } = renderHook(() => useGameTimer('countup'));
    act(() => {
      result.current.start();
    });
    expect(result.current.isRunning).toBe(true);
  });

  it('elapsed time increases after start', () => {
    const { result } = renderHook(() => useGameTimer('countup'));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.elapsedMs).toBeGreaterThanOrEqual(400);
  });

  it('pause() stops the timer', () => {
    const { result } = renderHook(() => useGameTimer('countup'));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const elapsed = result.current.elapsedMs;
    act(() => {
      result.current.pause();
    });
    expect(result.current.isRunning).toBe(false);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    // elapsed should not increase after pause
    expect(result.current.elapsedMs).toBe(elapsed);
  });

  it('resume() continues accumulating from pause point', () => {
    const { result } = renderHook(() => useGameTimer('countup'));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    act(() => {
      result.current.pause();
    });
    const pausedAt = result.current.elapsedMs;
    act(() => {
      result.current.resume();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.elapsedMs).toBeGreaterThan(pausedAt);
  });

  it('reset() clears all state', () => {
    const { result } = renderHook(() => useGameTimer('countup'));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.elapsedMs).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isExpired).toBe(false);
  });

  it('countdown fires onExpire callback when time runs out', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useGameTimer('countdown', 1000, onExpire));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(result.current.isExpired).toBe(true);
    expect(result.current.isRunning).toBe(false);
  });

  it('countdown sets remainingMs to 0 after expiry', () => {
    const { result } = renderHook(() => useGameTimer('countdown', 1000));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(result.current.remainingMs).toBe(0);
  });

  it('calling start() while already running is a no-op', () => {
    const { result } = renderHook(() => useGameTimer('countup'));
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    const elapsed = result.current.elapsedMs;
    // Second start should not reset elapsed
    act(() => {
      result.current.start();
    });
    expect(result.current.elapsedMs).toBeGreaterThanOrEqual(elapsed);
  });
});
