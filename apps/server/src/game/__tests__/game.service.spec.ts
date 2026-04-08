import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from '../game.service';
import { RoomService } from '../room.service';
import { ClassicModeService } from '../classic-mode.service';
import { TeamModeService } from '../team-mode.service';
import { WordsService } from '../../words/words.service';
import { RoomPersistenceService } from '../room-persistence.service';
import { ProfileService } from '../profile.service';
import { BotDrawingService } from '../bot/bot-drawing.service';
import { PermanentLobbiesService } from '../bot/permanent-lobbies.service';
import type { Player, Room } from '@doodledraw/shared';

describe('GameService', () => {
  let service: GameService;

  let mockRoomService: any;
  let mockClassicMode: any;
  let mockTeamMode: any;
  let mockWordsService: any;
  let mockPersistence: any;
  let mockProfileService: any;
  let mockBotDrawing: any;
  let mockPermanentLobbies: any;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function createServerMock() {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    return { to, emit };
  }

  function makePlayer(overrides: Partial<Player> = {}): Player {
    return {
      id: 'p1',
      persistentId: 'p1',
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
    const drawer = makePlayer({ id: 'drawer-1', isDrawing: true });
    const guesser1 = makePlayer({ id: 'g1', nickname: 'Bob' });
    const guesser2 = makePlayer({ id: 'g2', nickname: 'Carol' });
    const players = new Map<string, Player>([
      [drawer.id, drawer],
      [guesser1.id, guesser1],
      [guesser2.id, guesser2],
    ]);
    return {
      id: 'room-1',
      mode: 'classic',
      phase: 'lobby',
      settings: {
        maxPlayers: 8,
        roundTime: 60,
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
      createdAt: 0,
      currentRound: 1,
      currentWord: null,
      currentWordQuickDraw: null,
      wordHint: '',
      drawerId: drawer.id,
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

  // -------------------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------------------

  beforeEach(async () => {
    mockRoomService = {
      getRoom: jest.fn(),
      getRoomForPlayer: jest.fn(),
      serializeRoom: jest.fn().mockReturnValue({}),
    };
    mockClassicMode = {
      initGame: jest.fn(),
      getNextDrawer: jest.fn(),
      isGameComplete: jest.fn().mockReturnValue(false),
      prepareNextRound: jest.fn(),
    };
    mockTeamMode = {
      initGame: jest.fn(),
      getNextDrawers: jest.fn(),
      isGameComplete: jest.fn().mockReturnValue(false),
      prepareNextRound: jest.fn(),
      getHandicap: jest.fn().mockReturnValue(null),
      cleanupRoom: jest.fn(),
    };
    mockWordsService = {
      getRandomWords: jest.fn().mockResolvedValue([
        { word: 'cat', difficulty: 1 },
        { word: 'dog', difficulty: 1 },
        { word: 'bird', difficulty: 1 },
      ]),
    };
    mockPersistence = {
      persistRoom: jest.fn(),
      markCompleted: jest.fn(),
    };
    mockProfileService = {
      updateProfilesAfterGame: jest.fn().mockResolvedValue(undefined),
    };
    mockBotDrawing = {
      startDrawing: jest.fn(),
      cancelDrawing: jest.fn(),
    };
    mockPermanentLobbies = {
      handleGameEnd: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: RoomService, useValue: mockRoomService },
        { provide: ClassicModeService, useValue: mockClassicMode },
        { provide: TeamModeService, useValue: mockTeamMode },
        { provide: WordsService, useValue: mockWordsService },
        { provide: RoomPersistenceService, useValue: mockPersistence },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: BotDrawingService, useValue: mockBotDrawing },
        { provide: PermanentLobbiesService, useValue: mockPermanentLobbies },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  afterEach(() => {
    // Flush any pending fake timers and restore real timers to avoid leaks.
    if (jest.isMockFunction(setTimeout) || (global as any).__fakeTimers) {
      // no-op: kept for readability
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // startGame
  // -------------------------------------------------------------------------

  describe('startGame', () => {
    it('throws if the room cannot be found', async () => {
      mockRoomService.getRoom.mockReturnValue(undefined);
      await expect(service.startGame('room-x', createServerMock() as any)).rejects.toThrow(
        'Room not found',
      );
    });

    it('throws if min player count is not met (classic)', async () => {
      const room = makeRoom();
      // Only one connected human.
      room.players = new Map([['drawer-1', makePlayer({ id: 'drawer-1' })]]);
      mockRoomService.getRoom.mockReturnValue(room);

      await expect(service.startGame(room.id, createServerMock() as any)).rejects.toThrow(
        /Need at least/,
      );
    });

    it('initializes the classic mode and starts the first turn', async () => {
      const room = makeRoom();
      mockRoomService.getRoom.mockReturnValue(room);
      // Force endGame path so we don't need to await complex flows.
      mockClassicMode.getNextDrawer.mockReturnValue(null);
      mockClassicMode.isGameComplete.mockReturnValue(true);

      const server = createServerMock();
      await service.startGame(room.id, server as any);

      expect(mockClassicMode.initGame).toHaveBeenCalledWith(room);
      expect(mockPersistence.persistRoom).toHaveBeenCalledWith(room);
      // endGame emits 'game:end'
      expect(server.emit).toHaveBeenCalledWith(
        'game:end',
        expect.objectContaining({ winner: expect.anything() }),
      );
    });

    it('initializes the team mode for team rooms', async () => {
      const room = makeRoom({
        mode: 'team',
        players: new Map([
          ['a1', makePlayer({ id: 'a1', team: 'A' })],
          ['a2', makePlayer({ id: 'a2', team: 'A' })],
          ['b1', makePlayer({ id: 'b1', team: 'B' })],
          ['b2', makePlayer({ id: 'b2', team: 'B' })],
        ]),
      });
      mockRoomService.getRoom.mockReturnValue(room);
      mockTeamMode.getNextDrawers.mockReturnValue(null);
      mockTeamMode.isGameComplete.mockReturnValue(true);

      const server = createServerMock();
      await service.startGame(room.id, server as any);

      expect(mockTeamMode.initGame).toHaveBeenCalledWith(room);
    });
  });

  // -------------------------------------------------------------------------
  // startCountdown / cancelCountdown
  // -------------------------------------------------------------------------

  describe('startCountdown', () => {
    it('throws if the room is not in lobby phase', () => {
      const room = makeRoom({ phase: 'drawing' });
      mockRoomService.getRoom.mockReturnValue(room);

      expect(() => service.startCountdown(room.id, createServerMock() as any)).toThrow(
        'Game already started',
      );
    });

    it('throws if not enough players are connected', () => {
      const room = makeRoom();
      room.players = new Map([['drawer-1', makePlayer({ id: 'drawer-1' })]]);
      mockRoomService.getRoom.mockReturnValue(room);

      expect(() => service.startCountdown(room.id, createServerMock() as any)).toThrow(
        /Need at least/,
      );
    });

    it('emits an initial countdownTick of 3 immediately', () => {
      jest.useFakeTimers();
      const room = makeRoom();
      mockRoomService.getRoom.mockReturnValue(room);
      const server = createServerMock();

      service.startCountdown(room.id, server as any);

      expect(server.to).toHaveBeenCalledWith(room.id);
      expect(server.emit).toHaveBeenCalledWith('game:countdownTick', { seconds: 3 });
    });

    it('ticks down to 0 then attempts to start the game', () => {
      jest.useFakeTimers();
      const room = makeRoom();
      mockRoomService.getRoom.mockReturnValue(room);
      // Force endGame so startGame resolves quickly without complex flows.
      mockClassicMode.getNextDrawer.mockReturnValue(null);
      mockClassicMode.isGameComplete.mockReturnValue(true);
      const server = createServerMock();

      service.startCountdown(room.id, server as any);

      // Three ticks from initial seconds=3 → 2 → 1 → 0.
      jest.advanceTimersByTime(3000);

      const tickEmits = server.emit.mock.calls
        .filter((c) => c[0] === 'game:countdownTick')
        .map((c) => c[1].seconds);
      expect(tickEmits).toEqual(expect.arrayContaining([3, 2, 1, 0]));
    });
  });

  describe('cancelCountdown', () => {
    it('does nothing if no countdown is active', () => {
      const server = createServerMock();
      service.cancelCountdown('room-1', server as any);
      expect(server.emit).not.toHaveBeenCalled();
    });

    it('cancels an active countdown and emits a cancelled event', () => {
      jest.useFakeTimers();
      const room = makeRoom();
      mockRoomService.getRoom.mockReturnValue(room);
      const server = createServerMock();

      service.startCountdown(room.id, server as any);
      service.cancelCountdown(room.id, server as any);

      expect(server.emit).toHaveBeenCalledWith('game:countdownCancelled');
    });
  });

  // -------------------------------------------------------------------------
  // selectWord
  // -------------------------------------------------------------------------

  describe('selectWord', () => {
    it('returns silently when the room is missing', async () => {
      mockRoomService.getRoom.mockReturnValue(undefined);
      const server = createServerMock();
      await service.selectWord('room-x', 'p1', 0, server as any);
      expect(server.emit).not.toHaveBeenCalled();
    });

    it('returns when phase is not selecting_word', async () => {
      const room = makeRoom({ phase: 'drawing' });
      mockRoomService.getRoom.mockReturnValue(room);
      const server = createServerMock();
      await service.selectWord(room.id, 'drawer-1', 0, server as any);
      expect(server.emit).not.toHaveBeenCalled();
    });

    it('rejects selection from a non-drawer in classic mode', async () => {
      const room = makeRoom({
        phase: 'selecting_word',
        pendingWords: [{ word: 'cat', difficulty: 1 }],
      });
      mockRoomService.getRoom.mockReturnValue(room);
      const server = createServerMock();

      await service.selectWord(room.id, 'g1', 0, server as any);

      expect(room.currentWord).toBeNull();
    });

    it('sets the chosen word, transitions to drawing, and broadcasts', async () => {
      const room = makeRoom({
        phase: 'selecting_word',
        pendingWords: [{ word: 'cat', difficulty: 1 }, { word: 'dog', difficulty: 2 }],
      });
      mockRoomService.getRoom.mockReturnValue(room);
      const server = createServerMock();

      await service.selectWord(room.id, 'drawer-1', 1, server as any);

      expect(room.currentWord).toBe('dog');
      expect(room.phase).toBe('drawing');
      expect(room.pendingWords).toEqual([]);
      expect(server.emit).toHaveBeenCalledWith(
        'game:phaseChange',
        expect.objectContaining({ phase: 'drawing' }),
      );
    });

    it('rejects an out-of-range word index', async () => {
      const room = makeRoom({
        phase: 'selecting_word',
        pendingWords: [{ word: 'cat', difficulty: 1 }],
      });
      mockRoomService.getRoom.mockReturnValue(room);
      const server = createServerMock();

      await service.selectWord(room.id, 'drawer-1', 5, server as any);

      expect(room.currentWord).toBeNull();
      expect(room.phase).toBe('selecting_word');
    });
  });

  // -------------------------------------------------------------------------
  // handleGuess
  // -------------------------------------------------------------------------

  describe('handleGuess', () => {
    function setupGuessRoom(): Room {
      const room = makeRoom({
        phase: 'drawing',
        currentWord: 'banana',
        roundStartTime: Date.now(),
      });
      mockRoomService.getRoomForPlayer.mockReturnValue(room);
      return room;
    }

    it('returns false when the room is missing', () => {
      mockRoomService.getRoomForPlayer.mockReturnValue(undefined);
      const result = service.handleGuess('p1', 'banana', createServerMock() as any);
      expect(result).toEqual({ isCorrect: false, isClose: false });
    });

    it('rejects guesses while not in drawing phase', () => {
      const room = makeRoom({ phase: 'lobby', currentWord: 'banana' });
      mockRoomService.getRoomForPlayer.mockReturnValue(room);
      const result = service.handleGuess('g1', 'banana', createServerMock() as any);
      expect(result.isCorrect).toBe(false);
    });

    it('does not allow the drawer to guess', () => {
      const room = setupGuessRoom();
      const result = service.handleGuess('drawer-1', 'banana', createServerMock() as any);
      expect(result).toEqual({ isCorrect: false, isClose: false });
      expect(room.correctGuessers).toEqual([]);
    });

    it('detects an exact match (case-insensitive) and awards points', () => {
      const room = setupGuessRoom();
      const server = createServerMock();

      const result = service.handleGuess('g1', 'BANANA', server as any);

      expect(result.isCorrect).toBe(true);
      expect(room.correctGuessers).toContain('g1');
      const player = room.players.get('g1')!;
      expect(player.score).toBeGreaterThan(0);
      expect(server.emit).toHaveBeenCalledWith(
        'chat:correctGuess',
        expect.objectContaining({ playerId: 'g1' }),
      );
    });

    it('returns isClose=true for guesses within Levenshtein distance 2', () => {
      const room = setupGuessRoom();
      const server = createServerMock();

      // 'banaan' vs 'banana' = distance 2.
      const result = service.handleGuess('g1', 'banaan', server as any);

      expect(result.isClose).toBe(true);
      expect(result.isCorrect).toBe(false);
      expect(room.correctGuessers).not.toContain('g1');
    });

    it('returns isCorrect=false isClose=false for completely wrong guesses', () => {
      setupGuessRoom();
      const result = service.handleGuess('g1', 'helicopter', createServerMock() as any);
      expect(result).toEqual({ isCorrect: false, isClose: false });
    });

    it('does not award points twice for the same player', () => {
      const room = setupGuessRoom();
      service.handleGuess('g1', 'banana', createServerMock() as any);
      const scoreAfterFirst = room.players.get('g1')!.score;

      const result = service.handleGuess('g1', 'banana', createServerMock() as any);
      expect(result.isCorrect).toBe(false);
      expect(room.players.get('g1')!.score).toBe(scoreAfterFirst);
    });
  });

  // -------------------------------------------------------------------------
  // endRound
  // -------------------------------------------------------------------------

  describe('endRound', () => {
    it('returns silently if the room is missing', () => {
      mockRoomService.getRoom.mockReturnValue(undefined);
      const server = createServerMock();
      service.endRound('room-x', server as any);
      expect(server.emit).not.toHaveBeenCalled();
    });

    it('broadcasts roundEnd, sets phase to round_end, and schedules next turn', () => {
      jest.useFakeTimers();
      const room = makeRoom({ phase: 'drawing', currentWord: 'cat' });
      mockRoomService.getRoom.mockReturnValue(room);
      // Force end-game path on the next turn so we can verify the timer fires.
      mockClassicMode.getNextDrawer.mockReturnValue(null);
      mockClassicMode.isGameComplete.mockReturnValue(true);

      const server = createServerMock();
      service.endRound(room.id, server as any);

      expect(room.phase).toBe('round_end');
      expect(server.emit).toHaveBeenCalledWith(
        'game:roundEnd',
        expect.objectContaining({ word: 'cat' }),
      );
      expect(server.emit).toHaveBeenCalledWith(
        'game:phaseChange',
        expect.objectContaining({ phase: 'round_end' }),
      );

      // Advance past ROUND_END_DELAY_MS (5s) so nextTurn fires.
      jest.advanceTimersByTime(5_000);
      // After nextTurn is invoked, isGameComplete=true so endGame is called.
      expect(server.emit).toHaveBeenCalledWith(
        'game:end',
        expect.anything(),
      );
    });
  });

  // -------------------------------------------------------------------------
  // resetToLobby
  // -------------------------------------------------------------------------

  describe('resetToLobby', () => {
    it('returns silently if the room is missing or already in lobby', () => {
      mockRoomService.getRoom.mockReturnValue(undefined);
      const server = createServerMock();
      service.resetToLobby('room-x', server as any);
      expect(server.emit).not.toHaveBeenCalled();

      const lobbyRoom = makeRoom({ phase: 'lobby' });
      mockRoomService.getRoom.mockReturnValue(lobbyRoom);
      service.resetToLobby(lobbyRoom.id, server as any);
      expect(server.emit).not.toHaveBeenCalled();
    });

    it('clears all round state and resets player scores', () => {
      const room = makeRoom({
        phase: 'drawing',
        currentWord: 'cat',
        wordHint: 'c_t',
        currentRound: 2,
        teamAScore: 5,
        teamBScore: 3,
        correctGuessers: ['g1'],
        drawingHistory: [{ type: 'stroke', timestamp: 1, playerId: 'drawer-1' }],
      });
      // Give a player some score.
      room.players.get('drawer-1')!.score = 100;
      room.players.get('g1')!.score = 50;
      mockRoomService.getRoom.mockReturnValue(room);

      const server = createServerMock();
      service.resetToLobby(room.id, server as any);

      expect(room.phase).toBe('lobby');
      expect(room.currentWord).toBeNull();
      expect(room.wordHint).toBe('');
      expect(room.drawerId).toBeNull();
      expect(room.correctGuessers).toEqual([]);
      expect(room.drawingHistory).toEqual([]);
      expect(room.teamAScore).toBe(0);
      expect(room.teamBScore).toBe(0);
      expect(room.currentRound).toBe(0);
      expect(room.players.get('drawer-1')!.score).toBe(0);
      expect(room.players.get('g1')!.score).toBe(0);

      expect(server.emit).toHaveBeenCalledWith(
        'game:phaseChange',
        expect.objectContaining({ phase: 'lobby' }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // handleRematchVote / markRematchDeclined
  // -------------------------------------------------------------------------

  describe('handleRematchVote', () => {
    function setupRematchRoom(): Room {
      const room = makeRoom({ phase: 'game_end' });
      // Two eligible players plus the drawer (3 total).
      room.rematchVotes = new Map([
        ['drawer-1', 'pending'],
        ['g1', 'pending'],
        ['g2', 'pending'],
      ]);
      mockRoomService.getRoomForPlayer.mockReturnValue(room);
      mockRoomService.getRoom.mockReturnValue(room);
      return room;
    }

    it('does nothing if room is not in game_end phase', () => {
      const room = makeRoom({ phase: 'lobby' });
      mockRoomService.getRoomForPlayer.mockReturnValue(room);
      const server = createServerMock();

      service.handleRematchVote('g1', 'accepted', server as any);

      expect(server.emit).not.toHaveBeenCalled();
    });

    it('records a vote and broadcasts rematch update', () => {
      const room = setupRematchRoom();
      const server = createServerMock();

      service.handleRematchVote('g1', 'accepted', server as any);

      expect(room.rematchVotes.get('g1')).toBe('accepted');
      expect(server.emit).toHaveBeenCalledWith(
        'game:rematchUpdate',
        expect.objectContaining({
          rematchState: expect.objectContaining({
            votes: expect.objectContaining({ g1: 'accepted' }),
          }),
        }),
      );
    });

    it('starts the rematch when all eligible players accept', () => {
      jest.useFakeTimers();
      const room = setupRematchRoom();
      const server = createServerMock();

      service.handleRematchVote('drawer-1', 'accepted', server as any);
      service.handleRematchVote('g1', 'accepted', server as any);
      service.handleRematchVote('g2', 'accepted', server as any);

      expect(server.emit).toHaveBeenCalledWith('game:rematchStart');
      expect(room.phase).toBe('lobby');
      // Player scores should be reset.
      for (const player of room.players.values()) {
        expect(player.score).toBe(0);
      }
    });

    it('does NOT start a rematch when at least one player declines', () => {
      const room = setupRematchRoom();
      const server = createServerMock();

      service.handleRematchVote('drawer-1', 'accepted', server as any);
      service.handleRematchVote('g1', 'declined', server as any);
      service.handleRematchVote('g2', 'accepted', server as any);

      expect(server.emit).not.toHaveBeenCalledWith('game:rematchStart');
      expect(room.phase).toBe('game_end');
    });
  });

  describe('markRematchDeclined', () => {
    it('marks the player as declined and broadcasts an update', () => {
      const room = makeRoom({ phase: 'game_end' });
      room.rematchVotes = new Map([
        ['drawer-1', 'pending'],
        ['g1', 'pending'],
      ]);
      const server = createServerMock();

      service.markRematchDeclined('g1', room, server as any);

      expect(room.rematchVotes.get('g1')).toBe('declined');
      expect(server.emit).toHaveBeenCalledWith(
        'game:rematchUpdate',
        expect.objectContaining({
          rematchState: expect.objectContaining({
            votes: expect.objectContaining({ g1: 'declined' }),
          }),
        }),
      );
    });

    it('does nothing if room is not in game_end phase', () => {
      const room = makeRoom({ phase: 'drawing' });
      room.rematchVotes = new Map([['g1', 'pending']]);
      const server = createServerMock();

      service.markRematchDeclined('g1', room, server as any);

      expect(room.rematchVotes.get('g1')).toBe('pending');
      expect(server.emit).not.toHaveBeenCalled();
    });

    it('does nothing if the player has no rematch vote entry', () => {
      const room = makeRoom({ phase: 'game_end' });
      room.rematchVotes = new Map([['drawer-1', 'pending']]);
      const server = createServerMock();

      service.markRematchDeclined('ghost', room, server as any);

      expect(server.emit).not.toHaveBeenCalled();
    });
  });
});
