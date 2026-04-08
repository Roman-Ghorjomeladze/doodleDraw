vi.mock('@/components/Avatar', () => ({
  default: ({ seed }: { seed: string }) => <div data-testid={`avatar-${seed}`} />,
}));

vi.mock('@/components/Profile/ProfileModal', () => ({
  default: vi.fn(() => null),
}));

import { render, screen } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import PlayerList from '../PlayerList';

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

describe('PlayerList', () => {
  it('renders classic mode as a flat list', () => {
    const players = [makePlayer('Alice'), makePlayer('Bob')];
    render(<PlayerList players={players} mode="classic" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders team mode grouped into teams', () => {
    const players = [
      makePlayer('Alice', { team: 'A' }),
      makePlayer('Bob', { team: 'B' }),
    ];
    render(
      <PlayerList
        players={players}
        mode="team"
        teamAName="Red"
        teamBName="Blue"
      />,
    );
    expect(screen.getByText(/Red/)).toBeInTheDocument();
    expect(screen.getByText(/Blue/)).toBeInTheDocument();
  });

  it('shows host crown', () => {
    const players = [makePlayer('Host', { isHost: true })];
    const { container } = render(<PlayerList players={players} mode="classic" />);
    expect(container.textContent).toContain('👑');
  });

  it('shows drawing indicator', () => {
    const players = [makePlayer('Drawer', { isDrawing: true })];
    const { container } = render(<PlayerList players={players} mode="classic" />);
    expect(container.textContent).toContain('✏️');
  });

  it('shows bot badge', () => {
    const players = [makePlayer('Bot1', { isBot: true })];
    const { container } = render(<PlayerList players={players} mode="classic" />);
    expect(container.textContent).toContain('🤖');
  });

  it('clicking player calls onPlayerClick with persistentId', () => {
    const onPlayerClick = vi.fn();
    const players = [makePlayer('Alice')];
    render(<PlayerList players={players} mode="classic" onPlayerClick={onPlayerClick} />);
    fireEvent.click(screen.getByText('Alice'));
    expect(onPlayerClick).toHaveBeenCalledWith('p-Alice');
  });
});
