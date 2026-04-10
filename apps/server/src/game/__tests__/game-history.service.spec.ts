import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { GameHistoryService, buildHistoryInsertFromPersistedDoc } from '../game-history.service';
import { GameHistoryDoc } from '../../database/schemas/game-history.schema';
import type { Room, Player } from '@doodledraw/shared';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    persistentId: 'pid-1',
    nickname: 'Alice',
    avatar: 'a1',
    score: 0,
    isDrawing: false,
    hasDrawn: false,
    isHost: false,
    isConnected: true,
    ...overrides,
  };
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  const players = new Map<string, Player>();
  players.set('p1', makePlayer({ id: 'p1', persistentId: 'pid-1', nickname: 'Alice', score: 100, isHost: true }));
  players.set('p2', makePlayer({ id: 'p2', persistentId: 'pid-2', nickname: 'Bob', score: 50 }));
  return {
    id: 'ROOM01',
    mode: 'classic',
    phase: 'game_end',
    settings: {
      maxPlayers: 8,
      roundTime: 80,
      language: 'en',
      difficulty: 1,
      totalRounds: 3,
      hintsEnabled: true,
      redrawEnabled: false,
      isPublic: false,
      teamAName: 'A',
      teamBName: 'B',
    },
    players,
    createdAt: Date.now() - 60_000,
    currentRound: 3,
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
    ...overrides,
  };
}

