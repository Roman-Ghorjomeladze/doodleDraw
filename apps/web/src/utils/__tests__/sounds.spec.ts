import { describe, it, expect, beforeEach, vi } from 'vitest';

let soundEnabled = true;

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ soundEnabled }),
  },
}));

interface MockOscillator {
  type: string;
  frequency: { setValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn> };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

interface MockGain {
  gain: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> };
  connect: ReturnType<typeof vi.fn>;
}

let createOscillator: ReturnType<typeof vi.fn>;
let createGain: ReturnType<typeof vi.fn>;
let audioCtxConstructor: ReturnType<typeof vi.fn>;

class MockAudioContext {
  currentTime = 0;
  destination = {};
  constructor() {
    audioCtxConstructor();
  }
  createOscillator(): MockOscillator {
    return createOscillator();
  }
  createGain(): MockGain {
    return createGain();
  }
}

beforeEach(() => {
  soundEnabled = true;
  createOscillator = vi.fn(
    (): MockOscillator => ({
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }),
  );
  createGain = vi.fn(
    (): MockGain => ({
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }),
  );
  audioCtxConstructor = vi.fn();
  (globalThis as any).AudioContext = MockAudioContext;
  vi.useFakeTimers();
  vi.resetModules();
});

describe('sounds utility', () => {
  it('returns early when soundEnabled is false', async () => {
    soundEnabled = false;
    const { playSound } = await import('@/utils/sounds');
    playSound('correctGuess');
    expect(audioCtxConstructor).not.toHaveBeenCalled();
    expect(createOscillator).not.toHaveBeenCalled();
  });

  it('plays a known sound when soundEnabled is true', async () => {
    soundEnabled = true;
    const { playSound } = await import('@/utils/sounds');
    playSound('chatMessage');
    expect(createOscillator).toHaveBeenCalled();
    expect(createGain).toHaveBeenCalled();
  });

  it('reuses a single AudioContext across calls', async () => {
    const { playSound } = await import('@/utils/sounds');
    playSound('chatMessage');
    playSound('tick');
    expect(audioCtxConstructor).toHaveBeenCalledTimes(1);
  });

  it('playSound for sequenced sounds schedules timers without throwing', async () => {
    const { playSound } = await import('@/utils/sounds');
    expect(() => playSound('correctGuess')).not.toThrow();
    expect(() => playSound('roundStart')).not.toThrow();
    expect(() => playSound('gameEnd')).not.toThrow();
    // First osc fires synchronously, others are scheduled.
    expect(createOscillator).toHaveBeenCalled();
  });

  it('does not throw if AudioContext is missing', async () => {
    delete (globalThis as any).AudioContext;
    const { playSound } = await import('@/utils/sounds');
    expect(() => playSound('chatMessage')).not.toThrow();
  });

  it('does not throw if createOscillator throws internally', async () => {
    createOscillator = vi.fn(() => {
      throw new Error('audio failure');
    });
    const { playSound } = await import('@/utils/sounds');
    expect(() => playSound('chatMessage')).not.toThrow();
  });
});
