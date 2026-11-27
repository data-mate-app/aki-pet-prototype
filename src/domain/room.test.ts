import { describe, expect, it } from 'vitest';
import { autoSlot, nearestSlot, occupiedSlots, placeFurniture, removeFurniture, storedFurniture, type FurnitureCategory, type Slot } from './room';

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

describe('autoSlot', () => {
  it('空きを優先する', () => {
    expect(autoSlot(slots, { 'floor-a': 'sofa' }, 'bed')?.id).toBe('floor-b');
  });

  it('全部埋まっていれば最初の受け入れ先を返す', () => {
    expect(autoSlot(slots, { 'floor-a': 'sofa', 'floor-b': 'fern' }, 'bed')?.id).toBe('floor-a');
  });

  it('受け入れ先が無ければ null', () => {
    expect(autoSlot(slots, {}, 'desk')).toBeNull();
  });
});

describe('group（ラグは一度に 1 枚）', () => {
  const rugSlots: Slot[] = [
    { id: 'rug-a', kind: 'rug', x: 400, y: 700, depth: 1, scale: 1, accepts: ['rug'], group: 'rug' },
    { id: 'rug-b', kind: 'rug', x: 600, y: 700, depth: 1, scale: 1, accepts: ['rug'], group: 'rug' },
    { id: 'rug-c', kind: 'rug', x: 800, y: 700, depth: 1, scale: 1, accepts: ['rug'], group: 'rug' },
    ...slots,
  ];
  const rugCat = (id: string): FurnitureCategory => (id.startsWith('rug') ? 'rug' : category(id));

  it('group の空いている置き場所へ別のラグを置くと、もう 1 枚は displaced になり外れる', () => {
    const r = placeFurniture(rugSlots, { 'rug-a': 'rug1' }, 'rug2', rugCat, 'rug-b');
    expect(r).toMatchObject({ ok: true, placement: { 'rug-a': null, 'rug-b': 'rug2' }, displaced: 'rug1', swappedTo: null });
  });

  it('置かれているラグを同じ group の空きへ動かすと、元の場所は空き、displaced は null', () => {
    const r = placeFurniture(rugSlots, { 'rug-a': 'rug1' }, 'rug1', rugCat, 'rug-b');
    expect(r).toMatchObject({ ok: true, placement: { 'rug-a': null, 'rug-b': 'rug1' }, displaced: null, swappedTo: null });
  });

  it('同じ group 内で別のラグが置かれた場所へ動かすと、入れ替えず displaced になる', () => {
    const r = placeFurniture(rugSlots, { 'rug-a': 'rug1', 'rug-b': 'rug2' }, 'rug1', rugCat, 'rug-b');
    expect(r).toMatchObject({ ok: true, placement: { 'rug-a': null, 'rug-b': 'rug1' }, displaced: 'rug2', swappedTo: null });
  });

  it('古いデータで同じ group に複数あっても全部外し、displaced は最初の 1 つ', () => {
    const r = placeFurniture(rugSlots, { 'rug-a': 'rug1', 'rug-b': 'rug2' }, 'rug3', rugCat, 'rug-c');
    expect(r).toMatchObject({ ok: true, displaced: 'rug1' });
    if (r.ok) expect(Object.values(r.placement).filter((f) => f?.startsWith('rug'))).toEqual(['rug3']);
  });

  it('group を持たない置き場所は今までどおり入れ替わる', () => {
    const r = placeFurniture(rugSlots, { 'floor-a': 'bed', 'floor-b': 'sofa' }, 'bed', rugCat, 'floor-b');
    expect(r).toMatchObject({ ok: true, swappedTo: 'floor-a', displaced: null });
  });

  it('autoSlot: group に何も無ければ最初の空き', () => {
    expect(autoSlot(rugSlots, {}, 'rug')?.id).toBe('rug-a');
  });

  it('autoSlot: group に置かれていればその置き場所（その場で置き換え）', () => {
    expect(autoSlot(rugSlots, { 'rug-b': 'rug1' }, 'rug')?.id).toBe('rug-b');
  });

  it('autoSlot: group なしの置き場所は従来どおり', () => {
    expect(autoSlot(rugSlots, { 'floor-a': 'sofa' }, 'bed')?.id).toBe('floor-b');
  });

  it('occupiedSlots: 置かれた場所と同じ group の場所すべて。除外した家具は数えない', () => {
    const p = { 'rug-b': 'rug1', 'floor-a': 'sofa' };
    expect([...occupiedSlots(rugSlots, p)].sort()).toEqual(['floor-a', 'rug-a', 'rug-b', 'rug-c']);
    expect([...occupiedSlots(rugSlots, p, 'rug1')]).toEqual(['floor-a']);
  });
});
