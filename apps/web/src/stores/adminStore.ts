import { create } from 'zustand';
import { adminFetch, AdminApiError } from '@/utils/adminApi';

interface DashboardData {
  totalRooms: number;
  totalPlayers: number;
  connectedPlayers: number;
  roomsByPhase: Record<string, number>;
  roomsByMode: Record<string, number>;
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
  languageCode: string;
  languageName: string;
}

interface LanguageEntry {
  id: number;
  code: string;
  name: string;
  nativeName: string;
}

interface AdminState {
  isAuthenticated: boolean;
  error: string | null;
  dashboard: DashboardData | null;
  rooms: RoomSummary[];
  selectedRoom: RoomDetail | null;
  wordStats: WordStat[];
  wordList: WordEntry[];
  availableLanguages: LanguageEntry[];
  activeTab: 'dashboard' | 'rooms' | 'room-detail' | 'broadcast' | 'words';
  selectedRoomId: string | null;
}

interface AdminActions {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchDashboard: () => Promise<void>;
  fetchRooms: () => Promise<void>;
  fetchRoom: (id: string) => Promise<void>;
  endGame: (id: string) => Promise<string>;
  kickPlayer: (roomId: string, playerId: string) => Promise<string>;
  broadcast: (message: string) => Promise<string>;
  fetchWordStats: () => Promise<void>;
  fetchWords: (language?: string, difficulty?: string) => Promise<void>;
  fetchLanguages: () => Promise<void>;
  addWord: (languageCode: string, word: string, difficulty: number) => Promise<string>;
  deleteWord: (id: number) => Promise<void>;
  setActiveTab: (tab: AdminState['activeTab']) => void;
  setSelectedRoomId: (id: string | null) => void;
  clearError: () => void;
}

export type AdminStore = AdminState & AdminActions;

export const useAdminStore = create<AdminStore>()((set) => ({
  isAuthenticated: !!localStorage.getItem('admin_token'),
  error: null,
  dashboard: null,
  rooms: [],
  selectedRoom: null,
  wordStats: [],
  wordList: [],
  availableLanguages: [],
  activeTab: 'dashboard',
  selectedRoomId: null,

  login: async (username: string, password: string) => {
    try {
      const { token } = await adminFetch<{ token: string }>('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem('admin_token', token);
      set({ isAuthenticated: true, error: null });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Login failed' });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    set({
      isAuthenticated: false,
      dashboard: null,
      rooms: [],
      selectedRoom: null,
      wordStats: [],
      wordList: [],
      availableLanguages: [],
      activeTab: 'dashboard',
    });
  },

  fetchDashboard: async () => {
    try {
      const data = await adminFetch<DashboardData>('/dashboard');
      set({ dashboard: data, error: null });
    } catch (err: any) {
      if (err instanceof AdminApiError && err.status === 401) {
        set({ isAuthenticated: false });
      }
      set({ error: err.message });
    }
  },

  fetchRooms: async () => {
    try {
      const { rooms } = await adminFetch<{ rooms: RoomSummary[] }>('/rooms');
      set({ rooms, error: null });
    } catch (err: any) {
      if (err instanceof AdminApiError && err.status === 401) {
        set({ isAuthenticated: false });
      }
      set({ error: err.message });
    }
  },

  fetchRoom: async (id: string) => {
    try {
      const room = await adminFetch<RoomDetail>(`/rooms/${id}`);
      set({ selectedRoom: room, error: null });
    } catch (err: any) {
      if (err instanceof AdminApiError && err.status === 401) {
        set({ isAuthenticated: false });
      }
      set({ error: err.message });
    }
  },

  endGame: async (id: string) => {
    try {
      const { message } = await adminFetch<{ message: string }>(`/rooms/${id}/end`, {
        method: 'POST',
      });
      return message;
    } catch (err: any) {
      if (err instanceof AdminApiError && err.status === 401) {
        set({ isAuthenticated: false });
      }
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
      if (err instanceof AdminApiError && err.status === 401) {
        set({ isAuthenticated: false });
      }
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
      if (err instanceof AdminApiError && err.status === 401) {
        set({ isAuthenticated: false });
      }
      throw err;
    }
  },

  fetchWordStats: async () => {
    try {
      const { stats } = await adminFetch<{ stats: WordStat[] }>('/words/stats');
      set({ wordStats: stats, error: null });
    } catch (err: any) {
      if (err instanceof AdminApiError && err.status === 401) {
        set({ isAuthenticated: false });
      }
      set({ error: err.message });
    }
  },

  fetchWords: async (language?: string, difficulty?: string) => {
    try {
      const params = new URLSearchParams();
      if (language) params.set('language', language);
      if (difficulty) params.set('difficulty', difficulty);
      const qs = params.toString();
      const { words } = await adminFetch<{ words: WordEntry[] }>(
        `/words/list${qs ? `?${qs}` : ''}`,
      );
      set({ wordList: words, error: null });
    } catch (err: any) {
      if (err instanceof AdminApiError && err.status === 401) {
        set({ isAuthenticated: false });
      }
      set({ error: err.message });
    }
  },

  fetchLanguages: async () => {
    try {
      const { languages } = await adminFetch<{ languages: LanguageEntry[] }>('/words/languages');
      set({ availableLanguages: languages, error: null });
    } catch (err: any) {
      if (err instanceof AdminApiError && err.status === 401) {
        set({ isAuthenticated: false });
      }
      set({ error: err.message });
    }
  },

  addWord: async (languageCode: string, word: string, difficulty: number) => {
    try {
      await adminFetch('/words', {
        method: 'POST',
        body: JSON.stringify({ languageCode, word, difficulty }),
      });
      return 'Word added';
    } catch (err: any) {
      if (err instanceof AdminApiError && err.status === 401) {
        set({ isAuthenticated: false });
      }
      throw err;
    }
  },

  deleteWord: async (id: number) => {
    try {
      await adminFetch(`/words/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      if (err instanceof AdminApiError && err.status === 401) {
        set({ isAuthenticated: false });
      }
      throw err;
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedRoomId: (id) => set({ selectedRoomId: id, activeTab: id ? 'room-detail' : 'rooms' }),
  clearError: () => set({ error: null }),
}));
