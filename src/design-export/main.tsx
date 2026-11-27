import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import '../styles/tokens.css';
import { FurnitureArt } from '../art/Furniture';
import { PetArt } from '../art/Pet';
import { RoomShell, RoomTint, SvgDefs, VIEW } from '../art/Room';
import { furnitureById } from '../data/furniture';
import { speciesById } from '../data/species';
import { applyLight, lightAt } from '../domain/daylight';
import { PieceSvg } from '../screens/home/SceneParts';
import { PET_VIEW } from '../screens/home/geometry';
import { modulationOf, PET_STATES, planAssets, type AssetSpec, type FurnitureVariant } from './plan';
import { serialize } from './serialize';
import { THUMB_SIZE, thumbViewBox } from './thumb';

/**
 * 書き出し用のページ。1 アセットずつ描き、止め、直列化する。
 * 描く場所は左上から 500px の位置を絵の原点 (0,0) にそろえる（Playwright から切り抜く位置が整数になる）。
 */

const ORIGIN = 500;

const FACING: Record<FurnitureVariant, 'R' | 'L' | 'WL' | 'WR'> = { plain: 'R', mirrored: 'L', 'wall-left': 'WL', 'wall-right': 'WR' };

/** 止める位置（1 回分の 0〜1）。表にないアニメーションは例外 */
const PROGRESS: Record<string, number> = {
  'pet-breath': 0,
  'pet-breath-deep': 0,
  'pet-ear-twitch': 0,
  'pet-puff': 0,
  'pet-read': 0,
  'pet-hop': 0.5,
  'pet-wag': 0.5,
  'pet-sway': 0.5,
  'pet-munch': 0.5,
  'pet-chew': 0.5,
  'act-stretch': 0.5,
  'pet-yawn': 0.5,
  'act-jump': 0.46,
  'act-celebrate': 0.28,
  'pet-steam': 0.4,
  'pet-heart': 0.25,
};
const Z_PROGRESS: Record<string, number> = { 'z-1': 0.2, 'z-2': 0.45, 'z-3': 0.7 };

/**
 * 止めたコマの値を、そのまま通常の CSS（インライン）に写してアニメーションを外す。
 * 動いている（止めただけの）アニメーションの下の図形は、Chrome が別レイヤーで描いて縁がにじむため。
 */
function bake(animations: Animation[]): void {
  const baked: [HTMLElement | SVGElement, string, string][] = [];
  for (const a of animations) {
    const target = (a.effect as KeyframeEffect).target as HTMLElement | SVGElement;
    const cs = getComputedStyle(target);
    const props = new Set<string>();
    for (const kf of (a.effect as KeyframeEffect).getKeyframes()) for (const k of Object.keys(kf)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(k)) props.add(k);
    for (const prop of props) baked.push([target, prop, cs.getPropertyValue(prop)]);
  }
  for (const a of animations) a.cancel();
  for (const [target, prop, value] of baked) target.style.setProperty(prop, value, 'important');
}

