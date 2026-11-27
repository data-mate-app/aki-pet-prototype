import type { ReactNode } from 'react';
import type { FurnitureDef } from '../data/furniture';
import { adjust, box, iso, PLANE, pts, shade } from './iso';

/**
 * 家具の絵。すべて iso() を通した直方体と、床・壁の平面へ貼る平らな絵で描く。
 * 基準の向きは「右の壁に背を向ける」。左の壁沿いでは呼び出し側で左右反転し、
 * 面の明暗だけ入れ替える（mirrored）。
 */
type Ctx = { def: FurnitureDef; mirrored: boolean; hour: number };

export function Box({
  x,
  y,
  z,
  w,
  d,
  h,
  color,
  mirrored,
  amount = 1,
  stroke,
  part,
}: {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  mirrored: boolean;
  amount?: number;
  stroke?: string;
  /** 書き出し時のレイヤー名。グループに part、面に part-top / part-left / part-right（見える側の名前） */
  part?: string;
}) {
  const b = box(x, y, z, w, d, h);
  const s = shade(color, amount, mirrored);
  const common = { stroke: stroke ?? 'rgba(37,35,64,0.12)', strokeWidth: 1.2, strokeLinejoin: 'round' as const };
  // mirrored のときは描いたあとに左右反転されるので、見える側の名前は入れ替わる
  const rightName = part && `${part}-${mirrored ? 'left' : 'right'}`;
  const leftName = part && `${part}-${mirrored ? 'right' : 'left'}`;
  return (
    <g data-part={part}>
      <polygon data-part={rightName} points={b.right} fill={s.right} {...common} />
      <polygon data-part={leftName} points={b.left} fill={s.left} {...common} />
      <polygon data-part={part && `${part}-top`} points={b.top} fill={s.top} {...common} />
    </g>
  );
}

/** 接地影。家具の足元の四角をぼかす */
export function GroundShadow({ w, d, opacity = 0.22 }: { w: number; d: number; opacity?: number }) {
  const p = pts([
    [-w / 2 - 0.06, -d / 2 - 0.02, 0],
    [w / 2 + 0.1, -d / 2 - 0.02, 0],
    [w / 2 + 0.1, d / 2 + 0.14, 0],
    [-w / 2 - 0.06, d / 2 + 0.14, 0],
  ]);
  return <polygon data-part="shadow" points={p} fill="#2a2140" opacity={opacity} filter="url(#soft-shadow)" />;
}

function Bed({ def, mirrored }: Ctx) {
  const w = 2.0;
  const d = 1.15;
  const x0 = -w / 2;
  const y0 = -d / 2;
  const wood = def.color;
  return (
    <g>
      <GroundShadow w={w} d={d} />
      {/* 頭板 */}
      <Box x={x0} y={y0} z={0} w={0.12} d={d} h={0.95} color={adjust(wood, -0.05)} mirrored={mirrored} part="headboard" />
      <Box x={x0 + 0.12} y={y0} z={0} w={w - 0.12} d={d} h={0.3} color={wood} mirrored={mirrored} part="frame" />
      {/* マットレス */}
      <Box x={x0 + 0.16} y={y0 + 0.04} z={0.3} w={w - 0.2} d={d - 0.08} h={0.16} color="#fbf8f3" mirrored={mirrored} amount={0.6} part="mattress" />
      {/* まくら */}
      <Box x={x0 + 0.24} y={y0 + 0.2} z={0.46} w={0.42} d={d - 0.4} h={0.11} color="#ffffff" mirrored={mirrored} amount={0.5} part="pillow" />
      {/* かけ布団 */}
      <Box x={x0 + 0.78} y={y0 + 0.01} z={0.4} w={w - 0.84} d={d - 0.02} h={0.1} color={def.accent} mirrored={mirrored} amount={0.8} part="blanket" />
      <Box x={x0 + 0.78} y={y0 + 0.01} z={0.5} w={0.16} d={d - 0.02} h={0.02} color={adjust(def.accent, 0.4)} mirrored={mirrored} amount={0.5} part="blanket-fold" />
    </g>
  );
}

