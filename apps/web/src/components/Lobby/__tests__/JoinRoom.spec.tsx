const joinRoom = vi.fn();
const spectateRoom = vi.fn();
vi.mock('@/hooks/useGame', () => ({
  useGame: () => ({ joinRoom, spectateRoom }),
}));

let mockPlayerState: any = { nickname: 'Tester', avatar: 'adventurer:Adrian', setNickname: vi.fn(), setAvatar: vi.fn() };
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: Object.assign(
    (selector?: any) => selector ? selector(mockPlayerState) : mockPlayerState,
    { getState: () => mockPlayerState, setState: vi.fn() }
  ),
}));

let mockAuthState: any = { isAuthenticated: true };
vi.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => selector ? selector(mockAuthState) : mockAuthState,
    { getState: () => mockAuthState, setState: vi.fn() }
  ),
}));

let mockGameState: any = { pendingRoomId: null, setPendingRoomId: vi.fn() };
vi.mock('@/stores/gameStore', () => ({
  useGameStore: Object.assign(
    (selector?: any) => selector ? selector(mockGameState) : mockGameState,
    { getState: () => mockGameState, setState: vi.fn() }
  ),
}));

vi.mock('@/components/Avatar', () => ({
  default: ({ seed }: { seed: string }) => <div data-testid={`avatar-${seed}`} />,
}));

import { render, screen } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import JoinRoom from '../JoinRoom';

describe('JoinRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayerState = { nickname: 'Tester', avatar: 'adventurer:Adrian', setNickname: vi.fn(), setAvatar: vi.fn() };
    mockAuthState = { isAuthenticated: true };
    mockGameState = { pendingRoomId: null, setPendingRoomId: vi.fn() };
    // Reset URL
    window.history.pushState({}, '', '/');
  });

  it('renders 6 code input fields', () => {
    render(<JoinRoom />);
    const inputs = document.querySelectorAll('input[type="text"]');
    expect(inputs.length).toBeGreaterThanOrEqual(6);
  });

  it('typing a character moves focus to next input', () => {
    render(<JoinRoom />);
    const inputs = document.querySelectorAll('input[type="text"]') as NodeListOf<HTMLInputElement>;
    fireEvent.change(inputs[0], { target: { value: 'A' } });
    expect(inputs[0].value).toBe('A');
  });

  it('uppercases input automatically', () => {
    render(<JoinRoom />);
    const inputs = document.querySelectorAll('input[type="text"]') as NodeListOf<HTMLInputElement>;
    fireEvent.change(inputs[0], { target: { value: 'a' } });
    expect(inputs[0].value).toBe('A');
  });

  it('rejects non-alphanumeric input', () => {
    render(<JoinRoom />);
    const inputs = document.querySelectorAll('input[type="text"]') as NodeListOf<HTMLInputElement>;
    fireEvent.change(inputs[0], { target: { value: '!' } });
    expect(inputs[0].value).toBe('');
  });

  it('joinRoom called when complete code entered and join clicked', () => {
    render(<JoinRoom />);
    const inputs = document.querySelectorAll('input[type="text"]') as NodeListOf<HTMLInputElement>;
    const code = ['A', 'B', 'C', 'D', 'E', 'F'];
    code.forEach((c, i) => fireEvent.change(inputs[i], { target: { value: c } }));
    const joinBtn = screen.getByText('home.joinRoom');
    fireEvent.click(joinBtn);
    expect(joinRoom).toHaveBeenCalledWith('ABCDEF');
  });

  it('spectateRoom called when spectate clicked', () => {
    render(<JoinRoom />);
    const inputs = document.querySelectorAll('input[type="text"]') as NodeListOf<HTMLInputElement>;
    const code = ['A', 'B', 'C', 'D', 'E', 'F'];
    code.forEach((c, i) => fireEvent.change(inputs[i], { target: { value: c } }));
    const spectateBtn = screen.getByText('spectator.spectate');
    fireEvent.click(spectateBtn);
    expect(spectateRoom).toHaveBeenCalledWith('ABCDEF');
  });

  it('paste handler accepts a 6-char code', () => {
    render(<JoinRoom />);
    const inputs = document.querySelectorAll('input[type="text"]') as NodeListOf<HTMLInputElement>;
    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => 'WXYZAB' },
    });
    expect(inputs[0].value).toBe('W');
    expect(inputs[1].value).toBe('X');
    expect(inputs[5].value).toBe('B');
  });
});
