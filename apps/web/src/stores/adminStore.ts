import { create } from 'zustand';
import {
  adminApi,
  adminFetch,
  AdminApiError,
  type AdminUserRow,
  type AdminGameHistoryRow,
  type AdminFeedbackRow,
  type Pagination,
} from '@/utils/adminApi';

interface DashboardData {
  // Live
  totalRooms: number;
  totalPlayers: number;
  connectedPlayers: number;
  roomsByPhase: Record<string, number>;
  roomsByMode: Record<string, number>;
  // Historical
  gamesLastWeek: number;
  gamesLastMonth: number;
  gamesLastYear: number;
  unfinishedTotal: number;
  unfinishedByReason: {
    admin_ended: number;
    cleaned_up: number;
    abandoned: number;
  };
  unfinishedByPhase: {
    lobby: number;
    selecting_word: number;
    drawing: number;
    round_end: number;
    game_end: number;
  };
}

interface RoomSummary {
  id: string;
  mode: string;
  phase: string;
  playerCount: number;
  connectedCount: number;
  currentRound: number;
  totalRounds: number;
  teamAScore: number;
  teamBScore: number;
}

interface RoomDetail {
  id: string;
  mode: string;
  phase: string;
  settings: any;
  currentRound: number;
  drawerId: string | null;
  teamADrawerId: string | null;
  teamBDrawerId: string | null;
  teamAScore: number;
  teamBScore: number;
  isRedrawRound: boolean;
  players: {
    id: string;
    nickname: string;
    score: number;
    team?: string;
    isHost: boolean;
    isConnected: boolean;
    isDrawing: boolean;
  }[];
}

interface WordStat {
  languageCode: string;
  languageName: string;
  difficulty: number;
  count: number;
}

interface WordEntry {
  id: number;
  word: string;
  difficulty: number;
  botCompatible: boolean;
  languageCode: string;
  languageName: string;
}

interface LanguageEntry {
  id: number;
  code: string;
  name: string;
  nativeName: string;
}

export type AdminTab =
  | 'dashboard'
  | 'rooms'
  | 'room-detail'
  | 'broadcast'
  | 'words'
  | 'users'
  | 'games'
  | 'game-detail'
  | 'feedback'
  | 'feedback-detail';

interface AdminState {
  error: string | null;
  dashboard: DashboardData | null;
  rooms: RoomSummary[];
  selectedRoom: RoomDetail | null;
  wordStats: WordStat[];
  wordList: WordEntry[];
  availableLanguages: LanguageEntry[];
  activeTab: AdminTab;
  selectedRoomId: string | null;

  users: AdminUserRow[];
  userPagination: Pagination | null;

  games: AdminGameHistoryRow[];
  gamePagination: Pagination | null;
  selectedGame: AdminGameHistoryRow | null;
  selectedGameId: string | null;

  feedback: AdminFeedbackRow[];
  feedbackPagination: Pagination | null;
  selectedFeedback: AdminFeedbackRow | null;
  selectedFeedbackId: string | null;
}

interface AdminActions {
  /** Exit admin panel — clears local state, leaves user auth alone. */
  exit: () => void;
  fetchDashboard: () => Promise<void>;
  fetchRooms: () => Promise<void>;
  fetchRoom: (id: string) => Promise<void>;
  endGame: (id: string) => Promise<string>;
  kickPlayer: (roomId: string, playerId: string) => Promise<string>;
  broadcast: (message: string) => Promise<string>;
  fetchWordStats: () => Promise<void>;
  fetchWords: (
    language?: string,
    difficulty?: string,
    botCompatible?: 'true' | 'false' | '',
  ) => Promise<void>;
  fetchLanguages: () => Promise<void>;
  addWord: (
    languageCode: string,
    word: string,
    difficulty: number,
    botCompatible?: boolean,
  ) => Promise<string>;
  updateWord: (
    id: number,
    updates: {
      word?: string;
      difficulty?: number;
      languageCode?: string;
      botCompatible?: boolean;
    },
  ) => Promise<void>;
  deleteWord: (id: number) => Promise<void>;

  fetchUsers: (params: { page?: number; search?: string }) => Promise<void>;
  resetUserPassword: (
    persistentId: string,
    password?: string,
  ) => Promise<{ message: string; password: string; isDefault: boolean }>;
  deleteUser: (persistentId: string) => Promise<void>;
  restoreUser: (persistentId: string) => Promise<void>;
  fetchGames: (params: { page?: number; endReason?: string; playerPersistentId?: string }) => Promise<void>;
  fetchGame: (id: string) => Promise<void>;
  fetchFeedback: (params: { page?: number; status?: string; category?: string }) => Promise<void>;
  fetchFeedbackById: (id: string) => Promise<void>;
  updateFeedback: (id: string, updates: Parameters<typeof adminApi.updateFeedback>[1]) => Promise<void>;
  deleteFeedback: (id: string) => Promise<void>;

