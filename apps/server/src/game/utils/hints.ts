/**
 * Generate an initial hint string from a word.
 * Letters are replaced with underscores; spaces are preserved.
 *
 * Example: "ice cream" -> "_ _ _   _ _ _ _ _"
 * Each underscore represents one letter, separated by spaces for readability.
 * Multi-word phrases keep the space boundary visible (double space between words).
 */
export function generateHint(word: string): string {
  return word
    .split('')
    .map((ch) => (ch === ' ' ? '  ' : '_'))
    .join(' ');
}

/**
 * Reveal one random unrevealed letter in the current hint.
 * Returns the updated hint string.
 *
 * The hint format uses underscore `_` for hidden letters, separated by spaces.
 * Spaces in the original word appear as double-space `  `.
 */
export function revealLetter(currentHint: string, word: string): string {
  // Build arrays of hint characters and word characters aligned by index.
  const hintParts = currentHint.split(' ');
  const wordChars: string[] = [];

  // Map hint parts back to word characters.
  // Each hint part is either '_' (hidden letter), a revealed letter, or '' (space in word).
  for (const ch of word) {
    if (ch === ' ') {
      wordChars.push(' ');
    } else {
      wordChars.push(ch);
    }
  }

  // Find indices of unrevealed letters (still showing as '_' in hint parts).
  const unrevealedIndices: number[] = [];

  // Map word character indices to hint part indices.
  let hintIdx = 0;
  for (let wordIdx = 0; wordIdx < word.length; wordIdx++) {
    if (word[wordIdx] === ' ') {
      // Spaces produce an empty string between two spaces in the hint.
      // In our format: "_ _   _ _" -- the double space produces ['_', '_', '', '_', '_']
      // Skip the empty part representing space.
      hintIdx++; // skip the empty part
      continue;
    }

    if (hintIdx < hintParts.length && hintParts[hintIdx] === '_') {
      unrevealedIndices.push(wordIdx);
    }
    hintIdx++;
  }

  if (unrevealedIndices.length === 0) {
    return currentHint;
  }

  // Pick a random unrevealed index.
  const randomIdx =
    unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];

  // Rebuild the hint with the chosen letter revealed.
  const result: string[] = [];
  let charIndex = 0;

  for (let i = 0; i < word.length; i++) {
    if (word[i] === ' ') {
      result.push(' ');
      continue;
    }

    if (i === randomIdx) {
      result.push(word[i]);
    } else {
      // Preserve whatever was already revealed.
      // Find the corresponding hint part.
      const existingHintPart = hintParts[charIndex];
      if (existingHintPart && existingHintPart !== '_') {
        result.push(existingHintPart);
      } else {
        result.push('_');
      }
    }
    charIndex++;
  }

  // Reconstruct in the same format: letters/underscores separated by single space,
  // word boundaries as double space.
  return result
    .map((ch) => (ch === ' ' ? ' ' : ch))
    .join(' ');
}
