import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { DrawAction, Room } from '@doodledraw/shared';
import { botStates, DIFFICULTY_CONFIG, isBotId } from './bot-player';
import { getQuickDrawCategory, getFallbackStrokes } from './word-mapping';
import { RoomService } from '../room.service';

/** Quick Draw drawings use a 256×256 coordinate space. */
const QD_SIZE = 256;

/** Canvas logical size we normalize to (0–1 range applied at emit time). */
const CANVAS_SIZE = 800;

interface QuickDrawData {
  drawing: number[][][]; // [[x[], y[]], ...]
}

@Injectable()
export class BotDrawingService {
  private readonly logger = new Logger(BotDrawingService.name);

  /** Track active drawing tasks so we can cancel them. */
  private readonly activeDrawings = new Map<string, AbortController>();

  constructor(private readonly roomService: RoomService) {}

  /** How long to wait before redrawing if nobody guessed (ms). */
  private static readonly REDRAW_DELAY_MS = 30_000;

  /**
   * Start a bot drawing session. Runs asynchronously — returns immediately.
   * If nobody guesses within 30 seconds, the bot clears the canvas and draws
   * a different version of the same word.
   */
  async startDrawing(
    botId: string,
    room: Room,
    word: string,
    server: Server,
    quickDrawCategory?: string,
  ): Promise<void> {
    // Cancel any existing drawing task for this bot.
    this.cancelDrawing(botId);

    const controller = new AbortController();
    this.activeDrawings.set(botId, controller);

    // Reset the drawingAborted flag (cancelDrawing sets it to true).
    const botState = botStates.get(botId);
    if (botState) {
      botState.drawingAborted = false;
    }

    const botPlayer = room.players.get(botId);
    const difficulty = botPlayer?.botDifficulty || 'medium';
    const config = DIFFICULTY_CONFIG[difficulty];
    const roundStartTime = Date.now();

    try {
      this.logger.debug(`Bot ${botId} starting to draw word="${word}" quickDraw="${quickDrawCategory || 'none'}" in room ${room.id}`);

      // Thinking delay (2–3 seconds).
      await this.sleep(2000 + Math.random() * 1000, controller.signal);

      // Fetch strokes — use quickDrawCategory from DB if available, fall back to word mapping.
      const strokes = await this.fetchStrokes(word, quickDrawCategory);
      this.logger.debug(`Bot ${botId} fetched ${strokes.length} strokes for word="${word}"`);

      // Replay strokes.
      await this.replayStrokes(botId, room.id, strokes, config.strokeSpeedMultiplier, server, controller.signal);
      this.logger.debug(`Bot ${botId} finished drawing word="${word}"`);

      // Wait for the redraw window — if nobody has guessed after 30s from round start, redraw.
      const elapsed = Date.now() - roundStartTime;
      const timeUntilRedraw = BotDrawingService.REDRAW_DELAY_MS - elapsed;

      if (timeUntilRedraw > 0) {
        await this.sleep(timeUntilRedraw, controller.signal);
      }

      // Check if still in drawing phase (nobody guessed yet).
      const currentRoom = this.roomService.getRoom(room.id);
      if (!currentRoom || currentRoom.phase !== 'drawing') {
        this.logger.debug(`Bot ${botId} skipping redraw — round already ended`);
        return;
      }

      this.logger.log(`Bot ${botId} redrawing word="${word}" — nobody guessed in ${BotDrawingService.REDRAW_DELAY_MS / 1000}s`);

      // Clear the canvas.
      const clearAction: DrawAction = {
        type: 'clear',
        points: [],
        color: '#000000',
        brushSize: 5,
        tool: 'pen',
        strokeId: `bot-clear-${Date.now()}`,
        timestamp: Date.now(),
        playerId: botId,
      };
      currentRoom.drawingHistory = [];
      server.to(room.id).emit('draw:action', clearAction);

      // Short pause after clear.
      await this.sleep(1000 + Math.random() * 500, controller.signal);

      // Fetch a DIFFERENT drawing of the same word.
      const newStrokes = await this.fetchStrokes(word, quickDrawCategory);
      this.logger.debug(`Bot ${botId} fetched ${newStrokes.length} new strokes for redraw`);

      await this.replayStrokes(botId, room.id, newStrokes, config.strokeSpeedMultiplier, server, controller.signal);
      this.logger.debug(`Bot ${botId} finished redrawing word="${word}"`);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.logger.debug(`Bot ${botId} drawing aborted`);
      } else {
        this.logger.error(`Bot drawing error: ${err.message}`);
      }
    } finally {
      this.activeDrawings.delete(botId);
    }
  }

  /**
   * Cancel an active bot drawing.
   */
  cancelDrawing(botId: string): void {
    const controller = this.activeDrawings.get(botId);
    if (controller) {
      controller.abort();
      this.activeDrawings.delete(botId);
    }
    const state = botStates.get(botId);
    if (state) {
      state.drawingAborted = true;
    }
  }

  /**
   * Cancel all active bot drawings.
   */
  cancelAll(): void {
    for (const [botId, controller] of this.activeDrawings) {
      controller.abort();
    }
    this.activeDrawings.clear();
  }

  /**
   * Fetch strokes from Quick Draw dataset for the given word.
   */
  private async fetchStrokes(word: string, quickDrawCategory?: string): Promise<number[][][]> {
    const category = quickDrawCategory || getQuickDrawCategory(word);

    if (!category) {
      this.logger.debug(`No Quick Draw mapping for word: "${word}", using fallback`);
      return getFallbackStrokes();
    }

    try {
      const url = `https://storage.googleapis.com/quickdraw_dataset/full/simplified/${encodeURIComponent(category)}.ndjson`;

      // Fetch a small chunk of the file (first ~100KB) to get a few drawings.
      const response = await fetch(url, {
        headers: { Range: 'bytes=0-102400' },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        this.logger.warn(`Quick Draw fetch failed for "${category}": ${response.status}`);
        return getFallbackStrokes();
      }

      const text = await response.text();
      const lines = text.split('\n').filter((l) => l.trim().length > 0);

      if (lines.length === 0) {
        return getFallbackStrokes();
      }

      // Pick a random complete line (last line might be truncated from Range header).
      const validLines = lines.slice(0, -1);
      const line = validLines.length > 0
        ? validLines[Math.floor(Math.random() * validLines.length)]
        : lines[0];

      const data: QuickDrawData = JSON.parse(line);
      return data.drawing;
    } catch (err: any) {
      this.logger.warn(`Quick Draw fetch error for "${word}": ${err.message}`);
      return getFallbackStrokes();
    }
  }

  /**
   * Replay strokes as draw:action events, simulating human-like drawing.
   */
  private async replayStrokes(
    botId: string,
    roomId: string,
    strokes: number[][][],
    speedMultiplier: number,
    server: Server,
    signal: AbortSignal,
  ): Promise<void> {
    const room = this.roomService.getRoom(roomId);
    if (!room) {
      this.logger.warn(`Bot ${botId} replayStrokes: room ${roomId} not found!`);
      return;
    }
    this.logger.debug(`Bot ${botId} replaying ${strokes.length} strokes in room ${roomId}, phase=${room.phase}`);

    const colors = ['#000000', '#1a1a2e', '#16213e', '#0f3460'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const brushSize = 5;

    for (let si = 0; si < strokes.length; si++) {
      const stroke = strokes[si];
      if (signal.aborted) {
        this.logger.debug(`Bot ${botId} abort: signal.aborted=true at stroke ${si}/${strokes.length}`);
        throw new DOMException('Aborted', 'AbortError');
      }

      const botState = botStates.get(botId);
      if (botState?.drawingAborted) {
        this.logger.debug(`Bot ${botId} abort: drawingAborted=true at stroke ${si}/${strokes.length}, room=${roomId}`);
        throw new DOMException('Aborted', 'AbortError');
      }

      const xs = stroke[0];
      const ys = stroke[1];

      if (!xs || !ys || xs.length === 0) continue;

      // Build points, scaling from Quick Draw 256×256 to canvas coordinates.
      // Add slight jitter for natural feel.
      const points = xs.map((x, i) => ({
        x: Math.round((x / QD_SIZE) * CANVAS_SIZE + (Math.random() * 4 - 2)),
        y: Math.round((ys[i] / QD_SIZE) * CANVAS_SIZE + (Math.random() * 4 - 2)),
      }));

      const strokeId = `bot-stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // Emit the stroke as a single draw:action.
      const action: DrawAction = {
        type: 'stroke',
        points,
        color,
        brushSize,
        tool: 'pen',
        strokeId,
        timestamp: Date.now(),
        playerId: botId,
      };

      // Store in drawing history.
      room.drawingHistory.push(action);

      // Broadcast to all players in the room.
      server.to(roomId).emit('draw:action', action);

      // Pause between strokes (300–800ms, adjusted by difficulty).
      const delay = (300 + Math.random() * 500) * speedMultiplier;
      await this.sleep(delay, signal);
    }
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timeout);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      const timeout = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}
