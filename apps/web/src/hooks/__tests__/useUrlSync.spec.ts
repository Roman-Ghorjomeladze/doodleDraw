import { renderHook, act } from '@testing-library/react';

const subscribers = new Set<(state: any) => void>();
const gameStoreState: any = {
  roomId: null,
  setPendingRoomId: vi.fn((id: string | null) => { gameStoreState.pendingRoomId = id; }),
  reset: vi.fn(() => { gameStoreState.roomId = null; }),
  pendingRoomId: null,
};

function notify() {
  subscribers.forEach((cb) => cb(gameStoreState));
}

vi.mock('@/stores/gameStore', () => ({
  useGameStore: Object.assign(
    (selector?: (s: any) => any) => (selector ? selector(gameStoreState) : gameStoreState),
    {
      getState: () => gameStoreState,
      setState: vi.fn(),
      subscribe: (cb: (state: any) => void) => {
        subscribers.add(cb);
        return () => subscribers.delete(cb);
      },
    },
  ),
}));

import { useUrlSync } from '@/hooks/useUrlSync';

function setLocation(pathname: string) {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, pathname },
  });
}

describe('useUrlSync', () => {
  let pushStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    subscribers.clear();
    gameStoreState.roomId = null;
    gameStoreState.pendingRoomId = null;
    (gameStoreState.setPendingRoomId as any).mockClear();
    (gameStoreState.reset as any).mockClear();
    setLocation('/');
    pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
  });

  afterEach(() => {
    pushStateSpy.mockRestore();
  });

  it('parses /game/ABCD from URL and sets pendingRoomId on mount', () => {
    setLocation('/game/ABCD');
    renderHook(() => useUrlSync());
    expect(gameStoreState.setPendingRoomId).toHaveBeenCalledWith('ABCD');
  });

  it('does not set pendingRoomId when already in a room', () => {
    setLocation('/game/ABCD');
    gameStoreState.roomId = 'EXISTING';
    renderHook(() => useUrlSync());
    expect(gameStoreState.setPendingRoomId).not.toHaveBeenCalled();
  });

  it('updates URL via pushState when roomId changes from null to a value', () => {
    renderHook(() => useUrlSync());
    act(() => {
      gameStoreState.roomId = 'ROOM1';
      notify();
    });
    expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/game/ROOM1');
  });

  it('navigates back to / when roomId is cleared', () => {
    gameStoreState.roomId = 'ROOM1';
    setLocation('/game/ROOM1');
    renderHook(() => useUrlSync());
    act(() => {
      gameStoreState.roomId = null;
      notify();
    });
    expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/');
  });

  it('popstate from game URL to / while in a room calls reset', () => {
    gameStoreState.roomId = 'ROOM1';
    renderHook(() => useUrlSync());
    setLocation('/');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(gameStoreState.reset).toHaveBeenCalled();
  });

  it('popstate to /game/XYZW when not in a room sets pendingRoomId', () => {
    renderHook(() => useUrlSync());
    setLocation('/game/XYZW');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(gameStoreState.setPendingRoomId).toHaveBeenCalledWith('XYZW');
  });
});
