/**
 * CEFR (Common European Framework of Reference for Languages) proficiency levels
 */
export declare const CefrLevel: {
    readonly A1: "A1";
    readonly A2: "A2";
    readonly B1: "B1";
    readonly B2: "B2";
    readonly C1: "C1";
    readonly C2: "C2";
};
export type CefrLevel = (typeof CefrLevel)[keyof typeof CefrLevel];
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
export declare const ExerciseType: {
    readonly MultipleChoice: "MultipleChoice";
    readonly FillBlank: "FillBlank";
    readonly WordScramble: "WordScramble";
    readonly FlashcardMatch: "FlashcardMatch";
    readonly FreeResponse: "FreeResponse";
};
export type ExerciseType = (typeof ExerciseType)[keyof typeof ExerciseType];
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
    sentence: string;
    correctAnswers: string[];
    alternatives?: string[];
    hint?: string;
    explanation?: string;
}
/**
 * Word scramble exercise configuration
 */
export interface WordScrambleConfig extends ExerciseConfig {
    targetWord: string;
    hint?: string;
    scrambledLetters?: string[];
    explanation?: string;
}
/**
 * Flashcard matching game configuration
 */
export interface FlashcardMatchConfig extends ExerciseConfig {
    pairs: Array<{
        id: string;
        target: string;
        english: string;
    }>;
    timeLimit?: number;
    explanation?: string;
}
/**
 * Free response exercise configuration
 */
export interface FreeResponseConfig extends ExerciseConfig {
    prompt: string;
    expectedKeywords?: string[];
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
    levelProgress: Record<string, number>;
    unitProgress: Record<string, number>;
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
export type ExerciseSubmission = {
    type: typeof ExerciseType.MultipleChoice;
    selectedIndex: number;
} | {
    type: typeof ExerciseType.FillBlank;
    answer: string;
} | {
    type: typeof ExerciseType.WordScramble;
    answer: string;
} | {
    type: typeof ExerciseType.FlashcardMatch;
    completedAt: number;
    mistakes: number;
} | {
    type: typeof ExerciseType.FreeResponse;
    answer: string;
};
/**
 * Exercise result/feedback after submission
 */
export interface ExerciseResult {
    correct: boolean;
    score: number;
    maxScore: number;
    correctAnswer?: string;
    explanation?: string;
    timeTaken?: number;
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
    currentStreak: number;
    exercisesCompleted: number;
    lessonsCompleted: number;
    lastActivityAt: string;
    levelProgress: LevelProgress[];
    unitProgress: UnitProgress[];
}
/**
 * Game state for all mini-games
 */
export type GameState = 'idle' | 'playing' | 'paused' | 'completed';
/**
 * Game scoring result with breakdown
 */
export interface GameScore {
    basePoints: number;
    timeBonus: number;
    accuracyMultiplier: number;
    finalScore: number;
}
/**
 * Events that occur during gameplay for analytics/tracking
 */
export type GameEvent = 'card-flip' | 'match' | 'mismatch' | 'hint-used' | 'timeout';
/**
 * Time bonus calculation result
 */
export interface TimeBonus {
    bonus: number;
    label: string;
}
/**
 * Accuracy multiplier based on mistake count
 */
export interface AccuracyMultiplier {
    multiplier: number;
    mistakes: number;
    label: string;
}
//# sourceMappingURL=types.d.ts.map