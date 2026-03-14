/**
 * CEFR (Common European Framework of Reference for Languages) proficiency levels
 */
export enum CefrLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

/**
 * Supported language in the platform
 */
export interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isActive: boolean;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * User profile information
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  firebaseUid: string;
  activeLanguageCode: string;
  createdAt: string;
  lastActiveAt: string;
}

/**
 * User's language learning record
 */
export interface UserLanguage {
  id: string;
  userId: string;
  languageId: string;
  languageCode: string;
  currentCefrLevel: CefrLevel;
  isPrimary: boolean;
  startedAt: string;
}

/**
 * Exercise type enumeration
 */
export enum ExerciseType {
  MultipleChoice = 'MultipleChoice',
  FillBlank = 'FillBlank',
  WordScramble = 'WordScramble',
  FlashcardMatch = 'FlashcardMatch',
  FreeResponse = 'FreeResponse',
}

/**
 * Language code type alias
 */
export type LanguageCode = 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ja' | 'zh';

/**
 * Base exercise configuration (type-agnostic)
 */
export interface ExerciseConfig {
  [key: string]: unknown;
}

/**
 * Multiple choice exercise configuration
 */
export interface MultipleChoiceConfig extends ExerciseConfig {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

/**
 * Fill-in-the-blank exercise configuration
 */
export interface FillBlankConfig extends ExerciseConfig {
  sentence: string; // sentence with _____ placeholder
  correctAnswers: string[]; // multiple acceptable answers (case-insensitive)
  alternatives?: string[]; // alternative correct answers (e.g., contractions)
  explanation?: string;
}

/**
 * Word scramble exercise configuration
 */
export interface WordScrambleConfig extends ExerciseConfig {
  targetWord: string; // the correct answer
  hint?: string; // optional hint (e.g., English translation or description)
  scrambledLetters?: string[]; // pre-scrambled letters (optional, can be generated at runtime)
  explanation?: string;
}

/**
 * Flashcard matching game configuration
 */
export interface FlashcardMatchConfig extends ExerciseConfig {
  pairs: Array<{
    id: string;
    target: string; // word in target language
    english: string; // English translation
  }>;
  timeLimit?: number; // optional time limit in seconds
  explanation?: string;
}

/**
 * Free response exercise configuration
 */
export interface FreeResponseConfig extends ExerciseConfig {
  prompt: string; // the question or prompt
  expectedKeywords?: string[]; // keywords to look for in response (for auto-grading hints)
  explanation?: string;
}

/**
 * Exercise lesson component
 */
export interface Exercise {
  id: string;
  lessonId: string;
  type: ExerciseType;
  config: ExerciseConfig;
  sortOrder: number;
  points: number;
}

/**
 * Lesson within a unit
 */
export interface Lesson {
  id: string;
  unitId: string;
  title: string;
  description: string;
  objective: string;
  sortOrder: number;
  exercises?: Exercise[];
}

/**
 * Unit within a CEFR level
 */
export interface Unit {
  id: string;
  languageId: string;
  cefrLevelId: string;
  cefrLevel: CefrLevel;
  title: string;
  description: string;
  sortOrder: number;
  lessons?: Lesson[];
}

/**
 * CEFR level information
 */
export interface CefrLevelInfo {
  id: string;
  code: CefrLevel;
  name: string;
  description: string;
  sortOrder: number;
}

/**
 * User progress for a single exercise
 */
export interface ExerciseProgress {
  exerciseId: string;
  completed: boolean;
  score: number;
  attempts: number;
  completedAt?: string;
}

/**
 * Summary of learning progress
 */
export interface ProgressSummary {
  totalPoints: number;
  currentStreak: number;
  exercisesCompleted: number;
  levelProgress: Record<string, number>; // CEFR level code -> completion percentage
  unitProgress: Record<string, number>;  // Unit ID -> completion percentage
}

/**
 * Vocabulary item for language learning
 */
export interface Vocabulary {
  id: string;
  languageId: string;
  cefrLevelId: string;
  cefrLevel: CefrLevel;
  wordTarget: string;
  wordEn: string;
  partOfSpeech: string;
  exampleSentenceTarget: string;
  exampleSentenceEn: string;
}

/**
 * User's vocabulary tracking with spaced repetition
 */
export interface UserVocabulary {
  id: string;
  userId: string;
  vocabularyId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: string;
}

/**
 * Exercise submission - discriminated union by exercise type
 */
export type ExerciseSubmission =
  | {
      type: ExerciseType.MultipleChoice;
      selectedIndex: number;
    }
  | {
      type: ExerciseType.FillBlank;
      answer: string;
    }
  | {
      type: ExerciseType.WordScramble;
      answer: string;
    }
  | {
      type: ExerciseType.FlashcardMatch;
      completedAt: number; // completion time in milliseconds
      mistakes: number; // number of mismatches
    }
  | {
      type: ExerciseType.FreeResponse;
      answer: string;
    };

/**
 * Exercise result/feedback after submission
 */
export interface ExerciseResult {
  correct: boolean;
  score: number; // points earned (0 if incorrect)
  maxScore: number; // total points possible for this exercise
  correctAnswer?: string; // show correct answer if user was incorrect
  explanation?: string; // detailed explanation of the answer
  timeTaken?: number; // time spent on this exercise in milliseconds (optional, for games)
}

/**
 * Progress breakdown by CEFR level
 */
export interface LevelProgress {
  cefrLevel: CefrLevel;
  levelCode: string;
  completionPercentage: number;
  completedUnits: number;
  totalUnits: number;
  pointsEarned: number;
}

/**
 * Progress breakdown by unit
 */
export interface UnitProgress {
  unitId: string;
  unitTitle: string;
  cefrLevel: CefrLevel;
  completionPercentage: number;
  completedLessons: number;
  totalLessons: number;
  pointsEarned: number;
}

/**
 * Enhanced progress summary with language context
 */
export interface ProgressSummaryEnhanced {
  languageCode: LanguageCode;
  currentLevel: CefrLevel;
  totalPoints: number;
  currentStreak: number; // consecutive days of activity
  exercisesCompleted: number;
  lessonsCompleted: number;
  lastActivityAt: string;
  levelProgress: LevelProgress[];
  unitProgress: UnitProgress[];
}

// ========== Game-Specific Types ==========

/**
 * Game state for all mini-games
 */
export type GameState = 'idle' | 'playing' | 'paused' | 'completed';

/**
 * Game scoring result with breakdown
 */
export interface GameScore {
  basePoints: number; // points for completing the game
  timeBonus: number; // bonus/penalty based on speed
  accuracyMultiplier: number; // 0.5-1.0 based on mistakes
  finalScore: number; // basePoints * (1 + timeBonus/100) * accuracyMultiplier
}

/**
 * Events that occur during gameplay for analytics/tracking
 */
export type GameEvent = 'card-flip' | 'match' | 'mismatch' | 'hint-used' | 'timeout';

/**
 * Time bonus calculation result
 */
export interface TimeBonus {
  bonus: number; // percentage bonus/penalty (e.g., +20, -10)
  label: string; // human-readable label (e.g., "Excellent speed", "Perfect time")
}

/**
 * Accuracy multiplier based on mistake count
 */
export interface AccuracyMultiplier {
  multiplier: number; // 0.5-1.0
  mistakes: number; // number of mistakes made
  label: string; // human-readable label (e.g., "Flawless", "Good")
}
