/**
 * 部屋と家具の配置モデル。
 *
 * New Roots の室内（1536×1024 の一枚構図を基準に、背景→影→家具を
 * left/top/scale の固定フレームで重ねる）の考え方を引き継ぐ。
 * 違いは、家具を「所持の切替」ではなく、構図に合わせて用意した
 * 置き場所（スロット）へドラッグで置けること。自由配置にしないのは、
 * どこに置いても遠近・接地影・ペットの動線が崩れない絵を保つため。
 */

/** 部屋の基準キャンバス。座標はすべてこの範囲の値 */
export const ROOM_W = 1000;
export const ROOM_H = 1000;

export type SlotKind = 'floor' | 'wall' | 'rug' | 'window';

export type FurnitureCategory = 'bed' | 'desk' | 'shelf' | 'table' | 'seat' | 'plant' | 'light' | 'rug' | 'wall';

export type Slot = {
  id: string;
  kind: SlotKind;
  /** 置いた家具の接地点（下辺中央）。ROOM_W/H 基準 */
  x: number;
  y: number;
  /** 奥行き。大きいほど手前で、重なり順と縮尺に使う */
  depth: number;
  /** 遠近による縮尺 */
  scale: number;
  accepts: FurnitureCategory[];
  /** ペットがこの場所の家具を使うときに立つ位置（家具からのずれ） */
  petOffset?: { x: number; y: number };
};

export type FurnitureId = string;

export type Placement = Record<string, FurnitureId | null>;

export type PlaceResult =
  | { ok: true; placement: Placement; displaced: FurnitureId | null; swappedTo: string | null }
  | { ok: false; reason: 'incompatible' | 'unknown-slot' };

export function slotAccepts(slot: Slot, category: FurnitureCategory): boolean {
  return slot.accepts.includes(category);
}

export function compatibleSlots(slots: Slot[], category: FurnitureCategory): Slot[] {
  return slots.filter((s) => slotAccepts(s, category));
}

/** 自動で置くときの置き場所。空きを優先し、全部埋まっていれば最初の受け入れ先（家具は placeFurniture が持ち物へ戻す） */
export function autoSlot(slots: Slot[], placement: Placement, category: FurnitureCategory): Slot | null {
  const comp = compatibleSlots(slots, category);
  return comp.find((sl) => !placement[sl.id]) ?? comp[0] ?? null;
}

export function slotOf(placement: Placement, furniture: FurnitureId): string | null {
  for (const [slotId, f] of Object.entries(placement)) if (f === furniture) return slotId;
  return null;
}

/**
 * 指の位置から吸着先を探す。遠近で手前ほど判定を広げる。
 * maxDistance を超えたら null（置かない）。
 */
export function nearestSlot(
  slots: Slot[],
  point: { x: number; y: number },
  category: FurnitureCategory,
  maxDistance = 150,
): Slot | null {
  let best: Slot | null = null;
  let bestScore = Infinity;
  for (const s of slots) {
    if (!slotAccepts(s, category)) continue;
    // 家具は接地点より上に描かれるので、指は家具の胴あたりにある。少し上を基準にする
    const cy = s.y - 70 * s.scale;
    const d = Math.hypot(point.x - s.x, point.y - cy) / s.scale;
    if (d < bestScore) {
      bestScore = d;
      best = s;
    }
  }
  return best && bestScore <= maxDistance ? best : null;
}

/**
 * 家具を置く。置き先に別の家具があれば、
 * 動かした家具が元いた場所へ入れ替える（元の場所が受け入れられる場合）。
 * 受け入れられなければ、押し出された家具は持ち物へ戻る。
 */
export function placeFurniture(
  slots: Slot[],
  placement: Placement,
  furniture: FurnitureId,
  category: (id: FurnitureId) => FurnitureCategory,
  slotId: string,
): PlaceResult {
  const target = slots.find((s) => s.id === slotId);
  if (!target) return { ok: false, reason: 'unknown-slot' };
  if (!slotAccepts(target, category(furniture))) return { ok: false, reason: 'incompatible' };

  const next: Placement = { ...placement };
  const from = slotOf(placement, furniture);
  const occupant = placement[slotId] ?? null;

  if (from) next[from] = null;
  next[slotId] = furniture;

  let displaced: FurnitureId | null = null;
  let swappedTo: string | null = null;
  if (occupant && occupant !== furniture) {
    const fromSlot = from ? slots.find((s) => s.id === from) : undefined;
    if (fromSlot && slotAccepts(fromSlot, category(occupant))) {
      next[fromSlot.id] = occupant;
      swappedTo = fromSlot.id;
    } else {
      displaced = occupant;
    }
  }
  return { ok: true, placement: next, displaced, swappedTo };
}

export function removeFurniture(placement: Placement, furniture: FurnitureId): Placement {
  const from = slotOf(placement, furniture);
  if (!from) return placement;
  return { ...placement, [from]: null };
}

/** 置かれていない所持家具 */
export function storedFurniture(owned: FurnitureId[], placement: Placement): FurnitureId[] {
  const placed = new Set(Object.values(placement).filter(Boolean));
  return owned.filter((f) => !placed.has(f));
}

/** 描画順（奥→手前） */
export function sortByDepth<T extends { depth: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.depth - b.depth);
}
