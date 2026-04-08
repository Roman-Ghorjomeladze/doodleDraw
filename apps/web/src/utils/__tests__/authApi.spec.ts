import { describe, it, expect, beforeEach, vi } from 'vitest';

const clearAuthMock = vi.fn();
let currentToken: string | null = 'test-token';

vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      token: currentToken,
      clearAuth: clearAuthMock,
    }),
  },
}));

const { authApi } = await import('@/utils/authApi');

describe('authApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    clearAuthMock.mockReset();
    currentToken = 'test-token';
  });

  const mockOk = (body: unknown, status = 200) =>
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status,
      json: () => Promise.resolve(body),
    });

  const mockNoContent = () =>
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => Promise.resolve(undefined),
    });

  const mockErr = (status: number, message?: string) =>
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status,
      json: () => (message ? Promise.resolve({ message }) : Promise.reject(new Error('no body'))),
    });

  it('register POSTs to /api/auth/register with body and auth header', async () => {
    const response = { token: 'tk', user: { username: 'a' } };
    mockOk(response);

    const result = await authApi.register({
      username: 'alice',
      password: 'pw',
      nickname: 'Alice',
      avatar: 'av',
      country: 'US',
      birthYear: 1990,
      persistentId: 'pid',
    });

    expect(result).toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        }),
      }),
    );
    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(callBody.username).toBe('alice');
  });

  it('login POSTs to /api/auth/login', async () => {
    const response = { token: 'tk', user: { username: 'a' } };
    mockOk(response);

    const result = await authApi.login({ username: 'alice', password: 'pw' });
    expect(result).toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('getMe GETs /api/auth/me', async () => {
    const user = { username: 'alice' };
    mockOk(user);
    const result = await authApi.getMe();
    expect(result).toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('updateProfile PUTs /api/auth/profile with body', async () => {
    const updated = { username: 'alice', nickname: 'New' };
    mockOk(updated);
    const result = await authApi.updateProfile({ nickname: 'New' });
    expect(result).toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/profile',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ nickname: 'New' }),
      }),
    );
  });

  it('logout POSTs to /api/auth/logout and handles 204 response', async () => {
    mockNoContent();
    const result = await authApi.logout();
    expect(result).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('does NOT include Authorization header when there is no token', async () => {
    currentToken = null;
    mockOk({ token: 't', user: {} });
    await authApi.login({ username: 'a', password: 'b' });
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('throws AuthApiError with server message on non-ok response', async () => {
    mockErr(400, 'Bad input');
    await expect(authApi.getMe()).rejects.toMatchObject({
      name: 'AuthApiError',
      status: 400,
      message: 'Bad input',
    });
  });

  it('throws AuthApiError with default message when body is unparseable', async () => {
    mockErr(500);
    await expect(authApi.getMe()).rejects.toMatchObject({
      name: 'AuthApiError',
      status: 500,
      message: 'Request failed',
    });
  });

  it('calls clearAuth on 401 when there is a token (auto-logout)', async () => {
    mockErr(401, 'Unauthorized');
    await expect(authApi.getMe()).rejects.toMatchObject({ status: 401 });
    expect(clearAuthMock).toHaveBeenCalledTimes(1);
  });

  it('does not call clearAuth on 401 when token is missing', async () => {
    currentToken = null;
    mockErr(401, 'Unauthorized');
    await expect(authApi.getMe()).rejects.toMatchObject({ status: 401 });
    expect(clearAuthMock).not.toHaveBeenCalled();
  });
});
