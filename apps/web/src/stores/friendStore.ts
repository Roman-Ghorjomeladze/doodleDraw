import { create } from 'zustand';
import type { FriendInfo, FriendRequest, GameInvite, FriendSearchResult } from '@doodledraw/shared';

interface FriendState {
  friends: FriendInfo[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  gameInvites: GameInvite[];
  searchResults: FriendSearchResult[];
  sidebarOpen: boolean;
}

interface FriendActions {
  setFriends: (friends: FriendInfo[]) => void;
  updateFriendStatus: (persistentId: string, isOnline: boolean, currentRoomId: string | null) => void;
  removeFriend: (persistentId: string) => void;
  setIncomingRequests: (requests: FriendRequest[]) => void;
  setOutgoingRequests: (requests: FriendRequest[]) => void;
  addIncomingRequest: (request: FriendRequest) => void;
  addOutgoingRequest: (request: FriendRequest) => void;
  removeRequest: (requestId: string) => void;
  setSearchResults: (results: FriendSearchResult[]) => void;
  addGameInvite: (invite: GameInvite) => void;
  removeGameInvite: (inviteId: string) => void;
  setSidebarOpen: (open: boolean) => void;
  reset: () => void;
}

const initialState: FriendState = {
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  gameInvites: [],
  searchResults: [],
  sidebarOpen: false,
};

export const useFriendStore = create<FriendState & FriendActions>()((set) => ({
  ...initialState,

  setFriends: (friends) => set({ friends }),

  updateFriendStatus: (persistentId, isOnline, currentRoomId) =>
    set((state) => ({
      friends: state.friends.map((f) =>
        f.persistentId === persistentId ? { ...f, isOnline, currentRoomId } : f,
      ),
    })),

  removeFriend: (persistentId) =>
    set((state) => ({
      friends: state.friends.filter((f) => f.persistentId !== persistentId),
    })),

  setIncomingRequests: (requests) => set({ incomingRequests: requests }),
  setOutgoingRequests: (requests) => set({ outgoingRequests: requests }),

  addIncomingRequest: (request) =>
    set((state) => ({
      incomingRequests: [...state.incomingRequests, request],
    })),

  addOutgoingRequest: (request) =>
    set((state) => ({
      outgoingRequests: [...state.outgoingRequests, request],
    })),

  removeRequest: (requestId) =>
    set((state) => ({
      incomingRequests: state.incomingRequests.filter((r) => r.id !== requestId),
      outgoingRequests: state.outgoingRequests.filter((r) => r.id !== requestId),
    })),

  setSearchResults: (results) => set({ searchResults: results }),

  addGameInvite: (invite) =>
    set((state) => ({
      gameInvites: [...state.gameInvites, invite],
    })),

  removeGameInvite: (inviteId) =>
    set((state) => ({
      gameInvites: state.gameInvites.filter((i) => i.id !== inviteId),
    })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  reset: () => set(initialState),
}));
