/**
 * 部屋の光（living light）。
 * 実際の時刻と「寝ているか」から、空・壁・床の色と灯りの強さを決める。
 * キー時刻の間を線形に補間するので、時間が進むと少しずつ色が移る。
 */
export type Light = {
  skyTop: string;
  skyBottom: string;
  wallL: string;
  wallR: string;
  floorA: string;
  floorB: string;
  /** 部屋全体に重ねる色 */
  tint: string;
  /** 0〜1。ランプ・窓の灯りの強さ */
  lampGlow: number;
  /** 0〜1。窓から差す日の強さ */
  sun: number;
  label: '朝' | '昼' | '夕方' | '夜' | '深夜';
};

type Key = { h: number; light: Omit<Light, 'label'> };

const keys: Key[] = [
  { h: 0, light: { skyTop: '#141a3a', skyBottom: '#2b2f5e', wallL: '#6d6a8e', wallR: '#5d5a7e', floorA: '#6f5f74', floorB: '#655568', tint: 'rgba(30,28,80,0.28)', lampGlow: 1, sun: 0 } },
  { h: 5, light: { skyTop: '#2c3570', skyBottom: '#c99ab8', wallL: '#a59cb2', wallR: '#938aa3', floorA: '#a48a88', floorB: '#977e7d', tint: 'rgba(60,50,110,0.16)', lampGlow: 0.6, sun: 0.1 } },
  { h: 7, light: { skyTop: '#9cc0ff', skyBottom: '#ffd9c2', wallL: '#f6eee6', wallR: '#ebe0d4', floorA: '#e0b994', floorB: '#d6ad87', tint: 'rgba(255,200,150,0.08)', lampGlow: 0, sun: 0.7 } },
  { h: 12, light: { skyTop: '#7fb0ff', skyBottom: '#d6e8ff', wallL: '#f6f2ea', wallR: '#ebe5da', floorA: '#ddb892', floorB: '#d3ad86', tint: 'rgba(255,255,255,0)', lampGlow: 0, sun: 1 } },
  { h: 16.5, light: { skyTop: '#86a6ee', skyBottom: '#ffd6a8', wallL: '#f7ebdc', wallR: '#ecdccb', floorA: '#deb48a', floorB: '#d4a97e', tint: 'rgba(255,190,120,0.08)', lampGlow: 0, sun: 0.85 } },
  { h: 18.5, light: { skyTop: '#5a5fae', skyBottom: '#ff9f7a', wallL: '#e5cdbd', wallR: '#d4b9aa', floorA: '#c99b7c', floorB: '#bd8f71', tint: 'rgba(255,120,90,0.12)', lampGlow: 0.5, sun: 0.35 } },
  { h: 20, light: { skyTop: '#232a5c', skyBottom: '#4b4a86', wallL: '#a59bb4', wallR: '#9086a2', floorA: '#9a7f80', floorB: '#8e7476', tint: 'rgba(40,36,100,0.18)', lampGlow: 0.9, sun: 0 } },
  { h: 24, light: { skyTop: '#141a3a', skyBottom: '#2b2f5e', wallL: '#6d6a8e', wallR: '#5d5a7e', floorA: '#6f5f74', floorB: '#655568', tint: 'rgba(30,28,80,0.28)', lampGlow: 1, sun: 0 } },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbaParts(c: string): [number, number, number, number] {
  if (c.startsWith('#')) return [...hexToRgb(c), 1];
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return [0, 0, 0, 0];
  const [r, g, b, a = '1'] = m[1].split(',').map((s) => s.trim());
  return [Number(r), Number(g), Number(b), Number(a)];
}

function mix(a: string, b: string, t: number): string {
  const pa = rgbaParts(a);
  const pb = rgbaParts(b);
  const p = pa.map((v, i) => v + (pb[i] - v) * t);
  if (a.startsWith('#') && b.startsWith('#')) {
    return '#' + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  }
  return `rgba(${Math.round(p[0])},${Math.round(p[1])},${Math.round(p[2])},${p[3].toFixed(3)})`;
}

export function labelFor(hour: number): Light['label'] {
  if (hour < 4) return '深夜';
  if (hour < 10) return '朝';
  if (hour < 16) return '昼';
  if (hour < 19) return '夕方';
  return '夜';
}

/** hour は 0〜24 の小数。asleep のときは灯りを落とし、夜の色へ寄せる */
export function lightAt(hour: number, asleep = false): Light {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].h <= h) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const t = (h - a.h) / (b.h - a.h);
  const L = a.light;
  const R = b.light;
  const light: Light = {
    skyTop: mix(L.skyTop, R.skyTop, t),
    skyBottom: mix(L.skyBottom, R.skyBottom, t),
    wallL: mix(L.wallL, R.wallL, t),
    wallR: mix(L.wallR, R.wallR, t),
    floorA: mix(L.floorA, R.floorA, t),
    floorB: mix(L.floorB, R.floorB, t),
    tint: mix(L.tint, R.tint, t),
    lampGlow: L.lampGlow + (R.lampGlow - L.lampGlow) * t,
    sun: L.sun + (R.sun - L.sun) * t,
    label: labelFor(h),
  };
  if (asleep) {
    const night = keys[0].light;
    return {
      ...light,
      wallL: mix(light.wallL, night.wallL, 0.65),
      wallR: mix(light.wallR, night.wallR, 0.65),
      floorA: mix(light.floorA, night.floorA, 0.65),
      floorB: mix(light.floorB, night.floorB, 0.65),
      tint: 'rgba(24,22,70,0.38)',
      lampGlow: 0.15,
    };
  }
  return light;
}

export function applyLight(el: HTMLElement, light: Light) {
  el.style.setProperty('--sky-top', light.skyTop);
  el.style.setProperty('--sky-bottom', light.skyBottom);
  el.style.setProperty('--wall-l', light.wallL);
  el.style.setProperty('--wall-r', light.wallR);
  el.style.setProperty('--floor-a', light.floorA);
  el.style.setProperty('--floor-b', light.floorB);
  el.style.setProperty('--room-tint', light.tint);
  el.style.setProperty('--lamp-glow', light.lampGlow.toFixed(3));
  el.style.setProperty('--sun', light.sun.toFixed(3));
}
