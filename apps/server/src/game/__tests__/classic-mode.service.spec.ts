import { ClassicModeService } from '../classic-mode.service';
import type { Room, Player } from '@doodledraw/shared';

describe('ClassicModeService', () => {
  let service: ClassicModeService;

  beforeEach(() => {
    service = new ClassicModeService();
    // Silence the logger for cleaner test output.
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

  function makeRoom(players: Player[], totalRounds = 3): Room {
    const playersMap = new Map<string, Player>();
    for (const p of players) playersMap.set(p.id, p);
    return {
      id: 'room-1',
      mode: 'classic',
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
    it('builds drawOrder containing all connected non-spectator players', () => {
      const players = [
        makePlayer('p1'),
        makePlayer('p2'),
        makePlayer('p3'),
      ];
      const room = makeRoom(players);

      service.initGame(room);

      expect(room.drawOrder.sort()).toEqual(['p1', 'p2', 'p3']);
      expect(room.drawOrderIndex).toBe(0);
      expect(room.currentRound).toBe(1);
    });

    it('excludes disconnected and spectator players', () => {
      const players = [
        makePlayer('p1'),
        makePlayer('p2', { isConnected: false }),
        makePlayer('p3', { isSpectator: true }),
      ];
      const room = makeRoom(players);

      service.initGame(room);

      expect(room.drawOrder).toEqual(['p1']);
    });

    it('resets per-player state (score, isDrawing, hasDrawn) for non-spectators', () => {
      const players = [
        makePlayer('p1', { score: 50, hasDrawn: true, isDrawing: true }),
        makePlayer('spectator', { isSpectator: true, score: 100, hasDrawn: true }),
      ];
      const room = makeRoom(players);

      service.initGame(room);

      expect(players[0].score).toBe(0);
      expect(players[0].hasDrawn).toBe(false);
      expect(players[0].isDrawing).toBe(false);
      // Spectator state untouched.
      expect(players[1].score).toBe(100);
      expect(players[1].hasDrawn).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getNextDrawer
  // ---------------------------------------------------------------------------
  describe('getNextDrawer', () => {
    it('returns the first undrawn player and marks them as drawing', () => {
      const players = [makePlayer('p1'), makePlayer('p2')];
      const room = makeRoom(players);
      room.drawOrder = ['p1', 'p2'];
      room.drawOrderIndex = 0;

      const next = service.getNextDrawer(room);

      expect(next).toBe('p1');
      expect(players[0].isDrawing).toBe(true);
      expect(room.drawerId).toBe('p1');
    });

    it('marks the previous drawer as having drawn before advancing', () => {
      const players = [makePlayer('p1', { isDrawing: true }), makePlayer('p2')];
      const room = makeRoom(players);
      room.drawOrder = ['p1', 'p2'];
      room.drawOrderIndex = 1;
      room.drawerId = 'p1';

      const next = service.getNextDrawer(room);

      expect(players[0].isDrawing).toBe(false);
      expect(players[0].hasDrawn).toBe(true);
      expect(next).toBe('p2');
      expect(players[1].isDrawing).toBe(true);
    });

    it('skips disconnected players', () => {
      const players = [
        makePlayer('p1', { isConnected: false }),
        makePlayer('p2'),
      ];
      const room = makeRoom(players);
      room.drawOrder = ['p1', 'p2'];
      room.drawOrderIndex = 0;

      const next = service.getNextDrawer(room);
      expect(next).toBe('p2');
    });

    it('skips players who have already drawn', () => {
      const players = [makePlayer('p1', { hasDrawn: true }), makePlayer('p2')];
      const room = makeRoom(players);
      room.drawOrder = ['p1', 'p2'];
      room.drawOrderIndex = 0;

      const next = service.getNextDrawer(room);
      expect(next).toBe('p2');
    });

    it('returns null when no players remain', () => {
      const players = [makePlayer('p1', { hasDrawn: true })];
      const room = makeRoom(players);
      room.drawOrder = ['p1'];
      room.drawOrderIndex = 0;

      const next = service.getNextDrawer(room);
      expect(next).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // isRoundComplete
  // ---------------------------------------------------------------------------
  describe('isRoundComplete', () => {
    it('returns false when there are still players to draw', () => {
      const room = makeRoom([makePlayer('p1'), makePlayer('p2')]);
      room.drawOrder = ['p1', 'p2'];
      room.drawOrderIndex = 1;
      expect(service.isRoundComplete(room)).toBe(false);
    });

    it('returns true when index equals drawOrder length', () => {
      const room = makeRoom([makePlayer('p1'), makePlayer('p2')]);
      room.drawOrder = ['p1', 'p2'];
      room.drawOrderIndex = 2;
      expect(service.isRoundComplete(room)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // isGameComplete
  // ---------------------------------------------------------------------------
  describe('isGameComplete', () => {
    it('returns false when currentRound <= totalRounds', () => {
      const room = makeRoom([makePlayer('p1')], 3);
      room.currentRound = 3;
      expect(service.isGameComplete(room)).toBe(false);
    });

    it('returns true when currentRound > totalRounds', () => {
      const room = makeRoom([makePlayer('p1')], 3);
      room.currentRound = 4;
      expect(service.isGameComplete(room)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // prepareNextRound
  // ---------------------------------------------------------------------------
  describe('prepareNextRound', () => {
    it('increments round and resets hasDrawn and drawOrderIndex', () => {
      const players = [
        makePlayer('p1', { hasDrawn: true, isDrawing: true }),
        makePlayer('p2', { hasDrawn: true }),
      ];
      const room = makeRoom(players);
      room.currentRound = 1;
      room.drawOrder = ['p1', 'p2'];
      room.drawOrderIndex = 2;

      service.prepareNextRound(room);

      expect(room.currentRound).toBe(2);
      expect(players[0].hasDrawn).toBe(false);
      expect(players[0].isDrawing).toBe(false);
      expect(players[1].hasDrawn).toBe(false);
      expect(room.drawOrderIndex).toBe(0);
      expect(room.drawOrder.sort()).toEqual(['p1', 'p2']);
    });

    it('does not reset spectator state and excludes them from new draw order', () => {
      const players = [
        makePlayer('p1', { hasDrawn: true }),
        makePlayer('s1', { isSpectator: true, hasDrawn: true }),
      ];
      const room = makeRoom(players);
      room.currentRound = 1;

      service.prepareNextRound(room);

      expect(players[0].hasDrawn).toBe(false);
      // Spectator hasDrawn untouched.
      expect(players[1].hasDrawn).toBe(true);
      expect(room.drawOrder).toEqual(['p1']);
    });
  });
});
