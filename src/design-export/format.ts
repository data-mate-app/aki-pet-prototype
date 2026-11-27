/**
 * 書き出しの書式まわり（DOM に依存しない純粋な関数）。
 * 数値は小数 3 桁まで、色は #rrggbb と不透明度に分ける、変形は単位行列を省く。
 */

/** 小数 3 桁に丸め、末尾の 0 を落とす。-0 は 0 */
export function fmt(n: number, digits = 3): string {
  const k = 10 ** digits;
  const r = Math.round(n * k) / k;
  if (Object.is(r, -0) || r === 0) return '0';
  return String(r);
}

/** 文字列に含まれる数値をすべて fmt で丸める（points・d・transform 用） */
export function roundNumbers(s: string): string {
  return s.replace(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi, (m) => fmt(Number(m)));
}

/** SVG の行列 [a b c d e f]（x' = a x + c y + e, y' = b x + d y + f） */
export type Mat = readonly [number, number, number, number, number, number];

export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

/** m1 を外側、m2 を内側として合成する（点には m2 → m1 の順で効く） */
export function mul(m1: Mat, m2: Mat): Mat {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

export function inverse(m: Mat): Mat {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-12) throw new Error('逆行列が作れない行列: ' + m.join(','));
  const ia = d / det;
  const ib = -b / det;
  const ic = -c / det;
  const id = a / det;
  return [ia, ib, ic, id, -(ia * e + ic * f), -(ib * e + id * f)];
}

export function applyToPoint(m: Mat, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

const EPS = 1e-6;

export function isIdentity(m: Mat): boolean {
  return IDENTITY.every((v, i) => Math.abs(m[i] - v) < EPS);
}

/** transform 属性の値。単位行列は null（属性を書かない）、平行移動だけなら translate() */
export function matrixToTransform(m: Mat): string | null {
  if (isIdentity(m)) return null;
  const linearIsIdentity = Math.abs(m[0] - 1) < EPS && Math.abs(m[1]) < EPS && Math.abs(m[2]) < EPS && Math.abs(m[3] - 1) < EPS;
  if (linearIsIdentity) return `translate(${fmt(m[4])} ${fmt(m[5])})`;
  // 拡大・回転の 4 つ（a〜d）は 3 桁だと入れ子で 0.05px ほどずれて縁の画素が変わるので 6 桁。平行移動（e, f）は 3 桁
  return `matrix(${[...m.slice(0, 4).map((v) => fmt(v, 6)), fmt(m[4]), fmt(m[5])].join(' ')})`;
}

export type ParsedColor = { hex: string; alpha: number };

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

/**
 * 計算済みの色（rgb()/rgba()/#hex/transparent）を #rrggbb と不透明度に分ける。
 * 色として読めなければ null（none や url() など）。
 */
export function parseColor(css: string): ParsedColor | null {
  const s = css.trim().toLowerCase();
  if (s === 'transparent') return { hex: '#000000', alpha: 0 };
  const m = s.match(/^rgba?\(\s*([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const [r, g, b] = parts.slice(0, 3).map(Number);
    let alpha = 1;
    if (parts[3] !== undefined) alpha = parts[3].endsWith('%') ? Number(parts[3].slice(0, -1)) / 100 : Number(parts[3]);
    if ([r, g, b, alpha].some((v) => Number.isNaN(v))) return null;
    return { hex: '#' + hex2(r) + hex2(g) + hex2(b), alpha: Math.max(0, Math.min(1, alpha)) };
  }
  const h = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (h) {
    const v = h[1].length === 3 ? h[1].replace(/./g, (c) => c + c) : h[1];
    return { hex: '#' + v, alpha: 1 };
  }
  return null;
}

export function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
