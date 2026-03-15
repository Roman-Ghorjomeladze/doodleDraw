import { Injectable, Logger } from '@nestjs/common';
import {
  Room,
  Player,
  SerializedRoom,
  RoomSettings,
  GamePhase,
  GameMode,
  Team,
} from '@doodledraw/shared';
import {
  ROOM_CODE_LENGTH,
  MAX_PLAYERS,
  DEFAULT_ROOM_SETTINGS,
  TEAM_NAME_PAIRS,
} from '@doodledraw/shared';

const ROOM_CLEANUP_DELAY_MS = 5 * 60 * 1000; // 5 minutes

/** Characters excluded from room codes to avoid ambiguity: 0, O, 1, I, L */
const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  /** All active rooms keyed by room id (the 6-char code). */
  readonly rooms: Map<string, Room> = new Map();

  /** Maps a socket id to the room id the player is in. */
  readonly playerRoomMap: Map<string, string> = new Map();

  /** Pending cleanup timeouts per room id. */
  private readonly cleanupTimers: Map<string, NodeJS.Timeout> = new Map();

  // ---------------------------------------------------------------------------
  // Room lifecycle
  // ---------------------------------------------------------------------------

  createRoom(
    mode: GameMode,
    hostId: string,
    nickname: string,
    avatar: string,
  ): Room {
    const roomId = this.generateRoomCode();

    const host: Player = {
      id: hostId,
      nickname,
      avatar,
      score: 0,
      isDrawing: false,
      hasDrawn: false,
      isHost: true,
      isConnected: true,
    };

    // Pick random funny team names for team mode and assign host to Team A.
    const settings = { ...DEFAULT_ROOM_SETTINGS };
    if (mode === 'team') {
      const pair = TEAM_NAME_PAIRS[Math.floor(Math.random() * TEAM_NAME_PAIRS.length)];
      settings.teamAName = pair[0];
      settings.teamBName = pair[1];
      host.team = 'A';
    }

    const room: Room = {
      id: roomId,
      mode,
      phase: 'lobby' as GamePhase,
      settings,
      players: new Map<string, Player>([[hostId, host]]),
      currentRound: 0,
      currentWord: null,
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
    };

    this.rooms.set(roomId, room);
    this.playerRoomMap.set(hostId, roomId);

    this.logger.log(`Room ${roomId} created by ${nickname} (${hostId}) [${mode}]`);
    return room;
  }

  joinRoom(
    roomId: string,
    playerId: string,
    nickname: string,
    avatar: string,
  ): Room {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.phase !== 'lobby') {
      throw new Error('Game already in progress');
    }

    if (room.players.size >= (room.settings.maxPlayers || MAX_PLAYERS)) {
      throw new Error('Room is full');
    }

    // Check for duplicate nickname
    for (const [, player] of room.players) {
      if (player.nickname.toLowerCase() === nickname.toLowerCase() && player.isConnected) {
        throw new Error('Nickname already taken');
      }
    }

    const player: Player = {
      id: playerId,
      nickname,
      avatar,
      score: 0,
      isDrawing: false,
      hasDrawn: false,
      isHost: false,
      isConnected: true,
    };

    // Auto-assign team in team mode (balance teams).
    if (room.mode === 'team') {
      player.team = this.getSmallestTeam(room);
    }

    room.players.set(playerId, player);
    this.playerRoomMap.set(playerId, roomId);

    this.cancelCleanup(roomId);

    this.logger.log(`Player ${nickname} (${playerId}) joined room ${roomId}`);
    return room;
  }

  spectateRoom(
    roomId: string,
    playerId: string,
    nickname: string,
    avatar: string,
  ): Room {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Check for duplicate nickname.
    for (const [, player] of room.players) {
      if (player.nickname.toLowerCase() === nickname.toLowerCase() && player.isConnected) {
        throw new Error('Nickname already taken');
      }
    }

    const player: Player = {
      id: playerId,
      nickname,
      avatar,
      score: 0,
      isDrawing: false,
      hasDrawn: false,
      isHost: false,
      isConnected: true,
      isSpectator: true,
    };

    room.players.set(playerId, player);
    this.playerRoomMap.set(playerId, roomId);

    this.cancelCleanup(roomId);

    this.logger.log(`Spectator ${nickname} (${playerId}) joined room ${roomId}`);
    return room;
  }

  leaveRoom(playerId: string): { room: Room; wasHost: boolean } | null {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) {
      this.playerRoomMap.delete(playerId);
      return null;
    }

    const player = room.players.get(playerId);
    const wasHost = player?.isHost ?? false;

    room.players.delete(playerId);
    this.playerRoomMap.delete(playerId);

    // If room is now empty, schedule cleanup.
    if (room.players.size === 0) {
      this.scheduleCleanup(roomId);
      return { room, wasHost };
    }

    // Migrate host if the leaving player was the host.
    if (wasHost) {
      const nextHost = this.findNextHost(room);
      if (nextHost) {
        nextHost.isHost = true;
        this.logger.log(`Host migrated to ${nextHost.nickname} in room ${roomId}`);
      }
    }

    return { room, wasHost };
  }

  // ---------------------------------------------------------------------------
  // Disconnect / reconnect
  // ---------------------------------------------------------------------------

  handleDisconnect(playerId: string): Room | null {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.get(playerId);
    if (!player) return null;

    player.isConnected = false;
    this.logger.log(`Player ${player.nickname} (${playerId}) disconnected from room ${roomId}`);

    // If all players are disconnected, schedule room cleanup.
    const anyConnected = Array.from(room.players.values()).some((p) => p.isConnected);
    if (!anyConnected) {
      this.scheduleCleanup(roomId);
    }

    return room;
  }

  /**
   * Reconnect a player with a new socket ID, transferring all state
   * from the old socket ID to the new one.
   */
  reconnectPlayer(roomId: string, oldPlayerId: string, newPlayerId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const player = room.players.get(oldPlayerId);
    if (!player) throw new Error('Player not found in room');

    // Move player entry from old ID to new ID.
    player.id = newPlayerId;
    player.isConnected = true;
    room.players.delete(oldPlayerId);
    room.players.set(newPlayerId, player);

    // Update playerRoomMap.
    this.playerRoomMap.delete(oldPlayerId);
    this.playerRoomMap.set(newPlayerId, roomId);

    // Update drawer IDs if they match the old ID.
    if (room.drawerId === oldPlayerId) room.drawerId = newPlayerId;
    if (room.teamADrawerId === oldPlayerId) room.teamADrawerId = newPlayerId;
    if (room.teamBDrawerId === oldPlayerId) room.teamBDrawerId = newPlayerId;

    // Update drawOrder array.
    room.drawOrder = room.drawOrder.map((id) => (id === oldPlayerId ? newPlayerId : id));

    // Update correctGuessers.
    room.correctGuessers = room.correctGuessers.map((id) => (id === oldPlayerId ? newPlayerId : id));

    // Update drawingHistory playerId references.
    for (const action of room.drawingHistory) {
      if (action.playerId === oldPlayerId) action.playerId = newPlayerId;
    }

    // Transfer playerWordHistory.
    const wordHistory = room.playerWordHistory.get(oldPlayerId);
    if (wordHistory) {
      room.playerWordHistory.delete(oldPlayerId);
      room.playerWordHistory.set(newPlayerId, wordHistory);
    }

    this.cancelCleanup(roomId);

    this.logger.log(`Player ${player.nickname} reconnected: ${oldPlayerId} → ${newPlayerId} in room ${roomId}`);
    return room;
  }

  // ---------------------------------------------------------------------------
  // Lookups
  // ---------------------------------------------------------------------------

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomForPlayer(playerId: string): Room | undefined {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  updateSettings(roomId: string, settings: Partial<RoomSettings>): Room {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    room.settings = {
      ...room.settings,
      ...settings,
    };

    this.logger.log(`Room ${roomId} settings updated`);
    return room;
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  serializeRoom(room: Room): SerializedRoom {
    return {
      id: room.id,
      mode: room.mode,
      phase: room.phase,
      settings: room.settings,
      players: Array.from(room.players.values()),
      currentRound: room.currentRound,
      wordHint: room.wordHint,
      drawerId: room.drawerId,
      teamADrawerId: room.teamADrawerId,
      teamBDrawerId: room.teamBDrawerId,
      correctGuessers: room.correctGuessers,
      drawOrderIndex: room.drawOrderIndex,
      teamAScore: room.teamAScore,
      teamBScore: room.teamBScore,
      isRedrawRound: room.isRedrawRound,
    };
  }

  // ---------------------------------------------------------------------------
  // Room code generation
  // ---------------------------------------------------------------------------

  generateRoomCode(): string {
    let code: string;
    do {
      code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getSmallestTeam(room: Room): Team {
    let a = 0;
    let b = 0;
    for (const [, p] of room.players) {
      if (p.isSpectator) continue;
      if (p.team === 'A') a++;
      else if (p.team === 'B') b++;
    }
    return a <= b ? 'A' : 'B';
  }

  private findNextHost(room: Room): Player | null {
    // Pick the first connected player.
    for (const [, player] of room.players) {
      if (player.isConnected) {
        return player;
      }
    }
    return null;
  }

  private scheduleCleanup(roomId: string): void {
    if (this.cleanupTimers.has(roomId)) return;

    const timer = setTimeout(() => {
      const room = this.rooms.get(roomId);
      if (!room) return;

      const anyConnected = Array.from(room.players.values()).some((p) => p.isConnected);
      if (!anyConnected) {
        this.rooms.delete(roomId);
        // Clean up player-room mappings for remaining entries.
        for (const [, player] of room.players) {
          this.playerRoomMap.delete(player.id);
        }
        this.logger.log(`Room ${roomId} cleaned up (no connected players)`);
      }
      this.cleanupTimers.delete(roomId);
    }, ROOM_CLEANUP_DELAY_MS);

    this.cleanupTimers.set(roomId, timer);
  }

  private cancelCleanup(roomId: string): void {
    const timer = this.cleanupTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(roomId);
    }
  }
}
