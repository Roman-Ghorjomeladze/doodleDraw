import { Test, TestingModule } from '@nestjs/testing';
import { RoomService } from '../room.service';
import { RoomPersistenceService } from '../room-persistence.service';
import type { Player } from '@doodledraw/shared';

describe('RoomService', () => {
  let service: RoomService;

  const mockPersistence = {
    persistRoom: jest.fn(),
    deleteRoom: jest.fn(),
    markCompleted: jest.fn(),
    loadActiveRooms: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        { provide: RoomPersistenceService, useValue: mockPersistence },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
  });

  // -----------------------------------------------------------------------
  // leaveRoom: last human leaves with bots remaining
  // -----------------------------------------------------------------------

  describe('leaveRoom', () => {
    it('should delete the room when the last human leaves but bots remain', () => {
      // Create a room with a human host.
      const room = service.createRoom('classic', 'human-socket', 'Alice', 'av1', 'human-pid');
      const roomId = room.id;

      // Add a bot player directly.
      const botPlayer: Player = {
        id: 'bot-socket',
        persistentId: 'bot-easy-1',
        nickname: 'Bot',
        avatar: 'bot-av',
        score: 0,
        isDrawing: false,
        hasDrawn: false,
        isHost: false,
        isConnected: true,
        isBot: true,
      };
      room.players.set('bot-socket', botPlayer);
      service.playerRoomMap.set('bot-socket', roomId);
      service.persistentPlayerRoomMap.set('bot-easy-1', roomId);

      // Human leaves.
      const result = service.leaveRoom('human-socket');

      expect(result).not.toBeNull();
      expect(result!.wasHost).toBe(true);
      // Room should be deleted.
      expect(service.rooms.has(roomId)).toBe(false);
      expect(mockPersistence.deleteRoom).toHaveBeenCalledWith(roomId);
      // Bot mappings should be cleaned up.
      expect(service.playerRoomMap.has('bot-socket')).toBe(false);
      expect(service.persistentPlayerRoomMap.has('bot-easy-1')).toBe(false);
    });

    it('should NOT delete the room when humans remain', () => {
      const room = service.createRoom('classic', 'host-socket', 'Alice', 'av1', 'host-pid');
      const roomId = room.id;

      // Add a second human player.
      service.joinRoom(roomId, 'player2-socket', 'Bob', 'av2', 'player2-pid');

      // Host leaves.
      const result = service.leaveRoom('host-socket');

      expect(result).not.toBeNull();
      expect(result!.wasHost).toBe(true);
      // Room should still exist.
      expect(service.rooms.has(roomId)).toBe(true);
      expect(mockPersistence.deleteRoom).not.toHaveBeenCalled();
      // The remaining player should become the new host.
      const remaining = room.players.get('player2-socket');
      expect(remaining?.isHost).toBe(true);
    });

    it('should return null when the player is not in any room', () => {
      const result = service.leaveRoom('nonexistent-socket');
      expect(result).toBeNull();
    });

    it('should clean up maps when a player leaves but room persists', () => {
      const room = service.createRoom('classic', 'host-socket', 'Alice', 'av1', 'host-pid');
      const roomId = room.id;
      service.joinRoom(roomId, 'player2-socket', 'Bob', 'av2', 'player2-pid');

      service.leaveRoom('player2-socket');

      expect(service.playerRoomMap.has('player2-socket')).toBe(false);
      expect(service.persistentPlayerRoomMap.has('player2-pid')).toBe(false);
      expect(room.players.has('player2-socket')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // joinRoom: auto-deduplicate nicknames
  // -----------------------------------------------------------------------

  describe('joinRoom', () => {
    it('should auto-deduplicate nicknames by appending a suffix', () => {
      const room = service.createRoom('classic', 'host-socket', 'Alice', 'av1', 'host-pid');
      const roomId = room.id;

      // Join with the same nickname.
      service.joinRoom(roomId, 'player2-socket', 'Alice', 'av2', 'player2-pid');

      const player2 = room.players.get('player2-socket');
      expect(player2).toBeDefined();
      expect(player2!.nickname).toBe('Alice2');
    });

    it('should increment suffix when multiple duplicates exist', () => {
      const room = service.createRoom('classic', 'host-socket', 'Alice', 'av1', 'host-pid');
      const roomId = room.id;

      service.joinRoom(roomId, 'p2-socket', 'Alice', 'av2', 'p2-pid');
      service.joinRoom(roomId, 'p3-socket', 'Alice', 'av3', 'p3-pid');

      const p2 = room.players.get('p2-socket');
      const p3 = room.players.get('p3-socket');
      expect(p2!.nickname).toBe('Alice2');
      expect(p3!.nickname).toBe('Alice3');
    });

    it('should not modify nickname when it is unique', () => {
      const room = service.createRoom('classic', 'host-socket', 'Alice', 'av1', 'host-pid');
      const roomId = room.id;

      service.joinRoom(roomId, 'player2-socket', 'Bob', 'av2', 'player2-pid');

      const player2 = room.players.get('player2-socket');
      expect(player2!.nickname).toBe('Bob');
    });

    it('should throw when room does not exist', () => {
      expect(() => {
        service.joinRoom('NONEXIST', 'p-socket', 'Nick', 'av', 'pid');
      }).toThrow('Room not found');
    });

    it('should throw when room is full', () => {
      const room = service.createRoom('classic', 'host-socket', 'Host', 'av1', 'host-pid');
      const roomId = room.id;
      room.settings.maxPlayers = 2;

      service.joinRoom(roomId, 'p2-socket', 'P2', 'av2', 'p2-pid');

      expect(() => {
        service.joinRoom(roomId, 'p3-socket', 'P3', 'av3', 'p3-pid');
      }).toThrow('Room is full');
    });

    it('should throw when game is already in progress', () => {
      const room = service.createRoom('classic', 'host-socket', 'Host', 'av1', 'host-pid');
      const roomId = room.id;
      room.phase = 'drawing';

      expect(() => {
        service.joinRoom(roomId, 'p2-socket', 'P2', 'av2', 'p2-pid');
      }).toThrow('Game already in progress');
    });
  });

  // -----------------------------------------------------------------------
  // createRoom
  // -----------------------------------------------------------------------

  describe('createRoom', () => {
    it('should create a room with the host as the only player', () => {
      const room = service.createRoom('classic', 'host-socket', 'Alice', 'av1', 'host-pid');

      expect(room.id).toBeDefined();
      expect(room.id.length).toBe(6);
      expect(room.mode).toBe('classic');
      expect(room.phase).toBe('lobby');
      expect(room.players.size).toBe(1);

      const host = room.players.get('host-socket');
      expect(host).toBeDefined();
      expect(host!.isHost).toBe(true);
      expect(host!.nickname).toBe('Alice');
    });

    it('should register the room in all maps', () => {
      const room = service.createRoom('classic', 'host-socket', 'Alice', 'av1', 'host-pid');

      expect(service.rooms.get(room.id)).toBe(room);
      expect(service.playerRoomMap.get('host-socket')).toBe(room.id);
      expect(service.persistentPlayerRoomMap.get('host-pid')).toBe(room.id);
    });

    it('should call persistence.persistRoom', () => {
      service.createRoom('classic', 'host-socket', 'Alice', 'av1', 'host-pid');
      expect(mockPersistence.persistRoom).toHaveBeenCalled();
    });

    it('should assign team A to the host in team mode', () => {
      const room = service.createRoom('team', 'host-socket', 'Alice', 'av1', 'host-pid');
      const host = room.players.get('host-socket');
      expect(host!.team).toBe('A');
    });
  });

  // -----------------------------------------------------------------------
  // handleDisconnect
  // -----------------------------------------------------------------------

  describe('handleDisconnect', () => {
    it('should mark the player as disconnected', () => {
      const room = service.createRoom('classic', 'host-socket', 'Alice', 'av1', 'host-pid');

      const result = service.handleDisconnect('host-socket');

      expect(result).toBe(room);
      const player = room.players.get('host-socket');
      expect(player!.isConnected).toBe(false);
    });

    it('should return null for unknown players', () => {
      const result = service.handleDisconnect('unknown-socket');
      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // scheduleCleanup (via handleDisconnect + fake timers)
  // -----------------------------------------------------------------------

  describe('scheduleCleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delete the room after cleanup delay when all players disconnect', () => {
      const room = service.createRoom('classic', 'host-socket', 'Alice', 'av1', 'host-pid');
      const roomId = room.id;

      service.handleDisconnect('host-socket');

      // Room should still exist before the timeout.
      expect(service.rooms.has(roomId)).toBe(true);

      // Advance time by 5 minutes (the cleanup delay).
      jest.advanceTimersByTime(5 * 60 * 1000);

      expect(service.rooms.has(roomId)).toBe(false);
      expect(mockPersistence.deleteRoom).toHaveBeenCalledWith(roomId);
    });

    it('should cancel cleanup when a player joins', () => {
      const room = service.createRoom('classic', 'host-socket', 'Alice', 'av1', 'host-pid');
      const roomId = room.id;

      service.handleDisconnect('host-socket');

      // A new player joins before cleanup fires.
      service.joinRoom(roomId, 'new-socket', 'Bob', 'av2', 'new-pid');

      jest.advanceTimersByTime(5 * 60 * 1000);

      // Room should still exist because cleanup was cancelled.
      expect(service.rooms.has(roomId)).toBe(true);
    });
  });
});
