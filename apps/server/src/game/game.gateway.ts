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
  REACTION_EMOJIS,
} from '@doodledraw/shared';
import { RoomService } from './room.service';
import { GameService } from './game.service';
import { DrawingService } from './drawing.service';
import { ProfileService } from './profile.service';
import { AuthService } from '../auth/auth.service';
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
  validatePersistentId,
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

  /** Map socket ID → authenticated persistentId for logged-in users. */
  private readonly authenticatedSockets = new Map<string, string>();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly roomService: RoomService,
    private readonly gameService: GameService,
    private readonly drawingService: DrawingService,
    private readonly profileService: ProfileService,
    private readonly authService: AuthService,
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

  async handleConnection(client: Socket): Promise<void> {
    this.logger.log(`Client connected: ${client.id}`);

    // Check for auth token in handshake.
    const token = (client.handshake.auth as any)?.token;
    if (token) {
      const persistentId = await this.authService.validateToken(token);
      if (persistentId) {
        this.authenticatedSockets.set(client.id, persistentId);
        this.logger.log(`Authenticated socket ${client.id} as ${persistentId}`);
      }
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Clean up auth and rate limiter state for this socket.
    this.authenticatedSockets.delete(client.id);
    this.rateLimiter.removeSocket(client.id);

    const room = this.roomService.handleDisconnect(client.id);
    if (room) {
      // If the game already ended, update rematch state for the disconnected player.
      if (room.phase === 'game_end') {
        // Note: handleDisconnect already marked isConnected = false.
        // We don't mark as declined on disconnect — they might reconnect.
        // Only explicit leave marks as declined.
        this.server.to(room.id).emit('room:updated', {
          room: this.roomService.serializeRoom(room),
        });
        return;
      }

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
    @MessageBody() data: { mode: GameMode; nickname: string; avatar: string; persistentId: string },
  ): Promise<void> {
    if (this.throttle(client, 'room:create')) return;

    try {
      // Validate inputs.
      const mode = validateGameMode(data?.mode);
      const nickname = validateNickname(data?.nickname);
      const avatar = validateAvatar(data?.avatar);
      const persistentId = validatePersistentId(data?.persistentId);

      if (!mode || !nickname || !avatar || !persistentId) {
        client.emit('room:error', { message: 'Invalid input' });
        return;
      }

      // Prevent a socket from being in multiple rooms.
      if (this.roomService.getRoomForPlayer(client.id)) {
        client.emit('room:error', { message: 'Already in a room' });
        return;
      }

      const room = this.roomService.createRoom(mode, client.id, nickname, avatar, persistentId);

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
    @MessageBody() data: { roomId: string; nickname: string; avatar: string; persistentId: string },
  ): Promise<void> {
    if (this.throttle(client, 'room:join')) return;

    try {
      // Validate inputs.
      const roomId = validateRoomCode(data?.roomId);
      const nickname = validateNickname(data?.nickname);
      const avatar = validateAvatar(data?.avatar);
      const persistentId = validatePersistentId(data?.persistentId);

      if (!roomId || !nickname || !avatar || !persistentId) {
        client.emit('room:error', { message: 'Invalid input' });
        return;
      }

      // Prevent a socket from being in multiple rooms.
      if (this.roomService.getRoomForPlayer(client.id)) {
        client.emit('room:error', { message: 'Already in a room' });
        return;
      }

      const room = this.roomService.joinRoom(roomId, client.id, nickname, avatar, persistentId);

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
    const gameFinished = roomBefore?.phase === 'game_end';
    const leavingPlayer = roomBefore?.players.get(client.id);
    const nickname = leavingPlayer?.nickname ?? 'Unknown';

    const result = this.roomService.leaveRoom(client.id);
    if (!result) return;

    const { room } = result;

    await client.leave(room.id);

    // If the game already ended, mark as declined in rematch and update.
    if (gameFinished) {
      this.gameService.markRematchDeclined(client.id, room, this.server);
      this.server.to(room.id).emit('room:updated', {
        room: this.roomService.serializeRoom(room),
      });
    } else {
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
  // Rematch
  // ---------------------------------------------------------------------------

  @SubscribeMessage('game:rematchVote')
  handleRematchVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { vote: 'accepted' | 'declined' },
  ): void {
    if (this.throttle(client, 'game:rematchVote')) return;

    if (data?.vote !== 'accepted' && data?.vote !== 'declined') {
      client.emit('room:error', { message: 'Invalid vote' });
      return;
    }

    this.gameService.handleRematchVote(client.id, data.vote, this.server);
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
    @MessageBody() data: { roomId?: string; persistentId: string },
  ): Promise<void> {
    if (this.throttle(client, 'game:reconnect')) return;

    try {
      const persistentId = validatePersistentId(data?.persistentId);
      if (!persistentId) {
        client.emit('room:error', { message: 'Invalid reconnect data' });
        return;
      }

      // Look up room by persistentId.
      const found = this.roomService.findByPersistentId(persistentId);
      if (!found) {
        // No active room for this player — silently ignore.
        return;
      }

      const { room, player: existingPlayer, roomId } = found;
      const oldPlayerId = existingPlayer.id;

      // If the old socket is still marked as connected (race condition during
      // transport upgrade), force-mark as disconnected so reconnection can proceed.
      if (existingPlayer.isConnected && oldPlayerId !== client.id) {
        existingPlayer.isConnected = false;
        this.logger.warn(`Force-disconnecting stale socket ${oldPlayerId} for reconnection`);
      }

      // If we're already in this room with the same socket, skip.
      if (oldPlayerId === client.id && existingPlayer.isConnected) {
        return;
      }

      // Prevent socket from being in multiple rooms.
      if (this.roomService.getRoomForPlayer(client.id)) {
        client.emit('room:error', { message: 'Already in a room' });
        return;
      }

      // Transfer player from old socket ID to new socket ID.
      this.roomService.reconnectPlayer(roomId, oldPlayerId, client.id);

      // Cancel any drawer disconnect grace timer.
      const timerKey = `${roomId}:${oldPlayerId}`;
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

      // Filter chat history: spectators only see spectator + system messages.
      const isSpectator = existingPlayer.isSpectator;
      const filteredMessages = room.chatHistory
        .filter((msg) => {
          if (isSpectator) return msg.isSpectatorMessage || msg.isSystemMessage;
          return !msg.isSpectatorMessage;
        })
        .slice(-MAX_CHAT_HISTORY);

      // Send full state to the reconnecting client.
      client.emit('game:reconnected', {
        room: this.roomService.serializeRoom(room),
        drawingHistory: room.drawingHistory,
        messages: filteredMessages,
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

      this.logger.log(`Player reconnected to room ${roomId}: ${oldPlayerId} → ${client.id}`);
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
    @MessageBody() data: { roomId: string; nickname: string; avatar: string; persistentId: string },
  ): Promise<void> {
    if (this.throttle(client, 'room:spectate')) return;

    try {
      const roomId = validateRoomCode(data?.roomId);
      const nickname = validateNickname(data?.nickname);
      const avatar = validateAvatar(data?.avatar);
      const persistentId = validatePersistentId(data?.persistentId);

      if (!roomId || !nickname || !avatar || !persistentId) {
        client.emit('room:error', { message: 'Invalid input' });
        return;
      }

      if (this.roomService.getRoomForPlayer(client.id)) {
        client.emit('room:error', { message: 'Already in a room' });
        return;
      }

      const room = this.roomService.spectateRoom(roomId, client.id, nickname, avatar, persistentId);

      await client.join(room.id);

      // Calculate remaining time.
      let timeLeft = 0;
      if (room.roundStartTime && room.phase === 'drawing') {
        const elapsed = Math.floor((Date.now() - room.roundStartTime) / 1000);
        timeLeft = Math.max(0, room.settings.roundTime - elapsed);
      }

      // Spectators only see spectator + system messages in chat history.
      const filteredMessages = room.chatHistory
        .filter((msg) => msg.isSpectatorMessage || msg.isSystemMessage)
        .slice(-MAX_CHAT_HISTORY);

      client.emit('room:spectateJoined', {
        room: this.roomService.serializeRoom(room),
        playerId: client.id,
        drawingHistory: room.drawingHistory,
        messages: filteredMessages,
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
  // Kick
  // ---------------------------------------------------------------------------

  @SubscribeMessage('room:kick')
  async handleKick(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playerId: string },
  ): Promise<void> {
    if (this.throttle(client, 'room:kick')) return;

    try {
      const room = this.roomService.getRoomForPlayer(client.id);
      if (!room) {
        client.emit('room:error', { message: 'Not in a room' });
        return;
      }

      const player = room.players.get(client.id);
      if (!player?.isHost) {
        client.emit('room:error', { message: 'Only the host can kick players' });
        return;
      }

      if (room.phase !== 'lobby') {
        client.emit('room:error', { message: 'Can only kick players in lobby' });
        return;
      }

      const targetId = data?.playerId;
      if (!targetId || targetId === client.id) {
        client.emit('room:error', { message: 'Invalid target' });
        return;
      }

      const target = room.players.get(targetId);
      if (!target) {
        client.emit('room:error', { message: 'Player not found' });
        return;
      }

      // Remove the player.
      this.roomService.kickPlayer(room.id, targetId);

      // Notify the kicked player.
      this.server.to(targetId).emit('room:kicked', { reason: 'Kicked by host' });

      // Make the target leave the Socket.IO room.
      this.server.in(targetId).socketsLeave(room.id);

      // Notify remaining players.
      this.server.to(room.id).emit('room:playerLeft', {
        playerId: targetId,
        nickname: target.nickname,
        wasInGame: false,
      });
      this.server.to(room.id).emit('room:updated', {
        room: this.roomService.serializeRoom(room),
      });

      this.broadcastPublicRooms();
    } catch (err: any) {
      client.emit('room:error', { message: err.message });
    }
  }

  // ---------------------------------------------------------------------------
  // Profile & Leaderboard
  // ---------------------------------------------------------------------------

  @SubscribeMessage('profile:get')
  async handleProfileGet(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { persistentId: string },
  ): Promise<void> {
    if (this.throttle(client, 'profile:get')) return;

    const persistentId = validatePersistentId(data?.persistentId);
    if (!persistentId) {
      client.emit('profile:data', { profile: null });
      return;
    }

    const profile = await this.profileService.getProfile(persistentId);
    client.emit('profile:data', { profile });
  }

  @SubscribeMessage('leaderboard:get')
  async handleLeaderboardGet(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { type: 'allTime' | 'weekly' | 'country' | 'age'; country?: string; ageGroup?: string },
  ): Promise<void> {
    if (this.throttle(client, 'leaderboard:get')) return;

    const validTypes = ['allTime', 'weekly', 'country', 'age'] as const;
    const type = validTypes.includes(data?.type as any) ? data.type : 'allTime';
    const players = await this.profileService.getLeaderboard(type, {
      country: data?.country,
      ageGroup: data?.ageGroup,
    });
    client.emit('leaderboard:data', { players, type });
  }

  // ---------------------------------------------------------------------------
  // Reactions
  // ---------------------------------------------------------------------------

  @SubscribeMessage('reaction:send')
  handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { emoji: string },
  ): void {
    if (this.throttle(client, 'reaction:send')) return;

    const room = this.roomService.getRoomForPlayer(client.id);
    if (!room) return;

    const player = room.players.get(client.id);
    if (!player) return;

    // Validate emoji is in allowed list.
    if (!data?.emoji || !(REACTION_EMOJIS as readonly string[]).includes(data.emoji)) {
      return;
    }

    // Broadcast to entire room (including sender for instant feedback).
    this.server.to(room.id).emit('reaction:received', {
      emoji: data.emoji,
      nickname: player.nickname,
      playerId: client.id,
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
   * or to all players in classic mode / lobby.
   * Player messages are also forwarded to spectators so they can
   * follow the guesses, but spectator messages stay spectator-only.
   */
  private emitChatToTeam(
    room: import('@doodledraw/shared').Room,
    senderTeam: string | undefined,
    message: ChatMessage,
  ): void {
    if (room.mode !== 'team' || !senderTeam) {
      // Classic mode / lobby: send to all players + spectators.
      for (const [id] of room.players) {
        this.server.to(id).emit('chat:message', message);
      }
      return;
    }
    // Team mode: send to sender's team members + spectators.
    for (const [id, p] of room.players) {
      if ((p.team === senderTeam && !p.isSpectator) || p.isSpectator) {
        this.server.to(id).emit('chat:message', message);
      }
    }
  }
}
