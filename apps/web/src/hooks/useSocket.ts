import { useCallback, useRef, useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@doodledraw/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// ── Shared connection state (module-level) ──────────────────────────────
// All useSocket() consumers share this single source of truth.
interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempt: number;
  reconnectFailed: boolean;
}

let connectionState: ConnectionState = {
  connected: false,
  reconnecting: false,
  reconnectAttempt: 0,
  reconnectFailed: false,
};

const listeners = new Set<() => void>();

function getConnectionState() {
  return connectionState;
}

function getServerConnectionState() {
  return connectionState;
}

function subscribeConnectionState(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function setConnectionState(partial: Partial<ConnectionState>) {
  connectionState = { ...connectionState, ...partial };
  listeners.forEach((l) => l());
}

// ── Module-level singleton ──────────────────────────────────────────────
let socketInstance: TypedSocket | null = null;

function attachConnectionEvents(s: TypedSocket) {
  s.on('connect', () => {
    setConnectionState({
      connected: true,
      reconnecting: false,
      reconnectAttempt: 0,
      reconnectFailed: false,
    });

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
  });

  s.on('disconnect', () => {
    setConnectionState({ connected: false });
  });

  s.io.on('reconnect_attempt', (attempt: number) => {
    setConnectionState({ reconnecting: true, reconnectAttempt: attempt });
  });

  s.io.on('reconnect_failed', () => {
    setConnectionState({ reconnecting: false, reconnectFailed: true });
  });
}

function createSocket(): TypedSocket {
  const s = io('/game', {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  socketInstance = s;
  attachConnectionEvents(s);

  // Sync initial state (socket may already be connected by now)
  if (s.connected) {
    setConnectionState({ connected: true });
  }
  return s;
}

function getSocket(): TypedSocket {
  if (!socketInstance) {
    createSocket();
  }
  return socketInstance!;
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useSocket() {
  const socket = useRef<TypedSocket>(getSocket());

  // All consumers share the same connection state via useSyncExternalStore
  const state = useSyncExternalStore(
    subscribeConnectionState,
    getConnectionState,
    getServerConnectionState,
  );

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

  const manualReconnect = useCallback(() => {
    setConnectionState({
      reconnectFailed: false,
      reconnecting: true,
      reconnectAttempt: 0,
    });

    // After all auto-reconnect attempts are exhausted, Socket.IO's
    // internal state machine is stuck. A simple socket.connect() opens
    // the transport but never fires the namespace "connect" event.
    // The reliable fix is to fully reload the page, which creates a
    // fresh socket and re-initialises all game state cleanly.
    window.location.reload();
  }, []);

  return {
    socket,
    emit,
    on,
    connected: state.connected,
    reconnecting: state.reconnecting,
    reconnectAttempt: state.reconnectAttempt,
    reconnectFailed: state.reconnectFailed,
    manualReconnect,
  };
}
