vi.mock('@/utils/leaderboardApi', () => ({
  leaderboardApi: { get: vi.fn() },
}));

// Imported after mock so the factory above has already been hoisted.
import { leaderboardApi } from '@/utils/leaderboardApi';
const mockGet = leaderboardApi.get as unknown as ReturnType<typeof vi.fn>;

let mockAuthState: any = { isAuthenticated: false, user: null };
vi.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => (selector ? selector(mockAuthState) : mockAuthState),
    { getState: () => mockAuthState, setState: vi.fn() }
  ),
}));

vi.mock('@/components/UI/CountrySelect', () => ({
  default: vi.fn(() => null),
}));

vi.mock('@/components/Profile/ProfileModal', () => ({
  default: vi.fn(({ persistentId }: any) =>
    persistentId ? <div data-testid="profile-modal">{persistentId}</div> : null,
  ),
}));

import { render, screen, waitFor } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import Leaderboard from '../Leaderboard';

const samplePlayer = {
  persistentId: 'pid-1',
  nickname: 'Alice',
  avatar: 'adventurer:Alice',
  country: 'US',
  rank: 1,
  totalGames: 10,
  totalWins: 6,
  eloRating: 1300,
};

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { isAuthenticated: false, user: null };
    mockGet.mockResolvedValue({ players: [], type: 'allTime' });
  });

  it('renders allTime and weekly tabs by default', () => {
    render(<Leaderboard />);
    expect(screen.getByText('leaderboard.allTime')).toBeInTheDocument();
    expect(screen.getByText('leaderboard.thisWeek')).toBeInTheDocument();
  });

  it('calls leaderboardApi.get with allTime type on mount', async () => {
    render(<Leaderboard />);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'allTime' }),
      );
    });
  });

  it('shows country and age tabs when authenticated with profile data', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { country: 'US', birthYear: 2000 },
    };
    render(<Leaderboard />);
    expect(screen.getByText('leaderboard.byCountry')).toBeInTheDocument();
    expect(screen.getByText(/leaderboard\.byAge/)).toBeInTheDocument();
  });

  it('clicking weekly tab calls leaderboardApi.get with weekly type', async () => {
    render(<Leaderboard />);
    mockGet.mockClear();
    fireEvent.click(screen.getByText('leaderboard.thisWeek'));
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'weekly' }),
      );
    });
  });

  it('renders player rows when data arrives', async () => {
    mockGet.mockResolvedValue({ players: [samplePlayer], type: 'allTime' });
    render(<Leaderboard />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  it('clicking player row opens profile modal', async () => {
    mockGet.mockResolvedValue({ players: [samplePlayer], type: 'allTime' });
    render(<Leaderboard />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Alice'));
    expect(screen.getByTestId('profile-modal')).toHaveTextContent('pid-1');
  });

  it('shows empty state when API returns no players', async () => {
    mockGet.mockResolvedValue({ players: [], type: 'allTime' });
    render(<Leaderboard />);
    await waitFor(() => {
      expect(screen.getByText('leaderboard.noPlayers')).toBeInTheDocument();
    });
  });

  it('falls back to empty list on API error', async () => {
    mockGet.mockRejectedValue(new Error('network down'));
    render(<Leaderboard />);
    await waitFor(() => {
      expect(screen.getByText('leaderboard.noPlayers')).toBeInTheDocument();
    });
  });
});
