import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act, userEvent } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import InviteFriendsModal from '@/components/Friends/InviteFriendsModal';
import { useFriendStore } from '@/stores/friendStore';
import { createMockSocket } from '@/test/mocks/socket';
import type { FriendInfo } from '@doodledraw/shared';

const mockSocket = createMockSocket();

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => mockSocket,
}));

vi.mock('@/stores/gameStore', () => {
  const state: Record<string, unknown> = { roomId: 'room-1' };
  return {
    useGameStore: (selector?: (s: any) => any) => (selector ? selector(state) : state),
  };
});

const makeFriend = (overrides: Partial<FriendInfo> = {}): FriendInfo => ({
  persistentId: 'f-1',
  username: 'user1',
  nickname: 'User1',
  avatar: 'av1',
  isOnline: true,
  currentRoomId: null,
  ...overrides,
});

describe('InviteFriendsModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useFriendStore.getState().reset();
  });

  it('shows only online friends not in same room', () => {
    useFriendStore.getState().setFriends([
      makeFriend({ persistentId: 'f1', nickname: 'Online', isOnline: true, currentRoomId: null }),
      makeFriend({ persistentId: 'f2', nickname: 'Offline', isOnline: false, currentRoomId: null }),
      makeFriend({ persistentId: 'f3', nickname: 'SameRoom', isOnline: true, currentRoomId: 'room-1' }),
    ]);

    render(<InviteFriendsModal onClose={onClose} />);

    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.queryByText('Offline')).not.toBeInTheDocument();
    expect(screen.queryByText('SameRoom')).not.toBeInTheDocument();
  });

  it('caps at 5 without search', () => {
    const friends = Array.from({ length: 8 }, (_, i) =>
      makeFriend({ persistentId: `f-${i}`, nickname: `Friend${i}`, username: `user${i}` }),
    );
    useFriendStore.getState().setFriends(friends);

    render(<InviteFriendsModal onClose={onClose} />);

    // Should show max 5 friends
    const inviteButtons = screen.getAllByText('friends.invite');
    expect(inviteButtons).toHaveLength(5);

    // Should show "search to see more" message
    expect(screen.getByText('friends.searchToSeeMore')).toBeInTheDocument();
  });

  it('search filters by nickname', () => {
    useFriendStore.getState().setFriends([
      makeFriend({ persistentId: 'f1', nickname: 'Alice', username: 'alice' }),
      makeFriend({ persistentId: 'f2', nickname: 'Bob', username: 'bob' }),
      makeFriend({ persistentId: 'f3', nickname: 'Charlie', username: 'charlie' }),
    ]);

    render(<InviteFriendsModal onClose={onClose} />);

    // Use fireEvent.change for immediate state update without async complexity
    fireEvent.change(screen.getByPlaceholderText('friends.search'), { target: { value: 'Ali' } });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
  });

  it('invite button emits event and shows "Invited"', async () => {
    useFriendStore.getState().setFriends([
      makeFriend({ persistentId: 'f1', nickname: 'Alice' }),
    ]);

    const user = userEvent.setup();
    render(<InviteFriendsModal onClose={onClose} />);

    await user.click(screen.getByText('friends.invite'));

    expect(mockSocket.emit).toHaveBeenCalledWith('friends:inviteToGame', {
      friendPersistentId: 'f1',
      roomId: 'room-1',
    });

    expect(screen.getByText('friends.invited')).toBeInTheDocument();
    expect(screen.queryByText('friends.invite')).not.toBeInTheDocument();
  });

  it('shows no-online-friends message when none are online', () => {
    useFriendStore.getState().setFriends([
      makeFriend({ persistentId: 'f1', isOnline: false }),
    ]);

    render(<InviteFriendsModal onClose={onClose} />);
    expect(screen.getByText('friends.noOnlineFriends')).toBeInTheDocument();
  });
});
