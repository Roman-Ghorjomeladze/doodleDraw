import type {
  GameMode,
  GamePhase,
  Team,
  DrawAction,
  ChatMessage,
  GameScore,
  SerializedRoom,
  RoomSettings,
  Handicap,
} from './game-types';

export interface ClientToServerEvents {
  'room:create': (data: { mode: GameMode; nickname: string; avatar: string }) => void;
  'room:join': (data: { roomId: string; nickname: string; avatar: string }) => void;
  'room:leave': () => void;
  'room:settings': (data: Partial<RoomSettings>) => void;
  'game:start': () => void;
  'game:startCountdown': () => void;
  'game:cancelCountdown': () => void;
  'game:selectWord': (data: { wordIndex: number }) => void;
  'draw:action': (data: DrawAction) => void;
  'draw:clear': () => void;
  'draw:undo': () => void;
  'chat:message': (data: { text: string }) => void;
  'player:update': (data: { nickname?: string; avatar?: string }) => void;
  'team:switch': (data: { team: Team }) => void;
  'game:reconnect': (data: { roomId: string; playerId: string }) => void;
  'room:spectate': (data: { roomId: string; nickname: string; avatar: string }) => void;
}

export interface ServerToClientEvents {
  'room:created': (data: { roomId: string; room: SerializedRoom }) => void;
  'room:joined': (data: { room: SerializedRoom; playerId: string }) => void;
  'room:updated': (data: { room: SerializedRoom }) => void;
  'room:playerJoined': (data: { player: import('./game-types').Player }) => void;
  'room:playerLeft': (data: { playerId: string }) => void;
  'room:error': (data: { message: string }) => void;
  'game:phaseChange': (data: { phase: GamePhase; context?: Record<string, unknown> }) => void;
  'game:wordOptions': (data: { words: { word: string; difficulty: number }[] }) => void;
  'game:roundStart': (data: {
    drawerId: string;
    wordHint: string;
    roundNumber: number;
    currentWord?: string;
  }) => void;
  'game:roundEnd': (data: { word: string; scores: GameScore[] }) => void;
  'game:end': (data: { finalScores: GameScore[]; winner: string | Team }) => void;
  'game:timerUpdate': (data: { timeLeft: number }) => void;
  'game:countdownTick': (data: { seconds: number }) => void;
  'game:countdownCancelled': () => void;
  'game:hintReveal': (data: { hint: string }) => void;
  'draw:action': (data: DrawAction) => void;
  'draw:actionBlurred': (data: DrawAction) => void;
  'draw:history': (data: { actions: DrawAction[] }) => void;
  'chat:message': (data: ChatMessage) => void;
  'chat:correctGuess': (data: { playerId: string; nickname: string; points: number }) => void;
  'chat:closeGuess': (data: { playerId: string }) => void;
  'team:roundStart': (data: {
    teamADrawerId: string;
    teamBDrawerId: string;
    wordHint: string;
    roundNumber: number;
    currentWord?: string;
    handicap?: Handicap;
  }) => void;
  'team:roundWon': (data: { winningTeam: Team; points: number }) => void;
  'game:reconnected': (data: {
    room: SerializedRoom;
    drawingHistory: DrawAction[];
    messages: ChatMessage[];
    timeLeft: number;
    currentWord?: string;
  }) => void;
  'room:spectateJoined': (data: {
    room: SerializedRoom;
    playerId: string;
    drawingHistory: DrawAction[];
    messages: ChatMessage[];
    timeLeft: number;
  }) => void;
}
