import { describe, it, expect, beforeEach } from 'vitest';
import { useFriendStore } from '@/stores/friendStore';
import type { FriendInfo, FriendRequest, GameInvite, FriendSearchResult } from '@doodledraw/shared';

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

describe('friendStore', () => {
  beforeEach(() => {
    useFriendStore.getState().reset();
  });

  // --- setFriends ---
  it('setFriends replaces the friends list', () => {
    const friends = [makeFriend(), makeFriend({ persistentId: 'friend-2', nickname: 'Bob' })];
    useFriendStore.getState().setFriends(friends);
    expect(useFriendStore.getState().friends).toEqual(friends);
  });

  // --- updateFriendStatus ---
  it('updateFriendStatus updates online status and room for matching friend', () => {
    useFriendStore.getState().setFriends([makeFriend({ persistentId: 'f1', isOnline: false, currentRoomId: null })]);
    useFriendStore.getState().updateFriendStatus('f1', true, 'room-x');
    const f = useFriendStore.getState().friends[0];
    expect(f.isOnline).toBe(true);
    expect(f.currentRoomId).toBe('room-x');
  });

  it('updateFriendStatus does not touch non-matching friends', () => {
    useFriendStore.getState().setFriends([makeFriend({ persistentId: 'f1' }), makeFriend({ persistentId: 'f2', isOnline: false })]);
    useFriendStore.getState().updateFriendStatus('f1', false, null);
    expect(useFriendStore.getState().friends[1].isOnline).toBe(false);
  });

  // --- removeFriend ---
  it('removeFriend removes the friend by persistentId', () => {
    useFriendStore.getState().setFriends([makeFriend({ persistentId: 'a' }), makeFriend({ persistentId: 'b' })]);
    useFriendStore.getState().removeFriend('a');
    expect(useFriendStore.getState().friends).toHaveLength(1);
    expect(useFriendStore.getState().friends[0].persistentId).toBe('b');
  });

  // --- setIncomingRequests ---
  it('setIncomingRequests sets the incoming requests list', () => {
    const reqs = [makeRequest({ id: 'r1' }), makeRequest({ id: 'r2' })];
    useFriendStore.getState().setIncomingRequests(reqs);
    expect(useFriendStore.getState().incomingRequests).toEqual(reqs);
  });

  // --- setOutgoingRequests ---
  it('setOutgoingRequests sets the outgoing requests list', () => {
    const reqs = [makeRequest({ id: 'r3' })];
    useFriendStore.getState().setOutgoingRequests(reqs);
    expect(useFriendStore.getState().outgoingRequests).toEqual(reqs);
  });

  // --- addIncomingRequest ---
  it('addIncomingRequest appends to incoming requests', () => {
    useFriendStore.getState().setIncomingRequests([makeRequest({ id: 'r1' })]);
    useFriendStore.getState().addIncomingRequest(makeRequest({ id: 'r2' }));
    expect(useFriendStore.getState().incomingRequests).toHaveLength(2);
    expect(useFriendStore.getState().incomingRequests[1].id).toBe('r2');
  });

  // --- addOutgoingRequest ---
  it('addOutgoingRequest appends to outgoing requests', () => {
    useFriendStore.getState().addOutgoingRequest(makeRequest({ id: 'o1' }));
    expect(useFriendStore.getState().outgoingRequests).toHaveLength(1);
    expect(useFriendStore.getState().outgoingRequests[0].id).toBe('o1');
  });

  // --- removeRequest ---
  it('removeRequest removes from both incoming and outgoing', () => {
    useFriendStore.getState().setIncomingRequests([makeRequest({ id: 'shared' })]);
    useFriendStore.getState().setOutgoingRequests([makeRequest({ id: 'shared' }), makeRequest({ id: 'keep' })]);
    useFriendStore.getState().removeRequest('shared');
    expect(useFriendStore.getState().incomingRequests).toHaveLength(0);
    expect(useFriendStore.getState().outgoingRequests).toHaveLength(1);
    expect(useFriendStore.getState().outgoingRequests[0].id).toBe('keep');
  });

  // --- setSearchResults ---
  it('setSearchResults replaces search results', () => {
    const results: FriendSearchResult[] = [
      { persistentId: 'u1', username: 'usr1', nickname: 'User1', avatar: 'a1', isFriend: false, hasPendingRequest: false },
    ];
    useFriendStore.getState().setSearchResults(results);
    expect(useFriendStore.getState().searchResults).toEqual(results);
  });

  // --- addGameInvite ---
  it('addGameInvite appends to game invites', () => {
    useFriendStore.getState().addGameInvite(makeInvite({ id: 'i1' }));
    useFriendStore.getState().addGameInvite(makeInvite({ id: 'i2' }));
    expect(useFriendStore.getState().gameInvites).toHaveLength(2);
  });

  // --- removeGameInvite ---
  it('removeGameInvite removes by id', () => {
    useFriendStore.getState().addGameInvite(makeInvite({ id: 'i1' }));
    useFriendStore.getState().addGameInvite(makeInvite({ id: 'i2' }));
    useFriendStore.getState().removeGameInvite('i1');
    expect(useFriendStore.getState().gameInvites).toHaveLength(1);
    expect(useFriendStore.getState().gameInvites[0].id).toBe('i2');
  });

  // --- setSidebarOpen ---
  it('setSidebarOpen toggles sidebar state', () => {
    expect(useFriendStore.getState().sidebarOpen).toBe(false);
    useFriendStore.getState().setSidebarOpen(true);
    expect(useFriendStore.getState().sidebarOpen).toBe(true);
    useFriendStore.getState().setSidebarOpen(false);
    expect(useFriendStore.getState().sidebarOpen).toBe(false);
  });

  // --- reset ---
  it('reset returns store to initial state', () => {
    useFriendStore.getState().setFriends([makeFriend()]);
    useFriendStore.getState().addGameInvite(makeInvite());
    useFriendStore.getState().setSidebarOpen(true);
    useFriendStore.getState().reset();

    const state = useFriendStore.getState();
    expect(state.friends).toEqual([]);
    expect(state.incomingRequests).toEqual([]);
    expect(state.outgoingRequests).toEqual([]);
    expect(state.gameInvites).toEqual([]);
    expect(state.searchResults).toEqual([]);
    expect(state.sidebarOpen).toBe(false);
  });
});
