/**
 * Elo rating system with asymmetric K-factor below 1800.
 *
 * - Default rating: 1200
 * - Below 1800: easier to gain, harder to lose (encourages new players)
 * - Above 1800: standard symmetric Elo
 *
 * K-factor scaling:
 * - Below 1800: K_WIN = 40 (gain more for winning), K_LOSS = 20 (lose less for losing)
 * - 1800+: K = 24 (standard symmetric)
 *
 * Expected score uses standard Elo formula: E = 1 / (1 + 10^((Rb - Ra) / 400))
 */

const DEFAULT_RATING = 1200;
const ASYMMETRIC_THRESHOLD = 1800;

// K-factors
const K_BELOW_WIN = 40;   // Generous gains below threshold
const K_BELOW_LOSS = 20;  // Smaller losses below threshold
const K_ABOVE = 24;       // Standard symmetric above threshold

/**
 * Calculate the expected score (probability of winning) for player A against player B.
 */
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate Elo rating change for a player after a game.
 *
 * @param currentRating - The player's current Elo rating
 * @param opponentRating - The average Elo of opponents
 * @param won - Whether the player won
 * @returns The new Elo rating (never drops below 100)
 */
export function calculateEloChange(
  currentRating: number,
  opponentRating: number,
  won: boolean,
  multiplier: number = 1.0,
): number {
  const expected = expectedScore(currentRating, opponentRating);
  const actual = won ? 1 : 0;

  let k: number;
  if (currentRating < ASYMMETRIC_THRESHOLD) {
    // Below threshold: asymmetric — easier to gain, harder to lose.
    k = won ? K_BELOW_WIN : K_BELOW_LOSS;
  } else {
    // Above threshold: standard symmetric.
    k = K_ABOVE;
  }

  // Apply multiplier (e.g. 0.5 for bot games).
  k *= multiplier;

  const change = Math.round(k * (actual - expected));
  const newRating = currentRating + change;

  // Floor at 100 to prevent negative or near-zero ratings.
  return Math.max(100, newRating);
}

/**
 * Calculate Elo changes for all players in a game.
 * The winner gains rating, all losers lose rating.
 * Opponent rating is the average of all other players' ratings.
 *
 * @param players - Array of { persistentId, eloRating, isWinner, isBot }
 * @returns Map of persistentId → new Elo rating
 */
export function calculateGameElo(
  players: { persistentId: string; eloRating: number; isWinner: boolean; isBot?: boolean }[],
): Map<string, number> {
  const result = new Map<string, number>();

  if (players.length < 2) {
    // Not enough players for meaningful Elo — return unchanged.
    for (const p of players) {
      result.set(p.persistentId, p.eloRating);
    }
    return result;
  }

  const hasBots = players.some((p) => p.isBot);

  for (const player of players) {
    if (player.isBot) {
      result.set(player.persistentId, player.eloRating);
      continue;
    }

    // Above 1800, bot games don't affect rating at all.
    if (hasBots && player.eloRating >= ASYMMETRIC_THRESHOLD) {
      result.set(player.persistentId, player.eloRating);
      continue;
    }

    const botMultiplier = hasBots ? 0.25 : 1.0;

    // Average opponent rating (everyone else).
    const opponents = players.filter((p) => p.persistentId !== player.persistentId);
    const avgOpponentRating =
      opponents.reduce((sum, p) => sum + p.eloRating, 0) / opponents.length;

    const newRating = calculateEloChange(
      player.eloRating,
      avgOpponentRating,
      player.isWinner,
      botMultiplier,
    );

    result.set(player.persistentId, newRating);
  }

  return result;
}

export { DEFAULT_RATING };