function Desk({ def, mirrored, hour }: Ctx) {
  const w = 1.7;
  const d = 0.8;
  const x0 = -w / 2;
  const y0 = -d / 2;
  const legs: [number, number][] = [
    [x0 + 0.05, y0 + 0.05],
    [x0 + w - 0.13, y0 + 0.05],
    [x0 + 0.05, y0 + d - 0.13],
    [x0 + w - 0.13, y0 + d - 0.13],
  ];
  const screenOn = hour >= 18 || hour < 7;
  return (
    <g>
      <GroundShadow w={w} d={d} opacity={0.16} />
      {legs.map(([x, y], i) => (
        <Box key={i} x={x} y={y} z={0} w={0.08} d={0.08} h={0.7} color={adjust(def.color, -0.25)} mirrored={mirrored} part={`leg-${i + 1}`} />
      ))}
      <Box x={x0 + w - 0.55} y={y0 + 0.05} z={0.32} w={0.5} d={d - 0.1} h={0.36} color={adjust(def.color, -0.08)} mirrored={mirrored} part="drawers" />
      <Box x={x0} y={y0} z={0.7} w={w} d={d} h={0.07} color={def.color} mirrored={mirrored} part="desktop" />
      {/* ノートPC */}
      <Box x={x0 + 0.45} y={y0 + 0.3} z={0.77} w={0.55} d={0.36} h={0.025} color="#cfd3e6" mirrored={mirrored} amount={0.6} part="laptop-base" />
      <Box x={x0 + 0.45} y={y0 + 0.24} z={0.795} w={0.55} d={0.04} h={0.36} color="#3a3d55" mirrored={mirrored} amount={0.5} part="laptop-lid" />
      <polygon
        data-part="laptop-screen"
        points={pts([
          [x0 + 0.48, y0 + 0.28, 0.83],
          [x0 + 0.97, y0 + 0.28, 0.83],
          [x0 + 0.97, y0 + 0.28, 1.12],
          [x0 + 0.48, y0 + 0.28, 1.12],
        ])}
        fill={screenOn ? '#9fb4ff' : '#59607f'}
        opacity={0.95}
      />
      {/* マグカップ */}
      <Box x={x0 + 1.18} y={y0 + 0.42} z={0.77} w={0.12} d={0.12} h={0.14} color={def.accent} mirrored={mirrored} amount={0.7} part="mug" />
    </g>
  );
}

export const BOOK_COLORS = ['#ff8a8a', '#7c9cff', '#ffd36b', '#4cc49d', '#c7a3ff', '#ffb648', '#8fd3ff'];

