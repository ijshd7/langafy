/**
 * Time bonus calculation.
 * Returns a bonus multiplier between 0 and 1 based on how quickly the user finished.
 * @param elapsedMs - Time taken in milliseconds
 * @param timeLimitMs - Maximum allowed time in milliseconds
 */
export function calculateTimeBonus(elapsedMs: number, timeLimitMs: number): number {
  if (timeLimitMs <= 0) return 0;
  const ratio = Math.max(0, 1 - elapsedMs / timeLimitMs);
  return Math.round(ratio * 100) / 100;
}

/**
 * Accuracy multiplier based on number of mistakes made during a game.
 * 0 mistakes → 1.0x, 1 mistake → 0.8x, 2 mistakes → 0.6x, 3+ → 0.5x (floor)
 */
export function calculateAccuracyMultiplier(mistakes: number): number {
  if (mistakes === 0) return 1.0;
  if (mistakes === 1) return 0.8;
  if (mistakes === 2) return 0.6;
  return 0.5;
}

/**
 * Computes the final score for a game session.
 * @param basePoints - Points from the exercise config
 * @param timeBonus - 0 to 1 multiplier from calculateTimeBonus
 * @param accuracyMultiplier - from calculateAccuracyMultiplier
 * @param timeBonusWeight - how much of the base points can be added as a time bonus (default 0.5)
 */
export function calculateFinalScore(
  basePoints: number,
  timeBonus: number,
  accuracyMultiplier: number,
  timeBonusWeight = 0.5
): number {
  const timeBonusPoints = Math.round(basePoints * timeBonusWeight * timeBonus);
  const total = Math.round((basePoints + timeBonusPoints) * accuracyMultiplier);
  return Math.max(0, total);
}
