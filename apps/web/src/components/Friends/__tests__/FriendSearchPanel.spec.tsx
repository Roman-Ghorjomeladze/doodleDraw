import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act, userEvent } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import FriendSearchPanel from '@/components/Friends/FriendSearchPanel';
import { useFriendStore } from '@/stores/friendStore';
import type { FriendSearchResult } from '@doodledraw/shared';

vi.mock('@/utils/friendsApi', () => ({
  friendsApi: {
    search: vi.fn(),
    sendRequest: vi.fn(),
  },
}));

// Must import after mock declaration
const { friendsApi } = await import('@/utils/friendsApi');

const makeSearchResult = (overrides: Partial<FriendSearchResult> = {}): FriendSearchResult => ({
  persistentId: 'u1',
  username: 'alice',
  nickname: 'Alice',
  avatar: 'av1',
  isFriend: false,
  hasPendingRequest: false,
  ...overrides,
});

describe('FriendSearchPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFriendStore.getState().reset();
  });

  it('renders search input', () => {
    render(<FriendSearchPanel />);
    expect(screen.getByPlaceholderText('friends.search')).toBeInTheDocument();
  });

  it('shows min chars message when query is 1 character', async () => {
    const user = userEvent.setup();
    render(<FriendSearchPanel />);

    await user.type(screen.getByPlaceholderText('friends.search'), 'a');
    expect(screen.getByText('friends.searchMinChars')).toBeInTheDocument();
  });

  it('debounces search (300ms) and calls friendsApi.search', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    vi.mocked(friendsApi.search).mockResolvedValue({ users: [] });

    render(<FriendSearchPanel />);

    // Use fireEvent instead of userEvent for fake timer compatibility
    const input = screen.getByPlaceholderText('friends.search');
    fireEvent.change(input, { target: { value: 'ali' } });

    // Should not have called search yet (debounce not elapsed)
    expect(friendsApi.search).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(friendsApi.search).toHaveBeenCalledWith('ali', expect.any(AbortSignal));

    vi.useRealTimers();
  });

  it('shows results from store (nickname, username)', () => {
    render(<FriendSearchPanel />);

    // Update store after render so the component re-renders with results
    act(() => {
      useFriendStore.getState().setSearchResults([
        makeSearchResult({ persistentId: 'u1', nickname: 'Alice', username: 'alice_w' }),
        makeSearchResult({ persistentId: 'u2', nickname: 'Bob', username: 'bob_x' }),
      ]);
    });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('@alice_w')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('@bob_x')).toBeInTheDocument();
  });

  it('shows "Add Friend" button for non-friends', () => {
    render(<FriendSearchPanel />);

    act(() => {
      useFriendStore.getState().setSearchResults([
        makeSearchResult({ isFriend: false, hasPendingRequest: false }),
      ]);
    });

    expect(screen.getByText('friends.addFriend')).toBeInTheDocument();
  });

  it('shows "Pending" for users with hasPendingRequest', () => {
    render(<FriendSearchPanel />);

    act(() => {
      useFriendStore.getState().setSearchResults([
        makeSearchResult({ hasPendingRequest: true }),
      ]);
    });

    expect(screen.getByText('friends.pending')).toBeInTheDocument();
  });

  it('shows "Already Friends" for friends', () => {
    render(<FriendSearchPanel />);

    act(() => {
      useFriendStore.getState().setSearchResults([
        makeSearchResult({ isFriend: true }),
      ]);
    });

    expect(screen.getByText('friends.alreadyFriends')).toBeInTheDocument();
  });

  it('clicking Add Friend calls friendsApi.sendRequest', async () => {
    vi.mocked(friendsApi.sendRequest).mockResolvedValue({ request: {} as any, autoAccepted: false });
    vi.mocked(friendsApi.search).mockResolvedValue({ users: [] });

    const user = userEvent.setup();
    render(<FriendSearchPanel />);

    act(() => {
      useFriendStore.getState().setSearchResults([
        makeSearchResult({ persistentId: 'target-1', isFriend: false, hasPendingRequest: false }),
      ]);
    });

    await user.click(screen.getByText('friends.addFriend'));

    await waitFor(() => {
      expect(friendsApi.sendRequest).toHaveBeenCalledWith('target-1');
    });
  });
});
