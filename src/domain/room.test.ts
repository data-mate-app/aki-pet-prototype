import { describe, expect, it } from 'vitest';
import { nearestSlot, placeFurniture, removeFurniture, storedFurniture, type FurnitureCategory, type Slot } from './room';

const slots: Slot[] = [
  { id: 'floor-a', kind: 'floor', x: 300, y: 700, depth: 2, scale: 1, accepts: ['bed', 'seat', 'plant'] },
  { id: 'floor-b', kind: 'floor', x: 700, y: 700, depth: 2, scale: 1, accepts: ['bed', 'seat', 'plant'] },
  { id: 'wall-a', kind: 'wall', x: 500, y: 300, depth: 0, scale: 0.8, accepts: ['wall'] },
];
const cat: Record<string, FurnitureCategory> = { bed: 'bed', sofa: 'seat', poster: 'wall', fern: 'plant' };
const category = (id: string) => cat[id];

describe('placeFurniture', () => {
  it('空いている場所へ置ける', () => {
    const r = placeFurniture(slots, {}, 'bed', category, 'floor-a');
    expect(r).toMatchObject({ ok: true, placement: { 'floor-a': 'bed' }, displaced: null });
  });

  it('受け入れない場所には置けない', () => {
    const r = placeFurniture(slots, {}, 'poster', category, 'floor-a');
    expect(r).toEqual({ ok: false, reason: 'incompatible' });
  });

  it('置いてある家具の上へ動かすと入れ替わる', () => {
    const r = placeFurniture(slots, { 'floor-a': 'bed', 'floor-b': 'sofa' }, 'bed', category, 'floor-b');
    expect(r).toMatchObject({ ok: true, placement: { 'floor-a': 'sofa', 'floor-b': 'bed' }, swappedTo: 'floor-a' });
  });

  it('持ち物から置いて押し出した家具は持ち物へ戻る', () => {
    const r = placeFurniture(slots, { 'floor-a': 'bed' }, 'fern', category, 'floor-a');
    expect(r).toMatchObject({ ok: true, placement: { 'floor-a': 'fern' }, displaced: 'bed' });
  });
});

describe('nearestSlot', () => {
  it('家具の胴あたりの位置で最寄りの置き場所を返す', () => {
    expect(nearestSlot(slots, { x: 690, y: 640 }, 'bed')?.id).toBe('floor-b');
  });

  it('遠すぎれば置かない', () => {
    expect(nearestSlot(slots, { x: 500, y: 50 }, 'bed')).toBeNull();
  });

  it('種類の合わない場所は候補にしない', () => {
    expect(nearestSlot(slots, { x: 500, y: 240 }, 'bed')).toBeNull();
    expect(nearestSlot(slots, { x: 500, y: 240 }, 'wall')?.id).toBe('wall-a');
  });
});

describe('storedFurniture / removeFurniture', () => {
  it('置いていない家具だけを持ち物に出す', () => {
    const placement = { 'floor-a': 'bed', 'floor-b': null };
    expect(storedFurniture(['bed', 'sofa', 'fern'], placement)).toEqual(['sofa', 'fern']);
    expect(storedFurniture(['bed', 'sofa'], removeFurniture(placement, 'bed'))).toEqual(['bed', 'sofa']);
  });
});
