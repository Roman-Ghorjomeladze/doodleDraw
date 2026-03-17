export type GameMode = 'classic' | 'team';

export type GamePhase =
  | 'lobby'
  | 'selecting_word'
  | 'drawing'
  | 'round_end'
  | 'game_end';

export type Team = 'A' | 'B';

export interface Player {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  team?: Team;
  isDrawing: boolean;
  hasDrawn: boolean;
  isHost: boolean;
  isConnected: boolean;
  isSpectator?: boolean;
}

export interface RoomSettings {
  maxPlayers: number;
  roundTime: number;
  language: string;
  difficulty: 1 | 2 | 3;
  totalRounds: number;
  hintsEnabled: boolean;
  redrawEnabled: boolean;
  isPublic: boolean;
  teamAName: string;
  teamBName: string;
}

export interface Room {
  id: string;
  mode: GameMode;
  phase: GamePhase;
  settings: RoomSettings;
  players: Map<string, Player>;
  createdAt: number;
  currentRound: number;
  currentWord: string | null;
  wordHint: string;
  drawerId: string | null;
  teamADrawerId: string | null;
  teamBDrawerId: string | null;
  roundStartTime: number | null;
  correctGuessers: string[];
  drawingHistory: DrawAction[];
  pendingWords: { word: string; difficulty: number }[];
  drawOrder: string[];
  drawOrderIndex: number;
  teamAScore: number;
  teamBScore: number;
  lastWinningTeam: Team | null;
  isRedrawRound: boolean;
  playerWordHistory: Map<string, string[]>;
  chatHistory: ChatMessage[];
  rematchVotes: Map<string, RematchStatus>;
}

export type RematchStatus = 'pending' | 'accepted' | 'declined';

export interface RematchState {
  votes: Record<string, RematchStatus>;
  totalEligible: number;
}

export interface SerializedRoom {
  id: string;
  mode: GameMode;
  phase: GamePhase;
  settings: RoomSettings;
  players: Player[];
  currentRound: number;
  wordHint: string;
  drawerId: string | null;
  teamADrawerId: string | null;
  teamBDrawerId: string | null;
  correctGuessers: string[];
  drawOrderIndex: number;
  teamAScore: number;
  teamBScore: number;
  isRedrawRound: boolean;
  rematchState?: RematchState;
}

export interface DrawAction {
  type: 'stroke' | 'fill' | 'clear' | 'undo';
  points?: { x: number; y: number }[];
  color?: string;
  brushSize?: number;
  tool?: 'pen' | 'eraser' | 'fill';
  timestamp: number;
  playerId: string;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  text: string;
  timestamp: number;
  isCorrectGuess: boolean;
  isSystemMessage: boolean;
  isCloseGuess: boolean;
  isSpectatorMessage?: boolean;
}

export interface GameScore {
  playerId: string;
  nickname: string;
  score: number;
  team?: Team;
  correctGuesses: number;
  drawingScore: number;
}

export interface PublicRoomInfo {
  id: string;
  mode: GameMode;
  hostNickname: string;
  hostAvatar: string;
  playerCount: number;
  maxPlayers: number;
  language: string;
  createdAt: number;
}

export interface OngoingGameInfo {
  id: string;
  mode: GameMode;
  phase: GamePhase;
  hostNickname: string;
  hostAvatar: string;
  playerCount: number;
  spectatorCount: number;
  maxPlayers: number;
  language: string;
  currentRound: number;
  totalRounds: number;
  createdAt: number;
}

export interface Handicap {
  limitedColors: boolean;
  minBrushSize: number;
  availableColors: string[];
}
