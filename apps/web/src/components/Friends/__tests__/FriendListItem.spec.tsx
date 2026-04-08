import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, userEvent } from '@/test/test-utils';
import FriendListItem from '@/components/Friends/FriendListItem';
import { createMockSocket } from '@/test/mocks/socket';
import type { FriendInfo } from '@doodledraw/shared';

const mockSocket = createMockSocket();

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => mockSocket,
}));

vi.mock('@/stores/gameStore', () => {
  const mockState: Record<string, unknown> = { roomId: null, phase: 'lobby' };
  return {
    useGameStore: (selector?: (s: any) => any) => (selector ? selector(mockState) : mockState),
    __setMockState: (newState: Record<string, unknown>) => Object.assign(mockState, newState),
  };
});

const { __setMockState: setGameState } = await import('@/stores/gameStore') as any;

const makeFriend = (overrides: Partial<FriendInfo> = {}): FriendInfo => ({
  persistentId: 'friend-1',
  username: 'alice',
  nickname: 'Alice',
  avatar: 'av1',
  isOnline: true,
  currentRoomId: null,
  ...overrides,
});

describe('FriendListItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setGameState({ roomId: null, phase: 'lobby' });
  });

  it('renders friend nickname and username', () => {
    render(<FriendListItem friend={makeFriend({ nickname: 'Alice', username: 'alice_w' })} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('@alice_w')).toBeInTheDocument();
  });

  it('shows green online indicator when friend.isOnline is true', () => {
    const { container } = render(<FriendListItem friend={makeFriend({ isOnline: true })} />);
    const indicator = container.querySelector('.bg-success-500');
    expect(indicator).toBeInTheDocument();
  });

  it('shows grey indicator when friend is offline', () => {
    const { container } = render(<FriendListItem friend={makeFriend({ isOnline: false })} />);
    const indicator = container.querySelector('.bg-surface-400');
    expect(indicator).toBeInTheDocument();
  });

  it('shows invite button when in lobby, friend online, and not in same room', () => {
    setGameState({ roomId: 'room-1', phase: 'lobby' });
    render(<FriendListItem friend={makeFriend({ isOnline: true, currentRoomId: null })} />);
    expect(screen.getByText('friends.invite')).toBeInTheDocument();
  });

  it('hides invite button when not in a room', () => {
    setGameState({ roomId: null, phase: 'lobby' });
    render(<FriendListItem friend={makeFriend({ isOnline: true })} />);
    expect(screen.queryByText('friends.invite')).not.toBeInTheDocument();
  });

  it('hides invite button when friend is in the same room', () => {
    setGameState({ roomId: 'room-1', phase: 'lobby' });
    render(<FriendListItem friend={makeFriend({ isOnline: true, currentRoomId: 'room-1' })} />);
    expect(screen.queryByText('friends.invite')).not.toBeInTheDocument();
  });

  it('clicking invite calls emit with friends:inviteToGame', async () => {
    setGameState({ roomId: 'room-1', phase: 'lobby' });
    const user = userEvent.setup();

    render(<FriendListItem friend={makeFriend({ persistentId: 'f1', isOnline: true, currentRoomId: null })} />);
    await user.click(screen.getByText('friends.invite'));

    expect(mockSocket.emit).toHaveBeenCalledWith('friends:inviteToGame', {
      friendPersistentId: 'f1',
      roomId: 'room-1',
    });
  });

  it('shows "In Game" when friend has currentRoomId and is online', () => {
    render(<FriendListItem friend={makeFriend({ isOnline: true, currentRoomId: 'room-x' })} />);
    // The middot entity is rendered alongside the text, so use a flexible matcher
    expect(screen.getByText((content) => content.includes('friends.inGame'))).toBeInTheDocument();
  });

  it('does not show "In Game" when friend is offline', () => {
    render(<FriendListItem friend={makeFriend({ isOnline: false, currentRoomId: 'room-x' })} />);
    expect(screen.queryByText((content) => content.includes('friends.inGame'))).not.toBeInTheDocument();
  });
});