function freezeAnimations(): string[] {
  const log: string[] = [];
  const all = document.getAnimations();
  for (const a of all) {
    if (!(a instanceof CSSAnimation)) throw new Error(`CSS アニメーション以外が動いている: ${a.constructor.name}`);
    const name = a.animationName;
    const timing = a.effect!.getComputedTiming();
    const duration = Number(timing.duration);
    const delay = Number(timing.delay);
    a.pause();
    if (name === 'pet-step') {
      a.currentTime = 0.5 * duration; // delay は打ち消さない（左右の足が交互になる）
    } else if (name === 'pet-prop-in') {
      a.currentTime = delay + duration;
    } else if (name === 'pet-z') {
      const part = (a.effect as KeyframeEffect).target?.getAttribute('data-part') ?? '';
      if (!(part in Z_PROGRESS)) throw new Error(`pet-z の対象が z-1〜3 ではない: ${part}`);
      a.currentTime = delay + Z_PROGRESS[part] * duration;
    } else if (name in PROGRESS) {
      a.currentTime = delay + PROGRESS[name] * duration;
    } else {
      throw new Error(`止め方が決まっていないアニメーション: ${name}`);
    }
    log.push(name);
  }
  bake(all);
  return log;
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

const rootEl = document.getElementById('root')!;
const stageEl = document.getElementById('stage')!;
const root = createRoot(rootEl);

function holder(children: React.ReactNode, left = ORIGIN, top = ORIGIN, size?: [number, number]) {
  return (
    <div id="holder" style={{ position: 'absolute', left, top, ...(size ? { width: size[0], height: size[1] } : {}) }}>
      {children}
    </div>
  );
}

function scene(spec: AssetSpec): React.ReactNode {
  switch (spec.kind) {
    case 'furniture':
      return holder(<PieceSvg def={furnitureById[spec.furnitureId]} facing={FACING[spec.variant]} hour={spec.hour} />);
    case 'thumb': {
      const def = furnitureById[spec.furnitureId];
      return holder(
        <svg viewBox={thumbViewBox(def.kind).join(' ')} width={THUMB_SIZE} height={THUMB_SIZE} style={{ overflow: 'hidden' }}>
          <FurnitureArt def={def} />
        </svg>,
      );
    }
    case 'pet': {
      const st = PET_STATES.find((s) => s.id === spec.state)!;
      const [vx, vy, vw, vh] = PET_VIEW;
      return holder(
        <svg className="pet-svg" viewBox={`${vx} ${vy} ${vw} ${vh}`} width={vw} height={vh} style={{ left: vx, top: vy }}>
          <PetArt species={speciesById[spec.speciesId]} pose={st.pose} expression={st.expression} action={st.action} modulation={modulationOf(st)} blink={false} />
        </svg>,
      );
    }
    case 'room':
      return holder(<RoomShell hour={spec.hour} />, ORIGIN + VIEW.x, ORIGIN + VIEW.y, [VIEW.w, VIEW.h]);
    case 'room-tint':
      return holder(<RoomTint />, ORIGIN + VIEW.x, ORIGIN + VIEW.y, [VIEW.w, VIEW.h]);
    case 'icon':
      return holder(<img id="icon" src="/icon.svg" width={64} height={64} alt="" />);
  }
}

export type RenderInfo = {
  path: string;
  /** null のときは public/icon.svg をそのまま使う */
  svg: string | null;
  viewBox: [number, number, number, number];
  size: [number, number];
  /** 実物を切り抜くページ上の矩形（CSS px、整数） */
  clip: { x: number; y: number; width: number; height: number };
  animations: string[];
};

const specs = planAssets();

async function render(path: string): Promise<RenderInfo> {
  const spec = specs.find((s) => s.path === path);
  if (!spec) throw new Error(`一覧にない: ${path}`);
  const hour = 'hour' in spec ? spec.hour : 12;
  applyLight(stageEl, lightAt(hour));
  flushSync(() => root.render(<><SvgDefs />{scene(spec)}</>));
  await nextFrame();
  await nextFrame();
  const animations = freezeAnimations();
  await nextFrame();
  await document.fonts.ready;

  const host = document.querySelector<SVGSVGElement>('#holder > svg');
  if (spec.kind === 'icon') {
    const img = document.getElementById('icon') as HTMLImageElement;
    await img.decode();
    return { path, svg: null, viewBox: [0, 0, 64, 64], size: [64, 64], clip: { x: ORIGIN, y: ORIGIN, width: 64, height: 64 }, animations };
  }
  if (!host) throw new Error('描いた svg が見つからない');

  const result = spec.kind === 'thumb' ? serialize(host, { fixedViewBox: thumbViewBox(furnitureById[spec.furnitureId].kind), size: [THUMB_SIZE, THUMB_SIZE] }) : serialize(host);
  const m = host.getScreenCTM()!;
  const [vx, vy, vw, vh] = result.viewBox;
  const clip = {
    x: Math.round(m.a * vx + m.e),
    y: Math.round(m.d * vy + m.f),
    width: Math.round(m.a * vw),
    height: Math.round(m.d * vh),
  };
  return { path, svg: result.svg, viewBox: result.viewBox, size: result.size, clip, animations };
}

function clear() {
  flushSync(() => root.render(null));
}

declare global {
  interface Window {
    __design: { specs: AssetSpec[]; render: typeof render; clear: typeof clear };
  }
}

window.__design = { specs, render, clear };
document.documentElement.dataset.ready = 'true';
