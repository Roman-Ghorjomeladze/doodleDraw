let mockGameState: any = { playerLeftNotice: null };
const setPlayerLeftNotice = vi.fn((value: string | null) => {
  mockGameState.playerLeftNotice = value;
});

vi.mock('@/stores/gameStore', () => ({
  useGameStore: Object.assign(
    (selector?: any) => selector ? selector(mockGameState) : mockGameState,
    {
      getState: () => ({ ...mockGameState, setPlayerLeftNotice }),
      setState: vi.fn(),
    }
  ),
}));

import { render, screen } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import PlayerLeftNotice from '../PlayerLeftNotice';

describe('PlayerLeftNotice', () => {
  beforeEach(() => {
    mockGameState.playerLeftNotice = null;
    setPlayerLeftNotice.mockClear();
  });

  it('renders nothing when notice is null', () => {
    mockGameState.playerLeftNotice = null;
    const { container } = render(<PlayerLeftNotice />);
    expect(container.querySelector('.fixed')).toBeNull();
  });

  it('renders modal with player name when notice is set', () => {
    mockGameState.playerLeftNotice = 'Alice';
    render(<PlayerLeftNotice />);
    expect(screen.getByText('game.playerLeft')).toBeInTheDocument();
  });

  it('shows return-to-lobby message', () => {
    mockGameState.playerLeftNotice = 'Bob';
    render(<PlayerLeftNotice />);
    expect(screen.getByText('game.returnedToLobby')).toBeInTheDocument();
  });

  it('dismiss button calls setPlayerLeftNotice with null', () => {
    mockGameState.playerLeftNotice = 'Alice';
    render(<PlayerLeftNotice />);
    fireEvent.click(screen.getByText('game.playerLeftOk'));
    expect(setPlayerLeftNotice).toHaveBeenCalledWith(null);
  });
});
