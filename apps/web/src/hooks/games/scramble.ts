/**
 * Scrambles an array using Fisher-Yates shuffle.
 * Guarantees the result is different from the input when length > 1.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Scrambles the letters of a word, ensuring the result differs from the original.
 * Returns an array of individual letter strings for use as draggable tiles.
 */
export function scrambleWord(word: string): string[] {
  const letters = word.split('');
  if (letters.length <= 1) return letters;

  let scrambled = shuffleArray(letters);
  // Re-shuffle until the result differs from the original
  let attempts = 0;
  while (scrambled.join('') === word && attempts < 10) {
    scrambled = shuffleArray(letters);
    attempts++;
  }
  return scrambled;
}

/**
 * Checks whether a proposed answer matches the target word (case-insensitive, trimmed).
 */
export function isWordMatch(answer: string, target: string): boolean {
  return answer.trim().toLowerCase() === target.trim().toLowerCase();
}
