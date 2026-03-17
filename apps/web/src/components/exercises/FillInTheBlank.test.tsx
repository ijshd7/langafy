import { Exercise, ExerciseResult, ExerciseType, FillBlankConfig } from '@langafy/shared-types';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { FillInTheBlank } from './FillInTheBlank';

import { apiClient } from '@/lib/api';


vi.mock('@/lib/api', () => ({
  apiClient: { post: vi.fn() },
}));

const mockPost = vi.mocked(apiClient.post);

const exercise: Exercise = {
  id: '2',
  lessonId: '1',
  type: ExerciseType.FillBlank,
  sortOrder: 2,
  points: 10,
  config: {
    sentence: 'Las _____ son animales.',
    correctAnswers: ['llamas'],
    hint: 'A South American animal known for spitting',
    explanation: 'Llamas are animals native to South America.',
  } as FillBlankConfig,
};

// API response shape (what apiClient.post returns)
const correctApiResponse = { isCorrect: true, score: 100, pointsEarned: 10, feedback: 'Correct!' };
const wrongApiResponse = {
  isCorrect: false,
  score: 0,
  pointsEarned: 0,
  correctAnswer: 'llamas',
  feedback: 'Incorrect',
};

// Mapped ExerciseResult shape (what onComplete receives)
const correctResult: ExerciseResult = { correct: true, score: 10, maxScore: 10 };
describe('FillInTheBlank', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the sentence and input field', () => {
    render(<FillInTheBlank exercise={exercise} onComplete={vi.fn()} />);

    expect(screen.getByText(/Las/)).toBeInTheDocument();
    expect(screen.getByText(/son animales/)).toBeInTheDocument();
    expect(screen.getByLabelText(/your answer/i)).toBeInTheDocument();
  });

  it('renders hint when provided', () => {
    render(<FillInTheBlank exercise={exercise} onComplete={vi.fn()} />);

    expect(screen.getByText(/A South American animal known for spitting/)).toBeInTheDocument();
  });

  it('does not render hint section when hint is absent', () => {
    const exerciseWithoutHint: Exercise = {
      ...exercise,
      config: { ...exercise.config, hint: undefined } as FillBlankConfig,
    };
    render(<FillInTheBlank exercise={exerciseWithoutHint} onComplete={vi.fn()} />);

    expect(screen.queryByText(/Hint:/)).not.toBeInTheDocument();
  });

  it('submit button is disabled when input is empty', () => {
    render(<FillInTheBlank exercise={exercise} onComplete={vi.fn()} />);

    expect(screen.getByRole('button', { name: /submit answer/i })).toBeDisabled();
  });

  it('enables submit button after typing an answer', async () => {
    const user = userEvent.setup();
    render(<FillInTheBlank exercise={exercise} onComplete={vi.fn()} />);

    await user.type(screen.getByLabelText(/your answer/i), 'llamas');

    expect(screen.getByRole('button', { name: /submit answer/i })).not.toBeDisabled();
  });

  it('submits the trimmed answer with correct payload', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue(correctApiResponse);

    render(<FillInTheBlank exercise={exercise} onComplete={vi.fn()} />);

    await user.type(screen.getByLabelText(/your answer/i), '  llamas  ');
    await user.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost).toHaveBeenCalledWith('/exercises/2/submit', {
      type: 'FillBlank',
      answer: 'llamas',
    });
  });

  it('shows correct feedback on correct answer', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue(correctApiResponse);

    render(<FillInTheBlank exercise={exercise} onComplete={vi.fn()} />);

    await user.type(screen.getByLabelText(/your answer/i), 'llamas');
    await user.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => expect(screen.getByText('✓ Correct!')).toBeInTheDocument());
  });

  it('shows incorrect feedback and Continue button on wrong answer', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    mockPost.mockResolvedValue(wrongApiResponse);

    render(<FillInTheBlank exercise={exercise} onComplete={onComplete} />);

    await user.type(screen.getByLabelText(/your answer/i), 'perros');
    await user.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => expect(screen.getByText('✗ Incorrect')).toBeInTheDocument());
    expect(screen.getByText(/correct answer is:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('submits on Enter key press', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue(correctApiResponse);

    render(<FillInTheBlank exercise={exercise} onComplete={vi.fn()} />);

    await user.type(screen.getByLabelText(/your answer/i), 'llamas');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
  });

  it('auto-advances after 2 seconds on correct answer', async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    mockPost.mockResolvedValue(correctApiResponse);

    render(<FillInTheBlank exercise={exercise} onComplete={onComplete} />);

    // Use fireEvent + act to avoid userEvent's internal timer dependencies
    act(() =>
      fireEvent.change(screen.getByLabelText(/your answer/i), { target: { value: 'llamas' } })
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    });

    expect(screen.getByText('✓ Correct!')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(2000));
    expect(onComplete).toHaveBeenCalledWith(correctResult);
  });

  it('shows explanation after submission', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue(correctApiResponse);

    render(<FillInTheBlank exercise={exercise} onComplete={vi.fn()} />);

    await user.type(screen.getByLabelText(/your answer/i), 'llamas');
    await user.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => screen.getByText('Llamas are animals native to South America.'));
  });
});
