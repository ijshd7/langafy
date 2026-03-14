// Hooks
export { useGameTimer } from './hooks/useGameTimer'
export type { TimerMode, GameTimerState, GameTimerActions } from './hooks/useGameTimer'

export { useGameScoring } from './hooks/useGameScoring'
export type { GameScore, GameScoringState, GameScoringActions } from './hooks/useGameScoring'

export { useFlashcardGame } from './hooks/useFlashcardGame'
export type {
  FlashcardPair,
  CardSide,
  FlashcardGameCard,
  FlashcardGameState,
  FlashcardGameResult,
  FlashcardGameHook,
} from './hooks/useFlashcardGame'

export { useWordScramble } from './hooks/useWordScramble'
export type {
  WordScrambleGameState,
  ScrambleTile,
  WordScrambleResult,
  WordScrambleHook,
} from './hooks/useWordScramble'

// Utils
export { shuffleArray, scrambleWord, isWordMatch } from './utils/scramble'
export {
  calculateTimeBonus,
  calculateAccuracyMultiplier,
  calculateFinalScore,
} from './utils/scoring'
