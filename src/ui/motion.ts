import type { Transition } from 'motion/react';

/**
 * バネの設定はここに集約する。画面ごとに数値を作らない。
 * 目安は iOS の UIKit / SwiftUI の既定値（response と dampingFraction）を
 * stiffness / damping に置き換えたもの。
 */
export const spring = {
  /** ボタンの押し戻し、トグル。止まるまでが短く、跳ねは小さい */
  snappy: { type: 'spring', stiffness: 520, damping: 32, mass: 0.8 },
  /** シート・カードの出入り。iOS の .smooth 相当 */
  smooth: { type: 'spring', stiffness: 300, damping: 34, mass: 1 },
  /** ペットや報酬など、気持ちよく弾ませたいもの */
  bouncy: { type: 'spring', stiffness: 420, damping: 18, mass: 0.9 },
  /** 家具が置き場所へ吸い付く動き */
  snapIn: { type: 'spring', stiffness: 640, damping: 28, mass: 0.7 },
  /** 大きな面の移動（タブ切替の背景など） */
  gentle: { type: 'spring', stiffness: 180, damping: 26, mass: 1 },
} satisfies Record<string, Transition>;

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};

/** 指を離した速度を加味した移動先（iOS のスクロール減速の近似） */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** 範囲外へ引っ張ったときのゴムの抵抗（UIScrollView と同じ式） */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  const sign = Math.sign(overshoot);
  const abs = Math.abs(overshoot);
  return sign * (1 - 1 / ((abs * constant) / dimension + 1)) * dimension;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
