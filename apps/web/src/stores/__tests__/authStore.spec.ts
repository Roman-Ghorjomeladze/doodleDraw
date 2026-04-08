import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import type { AuthUser } from '@doodledraw/shared';

const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  username: 'alice',
  nickname: 'Alice',
  avatar: 'av-1',
  country: 'US',
  birthYear: 1990,
  persistentId: 'pid-1',
  ...overrides,
});

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  });

  it('has expected initial state', () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('exposes the actions', () => {
    const state = useAuthStore.getState();
    expect(typeof state.setAuth).toBe('function');
    expect(typeof state.clearAuth).toBe('function');
    expect(typeof state.updateUser).toBe('function');
  });

  it('setAuth stores token, user and sets isAuthenticated true', () => {
    const user = makeUser();
    useAuthStore.getState().setAuth('jwt-token', user);

    const state = useAuthStore.getState();
    expect(state.token).toBe('jwt-token');
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
  });

  it('clearAuth resets all auth fields', () => {
    useAuthStore.getState().setAuth('jwt-token', makeUser());
    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('updateUser merges partial fields into existing user', () => {
    useAuthStore.getState().setAuth('jwt', makeUser({ nickname: 'Old' }));
    useAuthStore.getState().updateUser({ nickname: 'New', country: 'CA' });

    const user = useAuthStore.getState().user;
    expect(user).not.toBeNull();
    expect(user!.nickname).toBe('New');
    expect(user!.country).toBe('CA');
    expect(user!.username).toBe('alice');
  });

  it('updateUser is a no-op when there is no current user', () => {
    useAuthStore.getState().updateUser({ nickname: 'X' });
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('updateUser does not flip isAuthenticated', () => {
    useAuthStore.getState().setAuth('jwt', makeUser());
    useAuthStore.getState().updateUser({ avatar: 'new-avatar' });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('persists auth to localStorage under doodledraw-auth', () => {
    useAuthStore.getState().setAuth('persisted-token', makeUser({ nickname: 'Persist' }));
    const raw = localStorage.getItem('doodledraw-auth');
    expect(raw).toBeTruthy();
    expect(raw).toContain('persisted-token');
    expect(raw).toContain('Persist');
  });
});
