/**
 * Compute the Levenshtein (edit) distance between two strings.
 * Uses the classic dynamic-programming matrix approach (O(m*n)).
 */
export function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  // Use a single-row optimisation to reduce memory from O(m*n) to O(min(m,n)).
  // Work with the shorter string as columns.
  const [short, long] =
    aLen <= bLen ? [a, b] : [b, a];
  const shortLen = short.length;
  const longLen = long.length;

  let prevRow = new Array<number>(shortLen + 1);
  for (let j = 0; j <= shortLen; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= longLen; i++) {
    const currRow = new Array<number>(shortLen + 1);
    currRow[0] = i;

    for (let j = 1; j <= shortLen; j++) {
      const cost = long[i - 1] === short[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1,       // insertion
        prevRow[j] + 1,           // deletion
        prevRow[j - 1] + cost,    // substitution
      );
    }

    prevRow = currRow;
  }

  return prevRow[shortLen];
}
