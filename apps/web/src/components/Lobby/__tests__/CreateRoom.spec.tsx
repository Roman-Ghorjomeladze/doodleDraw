const createRoom = vi.fn();
vi.mock('@/hooks/useGame', () => ({
  useGame: () => ({ createRoom }),
}));

let mockPlayerState: any = { nickname: 'Tester', avatar: 'adventurer:Adrian', setNickname: vi.fn(), setAvatar: vi.fn() };
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: Object.assign(
    (selector?: any) => selector ? selector(mockPlayerState) : mockPlayerState,
    { getState: () => mockPlayerState, setState: vi.fn() }
  ),
}));

let mockAuthState: any = { isAuthenticated: false };
vi.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => selector ? selector(mockAuthState) : mockAuthState,
    { getState: () => mockAuthState, setState: vi.fn() }
  ),
}));

vi.mock('@/components/Avatar', () => ({
  default: ({ seed }: { seed: string }) => <div data-testid={`avatar-${seed}`} />,
}));

import { render, screen } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import CreateRoom from '../CreateRoom';

describe('CreateRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayerState = { nickname: 'Tester', avatar: 'adventurer:Adrian', setNickname: vi.fn(), setAvatar: vi.fn() };
    mockAuthState = { isAuthenticated: false };
  });

  it('renders mode selector with classic and team', () => {
    render(<CreateRoom />);
    expect(screen.getByText('create.classic')).toBeInTheDocument();
    expect(screen.getByText('create.teamBattle')).toBeInTheDocument();
  });

  it('clicking team mode changes selection', () => {
    render(<CreateRoom />);
    fireEvent.click(screen.getByText('create.teamBattle'));
    // Now team button should have primary background
    const teamBtn = screen.getByText('create.teamBattle').closest('button');
    expect(teamBtn?.className).toContain('bg-primary-500');
  });

  it('shows nickname input when not authenticated', () => {
    render(<CreateRoom />);
    expect(screen.getByPlaceholderText('create.nicknamePlaceholder')).toBeInTheDocument();
  });

  it('hides nickname input when authenticated', () => {
    mockAuthState.isAuthenticated = true;
    render(<CreateRoom />);
    expect(screen.queryByPlaceholderText('create.nicknamePlaceholder')).not.toBeInTheDocument();
  });

  it('createRoom is called with mode and isPublic option', () => {
    render(<CreateRoom />);
    fireEvent.click(screen.getByText('home.createRoom'));
    expect(createRoom).toHaveBeenCalledWith('classic', { isPublic: false });
  });

  it('public toggle is included in createRoom call', () => {
    render(<CreateRoom />);
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByText('home.createRoom'));
    expect(createRoom).toHaveBeenCalledWith('classic', { isPublic: true });
  });

  it('create button disabled when nickname is empty', () => {
    mockPlayerState.nickname = '';
    render(<CreateRoom />);
    const btn = screen.getByText('home.createRoom') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('shows avatar grid when not authenticated', () => {
    render(<CreateRoom />);
    const avatars = document.querySelectorAll('[data-testid^="avatar-"]');
    expect(avatars.length).toBeGreaterThan(0);
  });
});
