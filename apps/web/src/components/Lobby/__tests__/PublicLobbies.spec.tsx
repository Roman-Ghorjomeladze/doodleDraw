const listeners = new Map<string, Function>();
const emit = vi.fn();
const on = vi.fn((event: string, cb: Function) => {
  listeners.set(event, cb);
  return () => listeners.delete(event);
});

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({ socket: { current: {} }, emit, on, connected: true, socketVersion: 0 }),
}));

let mockPlayerState: any = { nickname: 'Tester', avatar: 'adventurer:Adrian', persistentId: 'pid-1' };
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: Object.assign(
    (selector?: any) => (selector ? selector(mockPlayerState) : mockPlayerState),
    { getState: () => mockPlayerState, setState: vi.fn() }
  ),
}));

let mockAuthState: any = { isAuthenticated: false, user: null };
vi.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => (selector ? selector(mockAuthState) : mockAuthState),
    { getState: () => mockAuthState, setState: vi.fn() }
  ),
}));

let mockSettingsState: any = { language: 'en' };
vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: Object.assign(
    (selector?: any) => (selector ? selector(mockSettingsState) : mockSettingsState),
    { getState: () => mockSettingsState, setState: vi.fn() }
  ),
}));

import { render, screen, act } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import PublicLobbies from '../PublicLobbies';

const sampleLobby = {
  id: 'lobby1',
  name: 'Main Lobby',
  mode: 'classic',
  status: 'waiting' as const,
  realPlayers: 2,
  maxPlayers: 8,
};

describe('PublicLobbies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
    mockPlayerState = { nickname: 'Tester', avatar: 'adventurer:Adrian', persistentId: 'pid-1' };
    mockAuthState = { isAuthenticated: false, user: null };
    mockSettingsState = { language: 'en' };
  });

  it('renders loading message when no lobbies', () => {
    render(<PublicLobbies />);
    expect(screen.getByText('lobbies.loading')).toBeInTheDocument();
  });

  it('renders lobby list when state arrives', () => {
    render(<PublicLobbies />);
    act(() => {
      listeners.get('lobbies:state')?.({ lobbies: [sampleLobby] });
    });
    expect(screen.getByText('Main Lobby')).toBeInTheDocument();
  });

  it('renders status badges', () => {
    render(<PublicLobbies />);
    act(() => {
      listeners.get('lobbies:state')?.({
        lobbies: [
          { ...sampleLobby, status: 'in_progress' },
        ],
      });
    });
    expect(screen.getByText('lobbies.inProgress')).toBeInTheDocument();
  });

  it('click join emits lobbies:join', () => {
    render(<PublicLobbies />);
    act(() => {
      listeners.get('lobbies:state')?.({ lobbies: [sampleLobby] });
    });
    const btn = screen.getByText('lobbies.join');
    fireEvent.click(btn);
    expect(emit).toHaveBeenCalledWith(
      'lobbies:join',
      expect.objectContaining({ lobbyId: 'lobby1', nickname: 'Tester', language: 'en' }),
    );
  });
});
