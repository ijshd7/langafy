import { useWordScramble } from '@langafy/shared-game-logic';
import { Exercise, ExerciseType } from '@langafy/shared-types';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { WordScramble } from './WordScramble';

jest.mock('@langafy/shared-game-logic', () => ({
  useWordScramble: jest.fn(),
}));

const mockUseWordScramble = jest.mocked(useWordScramble);

const exercise: Exercise = {
  id: '4',
  lessonId: '1',
  type: ExerciseType.WordScramble,
  sortOrder: 4,
  points: 15,
  config: {
    targetWord: 'gato',
    hint: 'A common household pet',
    explanation: '"Gato" means cat in Spanish.',
  },
};

const mockStart = jest.fn();
const mockPlaceTile = jest.fn();
const mockRemoveTileFromAnswer = jest.fn();
const mockUseHint = jest.fn();
const mockSubmit = jest.fn();

function defaultHookValue(overrides = {}) {
  return {
    gameState: 'playing' as const,
    tiles: [
      { id: 't0', letter: 'g', usedInAnswer: false },
      { id: 't1', letter: 'a', usedInAnswer: false },
      { id: 't2', letter: 't', usedInAnswer: false },
      { id: 't3', letter: 'o', usedInAnswer: false },
    ],
    answer: [] as string[],
    hint: null as string | null,
    hintsUsed: 0,
    elapsedMs: 0,
    start: mockStart,
    placeTile: mockPlaceTile,
    removeTileFromAnswer: mockRemoveTileFromAnswer,
    useHint: mockUseHint,
    submit: mockSubmit,
    result: null as null | {
      correct: boolean;
      score: { finalScore: number };
      elapsedMs: number;
      hintsUsed: number;
    },
    ...overrides,
  };
}

describe('WordScramble', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWordScramble.mockReturnValue(defaultHookValue());
  });

  it('shows loading state when gameState is idle', () => {
    mockUseWordScramble.mockReturnValue(defaultHookValue({ gameState: 'idle' }));

    render(<WordScramble exercise={exercise} onComplete={jest.fn()} basePoints={15} />);

    expect(screen.getByText('Initializing game...')).toBeTruthy();
  });

  it('calls start on mount', () => {
    render(<WordScramble exercise={exercise} onComplete={jest.fn()} basePoints={15} />);

    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('renders available letter tiles in playing state', () => {
    render(<WordScramble exercise={exercise} onComplete={jest.fn()} basePoints={15} />);

    expect(screen.getByLabelText('Add g to answer')).toBeTruthy();
    expect(screen.getByLabelText('Add a to answer')).toBeTruthy();
    expect(screen.getByLabelText('Add t to answer')).toBeTruthy();
    expect(screen.getByLabelText('Add o to answer')).toBeTruthy();
  });

  it('calls placeTile when an available tile is pressed', () => {
    render(<WordScramble exercise={exercise} onComplete={jest.fn()} basePoints={15} />);

    fireEvent.press(screen.getByLabelText('Add g to answer'));

    expect(mockPlaceTile).toHaveBeenCalledWith('t0');
  });

  it('renders answer tiles and calls removeTileFromAnswer when pressed', () => {
    mockUseWordScramble.mockReturnValue(
      defaultHookValue({
        tiles: [
          { id: 't0', letter: 'g', usedInAnswer: true },
          { id: 't1', letter: 'a', usedInAnswer: false },
          { id: 't2', letter: 't', usedInAnswer: false },
          { id: 't3', letter: 'o', usedInAnswer: false },
        ],
        answer: ['g'],
      })
    );

    render(<WordScramble exercise={exercise} onComplete={jest.fn()} basePoints={15} />);

    fireEvent.press(screen.getByLabelText('Remove g from answer'));

    expect(mockRemoveTileFromAnswer).toHaveBeenCalledWith(0);
  });

  it('calls useHint when Show Hint button is pressed', () => {
    render(<WordScramble exercise={exercise} onComplete={jest.fn()} basePoints={15} />);

    fireEvent.press(screen.getByLabelText('Show hint'));

    expect(mockUseHint).toHaveBeenCalledTimes(1);
  });

  it('shows hint text when hint is available', () => {
    mockUseWordScramble.mockReturnValue(
      defaultHookValue({ hint: 'A common household pet', hintsUsed: 1 })
    );

    render(<WordScramble exercise={exercise} onComplete={jest.fn()} basePoints={15} />);

    expect(screen.getByText('A common household pet')).toBeTruthy();
    expect(screen.getByText('Hint Shown')).toBeTruthy();
  });

  it('calls submit when Check Answer is pressed', () => {
    mockUseWordScramble.mockReturnValue(defaultHookValue({ answer: ['g', 'a', 't', 'o'] }));

    render(<WordScramble exercise={exercise} onComplete={jest.fn()} basePoints={15} />);

    fireEvent.press(screen.getByLabelText('Check answer'));

    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete with correct result when game completes successfully', async () => {
    const onComplete = jest.fn();
    const completedResult = {
      correct: true,
      score: { finalScore: 14 },
      elapsedMs: 8000,
      hintsUsed: 0,
    };

    mockUseWordScramble.mockReturnValue(
      defaultHookValue({ gameState: 'completed', result: completedResult })
    );

    render(<WordScramble exercise={exercise} onComplete={onComplete} basePoints={15} />);

    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ correct: true, maxScore: 15 })
      )
    );
  });

  it('calls onComplete with correctAnswer when game completes incorrectly', async () => {
    const onComplete = jest.fn();
    const completedResult = {
      correct: false,
      score: { finalScore: 0 },
      elapsedMs: 15000,
      hintsUsed: 1,
    };

    mockUseWordScramble.mockReturnValue(
      defaultHookValue({ gameState: 'completed', result: completedResult })
    );

    render(<WordScramble exercise={exercise} onComplete={onComplete} basePoints={15} />);

    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ correct: false, correctAnswer: 'gato' })
      )
    );
  });

  it('shows completion state UI with result', async () => {
    const completedResult = {
      correct: true,
      score: { finalScore: 14 },
      elapsedMs: 8000,
      hintsUsed: 0,
    };

    mockUseWordScramble.mockReturnValue(
      defaultHookValue({ gameState: 'completed', result: completedResult })
    );

    render(<WordScramble exercise={exercise} onComplete={jest.fn()} basePoints={15} />);

    await waitFor(() => {
      expect(screen.getByText('🎉 Correct!')).toBeTruthy();
      expect(screen.getByText(/You unscrambled "gato" correctly!/i)).toBeTruthy();
    });
  });
});
