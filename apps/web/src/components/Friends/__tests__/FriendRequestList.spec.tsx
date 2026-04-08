import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, userEvent } from '@/test/test-utils';
import FriendRequestList from '@/components/Friends/FriendRequestList';
import { useFriendStore } from '@/stores/friendStore';
import type { FriendRequest, FriendInfo } from '@doodledraw/shared';

vi.mock('@/utils/friendsApi', () => ({
  friendsApi: {
    respondToRequest: vi.fn(),
  },
}));

const { friendsApi } = await import('@/utils/friendsApi');

const makeFriend = (overrides: Partial<FriendInfo> = {}): FriendInfo => ({
  persistentId: 'p1',
  username: 'user1',
  nickname: 'User1',
  avatar: 'av1',
  isOnline: true,
  currentRoomId: null,
  ...overrides,
});

const makeRequest = (overrides: Partial<FriendRequest> = {}): FriendRequest => ({
  id: 'req-1',
  from: makeFriend({ persistentId: 'from-1', nickname: 'FromUser', username: 'fromuser' }),
  to: makeFriend({ persistentId: 'to-1', nickname: 'ToUser', username: 'touser' }),
  status: 'pending',
  createdAt: Date.now(),
  ...overrides,
});

describe('FriendRequestList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFriendStore.getState().reset();
  });

  it('shows no-requests message when empty', () => {
    render(<FriendRequestList />);
    expect(screen.getByText('friends.noRequests')).toBeInTheDocument();
  });

  it('renders incoming requests with accept/reject buttons', () => {
    useFriendStore.getState().setIncomingRequests([
      makeRequest({ id: 'inc-1', from: makeFriend({ nickname: 'Alice', username: 'alice' }) }),
    ]);

    render(<FriendRequestList />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('friends.accept')).toBeInTheDocument();
    expect(screen.getByText('friends.reject')).toBeInTheDocument();
  });

  it('renders outgoing requests with pending label', () => {
    useFriendStore.getState().setOutgoingRequests([
      makeRequest({ id: 'out-1', to: makeFriend({ nickname: 'Bob', username: 'bob' }) }),
    ]);

    render(<FriendRequestList />);

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('@bob')).toBeInTheDocument();
    expect(screen.getByText('friends.pending')).toBeInTheDocument();
  });

  it('accept button calls friendsApi.respondToRequest with accept', async () => {
    vi.mocked(friendsApi.respondToRequest).mockResolvedValue({ status: 'ok' });
    useFriendStore.getState().setIncomingRequests([makeRequest({ id: 'inc-1' })]);

    const user = userEvent.setup();
    render(<FriendRequestList />);

    await user.click(screen.getByText('friends.accept'));

    await waitFor(() => {
      expect(friendsApi.respondToRequest).toHaveBeenCalledWith('inc-1', 'accept');
    });
  });

  it('reject button calls friendsApi.respondToRequest with reject', async () => {
    vi.mocked(friendsApi.respondToRequest).mockResolvedValue({ status: 'ok' });
    useFriendStore.getState().setIncomingRequests([makeRequest({ id: 'inc-2' })]);

    const user = userEvent.setup();
    render(<FriendRequestList />);

    await user.click(screen.getByText('friends.reject'));

    await waitFor(() => {
      expect(friendsApi.respondToRequest).toHaveBeenCalledWith('inc-2', 'reject');
    });
  });
});
