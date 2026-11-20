/**
 * 触覚と効果音のフィードバック。
 *
 * - 触覚: Web では iOS の Taptic Engine を呼べないため、Android の vibrate で代用する。
 * - 効果音: 生成した素材（src/assets/audio, 作り方は docs/sound.md）を WebAudio で鳴らす。
 *   読み込み前・読み込めない環境では、同じ役割の短い合成音で代わりに鳴らす。
 *   「タップ」「目盛り」のように頻度が高く短いものは、遅れのない合成音のまま。
 *
 * ネイティブ化するときはこのファイルを expo-haptics / UIFeedbackGenerator と
 * ネイティブの音声再生に差し替える。呼び出し側（feedback / sound）は変えなくてよい。
 */
import popUrl from '../assets/audio/pop.mp3';
import pop2Url from '../assets/audio/pop2.mp3';
import snapUrl from '../assets/audio/snap.mp3';
import chirpUrl from '../assets/audio/chirp.mp3';
import chirp2Url from '../assets/audio/chirp2.mp3';
import purrUrl from '../assets/audio/purr.mp3';
import munchUrl from '../assets/audio/munch.mp3';
import whooshUrl from '../assets/audio/whoosh.mp3';
import rewardUrl from '../assets/audio/reward.mp3';
import errorUrl from '../assets/audio/error.mp3';
import coinUrl from '../assets/audio/coin.mp3';
import levelupUrl from '../assets/audio/levelup.mp3';
import { duckMusic, getAudio, loadClip, onAudioUnlock, sfxOut, wake, type Clip } from './audio';

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

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function isSoundEnabled() {
  return soundEnabled;
}

export type SoundKind =
  | 'tap'
  | 'tick'
  | 'pop'
  | 'snap'
  | 'chirp'
  | 'purr'
  | 'munch'
  | 'whoosh'
  | 'reward'
  | 'error'
  | 'coin'
  | 'levelup';

/* ---------- 素材 ---------- */

type Sample = {
  urls: string[];
  gain: number;
  /** 毎回わずかに音程を揺らして、同じ音の繰り返しを機械的に聞こえさせない */
  jitter?: number;
  /** 鳴っているあいだ BGM を下げる秒数 */
  duck?: number;
};

const samples: Partial<Record<SoundKind, Sample>> = {
  pop: { urls: [popUrl, pop2Url], gain: 0.5, jitter: 0.06 },
  snap: { urls: [snapUrl], gain: 0.62, jitter: 0.05 },
  chirp: { urls: [chirpUrl, chirp2Url], gain: 0.4, jitter: 0.05, duck: 0.5 },
  purr: { urls: [purrUrl], gain: 0.75, jitter: 0.03 },
  munch: { urls: [munchUrl], gain: 0.55, jitter: 0.07 },
  whoosh: { urls: [whooshUrl], gain: 0.42, jitter: 0.08 },
  reward: { urls: [rewardUrl], gain: 0.5, duck: 1.1 },
  error: { urls: [errorUrl], gain: 0.5 },
  coin: { urls: [coinUrl], gain: 0.3 },
  levelup: { urls: [levelupUrl], gain: 0.62, duck: 1.8 },
};

const clips: Partial<Record<SoundKind, Clip[]>> = {};
const variant: Partial<Record<SoundKind, number>> = {};

function preload() {
  for (const [kind, def] of Object.entries(samples) as [SoundKind, Sample][]) {
    void Promise.all(def.urls.map((u) => loadClip(u))).then((list) => {
      const ok = list.filter((c): c is Clip => c !== null);
      if (ok.length) clips[kind] = ok;
    });
  }
}
onAudioUnlock(preload);

/** コインが続けて届くと音階で上がっていく（ド・レ・ミ・ソ・ラ）。元の音より少し低くして耳に刺さらないようにする */
const COIN_STEPS = [0, 2, 4, 7, 9];
const COIN_BASE = 0.84;
let coinStreak = 0;
let coinLast = 0;

