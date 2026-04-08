import { Test, TestingModule } from '@nestjs/testing';
import { DrawingService } from '../drawing.service';
import { RoomService } from '../room.service';
import type { DrawAction, Player, Room } from '@doodledraw/shared';

describe('DrawingService', () => {
  let service: DrawingService;
  let mockRoomService: {
    getRoomForPlayer: jest.Mock;
    getRoom: jest.Mock;
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Creates a Socket.IO server mock that records `to(...).emit(...)` calls. */
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

  function makeClassicRoom(overrides: Partial<Room> = {}): Room {
    const drawer = makePlayer({ id: 'drawer-1', isDrawing: true });
    const guesser = makePlayer({ id: 'guesser-1', nickname: 'Bob' });
    const players = new Map<string, Player>([
      [drawer.id, drawer],
      [guesser.id, guesser],
    ]);
    return {
      id: 'room-1',
      mode: 'classic',
      phase: 'drawing',
      settings: {} as any,
      players,
      createdAt: 0,
      currentRound: 1,
      currentWord: 'cat',
      currentWordQuickDraw: null,
      wordHint: '_ _ _',
      drawerId: drawer.id,
      teamADrawerId: null,
      teamBDrawerId: null,
      roundStartTime: Date.now(),
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

  function makeTeamRoom(overrides: Partial<Room> = {}): Room {
    const aDrawer = makePlayer({ id: 'a-drawer', team: 'A', isDrawing: true });
    const aGuesser = makePlayer({ id: 'a-guesser', team: 'A' });
    const bDrawer = makePlayer({ id: 'b-drawer', team: 'B', isDrawing: true });
    const bGuesser = makePlayer({ id: 'b-guesser', team: 'B' });
    const players = new Map<string, Player>([
      [aDrawer.id, aDrawer],
      [aGuesser.id, aGuesser],
      [bDrawer.id, bDrawer],
      [bGuesser.id, bGuesser],
    ]);
    return {
      ...makeClassicRoom(),
      id: 'team-room',
      mode: 'team',
      drawerId: null,
      teamADrawerId: aDrawer.id,
      teamBDrawerId: bDrawer.id,
      players,
      ...overrides,
    };
  }

  // -------------------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------------------

  beforeEach(async () => {
    mockRoomService = {
      getRoomForPlayer: jest.fn(),
      getRoom: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrawingService,
        { provide: RoomService, useValue: mockRoomService },
      ],
    }).compile();

    service = module.get<DrawingService>(DrawingService);
  });

  // -------------------------------------------------------------------------
  // handleDrawAction
  // -------------------------------------------------------------------------

  describe('handleDrawAction', () => {
    it('returns silently if no room exists for player', () => {
      mockRoomService.getRoomForPlayer.mockReturnValue(null);
      const server = createServerMock();
      const action: DrawAction = { type: 'stroke', timestamp: 0, playerId: '' };

      service.handleDrawAction('ghost', action, server as any);

      expect(server.to).not.toHaveBeenCalled();
    });

    it('ignores draw actions from non-drawers in classic mode', () => {
      const room = makeClassicRoom();
      mockRoomService.getRoomForPlayer.mockReturnValue(room);
      const server = createServerMock();
      const action: DrawAction = { type: 'stroke', timestamp: 0, playerId: '' };

      service.handleDrawAction('guesser-1', action, server as any);

      expect(server.to).not.toHaveBeenCalled();
      expect(room.drawingHistory).toHaveLength(0);
    });

    it('stores the action in drawing history and stamps player/timestamp', () => {
      const room = makeClassicRoom();
      mockRoomService.getRoomForPlayer.mockReturnValue(room);
      const server = createServerMock();
      const action: DrawAction = {
        type: 'stroke',
        timestamp: 0,
        playerId: '',
        strokeId: 's1',
      };

      service.handleDrawAction('drawer-1', action, server as any);

      expect(room.drawingHistory).toHaveLength(1);
      expect(room.drawingHistory[0].playerId).toBe('drawer-1');
      expect(room.drawingHistory[0].timestamp).toBeGreaterThan(0);
    });

    it('broadcasts draw action to room in classic mode', () => {
      const room = makeClassicRoom();
      mockRoomService.getRoomForPlayer.mockReturnValue(room);
      const server = createServerMock();
      const action: DrawAction = { type: 'stroke', timestamp: 0, playerId: '' };

      service.handleDrawAction('drawer-1', action, server as any);

      expect(server.to).toHaveBeenCalledWith('room-1');
      expect(server.emit).toHaveBeenCalledWith('draw:action', action);
    });

    it('sends unblurred to drawer team and blurred to opposing team in team mode', () => {
      const room = makeTeamRoom();
      mockRoomService.getRoomForPlayer.mockReturnValue(room);
      const server = createServerMock();
      const action: DrawAction = { type: 'stroke', timestamp: 0, playerId: '' };

      service.handleDrawAction('a-drawer', action, server as any);

      // Stored in history.
      expect(room.drawingHistory).toHaveLength(1);
      // Should NOT broadcast to roomId in team mode.
      expect(server.to).not.toHaveBeenCalledWith('team-room');
      // a-guesser (team A) gets unblurred draw action.
      expect(server.to).toHaveBeenCalledWith('a-guesser');
      // b-drawer and b-guesser (team B) get blurred.
      expect(server.to).toHaveBeenCalledWith('b-drawer');
      expect(server.to).toHaveBeenCalledWith('b-guesser');

      // Inspect emit events: ensure both blurred and unblurred used.
      const emitNames = server.emit.mock.calls.map((c) => c[0]);
      expect(emitNames).toContain('draw:action');
      expect(emitNames).toContain('draw:actionBlurred');
    });
  });

  // -------------------------------------------------------------------------
  // handleUndo
  // -------------------------------------------------------------------------

  describe('handleUndo', () => {
    it('returns silently if no room exists', () => {
      mockRoomService.getRoomForPlayer.mockReturnValue(null);
      const server = createServerMock();

      service.handleUndo('ghost', server as any);

      expect(server.to).not.toHaveBeenCalled();
    });

    it('ignores undo from non-drawers', () => {
      const room = makeClassicRoom();
      mockRoomService.getRoomForPlayer.mockReturnValue(room);
      const server = createServerMock();

      service.handleUndo('guesser-1', server as any);

      expect(server.to).not.toHaveBeenCalled();
    });

    it('removes all actions belonging to the last stroke by stroke id', () => {
      const room = makeClassicRoom();
      // Two streamed parts of strokeId s1 plus another strokeId s2.
      room.drawingHistory = [
        { type: 'stroke', strokeId: 's1', timestamp: 1, playerId: 'drawer-1' },
        { type: 'stroke', strokeId: 's1', timestamp: 2, playerId: 'drawer-1' },
        { type: 'stroke', strokeId: 's2', timestamp: 3, playerId: 'drawer-1' },
      ];
      mockRoomService.getRoomForPlayer.mockReturnValue(room);
      const server = createServerMock();

      service.handleUndo('drawer-1', server as any);

      // Only s1 partial strokes remain (the last stroke s2 was removed).
      expect(room.drawingHistory).toHaveLength(2);
      expect(room.drawingHistory.every((a) => a.strokeId === 's1')).toBe(true);
      expect(server.emit).toHaveBeenCalledWith(
        'draw:action',
        expect.objectContaining({ type: 'undo', playerId: 'drawer-1' }),
      );
    });

    it('broadcasts undo to entire room in classic mode', () => {
      const room = makeClassicRoom();
      room.drawingHistory = [
        { type: 'stroke', strokeId: 's1', timestamp: 1, playerId: 'drawer-1' },
      ];
      mockRoomService.getRoomForPlayer.mockReturnValue(room);
      const server = createServerMock();

      service.handleUndo('drawer-1', server as any);

      expect(server.to).toHaveBeenCalledWith('room-1');
    });
  });

  // -------------------------------------------------------------------------
  // clearCanvas
  // -------------------------------------------------------------------------

  describe('clearCanvas', () => {
    it('returns silently if room is missing', () => {
      mockRoomService.getRoom.mockReturnValue(null);
      const server = createServerMock();

      service.clearCanvas('room-1', 'drawer-1', server as any);

      expect(server.to).not.toHaveBeenCalled();
    });

    it('ignores clear from non-drawer', () => {
      const room = makeClassicRoom();
      room.drawingHistory = [
        { type: 'stroke', strokeId: 's1', timestamp: 1, playerId: 'drawer-1' },
      ];
      mockRoomService.getRoom.mockReturnValue(room);
      const server = createServerMock();

      service.clearCanvas('room-1', 'guesser-1', server as any);

      expect(room.drawingHistory).toHaveLength(1);
      expect(server.to).not.toHaveBeenCalled();
    });

    it('clears history and broadcasts clear in classic mode', () => {
      const room = makeClassicRoom();
      room.drawingHistory = [
        { type: 'stroke', strokeId: 's1', timestamp: 1, playerId: 'drawer-1' },
        { type: 'stroke', strokeId: 's2', timestamp: 2, playerId: 'drawer-1' },
      ];
      mockRoomService.getRoom.mockReturnValue(room);
      const server = createServerMock();

      service.clearCanvas('room-1', 'drawer-1', server as any);

      expect(room.drawingHistory).toEqual([]);
      expect(server.to).toHaveBeenCalledWith('room-1');
      expect(server.emit).toHaveBeenCalledWith(
        'draw:action',
        expect.objectContaining({ type: 'clear', playerId: 'drawer-1' }),
      );
    });
  });
});
