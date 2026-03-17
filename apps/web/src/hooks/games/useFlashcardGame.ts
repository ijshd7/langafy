import { useState, useCallback, useEffect } from 'react';
import { shuffleArray } from './scramble';
import { useGameTimer } from './useGameTimer';
import { useGameScoring } from './useGameScoring';
import type { GameScore } from './useGameScoring';

export interface FlashcardPair {
  target: string;
  english: string;
}

export type CardSide = 'target' | 'english';

export interface FlashcardGameCard {
  id: string;
  text: string;
  side: CardSide;
  pairIndex: number;
  isFlipped: boolean;
  isMatched: boolean;
}

export type FlashcardGameState = 'idle' | 'playing' | 'completed';

export interface FlashcardGameResult {
  matches: FlashcardPair[];
  score: GameScore;
  elapsedMs: number;
}

export interface FlashcardGameHook {
  gameState: FlashcardGameState;
  cards: FlashcardGameCard[];
  selectedCardId: string | null;
  lastMismatchIds: [string, string] | null;
  elapsedMs: number;
  remainingMs: number | null;
  mistakes: number;
  start: () => void;
  flipCard: (cardId: string) => void;
  result: FlashcardGameResult | null;
}

/**
 * Flashcard matching game state machine.
 *
 * Each pair from the config is split into two cards (target and english).
 * The player flips two cards at a time; if both sides of the same pair are selected,
 * it's a match. Otherwise it's a mismatch (mistake recorded) and cards flip back.
 *
 * @param pairs - Word pairs from the exercise config
 * @param basePoints - Points value from the exercise
 * @param timeLimitMs - Optional countdown limit; if omitted, timer counts up
 */
export function useFlashcardGame(
  pairs: FlashcardPair[],
  basePoints: number,
  timeLimitMs?: number
): FlashcardGameHook {
  const [gameState, setGameState] = useState<FlashcardGameState>('idle');
  const [cards, setCards] = useState<FlashcardGameCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [lastMismatchIds, setLastMismatchIds] = useState<[string, string] | null>(null);
  const [result, setResult] = useState<FlashcardGameResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    elapsedMs,
    remainingMs,
    start: startTimer,
    reset: resetTimer,
  } = useGameTimer(timeLimitMs !== undefined ? 'countdown' : 'countup', timeLimitMs, () =>
    handleTimeout()
  );
  const scoring = useGameScoring();

  function buildCards(p: FlashcardPair[]): FlashcardGameCard[] {
    const all: FlashcardGameCard[] = [];
    p.forEach((pair, index) => {
      all.push({
        id: `${index}-target`,
        text: pair.target,
        side: 'target',
        pairIndex: index,
        isFlipped: false,
        isMatched: false,
      });
      all.push({
        id: `${index}-english`,
        text: pair.english,
        side: 'english',
        pairIndex: index,
        isFlipped: false,
        isMatched: false,
      });
    });
    return shuffleArray(all);
  }

  const start = useCallback(() => {
    setCards(buildCards(pairs));
    setSelectedCardId(null);
    setLastMismatchIds(null);
    setResult(null);
    scoring.reset();
    resetTimer();
    setGameState('playing');
    startTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs]);

  function handleTimeout() {
    setGameState('completed');
    const finalScore = scoring.computeScore(basePoints, elapsedMs, timeLimitMs);
    setResult({
      matches: pairs.filter((_, i) => cards.find((c) => c.pairIndex === i && c.isMatched)),
      score: finalScore,
      elapsedMs,
    });
  }

  const flipCard = useCallback(
    (cardId: string) => {
      if (gameState !== 'playing' || isProcessing) return;

      setCards((prev) => {
        const card = prev.find((c) => c.id === cardId);
        if (!card || card.isFlipped || card.isMatched) return prev;
        return prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c));
      });

      setSelectedCardId((prevSelected) => {
        if (prevSelected === null) {
          return cardId;
        }

        // Second card selected — evaluate
        setIsProcessing(true);
        setCards((prev) => {
          const first = prev.find((c) => c.id === prevSelected);
          const second = prev.find((c) => c.id === cardId);

          if (
            !first ||
            !second ||
            first.pairIndex !== second.pairIndex ||
            first.side === second.side
          ) {
            // Mismatch
            scoring.recordMistake();
            setLastMismatchIds([prevSelected, cardId]);
            setTimeout(() => {
              setCards((cards) =>
                cards.map((c) =>
                  c.id === prevSelected || c.id === cardId ? { ...c, isFlipped: false } : c
                )
              );
              setLastMismatchIds(null);
              setIsProcessing(false);
            }, 800);
            return prev;
          }

          // Match
          setLastMismatchIds(null);
          const updated = prev.map((c) =>
            c.id === prevSelected || c.id === cardId ? { ...c, isMatched: true } : c
          );
          const allMatched = updated.every((c) => c.isMatched);
          if (allMatched) {
            setGameState('completed');
            const finalScore = scoring.computeScore(basePoints, elapsedMs, timeLimitMs);
            setResult({ matches: pairs, score: finalScore, elapsedMs });
          }
          setIsProcessing(false);
          return updated;
        });

        return null;
      });
    },
    [gameState, isProcessing, scoring, basePoints, elapsedMs, timeLimitMs, pairs]
  );

  // Keep elapsedMs in sync for the timeout handler
  useEffect(() => {}, [elapsedMs]);

  return {
    gameState,
    cards,
    selectedCardId,
    lastMismatchIds,
    elapsedMs,
    remainingMs,
    mistakes: scoring.mistakes,
    start,
    flipCard,
    result,
  };
}
