import { renderHook, act } from '@testing-library/react';

const confettiMock = vi.fn();
vi.mock('canvas-confetti', () => ({
  default: (...args: any[]) => confettiMock(...args),
}));

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

const playerStoreState: any = { playerId: 'p1' };
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: Object.assign(
    (selector?: (s: any) => any) => (selector ? selector(playerStoreState) : playerStoreState),
    { getState: () => playerStoreState, setState: vi.fn() },
  ),
}));

const gameStoreState: any = { mode: 'classic' };
vi.mock('@/stores/gameStore', () => ({
  useGameStore: Object.assign(
    (selector?: (s: any) => any) => (selector ? selector(gameStoreState) : gameStoreState),
    { getState: () => gameStoreState, setState: vi.fn() },
  ),
}));

import { useConfetti } from '@/hooks/useConfetti';

function trigger(event: string, payload?: any) {
  const handler = listeners.get(event);
  if (!handler) throw new Error(`No listener for ${event}`);
  act(() => {
    handler(payload);
  });
}

describe('useConfetti', () => {
  beforeEach(() => {
    listeners.clear();
    confettiMock.mockClear();
    playerStoreState.playerId = 'p1';
    gameStoreState.mode = 'classic';
    vi.useFakeTimers();
    // Stub requestAnimationFrame so we don't run forever.
    vi.stubGlobal('requestAnimationFrame', () => 0 as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('personal correct guess triggers small confetti burst', () => {
    renderHook(() => useConfetti());
    trigger('chat:correctGuess', { playerId: 'p1' });

    // Confetti is fired after a 400ms delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(confettiMock).toHaveBeenCalled();
    const call = confettiMock.mock.calls[0][0];
    expect(call.particleCount).toBe(60);
  });

  it('does not trigger confetti when someone else guesses', () => {
    renderHook(() => useConfetti());
    trigger('chat:correctGuess', { playerId: 'p2' });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(confettiMock).not.toHaveBeenCalled();
  });

  it('game:end with self as winner triggers full gold confetti', () => {
    gameStoreState.mode = 'classic';
    renderHook(() => useConfetti());
    trigger('game:end', {
      finalScores: [
        { playerId: 'p1', score: 200 },
        { playerId: 'p2', score: 100 },
      ],
    });
    expect(confettiMock).toHaveBeenCalled();
    // Gold colors should be present in at least one call.
    const usedGold = confettiMock.mock.calls.some((c) =>
      Array.isArray(c[0]?.colors) && c[0].colors.includes('#FFD700'),
    );
    expect(usedGold).toBe(true);
  });

  it('game:end with non-self winner does NOT trigger confetti (classic)', () => {
    gameStoreState.mode = 'classic';
    renderHook(() => useConfetti());
    trigger('game:end', {
      finalScores: [
        { playerId: 'p2', score: 200 },
        { playerId: 'p1', score: 100 },
      ],
    });
    expect(confettiMock).not.toHaveBeenCalled();
  });

  it('team mode: triggers confetti when current player is on winning team', () => {
    gameStoreState.mode = 'team';
    renderHook(() => useConfetti());
    trigger('game:end', {
      finalScores: [
        { playerId: 'p1', score: 50, team: 'A' },
        { playerId: 'p2', score: 50, team: 'B' },
      ],
      winner: 'A',
    });
    expect(confettiMock).toHaveBeenCalled();
  });
});
