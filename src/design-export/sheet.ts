import { FURNITURE } from '../data/furniture';
import { SPECIES } from '../data/species';
import { escapeText, fmt, matrixToTransform } from './format';
import { PET_STATES, SURFACES, type AssetSpec, type FurnitureSpec, type SurfaceSpec } from './plan';

/**
 * 一覧シート（design/sheet.svg）。第 1 段の各 SVG の中身を作り直さずに並べる。
 * 純粋な文字列の組み立てだけ。ブラウザも Node も要らない。
 */

export type SheetAsset = { svg: string; viewBox: [number, number, number, number]; size: [number, number] };

const INK = '#252340';
const INK3 = '#8a87a6';
const HAZE = '#eef1fa';
const FONT = "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif";

export function text(x: number, y: number, size: number, weight: number, fill: string, s: string, anchor: 'start' | 'middle' = 'start', id?: string): string {
  const a = [id ? `id="${id}"` : '', `x="${fmt(x)}"`, `y="${fmt(y)}"`, `fill="${fill}"`, `font-family="${FONT}"`, `font-size="${size}"`, `font-weight="${weight}"`, anchor === 'middle' ? 'text-anchor="middle"' : ''].filter(Boolean);
  return `<text ${a.join(' ')}>${escapeText(s)}</text>`;
}

/** 書き出した SVG の中身（root の中）に、id と url(#…) の前へ `${stem}__` を付ける */
export function prefixIds(inner: string, stem: string): string {
  return inner.replace(/\bid="([^"]*)"/g, (_, id) => `id="${stem}__${id}"`).replace(/url\(#([^)]*)\)/g, (_, id) => `url(#${stem}__${id})`);
}

export function innerOf(svg: string): string {
  const m = svg.match(/^<svg[^>]*>\n([\s\S]*)<\/svg>\n?$/);
  if (!m) throw new Error('svg の形が想定と違う');
  return m[1];
}

/** 1 アセットを <g id="stem" transform> として置く。(ox, oy) は絵の原点 (0,0) を置くシート上の位置 */
function place(stem: string, asset: SheetAsset, transform: string | null): string {
  const inner = prefixIds(innerOf(asset.svg), stem)
    .split('\n')
    .filter(Boolean)
    .map((l) => '  ' + l)
    .join('\n');
  return `<g id="${stem}"${transform ? ` transform="${transform}"` : ''}>\n${inner}\n</g>`;
}

