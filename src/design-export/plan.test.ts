import { describe, expect, it } from 'vitest';
import { FURNITURE, furnitureById } from '../data/furniture';
import { SPECIES } from '../data/species';
import { MODS } from '../domain/pet';
import { HOUR, PET_STATES, PET_STATE_OVERRIDES, furnitureVariants, modulationOf, planAssets, type FurnitureSpec, type SurfaceSpec } from './plan';

const plan = planAssets();
const count = (kind: string) => plan.filter((a) => a.kind === kind).length;

describe('家具の変種', () => {
  it('置き場所の向きから導く（bed は 2、rug は 1、table は 1）', () => {
    expect(furnitureVariants(furnitureById['bed-oat'])).toEqual(['plain', 'mirrored']);
    expect(furnitureVariants(furnitureById['rug-wave'])).toEqual(['plain']);
    expect(furnitureVariants(furnitureById['table-round'])).toEqual(['plain']);
    expect(furnitureVariants(furnitureById['clock-round'])).toEqual(['plain', 'wall-left', 'wall-right']);
  });

  it('ファイル数: 時刻で変わる clock は 3 変種 × 昼夜 = 6', () => {
    const clock = plan.filter((a): a is FurnitureSpec => a.kind === 'furniture' && a.furnitureId === 'clock-round');
    expect(clock).toHaveLength(6);
    expect(clock.map((a) => a.path).sort()).toEqual([
      'furniture/clock-round_day',
      'furniture/clock-round_night',
      'furniture/clock-round_wall-left_day',
      'furniture/clock-round_wall-left_night',
      'furniture/clock-round_wall-right_day',
      'furniture/clock-round_wall-right_night',
    ]);
  });

  it('家具のファイルは合計 39', () => {
    expect(count('furniture')).toBe(39);
    const by = (kind: string) => plan.filter((a): a is FurnitureSpec => a.kind === 'furniture' && furnitureById[a.furnitureId].kind === kind).length;
    expect([by('bed'), by('desk'), by('bookshelf'), by('lowtable'), by('cushion') + by('beanbag'), by('plant') + by('cactus'), by('lamp'), by('rug'), by('clock'), by('poster')]).toEqual([4, 4, 2, 1, 4, 6, 4, 2, 6, 6]);
  });

  it('時刻は昼 12:00・夜 21:00、時計だけ昼 10:10', () => {
    const hours = (id: string, time: string) => plan.find((a) => a.kind === 'furniture' && a.furnitureId === id && a.time === time && a.variant === 'plain');
    expect((hours('desk-birch', 'day') as FurnitureSpec).hour).toBe(12);
    expect((hours('desk-birch', 'night') as FurnitureSpec).hour).toBe(21);
    expect((hours('clock-round', 'day') as FurnitureSpec).hour).toBeCloseTo(10 + 10 / 60);
    expect((hours('clock-round', 'night') as FurnitureSpec).hour).toBe(21);
    expect(HOUR.clockDay).toBeCloseTo(10.1667, 3);
  });
});

describe('一覧の数と名前', () => {
  it('ペット 51・おみせ 16・部屋 3・壁と床 12・アイコン 1', () => {
    expect(PET_STATES).toHaveLength(17);
    expect(count('pet')).toBe(SPECIES.length * 17);
    expect(count('pet')).toBe(51);
    expect(count('thumb')).toBe(FURNITURE.length);
    expect(count('thumb')).toBe(16);
    expect(count('room') + count('room-tint')).toBe(3);
    expect(count('surface')).toBe(12);
    expect(count('icon')).toBe(1);
    expect(plan).toHaveLength(39 + 16 + 51 + 3 + 12 + 1);
  });

  it('パスが重ならない。大文字小文字だけが違う名前もない', () => {
    const paths = plan.map((a) => a.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(paths.map((p) => p.toLowerCase())).size).toBe(paths.length);
  });

  it('ラベルがあり、ファイル名に使えない文字がない', () => {
    for (const a of plan) {
      expect(a.label.length).toBeGreaterThan(0);
      expect(a.path).toMatch(/^[a-z0-9_\-/]+$/);
    }
  });
});

describe('壁と床の面', () => {
  const surfaces = plan.filter((a): a is SurfaceSpec => a.kind === 'surface');
  it('3 面 × 斜め・平ら × 昼夜 = 12。パスの例', () => {
    const paths = surfaces.map((a) => a.path);
    expect(paths).toContain('surface/wall-left_day');
    expect(paths).toContain('surface/wall-left_flat_day');
    expect(paths).toContain('surface/floor_flat_night');
    expect(paths).toContain('surface/wall-right_night');
    expect(surfaces.filter((a) => a.flat)).toHaveLength(6);
  });
  it('時刻は部屋と同じ（昼 12:00・夜 21:00）', () => {
    for (const a of surfaces) expect(a.hour).toBe(a.time === 'day' ? HOUR.day : HOUR.night);
  });
});

describe('ペットの状態', () => {
  it('調子は domain/pet.ts の MODS から取る', () => {
    expect(modulationOf(PET_STATES.find((s) => s.id === 'sleep')!)).toBe(MODS.asleep);
    expect(modulationOf(PET_STATES.find((s) => s.id === 'happy')!)).toBe(MODS.happy);
  });

  it('作業票の表と違えたものは PET_STATE_OVERRIDES に残す', () => {
    for (const o of PET_STATE_OVERRIDES) {
      const st = PET_STATES.find((s) => s.id === o.id)!;
      expect(st[o.field]).toBe(o.app);
      expect(o.ticket).not.toBe(o.app);
    }
    expect(PET_STATE_OVERRIDES.map((o) => o.id)).toEqual(['eat']);
  });
});
