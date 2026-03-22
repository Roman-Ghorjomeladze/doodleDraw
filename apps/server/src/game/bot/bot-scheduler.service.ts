import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Server } from 'socket.io';
import { Room } from '@doodledraw/shared';
import { RoomService } from '../room.service';
import { GameService } from '../game.service';
import { BotDrawingService } from './bot-drawing.service';
import { BotVisionService } from './bot-vision.service';
import { botStates, DIFFICULTY_CONFIG, isBotId } from './bot-player';

const BOT_GUESS_INTERVAL_MS = 5_000;
const BOT_INITIAL_GUESS_DELAY_MS = 6_000;

@Injectable()
export class BotSchedulerService {
  private readonly logger = new Logger(BotSchedulerService.name);

  private server: Server | null = null;

  constructor(
    private readonly roomService: RoomService,
    @Inject(forwardRef(() => GameService))
    private readonly gameService: GameService,
    private readonly botDrawing: BotDrawingService,
    private readonly botVision: BotVisionService,
  ) {}

  /**
   * Must be called once the WebSocket server is ready (from the gateway).
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Called when a bot becomes the drawer in a game.
   */
  onBotDrawerTurn(botId: string, room: Room, word: string): void {
    if (!this.server) return;

    // Auto-select the first word for the bot (index 0).
    // This is called from the game service when a bot is presented with word options.
    this.botDrawing.startDrawing(botId, room, word, this.server, room.currentWordQuickDraw ?? undefined);
  }

  /**
   * Periodic check: look for bot guessers that should attempt a guess.
   */
  @Interval(BOT_GUESS_INTERVAL_MS)
  async botGuessLoop(): Promise<void> {
    if (!this.server) return;

    const rooms = this.roomService.rooms;

    for (const [, room] of rooms) {
      if (room.phase !== 'drawing') continue;
      if (!room.currentCanvasSnapshot) {
        this.logger.debug(`Room ${room.id}: no canvas snapshot yet`);
        continue;
      }

      // Find bot guessers in this room.
      for (const [playerId, player] of room.players) {
        if (!player.isBot) continue;
        if (player.isSpectator) continue;

        // Skip if this bot is the drawer.
        if (room.mode === 'classic' && room.drawerId === playerId) continue;
        if (room.mode === 'team') {
          if (room.teamADrawerId === playerId || room.teamBDrawerId === playerId) continue;
        }

        // Check bot state.
        const state = botStates.get(playerId);
        if (!state || state.stopGuessing) continue;

        // Already guessed correctly.
        if (room.correctGuessers.includes(playerId)) continue;

        // Enforce initial delay.
        if (state.firstGuessAt === 0) {
          state.firstGuessAt = Date.now();
          continue; // Skip this tick, start guessing next tick.
        }

        const elapsed = Date.now() - state.firstGuessAt;
        const difficulty = player.botDifficulty || 'medium';
        const config = DIFFICULTY_CONFIG[difficulty];

        if (elapsed < config.guessDelayMs) continue;

        // Attempt a guess.
        try {
          const guess = await this.botVision.guessFromSnapshot(
            room.currentCanvasSnapshot,
            room.wordHint,
            room.settings.language,
            state.previousGuesses,
          );

          if (guess && this.server) {
            // Re-check room state (might have changed during async call).
            const currentRoom = this.roomService.getRoom(room.id);
            if (!currentRoom || currentRoom.phase !== 'drawing') continue;
            if (currentRoom.correctGuessers.includes(playerId)) continue;

            const currentState = botStates.get(playerId);
            if (currentState?.stopGuessing) continue;

            // Submit the guess through the game service.
            const { isCorrect } = this.gameService.handleGuess(
              playerId,
              guess,
              this.server,
            );

            if (isCorrect) {
              this.logger.log(`Bot ${player.nickname} guessed correctly: "${guess}" in room ${room.id}`);
            } else {
              // Track the wrong guess so we don't repeat it.
              const botState = botStates.get(playerId);
              if (botState) {
                botState.previousGuesses.push(guess);
              }
              // Broadcast the incorrect guess as a chat message.
              this.broadcastBotGuess(room, player.nickname, playerId, guess);
            }
          }
        } catch (err: any) {
          this.logger.debug(`Bot guess error: ${err.message}`);
        }
      }
    }
  }

  /**
   * Broadcast a bot's incorrect guess as a regular chat message.
   */
  private broadcastBotGuess(
    room: Room,
    nickname: string,
    botId: string,
    text: string,
  ): void {
    if (!this.server) return;

    const message = {
      id: `bot-msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      playerId: botId,
      nickname,
      text,
      timestamp: Date.now(),
      isCorrectGuess: false,
      isSystemMessage: false,
      isCloseGuess: false,
    };

    // Store in chat history.
    room.chatHistory.push(message);
    if (room.chatHistory.length > 50) {
      room.chatHistory.shift();
    }

    // Broadcast to all players.
    this.server.to(room.id).emit('chat:message', message);
  }
}