describe('GameHistoryService', () => {
  let service: GameHistoryService;
  let mockModel: any;

  beforeEach(async () => {
    mockModel = {
      create: jest.fn().mockResolvedValue({ _id: 'new-id' }),
      find: jest.fn(),
      findById: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameHistoryService,
        { provide: getModelToken(GameHistoryDoc.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<GameHistoryService>(GameHistoryService);
  });

  describe('archiveGame', () => {
    it('archives a classic game with the highest-scoring player as winner', async () => {
      const room = makeRoom();
      await service.archiveGame(room, 'completed');

      expect(mockModel.create).toHaveBeenCalledTimes(1);
      const payload = mockModel.create.mock.calls[0][0];
      expect(payload.mode).toBe('classic');
      expect(payload.endReason).toBe('completed');
      expect(payload.winnerPersistentId).toBe('pid-1'); // Alice has score 100
      expect(payload.winnerTeam).toBeNull();
      expect(payload.players).toHaveLength(2);
    });

    it('archives a team game with the winning team', async () => {
      const room = makeRoom({ mode: 'team', teamAScore: 5, teamBScore: 3 });
      await service.archiveGame(room, 'completed');

      const payload = mockModel.create.mock.calls[0][0];
      expect(payload.mode).toBe('team');
      expect(payload.winnerTeam).toBe('A');
      expect(payload.winnerPersistentId).toBeNull();
    });

    it('dedupes — archiving the same roomId twice only calls create once', async () => {
      const room = makeRoom();
      await service.archiveGame(room, 'completed');
      await service.archiveGame(room, 'cleaned_up');

      expect(mockModel.create).toHaveBeenCalledTimes(1);
    });

    it('swallows errors so the caller does not crash', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});
      mockModel.create.mockRejectedValueOnce(new Error('DB down'));
      const room = makeRoom({ id: 'ROOM02' });

      await expect(service.archiveGame(room, 'completed')).resolves.toBeUndefined();
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });

    it('ignores rooms with missing id', async () => {
      await service.archiveGame({ id: '' } as any, 'completed');
      expect(mockModel.create).not.toHaveBeenCalled();
    });
  });

  describe('getGames', () => {
    it('paginates and filters by endReason and playerPersistentId', async () => {
      const execFn = jest.fn().mockResolvedValue([{ _id: 'g1' }]);
      const leanFn = jest.fn().mockReturnValue({ exec: execFn });
      const limitFn = jest.fn().mockReturnValue({ lean: leanFn });
      const skipFn = jest.fn().mockReturnValue({ limit: limitFn });
      const sortFn = jest.fn().mockReturnValue({ skip: skipFn });
      mockModel.find.mockReturnValue({ sort: sortFn });

      const countExec = jest.fn().mockResolvedValue(42);
      mockModel.countDocuments.mockReturnValue({ exec: countExec });

      const result = await service.getGames({
        page: 2,
        limit: 10,
        endReason: 'completed',
        playerPersistentId: 'pid-1',
      });

      expect(mockModel.find).toHaveBeenCalledWith({
        endReason: 'completed',
        'players.persistentId': 'pid-1',
      });
      expect(sortFn).toHaveBeenCalledWith({ endedAt: -1 });
      expect(skipFn).toHaveBeenCalledWith(10);
      expect(limitFn).toHaveBeenCalledWith(10);
      expect(result.games).toEqual([{ _id: 'g1' }]);
      expect(result.pagination).toEqual({
        total: 42,
        page: 2,
        pageSize: 10,
        totalPages: 5,
      });
    });
  });

  describe('getGameById', () => {
    it('returns the game when found', async () => {
      const execFn = jest.fn().mockResolvedValue({ _id: 'gid', mode: 'classic' });
      mockModel.findById.mockReturnValue({ lean: jest.fn().mockReturnValue({ exec: execFn }) });

      const result = await service.getGameById('gid');
      expect(result).toEqual({ _id: 'gid', mode: 'classic' });
    });

    it('returns null on error', async () => {
      mockModel.findById.mockImplementation(() => { throw new Error('bad id'); });
      const result = await service.getGameById('bad');
      expect(result).toBeNull();
    });
  });

  describe('getGlobalStats', () => {
    it('returns counts and grouped breakdowns', async () => {
      // Counts
      mockModel.countDocuments
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(10) })  // last week
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(30) })  // last month
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(100) }) // last year
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(12) }); // unfinished total

      // Aggregations
      mockModel.aggregate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([
            { _id: 'admin_ended', count: 2 },
            { _id: 'cleaned_up', count: 8 },
            { _id: 'abandoned', count: 2 },
          ]),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([
            { _id: 'lobby', count: 3 },
            { _id: 'drawing', count: 7 },
            { _id: 'selecting_word', count: 2 },
          ]),
        });

      const stats = await service.getGlobalStats();

      expect(stats.gamesLastWeek).toBe(10);
      expect(stats.gamesLastMonth).toBe(30);
      expect(stats.gamesLastYear).toBe(100);
      expect(stats.unfinishedTotal).toBe(12);
      expect(stats.unfinishedByReason).toEqual({
        admin_ended: 2,
        cleaned_up: 8,
        abandoned: 2,
      });
      expect(stats.unfinishedByPhase).toEqual({
        lobby: 3,
        selecting_word: 2,
        drawing: 7,
        round_end: 0,
        game_end: 0,
      });
    });
  });

  describe('buildHistoryInsertFromPersistedDoc', () => {
    it('handles a persisted room doc and derives winner from scores', () => {
      const doc = {
        _id: 'ROOM99',
        mode: 'classic',
        phase: 'drawing',
        currentRound: 2,
        teamAScore: 0,
        teamBScore: 0,
        players: [
          { persistentId: 'pid-x', nickname: 'X', avatar: 'a', score: 40, isBot: false, isConnected: false },
          { persistentId: 'pid-y', nickname: 'Y', avatar: 'a', score: 80, isBot: false, isConnected: true },
        ],
        settings: { totalRounds: 3, language: 'en' },
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };
      const row = buildHistoryInsertFromPersistedDoc(doc, 'abandoned');
      expect(row.roomId).toBe('ROOM99');
      expect(row.endReason).toBe('abandoned');
      expect(row.winnerPersistentId).toBe('pid-y');
      expect(row.players).toHaveLength(2);
      expect(row.language).toBe('en');
    });

    it('handles team docs and picks winner by team score', () => {
      const doc = {
        _id: 'ROOMT',
        mode: 'team',
        phase: 'game_end',
        currentRound: 3,
        teamAScore: 2,
        teamBScore: 5,
        players: [],
        settings: { totalRounds: 3 },
        createdAt: Date.now(),
      };
      const row = buildHistoryInsertFromPersistedDoc(doc, 'completed');
      expect(row.winnerTeam).toBe('B');
      expect(row.winnerPersistentId).toBeNull();
    });
  });
});
