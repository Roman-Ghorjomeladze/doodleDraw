import { useAuthStore } from '@/stores/authStore';
import type { AuthRegisterRequest, AuthLoginRequest, AuthResponse, AuthUser } from '@doodledraw/shared';

const API_BASE = '/api/auth';

class AuthApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    // Auto-logout on 401.
    if (res.status === 401 && token) {
      useAuthStore.getState().clearAuth();
    }

    let message = 'Request failed';
    try {
      const body = await res.json();
      message = body.message || message;
    } catch {}
    throw new AuthApiError(message, res.status);
  }

  // No content (e.g. logout).
  if (res.status === 204) return undefined as T;

  return res.json();
}

export const authApi = {
  register: (data: AuthRegisterRequest) =>
    authFetch<AuthResponse>('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: AuthLoginRequest) =>
    authFetch<AuthResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => authFetch<AuthUser>('/me'),

  updateProfile: (data: Partial<Pick<AuthUser, 'nickname' | 'avatar' | 'country' | 'birthYear'>>) =>
    authFetch<AuthUser>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  logout: () =>
    authFetch<void>('/logout', { method: 'POST' }),
};
