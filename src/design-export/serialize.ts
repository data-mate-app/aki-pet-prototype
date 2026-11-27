import { escapeAttr, escapeText, fmt, inverse, matrixToTransform, mul, applyToPoint, parseColor, roundNumbers, type Mat } from './format';

/**
 * 画面に描かれた SVG（computed style・止めたアニメーション込み）を、1 つの素の SVG 文字列にする。
 * ブラウザの中でだけ動く（getScreenCTM・getBBox・getComputedStyle を使う）。
 * 規則は作業票の「5. 直列化」のとおり。
 */

type Rect = [number, number, number, number]; // x0 y0 x1 y1

type Node = {
  tag: string;
  part?: string;
  attrs: Map<string, string>;
  children: Node[];
  text?: string;
  bounds: Rect | null;
};

/** 属性の並び（固定）。ここにない属性は書けない */
const ORDER = [
  'id', 'transform',
  'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'points', 'd',
  'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'paint-order',
  'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline',
  'opacity', 'filter', 'clip-path', 'style',
];

const NON_RENDERING = new Set(['defs', 'clippath', 'mask', 'lineargradient', 'radialgradient', 'pattern', 'filter', 'marker', 'symbol', 'title', 'desc', 'metadata', 'style', 'script']);

const GEOMETRY: Record<string, string[]> = {
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polyline: ['points'],
  polygon: ['points'],
  path: ['d'],
  text: ['x', 'y'],
};

const toMat = (m: DOMMatrix): Mat => [m.a, m.b, m.c, m.d, m.e, m.f];

function union(a: Rect | null, b: Rect | null): Rect | null {
  if (!a) return b;
  if (!b) return a;
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}

function intersect(a: Rect | null, b: Rect): Rect | null {
  if (!a) return null;
  const r: Rect = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
  return r[0] < r[2] && r[1] < r[3] ? r : null;
}

function expand(r: Rect, d: number): Rect {
  return [r[0] - d, r[1] - d, r[2] + d, r[3] + d];
}

function transformRect(m: Mat, x0: number, y0: number, x1: number, y1: number): Rect {
  const ps = [applyToPoint(m, x0, y0), applyToPoint(m, x1, y0), applyToPoint(m, x1, y1), applyToPoint(m, x0, y1)];
  return [Math.min(...ps.map((p) => p[0])), Math.min(...ps.map((p) => p[1])), Math.max(...ps.map((p) => p[0])), Math.max(...ps.map((p) => p[1]))];
}

/** 行列の拡大率（長さの伸びの大きいほう） */
function scaleOf(m: Mat): number {
  return Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]));
}

const urlId = (v: string): string | null => {
  const m = v.match(/url\(\s*["']?#([^"')\s]+)["']?\s*\)/);
  return m ? m[1] : null;
};

class Context {
  /** 参照された定義。出力順は最初に参照された順 */
  defs = new Map<string, string>();

  constructor(readonly host: SVGSVGElement, readonly hostCtm: Mat) {}

  /** url(#id) を d- 付きの id に直す。定義がまだなら写す */
  ref(value: string): string {
    const id = urlId(value);
    if (!id) throw new Error(`url(#…) として読めない参照: ${value}`);
    this.register(id);
    return `url(#d-${id})`;
  }

  register(id: string): void {
    if (this.defs.has(id)) return;
    const el = document.getElementById(id);
    if (!el) throw new Error(`定義が見つからない: #${id}`);
    this.defs.set(id, ''); // 循環の防止（先に席を取る）
    this.defs.set(id, this.defXml(el, 1));
  }

  defXml(el: Element, depth: number): string {
    return this.childDef(el, depth, `d-${el.id}`);
  }

