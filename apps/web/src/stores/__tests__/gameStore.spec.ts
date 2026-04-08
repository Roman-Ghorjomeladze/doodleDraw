import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/stores/gameStore';
import type { Player, ChatMessage, GameScore, RematchState } from '@doodledraw/shared';

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'p-1',
  persistentId: 'pid-1',
  nickname: 'Alice',
  avatar: 'av-1',
  score: 0,
  isDrawing: false,
  hasDrawn: false,
  isHost: false,
  isConnected: true,
  ...overrides,
});

const makeMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'm-1',
  playerId: 'p-1',
  nickname: 'Alice',
  text: 'hi',
  timestamp: 0,
  isCorrectGuess: false,
  isSystemMessage: false,
  isCloseGuess: false,
  ...overrides,
});

describe('gameStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useGameStore.getState().reset();
  });

  it('starts in the expected initial state', () => {
    const state = useGameStore.getState();
    expect(state.roomId).toBeNull();
    expect(state.mode).toBeNull();
    expect(state.phase).toBe('lobby');
    expect(state.players).toEqual([]);
    expect(state.drawerId).toBeNull();
    expect(state.wordHint).toBe('');
    expect(state.currentWord).toBeNull();
    expect(state.wordOptions).toEqual([]);
    expect(state.timeLeft).toBe(0);
    expect(state.currentRound).toBe(0);
    expect(state.totalRounds).toBe(2);
    expect(state.messages).toEqual([]);
    expect(state.scores).toEqual([]);
    expect(state.teamAScore).toBe(0);
    expect(state.teamBScore).toBe(0);
    expect(state.isRedrawRound).toBe(false);
    expect(state.countdownSeconds).toBeNull();
    expect(state.pendingRoomId).toBeNull();
    expect(state.playerLeftNotice).toBeNull();
    expect(state.rematchState).toBeNull();
  });

  it('setRoom initializes the room state and stores roomId in sessionStorage', () => {
    const players = [makePlayer()];
    useGameStore.getState().setRoom({
      roomId: 'room-abc',
      mode: 'classic',
      phase: 'drawing',
      players,
      currentRound: 1,
      totalRounds: 5,
      drawerId: 'p-1',
      wordHint: '_ _ _',
      teamADrawerId: null,
      teamBDrawerId: null,
      teamAScore: 0,
      teamBScore: 0,
      isRedrawRound: false,
    });

    const state = useGameStore.getState();
    expect(state.roomId).toBe('room-abc');
    expect(state.mode).toBe('classic');
    expect(state.phase).toBe('drawing');
    expect(state.players).toEqual(players);
    expect(state.currentRound).toBe(1);
    expect(state.totalRounds).toBe(5);
    expect(state.drawerId).toBe('p-1');
    expect(state.wordHint).toBe('_ _ _');
    expect(sessionStorage.getItem('doodledraw_roomId')).toBe('room-abc');
  });

  it('setPhase updates the phase', () => {
    useGameStore.getState().setPhase('selecting');
    expect(useGameStore.getState().phase).toBe('selecting');
  });

  it('setPlayers replaces the player list', () => {
    const players = [makePlayer(), makePlayer({ id: 'p-2', persistentId: 'pid-2' })];
    useGameStore.getState().setPlayers(players);
    expect(useGameStore.getState().players).toEqual(players);
  });

  it('addPlayer appends a player', () => {
    useGameStore.getState().setPlayers([makePlayer()]);
    useGameStore.getState().addPlayer(makePlayer({ id: 'p-2', persistentId: 'pid-2' }));
    expect(useGameStore.getState().players).toHaveLength(2);
    expect(useGameStore.getState().players[1].id).toBe('p-2');
  });

  it('removePlayer removes by id', () => {
    useGameStore.getState().setPlayers([
      makePlayer(),
      makePlayer({ id: 'p-2', persistentId: 'pid-2' }),
    ]);
    useGameStore.getState().removePlayer('p-1');
    const players = useGameStore.getState().players;
    expect(players).toHaveLength(1);
    expect(players[0].id).toBe('p-2');
  });

  it('updatePlayer merges fields onto matching player', () => {
    useGameStore.getState().setPlayers([
      makePlayer(),
      makePlayer({ id: 'p-2', persistentId: 'pid-2' }),
    ]);
    useGameStore.getState().updatePlayer('p-2', { score: 99, nickname: 'Bob' });
    const players = useGameStore.getState().players;
    expect(players[0].score).toBe(0);
    expect(players[1].score).toBe(99);
    expect(players[1].nickname).toBe('Bob');
  });

  it('addMessage appends to messages', () => {
    useGameStore.getState().addMessage(makeMessage());
    useGameStore.getState().addMessage(makeMessage({ id: 'm-2', text: 'second' }));
    const messages = useGameStore.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[1].text).toBe('second');
  });

  it('setTimeLeft updates the timer', () => {
    useGameStore.getState().setTimeLeft(42);
    expect(useGameStore.getState().timeLeft).toBe(42);
  });

  it('setWordOptions updates word options', () => {
    const options = [
      { word: 'cat', difficulty: 1 },
      { word: 'dog', difficulty: 2 },
    ];
    useGameStore.getState().setWordOptions(options);
    expect(useGameStore.getState().wordOptions).toEqual(options);
  });

  it('setCurrentWord updates current word and accepts null', () => {
    useGameStore.getState().setCurrentWord('apple');
    expect(useGameStore.getState().currentWord).toBe('apple');
    useGameStore.getState().setCurrentWord(null);
    expect(useGameStore.getState().currentWord).toBeNull();
  });

  it('setDrawer updates the drawer id', () => {
    useGameStore.getState().setDrawer('p-9');
    expect(useGameStore.getState().drawerId).toBe('p-9');
    useGameStore.getState().setDrawer(null);
    expect(useGameStore.getState().drawerId).toBeNull();
  });

  it('setScores stores the score list', () => {
    const scores: GameScore[] = [
      { playerId: 'p-1', nickname: 'Alice', score: 10, correctGuesses: 1, drawingScore: 5 },
    ];
    useGameStore.getState().setScores(scores);
    expect(useGameStore.getState().scores).toEqual(scores);
  });

  it('setCountdownSeconds updates countdown', () => {
    useGameStore.getState().setCountdownSeconds(3);
    expect(useGameStore.getState().countdownSeconds).toBe(3);
    useGameStore.getState().setCountdownSeconds(null);
    expect(useGameStore.getState().countdownSeconds).toBeNull();
  });

  it('setPendingRoomId updates pending room id', () => {
    useGameStore.getState().setPendingRoomId('room-xyz');
    expect(useGameStore.getState().pendingRoomId).toBe('room-xyz');
  });

  it('setPlayerLeftNotice updates player left notice', () => {
    useGameStore.getState().setPlayerLeftNotice('Alice left');
    expect(useGameStore.getState().playerLeftNotice).toBe('Alice left');
  });

  it('setRematchState updates rematch state', () => {
    const rs: RematchState = { votes: { 'p-1': 'pending' }, totalEligible: 2 };
    useGameStore.getState().setRematchState(rs);
    expect(useGameStore.getState().rematchState).toEqual(rs);
  });

  it('setWordHint updates wordHint', () => {
    useGameStore.getState().setWordHint('a _ _ _ e');
    expect(useGameStore.getState().wordHint).toBe('a _ _ _ e');
  });

  it('reset returns the store to its initial state and clears sessionStorage', () => {
    useGameStore.getState().setRoom({
      roomId: 'room-1',
      mode: 'team',
      phase: 'drawing',
      players: [makePlayer()],
      currentRound: 3,
      totalRounds: 4,
      drawerId: 'p-1',
      wordHint: 'foo',
      teamADrawerId: null,
      teamBDrawerId: null,
      teamAScore: 1,
      teamBScore: 2,
      isRedrawRound: true,
    });
    useGameStore.getState().setTimeLeft(20);
    useGameStore.getState().addMessage(makeMessage());

    useGameStore.getState().reset();

    const state = useGameStore.getState();
    expect(state.roomId).toBeNull();
    expect(state.mode).toBeNull();
    expect(state.phase).toBe('lobby');
    expect(state.players).toEqual([]);
    expect(state.timeLeft).toBe(0);
    expect(state.messages).toEqual([]);
    expect(sessionStorage.getItem('doodledraw_roomId')).toBeNull();
  });
});
