import tokensCss from '../styles/tokens.css?raw';
import { BOOK_COLORS } from '../art/Furniture';
import { shade } from '../art/iso';
import { FURNITURE } from '../data/furniture';
import { SPECIES } from '../data/species';
import { keys } from '../domain/daylight';
import { fmt, formatHour, parseBoxShadow, parseColor, toDtcgColor, type DtcgColor, type DtcgShadow } from './format';
import { text } from './sheet';

/**
 * 色と文字の一覧（design/palette.svg）と design/tokens.json。
 * 値は tokens.css・daylight.ts・furniture.ts・species.ts・Furniture.tsx から読む（手で写さない）。
 */

const INK = '#252340';
const INK3 = '#8a87a6';
const HAZE = '#eef1fa';
export const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Zen+Maru+Gothic:wght@500;700;900&display=swap';

// ---------- tokens.css の読み取り ----------

export type CssVar = { name: string; value: string };

export function readRootVars(css: string): CssVar[] {
  const block = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!block) throw new Error(':root が見つからない');
  const out: CssVar[] = [];
  for (const m of block[1].matchAll(/^\s*--([\w-]+):\s*([^;]+);/gm)) out.push({ name: m[1], value: m[2].trim() });
  return out;
}

/** 冒頭のコメントの「夜インク  ink  …」から、色の日本語名を読む */
export function readJapaneseNames(css: string): Record<string, string> {
  const head = css.match(/^\/\*([\s\S]*?)\*\//)?.[1] ?? '';
  const out: Record<string, string> = {};
  for (const m of head.matchAll(/^ \*\s+(\S+)\s+([a-z][\w-]*)\s/gm)) out[m[2]] = m[1];
  return out;
}

const isColor = (v: string) => /^#|^rgba?\(/.test(v);

type Swatch = { id: string; label: string; sub?: string; value: string };

function parts(value: string): { hex: string; alpha: number } {
  const c = parseColor(value);
  if (!c) throw new Error(`色を読めない: ${value}`);
  return c;
}

export type Data = {
  app: Swatch[];
  shadows: CssVar[];
  fonts: { display: string; body: string };
  roomHours: { h: number; label: string; swatches: Swatch[]; lampGlow: number; sun: number }[];
  furniture: { id: string; name: string; swatches: Swatch[] }[];
  books: Swatch[];
  pets: { id: string; name: string; swatches: Swatch[] }[];
};

const LIGHT_PROPS = ['skyTop', 'skyBottom', 'wallL', 'wallR', 'floorA', 'floorB', 'tint'] as const;
const LIGHT_JA: Record<(typeof LIGHT_PROPS)[number], string> = { skyTop: '空 上', skyBottom: '空 下', wallL: '壁 左', wallR: '壁 右', floorA: '床 A', floorB: '床 B', tint: '色かぶせ' };
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const hourId = (h: number) => String(h).replace('.', '_');

/** css は tokens.css の中身。既定は ?raw で読んだもの（vitest では css:false の間 ?raw が空になるため、テストは fs で読んで渡す） */
export function collect(css: string = tokensCss): Data {
  const vars = readRootVars(css);
  const ja = readJapaneseNames(css);
  const app: Swatch[] = vars.filter((v) => isColor(v.value)).map((v) => ({ id: v.name, label: ja[v.name] ? `${ja[v.name]}  ${v.name}` : v.name, value: v.value }));
  const shadows = vars.filter((v) => v.name.startsWith('shadow-'));
  const font = (n: string) => vars.find((v) => v.name === n)?.value ?? '';

  const roomHours = keys
    .filter((k) => k.h < 24)
    .map((k) => ({
      h: k.h,
      label: formatHour(k.h),
      swatches: LIGHT_PROPS.map((p) => ({ id: `room-${hourId(k.h)}-${kebab(p)}`, label: LIGHT_JA[p], value: k.light[p] })),
      lampGlow: k.light.lampGlow,
      sun: k.light.sun,
    }));

  const furniture = FURNITURE.map((f) => {
    const s = shade(f.color);
    return {
      id: f.id,
      name: f.name,
      swatches: [
        { id: `furniture-${f.id}-color`, label: '主色', value: f.color },
        { id: `furniture-${f.id}-accent`, label: '差し色', value: f.accent },
        { id: `furniture-${f.id}-top`, label: '上 +10%', value: s.top },
        { id: `furniture-${f.id}-left`, label: '左手前 -5%', value: s.left },
        { id: `furniture-${f.id}-right`, label: '右手前 -17%', value: s.right },
      ],
    };
  });
  const books = BOOK_COLORS.map((c, i) => ({ id: `book-${i + 1}`, label: `本 ${i + 1}`, value: c }));
  const pets = SPECIES.map((sp) => ({
    id: sp.id,
    name: `${sp.label}（${sp.animal}）`,
    swatches: (['body', 'belly', 'accent', 'cheek', 'line'] as const).map((k) => ({ id: `pet-${sp.id}-${k}`, label: k, value: sp.palette[k] })),
  }));
  return { app, shadows, fonts: { display: font('font-display'), body: font('font-body') }, roomHours, furniture, books, pets };
}

// ---------- palette.svg ----------

const W = 1760;
const M = 80;

function swatchRect(id: string, x: number, y: number, size: number, value: string): string {
  const c = parts(value);
  const a = [`id="${id}"`, `x="${x}"`, `y="${y}"`, `width="${size}"`, `height="${size}"`, 'rx="12"', `fill="${c.hex}"`];
  if (c.alpha < 1) a.push(`fill-opacity="${fmt(c.alpha)}"`);
  a.push('stroke="#252340"', 'stroke-opacity="0.12"', 'stroke-width="1"');
  return `<rect ${a.join(' ')}/>`;
}

const hexText = (value: string) => {
  const c = parts(value);
  return c.alpha < 1 ? value.replace(/\s+/g, '') : c.hex;
};

export function buildPalette(d: Data = collect()): string {
  const out: string[] = [];
  let y = M;
  out.push(text(M, y + 56, 56, 700, INK, 'DataMate 色と文字', 'start', 'title'));
  y += 140;
  const heading = (id: string, label: string, note?: string) => {
    out.push(text(M, y + 36, 38, 700, INK, label, 'start', id));
    if (note) out.push(text(M + 420, y + 36, 18, 500, INK3, note));
    y += 80;
  };

  // アプリの色
  heading('section-app', 'アプリの色', 'src/styles/tokens.css');
  const AC = 340;
  d.app.forEach((s, i) => {
    const x = M + (i % 5) * AC;
    const yy = y + Math.floor(i / 5) * 92;
    out.push(swatchRect(s.id, x, yy, 64, s.value));
    out.push(text(x + 80, yy + 26, 18, 700, INK, s.label));
    out.push(text(x + 80, yy + 52, 16, 500, INK3, hexText(s.value)));
  });
  y += Math.ceil(d.app.length / 5) * 92 + 10;
  d.shadows.forEach((s) => {
    out.push(text(M, y + 18, 15, 500, INK3, `--${s.name}: ${s.value}`));
    y += 28;
  });
  y += 50;

  // 部屋の光
  heading('section-room-light', '部屋の光', 'src/domain/daylight.ts のキー時刻');
  const RC = 190;
  LIGHT_PROPS.forEach((p, i) => out.push(text(M + 110 + i * RC, y + 4, 16, 700, INK3, LIGHT_JA[p])));
  out.push(text(M + 110 + LIGHT_PROPS.length * RC, y + 4, 16, 700, INK3, '灯り / 日ざし'));
  y += 24;
  for (const r of d.roomHours) {
    out.push(text(M, y + 34, 22, 700, INK, r.label));
    r.swatches.forEach((s, i) => {
      const x = M + 110 + i * RC;
      out.push(swatchRect(s.id, x, y, 48, s.value));
      out.push(text(x + 58, y + 20, 14, 500, INK3, hexText(s.value).slice(0, 22)));
    });
    out.push(text(M + 110 + LIGHT_PROPS.length * RC, y + 30, 18, 500, INK, `${fmt(r.lampGlow)} / ${fmt(r.sun)}`));
    y += 72;
  }
  y += 40;

  // 家具の色
  heading('section-furniture', '家具の色', '主色と、直方体の面の明暗（iso.ts の shade()）');
  const FC = 230;
  for (const f of d.furniture) {
    out.push(text(M, y + 24, 22, 700, INK, f.name));
    out.push(text(M, y + 50, 16, 500, INK3, f.id));
    f.swatches.forEach((s, i) => {
      const x = M + 300 + i * FC;
      out.push(swatchRect(s.id, x, y, 56, s.value));
      out.push(text(x + 68, y + 22, 15, 700, INK, s.label));
      out.push(text(x + 68, y + 44, 15, 500, INK3, hexText(s.value)));
    });
    y += 84;
  }
  y += 40;

  // 本の色
  heading('section-book', '本の色', 'BOOK_COLORS（Furniture.tsx）');
  d.books.forEach((s, i) => {
    const x = M + i * 220;
    out.push(swatchRect(s.id, x, y, 56, s.value));
    out.push(text(x + 68, y + 22, 15, 700, INK, s.label));
    out.push(text(x + 68, y + 44, 15, 500, INK3, hexText(s.value)));
  });
  y += 120;

  // ペットの色
  heading('section-pet', 'ペットの色', 'src/data/species.ts の palette');
  for (const p of d.pets) {
    out.push(text(M, y + 34, 22, 700, INK, p.name));
    p.swatches.forEach((s, i) => {
      const x = M + 300 + i * FC;
      out.push(swatchRect(s.id, x, y, 56, s.value));
      out.push(text(x + 68, y + 22, 15, 700, INK, s.label));
      out.push(text(x + 68, y + 44, 15, 500, INK3, hexText(s.value)));
    });
    y += 84;
  }
  y += 40;

  // 文字
  heading('section-font', '文字');
  const FONT_D = "'Dela Gothic One', 'Zen Maru Gothic', system-ui, sans-serif";
  out.push(`<text id="font-display" x="${M}" y="${y + 50}" fill="${INK}" font-family="${FONT_D}" font-size="56" font-weight="400">DataMate 0123456789 ごほうび</text>`);
  out.push(text(M, y + 84, 18, 500, INK3, 'Dela Gothic One 400（--font-display）見出し・数字'));
  y += 140;
  for (const w of [500, 700, 900]) {
    out.push(`<text id="font-body-${w}" x="${M}" y="${y + 36}" fill="${INK}" font-family="'Zen Maru Gothic', sans-serif" font-size="34" font-weight="${w}">生活の記録で、ペットと部屋が育つ。</text>`);
    out.push(text(M, y + 68, 18, 500, INK3, `Zen Maru Gothic ${w}（--font-body）本文`));
    y += 110;
  }
  out.push(text(M, y + 10, 16, 500, INK3, `--font-display: ${d.fonts.display}`));
  out.push(text(M, y + 38, 16, 500, INK3, `--font-body: ${d.fonts.body}`));
  out.push(text(M, y + 66, 16, 500, INK3, GOOGLE_FONTS_URL));
  y += 120;

  const H = y;
  const head = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`, `  <rect id="palette-background" x="0" y="0" width="${W}" height="${H}" fill="${HAZE}"/>`];
  return [...head, ...out.map((l) => '  ' + escapeSafe(l)), '</svg>'].join('\n') + '\n';
}

// text() は escapeText 済み。ここでは何もしない（将来の拡張点）
const escapeSafe = (s: string) => s;

// ---------- tokens.json（W3C Design Tokens） ----------

type Tok = { $type?: string; $value: DtcgColor | DtcgShadow[] | number | string | string[]; $description?: string };

export function buildTokens(d: Data = collect()): string {
  const color = (s: Swatch, desc?: string): Tok => ({ $type: 'color', $value: toDtcgColor(s.value), $description: desc ?? s.label });
  const app: Record<string, Tok> = {};
  for (const s of d.app) app[s.id] = color(s);
  for (const s of d.shadows) app[`shadow-${s.name.replace('shadow-', '')}`] = { $type: 'shadow', $value: parseBoxShadow(s.value), $description: `影（tokens.css の --${s.name}。重ねる順）` };

  const room: Record<string, Record<string, Tok>> = {};
  for (const r of d.roomHours) {
    const g: Record<string, Tok> = {};
    for (const s of r.swatches) g[s.id.replace(/^room-[\d_]+-/, '')] = color(s, `${r.label} ${s.label}`);
    g['lamp-glow'] = { $type: 'number', $value: r.lampGlow, $description: '灯りの強さ 0〜1' };
    g['sun'] = { $type: 'number', $value: r.sun, $description: '日ざしの強さ 0〜1' };
    room[`h${hourId(r.h)}`] = g;
  }
  const furniture: Record<string, Record<string, Tok>> = {};
  for (const f of d.furniture) {
    const g: Record<string, Tok> = {};
    for (const s of f.swatches) g[s.id.replace(`furniture-${f.id}-`, '')] = color(s, `${f.name} ${s.label}`);
    furniture[f.id] = g;
  }
  const book: Record<string, Tok> = {};
  for (const s of d.books) book[s.id.replace('book-', '')] = color(s);
  const pet: Record<string, Record<string, Tok>> = {};
  for (const p of d.pets) {
    const g: Record<string, Tok> = {};
    for (const s of p.swatches) g[s.label] = color(s, `${p.name} ${s.label}`);
    pet[p.id] = g;
  }
  const stack = (v: string) => v.split(',').map((x) => x.trim().replace(/^'|'$/g, ''));
  const font = {
    display: { $type: 'fontFamily', $value: stack(d.fonts.display), $description: '見出し・数字（Dela Gothic One 400）' },
    body: { $type: 'fontFamily', $value: stack(d.fonts.body), $description: '本文（Zen Maru Gothic 500 / 700 / 900）' },
    'weight-regular': { $type: 'fontWeight', $value: 500 },
    'weight-bold': { $type: 'fontWeight', $value: 700 },
    'weight-black': { $type: 'fontWeight', $value: 900 },
    'google-fonts-url': { $value: GOOGLE_FONTS_URL, $description: 'index.html と同じ読み込み先' },
  };
  return JSON.stringify({ app, 'room-light': room, furniture, book, pet, font }, null, 2) + '\n';
}
