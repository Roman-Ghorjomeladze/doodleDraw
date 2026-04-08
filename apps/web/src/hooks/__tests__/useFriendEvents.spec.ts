import { renderHook, act } from '@testing-library/react';
import { useFriendStore } from '@/stores/friendStore';
import type { FriendInfo } from '@doodledraw/shared';

// Must use inline factory for vi.mock hoisting
vi.mock('@/utils/friendsApi', () => ({
  friendsApi: {
    list: vi.fn().mockResolvedValue({ friends: [] }),
    pendingRequests: vi.fn().mockResolvedValue({ incoming: [], outgoing: [] }),
    search: vi.fn(),
    sendRequest: vi.fn(),
    respondToRequest: vi.fn(),
    removeFriend: vi.fn(),
  },
}));

const listeners = new Map<string, Function>();
vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({
    emit: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      listeners.set(event, handler);
      return vi.fn();
    }),
    connected: true,
    socketVersion: 0,
    reconnecting: false,
    reconnectAttempt: 0,
    reconnectFailed: false,
    manualReconnect: vi.fn(),
    socket: { current: {} },
  }),
}));

let mockAuthenticated = true;
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: (s: any) => any) => {
    const state = { isAuthenticated: mockAuthenticated, user: { persistentId: 'me' }, token: 'tok' };
    return selector ? selector(state) : state;
  },
}));

import { useFriendEvents } from '@/hooks/useFriendEvents';
import { friendsApi } from '@/utils/friendsApi';

describe('useFriendEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
    useFriendStore.getState().reset();
    mockAuthenticated = true;
  });

  it('loads friends and pending requests on mount when authenticated', async () => {
    const friends: FriendInfo[] = [
      { persistentId: 'f1', username: 'alice', nickname: 'Alice', avatar: 'a', isOnline: true, currentRoomId: null },
    ];
    vi.mocked(friendsApi.list).mockResolvedValueOnce({ friends });
    vi.mocked(friendsApi.pendingRequests).mockResolvedValueOnce({ incoming: [], outgoing: [] });

    renderHook(() => useFriendEvents());

    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });

    expect(friendsApi.list).toHaveBeenCalled();
    expect(friendsApi.pendingRequests).toHaveBeenCalled();
    expect(useFriendStore.getState().friends).toEqual(friends);
  });

  it('resets store when not authenticated', () => {
    mockAuthenticated = false;
    useFriendStore.getState().setFriends([
      { persistentId: 'f1', username: 'a', nickname: 'A', avatar: 'a', isOnline: true, currentRoomId: null },
    ]);

    renderHook(() => useFriendEvents());

    expect(useFriendStore.getState().friends).toEqual([]);
  });

  it('registers socket listeners for real-time events', () => {
    renderHook(() => useFriendEvents());

    expect(listeners.has('friends:list')).toBe(true);
    expect(listeners.has('friends:statusChanged')).toBe(true);
    expect(listeners.has('friends:requestReceived')).toBe(true);
    expect(listeners.has('friends:requestUpdated')).toBe(true);
    expect(listeners.has('friends:removed')).toBe(true);
    expect(listeners.has('friends:gameInvite')).toBe(true);
    expect(listeners.has('friends:inviteExpired')).toBe(true);
  });

  it('handles friends:statusChanged event', () => {
    useFriendStore.getState().setFriends([
      { persistentId: 'f1', username: 'a', nickname: 'A', avatar: 'a', isOnline: false, currentRoomId: null },
    ]);

    renderHook(() => useFriendEvents());

    act(() => listeners.get('friends:statusChanged')!({ persistentId: 'f1', isOnline: true, currentRoomId: 'room1' }));

    const friend = useFriendStore.getState().friends[0];
    expect(friend.isOnline).toBe(true);
    expect(friend.currentRoomId).toBe('room1');
  });

  it('handles friends:requestReceived event', () => {
    renderHook(() => useFriendEvents());

    const request = { id: 'r1', from: {} as any, to: {} as any, status: 'pending' as const, createdAt: Date.now() };
    act(() => listeners.get('friends:requestReceived')!({ request }));

    expect(useFriendStore.getState().incomingRequests).toHaveLength(1);
  });

  it('handles friends:removed event', () => {
    useFriendStore.getState().setFriends([
      { persistentId: 'f1', username: 'a', nickname: 'A', avatar: 'a', isOnline: true, currentRoomId: null },
    ]);

    renderHook(() => useFriendEvents());

    act(() => listeners.get('friends:removed')!({ friendPersistentId: 'f1' }));

    expect(useFriendStore.getState().friends).toHaveLength(0);
  });

  it('handles friends:gameInvite event', () => {
    renderHook(() => useFriendEvents());

    const invite = { id: 'inv1', fromPersistentId: 'f1', fromNickname: 'A', fromAvatar: 'a', roomId: 'r1', mode: 'classic' as const, timestamp: Date.now() };
    act(() => listeners.get('friends:gameInvite')!({ invite }));

    expect(useFriendStore.getState().gameInvites).toHaveLength(1);
  });
});
