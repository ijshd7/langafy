import {
  Exercise,
  ExerciseResult,
  ExerciseType,
  MultipleChoiceConfig,
} from '@langafy/shared-types';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { apiClient } from '@/lib/api';

import { MultipleChoice } from './MultipleChoice';

vi.mock('@/lib/api', () => ({
  apiClient: { post: vi.fn() },
}));

const mockPost = vi.mocked(apiClient.post);

const exercise: Exercise = {
  id: '1',
  lessonId: '1',
  type: ExerciseType.MultipleChoice,
  sortOrder: 1,
  points: 10,
  config: {
    question: 'What is "hello" in Spanish?',
    options: ['hola', 'adiós', 'gracias', 'por favor'],
    correctIndex: 0,
    explanation: 'Hola means hello in Spanish.',
  } as MultipleChoiceConfig,
};

// API response shape (what apiClient.post returns)
const correctApiResponse = { isCorrect: true, score: 100, pointsEarned: 10, feedback: 'Correct!' };
const wrongApiResponse = {
  isCorrect: false,
  score: 0,
  pointsEarned: 0,
  correctAnswer: 'hola',
  feedback: 'Incorrect',
};

// Mapped ExerciseResult shape (what onComplete receives)
const correctResult: ExerciseResult = { correct: true, score: 10, maxScore: 10 };
const wrongResult: ExerciseResult = {
  correct: false,
  score: 0,
  maxScore: 10,
  correctAnswer: 'hola',
};

describe('MultipleChoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders question and all answer options', () => {
    render(<MultipleChoice exercise={exercise} onComplete={vi.fn()} />);

    expect(screen.getByText('What is "hello" in Spanish?')).toBeInTheDocument();
    expect(screen.getByText('hola')).toBeInTheDocument();
    expect(screen.getByText('adiós')).toBeInTheDocument();
    expect(screen.getByText('gracias')).toBeInTheDocument();
    expect(screen.getByText('por favor')).toBeInTheDocument();
  });

  it('submit button is disabled when no option is selected', () => {
    render(<MultipleChoice exercise={exercise} onComplete={vi.fn()} />);

    expect(screen.getByRole('button', { name: /submit answer/i })).toBeDisabled();
  });

  it('enables submit button after selecting an option', async () => {
    const user = userEvent.setup();
    render(<MultipleChoice exercise={exercise} onComplete={vi.fn()} />);

    await user.click(screen.getByText('hola'));

    expect(screen.getByRole('button', { name: /submit answer/i })).not.toBeDisabled();
  });

  it('shows correct feedback and auto-advances after 2 seconds on correct answer', async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    mockPost.mockResolvedValue(correctApiResponse);

    render(<MultipleChoice exercise={exercise} onComplete={onComplete} />);

    // Use fireEvent + act to avoid userEvent's internal timer dependencies
    act(() => fireEvent.click(screen.getByText('hola')));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    });

    expect(screen.getByText('✓ Correct!')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(2000));
    expect(onComplete).toHaveBeenCalledWith(correctResult);
  });

  it('shows incorrect feedback and Continue button on wrong answer', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    mockPost.mockResolvedValue(wrongApiResponse);

    render(<MultipleChoice exercise={exercise} onComplete={onComplete} />);

    await user.click(screen.getByText('gracias'));
    await user.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => expect(screen.getByText('✗ Incorrect')).toBeInTheDocument());
    // "correct answer is: hola" — verify the message, not just the ambiguous word
    const correctAnswerParagraph = screen.getByText(/correct answer is:/i).closest('p')!;
    expect(correctAnswerParagraph).toHaveTextContent('hola');
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete when Continue button is clicked after wrong answer', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    mockPost.mockResolvedValue(wrongApiResponse);

    render(<MultipleChoice exercise={exercise} onComplete={onComplete} />);

    await user.click(screen.getByText('gracias'));
    await user.click(screen.getByRole('button', { name: /submit answer/i }));
    await waitFor(() => screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(onComplete).toHaveBeenCalledWith(wrongResult);
  });

  it('disables all options after submission', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue(correctApiResponse);

    render(<MultipleChoice exercise={exercise} onComplete={vi.fn()} />);

    await user.click(screen.getByText('hola'));
    await user.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => screen.getByText('✓ Correct!'));

    // All option buttons should be disabled after submission
    const optionButtons = screen
      .getAllByRole('button')
      .filter((btn) => ['hola', 'adiós', 'gracias', 'por favor'].includes(btn.textContent ?? ''));
    optionButtons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('shows explanation after submission', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue(correctApiResponse);

    render(<MultipleChoice exercise={exercise} onComplete={vi.fn()} />);

    await user.click(screen.getByText('hola'));
    await user.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => screen.getByText('Hola means hello in Spanish.'));
  });

  it('submits with correct payload', async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue(correctApiResponse);

    render(<MultipleChoice exercise={exercise} onComplete={vi.fn()} />);

    await user.click(screen.getByText('hola'));
    await user.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost).toHaveBeenCalledWith('/exercises/1/submit', {
      type: 'MultipleChoice',
      selectedIndex: 0,
    });
  });
});
