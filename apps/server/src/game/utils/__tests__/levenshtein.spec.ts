import { levenshteinDistance } from '../levenshtein';

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
  });

  it('returns 0 for two empty strings', () => {
    expect(levenshteinDistance('', '')).toBe(0);
  });

  it('returns the length of the non-empty string when one side is empty', () => {
    expect(levenshteinDistance('', 'cat')).toBe(3);
    expect(levenshteinDistance('horse', '')).toBe(5);
  });

  it('counts a single insertion as distance 1', () => {
    expect(levenshteinDistance('cat', 'cats')).toBe(1);
  });

  it('counts a single deletion as distance 1', () => {
    expect(levenshteinDistance('cats', 'cat')).toBe(1);
  });

  it('counts a single substitution as distance 1', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1);
  });

  it('handles the classic kitten/sitting case (distance 3)', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  it('handles longer strings with multiple edits', () => {
    // saturday -> sunday: delete 'a', delete 't', substitute 'r'->'n' = 3
    expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
  });

  it('is symmetric in its arguments', () => {
    expect(levenshteinDistance('horse', 'ros')).toBe(levenshteinDistance('ros', 'horse'));
  });

  it('treats character case as different (case-sensitive)', () => {
    expect(levenshteinDistance('Cat', 'cat')).toBe(1);
  });
});
