import { fromCanvas, toCanvas } from '../../art/iso';
import { VIEW } from '../../art/Room';
import type { FurnitureDef } from '../../data/furniture';
import type { RoomSlot } from '../../data/layout';

/**
 * ホームの部屋の座標。
 * シーンの中身は「キャンバス座標（1000×1000 の部屋の絵の座標）」のまま並べ、
 * 層ごと CSS の scale で画面の幅に合わせる。家具・ペット・置き場所の印が
 * すべて同じ座標を通るので、拡大縮小しても接地がずれない。
 */
export type Pt = { x: number; y: number };

export const isWallSlot = (s: RoomSlot) => s.facing === 'WL' || s.facing === 'WR';

/** 置き場所の描画の基準点。床は接地点、壁は絵の中心 */
export function anchorOf(slot: RoomSlot): Pt {
  return { x: slot.x, y: isWallSlot(slot) ? slot.y - 70 : slot.y };
}

/** 置き場所を探すときの指の基準。家具の胴（接地点の少し上）で比べる */
export function probeOf(anchor: Pt, wall: boolean): Pt {
  return wall ? anchor : { x: anchor.x, y: anchor.y - 70 };
}

/** 画面の座標 → キャンバス座標（シーンの拡大縮小・移動を含めて逆算する） */
export function clientToCanvas(el: HTMLElement, clientX: number, clientY: number): Pt {
  const r = el.getBoundingClientRect();
  return {
    x: VIEW.x + ((clientX - r.left) / r.width) * VIEW.w,
    y: VIEW.y + ((clientY - r.top) / r.height) * VIEW.h,
  };
}

/** キャンバス座標 → シーンの層の中の座標（左上が VIEW の左上） */
export const toLayer = (p: Pt): Pt => ({ x: p.x - VIEW.x, y: p.y - VIEW.y });

export const clampFloor = (g: number) => Math.max(0.5, Math.min(4.5, g));

export function floorAt(canvas: Pt): { gx: number; gy: number } {
  const g = fromCanvas(canvas.x, canvas.y);
  return { gx: clampFloor(g.gx), gy: clampFloor(g.gy) };
}

export function canvasOf(gx: number, gy: number): Pt {
  return toCanvas(gx, gy, 0);
}

/** ペットが家具を使うときに立つ床の位置。左の壁沿いは向きが 90° 回るので軸を入れ替える */
export function useSpotOf(slot: RoomSlot, def: FurnitureDef): { gx: number; gy: number } {
  const sp = def.petSpot ?? { gx: 0, gy: 0.85 };
  if (slot.facing === 'L') return { gx: clampFloor(slot.gx + sp.gy), gy: clampFloor(slot.gy + sp.gx) };
  return { gx: clampFloor(slot.gx + sp.gx), gy: clampFloor(slot.gy + sp.gy) };
}

/** 家具の上に出す吹き出しの高さ（キャンバス座標） */
export const CALLOUT_LIFT: Record<FurnitureDef['kind'], number> = {
  bed: 150,
  desk: 175,
  bookshelf: 240,
  lowtable: 95,
  cushion: 60,
  beanbag: 110,
  plant: 185,
  cactus: 125,
  lamp: 225,
  rug: 40,
  clock: 70,
  poster: 90,
};

/** 家具ごとの SVG の枠（キャンバス座標）。overflow: visible なので目安でよい */
export const PIECE_VIEW: Record<FurnitureDef['kind'], [number, number, number, number]> = {
  bed: [-200, -170, 400, 300],
  desk: [-170, -190, 340, 280],
  bookshelf: [-120, -270, 240, 320],
  lowtable: [-110, -110, 220, 170],
  cushion: [-90, -80, 180, 130],
  beanbag: [-95, -110, 190, 150],
  plant: [-80, -180, 160, 200],
  cactus: [-80, -140, 160, 170],
  lamp: [-100, -260, 200, 280],
  rug: [-260, -160, 520, 320],
  clock: [-80, -90, 160, 180],
  poster: [-80, -110, 160, 220],
};

/** ペットの絵の縮尺（キャンバス座標での大きさ） */
export const PET_SCALE = 1.15;
export const PET_VIEW: [number, number, number, number] = [-95, -160, 190, 175];
