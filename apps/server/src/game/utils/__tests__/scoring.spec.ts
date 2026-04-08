import { calculateGuessScore, calculateDrawerScore } from '../scoring';

describe('scoring', () => {
  describe('calculateGuessScore', () => {
    it('awards full multiplier (1.0) to the 1st guesser with full speed bonus', () => {
      // base = 80 * 1.0 = 80, speedBonus = (80/80)*50 = 50, total = 130
      expect(calculateGuessScore(1, 80, 80)).toBe(130);
    });

    it('awards 0.8 multiplier to the 2nd guesser', () => {
      // base = 80 * 0.8 = 64, speedBonus = (40/80)*50 = 25, total = 89
      expect(calculateGuessScore(2, 40, 80)).toBe(89);
    });

    it('awards 0.5 multiplier to the 3rd guesser', () => {
      // base = 80 * 0.5 = 40, speedBonus = (40/80)*50 = 25, total = 65
      expect(calculateGuessScore(3, 40, 80)).toBe(65);
    });

    it('awards 0.5 multiplier for any position beyond 3rd', () => {
      // base = 100 * 0.5 = 50, speedBonus = (50/100)*50 = 25, total = 75
      expect(calculateGuessScore(7, 50, 100)).toBe(75);
    });

    it('returns only base score when timeLeft is 0 (no speed bonus)', () => {
      // base = 60 * 1.0 = 60, speedBonus = 0, total = 60
      expect(calculateGuessScore(1, 0, 60)).toBe(60);
    });

    it('rounds the final value to the nearest integer', () => {
      // base = 80 * 0.8 = 64, speedBonus = (33/80)*50 = 20.625, total = 84.625 -> 85
      expect(calculateGuessScore(2, 33, 80)).toBe(85);
    });
  });

  describe('calculateDrawerScore', () => {
    it('returns roundTime when all players guessed correctly', () => {
      expect(calculateDrawerScore(4, 4, 80)).toBe(80);
    });

    it('returns 0 when no players guessed correctly', () => {
      expect(calculateDrawerScore(0, 4, 80)).toBe(0);
    });

    it('returns proportional roundTime when some players guessed', () => {
      // (2/4) * 80 = 40
      expect(calculateDrawerScore(2, 4, 80)).toBe(40);
    });

    it('returns 0 when totalPlayers is 0 (avoids divide-by-zero)', () => {
      expect(calculateDrawerScore(0, 0, 80)).toBe(0);
    });

    it('returns 0 when totalPlayers is negative', () => {
      expect(calculateDrawerScore(2, -1, 80)).toBe(0);
    });

    it('rounds non-integer results to the nearest integer', () => {
      // (1/3) * 80 = 26.666... -> 27
      expect(calculateDrawerScore(1, 3, 80)).toBe(27);
    });
  });
});
