/**
 * Calculate the score awarded to a guesser based on their position (1-indexed)
 * and how quickly they guessed.
 *
 * Position multipliers:
 *   1st guesser  -> 1.0  (full roundTime)
 *   2nd guesser  -> 0.8
 *   3rd or later -> 0.5
 *
 * Speed bonus: (timeLeft / roundTime) * 50
 */
export function calculateGuessScore(
  position: number,
  timeLeft: number,
  roundTime: number,
): number {
  let multiplier: number;

  if (position === 1) {
    multiplier = 1.0;
  } else if (position === 2) {
    multiplier = 0.8;
  } else {
    multiplier = 0.5;
  }

  const baseScore = roundTime * multiplier;
  const speedBonus = (timeLeft / roundTime) * 50;

  return Math.round(baseScore + speedBonus);
}

/**
 * Calculate the score awarded to the drawer based on how many players
 * guessed correctly.
 *
 * Formula: (correctGuessers / totalPlayers) * roundTime
 * totalPlayers should exclude the drawer.
 */
export function calculateDrawerScore(
  correctGuessers: number,
  totalPlayers: number,
  roundTime: number,
): number {
  if (totalPlayers <= 0) return 0;
  return Math.round((correctGuessers / totalPlayers) * roundTime);
}
