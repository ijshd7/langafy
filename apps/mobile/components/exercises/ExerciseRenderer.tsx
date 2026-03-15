import { Exercise, ExerciseResult, ExerciseType } from '@langafy/shared-types';
import { AlertCircle } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

import { FlashcardMatch } from '../games/FlashcardMatch';
import { WordScramble } from '../games/WordScramble';

import { FillInTheBlank } from './FillInTheBlank';
import { MultipleChoice } from './MultipleChoice';

interface ExerciseRendererProps {
  exercise: Exercise;
  onComplete: (result: ExerciseResult) => void;
  isLoading?: boolean;
}

/**
 * Exercise renderer component for mobile
 *
 * Delegates to the correct exercise component based on exercise type.
 * Handles the onComplete callback to advance to the next exercise.
 */
export function ExerciseRenderer({
  exercise,
  onComplete,
  isLoading = false,
}: ExerciseRendererProps) {
  switch (exercise.type) {
    case ExerciseType.MultipleChoice:
      return <MultipleChoice exercise={exercise} onComplete={onComplete} isLoading={isLoading} />;

    case ExerciseType.FillBlank:
      return <FillInTheBlank exercise={exercise} onComplete={onComplete} isLoading={isLoading} />;

    case ExerciseType.WordScramble:
      return (
        <WordScramble exercise={exercise} onComplete={onComplete} basePoints={exercise.points} />
      );

    case ExerciseType.FlashcardMatch:
      return (
        <FlashcardMatch exercise={exercise} onComplete={onComplete} basePoints={exercise.points} />
      );

    case ExerciseType.FreeResponse:
      return (
        <View className="gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-950">
          <View className="flex-row gap-3">
            <AlertCircle size={24} className="flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
            <View className="flex-1">
              <Text className="font-semibold text-yellow-900 dark:text-yellow-100">
                Free Response Coming Soon
              </Text>
              <Text className="mt-1 text-sm text-yellow-800 dark:text-yellow-200">
                This exercise type will be available in an upcoming update.
              </Text>
            </View>
          </View>
        </View>
      );

    default:
      return (
        <View className="gap-3 rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
          <View className="flex-row gap-3">
            <AlertCircle size={24} className="flex-shrink-0 text-red-600 dark:text-red-400" />
            <View className="flex-1">
              <Text className="font-semibold text-red-900 dark:text-red-100">
                Unknown Exercise Type
              </Text>
              <Text className="mt-1 text-sm text-red-800 dark:text-red-200">
                The exercise type &quot;{exercise.type}&quot; is not recognized.
              </Text>
            </View>
          </View>
        </View>
      );
  }
}
