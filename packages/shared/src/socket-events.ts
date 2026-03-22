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
  PublicRoomInfo,
  OngoingGameInfo,
  RematchState,
  PlayerProfile,
  LeaderboardEntry,
  LobbyInfo,
} from './game-types';

export interface ClientToServerEvents {
  'room:create': (data: { mode: GameMode; nickname: string; avatar: string; persistentId: string }) => void;
  'room:join': (data: { roomId: string; nickname: string; avatar: string; persistentId: string }) => void;
  'room:leave': () => void;
  'room:settings': (data: Partial<RoomSettings>) => void;
  'room:kick': (data: { playerId: string }) => void;
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
  'game:reconnect': (data: { roomId?: string; persistentId: string }) => void;
  'room:spectate': (data: { roomId: string; nickname: string; avatar: string; persistentId: string }) => void;
  'rooms:list': () => void;
  'rooms:ongoingList': () => void;
  'game:rematchVote': (data: { vote: 'accepted' | 'declined' }) => void;
  'reaction:send': (data: { emoji: string }) => void;
  'profile:get': (data: { persistentId: string }) => void;
  'leaderboard:get': (data: { type: 'allTime' | 'weekly' | 'country' | 'age'; country?: string; ageGroup?: string }) => void;
  'canvas:snapshot': (data: { image: string }) => void;
  'lobbies:list': () => void;
  'lobbies:join': (data: { lobbyId: string; nickname: string; avatar: string; persistentId: string }) => void;
}

export interface ServerToClientEvents {
  'room:created': (data: { roomId: string; room: SerializedRoom }) => void;
  'room:joined': (data: { room: SerializedRoom; playerId: string }) => void;
  'room:updated': (data: { room: SerializedRoom }) => void;
  'room:playerJoined': (data: { player: import('./game-types').Player }) => void;
  'room:playerLeft': (data: { playerId: string; nickname: string; wasInGame: boolean }) => void;
  'room:error': (data: { message: string }) => void;
  'room:kicked': (data: { reason?: string }) => void;
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
    wordOptions?: { word: string; difficulty: number }[];
  }) => void;
  'room:spectateJoined': (data: {
    room: SerializedRoom;
    playerId: string;
    drawingHistory: DrawAction[];
    messages: ChatMessage[];
    timeLeft: number;
  }) => void;
  'rooms:list': (data: { rooms: PublicRoomInfo[] }) => void;
  'rooms:updated': (data: { rooms: PublicRoomInfo[] }) => void;
  'rooms:ongoingList': (data: { rooms: OngoingGameInfo[] }) => void;
  'rooms:ongoingUpdated': (data: { rooms: OngoingGameInfo[] }) => void;
  'game:rematchUpdate': (data: { rematchState: RematchState }) => void;
  'game:rematchStart': () => void;
  'reaction:received': (data: { emoji: string; nickname: string; playerId: string }) => void;
  'profile:data': (data: { profile: PlayerProfile | null }) => void;
  'leaderboard:data': (data: { players: LeaderboardEntry[]; type: string }) => void;
  'lobbies:state': (data: { lobbies: LobbyInfo[] }) => void;
}
