/**
 * CEFR (Common European Framework of Reference for Languages) proficiency levels
 */
export const CefrLevel = {
    A1: 'A1',
    A2: 'A2',
    B1: 'B1',
    B2: 'B2',
    C1: 'C1',
    C2: 'C2',
};
/**
 * Exercise type enumeration
 */
// Using const object instead of enum to avoid IIFE initialization issues with Turbopack
export const ExerciseType = {
    MultipleChoice: 'MultipleChoice',
    FillBlank: 'FillBlank',
    WordScramble: 'WordScramble',
    FlashcardMatch: 'FlashcardMatch',
    FreeResponse: 'FreeResponse',
};
