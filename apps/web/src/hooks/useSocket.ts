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

    // Attempt to reconnect to an existing game session using persistentId.
    const stored = localStorage.getItem('doodledraw-player');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const persistentId = parsed?.state?.persistentId;
        if (persistentId) {
          const roomId = sessionStorage.getItem('doodledraw_roomId');
          // Send reconnect even without roomId — server can look up by persistentId
          s.emit('game:reconnect', { roomId: roomId || undefined, persistentId });
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

function getAuthToken(): string | undefined {
  try {
    const stored = localStorage.getItem('doodledraw-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.token || undefined;
    }
  } catch {}
  return undefined;
}

function createSocket(): TypedSocket {
  const token = getAuthToken();
  const s = io('/game', {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: token ? { token } : undefined,
  });
  socketInstance = s;
  attachConnectionEvents(s);

  // Sync initial state (socket may already be connected by now)
  if (s.connected) {
    setConnectionState({ connected: true });
  }
  return s;
}

/**
 * Destroy the current socket and create a new one with updated auth.
 * Call this after login/register/logout to propagate the auth token.
 */
export function reconnectWithAuth(): void {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.io.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
  createSocket();
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
