import { Player, BotDifficulty } from '@doodledraw/shared';
import { randomUUID } from 'crypto';

const BOT_NAMES = [
  'DoodleBot',
  'SketchMaster',
  'PicassoBot',
  'DrawBot3000',
  'ArtWizard',
  'InkMaster',
  'ScribbleKing',
  'BrushBot',
  'DaVinciBot',
  'PenPal',
];

const BOT_AVATARS = [
  'bot-1',
  'bot-2',
  'bot-3',
  'bot-4',
  'bot-5',
];

/** Track which bot names have been used within a room to avoid duplicates. */
const usedNamesPerRoom = new Map<string, Set<string>>();

export const DIFFICULTY_CONFIG = {
  easy: { guessDelayMs: 20_000, strokeSpeedMultiplier: 2.0 },
  medium: { guessDelayMs: 10_000, strokeSpeedMultiplier: 1.0 },
  hard: { guessDelayMs: 5_000, strokeSpeedMultiplier: 0.5 },
} as const;

export interface BotState {
  /** When true, the bot should stop its guessing loop. */
  stopGuessing: boolean;
  /** When true, the bot should abort its current drawing. */
  drawingAborted: boolean;
  /** Timestamp of when the bot started its first guess attempt. */
  firstGuessAt: number;
  /** Previous incorrect guesses this round — avoids repeating the same wrong answer. */
  previousGuesses: string[];
}

/** In-memory map of bot player ID → mutable bot state. */
export const botStates = new Map<string, BotState>();

export function createBotPlayer(options: {
  roomId?: string;
  score?: number;
  difficulty?: BotDifficulty;
  team?: 'A' | 'B';
}): Player {
  const id = `bot-${randomUUID()}`;
  const difficulty = options.difficulty || 'medium';

  // Pick a name not yet used in the room.
  let name: string;
  const usedNames = options.roomId
    ? (usedNamesPerRoom.get(options.roomId) ?? new Set())
    : new Set<string>();

  const available = BOT_NAMES.filter((n) => !usedNames.has(n));
  name = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : `Bot-${id.slice(4, 8)}`;

  if (options.roomId) {
    usedNames.add(name);
    usedNamesPerRoom.set(options.roomId, usedNames);
  }

  const avatar = BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)];

  // Initialize bot state.
  botStates.set(id, {
    stopGuessing: false,
    drawingAborted: false,
    firstGuessAt: 0,
    previousGuesses: [],
  });

  return {
    id,
    persistentId: id,
    nickname: name,
    avatar,
    score: options.score ?? 0,
    team: options.team,
    isDrawing: false,
    hasDrawn: false,
    isHost: false,
    isConnected: true,
    isBot: true,
    botDifficulty: difficulty,
  };
}

export function removeBotState(botId: string): void {
  botStates.delete(botId);
}

export function clearRoomBotNames(roomId: string): void {
  usedNamesPerRoom.delete(roomId);
}

export function isBot(player: Player): boolean {
  return player.isBot === true;
}

export function isBotId(playerId: string): boolean {
  return playerId.startsWith('bot-');
}
