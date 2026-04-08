import { TeamModeService } from '../team-mode.service';
import type { Room, Player } from '@doodledraw/shared';
import { HANDICAP_COLORS, HANDICAP_MIN_BRUSH_SIZE } from '@doodledraw/shared';

describe('TeamModeService', () => {
  let service: TeamModeService;

  beforeEach(() => {
    service = new TeamModeService();
    jest.spyOn(service['logger'], 'log').mockImplementation(() => {});
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
    return {
      id,
      persistentId: id,
      nickname: id,
      avatar: 'av',
      score: 0,
      isDrawing: false,
      hasDrawn: false,
      isHost: false,
      isConnected: true,
      isSpectator: false,
      ...overrides,
    } as Player;
  }

  function makeRoom(players: Player[], totalRounds = 3, roomId = 'room-1'): Room {
    const playersMap = new Map<string, Player>();
    for (const p of players) playersMap.set(p.id, p);
    return {
      id: roomId,
      mode: 'team',
      phase: 'lobby',
      settings: {
        maxPlayers: 8,
        roundTime: 80,
        language: 'en',
        difficulty: 1,
        totalRounds,
        hintsEnabled: true,
        redrawEnabled: false,
        isPublic: false,
        teamAName: 'A',
        teamBName: 'B',
      },
      players: playersMap,
      createdAt: Date.now(),
      currentRound: 0,
      currentWord: null,
      currentWordQuickDraw: null,
      wordHint: '',
      drawerId: null,
      teamADrawerId: null,
      teamBDrawerId: null,
      roundStartTime: null,
      correctGuessers: [],
      drawingHistory: [],
      pendingWords: [],
      drawOrder: [],
      drawOrderIndex: 0,
      teamAScore: 0,
      teamBScore: 0,
      lastWinningTeam: null,
      isRedrawRound: false,
      playerWordHistory: new Map(),
      chatHistory: [],
      rematchVotes: new Map(),
    };
  }

  // ---------------------------------------------------------------------------
  // initGame
  // ---------------------------------------------------------------------------
  describe('initGame', () => {
    it('auto-assigns teams to unassigned players (even split)', () => {
      const players = [
        makePlayer('p1'),
        makePlayer('p2'),
        makePlayer('p3'),
        makePlayer('p4'),
      ];
      const room = makeRoom(players);

      service.initGame(room);

      const teamACount = players.filter((p) => p.team === 'A').length;
      const teamBCount = players.filter((p) => p.team === 'B').length;
      expect(teamACount).toBe(2);
      expect(teamBCount).toBe(2);
    });

    it('preserves existing team assignments', () => {
      const players = [
        makePlayer('p1', { team: 'A' }),
        makePlayer('p2', { team: 'B' }),
      ];
      const room = makeRoom(players);

      service.initGame(room);

      expect(players[0].team).toBe('A');
      expect(players[1].team).toBe('B');
    });

    it('initializes team scores and round counters', () => {
      const players = [
        makePlayer('p1', { team: 'A' }),
        makePlayer('p2', { team: 'B' }),
      ];
      const room = makeRoom(players);
      room.teamAScore = 99;
      room.teamBScore = 99;
      room.lastWinningTeam = 'A';

      service.initGame(room);

      expect(room.currentRound).toBe(1);
      expect(room.teamAScore).toBe(0);
      expect(room.teamBScore).toBe(0);
      expect(room.lastWinningTeam).toBeNull();
    });

    it('excludes spectators and disconnected players from team rosters', () => {
      const players = [
        makePlayer('p1', { team: 'A' }),
        makePlayer('p2', { team: 'B' }),
        makePlayer('s1', { team: 'A', isSpectator: true }),
        makePlayer('d1', { team: 'B', isConnected: false }),
      ];
      const room = makeRoom(players);

      service.initGame(room);

      // After init, getNextDrawers should only see p1, p2.
      const next = service.getNextDrawers(room);
      expect(next).toEqual({ teamADrawer: 'p1', teamBDrawer: 'p2' });
    });
  });

  // ---------------------------------------------------------------------------
  // getNextDrawers
  // ---------------------------------------------------------------------------
  describe('getNextDrawers', () => {
    it('returns one drawer from each team', () => {
      const players = [
        makePlayer('a1', { team: 'A' }),
        makePlayer('a2', { team: 'A' }),
        makePlayer('b1', { team: 'B' }),
        makePlayer('b2', { team: 'B' }),
      ];
      const room = makeRoom(players);
      service.initGame(room);

      const result = service.getNextDrawers(room);

      expect(result).not.toBeNull();
      expect(['a1', 'a2']).toContain(result!.teamADrawer);
      expect(['b1', 'b2']).toContain(result!.teamBDrawer);

      const playerA = players.find((p) => p.id === result!.teamADrawer)!;
      const playerB = players.find((p) => p.id === result!.teamBDrawer)!;
      expect(playerA.isDrawing).toBe(true);
      expect(playerB.isDrawing).toBe(true);
      expect(room.teamADrawerId).toBe(result!.teamADrawer);
      expect(room.teamBDrawerId).toBe(result!.teamBDrawer);
    });

    it('marks previous drawers as having drawn before advancing', () => {
      const players = [
        makePlayer('a1', { team: 'A' }),
        makePlayer('a2', { team: 'A' }),
        makePlayer('b1', { team: 'B' }),
        makePlayer('b2', { team: 'B' }),
      ];
      const room = makeRoom(players);
      service.initGame(room);

      const first = service.getNextDrawers(room)!;
      const firstA = room.players.get(first.teamADrawer)!;
      const firstB = room.players.get(first.teamBDrawer)!;

      service.getNextDrawers(room);

      expect(firstA.isDrawing).toBe(false);
      expect(firstA.hasDrawn).toBe(true);
      expect(firstB.isDrawing).toBe(false);
      expect(firstB.hasDrawn).toBe(true);
    });

    it('returns null when one team has run out of drawers', () => {
      const players = [
        makePlayer('a1', { team: 'A' }),
        makePlayer('b1', { team: 'B' }),
        makePlayer('b2', { team: 'B' }),
      ];
      const room = makeRoom(players);
      service.initGame(room);

      // First call: pairs a1 with one of b1/b2.
      const first = service.getNextDrawers(room);
      expect(first).not.toBeNull();

      // Second call: team A has no more players → null.
      const second = service.getNextDrawers(room);
      expect(second).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getHandicap
  // ---------------------------------------------------------------------------
  describe('getHandicap', () => {
    it('returns null when no team has won the previous round', () => {
      const room = makeRoom([makePlayer('p1', { team: 'A' })]);
      room.lastWinningTeam = null;
      expect(service.getHandicap(room)).toBeNull();
    });

    it('returns a handicap when there is a last winning team', () => {
      const room = makeRoom([makePlayer('p1', { team: 'A' })]);
      room.lastWinningTeam = 'A';

      const handicap = service.getHandicap(room);

      expect(handicap).not.toBeNull();
      expect(handicap!.limitedColors).toBe(true);
      expect(handicap!.minBrushSize).toBe(HANDICAP_MIN_BRUSH_SIZE);
      expect(handicap!.availableColors).toEqual([...HANDICAP_COLORS]);
    });
  });

  // ---------------------------------------------------------------------------
  // isRoundComplete
  // ---------------------------------------------------------------------------
  describe('isRoundComplete', () => {
    it('returns false right after init', () => {
      const players = [
        makePlayer('a1', { team: 'A' }),
        makePlayer('b1', { team: 'B' }),
      ];
      const room = makeRoom(players);
      service.initGame(room);

      expect(service.isRoundComplete(room)).toBe(false);
    });

    it('returns true when both teams have exhausted their orders', () => {
      const players = [
        makePlayer('a1', { team: 'A' }),
        makePlayer('b1', { team: 'B' }),
      ];
      const room = makeRoom(players);
      service.initGame(room);

      // Draw the only pair available, then both team orders are exhausted.
      service.getNextDrawers(room);
      expect(service.isRoundComplete(room)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // isGameComplete
  // ---------------------------------------------------------------------------
  describe('isGameComplete', () => {
    it('returns false while currentRound <= totalRounds', () => {
      const room = makeRoom([makePlayer('p1', { team: 'A' })], 3);
      room.currentRound = 3;
      expect(service.isGameComplete(room)).toBe(false);
    });

    it('returns true when currentRound > totalRounds', () => {
      const room = makeRoom([makePlayer('p1', { team: 'A' })], 3);
      room.currentRound = 4;
      expect(service.isGameComplete(room)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // prepareNextRound
  // ---------------------------------------------------------------------------
  describe('prepareNextRound', () => {
    it('increments round and resets hasDrawn / draw orders', () => {
      const players = [
        makePlayer('a1', { team: 'A' }),
        makePlayer('b1', { team: 'B' }),
      ];
      const room = makeRoom(players);
      service.initGame(room);
      // First call sets the drawers; second call marks them as having drawn.
      service.getNextDrawers(room);
      service.getNextDrawers(room);

      // Both players should now be marked as having drawn.
      expect(players[0].hasDrawn).toBe(true);
      expect(players[1].hasDrawn).toBe(true);

      // Clear the drawer ids — the gateway resets these between rounds.
      room.teamADrawerId = null;
      room.teamBDrawerId = null;

      service.prepareNextRound(room);

      expect(room.currentRound).toBe(2);
      expect(players[0].hasDrawn).toBe(false);
      expect(players[1].hasDrawn).toBe(false);
      // After preparing, calling getNextDrawers should produce a fresh pair.
      const next = service.getNextDrawers(room);
      expect(next).toEqual({ teamADrawer: 'a1', teamBDrawer: 'b1' });
    });

    it('does not modify spectator state', () => {
      const players = [
        makePlayer('a1', { team: 'A' }),
        makePlayer('b1', { team: 'B' }),
        makePlayer('s1', { team: 'A', isSpectator: true, hasDrawn: true }),
      ];
      const room = makeRoom(players);
      service.initGame(room);
      service.prepareNextRound(room);

      expect(players[2].hasDrawn).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // cleanupRoom
  // ---------------------------------------------------------------------------
  describe('cleanupRoom', () => {
    it('clears internal state for the given room id', () => {
      const players = [
        makePlayer('a1', { team: 'A' }),
        makePlayer('b1', { team: 'B' }),
      ];
      const room = makeRoom(players, 3, 'room-cleanup');
      service.initGame(room);

      service.cleanupRoom('room-cleanup');

      // After cleanup, isRoundComplete reads empty orders → returns true (0 >= 0).
      // More importantly, getNextDrawers should not find any drawers.
      const next = service.getNextDrawers(room);
      expect(next).toBeNull();
    });
  });
});
