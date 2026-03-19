/**
 * Input validation and sanitization for all socket event payloads.
 *
 * Every public function returns the cleaned value or `null` when the
 * input is invalid, so callers can bail early with a single check.
 */

import type { DrawAction, GameMode, RoomSettings, Team } from '@doodledraw/shared';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PERSISTENT_ID_LENGTH = 36;
const MAX_STROKE_ID_LENGTH = 64;
const MAX_NICKNAME_LENGTH = 20;
const MIN_NICKNAME_LENGTH = 1;
const MAX_CHAT_MESSAGE_LENGTH = 200;
const MAX_AVATAR_LENGTH = 80;
const ROOM_CODE_REGEX = /^[A-Z0-9]{4,8}$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const VALID_GAME_MODES: GameMode[] = ['classic', 'team'];
const VALID_TEAMS: Team[] = ['A', 'B'];
const VALID_DRAW_TYPES = ['stroke', 'fill', 'clear', 'undo'] as const;
const VALID_DRAW_TOOLS = ['pen', 'eraser', 'fill'] as const;
const MAX_DRAW_POINTS = 5_000; // max points per single draw action
const MAX_BRUSH_SIZE = 100;
const MIN_BRUSH_SIZE = 1;
const VALID_LANGUAGES = ['en', 'ka', 'tr', 'ru'];
const VALID_DIFFICULTIES = [1, 2, 3];
const VALID_ROUND_TIMES = [60, 80, 100, 120];
const VALID_TOTAL_ROUNDS = [3, 5, 8, 13];
const MAX_MAX_PLAYERS = 16;
const MIN_MAX_PLAYERS = 2;

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags and trim to prevent XSS and padding abuse. */
function sanitizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // Strip HTML tags, collapse whitespace, and trim.
  const cleaned = value.replace(/<[^>]*>/g, '').trim();
  return cleaned || null;
}

// ---------------------------------------------------------------------------
// Public validators
// ---------------------------------------------------------------------------

export function validateNickname(raw: unknown): string | null {
  const s = sanitizeString(raw);
  if (!s) return null;
  if (s.length < MIN_NICKNAME_LENGTH || s.length > MAX_NICKNAME_LENGTH) return null;
  return s;
}

export function validateAvatar(raw: unknown): string | null {
  const s = sanitizeString(raw);
  if (!s) return null;
  if (s.length > MAX_AVATAR_LENGTH) return null;
  return s;
}

export function validateChatMessage(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_CHAT_MESSAGE_LENGTH) return null;
  return trimmed;
}

export function validateRoomCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.trim().toUpperCase();
  if (!ROOM_CODE_REGEX.test(upper)) return null;
  return upper;
}

export function validateGameMode(raw: unknown): GameMode | null {
  if (typeof raw !== 'string') return null;
  if (!VALID_GAME_MODES.includes(raw as GameMode)) return null;
  return raw as GameMode;
}

export function validateTeam(raw: unknown): Team | null {
  if (typeof raw !== 'string') return null;
  if (!VALID_TEAMS.includes(raw as Team)) return null;
  return raw as Team;
}

export function validatePersistentId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (raw.length > MAX_PERSISTENT_ID_LENGTH) return null;
  if (!UUID_V4_REGEX.test(raw)) return null;
  return raw;
}

export function validateWordIndex(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return null;
  if (raw < 0 || raw > 10) return null; // generous upper bound
  return raw;
}

/**
 * Validate and sanitize a DrawAction payload.
 * Returns a clean DrawAction or `null`.
 */
