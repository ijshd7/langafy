import { useState, useEffect, useRef, useCallback } from 'react';

export type TimerMode = 'countup' | 'countdown';

export interface GameTimerState {
  elapsedMs: number;
  remainingMs: number | null;
  isRunning: boolean;
  isExpired: boolean;
}

export interface GameTimerActions {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

/**
 * Platform-agnostic game timer hook.
 *
 * Supports both countup (track elapsed time for scoring) and countdown (time limit).
 * Uses setInterval with 100ms resolution — sufficient for displaying seconds.
 *
 * @param mode - 'countup' accumulates elapsed time; 'countdown' counts down from timeLimitMs
 * @param timeLimitMs - Required for 'countdown' mode. Ignored for 'countup'
 * @param onExpire - Called once when countdown reaches zero
 */
export function useGameTimer(
  mode: TimerMode = 'countup',
  timeLimitMs?: number,
  onExpire?: () => void
): GameTimerState & GameTimerActions {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const clearTimer = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = useCallback(() => {
    if (isRunning) return;
    startTimeRef.current = Date.now();
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      const sinceStart = Date.now() - (startTimeRef.current ?? Date.now());
      const total = accumulatedRef.current + sinceStart;
      setElapsedMs(total);

      if (mode === 'countdown' && timeLimitMs !== undefined && total >= timeLimitMs) {
        setElapsedMs(timeLimitMs);
        setIsExpired(true);
        setIsRunning(false);
        clearTimer();
        onExpireRef.current?.();
      }
    }, 100);
  }, [isRunning, mode, timeLimitMs]);

  const pause = useCallback(() => {
    if (!isRunning) return;
    accumulatedRef.current += Date.now() - (startTimeRef.current ?? Date.now());
    setIsRunning(false);
    clearTimer();
  }, [isRunning]);

  const resume = useCallback(() => {
    if (isRunning || isExpired) return;
    startTimeRef.current = Date.now();
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      const sinceStart = Date.now() - (startTimeRef.current ?? Date.now());
      const total = accumulatedRef.current + sinceStart;
      setElapsedMs(total);

      if (mode === 'countdown' && timeLimitMs !== undefined && total >= timeLimitMs) {
        setElapsedMs(timeLimitMs);
        setIsExpired(true);
        setIsRunning(false);
        clearTimer();
        onExpireRef.current?.();
      }
    }, 100);
  }, [isRunning, isExpired, mode, timeLimitMs]);

  const reset = useCallback(() => {
    clearTimer();
    setElapsedMs(0);
    setIsRunning(false);
    setIsExpired(false);
    accumulatedRef.current = 0;
    startTimeRef.current = null;
  }, []);

  useEffect(() => () => clearTimer(), []);

  const remainingMs =
    mode === 'countdown' && timeLimitMs !== undefined ? Math.max(0, timeLimitMs - elapsedMs) : null;

  return { elapsedMs, remainingMs, isRunning, isExpired, start, pause, resume, reset };
}
