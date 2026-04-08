vi.mock('../PlayerList', () => ({
  default: () => <div data-testid="player-list" />,
}));

vi.mock('@/components/Game/GuessingChat', () => ({
  default: () => <div data-testid="guessing-chat" />,
}));

vi.mock('@/components/UI/ConfirmModal', () => ({
  default: ({ title, onConfirm, onCancel }: any) => (
    <div data-testid="confirm-modal">
      <div>{title}</div>
      <button onClick={onConfirm}>confirm</button>
      <button onClick={onCancel}>cancel</button>
    </div>
  ),
}));

vi.mock('@/components/Friends/InviteFriendsModal', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="invite-friends-modal">
      <button onClick={onClose}>close</button>
    </div>
  ),
}));

const startGame = vi.fn();
const cancelStartGame = vi.fn();
const leaveRoom = vi.fn();
const updateSettings = vi.fn();
const switchTeam = vi.fn();
const kickPlayer = vi.fn();
const addBot = vi.fn();

vi.mock('@/hooks/useGame', () => ({
  useGame: () => ({
    startGame,
    cancelStartGame,
    leaveRoom,
    updateSettings,
    switchTeam,
    kickPlayer,
    addBot,
  }),
}));

const defaultSettings = {
  maxPlayers: 8,
  language: 'en',
  difficulty: 2,
  roundTime: 80,
  totalRounds: 5,
  hintsEnabled: true,
  redrawEnabled: false,
  isPublic: false,
  teamAName: 'Team A',
  teamBName: 'Team B',
};

let mockGameState: any;
vi.mock('@/stores/gameStore', () => ({
  useGameStore: Object.assign(
    (selector?: any) => (selector ? selector(mockGameState) : mockGameState),
    { getState: () => mockGameState, setState: vi.fn() }
  ),
}));

let mockPlayerState: any;
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: Object.assign(
    (selector?: any) => (selector ? selector(mockPlayerState) : mockPlayerState),
    { getState: () => mockPlayerState, setState: vi.fn() }
  ),
}));

let mockAuthState: any;
vi.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => (selector ? selector(mockAuthState) : mockAuthState),
    { getState: () => mockAuthState, setState: vi.fn() }
  ),
}));

import { render, screen } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import RoomLobby from '../RoomLobby';

const makePlayer = (id: string, overrides: any = {}) => ({
  id,
  persistentId: `p-${id}`,
  nickname: id,
  avatar: `adventurer:${id}`,
  team: null,
  score: 0,
  isHost: false,
  isDrawing: false,
  isBot: false,
  isSpectator: false,
  isConnected: true,
  ...overrides,
});

describe('RoomLobby', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGameState = {
      roomId: 'R1',
      mode: 'classic',
      players: [makePlayer('p1'), makePlayer('p2')],
      isHost: true,
      settings: defaultSettings,
      countdownSeconds: null,
    };
    mockPlayerState = { playerId: 'p1' };
    mockAuthState = { isAuthenticated: false };
  });

  it('shows start button when host and min players met', () => {
    render(<RoomLobby />);
    expect(screen.getByText('lobby.startGame')).toBeInTheDocument();
  });

  it('start button disabled when not enough players', () => {
    mockGameState.players = [makePlayer('p1')];
    render(<RoomLobby />);
    const btn = screen.getByText(/lobby\.needMorePlayers/) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('clicking start calls startGame', () => {
    render(<RoomLobby />);
    fireEvent.click(screen.getByText('lobby.startGame'));
    expect(startGame).toHaveBeenCalled();
  });

  it('clicking leave shows confirm modal', () => {
    render(<RoomLobby />);
    fireEvent.click(screen.getByText('lobby.leave'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
  });

  it('confirming leave calls leaveRoom', () => {
    render(<RoomLobby />);
    fireEvent.click(screen.getByText('lobby.leave'));
    fireEvent.click(screen.getByText('confirm'));
    expect(leaveRoom).toHaveBeenCalled();
  });

  it('shows add bot button for host when under capacity', () => {
    render(<RoomLobby />);
    expect(screen.getByText(/lobby\.addBot/)).toBeInTheDocument();
  });

  it('hides add bot button for non-host', () => {
    mockGameState.isHost = false;
    render(<RoomLobby />);
    expect(screen.queryByText(/lobby\.addBot/)).not.toBeInTheDocument();
  });

  it('shows invite friends button only when authenticated', () => {
    render(<RoomLobby />);
    expect(screen.queryByText('friends.inviteFriends')).not.toBeInTheDocument();

    mockAuthState.isAuthenticated = true;
    const { rerender } = render(<RoomLobby />);
    rerender(<RoomLobby />);
    expect(screen.getByText('friends.inviteFriends')).toBeInTheDocument();
  });
});
