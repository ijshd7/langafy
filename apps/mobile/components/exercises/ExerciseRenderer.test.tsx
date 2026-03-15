import { Exercise, ExerciseResult, ExerciseType } from '@langafy/shared-types';
import { render, screen } from '@testing-library/react-native';

// Mock game components to avoid shared-game-logic and reanimated dependencies
jest.mock('../games/FlashcardMatch', () => ({
  FlashcardMatch: () => {
    const { View, Text } = require('react-native');
    return (
      <View testID="flashcard-match">
        <Text>FlashcardMatch</Text>
      </View>
    );
  },
}));
jest.mock('../games/WordScramble', () => ({
  WordScramble: () => {
    const { View, Text } = require('react-native');
    return (
      <View testID="word-scramble">
        <Text>WordScramble</Text>
      </View>
    );
  },
}));

// Mock exercise components to isolate routing logic
jest.mock('./MultipleChoice', () => ({
  MultipleChoice: () => {
    const { View, Text } = require('react-native');
    return (
      <View testID="multiple-choice">
        <Text>MultipleChoice</Text>
      </View>
    );
  },
}));
jest.mock('./FillInTheBlank', () => ({
  FillInTheBlank: () => {
    const { View, Text } = require('react-native');
    return (
      <View testID="fill-in-the-blank">
        <Text>FillInTheBlank</Text>
      </View>
    );
  },
}));

import { ExerciseRenderer } from './ExerciseRenderer';

const onComplete: (result: ExerciseResult) => void = jest.fn();

function makeExercise(type: ExerciseType): Exercise {
  return { id: '1', lessonId: '1', type, sortOrder: 1, points: 10, config: {} };
}

describe('ExerciseRenderer', () => {
  it('renders MultipleChoice for MultipleChoice type', () => {
    render(<ExerciseRenderer exercise={makeExercise(ExerciseType.MultipleChoice)} onComplete={onComplete} />);
    expect(screen.getByTestId('multiple-choice')).toBeTruthy();
  });

  it('renders FillInTheBlank for FillBlank type', () => {
    render(<ExerciseRenderer exercise={makeExercise(ExerciseType.FillBlank)} onComplete={onComplete} />);
    expect(screen.getByTestId('fill-in-the-blank')).toBeTruthy();
  });

  it('renders WordScramble for WordScramble type', () => {
    render(<ExerciseRenderer exercise={makeExercise(ExerciseType.WordScramble)} onComplete={onComplete} />);
    expect(screen.getByTestId('word-scramble')).toBeTruthy();
  });

  it('renders FlashcardMatch for FlashcardMatch type', () => {
    render(<ExerciseRenderer exercise={makeExercise(ExerciseType.FlashcardMatch)} onComplete={onComplete} />);
    expect(screen.getByTestId('flashcard-match')).toBeTruthy();
  });

  it('renders Coming Soon placeholder for FreeResponse type', () => {
    render(<ExerciseRenderer exercise={makeExercise(ExerciseType.FreeResponse)} onComplete={onComplete} />);
    expect(screen.getByText(/free response coming soon/i)).toBeTruthy();
  });

  it('renders Unknown Exercise Type for unrecognized type', () => {
    const exercise = makeExercise('Unknown' as ExerciseType);
    render(<ExerciseRenderer exercise={exercise} onComplete={onComplete} />);
    expect(screen.getByText(/unknown exercise type/i)).toBeTruthy();
  });
});
