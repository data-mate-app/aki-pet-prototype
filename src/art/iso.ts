/**
 * 斜め見下ろし（アイソメトリック）の投影。
 * 部屋・家具・ペットの位置はすべて床のマス座標 (gx, gy, gz) で持ち、
 * ここで画面座標へ変換する。全部が同じ式を通るので、遠近と接地がずれない。
 * （New Roots で「貼り付けたように見える」と指摘された問題を、構造で避ける）
 *
 *        奥の角 (0,0)          左の壁: gx=0 の面
 *          /\                  右の壁: gy=0 の面
 *  (0,N)  /  \  (N,0)
 *         \  /
 *          \/
 *        手前の角 (N,N)
 *
 * iso() は奥の角を (0,0) とする局所座標を返す。部屋の SVG では
 * ORIGIN だけずらした <g> の中に描く。
 */
export const GRID = 5;
export const U = 100;
export const COS = Math.cos(Math.PI / 6);
export const SIN = 0.5;
export const ORIGIN = { x: 500, y: 430 };
export const WALL_H = 4;
export const CANVAS = { w: 1000, h: 1000 };

export function iso(gx: number, gy: number, gz = 0): { x: number; y: number } {
  return { x: (gx - gy) * COS * U, y: (gx + gy) * SIN * U - gz * U };
}

/** 部屋キャンバス（1000×1000）上の座標 */
export function toCanvas(gx: number, gy: number, gz = 0): { x: number; y: number } {
  const p = iso(gx, gy, gz);
  return { x: p.x + ORIGIN.x, y: p.y + ORIGIN.y };
}

/** キャンバス座標から床のマス座標へ（gz=0 の平面） */
export function fromCanvas(x: number, y: number): { gx: number; gy: number } {
  const a = (x - ORIGIN.x) / (COS * U);
  const b = (y - ORIGIN.y) / (SIN * U);
  return { gx: (a + b) / 2, gy: (b - a) / 2 };
}

export function pts(points: [number, number, number][]): string {
  return points
    .map(([gx, gy, gz]) => {
      const p = iso(gx, gy, gz);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');
}

/** 描画の前後関係。手前（gx+gy が大きい）ほど上に重ねる */
export function depthOf(gx: number, gy: number): number {
  return Math.round((gx + gy) * 100);
}

export type Shade = { top: string; left: string; right: string };

/** 色から上面・左手前面・右手前面の 3 色を作る（光は右上から） */
export function shade(hex: string, amount = 1, mirrored = false): Shade {
  const left = adjust(hex, -0.05 * amount);
  const right = adjust(hex, -0.17 * amount);
  return { top: adjust(hex, 0.1 * amount), left: mirrored ? right : left, right: mirrored ? left : right };
}

export function adjust(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = amt >= 0 ? c + (255 - c) * amt : c * (1 + amt);
    return Math.round(Math.max(0, Math.min(255, v)));
  });
  return '#' + ch.map((c) => c.toString(16).padStart(2, '0')).join('');
}

/**
 * 直方体。(x,y,z) から gx 方向 w、gy 方向 d、高さ h。
 * 見える 3 面（上・左手前・右手前）の points を返す。
 */
export function box(x: number, y: number, z: number, w: number, d: number, h: number) {
  return {
    top: pts([
      [x, y, z + h],
      [x + w, y, z + h],
      [x + w, y + d, z + h],
      [x, y + d, z + h],
    ]),
    left: pts([
      [x, y + d, z],
      [x + w, y + d, z],
      [x + w, y + d, z + h],
      [x, y + d, z + h],
    ]),
    right: pts([
      [x + w, y, z],
      [x + w, y + d, z],
      [x + w, y + d, z + h],
      [x + w, y, z + h],
    ]),
  };
}

/** 平らな絵を床・壁へ貼るための SVG 行列。絵は 1 マス = 100 の平面に描く */
export const PLANE = {
  /** 床: u→gx, v→gy */
  floor: `matrix(${COS},${SIN},${-COS},${SIN},0,0)`,
  /** 左の壁: u→奥の角へ（gy が減る向き。正面から見て左右が反転しない）, v→下向き */
  leftWall: `matrix(${COS},${-SIN},0,1,0,0)`,
  /** 右の壁: u→gx（手前へ）, v→下向き */
  rightWall: `matrix(${COS},${SIN},0,1,0,0)`,
};
