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

/**
 * 文字列に含まれる数値をすべて fmt で丸める（points・d・transform 用）。
 * SVG のパスでは負号や小数点が区切りを兼ねる（`10-0.0001` は 10 と -0.0001）。
 * 丸めで負号が消える（-0.0001 → 0）と前の数と繋がるので、元が区切りに頼っていた所には空白を入れる。
 */
export function roundNumbers(s: string): string {
  return s.replace(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi, (m, offset: number) => {
    const out = fmt(Number(m));
    const prev = offset > 0 ? s[offset - 1] : '';
    return /[\d.]/.test(prev) && !out.startsWith('-') ? ' ' + out : out;
  });
}

/** 時刻（小数の時間）を h:mm にする。16.5 → "16:30"、0 → "0:00"（分は 60 進法。0.5 を "30" と書く） */
export function formatHour(h: number): string {
  let hh = Math.floor(h + 1e-9);
  let mm = Math.round((h - hh) * 60);
  if (mm === 60) {
    hh += 1;
    mm = 0;
  }
  return `${hh}:${String(mm).padStart(2, '0')}`;
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

/** DTCG 2025.10 の色の値。components は 0〜1、alpha は不透明度、hex は参考 */
export type DtcgColor = { colorSpace: 'srgb'; components: [number, number, number]; alpha: number; hex: string };

export function toDtcgColor(css: string): DtcgColor {
  const c = parseColor(css);
  if (!c) throw new Error(`色を読めない: ${css}`);
  const comp = (i: number) => Number(fmt(parseInt(c.hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255, 4));
  return { colorSpace: 'srgb', components: [comp(0), comp(1), comp(2)], alpha: Number(fmt(c.alpha, 4)), hex: c.hex };
}

export type DtcgDimension = { value: number; unit: 'px' };
export type DtcgShadow = { color: DtcgColor; offsetX: DtcgDimension; offsetY: DtcgDimension; blur: DtcgDimension; spread: DtcgDimension };

/** `,` のうち括弧の外にあるものだけで分ける */
function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** CSS の box-shadow（`0 2px 6px rgba(...), 0 18px 40px rgba(...)`）を DTCG の shadow の配列にする。inset や px 以外は未対応（例外） */
export function parseBoxShadow(css: string): DtcgShadow[] {
  return splitTop(css, ',').map((one) => {
    const m = one.match(/^(.*?)(rgba?\([^)]*\)|#[0-9a-fA-F]{3,6})\s*$/) ?? one.match(/^(rgba?\([^)]*\)|#[0-9a-fA-F]{3,6})\s+(.*)$/);
    if (!m) throw new Error(`影を読めない: ${one}`);
    const colorFirst = /^rgba?\(|^#/.test(m[1]);
    const color = colorFirst ? m[1] : m[2];
    const lengths = (colorFirst ? m[2] : m[1]).trim().split(/\s+/).filter(Boolean);
    if (lengths.length < 2 || lengths.length > 4 || lengths.some((l) => !/^-?[\d.]+(px)?$/.test(l))) throw new Error(`影の長さを読めない: ${one}`);
    const px = (i: number): DtcgDimension => ({ value: Number(fmt(i < lengths.length ? parseFloat(lengths[i]) : 0)), unit: 'px' });
    return { color: toDtcgColor(color), offsetX: px(0), offsetY: px(1), blur: px(2), spread: px(3) };
  });
}

export function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
