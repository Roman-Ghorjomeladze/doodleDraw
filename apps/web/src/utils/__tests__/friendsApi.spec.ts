import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ token: 'test-token' }),
  },
}));

const { friendsApi } = await import('@/utils/friendsApi');

describe('friendsApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  const mockOkResponse = (body: unknown) =>
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(body),
    });

  const mockErrorResponse = (status: number, message: string) =>
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message }),
    });

  // --- search ---
  describe('search', () => {
    it('calls correct URL with query parameter and auth header', async () => {
      const data = { users: [] };
      mockOkResponse(data);

      const result = await friendsApi.search('alice');
      expect(result).toEqual(data);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/friends/search?q=alice',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('encodes special characters in query', async () => {
      mockOkResponse({ users: [] });
      await friendsApi.search('a b&c');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/friends/search?q=a%20b%26c',
        expect.anything(),
      );
    });

    it('passes abort signal', async () => {
      mockOkResponse({ users: [] });
      const controller = new AbortController();
      await friendsApi.search('test', controller.signal);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  // --- list ---
  describe('list', () => {
    it('calls /list with GET', async () => {
      const data = { friends: [] };
      mockOkResponse(data);

      const result = await friendsApi.list();
      expect(result).toEqual(data);
      expect(fetchMock).toHaveBeenCalledWith('/api/friends/list', expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }));
    });
  });

  // --- pendingRequests ---
  describe('pendingRequests', () => {
    it('calls /requests with GET', async () => {
      const data = { incoming: [], outgoing: [] };
      mockOkResponse(data);

      const result = await friendsApi.pendingRequests();
      expect(result).toEqual(data);
      expect(fetchMock).toHaveBeenCalledWith('/api/friends/requests', expect.anything());
    });
  });

  // --- sendRequest ---
  describe('sendRequest', () => {
    it('calls /request with POST and correct body', async () => {
      const data = { request: {}, autoAccepted: false };
      mockOkResponse(data);

      await friendsApi.sendRequest('target-123');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/friends/request',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ targetPersistentId: 'target-123' }),
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        }),
      );
    });
  });

  // --- respondToRequest ---
  describe('respondToRequest', () => {
    it('calls /request/respond with POST and action', async () => {
      mockOkResponse({ status: 'ok' });

      await friendsApi.respondToRequest('req-1', 'accept');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/friends/request/respond',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ requestId: 'req-1', action: 'accept' }),
        }),
      );
    });

    it('sends reject action', async () => {
      mockOkResponse({ status: 'ok' });

      await friendsApi.respondToRequest('req-2', 'reject');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/friends/request/respond',
        expect.objectContaining({
          body: JSON.stringify({ requestId: 'req-2', action: 'reject' }),
        }),
      );
    });
  });

  // --- removeFriend ---
  describe('removeFriend', () => {
    it('calls /remove with DELETE', async () => {
      mockOkResponse({ success: true });

      await friendsApi.removeFriend('friend-x');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/friends/remove',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ friendPersistentId: 'friend-x' }),
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        }),
      );
    });
  });

  // --- error handling ---
  describe('error handling', () => {
    it('throws with server message on non-ok response', async () => {
      mockErrorResponse(400, 'Already friends');
      await expect(friendsApi.list()).rejects.toThrow('Already friends');
    });

    it('throws default message when body has no message', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });
      await expect(friendsApi.list()).rejects.toThrow('Request failed');
    });

    it('throws default message when json parsing fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('parse error')),
      });
      await expect(friendsApi.list()).rejects.toThrow('Request failed');
    });
  });
});
