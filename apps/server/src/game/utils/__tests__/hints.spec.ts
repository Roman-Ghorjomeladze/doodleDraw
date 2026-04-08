import { generateHint, revealLetter } from '../hints';

describe('hints', () => {
  describe('generateHint', () => {
    it('replaces every letter with an underscore separated by spaces', () => {
      expect(generateHint('cat')).toBe('_ _ _');
    });

    it('returns an empty string for an empty word', () => {
      expect(generateHint('')).toBe('');
    });

    it('produces a single underscore for a one-letter word', () => {
      expect(generateHint('a')).toBe('_');
    });

    it('preserves spaces in multi-word phrases as a double space', () => {
      // 'ice cream' -> '_ _ _' + ' ' + '  ' + ' ' + '_ _ _ _ _'
      const hint = generateHint('ice cream');
      expect(hint).toContain('   '); // at least three spaces between word groups
      // Total length: 9 chars in word, joined with separators per char
      expect(hint.length).toBeGreaterThan('_ _ _'.length + '_ _ _ _ _'.length);
    });

    it('treats special characters the same as letters (single underscore)', () => {
      expect(generateHint("o'k")).toBe('_ _ _');
    });
  });

  describe('revealLetter', () => {
    let randomSpy: jest.SpyInstance;

    afterEach(() => {
      if (randomSpy) randomSpy.mockRestore();
    });

    it('reveals exactly one letter from the word', () => {
      randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0); // pick first unrevealed
      const hint = generateHint('cat');
      const next = revealLetter(hint, 'cat');
      expect(next).toBe('c _ _');
    });

    it('reveals the chosen letter at the random index', () => {
      randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5); // middle index
      const hint = generateHint('cat'); // 3 unrevealed letters; floor(0.5*3)=1
      const next = revealLetter(hint, 'cat');
      expect(next).toBe('_ a _');
    });

    it('does not pick an already-revealed letter on the next call', () => {
      // First call: pick index 0 -> reveal 'c'
      randomSpy = jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0);
      const hint = generateHint('cat');
      const after1 = revealLetter(hint, 'cat');
      expect(after1).toBe('c _ _');

      // Second call: only 2 unrevealed left ('a','t'); index 0 -> reveal 'a'
      const after2 = revealLetter(after1, 'cat');
      expect(after2).toBe('c a _');
    });

    it('returns the input unchanged when the hint is fully revealed', () => {
      randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
      // Fully revealed hint for 'ab'
      const fully = 'a b';
      expect(revealLetter(fully, 'ab')).toBe(fully);
    });

    it('eventually reveals all letters across repeated calls', () => {
      randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
      let hint = generateHint('ab');
      hint = revealLetter(hint, 'ab');
      hint = revealLetter(hint, 'ab');
      expect(hint).toBe('a b');
    });

    it('reveals letters one at a time and produces the final word in 3 calls for "cat"', () => {
      randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
      let hint = generateHint('cat');
      hint = revealLetter(hint, 'cat');
      hint = revealLetter(hint, 'cat');
      hint = revealLetter(hint, 'cat');
      expect(hint).toBe('c a t');
    });

    it('handles a single-letter word correctly', () => {
      randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
      const hint = generateHint('x');
      expect(revealLetter(hint, 'x')).toBe('x');
    });
  });
});
