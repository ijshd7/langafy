# Exercise Components

React components for rendering different types of language learning exercises in the Langafy web app.

## Components

### MultipleChoice

A multiple-choice question component with immediate feedback.

**Features:**

- Displays a question with 4 answer options
- Visual selection state with Tailwind-styled cards
- Submit answer to the API endpoint
- Real-time feedback showing correct/incorrect status
- Displays correct answer if user is wrong
- Optional explanation text
- Smooth animations and transitions
- Auto-advances after correct answer (2-second delay)
- Dark mode support

**Props:**

```typescript
interface MultipleChoiceProps {
  exercise: Exercise; // Exercise data with config
  onComplete: (result: ExerciseResult) => void; // Callback when exercise is done
  isLoading?: boolean; // Optional loading state
}
```

**Example Usage:**

```tsx
<MultipleChoice
  exercise={exercise}
  onComplete={(result) => {
    console.log(`Score: ${result.score}/${result.maxScore}`);
    // Advance to next exercise
  }}
/>
```

**Configuration (MultipleChoiceConfig):**

```typescript
{
  question: string        // The question text
  options: string[]       // Array of 4 answer options
  correctIndex: number    // Index of the correct answer (0-3)
  explanation?: string    // Optional explanation shown after submission
}
```

**Result Feedback:**
After submission, the component displays:

- ✓ Correct / ✗ Incorrect status
- Points earned (e.g., 10/10)
- The correct answer (if incorrect)
- Optional explanation (if provided)
- Correct answer highlighted in green
- Wrong selection highlighted in red

### FillInTheBlank

A fill-in-the-blank exercise component with text input.

**Features:**

- Displays a sentence with a visual blank to fill in
- Text input for entering the answer
- Submit via button click or Enter key
- Real-time feedback showing correct/incorrect status
- Displays correct answer if user is wrong
- Optional explanation text
- Case-insensitive answer matching
- Auto-advances after correct answer (2-second delay)
- Dark mode support

**Props:**

```typescript
interface FillInTheBlankProps {
  exercise: Exercise; // Exercise data with config
  onComplete: (result: ExerciseResult) => void; // Callback when exercise is done
  isLoading?: boolean; // Optional loading state
}
```

**Example Usage:**

```tsx
<FillInTheBlank
  exercise={exercise}
  onComplete={(result) => {
    console.log(`Score: ${result.score}/${result.maxScore}`);
    // Advance to next exercise
  }}
/>
```

**Configuration (FillBlankConfig):**

```typescript
{
  sentence: string           // Sentence with _____ placeholder
  correctAnswers: string[]   // Array of acceptable answers (case-insensitive)
  alternatives?: string[]    // Alternative correct answers (e.g., contractions)
  explanation?: string       // Optional explanation shown after submission
}
```

**Result Feedback:**
After submission, the component displays:

- ✓ Correct / ✗ Incorrect status
- Points earned (e.g., 10/10)
- The correct answer (if incorrect)
- Optional explanation (if provided)
- Input field highlighted in green (correct) or red (incorrect)

### ExerciseRenderer

A router component that delegates to the correct exercise component by type.

**Features:**

- Accepts an `Exercise` object with any config type
- Switches on `exercise.type` to render the appropriate component
- Passes through `onComplete` callback unchanged
- Graceful fallback UI for unimplemented exercise types
- Handles unknown/invalid exercise types with error message

**Props:**

```typescript
interface ExerciseRendererProps {
  exercise: Exercise; // Exercise data with any config type
  onComplete: (result: ExerciseResult) => void; // Callback when exercise is done
  isLoading?: boolean; // Optional loading state
}
```

**Example Usage:**

```tsx
<ExerciseRenderer
  exercise={exercise}
  onComplete={(result) => {
    // Handle exercise completion (advance to next, update progress, etc)
  }}
/>
```

**Component Coverage:**

- ✓ `MultipleChoice` — Fully implemented
- ✓ `FillBlank` — Fully implemented
- ⏳ `WordScramble` — Coming soon (shows friendly placeholder)
- ⏳ `FlashcardMatch` — Coming soon (shows friendly placeholder)
- ⏳ `FreeResponse` — Coming soon (shows friendly placeholder)

**Error Handling:**

- Unknown exercise types show an error message with the unrecognized type
- Placeholders for unimplemented types appear in-flow during lessons
- All fallback UI matches the overall exercise styling (dark mode compatible)

## Styling

All components use **Tailwind CSS v4** with:

- Dark mode support via `dark:` classes
- Semantic color system (foreground, background, border, etc.)
- Lucide React icons for visual feedback
- Smooth transitions and animations

## API Integration

Components submit answers to the API endpoint:

```
POST /api/exercises/{id}/submit
```

Payload format depends on exercise type (discriminated union by `ExerciseSubmission`).

Response format:

```typescript
{
  correct: boolean
  score: number           // Points earned
  maxScore: number        // Total possible points
  correctAnswer?: string  // Shown if incorrect
  explanation?: string    // Detailed explanation
  timeTaken?: number      // Time spent in milliseconds
}
```

## Error Handling

Components handle:

- Network errors with user-friendly messages
- Validation errors (e.g., "Please select an answer")
- API errors with fallback messages
- Loading states with spinner indicators

## Accessibility

- Full keyboard navigation support
- ARIA labels on interactive elements
- Focus indicators for keyboard users
- Proper semantic HTML
- Color contrast ratios meet WCAG AA standards

## Next Steps

Future exercise components to implement:

- `WordScramble.tsx` — Letter rearrangement game
- `FlashcardMatch.tsx` — Card matching mini-game
- `FreeResponse.tsx` — Open-ended text response

The `ExerciseRenderer.tsx` router component now delegates to exercise components by type and gracefully handles unimplemented types with friendly placeholder UI.
