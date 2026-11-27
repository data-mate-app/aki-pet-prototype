import { THUMB_VIEW } from '../art/Furniture';
import type { FurnitureDef } from '../data/furniture';

/** おみせの絵の大きさ（FurnitureThumb の size） */
export const THUMB_SIZE = 96;

/**
 * THUMB_VIEW の中心を保ったまま正方形に広げた viewBox。
 * FurnitureThumb は正方形の枠に preserveAspectRatio=xMidYMid meet で入れるので、見える範囲はこれと同じ。
 */
export function thumbViewBox(kind: FurnitureDef['kind']): [number, number, number, number] {
  const [x, y, w, h] = THUMB_VIEW[kind].split(' ').map(Number);
  const s = Math.max(w, h);
  return [x + w / 2 - s / 2, y + h / 2 - s / 2, s, s];
}
