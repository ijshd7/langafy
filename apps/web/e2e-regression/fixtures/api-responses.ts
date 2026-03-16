/**
 * Mock API response factories for E2E regression tests.
 *
 * Each factory returns data matching the actual API DTO shapes,
 * with sensible defaults that can be overridden.
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function buildAuthSyncResponse(overrides?: Record<string, unknown>) {
  return {
    id: 'user-1',
    email: 'testuser@example.com',
    displayName: 'Test User',
    activeLanguage: 'es',
    cefrLevel: 'A1',
    isFirstSync: false,
    ...overrides,
  };
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export function buildProgressResponse(overrides?: Record<string, unknown>) {
  return {
    languageCode: 'es',
    languageName: 'Spanish',
    currentCefrLevel: 'A1',
    totalExercisesCompleted: 5,
    totalExercisesAttempted: 8,
    totalPointsEarned: 150,
    currentStreak: 3,
    longestStreak: 7,
    overallCompletionPercentage: 25,
    lastActivityAt: new Date().toISOString(),
    levels: [
      {
        id: 1,
        code: 'A1',
        name: 'Beginner',
        totalUnits: 2,
        completedUnits: 0,
        completionPercentage: 25,
        pointsEarned: 150,
        maxPoints: 600,
        units: [
          {
            id: 1,
            title: 'Greetings & Introductions',
            description: 'Learn basic greetings and how to introduce yourself',
            totalLessons: 2,
            completedLessons: 1,
            completionPercentage: 50,
            pointsEarned: 100,
            maxPoints: 200,
            lessons: [
              {
                id: 1,
                title: 'Basic Greetings',
                totalExercises: 4,
                completedExercises: 4,
                completionPercentage: 100,
                pointsEarned: 100,
                maxPoints: 100,
              },
              {
                id: 2,
                title: 'Introducing Yourself',
                totalExercises: 4,
                completedExercises: 1,
                completionPercentage: 25,
                pointsEarned: 50,
                maxPoints: 100,
              },
            ],
          },
          {
            id: 2,
            title: 'Numbers & Counting',
            description: 'Master numbers from 1 to 100',
            totalLessons: 1,
            completedLessons: 0,
            completionPercentage: 0,
            pointsEarned: 0,
            maxPoints: 200,
            lessons: [
              {
                id: 3,
                title: 'Numbers 1-20',
                totalExercises: 5,
                completedExercises: 0,
                completionPercentage: 0,
                pointsEarned: 0,
                maxPoints: 100,
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

export function buildProgressResponseEmpty() {
  return buildProgressResponse({
    totalExercisesCompleted: 0,
    totalExercisesAttempted: 0,
    totalPointsEarned: 0,
    currentStreak: 0,
    longestStreak: 0,
    overallCompletionPercentage: 0,
    lastActivityAt: null,
    levels: [],
  });
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

export function buildMultipleChoiceLesson(lessonId: string) {
  return {
    id: lessonId,
    title: 'Basic Greetings',
    description: 'Learn basic Spanish greetings',
    objective: 'Greet people in Spanish',
    unit: {
      id: 1,
      title: 'Greetings & Introductions',
      cefrLevel: { code: 'A1' },
    },
    completionPercentage: 0,
    exercises: [
      {
        id: 'mc-exercise-1',
        lessonId,
        type: 'MultipleChoice',
        sortOrder: 1,
        points: 10,
        config: {
          question: 'How do you say "Hello" in Spanish?',
          options: ['Hola', 'Adiós', 'Gracias', 'Por favor'],
          correctIndex: 0,
          explanation: '"Hola" means "Hello" in Spanish.',
        },
      },
    ],
  };
}

export function buildFillBlankLesson(lessonId: string) {
  return {
    id: lessonId,
    title: 'Common Phrases',
    description: 'Learn everyday Spanish phrases',
    objective: 'Complete common Spanish expressions',
    unit: {
      id: 1,
      title: 'Greetings & Introductions',
      cefrLevel: { code: 'A1' },
    },
    completionPercentage: 0,
    exercises: [
      {
        id: 'fb-exercise-1',
        lessonId,
        type: 'FillBlank',
        sortOrder: 1,
        points: 10,
        config: {
          sentence: 'Buenos _____, ¿cómo estás?',
          correctAnswer: 'días',
          alternatives: ['dias'],
          explanation: '"Buenos días" means "Good morning" in Spanish.',
        },
      },
    ],
  };
}

export function buildWordScrambleLesson(lessonId: string) {
  return {
    id: lessonId,
    title: 'Word Games',
    description: 'Unscramble Spanish words',
    objective: 'Practice spelling Spanish words',
    unit: {
      id: 1,
      title: 'Greetings & Introductions',
      cefrLevel: { code: 'A1' },
    },
    completionPercentage: 0,
    exercises: [
      {
        id: 'ws-exercise-1',
        lessonId,
        type: 'WordScramble',
        sortOrder: 1,
        points: 15,
        config: {
          targetWord: 'hola',
          hint: 'A common greeting',
          explanation: '"Hola" means "Hello" in Spanish.',
        },
      },
    ],
  };
}

export function buildFlashcardMatchLesson(lessonId: string) {
  return {
    id: lessonId,
    title: 'Matching Game',
    description: 'Match Spanish words with their English translations',
    objective: 'Practice vocabulary through matching',
    unit: {
      id: 1,
      title: 'Greetings & Introductions',
      cefrLevel: { code: 'A1' },
    },
    completionPercentage: 0,
    exercises: [
      {
        id: 'fm-exercise-1',
        lessonId,
        type: 'FlashcardMatch',
        sortOrder: 1,
        points: 20,
        config: {
          pairs: [
            { target: 'hola', english: 'hello' },
            { target: 'adiós', english: 'goodbye' },
            { target: 'gracias', english: 'thank you' },
          ],
          timeLimit: 60,
        },
      },
    ],
  };
}

export function buildMixedLesson(lessonId: string) {
  return {
    id: lessonId,
    title: 'Mixed Exercises',
    description: 'Practice with different exercise types',
    objective: 'Master basic greetings through varied exercises',
    unit: {
      id: 1,
      title: 'Greetings & Introductions',
      cefrLevel: { code: 'A1' },
    },
    completionPercentage: 0,
    exercises: [
      {
        id: 'mixed-mc-1',
        lessonId,
        type: 'MultipleChoice',
        sortOrder: 1,
        points: 10,
        config: {
          question: 'How do you say "Hello" in Spanish?',
          options: ['Hola', 'Adiós', 'Gracias', 'Por favor'],
          correctIndex: 0,
          explanation: '"Hola" means "Hello" in Spanish.',
        },
      },
      {
        id: 'mixed-fb-1',
        lessonId,
        type: 'FillBlank',
        sortOrder: 2,
        points: 10,
        config: {
          sentence: 'Buenos _____, ¿cómo estás?',
          correctAnswer: 'días',
          alternatives: ['dias'],
          explanation: '"Buenos días" means "Good morning" in Spanish.',
        },
      },
    ],
  };
}

// ─── Exercise Submit ──────────────────────────────────────────────────────────

export function buildExerciseSubmitCorrect(points: number = 10) {
  return {
    isCorrect: true,
    score: points,
    pointsEarned: points,
    feedback: 'Correct!',
    explanation: 'Well done!',
  };
}

export function buildExerciseSubmitIncorrect(
  correctAnswer: string = 'Hola',
  explanation: string = 'The correct answer is "Hola".'
) {
  return {
    isCorrect: false,
    score: 0,
    pointsEarned: 0,
    correctAnswer,
    feedback: 'Incorrect.',
    explanation,
  };
}

// ─── Vocabulary ───────────────────────────────────────────────────────────────

export function buildVocabularyListResponse(overrides?: Record<string, unknown>) {
  return {
    items: [
      {
        id: 1,
        wordTarget: 'hola',
        wordEn: 'hello',
        partOfSpeech: 'interjection',
        exampleSentenceTarget: '¡Hola! ¿Cómo estás?',
        exampleSentenceEn: 'Hello! How are you?',
        cefrLevel: 'A1',
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: null,
        isDueForReview: false,
      },
      {
        id: 2,
        wordTarget: 'adiós',
        wordEn: 'goodbye',
        partOfSpeech: 'interjection',
        exampleSentenceTarget: 'Adiós, nos vemos mañana.',
        exampleSentenceEn: 'Goodbye, see you tomorrow.',
        cefrLevel: 'A1',
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: null,
        isDueForReview: false,
      },
      {
        id: 3,
        wordTarget: 'gracias',
        wordEn: 'thank you',
        partOfSpeech: 'noun',
        exampleSentenceTarget: 'Muchas gracias por tu ayuda.',
        exampleSentenceEn: 'Thank you very much for your help.',
        cefrLevel: 'A1',
        easeFactor: 2.3,
        intervalDays: 3,
        repetitions: 2,
        nextReviewAt: new Date().toISOString(),
        isDueForReview: true,
      },
      {
        id: 4,
        wordTarget: 'por favor',
        wordEn: 'please',
        partOfSpeech: 'phrase',
        exampleSentenceTarget: 'Un café, por favor.',
        exampleSentenceEn: 'A coffee, please.',
        cefrLevel: 'A1',
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: null,
        isDueForReview: false,
      },
      {
        id: 5,
        wordTarget: 'buenos días',
        wordEn: 'good morning',
        partOfSpeech: 'phrase',
        exampleSentenceTarget: 'Buenos días, señor García.',
        exampleSentenceEn: 'Good morning, Mr. García.',
        cefrLevel: 'A1',
        easeFactor: 2.1,
        intervalDays: 2,
        repetitions: 1,
        nextReviewAt: new Date().toISOString(),
        isDueForReview: true,
      },
    ],
    totalCount: 5,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    ...overrides,
  };
}

export function buildVocabularyDueResponse(count: number = 3) {
  const allItems = buildVocabularyListResponse().items.map((item) => ({
    ...item,
    isDueForReview: true,
    nextReviewAt: new Date().toISOString(),
  }));
  return {
    items: allItems.slice(0, count),
    totalCount: count,
    page: 1,
    pageSize: 100,
    totalPages: 1,
  };
}

export function buildVocabularyEmptyResponse() {
  return {
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  };
}

export function buildVocabularyReviewResponse() {
  return { success: true };
}

// ─── Conversations ────────────────────────────────────────────────────────────

export function buildConversationListResponse(
  conversations?: Array<Record<string, unknown>>
) {
  const defaultConversations = [
    {
      id: 1,
      languageCode: 'es',
      languageName: 'Spanish',
      cefrLevel: 'A1',
      topic: 'Greetings & introductions',
      lessonId: null,
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
      messageCount: 4,
    },
    {
      id: 2,
      languageCode: 'es',
      languageName: 'Spanish',
      cefrLevel: 'A1',
      topic: 'Ordering food at a restaurant',
      lessonId: null,
      createdAt: new Date(Date.now() - 86400_000).toISOString(),
      messageCount: 8,
    },
  ];

  return {
    items: conversations ?? defaultConversations,
    total: (conversations ?? defaultConversations).length,
    page: 1,
    pageSize: 50,
  };
}

export function buildConversationListEmpty() {
  return buildConversationListResponse([]);
}

export function buildConversationDetailResponse(
  id: number = 1,
  messages?: Array<Record<string, unknown>>
) {
  return {
    id,
    languageCode: 'es',
    languageName: 'Spanish',
    cefrLevel: 'A1',
    topic: 'Greetings & introductions',
    lessonId: null,
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    messages: messages ?? [
      {
        id: 1,
        role: 'assistant',
        content: '¡Hola! Soy tu tutor de español. ¿Cómo te llamas?',
        createdAt: new Date(Date.now() - 3500_000).toISOString(),
      },
      {
        id: 2,
        role: 'user',
        content: 'Me llamo Test User.',
        createdAt: new Date(Date.now() - 3400_000).toISOString(),
      },
    ],
  };
}

export function buildNewConversationResponse(topic: string = 'General conversation') {
  return {
    id: 99,
    languageCode: 'es',
    languageName: 'Spanish',
    cefrLevel: 'A1',
    topic,
    lessonId: null,
    createdAt: new Date().toISOString(),
    messages: [],
  };
}

// ─── Units ────────────────────────────────────────────────────────────────────

export function buildUnitsResponse() {
  return [
    {
      id: 1,
      title: 'Greetings & Introductions',
      description: 'Learn basic greetings and how to introduce yourself',
      sortOrder: 1,
      cefrLevel: { id: 1, code: 'A1', name: 'Beginner' },
    },
    {
      id: 2,
      title: 'Numbers & Counting',
      description: 'Master numbers from 1 to 100',
      sortOrder: 2,
      cefrLevel: { id: 1, code: 'A1', name: 'Beginner' },
    },
  ];
}
