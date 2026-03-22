/**
 * Maps game words (any language) to Google Quick Draw dataset categories.
 *
 * Auto-built from the bot-words seed data so there's a single source of truth.
 * Words not in this map will use a fallback generic drawing.
 */

import { BOT_WORDS } from '../../database/seeds/bot-words';

// Build the mapping from bot words — maps every language variant to its Quick Draw category
const WORD_TO_QUICKDRAW = new Map<string, string>();

for (const entry of BOT_WORDS) {
  const qd = entry.quickDraw;
  // Map all language variants
  for (const lang of ['en', 'ka', 'ru', 'tr'] as const) {
    const word = entry[lang];
    if (word) {
      WORD_TO_QUICKDRAW.set(word.toLowerCase(), qd);
    }
  }
  // Also map the Quick Draw category itself
  WORD_TO_QUICKDRAW.set(qd.toLowerCase(), qd);
}

/**
 * Get the Quick Draw category for a given game word (any language).
 * Returns null if no mapping is found.
 */
export function getQuickDrawCategory(word: string): string | null {
  const lower = word.toLowerCase().trim();
  return WORD_TO_QUICKDRAW.get(lower) ?? null;
}

/**
 * Fallback strokes when no Quick Draw data is available.
 * Draws a simple "?" question mark shape.
 */
export function getFallbackStrokes(): number[][][] {
  return [
    // Question mark curve
    [
      [100, 110, 130, 150, 160, 155, 140, 128, 128],
      [60, 45, 40, 50, 70, 90, 105, 115, 135],
    ],
    // Dot
    [
      [128, 128],
      [150, 155],
    ],
  ];
}
