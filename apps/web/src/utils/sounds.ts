import { useSettingsStore } from '@/stores/settingsStore';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
  ramp?: { end: number },
) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  if (ramp) {
    osc.frequency.linearRampToValueAtTime(ramp.end, ctx.currentTime + duration);
  }

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

const sounds = {
  correctGuess() {
    // Cheerful ascending two-tone
    playTone(523, 0.15, 'sine', 0.25); // C5
    setTimeout(() => playTone(784, 0.25, 'sine', 0.25), 100); // G5
  },

  closeGuess() {
    // Soft nudge
    playTone(440, 0.12, 'triangle', 0.15);
  },

  roundStart() {
    // Quick ascending triple beep
    playTone(440, 0.1, 'sine', 0.2); // A4
    setTimeout(() => playTone(554, 0.1, 'sine', 0.2), 120); // C#5
    setTimeout(() => playTone(659, 0.2, 'sine', 0.25), 240); // E5
  },

  roundEnd() {
    // Descending tone
    playTone(659, 0.3, 'sine', 0.2, { end: 330 });
  },

  gameEnd() {
    // Fanfare: rising arpeggio
    playTone(523, 0.15, 'sine', 0.2); // C5
    setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 150); // E5
    setTimeout(() => playTone(784, 0.15, 'sine', 0.2), 300); // G5
    setTimeout(() => playTone(1047, 0.35, 'sine', 0.3), 450); // C6
  },

  tick() {
    // Short tick for last 5 seconds
    playTone(880, 0.05, 'square', 0.1);
  },

  chatMessage() {
    // Soft pop
    playTone(600, 0.06, 'sine', 0.1);
  },
};

export type SoundName = keyof typeof sounds;

export function playSound(name: SoundName) {
  if (!useSettingsStore.getState().soundEnabled) return;
  try {
    sounds[name]();
  } catch {
    // Audio may fail if user hasn't interacted with page yet
  }
}
