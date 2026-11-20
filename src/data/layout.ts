import { toCanvas } from '../art/iso';
import type { Placement, Slot } from '../domain/room';

/**
 * 部屋の置き場所。構図を先に決め、そこから置ける場所を逆算している。
 * facing: R = 右の壁に背を向ける（正面が左下）、L = 左の壁に背を向ける（正面が右下）、
 *         C = 部屋の中ほど、W = 壁掛け、F = 床に敷く
 */
export type RoomSlot = Slot & {
  gx: number;
  gy: number;
  gz?: number;
  facing: 'R' | 'L' | 'C' | 'WL' | 'WR' | 'F';
};

type SlotSeed = Omit<RoomSlot, 'x' | 'y' | 'depth' | 'scale'>;

const seeds: SlotSeed[] = [
  { id: 'left-back', kind: 'floor', gx: 0.72, gy: 1.75, facing: 'L', accepts: ['bed', 'shelf', 'desk', 'seat', 'plant'] },
  { id: 'left-front', kind: 'floor', gx: 0.5, gy: 3.95, facing: 'L', accepts: ['shelf', 'plant', 'light', 'seat'] },
  { id: 'right-back', kind: 'floor', gx: 1.75, gy: 0.55, facing: 'R', accepts: ['desk', 'bed', 'shelf', 'seat', 'plant'] },
  { id: 'right-front', kind: 'floor', gx: 3.95, gy: 0.5, facing: 'R', accepts: ['shelf', 'plant', 'light', 'seat'] },
  { id: 'corner', kind: 'floor', gx: 0.42, gy: 0.42, facing: 'C', accepts: ['plant', 'light'] },
  { id: 'center', kind: 'floor', gx: 2.75, gy: 2.75, facing: 'C', accepts: ['table', 'seat', 'plant'] },
  { id: 'front-right', kind: 'floor', gx: 4.3, gy: 2.4, facing: 'C', accepts: ['seat', 'plant', 'light', 'table'] },
  { id: 'front-left', kind: 'floor', gx: 2.2, gy: 4.35, facing: 'C', accepts: ['seat', 'plant', 'light', 'table'] },
  { id: 'rug', kind: 'rug', gx: 2.75, gy: 2.75, facing: 'F', accepts: ['rug'] },
  { id: 'wall-left', kind: 'wall', gx: 0, gy: 1.75, gz: 2.75, facing: 'WL', accepts: ['wall'] },
  { id: 'wall-left-2', kind: 'wall', gx: 0, gy: 3.9, gz: 2.4, facing: 'WL', accepts: ['wall'] },
  { id: 'wall-right', kind: 'wall', gx: 3.8, gy: 0, gz: 2.5, facing: 'WR', accepts: ['wall'] },
];

export const SLOTS: RoomSlot[] = seeds.map((s) => {
  const p = toCanvas(s.gx, s.gy, s.gz ?? 0);
  const isWall = s.facing === 'WL' || s.facing === 'WR';
  return {
    ...s,
    // 壁掛けは絵の中心、床は接地点。nearestSlot は y-70 を胴として見るので壁は補正する
    x: p.x,
    y: isWall ? p.y + 70 : p.y,
    depth: s.facing === 'F' ? -1 : isWall ? -2 : s.gx + s.gy,
    scale: 1,
  };
});

export const slotById = Object.fromEntries(SLOTS.map((s) => [s.id, s])) as Record<string, RoomSlot>;

/** 窓は建物の一部（右の壁、机の上） */
export const WINDOW = { gx: 0.75, w: 1.9, gz: 1.55, h: 1.75 };

export const INITIAL_OWNED = [
  'bed-oat',
  'desk-birch',
  'shelf-walnut',
  'table-round',
  'cushion-mint',
  'plant-monstera',
  'rug-wave',
  'clock-round',
];

export const INITIAL_PLACEMENT: Placement = {
  'left-back': 'bed-oat',
  'right-back': 'desk-birch',
  'right-front': 'shelf-walnut',
  center: 'table-round',
  'front-left': 'cushion-mint',
  corner: 'plant-monstera',
  rug: 'rug-wave',
  'wall-left': 'clock-round',
};

/** ペットが歩き回るときの中継点（家具を突き抜けないように中央を通す） */
export const HUB = { gx: 2.9, gy: 2.0 };

export const WANDER_POINTS = [
  { gx: 2.0, gy: 2.1 },
  { gx: 3.3, gy: 1.6 },
  { gx: 3.6, gy: 3.4 },
  { gx: 1.8, gy: 3.3 },
  { gx: 2.6, gy: 1.4 },
];
