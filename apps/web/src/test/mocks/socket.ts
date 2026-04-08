import { vi } from 'vitest';

export function createMockSocket() {
  return {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()), // returns unsubscribe fn
    connected: true,
    reconnecting: false,
    reconnectAttempt: 0,
    reconnectFailed: false,
    manualReconnect: vi.fn(),
    socketVersion: 0,
    socket: { current: {} },
  };
}
