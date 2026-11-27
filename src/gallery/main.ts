import './gallery.css';
import manifest from '../../design/manifest.json';
import sheetUrl from '../../design/sheet.svg?url';
import paletteUrl from '../../design/palette.svg?url';
import tokensUrl from '../../design/tokens.json?url';

/**
 * 公開版のアセットギャラリー（React なしの素の TS。本体の出力に混ざらないよう別の入口）。
 * データは design/ の出力（pnpm design:export の結果）をそのまま読む。
 */

type Asset = {
  path: string;
  kind: 'furniture' | 'thumb' | 'pet' | 'room' | 'room-tint' | 'icon';
  label: string;
  svg: string;
  png: string;
  width: number;
  height: number;
};

const svgSources = import.meta.glob('/design/svg/**/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const pngUrls = import.meta.glob('/design/png/**/*.png', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

const FILTERS: { id: string; label: string; kinds: Asset['kind'][] }[] = [
  { id: 'all', label: 'すべて', kinds: [] },
  { id: 'furniture', label: '家具', kinds: ['furniture'] },
  { id: 'thumb', label: 'おみせの絵', kinds: ['thumb'] },
  { id: 'pet', label: 'ペット', kinds: ['pet'] },
  { id: 'room', label: '部屋', kinds: ['room', 'room-tint'] },
  { id: 'icon', label: 'アイコン', kinds: ['icon'] },
];

const assets: Asset[] = (manifest.assets as Asset[]).filter((a) => svgSources[`/design/${a.svg}`] !== undefined);

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

const fileName = (a: Asset) => a.svg.split('/').pop() as string;
const sourceOf = (a: Asset) => svgSources[`/design/${a.svg}`];

// ---------- 通知（aria-live） ----------
const status = el('div', 'g-status');
status.setAttribute('role', 'status');
status.setAttribute('aria-live', 'polite');
let statusTimer = 0;
function say(text: string) {
  status.textContent = text;
  status.classList.add('is-on');
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => status.classList.remove('is-on'), 1800);
}

// ---------- 保存 ----------
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = el('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copySvg(a: Asset) {
  try {
    await navigator.clipboard.writeText(sourceOf(a));
    say('コピーしました');
  } catch {
    say('コピーできませんでした。「SVG を保存」を使ってください');
  }
}

function saveSvg(a: Asset) {
  saveBlob(new Blob([sourceOf(a)], { type: 'image/svg+xml' }), fileName(a));
  say('保存しました');
}

/**
 * PNG は書き出し済みの design/png/…@2x.png をそのまま保存する（ブラウザで描き直さない。
 * 描き直すと端末のフォントなどで字形が変わり、書き出しで確かめた PNG と別物になる）
 */
function savePng(a: Asset) {
  const url = pngUrls[`/design/${a.png}`];
  if (!url) {
    say('PNG が見つかりません');
    return;
  }
  const link = el('a');
  link.href = url;
  link.download = fileName(a).replace(/\.svg$/, '@2x.png');
  document.body.append(link);
  link.click();
  link.remove();
  say('保存しました');
}

// ---------- 画面 ----------
/** カードは 1 度だけ作って使い回す（絞り込みのたびに作り直さない。blob URL もカードごとに 1 つだけ） */
const cards = new Map<string, HTMLLIElement>();

function card(a: Asset): HTMLLIElement {
  let li = cards.get(a.path);
  if (!li) {
    li = buildCard(a);
    cards.set(a.path, li);
  }
  return li;
}

function buildCard(a: Asset): HTMLLIElement {
  const li = el('li', 'g-card');
  const view = el('div', a.width / a.height > 1.6 ? 'g-view is-wide' : 'g-view');
  const img = el('img');
  const url = URL.createObjectURL(new Blob([sourceOf(a)], { type: 'image/svg+xml' }));
  img.src = url;
  img.alt = a.label;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.width = a.width;
  img.height = a.height;
  view.append(img);

  const meta = el('div', 'g-meta');
  meta.append(el('p', 'g-label', a.label), el('p', 'g-file', fileName(a)), el('p', 'g-size', `${a.width} × ${a.height}`));

  const actions = el('div', 'g-actions');
  const copy = button('SVG をコピー', () => copySvg(a), true);
  actions.append(copy, button('SVG を保存', () => saveSvg(a)), button('PNG を保存', () => savePng(a)));

  li.append(view, meta, actions);
  return li;
}

function button(text: string, onClick: () => void, main = false): HTMLButtonElement {
  const b = el('button', main ? 'g-btn is-main' : 'g-btn', text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

function downloadLink(text: string, href: string, name: string): HTMLAnchorElement {
  const a = el('a', 'g-btn', text);
  a.href = href;
  a.download = name;
  a.addEventListener('click', () => say('保存しました'));
  return a;
}

function build() {
  const app = document.getElementById('app') as HTMLElement;
  const wrap = el('div', 'g-wrap');

  const head = el('header', 'g-head');
  head.append(el('h1', undefined, 'DataMate アセットギャラリー'), el('p', undefined, '家具・ペット・部屋を、Figma で編集できるベクター（SVG）にしたものです。'));
  const how = el('ul', 'g-how');
  for (const [k, v] of [
    ['コピーして使う', '「SVG をコピー」→ Figma のキャンバスで貼り付け'],
    ['ファイルで使う', '「SVG を保存」→ Figma へドラッグ'],
  ]) {
    const li = el('li');
    li.append(el('b', undefined, k), el('span', undefined, v));
    how.append(li);
  }
  head.append(how);

  const bulk = el('section', 'g-bulk');
  bulk.setAttribute('aria-labelledby', 'bulk-h');
  const bh = el('h2', undefined, 'まとめて');
  bh.id = 'bulk-h';
  const row = el('div', 'g-bulk-row');
  row.append(
    downloadLink('一覧シートを保存', sheetUrl, 'datamate-sheet.svg'),
    downloadLink('色と文字を保存', paletteUrl, 'datamate-palette.svg'),
    downloadLink('tokens.json を保存', tokensUrl, 'datamate-tokens.json'),
  );
  bulk.append(bh, el('p', undefined, '一覧シートは 1 ファイルで全部そろいます。色と文字は見本、tokens.json は Design Tokens の形です。'), row);

  const filters = el('div', 'g-filters');
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', '絞り込み');
  const grid = el('ul', 'g-grid');
  const count = el('p', 'g-count');
  count.setAttribute('aria-live', 'polite');

  const countOf = (f: (typeof FILTERS)[number]) => (f.kinds.length === 0 ? assets.length : assets.filter((a) => f.kinds.includes(a.kind)).length);
  const chips = new Map<string, HTMLButtonElement>();

  function show(id: string) {
    const f = FILTERS.find((x) => x.id === id) ?? FILTERS[0];
    for (const [cid, c] of chips) c.setAttribute('aria-pressed', String(cid === f.id));
    const list = f.kinds.length === 0 ? assets : assets.filter((a) => f.kinds.includes(a.kind));
    grid.replaceChildren(...list.map(card));
    count.textContent = `${list.length} 点`;
  }

  for (const f of FILTERS) {
    const c = el('button', 'g-chip', f.label);
    c.type = 'button';
    c.append(el('small', undefined, String(countOf(f))));
    c.addEventListener('click', () => show(f.id));
    chips.set(f.id, c);
    filters.append(c);
  }

  wrap.append(head, bulk, filters, count, grid, el('p', 'g-foot', 'アニメーションは止めた 1 コマです。ぼかしの影などの見え方は Figma で確かめてください。'));
  app.replaceChildren(wrap, status);
  show('all');
}

build();