/** シート上の id の元。種類を前に付ける（furniture/bed-oat と thumb/bed-oat を別にする）。furniture-bed-oat */
export const stemOf = (path: string) => path.replace(/\//g, '-');

const thumbLabel = (path: string) => path.split('/').pop()!;

function variantLabel(s: FurnitureSpec, hasWall: boolean): string {
  const parts: string[] = [];
  if (s.variant === 'plain') parts.push(hasWall ? '正面' : 'そのまま');
  else parts.push({ mirrored: '左右反転', 'wall-left': '左の壁', 'wall-right': '右の壁' }[s.variant]);
  if (s.time) parts.push(s.time === 'day' ? '昼' : '夜');
  return parts.join('・');
}

export function buildSheet(specs: AssetSpec[], assets: Map<string, SheetAsset>): string {
  const get = (p: string) => {
    const a = assets.get(p);
    if (!a) throw new Error(`シートに置くアセットがない: ${p}`);
    return a;
  };
  const body: string[] = [];
  const LEFT = 80;
  const LABEL_W = 320;
  let maxRight = 0;
  let y = 80;
  const note = (right: number) => {
    maxRight = Math.max(maxRight, right);
  };

  body.push(text(LEFT, y + 56, 64, 700, INK, 'DataMate アセット一覧', 'start', 'title'));
  y += 150;
  const heading = (id: string, label: string) => {
    body.push(text(LEFT, y + 40, 44, 700, INK, label, 'start', id));
    y += 100;
  };

  // ---- 家具 ----
  heading('section-furniture', '家具');
  for (const def of FURNITURE) {
    const vs = specs.filter((s): s is FurnitureSpec => s.kind === 'furniture' && s.furnitureId === def.id);
    const hasWall = vs.some((s) => s.variant === 'wall-left');
    const up = Math.max(...vs.map((s) => -get(s.path).viewBox[1]));
    const down = Math.max(...vs.map((s) => get(s.path).viewBox[1] + get(s.path).viewBox[3]));
    const oy = y + up;
    body.push(text(LEFT, oy - 10, 30, 700, INK, def.name));
    body.push(text(LEFT, oy + 24, 20, 500, INK3, def.id));
    let x = LEFT + LABEL_W;
    for (const s of vs) {
      const a = get(s.path);
      const [vx, , vw] = a.viewBox;
      body.push(place(stemOf(s.path), a, matrixToTransform([1, 0, 0, 1, x - vx, oy])));
      body.push(text(x + vw / 2, oy + down + 30, 18, 500, INK3, variantLabel(s, hasWall), 'middle'));
      x += vw + 40;
    }
    note(x);
    y += up + down + 90;
  }

  // ---- おみせの絵 ----
  y += 20;
  heading('section-thumb', 'おみせの絵');
  const thumbs = specs.filter((s) => s.kind === 'thumb');
  const CELL = 220;
  thumbs.forEach((s, i) => {
    const a = get(s.path);
    const col = i % 8;
    const row = Math.floor(i / 8);
    const x0 = LEFT + col * CELL + (CELL - a.size[0]) / 2;
    const y0 = y + row * 180;
    const k = a.size[0] / a.viewBox[2];
    body.push(place(stemOf(s.path), a, matrixToTransform([k, 0, 0, k, x0 - a.viewBox[0] * k, y0 - a.viewBox[1] * k])));
    body.push(text(LEFT + col * CELL + CELL / 2, y0 + a.size[1] + 28, 16, 500, INK3, thumbLabel(s.path), 'middle'));
    note(LEFT + (col + 1) * CELL);
  });
  y += Math.ceil(thumbs.length / 8) * 180 + 60;

  // ---- ペット ----
  heading('section-pet', 'ペット');
  const PCELL = 230;
  for (const sp of SPECIES) {
    const ps = specs.filter((s) => s.kind === 'pet' && s.speciesId === sp.id);
    const up = Math.max(...ps.map((s) => -get(s.path).viewBox[1]));
    const down = Math.max(...ps.map((s) => get(s.path).viewBox[1] + get(s.path).viewBox[3]));
    const oy = y + up; // 足元の線。17 状態ですべてここにそろえる
    body.push(text(LEFT, oy - 10, 30, 700, INK, sp.label));
    body.push(text(LEFT, oy + 24, 20, 500, INK3, sp.animal));
    ps.forEach((s, i) => {
      const cx = LEFT + LABEL_W + i * PCELL + PCELL / 2;
      body.push(place(stemOf(s.path), get(s.path), matrixToTransform([1, 0, 0, 1, cx, oy])));
      body.push(text(cx, oy + down + 30, 18, 500, INK3, PET_STATES[i].label, 'middle'));
    });
    note(LEFT + LABEL_W + ps.length * PCELL);
    y += up + down + 90;
  }

  // ---- 部屋・アイコン ----
  y += 20;
  heading('section-room', '部屋');
  {
    const rs = specs.filter((s) => s.kind === 'room' || s.kind === 'room-tint');
    const up = Math.max(...rs.map((s) => -get(s.path).viewBox[1]));
    const down = Math.max(...rs.map((s) => get(s.path).viewBox[1] + get(s.path).viewBox[3]));
    const oy = y + up;
    let x = LEFT;
    for (const s of rs) {
      const a = get(s.path);
      body.push(place(stemOf(s.path), a, matrixToTransform([1, 0, 0, 1, x - a.viewBox[0], oy])));
      body.push(text(x + a.viewBox[2] / 2, oy + down + 34, 22, 500, INK3, s.label, 'middle'));
      x += a.viewBox[2] + 60;
    }
    note(x);
    y += up + down + 110;
  }
  // ---- 壁と床 ----
  heading('section-surface', '壁と床');
  for (const sf of SURFACES) {
    const ss = specs.filter((s): s is SurfaceSpec => s.kind === 'surface' && s.surface === sf.id);
    const rowH = Math.max(...ss.map((s) => get(s.path).viewBox[3]));
    body.push(text(LEFT, y + 30, 30, 700, INK, sf.label));
    body.push(text(LEFT, y + 64, 20, 500, INK3, sf.id));
    let x = LEFT + LABEL_W;
    // 左上をそろえて並べる（斜めは奥の角が原点、平らは左上が原点。シートでは viewBox の左上を置く）
    for (const s of ss) {
      const a = get(s.path);
      body.push(place(stemOf(s.path), a, matrixToTransform([1, 0, 0, 1, x - a.viewBox[0], y - a.viewBox[1]])));
      body.push(text(x + a.viewBox[2] / 2, y + rowH + 30, 18, 500, INK3, `${s.flat ? '平ら（正面）' : '斜め（部屋の中）'}・${s.time === 'day' ? '昼' : '夜'}`, 'middle'));
      x += a.viewBox[2] + 40;
    }
    note(x);
    y += rowH + 90;
  }
  y += 20;
  heading('section-icon', 'アイコン');
  {
    const s = specs.find((q) => q.kind === 'icon')!;
    const a = get(s.path);
    body.push(place(stemOf(s.path), a, matrixToTransform([1, 0, 0, 1, LEFT, y])));
    body.push(text(LEFT + 32, y + 64 + 34, 22, 500, INK3, s.label, 'middle'));
    y += 64 + 90;
  }

  const W = maxRight + LEFT - 40;
  const H = y + 20;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`];
  out.push(`  <rect id="sheet-background" x="0" y="0" width="${W}" height="${H}" fill="${HAZE}"/>`);
  for (const b of body) out.push(b.split('\n').map((l) => '  ' + l).join('\n'));
  out.push('</svg>');
  return out.join('\n') + '\n';
}
