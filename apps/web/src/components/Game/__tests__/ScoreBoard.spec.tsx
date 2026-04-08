const leaveRoom = vi.fn();
const rematchVote = vi.fn();
vi.mock('@/hooks/useGame', () => ({
  useGame: () => ({ leaveRoom, rematchVote }),
}));

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

vi.mock('@/components/Profile/ProfileModal', () => ({
  default: vi.fn(() => null),
}));

import { render, screen } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import ScoreBoard from '../ScoreBoard';

describe('ScoreBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGameState = {
      scores: [],
      mode: 'classic',
      teamAScore: 0,
      teamBScore: 0,
      settings: null,
      rematchState: null,
      players: [],
    };
    mockPlayerState = { isSpectator: false, playerId: 'p1' };
  });

  it('renders classic-mode ranked list', () => {
    mockGameState.scores = [
      { playerId: 'p1', nickname: 'Alice', score: 100 },
      { playerId: 'p2', nickname: 'Bob', score: 50 },
    ];
    render(<ScoreBoard />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders team-mode scores with team names', () => {
    mockGameState = {
      ...mockGameState,
      mode: 'team',
      scores: [
        { playerId: 'p1', nickname: 'Alice', score: 80, team: 'A' },
        { playerId: 'p2', nickname: 'Bob', score: 40, team: 'B' },
      ],
      teamAScore: 80,
      teamBScore: 40,
      settings: { teamAName: 'Red', teamBName: 'Blue' },
    };
    render(<ScoreBoard />);
    expect(screen.getAllByText('Red').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Blue').length).toBeGreaterThan(0);
  });

  it('shows medal icons for top 3', () => {
    mockGameState.scores = [
      { playerId: 'p1', nickname: 'Alice', score: 100 },
      { playerId: 'p2', nickname: 'Bob', score: 80 },
      { playerId: 'p3', nickname: 'Carol', score: 60 },
    ];
    const { container } = render(<ScoreBoard />);
    expect(container.textContent).toContain('🥇');
    expect(container.textContent).toContain('🥈');
    expect(container.textContent).toContain('🥉');
  });

  it('rematch button calls rematchVote with accepted', () => {
    mockGameState.scores = [{ playerId: 'p1', nickname: 'Alice', score: 100 }];
    render(<ScoreBoard />);
    fireEvent.click(screen.getByText('score.rematch'));
    expect(rematchVote).toHaveBeenCalledWith('accepted');
  });

  it('back to home button calls leaveRoom', () => {
    mockGameState.scores = [{ playerId: 'p1', nickname: 'Alice', score: 100 }];
    render(<ScoreBoard />);
    fireEvent.click(screen.getByText('score.backToHome'));
    expect(leaveRoom).toHaveBeenCalled();
  });
});