  /** 定義の子（id を持たない）。id は付けない */
  childDef(el: Element, depth: number, id?: string): string {
    const tag = el.tagName;
    const pad = '  '.repeat(depth + 1);
    const attrs: string[] = id ? [`id="${id}"`] : [];
    const isStop = tag === 'stop';
    for (const a of Array.from(el.attributes)) {
      if (a.name === 'id' || a.name === 'class' || a.name === 'style' || a.name.startsWith('data-') || a.name.startsWith('aria-')) continue;
      if (isStop && (a.name === 'stop-color' || a.name === 'stop-opacity')) continue;
      let v = a.value;
      if (v.includes('url(#')) v = v.replace(/url\(\s*["']?#([^"')\s]+)["']?\s*\)/g, (m) => this.ref(m));
      attrs.push(`${a.name}="${escapeAttr(/^[-+.\d\s,e]+$/i.test(v) || a.name === 'transform' ? roundNumbers(v) : v)}"`);
    }
    if (isStop) {
      const cs = getComputedStyle(el);
      const c = parseColor(cs.stopColor);
      if (!c) throw new Error(`stop-color を読めない: ${cs.stopColor}`);
      attrs.push(`stop-color="${c.hex}"`);
      const op = c.alpha * Number(cs.stopOpacity);
      if (Math.abs(op - 1) > 1e-6) attrs.push(`stop-opacity="${fmt(op)}"`);
    }
    const head = attrs.length ? `${tag} ${attrs.join(' ')}` : tag;
    const kids = Array.from(el.children);
    if (kids.length === 0) return `${pad}<${head}/>`;
    return `${pad}<${head}>\n${kids.map((k) => this.childDef(k, depth + 1)).join('\n')}\n${pad}</${tag}>`;
  }
}

/** feGaussianBlur の stdDeviation（x,y の大きいほう）。ぼかしでなければ 0 */
function blurSigma(filterValue: string): number {
  const id = urlId(filterValue);
  if (!id) return 0;
  const f = document.getElementById(id);
  if (!f) throw new Error(`フィルタが見つからない: #${id}`);
  let sigma = 0;
  for (const prim of Array.from(f.children)) {
    if (prim.tagName === 'feGaussianBlur') {
      const parts = (prim.getAttribute('stdDeviation') ?? '0').split(/[\s,]+/).map(Number);
      sigma = Math.max(sigma, ...parts);
    } else {
      throw new Error(`未対応のフィルタ要素: ${prim.tagName}`);
    }
  }
  return sigma;
}

/** clipPath の矩形（要素のローカル座標）。rect だけに対応 */
function clipRect(clipValue: string): Rect {
  const id = urlId(clipValue);
  if (!id) throw new Error(`clip-path を読めない: ${clipValue}`);
  const cp = document.getElementById(id);
  if (!cp) throw new Error(`clipPath が見つからない: #${id}`);
  const kids = Array.from(cp.children);
  if (kids.length !== 1 || kids[0].tagName !== 'rect' || kids[0].hasAttribute('transform')) throw new Error(`未対応の clipPath: #${id}`);
  const r = kids[0];
  const n = (k: string) => Number(r.getAttribute(k) ?? 0);
  return [n('x'), n('y'), n('x') + n('width'), n('y') + n('height')];
}

