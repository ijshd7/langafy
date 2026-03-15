import type { FlashcardGameCard } from '@langafy/shared-game-logic';
import { Exercise, ExerciseResult, ExerciseType } from '@langafy/shared-types';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';

jest.mock('@langafy/shared-game-logic', () => ({
  useFlashcardGame: jest.fn(),
}));

import { useFlashcardGame } from '@langafy/shared-game-logic';

const mockUseFlashcardGame = jest.mocked(useFlashcardGame);

const exercise: Exercise = {
  id: '3',
  lessonId: '1',
  type: ExerciseType.FlashcardMatch,
  sortOrder: 3,
  points: 20,
  config: {
    pairs: [
      { target: 'Hola', en: 'Hello' },
      { target: 'Adiós', en: 'Goodbye' },
    ],
  },
};

function makeCard(id: string, text: string, side: 'target' | 'en'): FlashcardGameCard {
  return { id, text, side, isFlipped: false, isMatched: false };
}

const mockStart = jest.fn();
const mockFlipCard = jest.fn();

function defaultHookValue(overrides = {}) {
  return {
    gameState: 'playing' as const,
    cards: [
      makeCard('c0', 'Hola', 'target'),
      makeCard('c1', 'Hello', 'en'),
      makeCard('c2', 'Adiós', 'target'),
      makeCard('c3', 'Goodbye', 'en'),
    ],
    selectedCardId: null,
    lastMismatchIds: null,
    elapsedMs: 0,
    mistakes: 0,
    start: mockStart,
    flipCard: mockFlipCard,
    result: null,
    ...overrides,
  };
}

let FlashcardMatch: typeof import('./FlashcardMatch').FlashcardMatch;
beforeAll(() => {
  ({ FlashcardMatch } = require('./FlashcardMatch'));
});

describe('FlashcardMatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFlashcardGame.mockReturnValue(defaultHookValue());
  });

  it('shows loading state when gameState is idle', () => {
    mockUseFlashcardGame.mockReturnValue(defaultHookValue({ gameState: 'idle' }));

    render(<FlashcardMatch exercise={exercise} onComplete={jest.fn()} basePoints={20} />);

    expect(screen.getByText('Initializing game...')).toBeTruthy();
  });

  it('calls start on mount', () => {
    render(<FlashcardMatch exercise={exercise} onComplete={jest.fn()} basePoints={20} />);

    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('renders game grid with match counter in playing state', () => {
    render(<FlashcardMatch exercise={exercise} onComplete={jest.fn()} basePoints={20} />);

    // Header stats are visible
    expect(screen.getByText('Matches')).toBeTruthy();
    expect(screen.getByText('Mistakes')).toBeTruthy();
  });

  it('calls flipCard when a card tile is pressed', () => {
    render(<FlashcardMatch exercise={exercise} onComplete={jest.fn()} basePoints={20} />);

    // Press the first card (front shows "?")
    const questionMarks = screen.getAllByText('?');
    fireEvent.press(questionMarks[0]);

    expect(mockFlipCard).toHaveBeenCalled();
  });

  it('calls onComplete when gameState transitions to completed', async () => {
    const onComplete = jest.fn();

    const completedResult = {
      matches: [
        { targetId: 'c0', enId: 'c1' },
        { targetId: 'c2', enId: 'c3' },
      ],
      score: { finalScore: 18 },
      elapsedMs: 5000,
    };

    mockUseFlashcardGame.mockReturnValue(
      defaultHookValue({ gameState: 'completed', result: completedResult })
    );

    render(<FlashcardMatch exercise={exercise} onComplete={onComplete} basePoints={20} />);

    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ correct: true, maxScore: 20 })
      )
    );
  });

  it('shows completion state UI when game is complete', async () => {
    const completedResult = {
      matches: [{ targetId: 'c0', enId: 'c1' }, { targetId: 'c2', enId: 'c3' }],
      score: { finalScore: 18 },
      elapsedMs: 5000,
    };

    mockUseFlashcardGame.mockReturnValue(
      defaultHookValue({ gameState: 'completed', result: completedResult })
    );

    render(<FlashcardMatch exercise={exercise} onComplete={jest.fn()} basePoints={20} />);

    await waitFor(() => expect(screen.getByText('🎉 Game Complete!')).toBeTruthy());
  });
});
