import { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useGameStore } from '@/stores/gameStore';
import { useDrawingStore } from '@/stores/drawingStore';
import { usePlayerStore } from '@/stores/playerStore';
import { playSound } from '@/utils/sounds';
import { translate } from '@/i18n';

/**
 * Registers all server→client socket event listeners exactly once.
 * Must be called from a single top-level component (App).
 */
export function useGameEvents() {
  const { on } = useSocket();

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(
      on('room:created', ({ roomId, room }) => {
        usePlayerStore.getState().setPlayerId(room.players[0]?.id ?? null);
        useGameStore.getState().setRoom({
          roomId,
          mode: room.mode,
          phase: room.phase,
          players: room.players,
          currentRound: room.currentRound,
          totalRounds: room.settings.totalRounds,
          drawerId: room.drawerId,
          wordHint: room.wordHint,
          teamADrawerId: room.teamADrawerId,
          teamBDrawerId: room.teamBDrawerId,
          teamAScore: room.teamAScore,
          teamBScore: room.teamBScore,
          isRedrawRound: room.isRedrawRound,
        });
        useGameStore.setState({ isHost: true, settings: room.settings });
      }),
    );

    unsubscribers.push(
      on('room:joined', ({ room, playerId }) => {
        usePlayerStore.getState().setPlayerId(playerId);
        useGameStore.getState().setRoom({
          roomId: room.id,
          mode: room.mode,
          phase: room.phase,
          players: room.players,
          currentRound: room.currentRound,
          totalRounds: room.settings.totalRounds,
          drawerId: room.drawerId,
          wordHint: room.wordHint,
          teamADrawerId: room.teamADrawerId,
          teamBDrawerId: room.teamBDrawerId,
          teamAScore: room.teamAScore,
          teamBScore: room.teamBScore,
          isRedrawRound: room.isRedrawRound,
        });
        const isHost = room.players.find((p) => p.id === playerId)?.isHost ?? false;
        useGameStore.setState({ isHost, settings: room.settings });
      }),
    );

    unsubscribers.push(
      on('room:updated', ({ room }) => {
        const state = useGameStore.getState();
        const currentPlayerId = usePlayerStore.getState().playerId;

        // Detect connection state changes for other players
        const prevPlayers = state.players;
        for (const newPlayer of room.players) {
          // Skip self
          if (newPlayer.id === currentPlayerId) continue;
          const prev = prevPlayers.find((p) => p.nickname === newPlayer.nickname);
          if (prev && prev.isConnected && !newPlayer.isConnected) {
            // Player just disconnected
            state.addMessage({
              id: `disconnect-${Date.now()}-${newPlayer.id}`,
              playerId: newPlayer.id,
              nickname: newPlayer.nickname,
              text: translate('connection.playerDisconnected', { name: newPlayer.nickname }),
              timestamp: Date.now(),
              isCorrectGuess: false,
              isSystemMessage: true,
              isCloseGuess: false,
            });
          } else if (prev && !prev.isConnected && newPlayer.isConnected) {
            // Player just reconnected
            state.addMessage({
              id: `reconnect-${Date.now()}-${newPlayer.id}`,
              playerId: newPlayer.id,
              nickname: newPlayer.nickname,
              text: translate('connection.playerReconnected', { name: newPlayer.nickname }),
              timestamp: Date.now(),
              isCorrectGuess: false,
              isSystemMessage: true,
              isCloseGuess: false,
            });
          }
        }

        useGameStore.getState().setRoom({
          roomId: room.id,
          mode: room.mode,
          phase: room.phase,
          players: room.players,
          currentRound: room.currentRound,
          totalRounds: room.settings.totalRounds,
          drawerId: room.drawerId,
          wordHint: room.wordHint,
          teamADrawerId: room.teamADrawerId,
          teamBDrawerId: room.teamBDrawerId,
          teamAScore: room.teamAScore,
          teamBScore: room.teamBScore,
          isRedrawRound: room.isRedrawRound,
        });
        const isHost = room.players.find((p) => p.id === currentPlayerId)?.isHost ?? state.isHost;
        useGameStore.setState({ isHost, settings: room.settings });
      }),
    );

    unsubscribers.push(
      on('room:playerJoined', ({ player }) => {
        useGameStore.getState().addPlayer(player);
      }),
    );

    unsubscribers.push(
      on('room:playerLeft', ({ playerId }) => {
        useGameStore.getState().removePlayer(playerId);
      }),
    );

    unsubscribers.push(
      on('room:error', ({ message }) => {
        console.error('[DoodleDraw] Room error:', message);
      }),
    );

    unsubscribers.push(
      on('game:phaseChange', ({ phase }) => {
        useGameStore.getState().setPhase(phase);
        // Clear countdown when game starts
        useGameStore.getState().setCountdownSeconds(null);

        if (phase === 'lobby') {
          useDrawingStore.getState().reset();
          useGameStore.getState().setWordOptions([]);
          useGameStore.getState().setWordHint('');
        }
      }),
    );

    unsubscribers.push(
      on('game:wordOptions', ({ words }) => {
        useGameStore.getState().setWordOptions(words);
      }),
    );

    unsubscribers.push(
      on('game:roundStart', ({ drawerId, wordHint, roundNumber, currentWord }) => {
        const store = useGameStore.getState();
        store.setDrawer(drawerId);
        store.setWordHint(wordHint);
        store.setWordOptions([]);
        store.setCurrentWord(currentWord ?? null);
        useGameStore.setState({ currentRound: roundNumber, messages: [] });

        const currentPlayerId = usePlayerStore.getState().playerId;
        const isDrawer = currentPlayerId === drawerId;
        useDrawingStore.getState().setCanDraw(isDrawer);
        playSound('roundStart');
      }),
    );

    unsubscribers.push(
      on('game:roundEnd', ({ word, scores }) => {
        useGameStore.getState().setScores(scores);
        useGameStore.getState().setCurrentWord(word);
        useDrawingStore.getState().setCanDraw(false);
        useDrawingStore.getState().setIsDrawing(false);
        playSound('roundEnd');
      }),
    );

    unsubscribers.push(
      on('game:end', ({ finalScores }) => {
        useGameStore.getState().setScores(finalScores);
        useDrawingStore.getState().reset();
        playSound('gameEnd');
      }),
    );

    unsubscribers.push(
      on('game:timerUpdate', ({ timeLeft }) => {
        useGameStore.getState().setTimeLeft(timeLeft);
        if (timeLeft <= 5 && timeLeft > 0) {
          playSound('tick');
        }
      }),
    );

    unsubscribers.push(
      on('game:countdownTick', ({ seconds }) => {
        useGameStore.getState().setCountdownSeconds(seconds);
      }),
    );

    unsubscribers.push(
      on('game:countdownCancelled', () => {
        useGameStore.getState().setCountdownSeconds(null);
      }),
    );

    unsubscribers.push(
      on('game:hintReveal', ({ hint }) => {
        const currentPlayerId = usePlayerStore.getState().playerId;
        const drawerId = useGameStore.getState().drawerId;
        if (currentPlayerId !== drawerId) {
          useGameStore.getState().setWordHint(hint);
        }
      }),
    );

    unsubscribers.push(
      on('chat:message', (message) => {
        useGameStore.getState().addMessage(message);
        playSound('chatMessage');
      }),
    );

    unsubscribers.push(
      on('chat:correctGuess', ({ playerId, nickname, points }) => {
        useGameStore.getState().updatePlayer(playerId, {
          score:
            (useGameStore.getState().players.find((p) => p.id === playerId)?.score ?? 0) + points,
        });
        useGameStore.getState().addMessage({
          id: `system-${Date.now()}`,
          playerId,
          nickname,
          text: translate('chat.guessedWord', { name: nickname, points }),
          timestamp: Date.now(),
          isCorrectGuess: true,
          isSystemMessage: true,
          isCloseGuess: false,
        });
        playSound('correctGuess');
      }),
    );

    unsubscribers.push(
      on('chat:closeGuess', ({ playerId }) => {
        const player = useGameStore.getState().players.find((p) => p.id === playerId);
        if (player) {
          useGameStore.getState().addMessage({
            id: `close-${Date.now()}`,
            playerId,
            nickname: player.nickname,
            text: translate('chat.isClose', { name: player.nickname }),
            timestamp: Date.now(),
            isCorrectGuess: false,
            isSystemMessage: true,
            isCloseGuess: true,
          });
          playSound('closeGuess');
        }
      }),
    );

    unsubscribers.push(
      on('team:roundStart', ({ teamADrawerId, teamBDrawerId, wordHint, roundNumber, currentWord, handicap }) => {
        const store = useGameStore.getState();
        store.setWordHint(wordHint);
        store.setWordOptions([]);
        useGameStore.setState({
          currentRound: roundNumber,
          teamADrawerId,
          teamBDrawerId,
        });

        const currentPlayerId = usePlayerStore.getState().playerId;
        const isDrawer = currentPlayerId === teamADrawerId || currentPlayerId === teamBDrawerId;
        useDrawingStore.getState().setCanDraw(isDrawer);
        useDrawingStore.getState().setHandicap(handicap ?? null);

        if (isDrawer && currentWord) {
          store.setWordHint(currentWord);
        }
        playSound('roundStart');
      }),
    );

    unsubscribers.push(
      on('team:roundWon', ({ winningTeam, points }) => {
        const state = useGameStore.getState();
        if (winningTeam === 'A') {
          useGameStore.setState({ teamAScore: state.teamAScore + points });
        } else {
          useGameStore.setState({ teamBScore: state.teamBScore + points });
        }
      }),
    );

    unsubscribers.push(
      on('game:reconnected', ({ room, drawingHistory, messages, timeLeft, currentWord }) => {
        const store = useGameStore.getState();
        // Update player ID to the new socket ID (server remapped it).
        const oldPlayerId = usePlayerStore.getState().playerId;
        const newPlayer = room.players.find(
          (p) => p.nickname === usePlayerStore.getState().nickname || p.isConnected,
        );

        // Restore room state.
        store.setRoom({
          roomId: room.id,
          mode: room.mode,
          phase: room.phase,
          players: room.players,
          currentRound: room.currentRound,
          totalRounds: room.settings.totalRounds,
          drawerId: room.drawerId,
          wordHint: room.wordHint,
          teamADrawerId: room.teamADrawerId,
          teamBDrawerId: room.teamBDrawerId,
          teamAScore: room.teamAScore,
          teamBScore: room.teamBScore,
          isRedrawRound: room.isRedrawRound,
        });
        useGameStore.setState({ settings: room.settings, messages, timeLeft });

        if (currentWord) {
          store.setCurrentWord(currentWord);
        }

        // Figure out new player ID — the server changed it to the new socket ID.
        // Find ourselves in the updated player list.
        const nickname = usePlayerStore.getState().nickname;
        const me = room.players.find((p) => p.nickname === nickname);
        if (me) {
          usePlayerStore.getState().setPlayerId(me.id);
          const isDrawer =
            room.drawerId === me.id ||
            room.teamADrawerId === me.id ||
            room.teamBDrawerId === me.id;
          useDrawingStore.getState().setCanDraw(isDrawer && room.phase === 'drawing');
          useGameStore.setState({ isHost: me.isHost });

          if (isDrawer && currentWord) {
            store.setWordHint(currentWord);
          }
        }

        // Replay drawing history by emitting to the canvas via the draw:history event.
        // The DrawingCanvas listens for draw:history.
        if (drawingHistory.length > 0) {
          // Use a small delay to ensure canvas is mounted.
          setTimeout(() => {
            const event = new CustomEvent('doodledraw:replayHistory', {
              detail: { actions: drawingHistory },
            });
            window.dispatchEvent(event);
          }, 100);
        }

        console.log('[DoodleDraw] Successfully reconnected to game');
      }),
    );

    unsubscribers.push(
      on('room:spectateJoined', ({ room, playerId, drawingHistory, messages, timeLeft }) => {
        const store = useGameStore.getState();

        usePlayerStore.getState().setPlayerId(playerId);
        usePlayerStore.getState().setIsSpectator(true);

        store.setRoom({
          roomId: room.id,
          mode: room.mode,
          phase: room.phase,
          players: room.players,
          currentRound: room.currentRound,
          totalRounds: room.settings.totalRounds,
          drawerId: room.drawerId,
          wordHint: room.wordHint,
          teamADrawerId: room.teamADrawerId,
          teamBDrawerId: room.teamBDrawerId,
          teamAScore: room.teamAScore,
          teamBScore: room.teamBScore,
          isRedrawRound: room.isRedrawRound,
        });
        useGameStore.setState({ settings: room.settings, messages, timeLeft, isHost: false });

        // Replay drawing history on the canvas.
        if (drawingHistory.length > 0) {
          setTimeout(() => {
            const event = new CustomEvent('doodledraw:replayHistory', {
              detail: { actions: drawingHistory },
            });
            window.dispatchEvent(event);
          }, 100);
        }

        console.log('[DoodleDraw] Joined as spectator');
      }),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [on]);
}
