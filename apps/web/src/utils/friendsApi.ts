import { useAuthStore } from '@/stores/authStore';
import type { FriendInfo, FriendRequest, FriendSearchResult } from '@doodledraw/shared';

const API_BASE = '/api/friends';

async function friendsFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = 'Request failed';
    try {
      const body = await res.json();
      message = body.message || message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

export const friendsApi = {
  search: (query: string, signal?: AbortSignal) =>
    friendsFetch<{ users: FriendSearchResult[] }>(`/search?q=${encodeURIComponent(query)}`, { signal }),

  list: () =>
    friendsFetch<{ friends: FriendInfo[] }>('/list'),

  pendingRequests: () =>
    friendsFetch<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>('/requests'),

  sendRequest: (targetPersistentId: string) =>
    friendsFetch<{ request: FriendRequest; autoAccepted: boolean }>('/request', {
      method: 'POST',
      body: JSON.stringify({ targetPersistentId }),
    }),

  respondToRequest: (requestId: string, action: 'accept' | 'reject') =>
    friendsFetch<{ status: string }>('/request/respond', {
      method: 'POST',
      body: JSON.stringify({ requestId, action }),
    }),

  removeFriend: (friendPersistentId: string) =>
    friendsFetch<{ success: boolean }>('/remove', {
      method: 'DELETE',
      body: JSON.stringify({ friendPersistentId }),
    }),
};
