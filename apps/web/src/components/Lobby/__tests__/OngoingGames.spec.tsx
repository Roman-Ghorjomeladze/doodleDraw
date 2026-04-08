const listeners = new Map<string, Function>();
const emit = vi.fn();
const on = vi.fn((event: string, cb: Function) => {
  listeners.set(event, cb);
  return () => listeners.delete(event);
});

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({ emit, on, connected: true, socketVersion: 0 }),
}));

const spectateRoom = vi.fn();
vi.mock('@/hooks/useGame', () => ({
  useGame: () => ({ spectateRoom }),
}));

let mockPlayerState: any = { nickname: 'Tester' };
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: Object.assign(
    (selector?: any) => (selector ? selector(mockPlayerState) : mockPlayerState),
    { getState: () => mockPlayerState, setState: vi.fn() }
  ),
}));

vi.mock('@/components/Avatar', () => ({
  default: ({ seed }: { seed: string }) => <div data-testid={`avatar-${seed}`} />,
}));

vi.mock('@/components/UI/Pagination', () => ({
  default: ({ currentPage, totalPages }: any) => (
    <div data-testid="pagination">page {currentPage}/{totalPages}</div>
  ),
}));

import { render, screen, act } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import OngoingGames from '../OngoingGames';

const sampleGame = {
  id: 'game1',
  hostNickname: 'Bob',
  hostAvatar: 'adventurer:Bob',
  mode: 'classic' as const,
  phase: 'drawing' as const,
  currentRound: 2,
  totalRounds: 5,
  playerCount: 3,
  spectatorCount: 0,
  createdAt: Date.now(),
};

describe('OngoingGames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
    mockPlayerState = { nickname: 'Tester' };
  });

  it('shows empty state when no games', () => {
    render(<OngoingGames />);
    expect(screen.getByText('ongoingGames.empty')).toBeInTheDocument();
  });

  it('emits rooms:ongoingList on mount', () => {
    render(<OngoingGames />);
    expect(emit).toHaveBeenCalledWith('rooms:ongoingList');
  });

  it('renders games list when data arrives', () => {
    render(<OngoingGames />);
    act(() => {
      listeners.get('rooms:ongoingList')?.({ rooms: [sampleGame] });
    });
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('click spectate calls spectateRoom', () => {
    render(<OngoingGames />);
    act(() => {
      listeners.get('rooms:ongoingList')?.({ rooms: [sampleGame] });
    });
    const btn = screen.getByText('ongoingGames.spectate');
    fireEvent.click(btn);
    expect(spectateRoom).toHaveBeenCalledWith('game1');
  });

  it('renders phase badge', () => {
    render(<OngoingGames />);
    act(() => {
      listeners.get('rooms:ongoingList')?.({ rooms: [sampleGame] });
    });
    expect(screen.getByText('ongoingGames.phase.drawing')).toBeInTheDocument();
  });
});
