/**
 * CEFR (Common European Framework of Reference for Languages) proficiency levels
 */
export declare enum CefrLevel {
    A1 = "A1",
    A2 = "A2",
    B1 = "B1",
    B2 = "B2",
    C1 = "C1",
    C2 = "C2"
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
export declare enum ExerciseType {
    MultipleChoice = "MultipleChoice",
    FillBlank = "FillBlank",
    WordScramble = "WordScramble",
    FlashcardMatch = "FlashcardMatch",
    FreeResponse = "FreeResponse"
}
/**
 * Base exercise configuration (type-agnostic)
 */
export interface ExerciseConfig {
    [key: string]: unknown;
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
//# sourceMappingURL=types.d.ts.map