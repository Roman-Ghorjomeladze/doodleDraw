import { useAuthStore } from '@/stores/authStore';

const API_BASE = '/api/admin';

export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function adminFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Use the regular user auth token — admin access is gated by the user's
  // `isAdmin` flag server-side. No separate admin token anymore.
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

  if (res.status === 401) {
    throw new AdminApiError(401, 'Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new AdminApiError(res.status, body.message || 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// -------------------------------------------------------------------------
// Typed wrappers for the new endpoints
// -------------------------------------------------------------------------

export interface AdminUserRow {
  persistentId: string;
  username: string | null;
  nickname: string;
  avatar: string;
  totalGames: number;
  totalWins: number;
  eloRating: number;
  country: string | null;
  birthYear: number | null;
  isAdmin: boolean;
  isRegistered: boolean;
  createdAt: string | null;
  /** Soft-delete timestamp; non-null means the user is deleted. */
  deletedAt: string | null;
}

export interface AdminGameHistoryPlayer {
  persistentId: string;
  nickname: string;
  avatar: string;
  finalScore: number;
  isBot: boolean;
  team: string | null;
  isHost: boolean;
  wasConnected: boolean;
}

export interface AdminGameHistoryRow {
  _id: string;
  roomId: string;
  mode: 'classic' | 'team';
  endReason: 'completed' | 'admin_ended' | 'cleaned_up' | 'abandoned';
  finalPhase: string;
  players: AdminGameHistoryPlayer[];
  winnerPersistentId: string | null;
  winnerTeam: 'A' | 'B' | null;
  teamAScore: number;
  teamBScore: number;
  roundsPlayed: number;
  totalRounds: number;
  language: string;
  startedAt: string;
  endedAt: string;
  settings: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminFeedbackRow {
  _id: string;
  message: string;
  category: 'bug' | 'feedback' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
  submitterPersistentId: string | null;
  submitterUsername: string | null;
  submitterNickname: string | null;
  pageUrl: string | null;
  userAgent: string | null;
  adminNotes: string | null;
  trace: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const adminApi = {
  getUsers: (params: { page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    const qs = q.toString();
    return adminFetch<{ users: AdminUserRow[]; pagination: Pagination }>(
      `/users${qs ? `?${qs}` : ''}`,
    );
  },

  getGames: (params: {
    page?: number;
    limit?: number;
    endReason?: string;
    playerPersistentId?: string;
  }) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.endReason) q.set('endReason', params.endReason);
    if (params.playerPersistentId) q.set('playerPersistentId', params.playerPersistentId);
    const qs = q.toString();
    return adminFetch<{ games: AdminGameHistoryRow[]; pagination: Pagination }>(
      `/games${qs ? `?${qs}` : ''}`,
    );
  },

  getGameById: (id: string) => adminFetch<AdminGameHistoryRow>(`/games/${id}`),

  getFeedback: (params: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
  }) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.status) q.set('status', params.status);
    if (params.category) q.set('category', params.category);
    const qs = q.toString();
    return adminFetch<{ feedback: AdminFeedbackRow[]; pagination: Pagination }>(
      `/feedback${qs ? `?${qs}` : ''}`,
    );
  },

  getFeedbackById: (id: string) => adminFetch<AdminFeedbackRow>(`/feedback/${id}`),

  updateFeedback: (
    id: string,
    updates: Partial<{
      message: string;
      category: AdminFeedbackRow['category'];
      status: AdminFeedbackRow['status'];
      adminNotes: string;
    }>,
  ) =>
    adminFetch<AdminFeedbackRow>(`/feedback/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteFeedback: (id: string) =>
    adminFetch<void>(`/feedback/${id}`, {
      method: 'DELETE',
    }),

  resetUserPassword: (persistentId: string, password?: string) =>
    adminFetch<{ message: string; password: string; isDefault: boolean }>(
      `/users/${encodeURIComponent(persistentId)}/password`,
      {
        method: 'PUT',
        body: JSON.stringify(password ? { password } : {}),
      },
    ),

  deleteUser: (persistentId: string) =>
    adminFetch<{ message: string; deletedAt?: string }>(
      `/users/${encodeURIComponent(persistentId)}`,
      {
        method: 'DELETE',
      },
    ),

  restoreUser: (persistentId: string) =>
    adminFetch<{ message: string }>(
      `/users/${encodeURIComponent(persistentId)}/restore`,
      {
        method: 'POST',
      },
    ),

  updateWord: (
    id: number | string,
    updates: {
      word?: string;
      difficulty?: number;
      languageCode?: string;
      botCompatible?: boolean;
    },
  ) =>
    adminFetch<{
      word: {
        id: number | string;
        word: string;
        difficulty: number;
        botCompatible: boolean;
        languageCode: string;
        languageName: string;
      };
    }>(`/words/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
};
