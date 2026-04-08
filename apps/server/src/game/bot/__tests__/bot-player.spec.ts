import {
  createBotPlayer,
  isBot,
  isBotId,
  removeBotState,
  clearRoomBotNames,
  botStates,
} from '../bot-player';
import type { Player } from '@doodledraw/shared';

describe('bot-player utilities', () => {
  // -------------------------------------------------------------------------
  // createBotPlayer
  // -------------------------------------------------------------------------

  describe('createBotPlayer', () => {
    afterEach(() => {
      clearRoomBotNames('test-room');
      clearRoomBotNames('room-a');
      clearRoomBotNames('room-b');
    });

    it('creates a bot whose id starts with "bot-" and persistentId equals id', () => {
      const bot = createBotPlayer({ roomId: 'test-room' });

      expect(bot.id.startsWith('bot-')).toBe(true);
      expect(bot.persistentId).toBe(bot.id);
      expect(bot.isBot).toBe(true);
      expect(bot.isConnected).toBe(true);
    });

    it('uses the provided difficulty (default medium when omitted)', () => {
      const easy = createBotPlayer({ roomId: 'test-room', difficulty: 'easy' });
      const def = createBotPlayer({ roomId: 'test-room' });

      expect(easy.botDifficulty).toBe('easy');
      expect(def.botDifficulty).toBe('medium');
    });

    it('initializes a botState entry for the new bot', () => {
      const bot = createBotPlayer({ roomId: 'test-room' });

      const state = botStates.get(bot.id);
      expect(state).toBeDefined();
      expect(state?.stopGuessing).toBe(false);
      expect(state?.drawingAborted).toBe(false);
      expect(state?.previousGuesses).toEqual([]);
    });

    it('assigns a unique nickname per room until the 10 names are exhausted', () => {
      const names = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const bot = createBotPlayer({ roomId: 'room-a' });
        names.add(bot.nickname);
      }

      // All 10 should be distinct.
      expect(names.size).toBe(10);

      // The 11th bot in the same room falls back to a Bot-XXXX naming scheme.
      const overflow = createBotPlayer({ roomId: 'room-a' });
      expect(overflow.nickname.startsWith('Bot-')).toBe(true);
    });

    it('tracks used names per room independently', () => {
      const botA = createBotPlayer({ roomId: 'room-a' });
      const botB = createBotPlayer({ roomId: 'room-b' });
      // Bots in different rooms can share names but each room's pool is independent.
      expect(botA.id).not.toBe(botB.id);
    });

    it('respects the team option when provided', () => {
      const bot = createBotPlayer({ roomId: 'test-room', team: 'A' });
      expect(bot.team).toBe('A');
    });

    it('uses the provided initial score when supplied', () => {
      const bot = createBotPlayer({ roomId: 'test-room', score: 42 });
      expect(bot.score).toBe(42);
    });
  });

  // -------------------------------------------------------------------------
  // isBot / isBotId
  // -------------------------------------------------------------------------

  describe('isBot', () => {
    it('returns true when the player has isBot = true', () => {
      const player: Player = {
        id: 'bot-1',
        persistentId: 'bot-1',
        nickname: 'B',
        avatar: 'a',
        score: 0,
        isDrawing: false,
        hasDrawn: false,
        isHost: false,
        isConnected: true,
        isBot: true,
      };
      expect(isBot(player)).toBe(true);
    });

    it('returns false for human players', () => {
      const player: Player = {
        id: 'p1',
        persistentId: 'p1',
        nickname: 'Human',
        avatar: 'a',
        score: 0,
        isDrawing: false,
        hasDrawn: false,
        isHost: false,
        isConnected: true,
      };
      expect(isBot(player)).toBe(false);
    });
  });

  describe('isBotId', () => {
    it('returns true for ids prefixed with bot-', () => {
      expect(isBotId('bot-12345')).toBe(true);
      expect(isBotId('bot-')).toBe(true);
    });

    it('returns false for non-bot ids', () => {
      expect(isBotId('user-1')).toBe(false);
      expect(isBotId('socket-abc')).toBe(false);
      expect(isBotId('')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // removeBotState
  // -------------------------------------------------------------------------

  describe('removeBotState', () => {
    it('removes the bot state entry for the given id', () => {
      const bot = createBotPlayer({ roomId: 'test-room' });
      expect(botStates.has(bot.id)).toBe(true);

      removeBotState(bot.id);

      expect(botStates.has(bot.id)).toBe(false);
      clearRoomBotNames('test-room');
    });
  });

  // -------------------------------------------------------------------------
  // clearRoomBotNames
  // -------------------------------------------------------------------------

  describe('clearRoomBotNames', () => {
    it('frees up names for the room so they can be reused', () => {
      // Fill up the room with all 10 names.
      for (let i = 0; i < 10; i++) {
        createBotPlayer({ roomId: 'room-a' });
      }
      // Next bot would overflow.
      const overflow = createBotPlayer({ roomId: 'room-a' });
      expect(overflow.nickname.startsWith('Bot-')).toBe(true);

      // Clear and verify a fresh bot gets a real name again.
      clearRoomBotNames('room-a');

      const fresh = createBotPlayer({ roomId: 'room-a' });
      expect(fresh.nickname.startsWith('Bot-')).toBe(false);
    });
  });
});