  setActiveTab: (tab: AdminTab) => void;
  setSelectedRoomId: (id: string | null) => void;
  setSelectedGameId: (id: string | null) => void;
  setSelectedFeedbackId: (id: string | null) => void;
  clearError: () => void;
}

export type AdminStore = AdminState & AdminActions;

function handleApiError(
  set: (partial: Partial<AdminState>) => void,
  err: any,
  fallback = 'Request failed',
) {
  if (err instanceof AdminApiError && err.status === 401) {
    set({ error: 'Admin access revoked or not authorized.' });
  } else {
    set({ error: err.message || fallback });
  }
}

export const useAdminStore = create<AdminStore>()((set, get) => ({
  error: null,
  dashboard: null,
  rooms: [],
  selectedRoom: null,
  wordStats: [],
  wordList: [],
  availableLanguages: [],
  activeTab: 'dashboard',
  selectedRoomId: null,

  users: [],
  userPagination: null,

  games: [],
  gamePagination: null,
  selectedGame: null,
  selectedGameId: null,

  feedback: [],
  feedbackPagination: null,
  selectedFeedback: null,
  selectedFeedbackId: null,

  exit: () => {
    set({
      dashboard: null,
      rooms: [],
      selectedRoom: null,
      wordStats: [],
      wordList: [],
      availableLanguages: [],
      users: [],
      userPagination: null,
      games: [],
      gamePagination: null,
      selectedGame: null,
      selectedGameId: null,
      feedback: [],
      feedbackPagination: null,
      selectedFeedback: null,
      selectedFeedbackId: null,
      activeTab: 'dashboard',
      selectedRoomId: null,
      error: null,
    });
    window.location.hash = '';
  },

  fetchDashboard: async () => {
    try {
      const data = await adminFetch<DashboardData>('/dashboard');
      set({ dashboard: data, error: null });
    } catch (err: any) {
      handleApiError(set, err);
    }
  },

  fetchRooms: async () => {
    try {
      const { rooms } = await adminFetch<{ rooms: RoomSummary[] }>('/rooms');
      set({ rooms, error: null });
    } catch (err: any) {
      handleApiError(set, err);
    }
  },

  fetchRoom: async (id: string) => {
    try {
      const room = await adminFetch<RoomDetail>(`/rooms/${id}`);
      set({ selectedRoom: room, error: null });
    } catch (err: any) {
      handleApiError(set, err);
    }
  },

  endGame: async (id: string) => {
    try {
      const { message } = await adminFetch<{ message: string }>(`/rooms/${id}/end`, {
        method: 'POST',
      });
      return message;
    } catch (err: any) {
      handleApiError(set, err);
      throw err;
    }
  },

  kickPlayer: async (roomId: string, playerId: string) => {
    try {
      const { message } = await adminFetch<{ message: string }>(
        `/rooms/${roomId}/kick/${playerId}`,
        { method: 'POST' },
      );
      return message;
    } catch (err: any) {
      handleApiError(set, err);
      throw err;
    }
  },

  broadcast: async (message: string) => {
    try {
      const result = await adminFetch<{ message: string; roomCount: number }>(
        '/broadcast',
        {
          method: 'POST',
          body: JSON.stringify({ message }),
        },
      );
      return result.message;
    } catch (err: any) {
      handleApiError(set, err);
      throw err;
    }
  },

  fetchWordStats: async () => {
    try {
      const { stats } = await adminFetch<{ stats: WordStat[] }>('/words/stats');
      set({ wordStats: stats, error: null });
    } catch (err: any) {
      handleApiError(set, err);
    }
  },

  fetchWords: async (
    language?: string,
    difficulty?: string,
    botCompatible?: 'true' | 'false' | '',
  ) => {
    try {
      const params = new URLSearchParams();
      if (language) params.set('language', language);
      if (difficulty) params.set('difficulty', difficulty);
      if (botCompatible === 'true' || botCompatible === 'false') {
        params.set('botCompatible', botCompatible);
      }
      const qs = params.toString();
      const { words } = await adminFetch<{ words: WordEntry[] }>(
        `/words/list${qs ? `?${qs}` : ''}`,
      );
      set({ wordList: words, error: null });
    } catch (err: any) {
      handleApiError(set, err);
    }
  },

  fetchLanguages: async () => {
    try {
      const { languages } = await adminFetch<{ languages: LanguageEntry[] }>('/words/languages');
      set({ availableLanguages: languages, error: null });
    } catch (err: any) {
      handleApiError(set, err);
    }
  },

  addWord: async (
    languageCode: string,
    word: string,
    difficulty: number,
    botCompatible?: boolean,
  ) => {
    try {
      await adminFetch('/words', {
        method: 'POST',
        body: JSON.stringify({
          languageCode,
          word,
          difficulty,
          ...(botCompatible !== undefined ? { botCompatible } : {}),
        }),
      });
      return 'Word added';
    } catch (err: any) {
      handleApiError(set, err);
      throw err;
    }
  },

  updateWord: async (id, updates) => {
    try {
      const { word } = await adminApi.updateWord(id, updates);
      // Patch the word in place so the UI updates without a refetch.
      set({
        wordList: get().wordList.map((w) =>
          w.id === id
            ? {
                ...w,
                word: word.word,
                difficulty: word.difficulty,
                botCompatible: word.botCompatible,
                languageCode: word.languageCode,
                languageName: word.languageName,
              }
            : w,
        ),
        error: null,
      });
    } catch (err: any) {
      handleApiError(set, err);
      throw err;
    }
  },

  deleteWord: async (id: number) => {
    try {
      await adminFetch(`/words/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      handleApiError(set, err);
      throw err;
    }
  },

  // -----------------------------------------------------------------------
  // Users
  // -----------------------------------------------------------------------

  fetchUsers: async ({ page, search }) => {
    try {
      const { users, pagination } = await adminApi.getUsers({ page, limit: 20, search });
      set({ users, userPagination: pagination, error: null });
    } catch (err: any) {
      handleApiError(set, err);
    }
  },

  resetUserPassword: async (persistentId: string, password?: string) => {
    try {
      const result = await adminApi.resetUserPassword(persistentId, password);
      set({ error: null });
      return result;
    } catch (err: any) {
      handleApiError(set, err);
      throw err;
    }
  },

  deleteUser: async (persistentId: string) => {
    try {
      const result = await adminApi.deleteUser(persistentId);
      // Soft delete: keep the row in the list but mark it as deleted so the
      // admin can restore it without refetching.
      const deletedAt = result.deletedAt ?? new Date().toISOString();
      set({
        users: get().users.map((u) =>
          u.persistentId === persistentId ? { ...u, deletedAt } : u,
        ),
        error: null,
      });
    } catch (err: any) {
      handleApiError(set, err);
      throw err;
    }
  },

  restoreUser: async (persistentId: string) => {
    try {
      await adminApi.restoreUser(persistentId);
      set({
        users: get().users.map((u) =>
          u.persistentId === persistentId ? { ...u, deletedAt: null } : u,
        ),
        error: null,
      });
    } catch (err: any) {
      handleApiError(set, err);
      throw err;
    }
  },

  // -----------------------------------------------------------------------
  // Game history
  // -----------------------------------------------------------------------

  fetchGames: async ({ page, endReason, playerPersistentId }) => {
    try {
      const { games, pagination } = await adminApi.getGames({
        page,
        limit: 20,
        endReason,
        playerPersistentId,
      });
      set({ games, gamePagination: pagination, error: null });
    } catch (err: any) {
      handleApiError(set, err);
    }
  },

  fetchGame: async (id: string) => {
    try {
      const game = await adminApi.getGameById(id);
      set({ selectedGame: game, error: null });
    } catch (err: any) {
      handleApiError(set, err);
    }
  },

  // -----------------------------------------------------------------------
  // Feedback
  // -----------------------------------------------------------------------

  fetchFeedback: async ({ page, status, category }) => {
    try {
      const { feedback, pagination } = await adminApi.getFeedback({
        page,
        limit: 20,
        status,
        category,
      });
      set({ feedback, feedbackPagination: pagination, error: null });
    } catch (err: any) {
      handleApiError(set, err);
    }
  },

  fetchFeedbackById: async (id: string) => {
    try {
      const feedback = await adminApi.getFeedbackById(id);
      set({ selectedFeedback: feedback, error: null });
    } catch (err: any) {
      handleApiError(set, err);
    }
  },

  updateFeedback: async (id, updates) => {
    try {
      const updated = await adminApi.updateFeedback(id, updates);
      set({
        selectedFeedback: updated,
        feedback: get().feedback.map((f) => (f._id === id ? updated : f)),
        error: null,
      });
    } catch (err: any) {
      handleApiError(set, err);
      throw err;
    }
  },

  deleteFeedback: async (id: string) => {
    try {
      await adminApi.deleteFeedback(id);
      set({
        feedback: get().feedback.filter((f) => f._id !== id),
        selectedFeedback: null,
        selectedFeedbackId: null,
        error: null,
      });
    } catch (err: any) {
      handleApiError(set, err);
      throw err;
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedRoomId: (id) =>
    set({ selectedRoomId: id, activeTab: id ? 'room-detail' : 'rooms' }),
  setSelectedGameId: (id) =>
    set({ selectedGameId: id, activeTab: id ? 'game-detail' : 'games' }),
  setSelectedFeedbackId: (id) =>
    set({ selectedFeedbackId: id, activeTab: id ? 'feedback-detail' : 'feedback' }),
  clearError: () => set({ error: null }),
}));
