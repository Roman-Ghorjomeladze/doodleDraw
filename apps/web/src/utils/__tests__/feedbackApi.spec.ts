const mockToken = { current: 'test-token' as string | null };

vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ token: mockToken.current }),
  },
}));

import { feedbackApi, FeedbackApiError } from '@/utils/feedbackApi';

describe('feedbackApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;
    mockToken.current = 'test-token';
    // Give window.location.href a predictable value.
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, href: 'http://localhost/home' },
    });
  });

  it('submits feedback with auth header when token is present', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'f1' }),
    });

    const res = await feedbackApi.submitFeedback({ message: 'bug!', category: 'bug' });

    expect(res).toEqual({ id: 'f1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/feedback');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      message: 'bug!',
      category: 'bug',
      pageUrl: 'http://localhost/home',
      trace: null,
    });
  });

  it('omits auth header when anonymous', async () => {
    mockToken.current = null;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'f2' }),
    });

    await feedbackApi.submitFeedback({ message: 'anonymous feedback' });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('uses the explicit pageUrl override when provided', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'f3' }),
    });

    await feedbackApi.submitFeedback({
      message: 'hi',
      pageUrl: 'http://x/custom',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.pageUrl).toBe('http://x/custom');
  });

  it('throws FeedbackApiError with server message on non-ok response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Too many submissions.' }),
    });

    await expect(feedbackApi.submitFeedback({ message: 'spam' })).rejects.toThrow(
      FeedbackApiError,
    );
    await expect(feedbackApi.submitFeedback({ message: 'spam' })).rejects.toThrow(
      'Too many submissions.',
    );
  });

  it('falls back to generic message when response body has no message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); },
    });

    await expect(feedbackApi.submitFeedback({ message: 'hi' })).rejects.toThrow(
      'Failed to submit feedback',
    );
  });
});
