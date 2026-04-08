const login = vi.fn();
const register = vi.fn();
vi.mock('@/utils/authApi', () => ({
  authApi: {
    login: (...args: any[]) => login(...args),
    register: (...args: any[]) => register(...args),
  },
}));

const setAuth = vi.fn();
let mockAuthState: any = { setAuth };
vi.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => (selector ? selector(mockAuthState) : mockAuthState),
    { getState: () => mockAuthState, setState: vi.fn() }
  ),
}));

const syncFromAuth = vi.fn();
let mockPlayerState: any = {
  persistentId: 'pid-1',
  nickname: 'Tester',
  avatar: 'adventurer:Adrian',
  syncFromAuth,
};
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: Object.assign(
    (selector?: any) => (selector ? selector(mockPlayerState) : mockPlayerState),
    { getState: () => mockPlayerState, setState: vi.fn() }
  ),
}));

const reconnectWithAuth = vi.fn();
vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({ emit: vi.fn(), on: vi.fn(() => vi.fn()), connected: true, socketVersion: 0 }),
  reconnectWithAuth: () => reconnectWithAuth(),
}));

import { render, screen, waitFor } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import AuthModal from '../AuthModal';

describe('AuthModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { setAuth };
    mockPlayerState = {
      persistentId: 'pid-1',
      nickname: 'Tester',
      avatar: 'adventurer:Adrian',
      syncFromAuth,
    };
  });

  it('renders login and register tabs', () => {
    render(<AuthModal onClose={vi.fn()} />);
    expect(screen.getAllByText('auth.login').length).toBeGreaterThan(0);
    expect(screen.getAllByText('auth.register').length).toBeGreaterThan(0);
  });

  it('default tab is login', () => {
    render(<AuthModal onClose={vi.fn()} />);
    // Login form has username + password placeholders from t('auth.username'), t('auth.password')
    const usernameInputs = screen.getAllByPlaceholderText('auth.username');
    expect(usernameInputs.length).toBeGreaterThan(0);
  });

  it('clicking register tab switches form', () => {
    render(<AuthModal onClose={vi.fn()} />);
    const registerBtns = screen.getAllByText('auth.register');
    // First occurrence is the tab button.
    fireEvent.click(registerBtns[0]);
    expect(screen.getByPlaceholderText('Username or email')).toBeInTheDocument();
  });

  it('login form submit calls authApi.login', async () => {
    login.mockResolvedValue({
      token: 't',
      user: { id: 'u', nickname: 'Tester', avatar: 'a', persistentId: 'pid-1' },
    });
    const onClose = vi.fn();
    const { container } = render(<AuthModal onClose={onClose} />);

    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'alice' } });
    fireEvent.change(inputs[1], { target: { value: 'secret' } });

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'alice', password: 'secret' }),
      );
    });
  });

  it('shows error when login fails', async () => {
    login.mockRejectedValue(new Error('Bad credentials'));
    const { container } = render(<AuthModal onClose={vi.fn()} />);
    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'alice' } });
    fireEvent.change(inputs[1], { target: { value: 'wrong' } });
    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Bad credentials')).toBeInTheDocument();
    });
  });

  it('register form submit calls authApi.register', async () => {
    register.mockResolvedValue({
      token: 't',
      user: { id: 'u', nickname: 'Tester', avatar: 'a', persistentId: 'pid-1' },
    });
    const onClose = vi.fn();
    const { container } = render(<AuthModal onClose={onClose} />);

    // Switch to register tab.
    const registerBtns = screen.getAllByText('auth.register');
    fireEvent.click(registerBtns[0]);

    const usernameInput = screen.getByPlaceholderText('Username or email') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Min 6 characters') as HTMLInputElement;
    fireEvent.change(usernameInput, { target: { value: 'alice' } });
    fireEvent.change(passwordInput, { target: { value: 'secret1' } });

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'alice', password: 'secret1' }),
      );
    });
  });

  it('successful login calls reconnectWithAuth and onClose', async () => {
    login.mockResolvedValue({
      token: 't',
      user: { id: 'u', nickname: 'Tester', avatar: 'a', persistentId: 'pid-1' },
    });
    const onClose = vi.fn();
    const { container } = render(<AuthModal onClose={onClose} />);
    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'alice' } });
    fireEvent.change(inputs[1], { target: { value: 'secret' } });
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(reconnectWithAuth).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('clicking backdrop calls onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<AuthModal onClose={onClose} />);
    // The outermost motion div is the backdrop.
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});