function walk(el: Element, parentCtm: Mat, cx: Context): Node[] {
  const tag = el.tagName.toLowerCase();
  if (NON_RENDERING.has(tag)) return [];
  if (!(el instanceof SVGGraphicsElement)) throw new Error(`未対応の要素: <${el.tagName}>`);
  if (tag === 'svg' || tag === 'use' || tag === 'image' || tag === 'foreignobject' || tag === 'tspan') throw new Error(`未対応の要素: <${el.tagName}>`);

  const cs = getComputedStyle(el);
  if (cs.display === 'none') return [];
  const opacity = Number(cs.opacity);
  if (opacity <= 0) return [];

  const ctmDom = el.getScreenCTM();
  if (!ctmDom) return [];
  const ctm = toMat(ctmDom);
  const rel = mul(inverse(parentCtm), ctm);
  const toHost = mul(inverse(cx.hostCtm), ctm);
  const part = el.getAttribute('data-part') ?? undefined;

  const attrs = new Map<string, string>();
  const t = matrixToTransform(rel);
  if (t) attrs.set('transform', t);

  const filter = cs.filter !== 'none' ? cs.filter : null;
  const clip = cs.clipPath !== 'none' ? cs.clipPath : null;
  const blend = cs.mixBlendMode !== 'normal' ? cs.mixBlendMode : null;
  if (Math.abs(opacity - 1) > 1e-6) attrs.set('opacity', fmt(opacity));
  if (blend) attrs.set('style', `mix-blend-mode:${blend}`);

  let node: Node;
  if (tag === 'g') {
    const children = Array.from(el.children).flatMap((c) => walk(c, ctm, cx));
    if (children.length === 0) return [];
    let bounds = children.reduce<Rect | null>((acc, c) => union(acc, c.bounds), null);
    if (clip) {
      const cr = clipRect(clip);
      bounds = bounds && intersect(bounds, transformRect(toHost, ...cr));
      attrs.set('clip-path', cx.ref(clip));
    }
    if (filter) attrs.set('filter', cx.ref(filter));
    // 名前も変形も効果もないグループは、中身を親へ上げる
    if (!part && !t && attrs.size === 0) return children;
    node = { tag: 'g', part, attrs, children, bounds };
  } else {
    if (cs.visibility === 'hidden') return [];
    if (!(tag in GEOMETRY)) throw new Error(`未対応の図形: <${el.tagName}>`);
    for (const k of GEOMETRY[tag]) {
      const v = el.getAttribute(k);
      if (v !== null) attrs.set(k, roundNumbers(v));
    }
    if (tag === 'rect' && (!attrs.has('width') || !attrs.has('height'))) throw new Error('rect に width/height がない');

    // 塗り
    const fillOp = Number(cs.fillOpacity);
    let fillVisible = false;
    if (cs.fill === 'none') {
      attrs.set('fill', 'none');
    } else if (cs.fill.startsWith('url(')) {
      attrs.set('fill', cx.ref(cs.fill));
      fillVisible = fillOp > 0;
      if (Math.abs(fillOp - 1) > 1e-6) attrs.set('fill-opacity', fmt(fillOp));
    } else {
      const c = parseColor(cs.fill);
      if (!c) throw new Error(`fill を読めない: ${cs.fill}`);
      const a = c.alpha * fillOp;
      if (a <= 0) {
        attrs.set('fill', 'none');
      } else {
        attrs.set('fill', c.hex);
        fillVisible = true;
        if (Math.abs(a - 1) > 1e-6) attrs.set('fill-opacity', fmt(a));
      }
    }
    if (fillVisible && cs.fillRule !== 'nonzero') attrs.set('fill-rule', cs.fillRule);

    // 線
    let strokeWidth = 0;
    let strokeVisible = false;
    if (cs.stroke !== 'none') {
      strokeWidth = parseFloat(cs.strokeWidth);
      const sOp = Number(cs.strokeOpacity);
      if (cs.stroke.startsWith('url(')) {
        strokeVisible = strokeWidth > 0 && sOp > 0;
        if (strokeVisible) {
          attrs.set('stroke', cx.ref(cs.stroke));
          if (Math.abs(sOp - 1) > 1e-6) attrs.set('stroke-opacity', fmt(sOp));
        }
      } else {
        const c = parseColor(cs.stroke);
        if (!c) throw new Error(`stroke を読めない: ${cs.stroke}`);
        const a = c.alpha * sOp;
        strokeVisible = strokeWidth > 0 && a > 0;
        if (strokeVisible) {
          attrs.set('stroke', c.hex);
          if (Math.abs(a - 1) > 1e-6) attrs.set('stroke-opacity', fmt(a));
        }
      }
      if (strokeVisible) {
        attrs.set('stroke-width', fmt(strokeWidth));
        if (cs.strokeLinecap !== 'butt') attrs.set('stroke-linecap', cs.strokeLinecap);
        if (cs.strokeLinejoin !== 'miter') attrs.set('stroke-linejoin', cs.strokeLinejoin);
        if (cs.strokeDasharray !== 'none') attrs.set('stroke-dasharray', roundNumbers(cs.strokeDasharray.replace(/px/g, '')));
        if (fillVisible && cs.paintOrder !== 'normal') attrs.set('paint-order', cs.paintOrder);
      }
    }
    if (!fillVisible && !strokeVisible) return []; // 塗りも線もない（当たり判定の透明な図形など）

    let content: string | undefined;
    if (tag === 'text') {
      attrs.set('font-family', cs.fontFamily.replace(/"/g, "'"));
      attrs.set('font-size', fmt(parseFloat(cs.fontSize)));
      attrs.set('font-weight', cs.fontWeight);
      if (cs.textAnchor !== 'start') attrs.set('text-anchor', cs.textAnchor);
      if (cs.dominantBaseline !== 'auto') attrs.set('dominant-baseline', cs.dominantBaseline);
      content = (el.textContent ?? '').trim();
    }
    if (filter) attrs.set('filter', cx.ref(filter));
    if (clip) attrs.set('clip-path', cx.ref(clip));

    // 範囲
    const b = (el as SVGGraphicsElement).getBBox();
    let bounds: Rect | null = transformRect(toHost, b.x, b.y, b.x + b.width, b.y + b.height);
    if (strokeVisible) {
      const factor = cs.strokeLinejoin === 'miter' || cs.strokeLinecap === 'square' ? 1.5 : 1;
      bounds = expand(bounds, (strokeWidth / 2) * factor * scaleOf(toHost));
    }
    if (clip) bounds = intersect(bounds, transformRect(toHost, ...clipRect(clip)));
    node = { tag, part, attrs, children: [], text: content, bounds };
  }

  if (filter && node.bounds) {
    const sigma = blurSigma(filter);
    if (sigma > 0) node.bounds = expand(node.bounds, 3 * sigma * scaleOf(toHost));
  }
  if (!node.bounds) return [];
  return [node];
}

// ---------- 出力 ----------

function assignIds(nodes: Node[], used: Set<string>, counts: Map<string, number>): void {
  for (const n of nodes) {
    if (n.part) {
      let id = n.part;
      let k = counts.get(n.part) ?? 1;
      while (used.has(id)) {
        k += 1;
        id = `${n.part}-${k}`;
      }
      counts.set(n.part, k);
      used.add(id);
      n.attrs.set('id', id);
    }
    assignIds(n.children, used, counts);
  }
}

function emit(n: Node, depth: number, out: string[]): void {
  const pad = '  '.repeat(depth);
  const keys = [...n.attrs.keys()];
  for (const k of keys) if (!ORDER.includes(k)) throw new Error(`順序表にない属性: ${k}`);
  keys.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const attrText = keys.map((k) => `${k}="${escapeAttr(n.attrs.get(k)!)}"`).join(' ');
  const head = attrText ? `${n.tag} ${attrText}` : n.tag;
  if (n.tag === 'g') {
    out.push(`${pad}<${head}>`);
    for (const c of n.children) emit(c, depth + 1, out);
    out.push(`${pad}</g>`);
  } else if (n.tag === 'text') {
    out.push(`${pad}<${head}>${escapeText(n.text ?? '')}</text>`);
  } else {
    out.push(`${pad}<${head}/>`);
  }
}

export type SerializeOptions = {
  /** 範囲を測らず、この viewBox で書き出す（おみせの絵） */
  fixedViewBox?: [number, number, number, number];
  /** width/height を指定する（省略時は viewBox の幅と高さ） */
  size?: [number, number];
};

export type SerializeResult = {
  svg: string;
  /** [x, y, w, h]（整数） */
  viewBox: [number, number, number, number];
  size: [number, number];
  /** 範囲に効いた最も外側の座標（丸める前）。確認用 */
  rawBounds: Rect;
};

export function serialize(host: SVGSVGElement, opts: SerializeOptions = {}): SerializeResult {
  const hostCtmDom = host.getScreenCTM();
  if (!hostCtmDom) throw new Error('ホストの CTM が取れない');
  const hostCtm = toMat(hostCtmDom);
  const cx = new Context(host, hostCtm);
  const nodes = Array.from(host.children).flatMap((c) => walk(c, hostCtm, cx));
  if (nodes.length === 0) throw new Error('描かれているものがない');
  const raw = nodes.reduce<Rect | null>((acc, n) => union(acc, n.bounds), null)!;

  let viewBox: [number, number, number, number];
  if (opts.fixedViewBox) {
    viewBox = opts.fixedViewBox;
  } else {
    const x = Math.floor(raw[0] + 1e-6);
    const y = Math.floor(raw[1] + 1e-6);
    viewBox = [x, y, Math.ceil(raw[2] - 1e-6) - x, Math.ceil(raw[3] - 1e-6) - y];
  }
  const size = opts.size ?? [viewBox[2], viewBox[3]];

  assignIds(nodes, new Set(), new Map());
  const lines: string[] = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.map(fmt).join(' ')}" width="${fmt(size[0])}" height="${fmt(size[1])}">`);
  if (cx.defs.size > 0) {
    lines.push('  <defs>');
    for (const xml of cx.defs.values()) lines.push(xml);
    lines.push('  </defs>');
  }
  for (const n of nodes) emit(n, 1, lines);
  lines.push('</svg>');
  return { svg: lines.join('\n') + '\n', viewBox, size, rawBounds: raw };
}
