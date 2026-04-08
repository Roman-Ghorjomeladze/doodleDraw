import { renderHook, act } from '@testing-library/react';

const listeners = new Map<string, Function>();

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({
    on: vi.fn((event: string, handler: Function) => {
      listeners.set(event, handler);
      return vi.fn();
    }),
    emit: vi.fn(),
    connected: true,
    socketVersion: 0,
    reconnecting: false,
    reconnectAttempt: 0,
    reconnectFailed: false,
    manualReconnect: vi.fn(),
    socket: { current: {} },
  }),
}));

const playSound = vi.fn();
vi.mock('@/utils/sounds', () => ({
  playSound: (...args: any[]) => playSound(...args),
}));

// Game store mock — full of vi.fn() actions plus mutable state.
const gameStoreState: any = {
  roomId: null,
  mode: null,
  phase: 'lobby',
  players: [],
  drawerId: null,
  wordHint: '',
  currentWord: null,
  wordOptions: [],
  timeLeft: 0,
  currentRound: 0,
  totalRounds: 2,
  messages: [],
  scores: [],
  isHost: false,
  settings: null,
  teamADrawerId: null,
  teamBDrawerId: null,
  teamAScore: 0,
  teamBScore: 0,
  isRedrawRound: false,
  countdownSeconds: null,
  rematchState: null,
  setRoom: vi.fn((data: any) => {
    Object.assign(gameStoreState, data);
  }),
  setPhase: vi.fn((phase: string) => { gameStoreState.phase = phase; }),
  setPlayers: vi.fn((players: any[]) => { gameStoreState.players = players; }),
  addPlayer: vi.fn((player: any) => { gameStoreState.players = [...gameStoreState.players, player]; }),
  removePlayer: vi.fn((id: string) => {
    gameStoreState.players = gameStoreState.players.filter((p: any) => p.id !== id);
  }),
  updatePlayer: vi.fn((id: string, data: any) => {
    gameStoreState.players = gameStoreState.players.map((p: any) =>
      p.id === id ? { ...p, ...data } : p,
    );
  }),
  addMessage: vi.fn((m: any) => { gameStoreState.messages = [...gameStoreState.messages, m]; }),
  setTimeLeft: vi.fn((t: number) => { gameStoreState.timeLeft = t; }),
  setWordOptions: vi.fn((w: any[]) => { gameStoreState.wordOptions = w; }),
  setWordHint: vi.fn((h: string) => { gameStoreState.wordHint = h; }),
  setDrawer: vi.fn((id: string | null) => { gameStoreState.drawerId = id; }),
  setScores: vi.fn((s: any[]) => { gameStoreState.scores = s; }),
  setCurrentWord: vi.fn((w: string | null) => { gameStoreState.currentWord = w; }),
  setSettings: vi.fn((s: any) => { gameStoreState.settings = s; }),
  setCountdownSeconds: vi.fn((s: any) => { gameStoreState.countdownSeconds = s; }),
  setPendingRoomId: vi.fn(),
  setPlayerLeftNotice: vi.fn((n: any) => { gameStoreState.playerLeftNotice = n; }),
  setRematchState: vi.fn((s: any) => { gameStoreState.rematchState = s; }),
  reset: vi.fn(),
};

const gameStoreSetState = vi.fn((partial: any) => {
  if (typeof partial === 'function') {
    Object.assign(gameStoreState, partial(gameStoreState));
  } else {
    Object.assign(gameStoreState, partial);
  }
});

vi.mock('@/stores/gameStore', () => ({
  useGameStore: Object.assign(
    (selector?: (s: any) => any) => (selector ? selector(gameStoreState) : gameStoreState),
    {
      getState: () => gameStoreState,
      setState: (...args: any[]) => gameStoreSetState(...args),
    },
  ),
}));

const drawingStoreState = {
  reset: vi.fn(),
  setCanDraw: vi.fn(),
  setIsDrawing: vi.fn(),
  setHandicap: vi.fn(),
};
vi.mock('@/stores/drawingStore', () => ({
  useDrawingStore: Object.assign(
    (selector?: (s: any) => any) => (selector ? selector(drawingStoreState) : drawingStoreState),
    { getState: () => drawingStoreState, setState: vi.fn() },
  ),
}));

const playerStoreState: any = {
  playerId: 'p1',
  nickname: 'Roma',
  avatar: 'a',
  persistentId: 'pid-1',
  isSpectator: false,
  setPlayerId: vi.fn((id: string | null) => { playerStoreState.playerId = id; }),
  setIsSpectator: vi.fn(),
};
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: Object.assign(
    (selector?: (s: any) => any) => (selector ? selector(playerStoreState) : playerStoreState),
    { getState: () => playerStoreState, setState: vi.fn() },
  ),
}));