function Bookshelf({ def, mirrored }: Ctx) {
  const w = 1.3;
  const d = 0.5;
  const h = 1.9;
  const x0 = -w / 2;
  const y0 = -d / 2;
  const rows = [0.08, 0.68, 1.28];
  const books: ReactNode[] = [];
  let bookNo = 0;
  rows.forEach((rz, r) => {
    let x = x0 + 0.1;
    let i = 0;
    while (x < x0 + w - 0.2) {
      const bw = 0.07 + ((i * 37 + r * 11) % 5) * 0.012;
      const bh = 0.36 + ((i * 13 + r * 7) % 4) * 0.04;
      const lean = r === 1 && i === 6;
      bookNo++;
      books.push(
        <polygon
          key={`${r}-${i}`}
          data-part={`book-${bookNo}`}
          points={pts([
            [x, y0 + d, rz + 0.06],
            [x + bw, y0 + d, rz + 0.06],
            [x + bw + (lean ? 0.1 : 0), y0 + d, rz + 0.06 + bh],
            [x + (lean ? 0.1 : 0), y0 + d, rz + 0.06 + bh],
          ])}
          fill={BOOK_COLORS[(i + r * 3) % BOOK_COLORS.length]}
          stroke="rgba(37,35,64,0.18)"
          strokeWidth={1}
        />,
      );
      x += bw + 0.012;
      i++;
      if (r === 2 && i > 5) break;
    }
  });
  return (
    <g>
      <GroundShadow w={w} d={d} />
      <Box x={x0} y={y0} z={0} w={w} d={d} h={h} color={def.color} mirrored={mirrored} part="case" />
      {/* 内側の暗がり */}
      {rows.map((rz, ri) => (
        <polygon
          key={rz}
          data-part={`inner-${ri + 1}`}
          points={pts([
            [x0 + 0.07, y0 + d, rz + 0.05],
            [x0 + w - 0.07, y0 + d, rz + 0.05],
            [x0 + w - 0.07, y0 + d, rz + 0.55],
            [x0 + 0.07, y0 + d, rz + 0.55],
          ])}
          fill={adjust(def.color, -0.45)}
        />
      ))}
      {books}
      {/* 上の飾り */}
      <Box x={x0 + 0.85} y={y0 + 0.14} z={h} w={0.22} d={0.22} h={0.2} color={def.accent} mirrored={mirrored} amount={0.7} part="ornament" />
    </g>
  );
}

function LowTable({ def }: Ctx) {
  const r = 62;
  const top = iso(0, 0, 0.42);
  const ell = (part: string, cy: number, fill: string, rr = r) => (
    <ellipse data-part={part} cx={0} cy={cy} rx={rr * 1.22} ry={rr * 0.7} fill={fill} stroke="rgba(37,35,64,0.12)" strokeWidth={1.2} />
  );
  return (
    <g>
      <ellipse data-part="shadow" cx={4} cy={10} rx={r * 1.25} ry={r * 0.66} fill="#2a2140" opacity={0.2} filter="url(#soft-shadow)" />
      {[-0.35, 0.35].map((o) => (
        <Box key={o} x={o - 0.04} y={-0.04} z={0} w={0.08} d={0.08} h={0.38} color={adjust(def.color, -0.3)} mirrored={false} part={o < 0 ? 'leg-1' : 'leg-2'} />
      ))}
      <Box x={-0.04} y={0.3} z={0} w={0.08} d={0.08} h={0.38} color={adjust(def.color, -0.3)} mirrored={false} part="leg-3" />
      <g data-part="tabletop" transform={`translate(0 ${top.y})`}>
        {ell('top-edge', 7, adjust(def.color, -0.2))}
        <rect data-part="top-side" x={-r * 1.22} y={0} width={r * 2.44} height={7} fill={adjust(def.color, -0.2)} />
        {ell('top-surface', 0, adjust(def.color, 0.08))}
        <ellipse data-part="top-ring" cx={0} cy={0} rx={r * 0.95} ry={r * 0.52} fill="none" stroke={adjust(def.color, -0.06)} strokeWidth={2} />
        {/* ごはん皿 */}
        <ellipse data-part="dish" cx={14} cy={-4} rx={22} ry={11} fill="#ffffff" stroke="rgba(37,35,64,0.15)" strokeWidth={1} />
        <ellipse data-part="dish-food" cx={14} cy={-6} rx={15} ry={6.5} fill="#ffe9c9" />
      </g>
    </g>
  );
}

function Cushion({ def }: Ctx) {
  return (
    <g>
      <ellipse data-part="shadow" cx={4} cy={6} rx={62} ry={32} fill="#2a2140" opacity={0.18} filter="url(#soft-shadow)" />
      <g transform={PLANE.floor}>
        <rect data-part="base" x={-42} y={-42} width={84} height={84} rx={22} fill={adjust(def.color, -0.22)} transform="translate(0 0)" />
      </g>
      <g data-part="pad" transform={`translate(0 -14) ${PLANE.floor}`}>
        <rect data-part="pad-surface" x={-42} y={-42} width={84} height={84} rx={22} fill={def.color} stroke="rgba(37,35,64,0.12)" strokeWidth={1.4} />
        <rect data-part="pad-inner" x={-30} y={-30} width={60} height={60} rx={16} fill={adjust(def.color, 0.18)} />
        <circle data-part="pad-button" cx={0} cy={0} r={5} fill={adjust(def.color, -0.3)} />
      </g>
      <path d="M -73 -14 L -73 -2 Q 0 40 73 -2 L 73 -14" fill={adjust(def.color, -0.15)} opacity={0} />
    </g>
  );
}

