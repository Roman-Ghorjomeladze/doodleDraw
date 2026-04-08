import { calculateEloChange, calculateGameElo } from '../elo';

describe('elo', () => {
  describe('calculateEloChange', () => {
    it('awards K_BELOW_WIN (40) gain for a win against an equal opponent below threshold', () => {
      // expected = 0.5, change = 40 * (1 - 0.5) = 20
      expect(calculateEloChange(1200, 1200, true)).toBe(1220);
    });

    it('applies the smaller K_BELOW_LOSS (20) penalty when losing below threshold', () => {
      // expected = 0.5, change = 20 * (0 - 0.5) = -10
      expect(calculateEloChange(1200, 1200, false)).toBe(1190);
    });

    it('uses standard symmetric K_ABOVE (24) at or above threshold for a win', () => {
      // 24 * (1 - 0.5) = 12
      expect(calculateEloChange(2000, 2000, true)).toBe(2012);
    });

    it('uses standard symmetric K_ABOVE (24) at or above threshold for a loss', () => {
      // 24 * (0 - 0.5) = -12
      expect(calculateEloChange(2000, 2000, false)).toBe(1988);
    });

    it('floors the resulting rating at 100', () => {
      // 110 vs 110, lose: change = -10, raw = 100, floor enforced
      expect(calculateEloChange(110, 110, false)).toBe(100);
    });

    it('does not return ratings below 100 even with extreme losses', () => {
      // a 200 player losing to a 200 opponent: 20 * (0 - 0.5) = -10 -> 190
      // ensure no clamp errors above floor
      expect(calculateEloChange(200, 200, false)).toBeGreaterThanOrEqual(100);
    });

    it('applies a multiplier (e.g. 0.25 for bot games) to scale the K-factor', () => {
      // K = 40, multiplier = 0.25 -> effective 10, change = 10 * 0.5 = 5
      expect(calculateEloChange(1200, 1200, true, 0.25)).toBe(1205);
    });

    it('rewards more elo for beating a higher-rated opponent below threshold', () => {
      const winVsHigher = calculateEloChange(1200, 1600, true) - 1200;
      const winVsEqual = calculateEloChange(1200, 1200, true) - 1200;
      expect(winVsHigher).toBeGreaterThan(winVsEqual);
    });
  });

  describe('calculateGameElo', () => {
    it('returns ratings unchanged when fewer than 2 players are present', () => {
      const result = calculateGameElo([
        { persistentId: 'a', eloRating: 1234, isWinner: true },
      ]);
      expect(result.get('a')).toBe(1234);
    });

    it('updates winner and loser ratings in a 2-player human game', () => {
      const result = calculateGameElo([
        { persistentId: 'a', eloRating: 1200, isWinner: true },
        { persistentId: 'b', eloRating: 1200, isWinner: false },
      ]);
      expect(result.get('a')).toBe(1220);
      expect(result.get('b')).toBe(1190);
    });

    it('leaves bot ratings unchanged in the result', () => {
      const result = calculateGameElo([
        { persistentId: 'human', eloRating: 1200, isWinner: true },
        { persistentId: 'bot', eloRating: 1500, isWinner: false, isBot: true },
      ]);
      expect(result.get('bot')).toBe(1500);
    });

    it('applies the 0.25 bot multiplier to humans when bots are present', () => {
      // 1200 vs 1200, win, multiplier 0.25 -> 1205
      const result = calculateGameElo([
        { persistentId: 'human', eloRating: 1200, isWinner: true },
        { persistentId: 'bot', eloRating: 1200, isWinner: false, isBot: true },
      ]);
      expect(result.get('human')).toBe(1205);
    });

    it('does not affect ratings of high-rated humans (>=1800) in bot games', () => {
      const result = calculateGameElo([
        { persistentId: 'pro', eloRating: 1900, isWinner: true },
        { persistentId: 'bot', eloRating: 1200, isWinner: false, isBot: true },
      ]);
      expect(result.get('pro')).toBe(1900);
    });

    it('averages opponent ratings across multiple human players', () => {
      // 3-player game, all 1200, no bots: each opponent avg = 1200
      // winner: 40 * (1 - 0.5) = +20
      // each loser: 20 * (0 - 0.5) = -10
      const result = calculateGameElo([
        { persistentId: 'a', eloRating: 1200, isWinner: true },
        { persistentId: 'b', eloRating: 1200, isWinner: false },
        { persistentId: 'c', eloRating: 1200, isWinner: false },
      ]);
      expect(result.get('a')).toBe(1220);
      expect(result.get('b')).toBe(1190);
      expect(result.get('c')).toBe(1190);
    });
  });
});
