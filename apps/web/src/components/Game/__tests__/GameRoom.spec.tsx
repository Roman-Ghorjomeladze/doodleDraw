vi.mock('../ClassicMode', () => ({
  default: () => <div data-testid="classic-mode" />,
}));
vi.mock('../TeamMode', () => ({
  default: () => <div data-testid="team-mode" />,
}));

let mockMode: 'classic' | 'team' | null = 'classic';
vi.mock('@/stores/gameStore', () => ({
  useGameStore: Object.assign(
    (selector?: any) => {
      const state = { mode: mockMode };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ mode: mockMode }),
      setState: vi.fn(),
    }
  ),
}));

import { render, screen } from '@/test/test-utils';
import GameRoom from '../GameRoom';

describe('GameRoom', () => {
  it('renders ClassicMode when mode is classic', () => {
    mockMode = 'classic';
    render(<GameRoom />);
    expect(screen.getByTestId('classic-mode')).toBeInTheDocument();
  });

  it('renders TeamMode when mode is team', () => {
    mockMode = 'team';
    render(<GameRoom />);
    expect(screen.getByTestId('team-mode')).toBeInTheDocument();
  });

  it('renders ClassicMode when mode is null (fallback)', () => {
    mockMode = null;
    render(<GameRoom />);
    expect(screen.getByTestId('classic-mode')).toBeInTheDocument();
  });
});
