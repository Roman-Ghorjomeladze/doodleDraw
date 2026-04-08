const listeners = new Map<string, Function>();
const emit = vi.fn();
const on = vi.fn((event: string, cb: Function) => {
  listeners.set(event, cb);
  return () => listeners.delete(event);
});

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({ emit, on, connected: true, socketVersion: 0 }),
}));

const joinRoom = vi.fn();
vi.mock('@/hooks/useGame', () => ({
  useGame: () => ({ joinRoom }),
}));

let mockPlayerState: any = { nickname: 'Tester', setNickname: vi.fn() };
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
import AvailableRooms from '../AvailableRooms';

const sampleRoom = {
  id: 'room1',
  hostNickname: 'Alice',
  hostAvatar: 'adventurer:Alice',
  mode: 'classic' as const,
  playerCount: 2,
  maxPlayers: 8,
  createdAt: Date.now(),
};

describe('AvailableRooms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
    mockPlayerState = { nickname: 'Tester', setNickname: vi.fn() };
  });

  it('shows empty state when no rooms', () => {
    render(<AvailableRooms />);
    expect(screen.getByText('publicRooms.empty')).toBeInTheDocument();
  });

  it('emits rooms:list on mount', () => {
    render(<AvailableRooms />);
    expect(emit).toHaveBeenCalledWith('rooms:list');
  });

  it('renders room list when data arrives', () => {
    render(<AvailableRooms />);
    act(() => {
      listeners.get('rooms:list')?.({ rooms: [sampleRoom] });
    });
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('click join calls joinRoom', () => {
    render(<AvailableRooms />);
    act(() => {
      listeners.get('rooms:list')?.({ rooms: [sampleRoom] });
    });
    const joinBtn = screen.getByText('publicRooms.join');
    fireEvent.click(joinBtn);
    expect(joinRoom).toHaveBeenCalledWith('room1');
  });

  it('renders pagination', () => {
    render(<AvailableRooms />);
    act(() => {
      listeners.get('rooms:list')?.({ rooms: [sampleRoom] });
    });
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
  });
});
