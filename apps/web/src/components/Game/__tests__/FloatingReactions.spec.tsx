const listeners = new Map<string, Function>();
vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({
    emit: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      listeners.set(event, handler);
      return vi.fn();
    }),
    connected: true,
    socketVersion: 0,
    socket: { current: {} },
  }),
}));

import { render, act } from '@/test/test-utils';
import FloatingReactions from '../FloatingReactions';

describe('FloatingReactions', () => {
  beforeEach(() => {
    listeners.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing initially', () => {
    const { container } = render(<FloatingReactions />);
    expect(container.querySelectorAll('span').length).toBe(0);
  });

  it('adds reaction when reaction:received event fires', () => {
    const { container } = render(<FloatingReactions />);
    const handler = listeners.get('reaction:received');
    if (handler) {
      act(() => {
        handler({ emoji: '🎉', nickname: 'Alice' });
      });
    }
    const text = container.textContent;
    expect(text).toContain('🎉');
    expect(text).toContain('Alice');
  });

  it('auto-removes reaction after timeout', () => {
    const { container } = render(<FloatingReactions />);
    const handler = listeners.get('reaction:received');
    if (handler) {
      act(() => {
        handler({ emoji: '🎉', nickname: 'Alice' });
      });
    }
    expect(container.textContent).toContain('🎉');

    act(() => {
      vi.advanceTimersByTime(2300);
    });

    expect(container.textContent).not.toContain('🎉');
  });

  it('caps at 15 simultaneous emojis', () => {
    const { container } = render(<FloatingReactions />);
    const handler = listeners.get('reaction:received');
    if (handler) {
      act(() => {
        for (let i = 0; i < 20; i++) {
          handler({ emoji: '😀', nickname: `User${i}` });
        }
      });
    }
    // Should be capped at 15
    const items = container.querySelectorAll('.absolute.bottom-4');
    expect(items.length).toBeLessThanOrEqual(15);
  });
});
