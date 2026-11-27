import { describe, expect, it } from 'vitest';
import { FLAT_ORIGIN, GRID, PLANE, WALL_H, flatFloor, flatLeftWall, flatRightWall, iso, pts } from './iso';

/** 'matrix(a,b,c,d,e,f)' を点へ掛ける */
function apply(matrix: string, p: { x: number; y: number }) {
  const m = matrix.match(/^matrix\(([^)]+)\)$/);
  if (!m) throw new Error(matrix);
  const [a, b, c, d, e, f] = m[1].split(',').map(Number);
  return { x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f };
}
const back = (matrix: string, origin: { x: number; y: number }, p: { x: number; y: number }) => {
  const q = apply(matrix, p);
  return { x: q.x + origin.x, y: q.y + origin.y };
};

const steps = [0, 0.5, 1.1, 2, 3.7, GRID];
function close(a: { x: number; y: number }, b: { x: number; y: number }) {
  expect(a.x).toBeCloseTo(b.x, 3);
  expect(a.y).toBeCloseTo(b.y, 3);
}

describe('平らな面の座標を PLANE の行列で部屋へ戻す', () => {
  it('左の壁', () => {
    for (const gy of steps) for (const gz of [0, 0.12, 1.1, WALL_H]) close(back(PLANE.leftWall, FLAT_ORIGIN.leftWall, flatLeftWall(0, gy, gz)), iso(0, gy, gz));
  });
  it('右の壁', () => {
    for (const gx of steps) for (const gz of [0, 0.12, 1.1, WALL_H]) close(back(PLANE.rightWall, FLAT_ORIGIN.rightWall, flatRightWall(gx, 0, gz)), iso(gx, 0, gz));
  });
  it('床', () => {
    for (const gx of steps) for (const gy of steps) close(back(PLANE.floor, FLAT_ORIGIN.floor, flatFloor(gx, gy, 0)), iso(gx, gy, 0));
  });
  it('原点の置き場所は左の壁の上の手前角・右の壁の奥の上角・床の奥の角', () => {
    expect(FLAT_ORIGIN.leftWall).toEqual(iso(0, GRID, WALL_H));
    expect(FLAT_ORIGIN.rightWall).toEqual(iso(0, 0, WALL_H));
    expect(FLAT_ORIGIN.floor).toEqual(iso(0, 0, 0));
  });
});

describe('平らな座標の向き', () => {
  it('左の壁: 奥の角（gy=0）が右、腰壁（gz 小）が下', () => {
    expect(flatLeftWall(0, 0, 0)).toEqual({ x: 500, y: 400 });
    expect(flatLeftWall(0, GRID, WALL_H)).toEqual({ x: 0, y: 0 });
  });
  it('右の壁: 奥の角（gx=0）が左、腰壁が下', () => {
    expect(flatRightWall(0, 0, 0)).toEqual({ x: 0, y: 400 });
    expect(flatRightWall(GRID, 0, WALL_H)).toEqual({ x: 500, y: 0 });
  });
  it('床: 上から見た向き（u→gx、v→gy）', () => {
    expect(flatFloor(GRID, 0)).toEqual({ x: 500, y: 0 });
    expect(flatFloor(0, GRID)).toEqual({ x: 0, y: 500 });
  });
});

describe('pts', () => {
  it('投影を渡せる。省略すると iso', () => {
    expect(pts([[1, 2, 0]])).toBe(`${iso(1, 2, 0).x.toFixed(1)},${iso(1, 2, 0).y.toFixed(1)}`);
    expect(pts([[0, 1, 3]], flatLeftWall)).toBe('400.0,100.0');
  });
});