import { useGameEvents } from '@/hooks/useGameEvents';

function resetGameState() {
  Object.assign(gameStoreState, {
    roomId: null,
    mode: null,
    phase: 'lobby',
    players: [],
    drawerId: null,
    wordHint: '',
    currentWord: null,
    wordOptions: [],
    timeLeft: 0,
    currentRound: 0,
    totalRounds: 2,
    messages: [],
    scores: [],
    isHost: false,
    settings: null,
    teamADrawerId: null,
    teamBDrawerId: null,
    teamAScore: 0,
    teamBScore: 0,
    isRedrawRound: false,
    countdownSeconds: null,
    rematchState: null,
    playerLeftNotice: null,
  });
}

describe('useGameEvents', () => {
  beforeEach(() => {
    listeners.clear();
    playSound.mockClear();
    gameStoreSetState.mockClear();
    Object.values(gameStoreState).forEach((v) => {
      if (typeof v === 'function' && 'mockClear' in v) (v as any).mockClear();
    });
    Object.values(drawingStoreState).forEach((v) => {
      if (typeof v === 'function' && 'mockClear' in v) (v as any).mockClear();
    });
    playerStoreState.playerId = 'p1';
    (playerStoreState.setPlayerId as any).mockClear();
    resetGameState();
  });

  function trigger(event: string, payload?: any) {
    const handler = listeners.get(event);
    if (!handler) throw new Error(`No listener registered for ${event}`);
    act(() => {
      handler(payload);
    });
  }

  function makeRoom(overrides: Partial<any> = {}) {
    return {
      id: 'ROOM1',
      mode: 'classic',
      phase: 'lobby',
      players: [{ id: 'p1', nickname: 'Roma', isHost: true, isConnected: true, score: 0 }],
      currentRound: 0,
      totalRounds: 3,
      drawerId: null,
      wordHint: '',
      teamADrawerId: null,
      teamBDrawerId: null,
      teamAScore: 0,
      teamBScore: 0,
      isRedrawRound: false,
      settings: { totalRounds: 3, language: 'en' },
      ...overrides,
    };
  }

  it('room:created updates gameStore with room and sets isHost', () => {
    renderHook(() => useGameEvents());
    const room = makeRoom();
    trigger('room:created', { roomId: 'ROOM1', room });

    expect(playerStoreState.setPlayerId).toHaveBeenCalledWith('p1');
    expect(gameStoreState.setRoom).toHaveBeenCalled();
    // isHost set via setState
    const setStateCalls = gameStoreSetState.mock.calls.map((c) => c[0]);
    expect(setStateCalls.some((s: any) => s.isHost === true)).toBe(true);
  });

  it('room:joined sets player ID and room state', () => {
    renderHook(() => useGameEvents());
    const room = makeRoom();
    trigger('room:joined', { room, playerId: 'p1' });

    expect(playerStoreState.setPlayerId).toHaveBeenCalledWith('p1');
    expect(gameStoreState.setRoom).toHaveBeenCalled();
  });

  it('room:updated updates players list', () => {
    renderHook(() => useGameEvents());
    const room = makeRoom({
      players: [
        { id: 'p1', nickname: 'Roma', isHost: true, isConnected: true, score: 0 },
        { id: 'p2', nickname: 'Bob', isHost: false, isConnected: true, score: 0 },
      ],
    });
    trigger('room:updated', { room });
    expect(gameStoreState.setRoom).toHaveBeenCalled();
  });

  it('room:playerJoined adds player', () => {
    renderHook(() => useGameEvents());
    const player = { id: 'p2', nickname: 'Bob', isHost: false, isConnected: true, score: 0 };
    trigger('room:playerJoined', { player });
    expect(gameStoreState.addPlayer).toHaveBeenCalledWith(player);
  });

  it('room:playerLeft removes player and sets notice when wasInGame', () => {
    renderHook(() => useGameEvents());
    trigger('room:playerLeft', { playerId: 'p2', nickname: 'Bob', wasInGame: true });
    expect(gameStoreState.removePlayer).toHaveBeenCalledWith('p2');
    expect(gameStoreState.setPlayerLeftNotice).toHaveBeenCalledWith('Bob');
  });

  it('room:error logs error to console', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderHook(() => useGameEvents());
    trigger('room:error', { message: 'oops' });
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('game:phaseChange updates phase via setState', () => {
    renderHook(() => useGameEvents());
    trigger('game:phaseChange', { phase: 'drawing', context: { drawerId: 'p1' } });
    const setStateCalls = gameStoreSetState.mock.calls.map((c) => c[0]);
    expect(setStateCalls.some((s: any) => s.phase === 'drawing')).toBe(true);
  });

  it('game:wordOptions sets word options', () => {
    renderHook(() => useGameEvents());
    const words = [{ word: 'cat', difficulty: 1 }];
    trigger('game:wordOptions', { words });
    expect(gameStoreState.setWordOptions).toHaveBeenCalledWith(words);
  });

  it('game:roundStart sets drawer, word hint, round number', () => {
    renderHook(() => useGameEvents());
    trigger('game:roundStart', {
      drawerId: 'p1',
      wordHint: '_ _ _',
      roundNumber: 2,
      currentWord: 'cat',
    });
    expect(gameStoreState.setDrawer).toHaveBeenCalledWith('p1');
    expect(gameStoreState.setWordHint).toHaveBeenCalledWith('_ _ _');
    expect(gameStoreState.setCurrentWord).toHaveBeenCalledWith('cat');
    expect(playSound).toHaveBeenCalledWith('roundStart');
  });

  it('game:roundEnd sets scores and current word', () => {
    renderHook(() => useGameEvents());
    const scores = [{ playerId: 'p1', score: 100 }];
    trigger('game:roundEnd', { word: 'cat', scores });
    expect(gameStoreState.setScores).toHaveBeenCalledWith(scores);
    expect(gameStoreState.setCurrentWord).toHaveBeenCalledWith('cat');
    expect(playSound).toHaveBeenCalledWith('roundEnd');
  });

  it('game:end sets final scores and clears rematch state', () => {
    renderHook(() => useGameEvents());
    const finalScores = [{ playerId: 'p1', score: 100 }];
    trigger('game:end', { finalScores });
    expect(gameStoreState.setScores).toHaveBeenCalledWith(finalScores);
    expect(gameStoreState.setRematchState).toHaveBeenCalledWith(null);
    expect(playSound).toHaveBeenCalledWith('gameEnd');
  });

  it('game:timerUpdate sets time left', () => {
    renderHook(() => useGameEvents());
    trigger('game:timerUpdate', { timeLeft: 10 });
    expect(gameStoreState.setTimeLeft).toHaveBeenCalledWith(10);
  });

  it('game:hintReveal updates word hint when not drawer', () => {
    gameStoreState.drawerId = 'p2';
    renderHook(() => useGameEvents());
    trigger('game:hintReveal', { hint: 'c _ t' });
    expect(gameStoreState.setWordHint).toHaveBeenCalledWith('c _ t');
  });

  it('chat:message appends message and plays sound', () => {
    renderHook(() => useGameEvents());
    const msg = { id: 'm1', playerId: 'p2', nickname: 'Bob', text: 'hi', timestamp: 1, isCorrectGuess: false, isSystemMessage: false, isCloseGuess: false };
    trigger('chat:message', msg);
    expect(gameStoreState.addMessage).toHaveBeenCalledWith(msg);
    expect(playSound).toHaveBeenCalledWith('chatMessage');
  });

  it('chat:correctGuess plays correct sound and adds system message', () => {
    gameStoreState.players = [{ id: 'p2', nickname: 'Bob', score: 0 }];
    renderHook(() => useGameEvents());
    trigger('chat:correctGuess', { playerId: 'p2', nickname: 'Bob', points: 50 });
    expect(gameStoreState.updatePlayer).toHaveBeenCalledWith('p2', { score: 50 });
    expect(gameStoreState.addMessage).toHaveBeenCalled();
    expect(playSound).toHaveBeenCalledWith('correctGuess');
  });

  it('team:roundStart sets team drawers and word hint', () => {
    renderHook(() => useGameEvents());
    trigger('team:roundStart', {
      teamADrawerId: 'p1',
      teamBDrawerId: 'p2',
      wordHint: '_ _ _',
      roundNumber: 1,
      currentWord: 'cat',
    });
    expect(gameStoreState.setWordHint).toHaveBeenCalled();
    const setStateCalls = gameStoreSetState.mock.calls.map((c) => c[0]);
    expect(setStateCalls.some((s: any) => s.teamADrawerId === 'p1')).toBe(true);
    expect(playSound).toHaveBeenCalledWith('roundStart');
  });
});
