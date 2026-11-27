import { describe, expect, it } from 'vitest';
import { BAND_W, HOME_ZONE, VIEW_W, ZONES, maxScroll, neighborOf, scrollRatio, viewRatio, zoneIndexAt } from './zones';

describe('zones', () => {
  it('止まる位置はそれぞれ自分の場所になる', () => {
    ZONES.forEach((z, i) => expect(zoneIndexAt(z.snap)).toBe(i));
  });

  it('止まる位置は帯の範囲に収まり、左から順に並ぶ', () => {
    ZONES.forEach((z, i) => {
      expect(z.snap).toBeGreaterThanOrEqual(0);
      expect(z.snap).toBeLessThanOrEqual(maxScroll());
      if (i > 0) expect(z.snap).toBeGreaterThan(ZONES[i - 1].snap);
    });
  });

  it('途中ではいちばん近い場所になる', () => {
    expect(zoneIndexAt(100)).toBe(0);
    expect(zoneIndexAt(300)).toBe(1);
    expect(zoneIndexAt(600)).toBe(2);
    expect(zoneIndexAt(1000)).toBe(3);
  });

  it('同じ距離のときは左の場所', () => {
    expect(zoneIndexAt(190)).toBe(0);
    expect(zoneIndexAt(570)).toBe(1);
  });

  it('範囲の外でも端の場所に収まる', () => {
    expect(zoneIndexAt(-50)).toBe(0);
    expect(zoneIndexAt(9999)).toBe(ZONES.length - 1);
  });

  it('初期位置はちゃのま', () => {
    expect(ZONES[HOME_ZONE].id).toBe('chanoma');
  });

  it('となりの場所。端では null', () => {
    expect(neighborOf(0, -1)).toBeNull();
    expect(neighborOf(0, 1)).toBe(1);
    expect(neighborOf(3, 1)).toBeNull();
    expect(neighborOf(3, -1)).toBe(2);
  });

  it('スクロールの割合', () => {
    expect(scrollRatio(0)).toBe(0);
    expect(scrollRatio(maxScroll())).toBe(1);
    expect(scrollRatio(-10)).toBe(0);
    expect(scrollRatio(99999)).toBe(1);
    expect(viewRatio()).toBeCloseTo(VIEW_W / BAND_W);
  });
});