export function validateDrawAction(raw: unknown): DrawAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  // Type
  const type = obj.type;
  if (typeof type !== 'string' || !(VALID_DRAW_TYPES as readonly string[]).includes(type)) {
    return null;
  }

  const action: DrawAction = {
    type: type as DrawAction['type'],
    timestamp: 0,
    playerId: '',
  };

  // For clear and undo, no further fields needed.
  if (type === 'clear' || type === 'undo') {
    return action;
  }

  // Points array (for stroke)
  if (obj.points !== undefined) {
    if (!Array.isArray(obj.points)) return null;
    if (obj.points.length > MAX_DRAW_POINTS) return null;
    const cleanPoints: { x: number; y: number }[] = [];
    for (const pt of obj.points) {
      if (
        !pt ||
        typeof pt !== 'object' ||
        typeof (pt as any).x !== 'number' ||
        typeof (pt as any).y !== 'number'
      ) {
        return null;
      }
      // Clamp to reasonable canvas coordinates (0-2000).
      const x = Math.max(-10, Math.min(2000, (pt as any).x));
      const y = Math.max(-10, Math.min(2000, (pt as any).y));
      cleanPoints.push({ x, y });
    }
    action.points = cleanPoints;
  }

  // Color
  if (obj.color !== undefined) {
    if (typeof obj.color !== 'string' || !HEX_COLOR_REGEX.test(obj.color)) {
      return null;
    }
    action.color = obj.color;
  }

  // Brush size
  if (obj.brushSize !== undefined) {
    if (typeof obj.brushSize !== 'number') return null;
    if (obj.brushSize < MIN_BRUSH_SIZE || obj.brushSize > MAX_BRUSH_SIZE) return null;
    action.brushSize = obj.brushSize;
  }

  // Tool
  if (obj.tool !== undefined) {
    if (
      typeof obj.tool !== 'string' ||
      !(VALID_DRAW_TOOLS as readonly string[]).includes(obj.tool)
    ) {
      return null;
    }
    action.tool = obj.tool as DrawAction['tool'];
  }

  // Stroke ID (for streaming partial strokes)
  if (obj.strokeId !== undefined) {
    if (typeof obj.strokeId !== 'string' || obj.strokeId.length > MAX_STROKE_ID_LENGTH) {
      return null;
    }
    action.strokeId = obj.strokeId;
  }

  return action;
}

/**
 * Validate and sanitize a partial RoomSettings object.
 * Strips any unknown or out-of-range fields.
 * Returns `null` if nothing valid remains.
 */
export function validateSettings(raw: unknown): Partial<RoomSettings> | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const result: Partial<RoomSettings> = {};
  let hasField = false;

  if (obj.maxPlayers !== undefined) {
    const v = Number(obj.maxPlayers);
    if (Number.isInteger(v) && v >= MIN_MAX_PLAYERS && v <= MAX_MAX_PLAYERS) {
      result.maxPlayers = v;
      hasField = true;
    }
  }

  if (obj.roundTime !== undefined) {
    const v = Number(obj.roundTime);
    if (VALID_ROUND_TIMES.includes(v)) {
      result.roundTime = v;
      hasField = true;
    }
  }

  if (obj.language !== undefined) {
    if (typeof obj.language === 'string' && VALID_LANGUAGES.includes(obj.language)) {
      result.language = obj.language;
      hasField = true;
    }
  }

  if (obj.difficulty !== undefined) {
    const v = Number(obj.difficulty);
    if (VALID_DIFFICULTIES.includes(v)) {
      result.difficulty = v as 1 | 2 | 3;
      hasField = true;
    }
  }

  if (obj.totalRounds !== undefined) {
    const v = Number(obj.totalRounds);
    if (VALID_TOTAL_ROUNDS.includes(v)) {
      result.totalRounds = v;
      hasField = true;
    }
  }

  if (obj.hintsEnabled !== undefined) {
    if (typeof obj.hintsEnabled === 'boolean') {
      result.hintsEnabled = obj.hintsEnabled;
      hasField = true;
    }
  }

  if (obj.redrawEnabled !== undefined) {
    if (typeof obj.redrawEnabled === 'boolean') {
      result.redrawEnabled = obj.redrawEnabled;
      hasField = true;
    }
  }

  if (obj.teamAName !== undefined) {
    const s = sanitizeString(obj.teamAName);
    if (s && s.length <= MAX_NICKNAME_LENGTH) {
      result.teamAName = s;
      hasField = true;
    }
  }

  if (obj.teamBName !== undefined) {
    const s = sanitizeString(obj.teamBName);
    if (s && s.length <= MAX_NICKNAME_LENGTH) {
      result.teamBName = s;
      hasField = true;
    }
  }

  if (obj.isPublic !== undefined) {
    if (typeof obj.isPublic === 'boolean') {
      result.isPublic = obj.isPublic;
      hasField = true;
    }
  }

  return hasField ? result : null;
}
