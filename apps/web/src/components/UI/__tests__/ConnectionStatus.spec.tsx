let mockConnState = {
  connected: true,
  reconnecting: false,
  reconnectAttempt: 0,
  reconnectFailed: false,
  manualReconnect: vi.fn(),
};
vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => mockConnState,
}));

let mockGameState: any = { roomId: null };
vi.mock('@/stores/gameStore', () => ({
  useGameStore: Object.assign(
    (selector?: any) => selector ? selector(mockGameState) : mockGameState,
    { getState: () => mockGameState, setState: vi.fn() }
  ),
}));

import { render, screen } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import ConnectionStatus from '../ConnectionStatus';

describe('ConnectionStatus', () => {
  beforeEach(() => {
    mockConnState = { connected: true, reconnecting: false, reconnectAttempt: 0, reconnectFailed: false, manualReconnect: vi.fn() };
    mockGameState = { roomId: null };
  });

  it('hidden when connected', () => {
    mockConnState.connected = true;
    mockGameState.roomId = 'ROOM1';
    const { container } = render(<ConnectionStatus />);
    expect(container.querySelector('.bg-warning-500')).toBeNull();
  });

  it('hidden when no roomId even if disconnected', () => {
    mockConnState.connected = false;
    mockGameState.roomId = null;
    const { container } = render(<ConnectionStatus />);
    expect(container.querySelector('.bg-warning-500')).toBeNull();
  });

  it('shows reconnecting state', () => {
    mockConnState.connected = false;
    mockConnState.reconnecting = true;
    mockConnState.reconnectAttempt = 3;
    mockGameState.roomId = 'ROOM1';
    render(<ConnectionStatus />);
    expect(screen.getByText('connection.reconnecting')).toBeInTheDocument();
  });

  it('shows failed state', () => {
    mockConnState.connected = false;
    mockConnState.reconnectFailed = true;
    mockGameState.roomId = 'ROOM1';
    render(<ConnectionStatus />);
    expect(screen.getByText('connection.failed')).toBeInTheDocument();
  });

  it('manual reconnect button calls handler', () => {
    mockConnState.connected = false;
    mockGameState.roomId = 'ROOM1';
    render(<ConnectionStatus />);
    const btn = screen.getByText('connection.reconnect');
    fireEvent.click(btn);
    expect(mockConnState.manualReconnect).toHaveBeenCalled();
  });
});
