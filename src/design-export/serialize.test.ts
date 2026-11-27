import { describe, expect, it } from 'vitest';
import { applyToPoint, type Mat } from './format';
import { ellipseBounds } from './serialize';

/** 点を標本にして測った外接矩形（総当たり） */
function sampled(m: Mat, cx: number, cy: number, rx: number, ry: number): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < 20000; i++) {
    const t = (i / 20000) * Math.PI * 2;
    const [x, y] = applyToPoint(m, cx + rx * Math.cos(t), cy + ry * Math.sin(t));
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1];
}

describe('ellipseBounds（楕円の外接矩形は解析解）', () => {
  const iso: Mat = [0.866, 0.5, -0.866, 0.5, 12, -7]; // 床へ斜めに投影する行列の例

  it('斜めに写しても、図形の上の点で測った値と一致する', () => {
    const got = ellipseBounds(iso, 5, -3, 128, 128);
    const want = sampled(iso, 5, -3, 128, 128);
    got.forEach((v, i) => expect(v).toBeCloseTo(want[i], 1));
  });

  it('ローカルの外接矩形の四隅を写すより小さい', () => {
    const [cx, cy, r] = [0, 0, 128];
    const corners = [applyToPoint(iso, cx - r, cy - r), applyToPoint(iso, cx + r, cy - r), applyToPoint(iso, cx + r, cy + r), applyToPoint(iso, cx - r, cy + r)];
    const cornerW = Math.max(...corners.map((p) => p[0])) - Math.min(...corners.map((p) => p[0]));
    const [x0, , x1] = ellipseBounds(iso, cx, cy, r, r);
    expect(x1 - x0).toBeLessThan(cornerW - 1);
  });

  it('平行移動と拡大だけなら、普通の円の矩形', () => {
    expect(ellipseBounds([2, 0, 0, 2, 10, 20], 1, 1, 5, 5)).toEqual([2 + 10 - 10, 2 + 20 - 10, 2 + 10 + 10, 2 + 20 + 10]);
  });
});
