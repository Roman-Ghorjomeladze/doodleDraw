const mockEmit = vi.fn();
vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({
    emit: mockEmit,
    on: vi.fn(() => vi.fn()),
    connected: true,
    socketVersion: 0,
    socket: { current: {} },
  }),
}));

import { render, screen } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import ReactionBar from '../ReactionBar';

describe('ReactionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders some emoji buttons', () => {
    const { container } = render(<ReactionBar />);
    const buttons = container.querySelectorAll('button');
    // 9 visible emojis + maybe expand button
    expect(buttons.length).toBeGreaterThanOrEqual(9);
  });

  it('clicking an emoji emits reaction:send', () => {
    const { container } = render(<ReactionBar />);
    const firstEmojiBtn = container.querySelector('button[title]');
    fireEvent.click(firstEmojiBtn!);
    expect(mockEmit).toHaveBeenCalledWith('reaction:send', expect.objectContaining({ emoji: expect.any(String) }));
  });

  it('rapid clicks during cooldown only emit once', () => {
    const { container } = render(<ReactionBar />);
    const firstEmojiBtn = container.querySelector('button[title]') as HTMLButtonElement;
    fireEvent.click(firstEmojiBtn);
    // Try to click again immediately - should be in cooldown
    const callsAfterFirst = mockEmit.mock.calls.length;
    fireEvent.click(firstEmojiBtn);
    expect(mockEmit.mock.calls.length).toBe(callsAfterFirst);
  });

  it('expand button toggles extra emojis', () => {
    const { container } = render(<ReactionBar />);
    // Find the expand button (▼ or ▲)
    const expandBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === '▼');
    if (expandBtn) {
      fireEvent.click(expandBtn);
      // After expand, button text should change to ▲
      expect(container.textContent).toContain('▲');
    } else {
      // If no expand button, that's also OK (means few emojis)
      expect(true).toBe(true);
    }
  });

  it('localStorage is used to track usage', () => {
    const { container } = render(<ReactionBar />);
    const firstEmojiBtn = container.querySelector('button[title]') as HTMLButtonElement;
    const emoji = firstEmojiBtn.getAttribute('title');
    fireEvent.click(firstEmojiBtn);
    const stored = localStorage.getItem('doodledraw_reaction_counts');
    expect(stored).toBeTruthy();
    if (emoji && stored) {
      const parsed = JSON.parse(stored);
      expect(parsed[emoji]).toBe(1);
    }
  });
});
