import { Injectable, Logger, OnApplicationBootstrap, Inject, forwardRef } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Server } from 'socket.io';
import { Room, GameMode, Player, LobbyInfo } from '@doodledraw/shared';
import { RoomService } from '../room.service';
import { GameService } from '../game.service';
import { RoomPersistenceService } from '../room-persistence.service';
import { GameHistoryService } from '../game-history.service';
import { createBotPlayer, removeBotState, isBotId } from './bot-player';

export interface PermanentLobbyConfig {
  id: string;
  maxPlayers: number;
  mode: GameMode;
  name: string;
}

export const PERMANENT_LOBBIES: PermanentLobbyConfig[] = [
  { id: 'lobby-2p', maxPlayers: 2, mode: 'classic', name: '2 Player' },
  { id: 'lobby-3p', maxPlayers: 3, mode: 'classic', name: '3 Player' },
  { id: 'lobby-4p', maxPlayers: 4, mode: 'team', name: 'Teams (2v2)' },
];

@Injectable()
export class PermanentLobbiesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermanentLobbiesService.name);

  private server: Server | null = null;

  /** Track permanent lobby room IDs. */
  private readonly lobbyRoomIds = new Set<string>();

  /** Scheduled cleanup timers for bot-only rooms. */
  private readonly cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /** How long to wait before cleaning up a bot-only room (ms). */
  private static readonly CLEANUP_DELAY_MS = 2 * 60 * 1000; // 2 minutes

  constructor(
    private readonly roomService: RoomService,
    @Inject(forwardRef(() => GameService))
    private readonly gameService: GameService,
    private readonly persistence: RoomPersistenceService,
    private readonly gameHistoryService: GameHistoryService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  onApplicationBootstrap(): void {
    // Delay initialization until server is available.
    // The gateway will call initLobbies() once the server is ready.
    this.logger.log('PermanentLobbiesService ready — waiting for WebSocket server');
  }

  /**
   * Initialize — no shared rooms needed. Bot games are created on-demand per player.
   * Clean up any stale bot game rooms from previous sessions.
   */
  async initLobbies(): Promise<void> {
    // Clean up stale permanent lobby rooms from previous sessions.
    for (const config of PERMANENT_LOBBIES) {
      const existing = this.roomService.getRoom(config.id);
      if (existing) {
        this.logger.log(`Removing stale permanent lobby ${config.id}`);
        for (const [id, player] of existing.players) {
          this.roomService.playerRoomMap.delete(id);
          this.roomService.persistentPlayerRoomMap.delete(player.persistentId);
          removeBotState(id);
        }
        this.roomService.rooms.delete(config.id);
      }
    }

    // Also clean up any orphaned bot-* rooms from restored sessions.
    for (const [roomId, room] of this.roomService.rooms) {
      if (room.isPermanentLobby) {
        const hasRealPlayers = Array.from(room.players.values()).some(p => !p.isBot);
        if (!hasRealPlayers) {
          this.logger.log(`Cleaning up orphaned bot game ${roomId}`);
          for (const [id, player] of room.players) {
            this.roomService.playerRoomMap.delete(id);
            this.roomService.persistentPlayerRoomMap.delete(player.persistentId);
            removeBotState(id);
          }
          this.roomService.rooms.delete(roomId);
        } else {
          // Track it so we handle game end / player leave correctly.
          this.lobbyRoomIds.add(roomId);
        }
      }
    }

    this.logger.log(`PermanentLobbiesService initialized — bot games created on demand`);
  }

  /**
   * Handle a real player requesting a bot game.
   * Creates a NEW room for each player with bots filling the remaining slots.
   * Returns the created room ID, or null on failure.
   */
  createBotGameForPlayer(
    lobbyConfigId: string,
    player: Player,
    language?: string,
  ): string | null {
    const config = PERMANENT_LOBBIES.find((l) => l.id === lobbyConfigId);
    if (!config) return null;

    // Generate a unique room ID for this bot game.
    const roomId = `bot-${config.maxPlayers}p-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    player.isHost = true;

    // Create the room.
    const room: Room = {
      id: roomId,
      mode: config.mode,
      phase: 'lobby',
      settings: {
        maxPlayers: config.maxPlayers,
        roundTime: 80,
        language: language || 'en',
        difficulty: 1,
        totalRounds: 5,
        hintsEnabled: true,
        redrawEnabled: false,
        isPublic: false,
        teamAName: config.mode === 'team' ? 'Team A' : '',
        teamBName: config.mode === 'team' ? 'Team B' : '',
      },
      players: new Map([[player.id, player]]),
      createdAt: Date.now(),
      currentRound: 1,
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
      isPermanentLobby: true, // Still treated as a bot game for backfill etc.
    };

    // Register the room.
    this.roomService.rooms.set(roomId, room);
    this.roomService.playerRoomMap.set(player.id, roomId);
    this.roomService.persistentPlayerRoomMap.set(player.persistentId, roomId);
    this.lobbyRoomIds.add(roomId);

    // Assign team if team mode.
    if (config.mode === 'team') {
      player.team = 'A';
    }

    // Fill remaining slots with bots.
    this.fillBotsInRoom(room, config.maxPlayers, config.mode, roomId);

    this.logger.log(`Created bot game ${roomId} (${config.name}) for player ${player.nickname} with ${room.players.size - 1} bots, language=${language || 'en'}`);

    return roomId;
  }

  /**
   * Fill empty slots in any bot game room.
   */
  private fillBotsInRoom(room: Room, maxPlayers: number, mode: GameMode, roomId: string): void {
    while (room.players.size < maxPlayers) {
      const teamAssignment = mode === 'team'
        ? this.getTeamForNewPlayer(room)
        : undefined;

      const bot = createBotPlayer({
        roomId,
        difficulty: 'medium',
        team: teamAssignment,
      });

      room.players.set(bot.id, bot);
      this.roomService.playerRoomMap.set(bot.id, roomId);
      this.roomService.persistentPlayerRoomMap.set(bot.persistentId, roomId);
    }
  }

  /**
   * Handle a real player leaving a bot game.
   * If no real players left, clean up the room entirely.
   */
  handlePlayerLeft(roomId: string, playerId: string): void {
    const room = this.roomService.getRoom(roomId);
    if (!room) return;

    const leavingPlayer = room.players.get(playerId);
    if (!leavingPlayer || leavingPlayer.isBot) return;

    const realPlayersLeft = Array.from(room.players.values()).filter(p => !p.isBot && p.id !== playerId);

    if (realPlayersLeft.length === 0) {
      // No real players left — schedule cleanup in 2 minutes.
      this.scheduleCleanup(roomId);
    } else {
      // A real player is still here — cancel any pending cleanup.
      this.cancelCleanup(roomId);
      // Backfill with a bot.
      const bot = createBotPlayer({
        roomId,
        score: leavingPlayer.score,
        difficulty: 'medium',
        team: leavingPlayer.team,
      });

      room.players.set(bot.id, bot);
      this.roomService.playerRoomMap.set(bot.id, roomId);
      this.roomService.persistentPlayerRoomMap.set(bot.persistentId, roomId);

      // Transfer host to another real player if the leaving player was host.
      if (leavingPlayer.isHost) {
        realPlayersLeft[0].isHost = true;
      }
    }
  }

  /**
   * Called when a bot game ends. Reset to lobby so the player can play again.
   */
  async handleGameEnd(roomId: string): Promise<void> {
    if (!this.server) return;
    if (!this.lobbyRoomIds.has(roomId)) return;

    const room = this.roomService.getRoom(roomId);
    if (!room) return;

    // Check if there are still real players.
    const realPlayers = Array.from(room.players.values()).filter(p => !p.isBot);
    if (realPlayers.length === 0) {
      // No real players — schedule cleanup in 2 minutes.
      this.scheduleCleanup(roomId);
      return;
    }

    this.logger.log(`Auto-restarting bot game ${roomId}`);

    // Reset game state.
    room.phase = 'lobby';
    room.currentRound = 1;
    room.currentWord = null;
    room.currentWordQuickDraw = null;
    room.wordHint = '';
    room.drawerId = null;
    room.teamADrawerId = null;
    room.teamBDrawerId = null;
    room.roundStartTime = null;
    room.correctGuessers = [];
    room.drawingHistory = [];
    room.pendingWords = [];
    room.drawOrder = [];
    room.drawOrderIndex = 0;
    room.teamAScore = 0;
    room.teamBScore = 0;
    room.lastWinningTeam = null;
    room.isRedrawRound = false;
    room.playerWordHistory = new Map();
    room.chatHistory = [];
    room.rematchVotes = new Map();

    // Reset player scores.
    for (const [, player] of room.players) {
      player.score = 0;
      player.isDrawing = false;
      player.hasDrawn = false;
    }

    // Broadcast updated room state — stay in lobby, wait for real player to start.
    if (this.server) {
      this.server.to(roomId).emit('room:updated', {
        phase: room.phase,
        players: Array.from(room.players.values()),
        settings: room.settings,
      });
    }

    this.logger.log(`Bot game ${roomId} reset to lobby phase — waiting for player to start`);
  }

  /**
   * Check if a room is a permanent lobby.
   */
  isPermanentLobby(roomId: string): boolean {
    return this.lobbyRoomIds.has(roomId);
  }

  /**
   * Get lobby templates for the lobby browser.
   * These are static configs — each "Join" creates a new room.
   */
  getLobbyStates(): LobbyInfo[] {
    return PERMANENT_LOBBIES.map((config) => ({
      id: config.id,
      name: config.name,
      maxPlayers: config.maxPlayers,
      realPlayers: 0,
      totalPlayers: config.maxPlayers,
      status: 'waiting' as const,
      mode: config.mode,
    }));
  }

  /**
   * Broadcast lobby templates to all clients in the lobby_browser room.
   * These are static configs — no need for frequent updates, but we keep
   * the interval for clients that join the page.
   */
  @Interval(10000)
  broadcastLobbyState(): void {
    if (!this.server) return;

    const lobbies = this.getLobbyStates();
    this.server.to('lobby_browser').emit('lobbies:state', { lobbies });
  }

  private getTeamForNewPlayer(room: Room): 'A' | 'B' {
    const teamA = Array.from(room.players.values()).filter((p) => p.team === 'A').length;
    const teamB = Array.from(room.players.values()).filter((p) => p.team === 'B').length;
    return teamA <= teamB ? 'A' : 'B';
  }

  /**
   * Schedule a bot-only room for cleanup after 2 minutes.
   */
  private scheduleCleanup(roomId: string): void {
    // Don't double-schedule.
    if (this.cleanupTimers.has(roomId)) return;

    this.logger.log(`All real players left bot game ${roomId} — scheduling cleanup in ${PermanentLobbiesService.CLEANUP_DELAY_MS / 1000}s`);

    const timer = setTimeout(() => {
      this.cleanupTimers.delete(roomId);
      this.destroyBotRoom(roomId);
    }, PermanentLobbiesService.CLEANUP_DELAY_MS);

    this.cleanupTimers.set(roomId, timer);
  }

  /**
   * Cancel a pending cleanup (e.g. a real player rejoined).
   */
  cancelCleanup(roomId: string): void {
    const timer = this.cleanupTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(roomId);
      this.logger.log(`Cancelled cleanup for bot game ${roomId} — real player present`);
    }
  }

  /**
   * Destroy a bot-only room, cleaning up all state.
   */
  private destroyBotRoom(roomId: string): void {
    const room = this.roomService.getRoom(roomId);
    if (!room) return;

    // Double-check no real players snuck in.
    const hasRealPlayers = Array.from(room.players.values()).some(p => !p.isBot);
    if (hasRealPlayers) {
      this.logger.log(`Skipping cleanup of ${roomId} — real player found`);
      return;
    }

    this.logger.log(`Destroying bot-only room ${roomId}`);

    // Archive to game history before tearing down (fire-and-forget, deduped).
    this.gameHistoryService.archiveGame(room, 'cleaned_up').catch(() => {});

    for (const [id, player] of room.players) {
      this.roomService.playerRoomMap.delete(id);
      this.roomService.persistentPlayerRoomMap.delete(player.persistentId);
      if (player.isBot) removeBotState(id);
    }

    this.roomService.rooms.delete(roomId);
    this.lobbyRoomIds.delete(roomId);
    this.persistence.deleteRoom(roomId);
  }
}
