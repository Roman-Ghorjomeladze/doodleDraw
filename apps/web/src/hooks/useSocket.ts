import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@doodledraw/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Module-level singleton – all components share a single socket connection.
let socketInstance: TypedSocket | null = null;

function getSocket(): TypedSocket {
  if (!socketInstance) {
    socketInstance = io('/game', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socketInstance;
}

export function useSocket() {
  const socket = useRef<TypedSocket>(getSocket());
  const [connected, setConnected] = useState(socket.current.connected);

  useEffect(() => {
    const s = socket.current;

    const onConnect = () => {
      setConnected(true);

      // Attempt to reconnect to an existing game session.
      const roomId = sessionStorage.getItem('doodledraw_roomId');
      const stored = localStorage.getItem('doodledraw-player');
      if (roomId && stored) {
        try {
          const parsed = JSON.parse(stored);
          const playerId = parsed?.state?.playerId;
          if (playerId && playerId !== s.id) {
            s.emit('game:reconnect', { roomId, playerId });
          }
        } catch {
          // Ignore parse errors.
        }
      }
    };
    const onDisconnect = () => setConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    // Sync state if already connected
    if (s.connected) setConnected(true);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);

  const emit = useCallback(
    <E extends keyof ClientToServerEvents>(
      event: E,
      ...args: Parameters<ClientToServerEvents[E]>
    ) => {
      socket.current.emit(event, ...args);
    },
    [],
  );

  const on = useCallback(
    <E extends keyof ServerToClientEvents>(
      event: E,
      handler: ServerToClientEvents[E],
    ) => {
      const s = socket.current;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      s.on(event, handler as any);

      return () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        s.off(event, handler as any);
      };
    },
    [],
  );

  return {
    socket,
    emit,
    on,
    connected,
  };
}
