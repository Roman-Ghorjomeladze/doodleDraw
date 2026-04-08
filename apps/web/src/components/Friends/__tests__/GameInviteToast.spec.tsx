import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act, userEvent } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import GameInviteToast from '@/components/Friends/GameInviteToast';
import { useFriendStore } from '@/stores/friendStore';
import { createMockSocket } from '@/test/mocks/socket';
import type { GameInvite } from '@doodledraw/shared';

const mockSocket = createMockSocket();

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => mockSocket,
}));

vi.mock('@/stores/gameStore', () => {
  const state: Record<string, unknown> = { roomId: null };
  return {
    useGameStore: Object.assign(
      (selector?: (s: any) => any) => (selector ? selector(state) : state),
      {
        getState: () => ({
          reset: vi.fn(),
        }),
      },
    ),
  };
});

vi.mock('@/stores/drawingStore', () => ({
  useDrawingStore: {
    getState: () => ({
      reset: vi.fn(),
    }),
  },
}));

vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: {
    getState: () => ({
      setIsSpectator: vi.fn(),
      nickname: 'Me',
      avatar: 'my-av',
      persistentId: 'my-pid',
    }),
  },
}));

const makeInvite = (overrides: Partial<GameInvite> = {}): GameInvite => ({
  id: 'inv-1',
  fromPersistentId: 'p-1',
  fromNickname: 'Bob',
  fromAvatar: 'av2',
  roomId: 'room-1',
  mode: 'classic',
  timestamp: Date.now(),
  ...overrides,
});

describe('GameInviteToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFriendStore.getState().reset();
  });

  it('renders nothing when no invites', () => {
    const { container } = render(<GameInviteToast />);
    // Should have the container div but no invite cards
    expect(screen.queryByText('friends.accept')).not.toBeInTheDocument();
  });

  it('renders invite with sender info', () => {
    useFriendStore.getState().addGameInvite(makeInvite({ fromNickname: 'Bob' }));
    render(<GameInviteToast />);

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('friends.accept')).toBeInTheDocument();
    expect(screen.getByText('friends.decline')).toBeInTheDocument();
  });

  it('decline removes invite from store', async () => {
    useFriendStore.getState().addGameInvite(makeInvite({ id: 'inv-1' }));
    const user = userEvent.setup();

    render(<GameInviteToast />);
    await user.click(screen.getByText('friends.decline'));

    expect(useFriendStore.getState().gameInvites).toHaveLength(0);
  });

  it('accept removes invite from store and emits room:join', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    useFriendStore.getState().addGameInvite(makeInvite({ id: 'inv-1', roomId: 'room-abc' }));

    render(<GameInviteToast />);

    // Use fireEvent for fake timer compatibility
    fireEvent.click(screen.getByText('friends.accept'));

    // Invite removed immediately
    expect(useFriendStore.getState().gameInvites).toHaveLength(0);

    // room:join emitted after 100ms delay
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('room:join', expect.objectContaining({
      roomId: 'room-abc',
    }));

    vi.useRealTimers();
  });
});
