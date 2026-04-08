import {
  validateNickname,
  validateAvatar,
  validateChatMessage,
  validateRoomCode,
  validateGameMode,
  validateTeam,
  validatePersistentId,
  validateWordIndex,
  validateDrawAction,
  validateSettings,
} from '../validation';

describe('validation', () => {
  describe('validateNickname', () => {
    it('accepts and trims a normal nickname', () => {
      expect(validateNickname('  Alice  ')).toBe('Alice');
    });

    it('strips HTML tags from a nickname', () => {
      expect(validateNickname('<b>Bob</b>')).toBe('Bob');
    });

    it('rejects an empty/whitespace-only nickname', () => {
      expect(validateNickname('   ')).toBeNull();
    });

    it('rejects a nickname longer than 20 chars', () => {
      expect(validateNickname('a'.repeat(21))).toBeNull();
    });

    it('rejects a non-string nickname', () => {
      expect(validateNickname(42)).toBeNull();
    });
  });

  describe('validateAvatar', () => {
    it('accepts a normal avatar string', () => {
      expect(validateAvatar('avatar1.png')).toBe('avatar1.png');
    });

    it('rejects an avatar string longer than 80 chars', () => {
      expect(validateAvatar('a'.repeat(81))).toBeNull();
    });

    it('rejects a non-string avatar', () => {
      expect(validateAvatar(null)).toBeNull();
    });
  });

  describe('validateChatMessage', () => {
    it('accepts and trims a normal chat message', () => {
      expect(validateChatMessage('  hello world  ')).toBe('hello world');
    });

    it('rejects an empty chat message', () => {
      expect(validateChatMessage('   ')).toBeNull();
    });

    it('rejects a chat message longer than 200 chars', () => {
      expect(validateChatMessage('x'.repeat(201))).toBeNull();
    });

    it('rejects a non-string chat message', () => {
      expect(validateChatMessage(123)).toBeNull();
    });
  });

  describe('validateRoomCode', () => {
    it('accepts a valid 6-char alphanumeric code (uppercased)', () => {
      expect(validateRoomCode('abc123')).toBe('ABC123');
    });

    it('rejects a code with non-alphanumeric characters', () => {
      expect(validateRoomCode('ABC-12')).toBeNull();
    });

    it('rejects a code that is too short (< 4 chars)', () => {
      expect(validateRoomCode('AB1')).toBeNull();
    });

    it('rejects a code that is too long (> 8 chars)', () => {
      expect(validateRoomCode('ABCDEFGHI')).toBeNull();
    });

    it('rejects non-string room codes', () => {
      expect(validateRoomCode(undefined)).toBeNull();
    });
  });

  describe('validateGameMode', () => {
    it('accepts the "classic" mode', () => {
      expect(validateGameMode('classic')).toBe('classic');
    });

    it('accepts the "team" mode', () => {
      expect(validateGameMode('team')).toBe('team');
    });

    it('rejects an unknown mode string', () => {
      expect(validateGameMode('battle-royale')).toBeNull();
    });

    it('rejects a non-string mode', () => {
      expect(validateGameMode(1)).toBeNull();
    });
  });

  describe('validateTeam', () => {
    it('accepts team "A"', () => {
      expect(validateTeam('A')).toBe('A');
    });

    it('accepts team "B"', () => {
      expect(validateTeam('B')).toBe('B');
    });

    it('rejects an unknown team identifier', () => {
      expect(validateTeam('C')).toBeNull();
    });

    it('rejects a non-string team', () => {
      expect(validateTeam(0)).toBeNull();
    });
  });

  describe('validatePersistentId', () => {
    const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

    it('accepts a valid UUID v4', () => {
      expect(validatePersistentId(VALID_UUID)).toBe(VALID_UUID);
    });

    it('rejects a non-UUID string', () => {
      expect(validatePersistentId('not-a-uuid')).toBeNull();
    });

    it('rejects a UUID v1 (wrong version)', () => {
      // Version 1 UUID — should be rejected since regex pins version 4.
      expect(validatePersistentId('550e8400-e29b-11d4-a716-446655440000')).toBeNull();
    });

    it('rejects a non-string id', () => {
      expect(validatePersistentId(undefined)).toBeNull();
    });
  });

  describe('validateWordIndex', () => {
    it('accepts a valid index within range (0-10)', () => {
      expect(validateWordIndex(0)).toBe(0);
      expect(validateWordIndex(10)).toBe(10);
    });

    it('rejects a negative index', () => {
      expect(validateWordIndex(-1)).toBeNull();
    });

    it('rejects an index above the upper bound', () => {
      expect(validateWordIndex(11)).toBeNull();
    });

    it('rejects a non-integer numeric index', () => {
      expect(validateWordIndex(2.5)).toBeNull();
    });

    it('rejects a non-numeric value', () => {
      expect(validateWordIndex('3')).toBeNull();
    });
  });

  describe('validateDrawAction', () => {
    it('accepts a clear action with no extra fields', () => {
      const action = validateDrawAction({ type: 'clear' });
      expect(action).not.toBeNull();
      expect(action!.type).toBe('clear');
    });

    it('accepts an undo action', () => {
      const action = validateDrawAction({ type: 'undo' });
      expect(action).not.toBeNull();
      expect(action!.type).toBe('undo');
    });

    it('accepts a stroke action with valid points, color, brush, and tool', () => {
      const action = validateDrawAction({
        type: 'stroke',
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
        ],
        color: '#ff00aa',
        brushSize: 5,
        tool: 'pen',
      });
      expect(action).not.toBeNull();
      expect(action!.points).toHaveLength(2);
      expect(action!.color).toBe('#ff00aa');
      expect(action!.brushSize).toBe(5);
      expect(action!.tool).toBe('pen');
    });

    it('rejects a payload with an invalid type', () => {
      expect(validateDrawAction({ type: 'paint' })).toBeNull();
    });

    it('rejects a stroke with too many points', () => {
      const points = Array.from({ length: 5_001 }, (_, i) => ({ x: i, y: i }));
      expect(validateDrawAction({ type: 'stroke', points })).toBeNull();
    });

    it('rejects a stroke with an invalid color format', () => {
      expect(
        validateDrawAction({ type: 'stroke', points: [], color: 'red' }),
      ).toBeNull();
    });

    it('rejects a brush size outside the allowed range', () => {
      expect(
        validateDrawAction({ type: 'stroke', points: [], brushSize: 9999 }),
      ).toBeNull();
    });

    it('rejects a non-object payload', () => {
      expect(validateDrawAction('stroke')).toBeNull();
      expect(validateDrawAction(null)).toBeNull();
    });

    it('clamps point coordinates to the canvas bounds', () => {
      const action = validateDrawAction({
        type: 'stroke',
        points: [{ x: 9999, y: -9999 }],
      });
      expect(action).not.toBeNull();
      expect(action!.points![0].x).toBe(2000);
      expect(action!.points![0].y).toBe(-10);
    });
  });

  describe('validateSettings', () => {
    it('accepts a valid maxPlayers value', () => {
      const result = validateSettings({ maxPlayers: 8 });
      expect(result).toEqual({ maxPlayers: 8 });
    });

    it('accepts a valid roundTime value from the allowed list', () => {
      const result = validateSettings({ roundTime: 80 });
      expect(result).toEqual({ roundTime: 80 });
    });

    it('rejects a payload with no recognised fields', () => {
      expect(validateSettings({ unknownField: 'foo' })).toBeNull();
    });

    it('strips out-of-range maxPlayers values', () => {
      // maxPlayers=999 is invalid; with no other fields, returns null
      expect(validateSettings({ maxPlayers: 999 })).toBeNull();
    });

    it('accepts boolean toggles like hintsEnabled', () => {
      const result = validateSettings({ hintsEnabled: true });
      expect(result).toEqual({ hintsEnabled: true });
    });

    it('accepts a known language code', () => {
      const result = validateSettings({ language: 'en' });
      expect(result).toEqual({ language: 'en' });
    });

    it('rejects an unknown language code as that field but keeps other valid fields', () => {
      const result = validateSettings({ language: 'xx', difficulty: 2 });
      expect(result).toEqual({ difficulty: 2 });
    });

    it('rejects a non-object payload', () => {
      expect(validateSettings(null)).toBeNull();
      expect(validateSettings('settings')).toBeNull();
    });
  });
});
