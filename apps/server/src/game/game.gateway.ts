import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  GameMode,
  Team,
  DrawAction,
  RoomSettings,
  ChatMessage,
} from '@doodledraw/shared';
import { RoomService } from './room.service';
import { GameService } from './game.service';
import { DrawingService } from './drawing.service';
import { RateLimiter } from './utils/rate-limiter';
import {
  validateNickname,
  validateAvatar,
  validateChatMessage,
  validateRoomCode,
  validateGameMode,
  validateTeam,
  validateWordIndex,
  validateDrawAction,
  validateSettings,
} from './utils/validation';

const DRAWER_DISCONNECT_GRACE_MS = 10_000; // 10 seconds
const MAX_CHAT_HISTORY = 50;

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
    credentials: true,
  },
  namespace: '/game',
  // Limit incoming payload size to 64KB to prevent oversized messages.
  maxHttpBufferSize: 64 * 1024,
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  private readonly logger = new Logger(GameGateway.name);
  private readonly rateLimiter = new RateLimiter();

  /** Grace period timers for when a drawer disconnects mid-round. */
  private readonly drawerDisconnectTimers = new Map<string, NodeJS.Timeout>();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly roomService: RoomService,
    private readonly gameService: GameService,
    private readonly drawingService: DrawingService,
  ) {}

  onModuleDestroy(): void {
    this.rateLimiter.destroy();
  }

  // ---------------------------------------------------------------------------
  // Rate-limit helper — returns true if the request should be blocked.
  // ---------------------------------------------------------------------------

  private throttle(client: Socket, event: string): boolean {
    if (!this.rateLimiter.check(client.id, event)) {
      // Silently drop for high-frequency events; emit error for others.
      if (event !== 'draw:action') {
        client.emit('room:error', { message: 'Too many requests – slow down.' });
      }

      // If too many violations, disconnect the abuser.
      if (this.rateLimiter.shouldDisconnect(client.id)) {
        this.logger.warn(`Disconnecting abusive client: ${client.id}`);
        client.emit('room:error', { message: 'Disconnected for rate limit abuse.' });
        client.disconnect(true);
      }
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Connection lifecycle
  // ---------------------------------------------------------------------------

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Clean up rate limiter state for this socket.
    this.rateLimiter.removeSocket(client.id);

    const room = this.roomService.handleDisconnect(client.id);
    if (room) {
      this.server.to(room.id).emit('room:updated', {
        room: this.roomService.serializeRoom(room),
      });

      this.broadcastPublicRooms();
      this.broadcastOngoingGames();

      // If the disconnected player was the drawer during a drawing phase,
      // give them a grace period to reconnect before ending the round.
      if (room.phase === 'drawing') {
        const wasDrawer =
          room.drawerId === client.id ||
          room.teamADrawerId === client.id ||
          room.teamBDrawerId === client.id;

        if (wasDrawer) {
          const timerKey = `${room.id}:${client.id}`;
          const timer = setTimeout(() => {
            this.drawerDisconnectTimers.delete(timerKey);
            // Check if the player is still disconnected.
            const currentRoom = this.roomService.getRoom(room.id);
            if (!currentRoom || currentRoom.phase !== 'drawing') return;
            // The player's ID might have been remapped by reconnectPlayer,
            // so check if any drawer is still disconnected.
            const drawers = [currentRoom.drawerId, currentRoom.teamADrawerId, currentRoom.teamBDrawerId].filter(Boolean);
            const anyDrawerDisconnected = drawers.some((id) => {
              const p = currentRoom.players.get(id!);
              return p && !p.isConnected;
            });
            if (anyDrawerDisconnected) {
              this.gameService.endRound(currentRoom.id, this.server);
            }
          }, DRAWER_DISCONNECT_GRACE_MS);
          this.drawerDisconnectTimers.set(timerKey, timer);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Room events
  // ---------------------------------------------------------------------------

  @SubscribeMessage('room:create')
  async handleRoomCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { mode: GameMode; nickname: string; avatar: string },
  ): Promise<void> {
    if (this.throttle(client, 'room:create')) return;

    try {
      // Validate inputs.
      const mode = validateGameMode(data?.mode);
      const nickname = validateNickname(data?.nickname);
      const avatar = validateAvatar(data?.avatar);

      if (!mode || !nickname || !avatar) {
        client.emit('room:error', { message: 'Invalid input' });
        return;
      }

      // Prevent a socket from being in multiple rooms.
      if (this.roomService.getRoomForPlayer(client.id)) {
        client.emit('room:error', { message: 'Already in a room' });
        return;
      }

      const room = this.roomService.createRoom(mode, client.id, nickname, avatar);

      // Join the Socket.IO room.
      await client.join(room.id);

      client.emit('room:created', {
        roomId: room.id,
        room: this.roomService.serializeRoom(room),
      });

      this.broadcastPublicRooms();
      this.broadcastOngoingGames();
    } catch (err: any) {
      client.emit('room:error', { message: err.message });
    }
  }

  @SubscribeMessage('room:join')
  async handleRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; nickname: string; avatar: string },
  ): Promise<void> {
    if (this.throttle(client, 'room:join')) return;

    try {
      // Validate inputs.
      const roomId = validateRoomCode(data?.roomId);
      const nickname = validateNickname(data?.nickname);
      const avatar = validateAvatar(data?.avatar);

      if (!roomId || !nickname || !avatar) {
        client.emit('room:error', { message: 'Invalid input' });
        return;
      }

      // Prevent a socket from being in multiple rooms.
      if (this.roomService.getRoomForPlayer(client.id)) {
        client.emit('room:error', { message: 'Already in a room' });
        return;
      }

      const room = this.roomService.joinRoom(roomId, client.id, nickname, avatar);

      await client.join(room.id);

      const player = room.players.get(client.id)!;

      // Notify the joiner.
      client.emit('room:joined', {
        room: this.roomService.serializeRoom(room),
        playerId: client.id,
      });

      // Notify everyone else.
      client.to(room.id).emit('room:playerJoined', { player });
      this.server.to(room.id).emit('room:updated', {
        room: this.roomService.serializeRoom(room),
      });

      this.broadcastPublicRooms();
      this.broadcastOngoingGames();
    } catch (err: any) {
      client.emit('room:error', { message: err.message });
    }
  }

  @SubscribeMessage('room:leave')
  async handleRoomLeave(
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (this.throttle(client, 'room:leave')) return;

    // Capture info before the player is removed.
    const roomBefore = this.roomService.getRoomForPlayer(client.id);
    const wasInGame = !!(roomBefore && roomBefore.phase !== 'lobby');
    const leavingPlayer = roomBefore?.players.get(client.id);
    const nickname = leavingPlayer?.nickname ?? 'Unknown';

    const result = this.roomService.leaveRoom(client.id);
    if (!result) return;

    const { room } = result;

    await client.leave(room.id);

    this.server.to(room.id).emit('room:playerLeft', {
      playerId: client.id,
      nickname,
      wasInGame,
    });

    // If a game was in progress, reset everyone back to the lobby.
    if (wasInGame && room.players.size > 0) {
      this.gameService.resetToLobby(room.id, this.server);
    } else {
      this.server.to(room.id).emit('room:updated', {
        room: this.roomService.serializeRoom(room),
      });
    }

    this.broadcastPublicRooms();
    this.broadcastOngoingGames();
  }

  @SubscribeMessage('room:settings')
  handleRoomSettings(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: Partial<RoomSettings>,
  ): void {
    if (this.throttle(client, 'room:settings')) return;

    try {
      const room = this.roomService.getRoomForPlayer(client.id);
      if (!room) {
        client.emit('room:error', { message: 'Not in a room' });
        return;
      }

      // Only the host can update settings.
      const player = room.players.get(client.id);
      if (!player?.isHost) {
        client.emit('room:error', { message: 'Only the host can change settings' });
        return;
      }

      if (room.phase !== 'lobby') {
        client.emit('room:error', { message: 'Cannot change settings during a game' });
        return;
      }

      // Validate and sanitize settings.
      const validSettings = validateSettings(data);
      if (!validSettings) {
        client.emit('room:error', { message: 'Invalid settings' });
        return;
      }

      this.roomService.updateSettings(room.id, validSettings);

      this.server.to(room.id).emit('room:updated', {
        room: this.roomService.serializeRoom(room),
      });

      this.broadcastPublicRooms();
      this.broadcastOngoingGames();
    } catch (err: any) {
      client.emit('room:error', { message: err.message });
    }
  }

  // ---------------------------------------------------------------------------
  // Game events
  // ---------------------------------------------------------------------------

  @SubscribeMessage('game:start')
  async handleGameStart(
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (this.throttle(client, 'game:start')) return;

    try {
      const room = this.roomService.getRoomForPlayer(client.id);
      if (!room) {
        client.emit('room:error', { message: 'Not in a room' });
        return;
      }

      const player = room.players.get(client.id);
      if (!player?.isHost) {
        client.emit('room:error', { message: 'Only the host can start the game' });
        return;
      }

      await this.gameService.startGame(room.id, this.server);

      this.broadcastPublicRooms();
      this.broadcastOngoingGames();
    } catch (err: any) {
      client.emit('room:error', { message: err.message });
    }
  }

  @SubscribeMessage('game:startCountdown')
  async handleStartCountdown(
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (this.throttle(client, 'game:startCountdown')) return;

    try {
      const room = this.roomService.getRoomForPlayer(client.id);
      if (!room) {
        client.emit('room:error', { message: 'Not in a room' });
        return;
      }

      const player = room.players.get(client.id);
      if (!player?.isHost) {
        client.emit('room:error', { message: 'Only the host can start the game' });
        return;
      }

      this.gameService.startCountdown(room.id, this.server);
    } catch (err: any) {
      client.emit('room:error', { message: err.message });
    }
  }

  @SubscribeMessage('game:cancelCountdown')
  handleCancelCountdown(
    @ConnectedSocket() client: Socket,
  ): void {
    if (this.throttle(client, 'game:cancelCountdown')) return;

    try {
      const room = this.roomService.getRoomForPlayer(client.id);
      if (!room) {
        client.emit('room:error', { message: 'Not in a room' });
        return;
      }

      const player = room.players.get(client.id);
      if (!player?.isHost) {
        client.emit('room:error', { message: 'Only the host can cancel the countdown' });
        return;
      }

      this.gameService.cancelCountdown(room.id, this.server);
    } catch (err: any) {
      client.emit('room:error', { message: err.message });
    }
  }

  @SubscribeMessage('game:selectWord')
  async handleSelectWord(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { wordIndex: number },
  ): Promise<void> {
    if (this.throttle(client, 'game:selectWord')) return;

    try {
      const wordIndex = validateWordIndex(data?.wordIndex);
      if (wordIndex === null) {
        client.emit('room:error', { message: 'Invalid word selection' });
        return;
      }

      const room = this.roomService.getRoomForPlayer(client.id);
      if (!room) return;

      await this.gameService.selectWord(room.id, client.id, wordIndex, this.server);
    } catch (err: any) {
      client.emit('room:error', { message: err.message });
    }
  }

  // ---------------------------------------------------------------------------
  // Drawing events
  // ---------------------------------------------------------------------------

  @SubscribeMessage('draw:action')
  handleDrawAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DrawAction,
  ): void {
    if (this.throttle(client, 'draw:action')) return;

    // Validate draw action payload.
    const action = validateDrawAction(data);
    if (!action) return; // Silently drop invalid draw actions.

    this.drawingService.handleDrawAction(client.id, action, this.server);
  }

  @SubscribeMessage('draw:clear')
  handleDrawClear(
    @ConnectedSocket() client: Socket,
  ): void {
    if (this.throttle(client, 'draw:clear')) return;

    const room = this.roomService.getRoomForPlayer(client.id);
    if (!room) return;

    this.drawingService.clearCanvas(room.id, client.id, this.server);
  }

  @SubscribeMessage('draw:undo')
  handleDrawUndo(
    @ConnectedSocket() client: Socket,
  ): void {
    if (this.throttle(client, 'draw:undo')) return;

    this.drawingService.handleUndo(client.id, this.server);
  }

  // ---------------------------------------------------------------------------
  // Chat events
  // ---------------------------------------------------------------------------

  @SubscribeMessage('chat:message')
  handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string },
  ): void {
    if (this.throttle(client, 'chat:message')) return;

    const room = this.roomService.getRoomForPlayer(client.id);
    if (!room) return;

    const player = room.players.get(client.id);
    if (!player) return;

    const text = validateChatMessage(data?.text);
    if (!text) return;

    // If game is in drawing phase, check for correct guesses (spectators can't guess).
    if (room.phase === 'drawing' && !player.isSpectator) {
      const { isCorrect, isClose } = this.gameService.handleGuess(
        client.id,
        text,
        this.server,
      );

      if (isCorrect) {
        // Don't broadcast the correct answer as a chat message.
        return;
      }

      if (isClose) {
        // Still broadcast the message but mark as close guess.
        const message: ChatMessage = {
          id: this.generateMessageId(),
          playerId: client.id,
          nickname: player.nickname,
          text,
          timestamp: Date.now(),
          isCorrectGuess: false,
          isSystemMessage: false,
          isCloseGuess: true,
        };

        this.storeChatMessage(room, message);
        this.emitChatToTeam(room, player.team, message);
        return;
      }
    }

    // Spectator messages only go to other spectators.
    if (player.isSpectator) {
      const message: ChatMessage = {
        id: this.generateMessageId(),
        playerId: client.id,
        nickname: player.nickname,
        text,
        timestamp: Date.now(),
        isCorrectGuess: false,
        isSystemMessage: false,
        isCloseGuess: false,
        isSpectatorMessage: true,
      };
      this.storeChatMessage(room, message);
      for (const [id, p] of room.players) {
        if (p.isSpectator) {
          this.server.to(id).emit('chat:message', message);
        }
      }
      return;
    }

    // Regular chat message.
    const message: ChatMessage = {
      id: this.generateMessageId(),
      playerId: client.id,
      nickname: player.nickname,
      text,
      timestamp: Date.now(),
      isCorrectGuess: false,
      isSystemMessage: false,
      isCloseGuess: false,
    };

    this.storeChatMessage(room, message);
    this.emitChatToTeam(room, player.team, message);
  }

  // ---------------------------------------------------------------------------
  // Reconnection
  // ---------------------------------------------------------------------------

  @SubscribeMessage('game:reconnect')
  async handleReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string },
  ): Promise<void> {
    if (this.throttle(client, 'game:reconnect')) return;

    try {
      const roomId = validateRoomCode(data?.roomId);
      if (!roomId || !data?.playerId) {
        client.emit('room:error', { message: 'Invalid reconnect data' });
        return;
      }

      const room = this.roomService.getRoom(roomId);
      if (!room) {
        client.emit('room:error', { message: 'Room no longer exists' });
        return;
      }

      const player = room.players.get(data.playerId);
      if (!player) {
        client.emit('room:error', { message: 'Cannot reconnect' });
        return;
      }

      // If the old socket is still marked as connected (race condition during
      // transport upgrade), force-mark as disconnected so reconnection can proceed.
      if (player.isConnected) {
        player.isConnected = false;
        this.logger.warn(`Force-disconnecting stale socket ${data.playerId} for reconnection`);
      }

      // Prevent socket from being in multiple rooms.
      if (this.roomService.getRoomForPlayer(client.id)) {
        client.emit('room:error', { message: 'Already in a room' });
        return;
      }

      // Transfer player from old socket ID to new socket ID.
      this.roomService.reconnectPlayer(roomId, data.playerId, client.id);

      // Cancel any drawer disconnect grace timer.
      const timerKey = `${roomId}:${data.playerId}`;
      const timer = this.drawerDisconnectTimers.get(timerKey);
      if (timer) {
        clearTimeout(timer);
        this.drawerDisconnectTimers.delete(timerKey);
      }

      // Join the Socket.IO room.
      await client.join(roomId);

      // Calculate remaining time.
      let timeLeft = 0;
      if (room.roundStartTime && room.phase === 'drawing') {
        const elapsed = Math.floor((Date.now() - room.roundStartTime) / 1000);
        timeLeft = Math.max(0, room.settings.roundTime - elapsed);
      }

      // Determine if this player is the drawer and should get the word.
      const isDrawer =
        room.drawerId === client.id ||
        room.teamADrawerId === client.id ||
        room.teamBDrawerId === client.id;



      // Determine word options to restore for the drawer during word selection.
      const wordOptions =
        isDrawer && room.phase === 'selecting_word' && room.pendingWords?.length
          ? room.pendingWords
          : undefined;

      // Send full state to the reconnecting client.
      client.emit('game:reconnected', {
        room: this.roomService.serializeRoom(room),
        drawingHistory: room.drawingHistory,
        messages: room.chatHistory.slice(-MAX_CHAT_HISTORY),
        timeLeft,
        currentWord: isDrawer ? (room.currentWord ?? undefined) : undefined,
        wordOptions,
      });

      // Also send as a separate event for backward compatibility.
      if (wordOptions) {
        client.emit('game:wordOptions', { words: wordOptions });
      }

      // Notify others.
      client.to(roomId).emit('room:updated', {
        room: this.roomService.serializeRoom(room),
      });

      this.logger.log(`Player reconnected to room ${roomId}: ${data.playerId} → ${client.id}`);
    } catch (err: any) {
      client.emit('room:error', { message: err.message });
    }
  }

  // ---------------------------------------------------------------------------
  // Spectator
  // ---------------------------------------------------------------------------

  @SubscribeMessage('room:spectate')
  async handleSpectate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; nickname: string; avatar: string },
  ): Promise<void> {
    if (this.throttle(client, 'room:spectate')) return;

    try {
      const roomId = validateRoomCode(data?.roomId);
      const nickname = validateNickname(data?.nickname);
      const avatar = validateAvatar(data?.avatar);

      if (!roomId || !nickname || !avatar) {
        client.emit('room:error', { message: 'Invalid input' });
        return;
      }

      if (this.roomService.getRoomForPlayer(client.id)) {
        client.emit('room:error', { message: 'Already in a room' });
        return;
      }

      const room = this.roomService.spectateRoom(roomId, client.id, nickname, avatar);

      await client.join(room.id);

      // Calculate remaining time.
      let timeLeft = 0;
      if (room.roundStartTime && room.phase === 'drawing') {
        const elapsed = Math.floor((Date.now() - room.roundStartTime) / 1000);
        timeLeft = Math.max(0, room.settings.roundTime - elapsed);
      }

      client.emit('room:spectateJoined', {
        room: this.roomService.serializeRoom(room),
        playerId: client.id,
        drawingHistory: room.drawingHistory,
        messages: room.chatHistory.slice(-MAX_CHAT_HISTORY),
        timeLeft,
      });

      // Notify everyone else.
      const player = room.players.get(client.id)!;
      client.to(room.id).emit('room:playerJoined', { player });
      this.server.to(room.id).emit('room:updated', {
        room: this.roomService.serializeRoom(room),
      });
    } catch (err: any) {
      client.emit('room:error', { message: err.message });
    }
  }

  // ---------------------------------------------------------------------------
  // Public rooms list
  // ---------------------------------------------------------------------------

  @SubscribeMessage('rooms:list')
  handleRoomsList(
    @ConnectedSocket() client: Socket,
  ): void {
    client.emit('rooms:list', { rooms: this.roomService.getPublicRooms() });
  }

  @SubscribeMessage('rooms:ongoingList')
  handleOngoingList(
    @ConnectedSocket() client: Socket,
  ): void {
    client.emit('rooms:ongoingList', { rooms: this.roomService.getOngoingGames() });
  }

  // ---------------------------------------------------------------------------
  // Team events
  // ---------------------------------------------------------------------------

  @SubscribeMessage('team:switch')
  handleTeamSwitch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { team: Team },
  ): void {
    if (this.throttle(client, 'team:switch')) return;

    const team = validateTeam(data?.team);
    if (!team) {
      client.emit('room:error', { message: 'Invalid team' });
      return;
    }

    const room = this.roomService.getRoomForPlayer(client.id);
    if (!room) return;

    if (room.mode !== 'team') {
      client.emit('room:error', { message: 'Team switching is only available in team mode' });
      return;
    }

    if (room.phase !== 'lobby') {
      client.emit('room:error', { message: 'Cannot switch teams during a game' });
      return;
    }

    const player = room.players.get(client.id);
    if (!player) return;

    player.team = team;

    this.server.to(room.id).emit('room:updated', {
      room: this.roomService.serializeRoom(room),
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Broadcast the current public rooms list to all connected sockets. */
  private broadcastPublicRooms(): void {
    this.server.emit('rooms:updated', { rooms: this.roomService.getPublicRooms() });
  }

  /** Broadcast the current ongoing games list to all connected sockets. */
  private broadcastOngoingGames(): void {
    this.server.emit('rooms:ongoingUpdated', { rooms: this.roomService.getOngoingGames() });
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private storeChatMessage(room: import('@doodledraw/shared').Room, message: ChatMessage): void {
    room.chatHistory.push(message);
    if (room.chatHistory.length > MAX_CHAT_HISTORY) {
      room.chatHistory = room.chatHistory.slice(-MAX_CHAT_HISTORY);
    }
  }

  /**
   * Emit a chat message scoped to the sender's team in team mode,
   * or to the entire room in classic mode / lobby.
   */
  private emitChatToTeam(
    room: import('@doodledraw/shared').Room,
    senderTeam: string | undefined,
    message: ChatMessage,
  ): void {
    if (room.mode !== 'team' || !senderTeam) {
      this.server.to(room.id).emit('chat:message', message);
      return;
    }
    for (const [id, p] of room.players) {
      if (p.team === senderTeam || p.isSpectator) {
        this.server.to(id).emit('chat:message', message);
      }
    }
  }
}
