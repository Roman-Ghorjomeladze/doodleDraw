const sendGuess = vi.fn();
vi.mock('@/hooks/useGame', () => ({
  useGame: () => ({ sendGuess }),
}));

let mockGameState: any = { messages: [], players: [] };
vi.mock('@/stores/gameStore', () => ({
  useGameStore: Object.assign(
    (selector?: any) => (selector ? selector(mockGameState) : mockGameState),
    { getState: () => mockGameState, setState: vi.fn() }
  ),
}));

let mockPlayerState: any = { isSpectator: false };
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: Object.assign(
    (selector?: any) => (selector ? selector(mockPlayerState) : mockPlayerState),
    { getState: () => mockPlayerState, setState: vi.fn() }
  ),
}));

vi.mock('@/utils/avatars', () => ({
  getAvatarSvg: () => '<svg/>',
  getAvatarDataUri: (seed: string) => `avatar://${seed}`,
}));

import { render, screen } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import GuessingChat from '../GuessingChat';

describe('GuessingChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGameState = { messages: [], players: [] };
    mockPlayerState = { isSpectator: false };
  });

  it('renders title when empty', () => {
    render(<GuessingChat isDrawer={false} />);
    expect(screen.getByText('chat.title')).toBeInTheDocument();
  });

  it('renders a list of messages', () => {
    mockGameState.messages = [
      { id: 'm1', playerId: 'p1', nickname: 'Alice', text: 'hello', isCorrectGuess: false, isCloseGuess: false, isSystemMessage: false },
      { id: 'm2', playerId: 'p2', nickname: 'Bob', text: 'world', isCorrectGuess: false, isCloseGuess: false, isSystemMessage: false },
    ];
    render(<GuessingChat isDrawer={false} />);
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
  });

  it('typing into input updates its value', () => {
    render(<GuessingChat isDrawer={false} />);
    const input = screen.getByPlaceholderText('chat.guessPlaceholder') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'cat' } });
    expect(input.value).toBe('cat');
  });

  it('submitting the form calls sendGuess and clears input', () => {
    const { container } = render(<GuessingChat isDrawer={false} />);
    const input = screen.getByPlaceholderText('chat.guessPlaceholder') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'cat' } });
    const form = container.querySelector('form')!;
    fireEvent.submit(form);
    expect(sendGuess).toHaveBeenCalledWith('cat');
    expect(input.value).toBe('');
  });

  it('drawer cannot type (input disabled)', () => {
    render(<GuessingChat isDrawer={true} />);
    const input = screen.getByPlaceholderText('chat.youreDrawing') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('lobby mode uses lobby placeholder and is not disabled for drawer', () => {
    render(<GuessingChat isDrawer={true} isLobby />);
    const input = screen.getByPlaceholderText('chat.lobbyPlaceholder') as HTMLInputElement;
    expect(input.disabled).toBe(false);
  });
});
