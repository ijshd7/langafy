/**
 * Centralized selector constants for E2E regression tests.
 *
 * These use Playwright locator-compatible patterns (getByRole, getByLabel, etc.)
 * to avoid brittle string duplication across test files.
 */

export const SEL = {
  // ─── Auth ─────────────────────────────────────────────────────────────────
  emailInput: 'Email address',
  passwordInput: 'Password',
  confirmPasswordInput: 'Confirm password',

  // ─── Lesson ───────────────────────────────────────────────────────────────
  submitAnswerButton: 'Submit Answer',
  continueButton: 'Continue',
  correctFeedback: '✓ Correct!',
  incorrectFeedback: '✗ Incorrect',
  lessonComplete: 'Lesson Complete!',
  returnToDashboard: 'Return to Dashboard',

  // ─── Vocabulary ───────────────────────────────────────────────────────────
  searchPlaceholder: 'Search by word or translation...',

  // ─── Conversation ─────────────────────────────────────────────────────────
  conversationHeading: 'AI Conversation Practice',
  startConversation: 'Start a conversation',
  newConversationHeading: 'New Conversation',
  messagePlaceholder: 'Type a message… (Enter to send, Shift+Enter for new line)',
} as const;
