/**
 * WebAudio の土台。効果音（feedback.ts）と BGM（music.ts）で 1 つの AudioContext を共有する。
 *
 *   効果音 ─┐
 *            ├─ master（コンプレッサー：重なっても割れない） → スピーカー
 *   BGM ─ duck（効果音の間だけ下げる） ─┘
 *
 * ブラウザは操作されるまで音を出せない。最初のタップで AudioContext を起こし、
 * そこで素材の読み込みと BGM の再生を始める（onAudioUnlock）。
 * 画面が隠れたら止め、戻ったら再開する。
 */
import { audibleRange } from './audioRange';

export type Clip = {
  buffer: AudioBuffer;
  /** 先頭・末尾の無音を除いた範囲（秒） */
  start: number;
  end: number;
};

let ctx: AudioContext | null = null;
let master: AudioNode | null = null;
let duck: GainNode | null = null;
let unlocked = false;
const waiting: Array<() => void> = [];

export function getAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor({ latencyHint: 'interactive' });
    } catch {
      return null;
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    comp.connect(ctx.destination);
    master = comp;
    duck = ctx.createGain();
    duck.connect(comp);
  }
  return ctx;
}

/** 効果音の出口 */
export function sfxOut(): AudioNode | null {
  getAudio();
  return master;
}

/** BGM・環境音の出口 */
export function musicOut(): AudioNode | null {
  getAudio();
  return duck;
}

/** 起きていなければ起こす（操作の中から呼ぶと確実） */
export function wake(ac: AudioContext) {
  if (ac.state !== 'running') void ac.resume().catch(() => {});
}

/** 最初の操作で音が出せるようになったら呼ぶ。すでに出せるならすぐ呼ぶ */
export function onAudioUnlock(fn: () => void) {
  if (unlocked) fn();
  else waiting.push(fn);
}

function unlock() {
  const ac = getAudio();
  if (!ac) return;
  if (ac.state === 'running' && unlocked) return;
  if (!unlocked) {
    // 古い iOS は、操作の中で一度鳴らすと以後も鳴らせるようになる
    try {
      const silent = ac.createBuffer(1, 1, 22050);
      const s = ac.createBufferSource();
      s.buffer = silent;
      s.connect(ac.destination);
      s.start(0);
    } catch {
      /* 何もしない */
    }
  }
  void ac
    .resume()
    .then(() => {
      if (unlocked || ac.state !== 'running') return;
      unlocked = true;
      waiting.splice(0).forEach((fn) => fn());
    })
    .catch(() => {});
}

let installed = false;
export function installAudioUnlock() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const opts = { capture: true, passive: true } as const;
  // Chrome はタッチなら pointerup / touchend、マウスなら pointerdown を「操作」とみなす
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click']) {
    window.addEventListener(type, unlock, opts);
  }
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') void ctx.suspend().catch(() => {});
    else if (unlocked) void ctx.resume().catch(() => {});
  });
}

const cache = new Map<string, Promise<Clip | null>>();

function decode(ac: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  // 古い Safari はコールバック形式しか持たない
  return new Promise((resolve, reject) => {
    const p = ac.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined;
    p?.catch(reject);
  });
}

/**
 * 音声ファイルを読み込んで、無音を除いた範囲と一緒に返す。同じ URL は 1 回だけ読む。
 * loop のときは端から 0.1 秒までしか無音を探さない（曲の静かな頭を削らない）。
 */
export function loadClip(url: string, { loop = false } = {}): Promise<Clip | null> {
  let p = cache.get(url);
  if (!p) {
    p = (async () => {
      const ac = getAudio();
      if (!ac) return null;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const buffer = await decode(ac, await res.arrayBuffer());
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
      const [s, e] = audibleRange(channels, 1e-4, loop ? Math.round(buffer.sampleRate * 0.1) : undefined);
      return { buffer, start: s / buffer.sampleRate, end: e / buffer.sampleRate };
    })().catch(() => null);
    cache.set(url, p);
  }
  return p;
}

/** AudioParam を今の値から目標へなめらかに動かす */
export function rampTo(param: AudioParam, value: number, seconds: number) {
  const ac = getAudio();
  if (!ac) return;
  const t = ac.currentTime;
  param.cancelScheduledValues(t);
  param.setValueAtTime(param.value, t);
  param.linearRampToValueAtTime(value, t + Math.max(0.01, seconds));
}

/** 効果音を目立たせるため、BGM を一時的に下げる */
export function duckMusic(seconds: number, depth = 0.4) {
  const ac = getAudio();
  if (!ac || !duck) return;
  const g = duck.gain;
  const t = ac.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(depth, t + 0.08);
  g.setValueAtTime(depth, t + seconds);
  g.linearRampToValueAtTime(1, t + seconds + 0.9);
}
