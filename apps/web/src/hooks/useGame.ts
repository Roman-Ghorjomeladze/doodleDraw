import { useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useGameStore } from '@/stores/gameStore';
import { useDrawingStore } from '@/stores/drawingStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { GameMode, RoomSettings, Team } from '@doodledraw/shared';

export function useGame() {
  const { emit, connected } = useSocket();
  const gameStore = useGameStore();

  // ── Client actions ──────────────────────────────────────────────────

  const createRoom = useCallback(
    (mode: GameMode, options?: { isPublic?: boolean }) => {
      const { nickname, avatar, persistentId } = usePlayerStore.getState();
      const { language } = useSettingsStore.getState();
      emit('room:create', { mode, nickname, avatar, persistentId });
      // Apply the user's preferred language and public setting
      emit('room:settings', { language, ...(options?.isPublic != null ? { isPublic: options.isPublic } : {}) });
    },
    [emit],
  );

  const joinRoom = useCallback(
    (roomId: string) => {
      const { nickname, avatar, persistentId } = usePlayerStore.getState();
      emit('room:join', { roomId, nickname, avatar, persistentId });
    },
    [emit],
  );

  const startGame = useCallback(() => {
    emit('game:startCountdown');
  }, [emit]);

  const cancelStartGame = useCallback(() => {
    emit('game:cancelCountdown');
  }, [emit]);

  const selectWord = useCallback(
    (wordIndex: number) => {
      emit('game:selectWord', { wordIndex });
    },
    [emit],
  );

  const sendGuess = useCallback(
    (text: string) => {
      emit('chat:message', { text });
    },
    [emit],
  );

  const leaveRoom = useCallback(() => {
    emit('room:leave');
    useGameStore.getState().reset();
    useDrawingStore.getState().reset();
    usePlayerStore.getState().setIsSpectator(false);
  }, [emit]);

  const updateSettings = useCallback(
    (settings: Partial<RoomSettings>) => {
      emit('room:settings', settings);
    },
    [emit],
  );

  const spectateRoom = useCallback(
    (roomId: string) => {
      const { nickname, avatar, persistentId } = usePlayerStore.getState();
      usePlayerStore.getState().setIsSpectator(true);
      emit('room:spectate', { roomId, nickname, avatar, persistentId });
    },
    [emit],
  );

  const rematchVote = useCallback(
    (vote: 'accepted' | 'declined') => {
      emit('game:rematchVote', { vote });
    },
    [emit],
  );

  const switchTeam = useCallback(
    (team: Team) => {
      emit('team:switch', { team });
    },
    [emit],
  );

  const kickPlayer = useCallback(
    (playerId: string) => {
      emit('room:kick', { playerId });
    },
    [emit],
  );

  const addBot = useCallback(() => {
    emit('room:addBot');
  }, [emit]);

  return {
    connected,
    roomId: gameStore.roomId,
    phase: gameStore.phase,
    players: gameStore.players,
    isHost: gameStore.isHost,
    createRoom,
    joinRoom,
    startGame,
    cancelStartGame,
    selectWord,
    sendGuess,
    leaveRoom,
    updateSettings,
    switchTeam,
    spectateRoom,
    rematchVote,
    kickPlayer,
    addBot,
  };
}
