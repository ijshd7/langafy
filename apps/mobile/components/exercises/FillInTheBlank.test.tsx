import { Exercise, ExerciseResult, ExerciseType, FillBlankConfig } from '@langafy/shared-types';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  apiClient: { post: jest.fn() },
}));

import { apiClient } from '@/lib/api';

const mockPost = jest.mocked(apiClient.post);

const exercise: Exercise = {
  id: '2',
  lessonId: '1',
  type: ExerciseType.FillBlank,
  sortOrder: 2,
  points: 10,
  config: {
    sentence: 'Los _____ son animales.',
    correctAnswer: 'gatos',
    explanation: '"Gatos" means cats in Spanish.',
  } as FillBlankConfig,
};

const correctResult: ExerciseResult = { correct: true, score: 10, maxScore: 10 };
const wrongResult: ExerciseResult = {
  correct: false,
  score: 0,
  maxScore: 10,
  correctAnswer: 'gatos',
};

let FillInTheBlank: typeof import('./FillInTheBlank').FillInTheBlank;
beforeAll(() => {
  ({ FillInTheBlank } = require('./FillInTheBlank'));
});

describe('FillInTheBlank', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders sentence and text input', () => {
    render(<FillInTheBlank exercise={exercise} onComplete={jest.fn()} />);

    expect(screen.getByText('Complete the sentence:')).toBeTruthy();
    expect(screen.getByPlaceholderText('Type your answer here...')).toBeTruthy();
  });

  it('Submit Answer button is disabled when input is empty', () => {
    render(<FillInTheBlank exercise={exercise} onComplete={jest.fn()} />);

    expect(screen.getByText('Submit Answer')).toBeDisabled();
  });

  it('enables Submit Answer button after typing an answer', () => {
    render(<FillInTheBlank exercise={exercise} onComplete={jest.fn()} />);

    fireEvent.changeText(screen.getByPlaceholderText('Type your answer here...'), 'gatos');

    expect(screen.getByText('Submit Answer')).not.toBeDisabled();
  });

  it('shows correct feedback and auto-advances after 2 seconds on correct answer', async () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    mockPost.mockResolvedValue(correctResult);

    render(<FillInTheBlank exercise={exercise} onComplete={onComplete} />);

    act(() =>
      fireEvent.changeText(screen.getByPlaceholderText('Type your answer here...'), 'gatos')
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Submit Answer'));
    });

    expect(screen.getByText('✓ Correct!')).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(2000));
    expect(onComplete).toHaveBeenCalledWith(correctResult);
  });

  it('shows incorrect feedback and Continue button on wrong answer', async () => {
    const onComplete = jest.fn();
    mockPost.mockResolvedValue(wrongResult);

    render(<FillInTheBlank exercise={exercise} onComplete={onComplete} />);

    fireEvent.changeText(screen.getByPlaceholderText('Type your answer here...'), 'perros');
    await act(async () => {
      fireEvent.press(screen.getByText('Submit Answer'));
    });

    await waitFor(() => expect(screen.getByText('✗ Incorrect')).toBeTruthy());
    expect(screen.getByText(/the correct answer is:/i)).toBeTruthy();
    expect(screen.getByText('Continue')).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete when Continue button is pressed after wrong answer', async () => {
    const onComplete = jest.fn();
    mockPost.mockResolvedValue(wrongResult);

    render(<FillInTheBlank exercise={exercise} onComplete={onComplete} />);

    fireEvent.changeText(screen.getByPlaceholderText('Type your answer here...'), 'perros');
    await act(async () => {
      fireEvent.press(screen.getByText('Submit Answer'));
    });
    await waitFor(() => screen.getByText('Continue'));
    fireEvent.press(screen.getByText('Continue'));

    expect(onComplete).toHaveBeenCalledWith(wrongResult);
  });

  it('disables input after submission', async () => {
    mockPost.mockResolvedValue(correctResult);

    render(<FillInTheBlank exercise={exercise} onComplete={jest.fn()} />);

    fireEvent.changeText(screen.getByPlaceholderText('Type your answer here...'), 'gatos');
    await act(async () => {
      fireEvent.press(screen.getByText('Submit Answer'));
    });

    await waitFor(() => expect(screen.getByText('✓ Correct!')).toBeTruthy());
    expect(screen.getByPlaceholderText('Type your answer here...')).toBeDisabled();
  });

  it('shows explanation after submission', async () => {
    mockPost.mockResolvedValue(correctResult);

    render(<FillInTheBlank exercise={exercise} onComplete={jest.fn()} />);

    fireEvent.changeText(screen.getByPlaceholderText('Type your answer here...'), 'gatos');
    await act(async () => {
      fireEvent.press(screen.getByText('Submit Answer'));
    });

    await waitFor(() =>
      expect(screen.getByText('"Gatos" means cats in Spanish.')).toBeTruthy()
    );
  });

  it('submits with correct payload', async () => {
    mockPost.mockResolvedValue(correctResult);

    render(<FillInTheBlank exercise={exercise} onComplete={jest.fn()} />);

    fireEvent.changeText(screen.getByPlaceholderText('Type your answer here...'), 'gatos');
    await act(async () => {
      fireEvent.press(screen.getByText('Submit Answer'));
    });

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost).toHaveBeenCalledWith('/exercises/2/submit', {
      type: 'FillBlank',
      answer: 'gatos',
    });
  });
});
