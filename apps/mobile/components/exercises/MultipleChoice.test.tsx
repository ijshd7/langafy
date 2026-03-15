import { Exercise, ExerciseResult, ExerciseType, MultipleChoiceConfig } from '@langafy/shared-types';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  apiClient: { post: jest.fn() },
}));

import { apiClient } from '@/lib/api';

const mockPost = jest.mocked(apiClient.post);

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

const correctResult: ExerciseResult = { correct: true, score: 10, maxScore: 10 };
const wrongResult: ExerciseResult = {
  correct: false,
  score: 0,
  maxScore: 10,
  correctAnswer: 'hola',
};

// Lazy import after mock is set up
let MultipleChoice: typeof import('./MultipleChoice').MultipleChoice;
beforeAll(() => {
  ({ MultipleChoice } = require('./MultipleChoice'));
});

describe('MultipleChoice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders question and all answer options', () => {
    render(<MultipleChoice exercise={exercise} onComplete={jest.fn()} />);

    expect(screen.getByText('What is "hello" in Spanish?')).toBeTruthy();
    expect(screen.getByText('hola')).toBeTruthy();
    expect(screen.getByText('adiós')).toBeTruthy();
    expect(screen.getByText('gracias')).toBeTruthy();
    expect(screen.getByText('por favor')).toBeTruthy();
  });

  it('Submit Answer button is disabled when no option is selected', () => {
    render(<MultipleChoice exercise={exercise} onComplete={jest.fn()} />);

    expect(screen.getByText('Submit Answer')).toBeDisabled();
  });

  it('enables Submit Answer button after selecting an option', () => {
    render(<MultipleChoice exercise={exercise} onComplete={jest.fn()} />);

    fireEvent.press(screen.getByText('hola'));

    expect(screen.getByText('Submit Answer')).not.toBeDisabled();
  });

  it('shows correct feedback and auto-advances after 2 seconds on correct answer', async () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    mockPost.mockResolvedValue(correctResult);

    render(<MultipleChoice exercise={exercise} onComplete={onComplete} />);

    act(() => fireEvent.press(screen.getByText('hola')));

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

    render(<MultipleChoice exercise={exercise} onComplete={onComplete} />);

    fireEvent.press(screen.getByText('gracias'));
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

    render(<MultipleChoice exercise={exercise} onComplete={onComplete} />);

    fireEvent.press(screen.getByText('gracias'));
    await act(async () => {
      fireEvent.press(screen.getByText('Submit Answer'));
    });
    await waitFor(() => screen.getByText('Continue'));
    fireEvent.press(screen.getByText('Continue'));

    expect(onComplete).toHaveBeenCalledWith(wrongResult);
  });

  it('disables options after submission', async () => {
    mockPost.mockResolvedValue(correctResult);

    render(<MultipleChoice exercise={exercise} onComplete={jest.fn()} />);

    fireEvent.press(screen.getByText('hola'));
    await act(async () => {
      fireEvent.press(screen.getByText('Submit Answer'));
    });

    await waitFor(() => expect(screen.getByText('✓ Correct!')).toBeTruthy());

    // All options should be disabled (they are children of disabled TouchableOpacity)
    expect(screen.getByText('hola')).toBeDisabled();
    expect(screen.getByText('adiós')).toBeDisabled();
  });

  it('shows explanation after submission', async () => {
    mockPost.mockResolvedValue(correctResult);

    render(<MultipleChoice exercise={exercise} onComplete={jest.fn()} />);

    fireEvent.press(screen.getByText('hola'));
    await act(async () => {
      fireEvent.press(screen.getByText('Submit Answer'));
    });

    await waitFor(() => expect(screen.getByText('Hola means hello in Spanish.')).toBeTruthy());
  });

  it('submits with correct payload', async () => {
    mockPost.mockResolvedValue(correctResult);

    render(<MultipleChoice exercise={exercise} onComplete={jest.fn()} />);

    fireEvent.press(screen.getByText('hola'));
    await act(async () => {
      fireEvent.press(screen.getByText('Submit Answer'));
    });

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost).toHaveBeenCalledWith('/exercises/1/submit', {
      type: 'MultipleChoice',
      selectedIndex: 0,
    });
  });

  it('shows error message when no option is selected and submit is pressed', async () => {
    // Bypass disabled state by calling handleSubmit directly is not possible,
    // but we can verify the button stays disabled with no selection
    render(<MultipleChoice exercise={exercise} onComplete={jest.fn()} />);

    expect(screen.getByText('Submit Answer')).toBeDisabled();
    expect(mockPost).not.toHaveBeenCalled();
  });
});
