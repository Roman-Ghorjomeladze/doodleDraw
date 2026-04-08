import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act, userEvent } from '@/test/test-utils';
import ProfileModal from '@/components/Profile/ProfileModal';
import { useFriendStore } from '@/stores/friendStore';
import { createMockSocket } from '@/test/mocks/socket';
import type { FriendInfo, FriendRequest, PlayerProfile } from '@doodledraw/shared';

const mockSocket = createMockSocket();
let profileDataCallback: ((data: { profile: PlayerProfile }) => void) | null = null;

// Capture the 'profile:data' listener when `on` is called
mockSocket.on.mockImplementation((event: string, cb: any) => {
  if (event === 'profile:data') {
    profileDataCallback = cb;
  }
  return vi.fn(); // unsub
});

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => mockSocket,
}));

vi.mock('@/utils/friendsApi', () => ({
  friendsApi: {
    sendRequest: vi.fn(),
  },
}));

const { friendsApi } = await import('@/utils/friendsApi');

// Mock authStore with configurable state
let authState: Record<string, unknown> = {
  isAuthenticated: true,
  user: { persistentId: 'my-pid' },
};

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: (s: any) => any) => (selector ? selector(authState) : authState),
}));

const makeFriend = (overrides: Partial<FriendInfo> = {}): FriendInfo => ({
  persistentId: 'friend-1',
  username: 'alice',
  nickname: 'Alice',
  avatar: 'av1',
  isOnline: true,
  currentRoomId: null,
  ...overrides,
});

const makeRequest = (overrides: Partial<FriendRequest> = {}): FriendRequest => ({
  id: 'req-1',
  from: makeFriend({ persistentId: 'from-1' }),
  to: makeFriend({ persistentId: 'to-1' }),
  status: 'pending',
  createdAt: Date.now(),
  ...overrides,
});

const mockProfile: PlayerProfile = {
  persistentId: 'target-1',
  nickname: 'TargetUser',
  avatar: 'av-target',
  totalGames: 10,
  totalWins: 5,
  totalScore: 100,
  eloRating: 1300,
  correctGuesses: 20,
  totalDrawings: 15,
  favoriteWord: 'cat',
  isRegistered: true,
};

function renderAndLoad(persistentId: string | null = 'target-1') {
  const onClose = vi.fn();
  const result = render(<ProfileModal persistentId={persistentId} onClose={onClose} />);

  // Simulate profile data arriving from socket
  if (persistentId && profileDataCallback) {
    act(() => {
      profileDataCallback!({ profile: mockProfile });
    });
  }

  return { ...result, onClose };
}

describe('ProfileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFriendStore.getState().reset();
    profileDataCallback = null;
    authState = { isAuthenticated: true, user: { persistentId: 'my-pid' } };
    // Re-setup the on mock
    mockSocket.on.mockImplementation((event: string, cb: any) => {
      if (event === 'profile:data') {
        profileDataCallback = cb;
      }
      return vi.fn();
    });
  });

  it('shows "Add Friend" button when not friends and authenticated', async () => {
    renderAndLoad('target-1');

    await waitFor(() => {
      expect(screen.getByText('friends.addFriend')).toBeInTheDocument();
    });
  });

  it('shows "Already Friends" when friend is in friends list', async () => {
    useFriendStore.getState().setFriends([
      makeFriend({ persistentId: 'target-1' }),
    ]);

    renderAndLoad('target-1');

    await waitFor(() => {
      expect(screen.getByText('friends.alreadyFriends')).toBeInTheDocument();
    });
  });

  it('shows "Pending" when there is a pending outgoing request', async () => {
    useFriendStore.getState().setOutgoingRequests([
      makeRequest({ id: 'r1', to: makeFriend({ persistentId: 'target-1' }) }),
    ]);

    renderAndLoad('target-1');

    await waitFor(() => {
      expect(screen.getByText('friends.pending')).toBeInTheDocument();
    });
  });

  it('shows "Pending" when there is a pending incoming request', async () => {
    useFriendStore.getState().setIncomingRequests([
      makeRequest({ id: 'r2', from: makeFriend({ persistentId: 'target-1' }) }),
    ]);

    renderAndLoad('target-1');

    await waitFor(() => {
      expect(screen.getByText('friends.pending')).toBeInTheDocument();
    });
  });

  it('does not show friend action for own profile', async () => {
    renderAndLoad('my-pid');

    await waitFor(() => {
      expect(screen.getByText('TargetUser')).toBeInTheDocument();
    });

    expect(screen.queryByText('friends.addFriend')).not.toBeInTheDocument();
    expect(screen.queryByText('friends.alreadyFriends')).not.toBeInTheDocument();
  });

  it('clicking "Add Friend" calls friendsApi.sendRequest', async () => {
    vi.mocked(friendsApi.sendRequest).mockResolvedValue({ request: {} as any, autoAccepted: false });

    const user = userEvent.setup();
    renderAndLoad('target-1');

    await waitFor(() => {
      expect(screen.getByText('friends.addFriend')).toBeInTheDocument();
    });

    await user.click(screen.getByText('friends.addFriend'));

    await waitFor(() => {
      expect(friendsApi.sendRequest).toHaveBeenCalledWith('target-1');
    });
  });

  it('does not show friend action when not authenticated', async () => {
    authState = { isAuthenticated: false, user: null };

    renderAndLoad('target-1');

    await waitFor(() => {
      expect(screen.getByText('TargetUser')).toBeInTheDocument();
    });

    expect(screen.queryByText('friends.addFriend')).not.toBeInTheDocument();
  });
});
