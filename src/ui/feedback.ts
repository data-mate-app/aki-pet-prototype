/**
 * 触覚と音のフィードバック。
 * Web では iOS の Taptic Engine を呼べないため、Android の vibrate と
 * WebAudio の短い合成音で代用する。ネイティブ化するときはこのファイルだけを
 * expo-haptics / UIFeedbackGenerator に差し替える。
 */
export type HapticKind = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const vibratePattern: Record<HapticKind, number | number[]> = {
  selection: 4,
  light: 8,
  medium: 14,
  heavy: 22,
  success: [10, 40, 16],
  warning: [16, 60, 16],
  error: [20, 40, 20, 40, 20],
};

let soundEnabled = true;
let ctx: AudioContext | null = null;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function isSoundEnabled() {
  return soundEnabled;
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

type Tone = { freq: number; to?: number; dur: number; type?: OscillatorType; gain?: number; delay?: number };

function play(tones: Tone[]) {
  if (!soundEnabled) return;
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  for (const t of tones) {
    const start = now + (t.delay ?? 0);
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = t.type ?? 'sine';
    osc.frequency.setValueAtTime(t.freq, start);
    if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, start + t.dur);
    const peak = t.gain ?? 0.06;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(g).connect(ac.destination);
    osc.start(start);
    osc.stop(start + t.dur + 0.02);
  }
}

export type SoundKind = 'tap' | 'pop' | 'snap' | 'chirp' | 'purr' | 'munch' | 'whoosh' | 'reward' | 'error' | 'tick';

const sounds: Record<SoundKind, Tone[]> = {
  tap: [{ freq: 1800, dur: 0.03, type: 'triangle', gain: 0.03 }],
  tick: [{ freq: 2400, dur: 0.018, type: 'square', gain: 0.012 }],
  pop: [{ freq: 520, to: 980, dur: 0.09, type: 'sine', gain: 0.07 }],
  snap: [
    { freq: 1300, to: 700, dur: 0.05, type: 'triangle', gain: 0.06 },
    { freq: 220, dur: 0.06, type: 'sine', gain: 0.05, delay: 0.01 },
  ],
  chirp: [
    { freq: 880, to: 1320, dur: 0.08, type: 'sine', gain: 0.05 },
    { freq: 1320, to: 1760, dur: 0.1, type: 'sine', gain: 0.045, delay: 0.09 },
  ],
  purr: [
    { freq: 70, to: 62, dur: 0.35, type: 'sawtooth', gain: 0.018 },
    { freq: 74, to: 66, dur: 0.35, type: 'sawtooth', gain: 0.014, delay: 0.38 },
  ],
  munch: [
    { freq: 300, to: 180, dur: 0.06, type: 'square', gain: 0.025 },
    { freq: 280, to: 160, dur: 0.06, type: 'square', gain: 0.025, delay: 0.12 },
  ],
  whoosh: [{ freq: 300, to: 1200, dur: 0.14, type: 'sine', gain: 0.025 }],
  reward: [
    { freq: 784, dur: 0.12, type: 'triangle', gain: 0.05 },
    { freq: 988, dur: 0.12, type: 'triangle', gain: 0.05, delay: 0.1 },
    { freq: 1175, dur: 0.12, type: 'triangle', gain: 0.05, delay: 0.2 },
    { freq: 1568, dur: 0.3, type: 'triangle', gain: 0.05, delay: 0.3 },
  ],
  error: [{ freq: 220, to: 160, dur: 0.16, type: 'triangle', gain: 0.05 }],
};

export function haptic(kind: HapticKind) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(vibratePattern[kind]);
    } catch {
      /* 対応しない端末では何もしない */
    }
  }
}

export function sound(kind: SoundKind) {
  play(sounds[kind]);
}

/** よく使う組み合わせ */
export function feedback(kind: HapticKind, s?: SoundKind) {
  haptic(kind);
  if (s) sound(s);
}
