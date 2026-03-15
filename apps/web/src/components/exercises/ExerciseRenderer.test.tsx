import { Exercise, ExerciseResult, ExerciseType } from '@langafy/shared-types';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock game components to avoid shared-game-logic and framer-motion dependencies
vi.mock('../games/FlashcardMatch', () => ({
  FlashcardMatch: () => <div data-testid="flashcard-match">FlashcardMatch</div>,
}));
vi.mock('../games/WordScramble', () => ({
  WordScramble: () => <div data-testid="word-scramble">WordScramble</div>,
}));

// Mock exercise components so we can test routing without their API dependencies
vi.mock('./MultipleChoice', () => ({
  MultipleChoice: () => <div data-testid="multiple-choice">MultipleChoice</div>,
}));
vi.mock('./FillInTheBlank', () => ({
  FillInTheBlank: () => <div data-testid="fill-in-the-blank">FillInTheBlank</div>,
}));

import { ExerciseRenderer } from './ExerciseRenderer';

const onComplete: (result: ExerciseResult) => void = vi.fn();

function makeExercise(type: ExerciseType): Exercise {
  return { id: '1', lessonId: '1', type, sortOrder: 1, points: 10, config: {} };
}

describe('ExerciseRenderer', () => {
  it('renders MultipleChoice for MultipleChoice type', () => {
    render(<ExerciseRenderer exercise={makeExercise(ExerciseType.MultipleChoice)} onComplete={onComplete} />);
    expect(screen.getByTestId('multiple-choice')).toBeInTheDocument();
  });

  it('renders FillInTheBlank for FillBlank type', () => {
    render(<ExerciseRenderer exercise={makeExercise(ExerciseType.FillBlank)} onComplete={onComplete} />);
    expect(screen.getByTestId('fill-in-the-blank')).toBeInTheDocument();
  });

  it('renders WordScramble for WordScramble type', () => {
    render(<ExerciseRenderer exercise={makeExercise(ExerciseType.WordScramble)} onComplete={onComplete} />);
    expect(screen.getByTestId('word-scramble')).toBeInTheDocument();
  });

  it('renders FlashcardMatch for FlashcardMatch type', () => {
    render(<ExerciseRenderer exercise={makeExercise(ExerciseType.FlashcardMatch)} onComplete={onComplete} />);
    expect(screen.getByTestId('flashcard-match')).toBeInTheDocument();
  });

  it('renders Coming Soon placeholder for FreeResponse type', () => {
    render(<ExerciseRenderer exercise={makeExercise(ExerciseType.FreeResponse)} onComplete={onComplete} />);
    expect(screen.getByText(/free response coming soon/i)).toBeInTheDocument();
  });

  it('renders Unknown Exercise Type for unrecognized type', () => {
    const exercise = makeExercise('Unknown' as ExerciseType);
    render(<ExerciseRenderer exercise={exercise} onComplete={onComplete} />);
    expect(screen.getByText(/unknown exercise type/i)).toBeInTheDocument();
  });
});
