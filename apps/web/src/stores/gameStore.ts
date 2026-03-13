import { create } from 'zustand';
import type {
  GameMode,
  GamePhase,
  Player,
  ChatMessage,
  GameScore,
  RoomSettings,
} from '@doodledraw/shared';

interface GameState {
  roomId: string | null;
  mode: GameMode | null;
  phase: GamePhase;
  players: Player[];
  currentPlayerId: string | null;
  drawerId: string | null;
  wordHint: string;
  currentWord: string | null;
  wordOptions: { word: string; difficulty: number }[];
  timeLeft: number;
  currentRound: number;
  totalRounds: number;
  messages: ChatMessage[];
  scores: GameScore[];
  isHost: boolean;
  settings: RoomSettings | null;
  teamADrawerId: string | null;
  teamBDrawerId: string | null;
  teamAScore: number;
  teamBScore: number;
  isRedrawRound: boolean;
  countdownSeconds: number | null;
  pendingRoomId: string | null;
}

interface GameActions {
  setRoom: (data: {
    roomId: string;
    mode: GameMode;
    phase: GamePhase;
    players: Player[];
    currentRound: number;
    totalRounds: number;
    drawerId: string | null;
    wordHint: string;
    teamADrawerId: string | null;
    teamBDrawerId: string | null;
    teamAScore: number;
    teamBScore: number;
    isRedrawRound: boolean;
  }) => void;
  setPhase: (phase: GamePhase) => void;
  setPlayers: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, data: Partial<Player>) => void;
  addMessage: (message: ChatMessage) => void;
  setTimeLeft: (timeLeft: number) => void;
  setWordOptions: (words: { word: string; difficulty: number }[]) => void;
  setWordHint: (hint: string) => void;
  setDrawer: (drawerId: string | null) => void;
  setScores: (scores: GameScore[]) => void;
  setCurrentWord: (word: string | null) => void;
  setSettings: (settings: RoomSettings) => void;
  setCountdownSeconds: (seconds: number | null) => void;
  setPendingRoomId: (roomId: string | null) => void;
  reset: () => void;
}

export type GameStore = GameState & GameActions;

const initialState: GameState = {
  roomId: null,
  mode: null,
  phase: 'lobby',
  players: [],
  currentPlayerId: null,
  drawerId: null,
  wordHint: '',
  currentWord: null,
  wordOptions: [],
  timeLeft: 0,
  currentRound: 0,
  totalRounds: 2,
  messages: [],
  scores: [],
  isHost: false,
  settings: null,
  teamADrawerId: null,
  teamBDrawerId: null,
  teamAScore: 0,
  teamBScore: 0,
  isRedrawRound: false,
  countdownSeconds: null,
  pendingRoomId: null,
};

export const useGameStore = create<GameStore>()((set) => ({
  ...initialState,

  setRoom: (data) => {
    sessionStorage.setItem('doodledraw_roomId', data.roomId);
    set({
      roomId: data.roomId,
      mode: data.mode,
      phase: data.phase,
      players: data.players,
      currentRound: data.currentRound,
      totalRounds: data.totalRounds,
      drawerId: data.drawerId,
      wordHint: data.wordHint,
      teamADrawerId: data.teamADrawerId,
      teamBDrawerId: data.teamBDrawerId,
      teamAScore: data.teamAScore,
      teamBScore: data.teamBScore,
      isRedrawRound: data.isRedrawRound,
    });
  },

  setPhase: (phase) => set({ phase }),

  setPlayers: (players) => set({ players }),

  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players, player],
    })),

  removePlayer: (playerId) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    })),

  updatePlayer: (playerId, data) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, ...data } : p,
      ),
    })),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setTimeLeft: (timeLeft) => set({ timeLeft }),

  setWordOptions: (wordOptions) => set({ wordOptions }),

  setWordHint: (wordHint) => set({ wordHint }),

  setDrawer: (drawerId) => set({ drawerId }),

  setScores: (scores) => set({ scores }),

  setCurrentWord: (currentWord) => set({ currentWord }),

  setSettings: (settings) => set({ settings }),

  setCountdownSeconds: (countdownSeconds) => set({ countdownSeconds }),

  setPendingRoomId: (pendingRoomId) => set({ pendingRoomId }),

  reset: () => {
    sessionStorage.removeItem('doodledraw_roomId');
    set(initialState);
  },
}));
