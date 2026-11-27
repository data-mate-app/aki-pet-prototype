/**
 * 横スクロールの「へや」の場所（ゾーン）。
 * 帯は幅 1500、端末の幅は 375。スクロールが止まる位置（snap）ごとに、その場所が見える。
 * 画面側にルールを書かないため、位置から「いまの場所」を出す処理はここに置く。
 */
export const BAND_W = 1500;
export const BAND_H = 812;
export const VIEW_W = 375;

export type ZoneId = 'nedoko' | 'chanoma' | 'tsukue' | 'genkan';

export type Zone = {
  id: ZoneId;
  /** 場所の名前（つまみ・📍・aria に出す） */
  name: string;
  /** 区画に出すデータ名 */
  topic: string;
  /** データ名の点の色（今のデータカードと同じ） */
  color: string;
  /** スクロールが止まる位置（scrollLeft） */
  snap: number;
};

export const ZONES: readonly Zone[] = [
  { id: 'nedoko', name: 'ねどこ', topic: 'すいみん', color: 'var(--sprout)', snap: 0 },
  { id: 'chanoma', name: 'ちゃのま', topic: 'ごはん', color: 'var(--peach)', snap: 380 },
  { id: 'tsukue', name: 'つくえ', topic: '集中', color: 'var(--sky)', snap: 760 },
  { id: 'genkan', name: 'げんかん', topic: 'タスク', color: 'var(--berry)', snap: 1125 },
];

/** 初期位置（こむぎがいる場所） */
export const HOME_ZONE = 1;

/** 動かせるスクロールの最大 */
export function maxScroll(bandW = BAND_W, viewW = VIEW_W): number {
  return Math.max(0, bandW - viewW);
}

/** スクロール位置にいちばん近い場所の番号。同じ距離なら手前（左）の場所 */
export function zoneIndexAt(scrollLeft: number): number {
  let best = 0;
  for (let i = 1; i < ZONES.length; i++) {
    if (Math.abs(ZONES[i].snap - scrollLeft) < Math.abs(ZONES[best].snap - scrollLeft)) best = i;
  }
  return best;
}

/** となりの場所の番号。端では null */
export function neighborOf(index: number, dir: -1 | 1): number | null {
  const next = index + dir;
  return next < 0 || next >= ZONES.length ? null : next;
}

/** 全体の中で、見えている範囲の左端の位置（0〜1）。目盛りのつまみ用 */
export function scrollRatio(scrollLeft: number): number {
  const max = maxScroll();
  return max === 0 ? 0 : Math.min(1, Math.max(0, scrollLeft / max));
}

/** 全体の中で、見えている範囲の幅（0〜1） */
export function viewRatio(): number {
  return Math.min(1, VIEW_W / BAND_W);
}
