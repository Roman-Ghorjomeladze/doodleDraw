import { renderHook } from '@testing-library/react';

const emit = vi.fn();
const on = vi.fn(() => vi.fn());

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({
    emit,
    on,
    connected: true,
    socketVersion: 0,
    reconnecting: false,
    reconnectAttempt: 0,
    reconnectFailed: false,
    manualReconnect: vi.fn(),
    socket: { current: {} },
  }),
}));

const playerState = {
  nickname: 'Roma',
  avatar: 'adventurer:avatar1',
  persistentId: 'pid-1',
  playerId: 'p1',
  isSpectator: false,
  setNickname: vi.fn(),
  setAvatar: vi.fn(),
  setPlayerId: vi.fn(),
  setIsSpectator: vi.fn(),
  syncFromAuth: vi.fn(),
};

vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: Object.assign(
    (selector?: (s: any) => any) => (selector ? selector(playerState) : playerState),
    { getState: () => playerState, setState: vi.fn() },
  ),
}));

const settingsState = {
  language: 'en',
  theme: 'light',
  fontSize: 'standard',
  fontFamily: 'sans',
  soundEnabled: true,
  homeLayout: 'sidebar',
};

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: Object.assign(
    (selector?: (s: any) => any) => (selector ? selector(settingsState) : settingsState),
    { getState: () => settingsState, setState: vi.fn() },
  ),
}));

const gameStoreReset = vi.fn();
const gameStoreState = {
  roomId: 'ROOM1',
  phase: 'lobby',
  players: [],
  isHost: true,
  reset: gameStoreReset,
};

vi.mock('@/stores/gameStore', () => ({
  useGameStore: Object.assign(
    (selector?: (s: any) => any) => (selector ? selector(gameStoreState) : gameStoreState),
    { getState: () => gameStoreState, setState: vi.fn() },
  ),
}));

const drawingStoreReset = vi.fn();
const drawingStoreState = {
  reset: drawingStoreReset,
};

vi.mock('@/stores/drawingStore', () => ({
  useDrawingStore: Object.assign(
    (selector?: (s: any) => any) => (selector ? selector(drawingStoreState) : drawingStoreState),
    { getState: () => drawingStoreState, setState: vi.fn() },
  ),
}));

import { useGame } from '@/hooks/useGame';

describe('useGame', () => {
  beforeEach(() => {
    emit.mockClear();
    gameStoreReset.mockClear();
    drawingStoreReset.mockClear();
    playerState.setIsSpectator.mockClear();
  });

  it('createRoom emits room:create with correct payload', () => {
    const { result } = renderHook(() => useGame());
    result.current.createRoom('classic');
    expect(emit).toHaveBeenCalledWith('room:create', {
      mode: 'classic',
      nickname: 'Roma',
      avatar: 'adventurer:avatar1',
      persistentId: 'pid-1',
    });
  });

  it('createRoom also emits room:settings with language', () => {
    const { result } = renderHook(() => useGame());
    result.current.createRoom('classic');
    expect(emit).toHaveBeenCalledWith('room:settings', { language: 'en' });
  });

  it('createRoom with isPublic option includes it in settings', () => {
    const { result } = renderHook(() => useGame());
    result.current.createRoom('team', { isPublic: true });
    expect(emit).toHaveBeenCalledWith('room:settings', { language: 'en', isPublic: true });
  });

  it('joinRoom emits room:join with player data', () => {
    const { result } = renderHook(() => useGame());
    result.current.joinRoom('ABCD');
    expect(emit).toHaveBeenCalledWith('room:join', {
      roomId: 'ABCD',
      nickname: 'Roma',
      avatar: 'adventurer:avatar1',
      persistentId: 'pid-1',
    });
  });

  it('startGame emits game:startCountdown', () => {
    const { result } = renderHook(() => useGame());
    result.current.startGame();
    expect(emit).toHaveBeenCalledWith('game:startCountdown');
  });

  it('cancelStartGame emits game:cancelCountdown', () => {
    const { result } = renderHook(() => useGame());
    result.current.cancelStartGame();
    expect(emit).toHaveBeenCalledWith('game:cancelCountdown');
  });

  it('selectWord emits game:selectWord with index', () => {
    const { result } = renderHook(() => useGame());
    result.current.selectWord(2);
    expect(emit).toHaveBeenCalledWith('game:selectWord', { wordIndex: 2 });
  });

  it('sendGuess emits chat:message with text', () => {
    const { result } = renderHook(() => useGame());
    result.current.sendGuess('apple');
    expect(emit).toHaveBeenCalledWith('chat:message', { text: 'apple' });
  });

  it('leaveRoom emits room:leave and resets stores', () => {
    const { result } = renderHook(() => useGame());
    result.current.leaveRoom();
    expect(emit).toHaveBeenCalledWith('room:leave');
    expect(gameStoreReset).toHaveBeenCalled();
    expect(drawingStoreReset).toHaveBeenCalled();
    expect(playerState.setIsSpectator).toHaveBeenCalledWith(false);
  });

  it('updateSettings emits room:settings with partial', () => {
    const { result } = renderHook(() => useGame());
    result.current.updateSettings({ totalRounds: 5 } as any);
    expect(emit).toHaveBeenCalledWith('room:settings', { totalRounds: 5 });
  });

  it('spectateRoom emits room:spectate and marks player as spectator', () => {
    const { result } = renderHook(() => useGame());
    result.current.spectateRoom('ROOMX');
    expect(playerState.setIsSpectator).toHaveBeenCalledWith(true);
    expect(emit).toHaveBeenCalledWith('room:spectate', {
      roomId: 'ROOMX',
      nickname: 'Roma',
      avatar: 'adventurer:avatar1',
      persistentId: 'pid-1',
    });
  });

  it('rematchVote emits game:rematchVote', () => {
    const { result } = renderHook(() => useGame());
    result.current.rematchVote('accepted');
    expect(emit).toHaveBeenCalledWith('game:rematchVote', { vote: 'accepted' });
  });

  it('switchTeam emits team:switch with team', () => {
    const { result } = renderHook(() => useGame());
    result.current.switchTeam('A' as any);
    expect(emit).toHaveBeenCalledWith('team:switch', { team: 'A' });
  });

  it('kickPlayer emits room:kick with playerId', () => {
    const { result } = renderHook(() => useGame());
    result.current.kickPlayer('p99');
    expect(emit).toHaveBeenCalledWith('room:kick', { playerId: 'p99' });
  });

  it('addBot emits room:addBot', () => {
    const { result } = renderHook(() => useGame());
    result.current.addBot();
    expect(emit).toHaveBeenCalledWith('room:addBot');
  });
});
