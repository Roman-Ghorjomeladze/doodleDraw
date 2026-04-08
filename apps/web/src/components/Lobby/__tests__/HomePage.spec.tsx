vi.mock('../CreateRoom', () => ({
  default: () => <div data-testid="tab-create" />,
}));
vi.mock('../JoinRoom', () => ({
  default: () => <div data-testid="tab-join" />,
}));
vi.mock('../AvailableRooms', () => ({
  default: () => <div data-testid="tab-available" />,
}));
vi.mock('../OngoingGames', () => ({
  default: () => <div data-testid="tab-ongoing" />,
}));
vi.mock('../Leaderboard', () => ({
  default: () => <div data-testid="tab-leaderboard" />,
}));
vi.mock('../PublicLobbies', () => ({
  default: () => <div data-testid="tab-lobbies" />,
}));

vi.mock('@/components/UI/AnimatedLogo', () => ({
  default: ({ text }: any) => <div data-testid="logo">{text}</div>,
}));

const emit = vi.fn();
const on = vi.fn(() => vi.fn());
vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({ emit, on, connected: true, socketVersion: 0 }),
}));

const joinRoom = vi.fn();
vi.mock('@/hooks/useGame', () => ({
  useGame: () => ({ joinRoom }),
}));

let mockGameState: any = { roomId: null };
vi.mock('@/stores/gameStore', () => ({
  useGameStore: Object.assign(
    (selector?: any) => (selector ? selector(mockGameState) : mockGameState),
    { getState: () => mockGameState, setState: vi.fn() }
  ),
}));

let mockSettingsState: any = { homeLayout: 'tabs' };
vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: Object.assign(
    (selector?: any) => (selector ? selector(mockSettingsState) : mockSettingsState),
    { getState: () => mockSettingsState, setState: vi.fn() }
  ),
}));

let mockAuthState: any = { isAuthenticated: false };
vi.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => (selector ? selector(mockAuthState) : mockAuthState),
    { getState: () => mockAuthState, setState: vi.fn() }
  ),
}));

let mockPlayerState: any = { persistentId: 'pid-1', nickname: 'Tester', avatar: 'adventurer:Adrian' };
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: Object.assign(
    (selector?: any) => (selector ? selector(mockPlayerState) : mockPlayerState),
    { getState: () => mockPlayerState, setState: vi.fn() }
  ),
}));

import { render, screen } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import HomePage from '../HomePage';

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGameState = { roomId: null };
    mockSettingsState = { homeLayout: 'tabs' };
    mockAuthState = { isAuthenticated: false };
    mockPlayerState = { persistentId: 'pid-1', nickname: 'Tester', avatar: 'adventurer:Adrian' };
    window.history.pushState({}, '', '/');
  });

  it('renders 6 tab buttons', () => {
    const { container } = render(<HomePage />);
    // Each tab button has a title attribute set from label key.
    const buttons = container.querySelectorAll('button[title]');
    expect(buttons.length).toBeGreaterThanOrEqual(6);
  });

  it('default tab is create', () => {
    render(<HomePage />);
    expect(screen.getByTestId('tab-create')).toBeInTheDocument();
  });

  it('clicking join tab switches content', () => {
    render(<HomePage />);
    fireEvent.click(screen.getByTitle('home.joinRoom'));
    expect(screen.getByTestId('tab-join')).toBeInTheDocument();
  });

  it('clicking available tab switches content', () => {
    render(<HomePage />);
    fireEvent.click(screen.getByTitle('home.availableRooms'));
    expect(screen.getByTestId('tab-available')).toBeInTheDocument();
  });

  it('clicking leaderboard tab switches content', () => {
    render(<HomePage />);
    fireEvent.click(screen.getByTitle('leaderboard.title'));
    expect(screen.getByTestId('tab-leaderboard')).toBeInTheDocument();
  });
});