function Beanbag({ def }: Ctx) {
  const c = def.color;
  return (
    <g>
      <ellipse data-part="shadow" cx={4} cy={6} rx={70} ry={34} fill="#2a2140" opacity={0.2} filter="url(#soft-shadow)" />
      <path data-part="body-shade" d="M -70 0 C -78 -60 -30 -96 4 -92 C 46 -90 80 -56 70 -2 C 60 30 -58 30 -70 0 Z" fill={adjust(c, -0.12)} />
      <path data-part="body" d="M -60 -10 C -64 -60 -24 -84 6 -80 C 40 -78 66 -50 58 -14 C 40 6 -40 8 -60 -10 Z" fill={c} />
      <path data-part="highlight" d="M -40 -40 C -20 -30 20 -30 40 -44" stroke={adjust(c, 0.3)} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.7} />
    </g>
  );
}

function Plant({ def }: Ctx) {
  const leaf = def.color;
  const leaves = [
    { r: -38, s: 1, x: -6, y: -96 },
    { r: 28, s: 1.05, x: 8, y: -104 },
    { r: -8, s: 1.15, x: 0, y: -122 },
    { r: 52, s: 0.85, x: 18, y: -82 },
    { r: -62, s: 0.85, x: -20, y: -78 },
  ];
  return (
    <g>
      <ellipse data-part="shadow" cx={4} cy={6} rx={40} ry={20} fill="#2a2140" opacity={0.2} filter="url(#soft-shadow)" />
      <g className="sway" data-part="leaves">
        {leaves.map((l, i) => (
          <g key={i} data-part={`leaf-${i + 1}`} transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(${l.s})`}>
            <path data-part={`leaf-${i + 1}-blade`} d="M 0 40 C -26 20 -28 -18 0 -38 C 28 -18 26 20 0 40 Z" fill={i % 2 ? adjust(leaf, 0.12) : leaf} />
            <path data-part={`leaf-${i + 1}-vein`} d="M 0 36 L 0 -30" stroke={adjust(leaf, -0.25)} strokeWidth={2} />
            <path data-part={`leaf-${i + 1}-vein-side`} d="M -14 4 L -4 10 M 14 -4 L 4 2" stroke={adjust(leaf, -0.25)} strokeWidth={1.6} opacity={0.6} />
          </g>
        ))}
      </g>
      <path data-part="pot" d="M -30 -46 L 30 -46 L 22 0 Q 0 8 -22 0 Z" fill={def.accent} stroke="rgba(37,35,64,0.14)" strokeWidth={1.2} />
      <ellipse data-part="pot-rim" cx={0} cy={-46} rx={30} ry={9} fill={adjust(def.accent, -0.12)} />
      <ellipse data-part="soil" cx={0} cy={-46} rx={24} ry={6} fill="#6b4f3a" />
      <path data-part="pot-band" d="M -26 -30 L 26 -30" stroke={adjust(def.accent, -0.15)} strokeWidth={3} />
    </g>
  );
}

function Cactus({ def }: Ctx) {
  const pots = [
    { x: -30, y: 0, h: 52 },
    { x: 8, y: 10, h: 72 },
    { x: 36, y: -10, h: 40 },
  ];
  return (
    <g>
      <ellipse data-part="shadow" cx={6} cy={10} rx={60} ry={24} fill="#2a2140" opacity={0.18} filter="url(#soft-shadow)" />
      {pots.map((p, i) => (
        <g key={i} data-part={`cactus-${i + 1}`} transform={`translate(${p.x} ${p.y})`}>
          <rect data-part={`cactus-${i + 1}-body`} x={-11} y={-28 - p.h} width={22} height={p.h} rx={11} fill={i === 1 ? adjust(def.color, -0.1) : def.color} />
          {i === 1 && <rect data-part="cactus-2-arm" x={6} y={-28 - p.h * 0.6} width={16} height={22} rx={8} fill={def.color} />}
          <path data-part={`cactus-${i + 1}-ridge`} d={`M 0 ${-24 - p.h} L 0 -30`} stroke={adjust(def.color, 0.25)} strokeWidth={2} opacity={0.6} />
          <path data-part={`cactus-${i + 1}-pot`} d="M -16 -30 L 16 -30 L 12 0 Q 0 4 -12 0 Z" fill={def.accent} stroke="rgba(37,35,64,0.14)" strokeWidth={1} />
          {i === 0 && <circle data-part="cactus-1-flower" cx={0} cy={-30 - p.h} r={5} fill="#ff8fb0" />}
        </g>
      ))}
    </g>
  );
}

function Lamp({ def }: Ctx) {
  return (
    <g>
      <circle data-part="glow" cx={0} cy={-150} r={150} fill="url(#lamp-glow)" style={{ opacity: 'var(--lamp-glow)' as unknown as number }} />
      <ellipse data-part="shadow" cx={4} cy={6} rx={34} ry={16} fill="#2a2140" opacity={0.2} filter="url(#soft-shadow)" />
      <ellipse data-part="base" cx={0} cy={0} rx={26} ry={12} fill={def.accent} />
      <rect data-part="pole" x={-3} y={-150} width={6} height={150} fill={def.accent} />
      <path data-part="shade" d="M -36 -150 L 36 -150 L 22 -206 L -22 -206 Z" fill={def.color} stroke="rgba(37,35,64,0.15)" strokeWidth={1.2} />
      <ellipse data-part="shade-bottom" cx={0} cy={-150} rx={36} ry={8} fill={adjust(def.color, 0.4)} style={{ opacity: 'calc(0.3 + var(--lamp-glow) * 0.7)' as unknown as number }} />
    </g>
  );
}

function Rug({ def }: Ctx) {
  if (def.id === 'rug-sun') {
    return (
      <g data-part="rug" transform={PLANE.floor}>
        <circle data-part="border" r={128} fill={adjust(def.color, -0.08)} />
        <circle data-part="field" r={122} fill={def.color} />
        {Array.from({ length: 16 }).map((_, i) => (
          <path key={i} data-part={`ray-${i + 1}`} d="M 0 -116 L 7 -96 L -7 -96 Z" fill={def.accent} transform={`rotate(${i * 22.5})`} opacity={0.8} />
        ))}
        <circle data-part="center-ring" r={70} fill={def.accent} opacity={0.7} />
        <circle data-part="center" r={52} fill={def.color} />
      </g>
    );
  }
  return (
    <g data-part="rug" transform={PLANE.floor}>
      <rect data-part="border" x={-150} y={-115} width={300} height={230} rx={40} fill={adjust(def.color, -0.12)} />
      <rect data-part="field" x={-144} y={-109} width={288} height={218} rx={36} fill={def.color} />
      {[-60, -10, 40].map((yy, wi) => (
        <path
          key={yy}
          data-part={`wave-${wi + 1}`}
          d={`M -120 ${yy} q 20 -18 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0`}
          stroke={def.accent}
          strokeWidth={9}
          fill="none"
          strokeLinecap="round"
          opacity={0.85}
        />
      ))}
    </g>
  );
}

function Clock({ def, hour }: Ctx) {
  const m = (hour % 1) * 60;
  const hAng = ((hour % 12) / 12) * 360 + (m / 60) * 30 - 30 * (m / 60) + (m / 60) * 30;
  const mAng = (m / 60) * 360;
  return (
    <g>
      <circle data-part="case" r={44} fill={adjust(def.color, -0.1)} />
      <circle data-part="face" r={40} fill={def.color} stroke={def.accent} strokeWidth={4} />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} data-part={`tick-${i + 1}`} x={-1.5} y={-34} width={3} height={i % 3 === 0 ? 8 : 4} fill={def.accent} transform={`rotate(${i * 30})`} opacity={0.7} />
      ))}
      <rect data-part="hour-hand" x={-2.5} y={-22} width={5} height={24} rx={2.5} fill={def.accent} transform={`rotate(${hAng})`} />
      <rect data-part="minute-hand" x={-1.5} y={-31} width={3} height={33} rx={1.5} fill="#ff6f9c" transform={`rotate(${mAng})`} />
      <circle data-part="center" r={4} fill={def.accent} />
    </g>
  );
}

function Poster({ def }: Ctx) {
  const night = def.id === 'poster-night';
  return (
    <g>
      <rect data-part="frame" x={-48} y={-62} width={96} height={124} rx={4} fill="#ffffff" stroke="rgba(37,35,64,0.18)" strokeWidth={2} />
      <rect data-part="paper" x={-40} y={-54} width={80} height={108} fill={def.color} />
      {night ? (
        <g>
          <circle data-part="moon" cx={14} cy={-22} r={14} fill={def.accent} />
          <circle data-part="moon-cut" cx={20} cy={-26} r={12} fill={def.color} />
          {[
            [-24, -34],
            [-10, -10],
            [24, 8],
            [-28, 18],
            [6, 30],
          ].map(([x, y], i) => (
            <circle key={i} data-part={`star-${i + 1}`} cx={x} cy={y} r={2.4} fill="#ffffff" />
          ))}
        </g>
      ) : (
        <g>
          <circle data-part="sun" cx={16} cy={-24} r={12} fill="#ff9f7a" />
          <path data-part="hill-far" d="M -40 30 Q -12 -6 14 18 Q 30 4 40 14 L 40 54 L -40 54 Z" fill={def.accent} />
          <path data-part="hill-near" d="M -40 40 Q 0 20 40 36 L 40 54 L -40 54 Z" fill={adjust(def.accent, -0.2)} />
        </g>
      )}
    </g>
  );
}

const renderers: Record<FurnitureDef['kind'], (c: Ctx) => ReactNode> = {
  bed: Bed,
  desk: Desk,
  bookshelf: Bookshelf,
  lowtable: LowTable,
  cushion: Cushion,
  beanbag: Beanbag,
  plant: Plant,
  cactus: Cactus,
  lamp: Lamp,
  rug: Rug,
  clock: Clock,
  poster: Poster,
};

export function FurnitureArt({ def, mirrored = false, hour = 12 }: { def: FurnitureDef; mirrored?: boolean; hour?: number }) {
  const R = renderers[def.kind];
  return <>{R({ def, mirrored, hour })}</>;
}

/** 持ち物・お店用のサムネイル。家具を正方形の枠に収める */
export const THUMB_VIEW: Record<FurnitureDef['kind'], string> = {
  bed: '-200 -170 400 300',
  desk: '-170 -190 340 280',
  bookshelf: '-120 -270 240 320',
  lowtable: '-110 -110 220 170',
  cushion: '-90 -80 180 130',
  beanbag: '-95 -110 190 150',
  plant: '-80 -180 160 200',
  cactus: '-80 -140 160 170',
  lamp: '-100 -260 200 280',
  rug: '-260 -160 520 320',
  clock: '-60 -60 120 120',
  poster: '-70 -80 140 160',
};

export function FurnitureThumb({ def, size = 64 }: { def: FurnitureDef; size?: number }) {
  return (
    <svg viewBox={THUMB_VIEW[def.kind]} width={size} height={size} aria-hidden style={{ overflow: 'visible' }}>
      <FurnitureArt def={def} />
    </svg>
  );
}
