import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProfileService } from '../profile.service';
import { ProfileDoc } from '../../database/schemas/profile.schema';
import type { Room, GameScore, Player } from '@doodledraw/shared';

describe('ProfileService', () => {
  let service: ProfileService;

  const mockProfileModel: any = jest.fn().mockImplementation((data) => {
    return {
      ...data,
      save: jest.fn().mockResolvedValue(undefined),
      markModified: jest.fn(),
    };
  });

  // Attach static query methods to the constructor function.
  mockProfileModel.findOne = jest.fn();
  mockProfileModel.find = jest.fn();
  mockProfileModel.countDocuments = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getModelToken(ProfileDoc.name), useValue: mockProfileModel },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  // -----------------------------------------------------------------------
  // Helper to create a Room-like object
  // -----------------------------------------------------------------------

  function createMockRoom(players: [string, Partial<Player>][]): Room {
    const playersMap = new Map<string, Player>();
    for (const [socketId, partial] of players) {
      playersMap.set(socketId, {
        id: socketId,
        persistentId: partial.persistentId ?? socketId,
        nickname: partial.nickname ?? 'Player',
        avatar: partial.avatar ?? 'av',
        score: partial.score ?? 0,
        isDrawing: false,
        hasDrawn: false,
        isHost: false,
        isConnected: true,
        isSpectator: partial.isSpectator ?? false,
        isBot: partial.isBot ?? false,
        ...partial,
      } as Player);
    }

    return {
      id: 'room-1',
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
        teamAName: 'Team A',
        teamBName: 'Team B',
      },
      players: playersMap,
      createdAt: Date.now(),
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
    };
  }

  // -----------------------------------------------------------------------
  // updateProfilesAfterGame
  // -----------------------------------------------------------------------

  describe('updateProfilesAfterGame', () => {
    it('should skip players with isBot: true', async () => {
      const room = createMockRoom([
        ['socket-bot', { persistentId: 'bot-easy-1', nickname: 'Bot', isBot: true }],
        ['socket-human', { persistentId: 'human-1', nickname: 'Alice', isBot: false }],
      ]);

      const scores: GameScore[] = [
        { playerId: 'socket-bot', nickname: 'Bot', score: 50, correctGuesses: 2, drawingScore: 10 },
        { playerId: 'socket-human', nickname: 'Alice', score: 100, correctGuesses: 3, drawingScore: 20 },
      ];

      const existingProfile = {
        persistentId: 'human-1',
        nickname: 'Alice',
        avatar: 'av',
        totalGames: 5,
        totalWins: 2,
        totalScore: 300,
        eloRating: 1200,
        correctGuesses: 10,
        totalDrawings: 3,
        weeklyScore: 50,
        weeklyGames: 2,
        lastWeekReset: null,
        wordFrequency: {},
        favoriteWord: null,
        save: jest.fn().mockResolvedValue(undefined),
        markModified: jest.fn(),
      };

      // First call: for Elo lookup of human player
      // Second call: for updateProfile lookup
      mockProfileModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(existingProfile) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(existingProfile) });

      await service.updateProfilesAfterGame(room, scores, 'socket-human');

      // The bot's profile should never be queried for update (only once for elo if at all)
      // The human profile's save should have been called
      expect(existingProfile.save).toHaveBeenCalled();
      expect(existingProfile.totalGames).toBe(6);
    });

    it('should skip spectators', async () => {
      const room = createMockRoom([
        ['socket-spectator', { persistentId: 'spectator-1', nickname: 'Watcher', isSpectator: true }],
        ['socket-human', { persistentId: 'human-1', nickname: 'Alice', isBot: false }],
      ]);

      const scores: GameScore[] = [
        { playerId: 'socket-human', nickname: 'Alice', score: 100, correctGuesses: 3, drawingScore: 20 },
      ];

      const existingProfile = {
        persistentId: 'human-1',
        nickname: 'Alice',
        avatar: 'av',
        totalGames: 0,
        totalWins: 0,
        totalScore: 0,
        eloRating: 1200,
        correctGuesses: 0,
        totalDrawings: 0,
        weeklyScore: 0,
        weeklyGames: 0,
        lastWeekReset: null,
        wordFrequency: {},
        favoriteWord: null,
        save: jest.fn().mockResolvedValue(undefined),
        markModified: jest.fn(),
      };

      mockProfileModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(existingProfile) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(existingProfile) });

      await service.updateProfilesAfterGame(room, scores, 'socket-human');

      // Spectator never triggers a findOne for profile update
      expect(existingProfile.save).toHaveBeenCalled();
      expect(existingProfile.totalGames).toBe(1);
    });

    it('should update human players normally', async () => {
      const room = createMockRoom([
        ['socket-1', { persistentId: 'human-1', nickname: 'Alice' }],
        ['socket-2', { persistentId: 'human-2', nickname: 'Bob' }],
      ]);
      room.playerWordHistory.set('socket-1', ['cat', 'dog']);

      const scores: GameScore[] = [
        { playerId: 'socket-1', nickname: 'Alice', score: 150, correctGuesses: 5, drawingScore: 30 },
        { playerId: 'socket-2', nickname: 'Bob', score: 80, correctGuesses: 2, drawingScore: 10 },
      ];

      const profile1 = {
        persistentId: 'human-1',
        nickname: 'Alice',
        avatar: 'av',
        totalGames: 0,
        totalWins: 0,
        totalScore: 0,
        eloRating: 1200,
        correctGuesses: 0,
        totalDrawings: 0,
        weeklyScore: 0,
        weeklyGames: 0,
        lastWeekReset: null,
        wordFrequency: {},
        favoriteWord: null,
        save: jest.fn().mockResolvedValue(undefined),
        markModified: jest.fn(),
      };

      const profile2 = {
        persistentId: 'human-2',
        nickname: 'Bob',
        avatar: 'av',
        totalGames: 0,
        totalWins: 0,
        totalScore: 0,
        eloRating: 1200,
        correctGuesses: 0,
        totalDrawings: 0,
        weeklyScore: 0,
        weeklyGames: 0,
        lastWeekReset: null,
        wordFrequency: {},
        favoriteWord: null,
        save: jest.fn().mockResolvedValue(undefined),
        markModified: jest.fn(),
      };

      // Elo lookups for both players, then updateProfile lookups
      mockProfileModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(profile1) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(profile2) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(profile1) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(profile2) });

      await service.updateProfilesAfterGame(room, scores, 'socket-1');

      expect(profile1.save).toHaveBeenCalled();
      expect(profile1.totalGames).toBe(1);
      expect(profile1.totalWins).toBe(1);
      expect(profile1.totalScore).toBe(150);
      expect(profile1.totalDrawings).toBe(2);

      expect(profile2.save).toHaveBeenCalled();
      expect(profile2.totalGames).toBe(1);
      expect(profile2.totalWins).toBe(0);
    });

    it('should create a new profile when none exists', async () => {
      const room = createMockRoom([
        ['socket-1', { persistentId: 'new-user', nickname: 'NewPlayer' }],
      ]);

      const scores: GameScore[] = [
        { playerId: 'socket-1', nickname: 'NewPlayer', score: 50, correctGuesses: 1, drawingScore: 5 },
      ];

      // Elo lookup returns null (no existing profile)
      mockProfileModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) })
        // updateProfile lookup also returns null -> creates new
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });

      await service.updateProfilesAfterGame(room, scores, 'socket-1');

      // Constructor should have been called with the new profile data
      expect(mockProfileModel).toHaveBeenCalledWith(expect.objectContaining({
        persistentId: 'new-user',
        nickname: 'NewPlayer',
      }));
    });

    it('should reset weekly stats when week changes', async () => {
      const room = createMockRoom([
        ['socket-1', { persistentId: 'human-1', nickname: 'Alice' }],
      ]);

      const scores: GameScore[] = [
        { playerId: 'socket-1', nickname: 'Alice', score: 50, correctGuesses: 1, drawingScore: 5 },
      ];

      const profile = {
        persistentId: 'human-1',
        nickname: 'Alice',
        avatar: 'av',
        totalGames: 5,
        totalWins: 2,
        totalScore: 300,
        eloRating: 1200,
        correctGuesses: 10,
        totalDrawings: 3,
        weeklyScore: 200,
        weeklyGames: 4,
        lastWeekReset: '2020-01-06', // old week
        wordFrequency: {},
        favoriteWord: null,
        save: jest.fn().mockResolvedValue(undefined),
        markModified: jest.fn(),
      };

      mockProfileModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(profile) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(profile) });

      await service.updateProfilesAfterGame(room, scores, 'nobody');

      // Weekly stats should be reset then incremented
      expect(profile.weeklyGames).toBe(1);
      expect(profile.weeklyScore).toBe(50);
    });

    it('should update word frequency and favorite word', async () => {
      const room = createMockRoom([
        ['socket-1', { persistentId: 'human-1', nickname: 'Alice' }],
      ]);
      room.playerWordHistory.set('socket-1', ['cat', 'cat', 'dog']);

      const scores: GameScore[] = [
        { playerId: 'socket-1', nickname: 'Alice', score: 50, correctGuesses: 1, drawingScore: 5 },
      ];

      const profile = {
        persistentId: 'human-1',
        nickname: 'Alice',
        avatar: 'av',
        totalGames: 0, totalWins: 0, totalScore: 0, eloRating: 1200,
        correctGuesses: 0, totalDrawings: 0, weeklyScore: 0, weeklyGames: 0,
        lastWeekReset: null, wordFrequency: {}, favoriteWord: null,
        save: jest.fn().mockResolvedValue(undefined),
        markModified: jest.fn(),
      };

      mockProfileModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(profile) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(profile) });

      await service.updateProfilesAfterGame(room, scores, 'nobody');

      expect(profile.wordFrequency).toEqual({ cat: 2, dog: 1 });
      expect(profile.favoriteWord).toBe('cat');
    });

    it('should not throw on errors (fire-and-forget)', async () => {
      // Silence the NestJS logger for this test since we expect an error log.
      jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      const room = createMockRoom([
        ['socket-1', { persistentId: 'human-1', nickname: 'Alice' }],
      ]);

      const scores: GameScore[] = [
        { playerId: 'socket-1', nickname: 'Alice', score: 100, correctGuesses: 3, drawingScore: 20 },
      ];

      mockProfileModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });

      // Should not throw
      await expect(service.updateProfilesAfterGame(room, scores, 'socket-1')).resolves.toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // getLeaderboard
  // -----------------------------------------------------------------------

  describe('getLeaderboard', () => {
    /**
     * Build a chainable find() mock: find().sort().skip().limit().exec()
     */
    function mockFindChain(docs: any[]) {
      const exec = jest.fn().mockResolvedValue(docs);
      const limit = jest.fn().mockReturnValue({ exec });
      const skip = jest.fn().mockReturnValue({ limit });
      const sort = jest.fn().mockReturnValue({ skip });
      mockProfileModel.find.mockReturnValue({ sort });
      return { sort, skip, limit, exec };
    }

    function mockCount(total: number) {
      mockProfileModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(total),
      });
    }

    beforeEach(() => {
      mockProfileModel.countDocuments = jest.fn();
    });

    it('should exclude bot profiles from the query', async () => {
      mockFindChain([]);
      mockCount(0);

      await service.getLeaderboard('allTime');

      const queryArg = mockProfileModel.find.mock.calls[0][0];
      expect(queryArg.persistentId).toEqual({ $not: /^bot-/ });
    });

    it('should use weeklyScore sort for weekly leaderboard', async () => {
      const { sort } = mockFindChain([]);
      mockCount(0);

      await service.getLeaderboard('weekly');

      expect(sort).toHaveBeenCalledWith({ weeklyScore: -1 });
    });

    it('should filter by country for country leaderboard', async () => {
      mockFindChain([]);
      mockCount(0);

      await service.getLeaderboard('country', { country: 'US' });

      const queryArg = mockProfileModel.find.mock.calls[0][0];
      expect(queryArg.country).toBe('US');
    });

    it('should return empty list when country is not provided for country leaderboard', async () => {
      const result = await service.getLeaderboard('country');
      expect(result).toEqual({ players: [], total: 0 });
    });

    it('should return empty list when ageGroup is invalid for age leaderboard', async () => {
      const result = await service.getLeaderboard('age', { ageGroup: 'invalid' });
      expect(result).toEqual({ players: [], total: 0 });
    });

    it('should filter by birthYear for age leaderboard', async () => {
      mockFindChain([]);
      mockCount(0);

      await service.getLeaderboard('age', { ageGroup: '1990' });

      const queryArg = mockProfileModel.find.mock.calls[0][0];
      expect(queryArg.birthYear).toBe(1990);
    });

    it('should map docs to LeaderboardEntry with correct fields', async () => {
      const docs = [{
        persistentId: 'u1', nickname: 'Alice', avatar: 'av1',
        totalScore: 500, eloRating: 1300, totalWins: 5, totalGames: 10,
        weeklyScore: 100, weeklyGames: 3, country: 'US',
      }];
      mockFindChain(docs);
      mockCount(1);

      const result = await service.getLeaderboard('allTime');

      expect(result.players).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.players[0]).toEqual({
        rank: 1,
        persistentId: 'u1',
        nickname: 'Alice',
        avatar: 'av1',
        totalScore: 500,
        eloRating: 1300,
        totalWins: 5,
        totalGames: 10,
        country: 'US',
      });
    });

    it('should paginate with offset and compute ranks accordingly', async () => {
      const docs = [
        { persistentId: 'u11', nickname: 'P11', avatar: 'av', totalScore: 50, eloRating: 1100, totalWins: 1, totalGames: 5 },
        { persistentId: 'u12', nickname: 'P12', avatar: 'av', totalScore: 40, eloRating: 1080, totalWins: 0, totalGames: 3 },
      ];
      const { skip, limit } = mockFindChain(docs);
      mockCount(25);

      const result = await service.getLeaderboard('allTime', { offset: 10 }, 5);

      expect(skip).toHaveBeenCalledWith(10);
      expect(limit).toHaveBeenCalledWith(5);
      expect(result.total).toBe(25);
      expect(result.players[0].rank).toBe(11);
      expect(result.players[1].rank).toBe(12);
    });
  });

  // -----------------------------------------------------------------------
  // getProfile
  // -----------------------------------------------------------------------

  describe('getProfile', () => {
    it('should return null when profile does not exist', async () => {
      mockProfileModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await service.getProfile('unknown');
      expect(result).toBeNull();
    });

    it('should return a registered PlayerProfile when profile has username', async () => {
      const doc = {
        persistentId: 'user-1',
        nickname: 'Alice',
        avatar: 'av1',
        username: 'alice',
        totalGames: 10,
        totalWins: 5,
        totalScore: 500,
        eloRating: 1300,
        correctGuesses: 20,
        totalDrawings: 8,
        favoriteWord: 'cat',
        country: 'US',
        birthYear: 1990,
      };
      mockProfileModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });

      const result = await service.getProfile('user-1');
      expect(result).toEqual({
        persistentId: 'user-1',
        nickname: 'Alice',
        avatar: 'av1',
        totalGames: 10,
        totalWins: 5,
        totalScore: 500,
        eloRating: 1300,
        correctGuesses: 20,
        totalDrawings: 8,
        favoriteWord: 'cat',
        country: 'US',
        birthYear: 1990,
        isRegistered: true,
      });
    });

    it('should return isRegistered=false for anonymous profile', async () => {
      const doc = {
        persistentId: 'anon-1',
        nickname: 'Guest',
        avatar: 'av1',
        totalGames: 3,
        totalWins: 0,
        totalScore: 100,
        eloRating: 1200,
        correctGuesses: 2,
        totalDrawings: 1,
        favoriteWord: null,
      };
      mockProfileModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });

      const result = await service.getProfile('anon-1');
      expect(result?.isRegistered).toBe(false);
    });
  });
});