function coinRate(t: number) {
  coinStreak = t - coinLast < 420 ? Math.min(coinStreak + 1, COIN_STEPS.length - 1) : 0;
  coinLast = t;
  return COIN_BASE * 2 ** (COIN_STEPS[coinStreak] / 12);
}

function playClip(ac: AudioContext, clip: Clip, gain: number, rate: number) {
  const out = sfxOut();
  if (!out) return;
  const src = ac.createBufferSource();
  src.buffer = clip.buffer;
  src.playbackRate.value = rate;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(g).connect(out);
  src.start(0, clip.start, clip.end - clip.start);
  src.onended = () => g.disconnect();
}

/* ---------- 合成音（素材がないとき・頻度の高い短い音） ---------- */

type Tone = { freq: number; to?: number; dur: number; type?: OscillatorType; gain?: number; delay?: number };

function playTones(ac: AudioContext, tones: Tone[]) {
  const out = sfxOut();
  if (!out) return;
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
    osc.connect(g).connect(out);
    osc.start(start);
    osc.stop(start + t.dur + 0.02);
  }
}

const arpeggio = (notes: number[], step: number, gain: number): Tone[] =>
  notes.map((freq, i) => ({ freq, dur: i === notes.length - 1 ? 0.32 : 0.12, type: 'triangle', gain, delay: i * step }));

const synth: Record<SoundKind, Tone[]> = {
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
  reward: arpeggio([784, 988, 1175, 1568], 0.1, 0.05),
  error: [{ freq: 220, to: 160, dur: 0.16, type: 'triangle', gain: 0.05 }],
  coin: [
    { freq: 1976, dur: 0.06, type: 'triangle', gain: 0.035 },
    { freq: 2637, dur: 0.16, type: 'triangle', gain: 0.03, delay: 0.05 },
  ],
  levelup: arpeggio([523, 659, 784, 1047, 1319], 0.09, 0.055),
};

/* ---------- 呼び出し口 ---------- */

/** 同じ音が一度に何十も重なると濁るので、ごく短い間隔の連打はまとめる */
const MIN_GAP: Partial<Record<SoundKind, number>> = { coin: 45, tick: 25 };
const DEFAULT_GAP = 35;
const lastAt: Partial<Record<SoundKind, number>> = {};

export function haptic(kind: HapticKind) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    // 一度も触られていないうちは Chrome が拒否してエラーを出すので、呼ばない
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try {
      navigator.vibrate(vibratePattern[kind]);
    } catch {
      /* 対応しない端末では何もしない */
    }
  }
}

export function sound(kind: SoundKind) {
  if (!soundEnabled) return;
  const ac = getAudio();
  if (!ac) return;
  wake(ac);

  const t = performance.now();
  if (t - (lastAt[kind] ?? -Infinity) < (MIN_GAP[kind] ?? DEFAULT_GAP)) return;
  lastAt[kind] = t;

  const def = samples[kind];
  const list = clips[kind];
  if (def && list) {
    const i = ((variant[kind] ?? -1) + 1) % list.length;
    variant[kind] = i;
    const rate = kind === 'coin' ? coinRate(t) : 1 + (def.jitter ? (Math.random() * 2 - 1) * def.jitter : 0);
    playClip(ac, list[i], def.gain, rate);
    if (def.duck) duckMusic(def.duck);
    return;
  }
  playTones(ac, synth[kind]);
}

/** よく使う組み合わせ */
export function feedback(kind: HapticKind, s?: SoundKind) {
  haptic(kind);
  if (s) sound(s);
}

/** デモ操作で鳴らして聞き比べる用 */
export const SOUND_LIST: { kind: SoundKind; label: string }[] = [
  { kind: 'pop', label: 'ぽん' },
  { kind: 'snap', label: 'ことっ' },
  { kind: 'chirp', label: 'よろこぶ' },
  { kind: 'purr', label: 'ごろごろ' },
  { kind: 'munch', label: 'もぐもぐ' },
  { kind: 'whoosh', label: 'しゅっ' },
  { kind: 'reward', label: 'できた' },
  { kind: 'coin', label: 'コイン' },
  { kind: 'levelup', label: 'レベルアップ' },
  { kind: 'error', label: 'できない' },
];
