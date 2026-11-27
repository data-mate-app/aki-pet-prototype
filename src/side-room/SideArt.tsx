import type { ReactNode } from 'react';
import { adjust } from '../art/iso';
import { BOOK_COLORS } from '../art/Furniture';
import { lightAt } from '../domain/daylight';
import { BAND_H, BAND_W } from './zones';

/**
 * 横視点の部屋の絵（帯 1500 × 812）。既存の家具は等角専用なので、横から見た絵を新しく描く。
 * 色・素材は今の部屋（src/data/furniture.ts、design/palette.svg）に合わせ、
 * 光は深夜 0:28（lightAt(0.47)）から取る。
 * 家具は正面の面を基本に、上面を薄い帯で見せる（目線が少し上）。消失点は使わない。
 */
const L = lightAt(0.47);

const INK = '#252340';
const LAMP = '#ffb648';
const PINK = '#ffb3c7';
const CREAM = '#fff1c9';
const WOOD = '#c99a6b';
const WOOD_LIGHT = '#d8b48a';
const WOOD_DARK = '#9b6b4a';
const FLOOR_Y = 520; // 壁と床の境（幅木の下端）
const BASE_Y = 545; // 壁ぎわの家具の足もと
const FONT = "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', system-ui, sans-serif";

/** 家具の足もとの影（ぼかした楕円） */
function Shadow({ cx, cy, rx, ry = 8, o = 0.3 }: { cx: number; cy: number; rx: number; ry?: number; o?: number }) {
  return <ellipse data-part="shadow" cx={cx} cy={cy} rx={rx} ry={ry} fill="#1a1630" opacity={o} filter="url(#sr-blur)" />;
}

/** こむぎの顔（写真・マップの印用） */
export function MiniFace({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <ellipse cx="5.2" cy="10.5" rx="3.4" ry="5.6" transform="rotate(14 5.2 10.5)" fill="#c98a52" />
      <ellipse cx="18.8" cy="10.5" rx="3.4" ry="5.6" transform="rotate(-14 18.8 10.5)" fill="#c98a52" />
      <circle cx="12" cy="13" r="8.6" fill="#f4c98a" />
      <ellipse cx="12" cy="16.2" rx="4.6" ry="3.4" fill="#fff3dc" />
      <circle cx="8.8" cy="12.4" r="1.15" fill="#4b3324" />
      <circle cx="15.2" cy="12.4" r="1.15" fill="#4b3324" />
      <ellipse cx="12" cy="14.8" rx="1.5" ry="1.05" fill="#4b3324" />
      <ellipse cx="6.6" cy="15.2" rx="1.7" ry="1.1" fill="#ff9c86" opacity="0.6" />
      <ellipse cx="17.4" cy="15.2" rx="1.7" ry="1.1" fill="#ff9c86" opacity="0.6" />
    </svg>
  );
}

// ---------- 定義（グラデーション・ぼかし） ----------

function Defs() {
  return (
    <defs>
      <filter id="sr-blur" x="-40%" y="-80%" width="180%" height="260%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <filter id="sr-blur-s" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.4" />
      </filter>
      <linearGradient id="sr-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={adjust(L.wallL, -0.2)} />
        <stop offset="0.55" stopColor={L.wallL} />
        <stop offset="1" stopColor={adjust(L.wallL, -0.04)} />
      </linearGradient>
      <linearGradient id="sr-floor-shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#120e2c" stopOpacity="0.32" />
        <stop offset="0.12" stopColor="#120e2c" stopOpacity="0.06" />
        <stop offset="1" stopColor="#120e2c" stopOpacity="0.18" />
      </linearGradient>
      <linearGradient id="sr-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={L.skyTop} />
        <stop offset="1" stopColor={L.skyBottom} />
      </linearGradient>
      <linearGradient id="sr-door" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#b98c63" />
        <stop offset="1" stopColor="#a47a55" />
      </linearGradient>
      <linearGradient id="sr-moonbeam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#cfdcff" stopOpacity="0.3" />
        <stop offset="1" stopColor="#cfdcff" stopOpacity="0.04" />
      </linearGradient>
      <linearGradient id="sr-screen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#46569e" />
        <stop offset="1" stopColor="#2d3770" />
      </linearGradient>
      <radialGradient id="sr-glow-warm">
        <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.78" />
        <stop offset="0.4" stopColor="#ffc860" stopOpacity="0.3" />
        <stop offset="1" stopColor="#ffb648" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="sr-glow-pink">
        <stop offset="0" stopColor="#ffc2d4" stopOpacity="0.8" />
        <stop offset="1" stopColor="#ffb3c7" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="sr-glow-cream">
        <stop offset="0" stopColor="#fff6d6" stopOpacity="0.85" />
        <stop offset="1" stopColor="#fff1c9" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="sr-glow-moon">
        <stop offset="0" stopColor="#fff6d6" stopOpacity="0.6" />
        <stop offset="1" stopColor="#fff6d6" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="sr-glow-blue">
        <stop offset="0" stopColor="#9fb4ff" stopOpacity="0.5" />
        <stop offset="1" stopColor="#9fb4ff" stopOpacity="0" />
      </radialGradient>
      <pattern id="sr-stripes" width="30" height="40" patternUnits="userSpaceOnUse">
        <rect x="14" width="1.6" height="40" fill="#ffffff" opacity="0.05" />
        <rect x="16.6" width="1" height="40" fill="#10102c" opacity="0.08" />
      </pattern>
      <pattern id="sr-dots" width="30" height="30" patternUnits="userSpaceOnUse">
        <circle cx="7" cy="8" r="1.1" fill="#ffffff" opacity="0.07" />
        <circle cx="22" cy="23" r="1.1" fill="#ffffff" opacity="0.07" />
      </pattern>
      <pattern id="sr-cork" width="12" height="12" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="4" r="1.2" fill="#a97a4c" opacity="0.5" />
        <circle cx="9" cy="9" r="1" fill="#e2b98a" opacity="0.5" />
        <circle cx="10" cy="2" r="0.8" fill="#8f6339" opacity="0.4" />
      </pattern>
      <clipPath id="sr-rug-clip">
        <ellipse cx="567" cy="600" rx="150" ry="32" />
      </clipPath>
    </defs>
  );
}

// ---------- 壁・床 ----------

const PLANK_H = [14, 17, 20, 24, 28, 33, 39, 46, 54, 62];

function Floor() {
  const rows: ReactNode[] = [];
  let y = FLOOR_Y;
  PLANK_H.forEach((h, i) => {
    const hh = Math.min(h, BAND_H - y);
    if (hh <= 0) return;
    rows.push(<rect key={`r${i}`} data-part={`plank-${i + 1}`} x={0} y={y} width={BAND_W} height={hh} fill={i % 2 ? L.floorB : L.floorA} />);
    // 継ぎ目は縦線で、列ごとにずらす
    const step = 120 + h * 3;
    const off = (i * 71) % step;
    for (let x = -off + step; x < BAND_W; x += step) {
      rows.push(<line key={`s${i}-${x}`} x1={x} y1={y} x2={x} y2={y + hh} stroke="#1c1130" strokeOpacity={0.2} strokeWidth={1.3} />);
    }
    rows.push(<line key={`e${i}`} x1={0} y1={y} x2={BAND_W} y2={y} stroke="#1c1130" strokeOpacity={0.16} strokeWidth={1.2} />);
    // 板のつや
    rows.push(<line key={`h${i}`} x1={0} y1={y + 1.6} x2={BAND_W} y2={y + 1.6} stroke="#ffffff" strokeOpacity={0.05} strokeWidth={1} />);
    y += hh;
  });
  return (
    <g data-part="floor">
      {rows}
      <rect data-part="floor-shade" x={0} y={FLOOR_Y} width={BAND_W} height={BAND_H - FLOOR_Y} fill="url(#sr-floor-shade)" />
    </g>
  );
}

function Wall() {
  const grooves: ReactNode[] = [];
  for (let x = 13; x < BAND_W; x += 26) {
    grooves.push(<line key={`g${x}`} x1={x} y1={446} x2={x} y2={FLOOR_Y - 18} stroke="#12102e" strokeOpacity={0.3} strokeWidth={2} />);
    grooves.push(<line key={`l${x}`} x1={x + 2} y1={446} x2={x + 2} y2={FLOOR_Y - 18} stroke="#ffffff" strokeOpacity={0.07} strokeWidth={1} />);
  }
  return (
    <g data-part="wall">
      <rect data-part="wallpaper" x={0} y={0} width={BAND_W} height={FLOOR_Y} fill="url(#sr-wall)" />
      <rect data-part="wallpaper-stripes" x={0} y={0} width={BAND_W} height={440} fill="url(#sr-stripes)" />
      <rect data-part="wallpaper-dots" x={0} y={0} width={BAND_W} height={440} fill="url(#sr-dots)" />
      {/* 天井の見切り */}
      <rect data-part="ceiling" x={0} y={0} width={BAND_W} height={12} fill={adjust(L.wallL, -0.42)} />
      <rect x={0} y={12} width={BAND_W} height={5} fill={adjust(L.wallL, -0.25)} />
      <rect x={0} y={17} width={BAND_W} height={1.6} fill="#ffffff" opacity={0.1} />
      {/* 腰壁 */}
      <rect data-part="wainscot" x={0} y={444} width={BAND_W} height={FLOOR_Y - 444} fill={adjust(L.wallL, -0.12)} />
      {grooves}
      <rect data-part="rail" x={0} y={436} width={BAND_W} height={10} fill={adjust(L.wallL, 0.1)} />
      <rect x={0} y={436} width={BAND_W} height={2.5} fill="#ffffff" opacity={0.14} />
      <rect x={0} y={446} width={BAND_W} height={4} fill="#0e0c28" opacity={0.2} />
      <rect data-part="baseboard" x={0} y={FLOOR_Y - 18} width={BAND_W} height={18} fill={adjust(L.wallL, 0.16)} />
      <rect x={0} y={FLOOR_Y - 18} width={BAND_W} height={2} fill="#ffffff" opacity={0.18} />
      <rect x={0} y={FLOOR_Y - 5} width={BAND_W} height={5} fill="#0e0c28" opacity={0.18} />
    </g>
  );
}

/** 部屋の角（左右の端の暗い側面の壁） */
function Corners() {
  return (
    <g data-part="corners">
      <path data-part="corner-left" d={`M0 0 H24 L26 ${FLOOR_Y} H0 Z`} fill="#0f0c2c" opacity={0.42} />
      <rect x={24} y={0} width={2.4} height={FLOOR_Y} fill="#ffffff" opacity={0.12} />
      <path data-part="corner-right" d={`M${BAND_W} 0 H${BAND_W - 24} L${BAND_W - 26} ${FLOOR_Y} H${BAND_W} Z`} fill="#0f0c2c" opacity={0.42} />
      <rect x={BAND_W - 26.4} y={0} width={2.4} height={FLOOR_Y} fill="#ffffff" opacity={0.12} />
      <path d={`M0 ${FLOOR_Y} H26 L30 ${BAND_H} H0 Z`} fill="#0f0c2c" opacity={0.22} />
      <path d={`M${BAND_W} ${FLOOR_Y} H${BAND_W - 26} L${BAND_W - 30} ${BAND_H} H${BAND_W} Z`} fill="#0f0c2c" opacity={0.22} />
    </g>
  );
}

// ---------- ガーランド（端から端まで） ----------

const PIN_GAP = 150;
const BULB_COLORS = [
  { fill: LAMP, glow: 'warm' },
  { fill: PINK, glow: 'pink' },
  { fill: CREAM, glow: 'cream' },
] as const;

function Garland() {
  const parts: ReactNode[] = [];
  const bulbs: ReactNode[] = [];
  const pins: ReactNode[] = [];
  let n = 0;
  for (let x0 = 0; x0 < BAND_W; x0 += PIN_GAP) {
    const x1 = x0 + PIN_GAP;
    const xm = (x0 + x1) / 2;
    parts.push(<path key={`w${x0}`} d={`M${x0} 205 Q${xm} 240 ${x1} 205`} fill="none" stroke="#2f2848" strokeWidth={1.6} strokeLinecap="round" />);
    for (const t of [0.12, 0.31, 0.5, 0.69, 0.88]) {
      const u = 1 - t;
      const bx = u * u * x0 + 2 * u * t * xm + t * t * x1;
      const by = u * u * 205 + 2 * u * t * 240 + t * t * 205;
      const c = BULB_COLORS[n % 3];
      const delay = -((n * 0.73) % 3.2);
      bulbs.push(
        <g key={`b${n}`} data-part={`bulb-${n + 1}`} transform={`translate(${bx.toFixed(1)} ${by.toFixed(1)})`}>
          <circle className="sr-twinkle" style={{ animationDelay: `${delay}s` }} cx={0} cy={9} r={17} fill={`url(#sr-glow-${c.glow})`} />
          <rect x={-2.2} y={-1} width={4.4} height={5.4} rx={1} fill="#3a3354" />
          <path d="M0 3 C-5.6 4.6 -6.6 10 -3.6 13.6 C-2 15.4 2 15.4 3.6 13.6 C6.6 10 5.6 4.6 0 3Z" fill={c.fill} />
          <ellipse cx={-1.7} cy={8} rx={1.3} ry={2.2} fill="#ffffff" opacity={0.7} />
        </g>,
      );
      n++;
    }
    pins.push(
      <g key={`p${x0}`} data-part={`pin-${x0 / PIN_GAP + 1}`}>
        <rect x={x0 - 3} y={199} width={6} height={13} rx={1.8} fill={WOOD_LIGHT} />
        <rect x={x0 - 3} y={199} width={6} height={4} rx={1.5} fill={WOOD_DARK} />
      </g>,
    );
  }
  pins.push(
    <g key="pend" data-part="pin-end">
      <rect x={BAND_W - 3} y={199} width={6} height={13} rx={1.8} fill={WOOD_LIGHT} />
    </g>,
  );
  return (
    <g data-part="garland">
      {parts}
      {pins}
      {bulbs}
    </g>
  );
}

// ---------- ねどこ ----------

function Nightstand() {
  const x = 40;
  return (
    <g data-part="nightstand">
      <Shadow cx={72} cy={BASE_Y + 3} rx={44} />
      <rect data-part="ns-leg-l" x={x + 4} y={528} width={6} height={18} rx={2} fill={WOOD_DARK} />
      <rect data-part="ns-leg-r" x={x + 55} y={528} width={6} height={18} rx={2} fill={WOOD_DARK} />
      <rect data-part="ns-body" x={x} y={472} width={65} height={60} rx={5} fill={WOOD} />
      <rect x={x} y={472} width={65} height={5} fill="#ffffff" opacity={0.1} />
      <rect data-part="ns-drawer-1" x={x + 7} y={481} width={51} height={22} rx={4} fill={adjust(WOOD, -0.08)} />
      <rect data-part="ns-drawer-2" x={x + 7} y={506} width={51} height={22} rx={4} fill={adjust(WOOD, -0.08)} />
      <circle cx={x + 32.5} cy={492} r={2.6} fill="#ffe2a0" />
      <circle cx={x + 32.5} cy={517} r={2.6} fill="#ffe2a0" />
      <rect data-part="ns-top" x={x - 4} y={464} width={73} height={9} rx={3} fill={WOOD_LIGHT} />
      <rect x={x - 4} y={464} width={73} height={2.6} rx={1.3} fill="#ffffff" opacity={0.28} />
    </g>
  );
}

function NightLamp() {
  return (
    <g data-part="night-lamp">
      <ellipse cx={72} cy={463} rx={12} ry={3} fill="#5a4a3a" />
      <rect x={69} y={436} width={6} height={28} rx={2} fill="#5a4a3a" />
      <path data-part="lamp-shade" d="M49 438 H95 L86 396 H58 Z" fill="#ffd98a" />
      <path d="M58 396 H86 L88 402 H56 Z" fill="#fff1c9" />
      <path d="M52 430 H92 L93 438 H49 Z" fill="#f2b04c" opacity={0.55} />
      <ellipse cx={72} cy={438} rx={23} ry={3} fill="#fff1c9" opacity={0.9} />
    </g>
  );
}

function Bed() {
  const blanket = '#8fb3e8';
  return (
    <g data-part="bed">
      <Shadow cx={292} cy={BASE_Y + 4} rx={156} ry={9} o={0.34} />
      <rect data-part="bed-leg-l" x={156} y={528} width={11} height={18} rx={3} fill={WOOD_DARK} />
      <rect data-part="bed-leg-r" x={408} y={528} width={11} height={18} rx={3} fill={WOOD_DARK} />
      {/* 台 */}
      <rect data-part="bed-frame" x={150} y={500} width={280} height={30} rx={5} fill={WOOD} />
      <rect x={150} y={500} width={280} height={4} rx={2} fill="#ffffff" opacity={0.14} />
      <rect x={150} y={524} width={280} height={6} rx={3} fill="#3a2418" opacity={0.18} />
      {/* ヘッドボード（頭は左） */}
      <rect data-part="bed-headboard" x={148} y={372} width={26} height={160} rx={10} fill={adjust(WOOD, -0.05)} />
      <rect x={154} y={384} width={14} height={110} rx={6} fill={adjust(WOOD, 0.08)} opacity={0.75} />
      <circle cx={161} cy={376} r={6} fill={WOOD_LIGHT} />
      {/* マットレス */}
      <rect data-part="bed-mattress" x={172} y={462} width={246} height={42} rx={11} fill="#f1ece4" />
      {/* まくら */}
      <g data-part="bed-pillow">
        <rect x={180} y={436} width={58} height={34} rx={16} fill="#fbf8f2" />
        <path d="M186 462 Q209 470 232 462" fill="none" stroke="#d8d0e0" strokeWidth={2.2} strokeLinecap="round" />
        <ellipse cx={200} cy={444} rx={9} ry={3.4} fill="#ffffff" opacity={0.8} />
      </g>
      {/* 掛け布団 */}
      <g data-part="bed-blanket">
        <path d="M236 462 Q238 442 256 442 L400 442 Q420 442 422 462 L422 506 Q404 520 388 508 Q372 520 356 508 Q340 520 324 508 Q308 520 292 508 Q276 520 260 508 Q244 516 236 506 Z" fill={blanket} />
        <path d="M236 462 Q238 442 256 442 L400 442 Q420 442 422 462 Q330 452 236 462Z" fill="#acc6f0" />
        <path d="M256 442 L248 508" stroke="#6f95d6" strokeWidth={2} opacity={0.5} strokeLinecap="round" />
        <rect x={236} y={456} width={20} height={52} rx={6} fill="#f4f8ff" opacity={0.28} />
        {[
          [290, 480],
          [330, 470],
          [366, 484],
          [398, 468],
        ].map(([sx, sy], i) => (
          <path key={i} d={`M${sx} ${sy - 5} l1.7 3.4 3.8.5 -2.8 2.6.7 3.7 -3.4-1.8 -3.4 1.8.7-3.7 -2.8-2.6 3.8-.5z`} fill="#ffffff" opacity={0.85} />
        ))}
        <ellipse cx={330} cy={452} rx={60} ry={3} fill="#ffffff" opacity={0.2} />
      </g>
      {/* 足もとの板 */}
      <rect data-part="bed-footboard" x={414} y={468} width={16} height={66} rx={6} fill={adjust(WOOD, -0.05)} />
      <rect x={417} y={472} width={4} height={56} rx={2} fill="#ffffff" opacity={0.14} />
    </g>
  );
}

function WallClock() {
  const cx = 300;
  const cy = 292;
  // 0:28 → 分針は 168°、時針は 14°
  const hand = (deg: number, len: number, w: number) => {
    const r = (deg * Math.PI) / 180;
    return <line x1={cx} y1={cy} x2={cx + Math.sin(r) * len} y2={cy - Math.cos(r) * len} stroke={INK} strokeWidth={w} strokeLinecap="round" />;
  };
  return (
    <g data-part="wall-clock">
      <circle cx={cx} cy={cy + 3} r={36} fill="#10102c" opacity={0.25} filter="url(#sr-blur-s)" />
      <circle cx={cx} cy={cy} r={34} fill="#ffffff" stroke={INK} strokeWidth={4} />
      <circle cx={cx} cy={cy} r={29} fill="#f6f4fb" />
      {Array.from({ length: 12 }, (_, i) => {
        const r = (i * 30 * Math.PI) / 180;
        const big = i % 3 === 0;
        return <line key={i} x1={cx + Math.sin(r) * (big ? 22 : 25)} y1={cy - Math.cos(r) * (big ? 22 : 25)} x2={cx + Math.sin(r) * 27.5} y2={cy - Math.cos(r) * 27.5} stroke={INK} strokeOpacity={big ? 0.8 : 0.4} strokeWidth={big ? 2.2 : 1.4} strokeLinecap="round" />;
      })}
      {hand(14, 15, 3.6)}
      {hand(168, 23, 2.4)}
      <circle cx={cx} cy={cy} r={3} fill={PINK} stroke={INK} strokeWidth={1.2} />
    </g>
  );
}

function SmallFrame() {
  return (
    <g data-part="small-frame">
      <rect x={196} y={262} width={46} height={58} rx={4} fill={WOOD} />
      <rect x={201} y={267} width={36} height={48} rx={2} fill="#2c3570" />
      <circle cx={225} cy={282} r={6} fill="#ffe08c" />
      <circle cx={227.6} cy={280.4} r={5} fill="#2c3570" />
      <path d="M201 308 Q214 292 228 300 Q233 296 237 300 V315 H201Z" fill="#4cc49d" opacity={0.85} />
      <circle cx={210} cy={276} r={0.9} fill="#fff" />
      <circle cx={216} cy={287} r={0.9} fill="#fff" />
    </g>
  );
}

function PlushShelf() {
  return (
    <g data-part="plush-shelf">
      {/* ぬいぐるみ（クマ） */}
      <g data-part="plush">
        <ellipse cx={384} cy={334} rx={15} ry={13} fill="#f6d2b4" />
        <circle cx={384} cy={310} r={12} fill="#f6d2b4" />
        <circle cx={375} cy={300} r={4.6} fill="#f6d2b4" />
        <circle cx={393} cy={300} r={4.6} fill="#f6d2b4" />
        <circle cx={375} cy={300} r={2.2} fill="#ffb3c7" />
        <circle cx={393} cy={300} r={2.2} fill="#ffb3c7" />
        <ellipse cx={384} cy={314} rx={5.6} ry={4.2} fill="#fff3e6" />
        <circle cx={379.5} cy={309} r={1.3} fill="#4b3324" />
        <circle cx={388.5} cy={309} r={1.3} fill="#4b3324" />
        <ellipse cx={384} cy={312.6} rx={1.8} ry={1.2} fill="#4b3324" />
        <path d="M376 322 L392 322 L390 327 L378 327Z" fill="#ff8a8a" />
        <ellipse cx={370} cy={338} rx={5} ry={4} fill="#f6d2b4" />
        <ellipse cx={398} cy={338} rx={5} ry={4} fill="#f6d2b4" />
      </g>
      <rect data-part="shelf-board" x={340} y={346} width={90} height={8} rx={2.5} fill={WOOD_LIGHT} />
      <rect x={340} y={346} width={90} height={2.4} rx={1.2} fill="#ffffff" opacity={0.28} />
      <path d="M352 354 v16 l12 -16z" fill={WOOD_DARK} />
      <path d="M420 354 v16 l-12 -16z" fill={WOOD_DARK} />
      {/* 小さな本 */}
      <rect x={405} y={330} width={9} height={16} rx={1.5} fill="#c7a3ff" />
      <rect x={414} y={334} width={8} height={12} rx={1.5} fill="#ffd36b" />
    </g>
  );
}

function Slippers() {
  return (
    <g data-part="slippers">
      <ellipse cx={192} cy={578} rx={22} ry={4} fill="#1a1630" opacity={0.22} filter="url(#sr-blur-s)" />
      {[
        [176, 568],
        [208, 572],
      ].map(([sx, sy], i) => (
        <g key={i} data-part={`slipper-${i + 1}`}>
          <path d={`M${sx - 14} ${sy + 4} Q${sx - 15} ${sy - 6} ${sx - 2} ${sy - 6} Q${sx + 14} ${sy - 7} ${sx + 15} ${sy + 3} Q${sx + 15} ${sy + 7} ${sx} ${sy + 7} H${sx - 9} Q${sx - 14} ${sy + 7} ${sx - 14} ${sy + 4}Z`} fill="#ff9fb5" />
          <path d={`M${sx - 4} ${sy - 6} Q${sx + 6} ${sy - 7} ${sx + 12} ${sy}`} fill="none" stroke="#ffe0e8" strokeWidth={2.4} strokeLinecap="round" />
          <ellipse cx={sx + 8} cy={sy - 1} rx={4} ry={2.2} fill="#ffffff" opacity={0.5} />
        </g>
      ))}
    </g>
  );
}

// ---------- ちゃのま ----------

function Window() {
  const stars: [number, number, number][] = [
    [522, 278, 0],
    [545, 300, 1.1],
    [530, 330, 2.2],
    [610, 322, 0.6],
    [575, 270, 1.7],
    [553, 352, 2.7],
  ];
  const towns = [
    [510, 396, 12, 18],
    [524, 388, 10, 26],
    [538, 400, 14, 14],
    [556, 392, 11, 22],
    [572, 398, 16, 16],
    [592, 386, 10, 28],
    [606, 396, 13, 18],
  ];
  return (
    <g data-part="window">
      {/* カーテンレール */}
      <line x1={472} y1={248} x2={662} y2={248} stroke="#5a4a3a" strokeWidth={4} strokeLinecap="round" />
      <circle cx={470} cy={248} r={5} fill={WOOD_LIGHT} />
      <circle cx={664} cy={248} r={5} fill={WOOD_LIGHT} />
      {/* 枠・ガラス */}
      <rect data-part="window-frame" x={500} y={256} width={134} height={164} rx={7} fill="#e9d8c4" />
      <rect data-part="window-glass" x={508} y={264} width={118} height={148} rx={3} fill="url(#sr-sky)" />
      <clipPath id="sr-win-clip">
        <rect x={508} y={264} width={118} height={148} rx={3} />
      </clipPath>
      <g clipPath="url(#sr-win-clip)">
        <circle cx={596} cy={296} r={40} fill="url(#sr-glow-moon)" />
        {stars.map(([sx, sy, d], i) => (
          <path key={i} className="sr-twinkle sr-star" style={{ animationDelay: `${-d}s` }} d={`M${sx} ${sy - 3.4} l0.9 2.5 2.5 0.9 -2.5 0.9 -0.9 2.5 -0.9-2.5 -2.5-0.9 2.5-0.9z`} fill="#fff6d6" />
        ))}
        <g data-part="moon">
          <circle cx={596} cy={296} r={15} fill="#fff3c9" />
          <circle cx={603} cy={291} r={13.5} fill="#2a2f5c" />
        </g>
        {/* 遠くの町の灯り */}
        <path d="M508 394 Q540 380 568 390 T626 384 V412 H508Z" fill="#161c44" />
        {towns.map(([tx, ty, tw, th], i) => (
          <g key={i}>
            <rect x={tx} y={ty} width={tw} height={th + 20} fill="#10153a" />
            {[0, 1, 2].map((r) => (
              <rect key={r} x={tx + 2.5 + (r % 2) * 4.5} y={ty + 3 + r * 6.5} width={2.4} height={2.6} fill="#ffd36b" opacity={0.85} />
            ))}
          </g>
        ))}
      </g>
      <rect data-part="window-mullion-v" x={565} y={264} width={4} height={148} fill="#e9d8c4" />
      <rect data-part="window-mullion-h" x={508} y={334} width={118} height={4} fill="#e9d8c4" />
      <rect x={508} y={264} width={118} height={148} rx={3} fill="none" stroke="#b9a58c" strokeWidth={1.4} opacity={0.6} />
      {/* ガラスのつや */}
      <path d="M514 270 L540 270 L514 304Z" fill="#ffffff" opacity={0.1} />
      {/* 窓台 */}
      <rect data-part="window-sill" x={492} y={416} width={150} height={12} rx={4} fill="#d9c7ae" />
      <rect x={492} y={416} width={150} height={3} rx={1.5} fill="#ffffff" opacity={0.35} />
      {/* 窓台の小さなサボテン */}
      <g data-part="sill-cactus">
        <rect x={606} y={404} width={18} height={13} rx={3} fill="#ffb3c7" />
        <rect x={611} y={388} width={8} height={18} rx={4} fill="#6cc08b" />
        <rect x={605} y={394} width={6} height={4.6} rx={2.3} fill="#6cc08b" />
        <circle cx={615} cy={388} r={2} fill="#ff6f9c" />
      </g>
      {/* カーテン */}
      {[
        { x: 478, dir: 1 },
        { x: 656, dir: -1 },
      ].map(({ x, dir }) => {
        const w = 34;
        const left = dir === 1 ? x : x - w + 10;
        return (
          <g key={x} data-part={dir === 1 ? 'curtain-left' : 'curtain-right'}>
            <path d={`M${left} 250 h${w} q${-dir * 3} 90 ${dir * 6} 168 q${-dir * 10} 12 ${-dir * 14} 12 H${left - dir * 2} Z`} fill="#b9a3d6" />
            <path d={`M${left + 8} 252 q${-dir * 3} 90 ${dir * 2} 176 M${left + 18} 252 q${-dir * 4} 90 ${dir * 2} 176 M${left + 27} 252 q${-dir * 3} 90 0 176`} fill="none" stroke="#8a74b3" strokeWidth={2} opacity={0.5} />
            <path d={`M${left + 4} 252 q${-dir * 2} 80 ${dir * 2} 160`} fill="none" stroke="#e2d4f5" strokeWidth={2} opacity={0.35} />
            <path d={`M${left - 1} 352 q${w / 2 + 1} 9 ${w + 1} 0 v8 q${-(w / 2 + 1)} 9 ${-(w + 1)} 0z`} fill="#ffb3c7" opacity={0.9} />
          </g>
        );
      })}
    </g>
  );
}

function MoonLight() {
  return (
    <g data-part="moonlight">
      <polygon data-part="moonlight-wall" points="508,414 626,414 700,520 480,520" fill="url(#sr-moonbeam)" opacity={0.5} />
      <polygon data-part="moonlight-floor" points="506,540 640,540 724,664 468,664" fill="url(#sr-moonbeam)" />
      <polygon points="548,540 556,540 600,664 580,664" fill="#10102c" opacity={0.1} />
      <polygon points="506,540 520,540 508,664 490,664" fill="#10102c" opacity={0.06} />
    </g>
  );
}

function PhotoFrame() {
  return (
    <g data-part="photo-frame">
      <rect x={412} y={294} width={50} height={60} rx={4} fill={WOOD} />
      <rect x={417} y={299} width={40} height={50} rx={2} fill="#fff4e0" />
      <rect x={417} y={299} width={40} height={50} rx={2} fill="#ffd8a8" opacity={0.4} />
      <g transform="translate(424 308) scale(1.1)">
        <MiniFaceInline />
      </g>
      <path d="M422 342 q15 -4 30 0" fill="none" stroke="#4cc49d" strokeWidth={2} strokeLinecap="round" />
      <circle cx={437} cy={293} r={2} fill="#ff8a8a" />
    </g>
  );
}

function MiniFaceInline() {
  return (
    <g>
      <ellipse cx="5.2" cy="10.5" rx="3.4" ry="5.6" transform="rotate(14 5.2 10.5)" fill="#c98a52" />
      <ellipse cx="18.8" cy="10.5" rx="3.4" ry="5.6" transform="rotate(-14 18.8 10.5)" fill="#c98a52" />
      <circle cx="12" cy="13" r="8.6" fill="#f4c98a" />
      <ellipse cx="12" cy="16.2" rx="4.6" ry="3.4" fill="#fff3dc" />
      <circle cx="8.8" cy="12.4" r="1.15" fill="#4b3324" />
      <circle cx="15.2" cy="12.4" r="1.15" fill="#4b3324" />
      <ellipse cx="12" cy="14.8" rx="1.5" ry="1.05" fill="#4b3324" />
    </g>
  );
}

function Plant() {
  // [傾き, 根もとの高さ, 葉の長さ, 色]
  const leaves: [number, number, number, string][] = [
    [-58, 466, 30, '#3f9e6c'],
    [56, 468, 30, '#3f9e6c'],
    [-30, 452, 38, '#4fae7b'],
    [28, 454, 38, '#4fae7b'],
    [-4, 446, 42, '#5cc08a'],
    [-82, 482, 24, '#4fae7b'],
    [80, 484, 24, '#4fae7b'],
  ];
  return (
    <g data-part="plant">
      <Shadow cx={466} cy={BASE_Y + 3} rx={30} ry={6} />
      {leaves.map(([rot, ly, len, c], i) => (
        <g key={i} transform={`translate(466 ${ly + 30}) rotate(${rot})`}>
          <path d={`M0 0 Q${-len * 0.42} ${-len * 0.5} 0 ${-len} Q${len * 0.42} ${-len * 0.5} 0 0Z`} fill={c} />
          <path d={`M0 -2 L0 ${-len * 0.86}`} stroke="#2f7a52" strokeWidth={1.3} opacity={0.55} />
          <path d={`M0 ${-len * 0.35} l${-len * 0.18} ${-len * 0.1} M0 ${-len * 0.55} l${len * 0.18} ${-len * 0.1} M0 ${-len * 0.7} l${-len * 0.14} ${-len * 0.07}`} stroke="#2f7a52" strokeWidth={1} opacity={0.4} fill="none" />
        </g>
      ))}
      <path d="M452 500 H480 L476 544 H456 Z" fill="#e9d8c4" />
      <rect x={449} y={494} width={34} height={9} rx={3} fill="#f3e6d3" />
      <path d="M456 544 L452 500" stroke="#ffffff" strokeWidth={2} opacity={0.3} />
    </g>
  );
}

function DecorSpot() {
  return (
    <g data-part="decor-spot">
      <rect x={673} y={296} width={40} height={46} rx={9} fill="#ffffff" opacity={0.07} />
      <rect x={674} y={297} width={38} height={44} rx={8} fill="none" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={2} strokeDasharray="5 5" strokeLinecap="round" />
      <path d="M693 310 V328 M684 319 H702" stroke="#ffffff" strokeOpacity={0.75} strokeWidth={2.6} strokeLinecap="round" />
    </g>
  );
}

function Rug() {
  const waves: ReactNode[] = [];
  for (let k = 0; k < 4; k++) {
    const yy = 580 + k * 14;
    let d = `M415 ${yy}`;
    for (let i = 0; i < 11; i++) d += ` q13 ${i % 2 ? 8 : -8} 26 0`;
    waves.push(<path key={k} d={d} fill="none" stroke="#eef1ff" strokeWidth={2.4} strokeLinecap="round" opacity={0.75} />);
  }
  return (
    <g data-part="rug">
      <ellipse cx={567} cy={605} rx={152} ry={33} fill="#1a1630" opacity={0.25} filter="url(#sr-blur-s)" />
      <ellipse data-part="rug-edge" cx={567} cy={604} rx={150} ry={32} fill="#7c8be0" />
      <ellipse data-part="rug-top" cx={567} cy={600} rx={150} ry={32} fill="#9fb0ff" />
      <g clipPath="url(#sr-rug-clip)">{waves}</g>
      <ellipse cx={567} cy={600} rx={142} ry={27} fill="none" stroke="#eef1ff" strokeWidth={1.6} opacity={0.55} />
    </g>
  );
}

function Zabuton() {
  return (
    <g data-part="zabuton">
      <ellipse cx={540} cy={621} rx={50} ry={7} fill="#1a1630" opacity={0.25} filter="url(#sr-blur-s)" />
      <path d="M496 610 Q494 619 505 621 Q540 626 575 621 Q586 619 584 610Z" fill="#5fb89c" />
      <ellipse cx={540} cy={610} rx={44} ry={10} fill="#7fd3b8" />
      <ellipse cx={540} cy={608} rx={34} ry={6.4} fill="#98e0c8" opacity={0.7} />
      <circle cx={540} cy={610} r={2.4} fill="#4aa88b" />
      <path d="M498 612 Q496 618 503 620" fill="none" stroke="#ffffff" strokeWidth={1.4} opacity={0.35} />
    </g>
  );
}

function Chabudai() {
  const cx = 646;
  return (
    <g data-part="chabudai">
      <Shadow cx={cx} cy={602} rx={50} ry={7} />
      <rect data-part="leg-l" x={cx - 32} y={582} width={7} height={19} rx={2} fill={adjust('#c08a5b', -0.18)} />
      <rect data-part="leg-r" x={cx + 25} y={582} width={7} height={19} rx={2} fill={adjust('#c08a5b', -0.18)} />
      <path d={`M${cx - 46} 574 Q${cx - 46} 590 ${cx} 590 Q${cx + 46} 590 ${cx + 46} 574Z`} fill={adjust('#c08a5b', -0.14)} />
      <ellipse data-part="table-top" cx={cx} cy={574} rx={46} ry={10} fill="#c08a5b" />
      <ellipse cx={cx} cy={572} rx={38} ry={7} fill="#d0a074" opacity={0.7} />
      {/* 空のお茶わん */}
      <g data-part="teabowl">
        <path d={`M${cx - 20} 566 Q${cx - 20} 579 ${cx - 9} 579 Q${cx + 2} 579 ${cx + 2} 566Z`} fill="#ffffff" />
        <ellipse cx={cx - 9} cy={566} rx={11} ry={3} fill="#e8ecff" />
        <ellipse cx={cx - 9} cy={567} rx={8} ry={1.8} fill="#cfd6f2" />
        <path d={`M${cx - 18} 572 H${cx}`} stroke="#7c9cff" strokeWidth={2} opacity={0.8} />
      </g>
      {/* マグ */}
      <g data-part="mug">
        <rect x={cx + 14} y={557} width={15} height={19} rx={4} fill="#ff9fb5" />
        <path d={`M${cx + 29} 561 q8 1 8 7 q0 6 -8 6`} fill="none" stroke="#ff9fb5" strokeWidth={3} strokeLinecap="round" />
        <ellipse cx={cx + 21.5} cy={557} rx={7.5} ry={2.2} fill="#d97b95" />
        <rect x={cx + 16} y={559} width={3} height={14} rx={1.5} fill="#ffffff" opacity={0.3} />
      </g>
    </g>
  );
}

// ---------- つくえ ----------

function Bookshelf() {
  const x0 = 715;
  const w = 85;
  const top = 262;
  const rows = [
    { y: 270, h: 70 },
    { y: 348, h: 70 },
    { y: 426, h: 70 },
    { y: 504, h: 34 },
  ];
  const books: ReactNode[] = [];
  let no = 0;
  rows.forEach((r, ri) => {
    let x = x0 + 9;
    let i = 0;
    while (x < x0 + w - 12) {
      const bw = 7 + ((i * 5 + ri * 3) % 4) * 1.6;
      const bh = Math.min(r.h - 8, 40 + ((i * 13 + ri * 7) % 5) * 5.5);
      const c = BOOK_COLORS[(i * 3 + ri * 2) % BOOK_COLORS.length];
      no++;
      if (ri === 1 && i === 5) {
        books.push(
          <g key={`b${no}`} data-part={`book-${no}`} transform={`rotate(14 ${x + bw} ${r.y + r.h - 1})`}>
            <rect x={x} y={r.y + r.h - bh} width={bw} height={bh} rx={1.4} fill={c} />
          </g>,
        );
        x += bw + 7;
      } else {
        books.push(<rect key={`b${no}`} data-part={`book-${no}`} x={x} y={r.y + r.h - bh} width={bw} height={bh} rx={1.4} fill={c} />);
        books.push(<rect key={`s${no}`} x={x + 1.3} y={r.y + r.h - bh + 6} width={bw - 2.6} height={2.2} fill="#ffffff" opacity={0.4} />);
        x += bw + 0.8;
      }
      i++;
    }
  });
  return (
    <g data-part="bookshelf">
      <Shadow cx={x0 + w / 2} cy={BASE_Y + 3} rx={50} />
      {/* 上面（薄い帯） */}
      <path data-part="shelf-top" d={`M${x0 + 4} ${top - 9} H${x0 + w - 4} L${x0 + w} ${top} H${x0} Z`} fill={adjust(WOOD_DARK, 0.22)} />
      <rect data-part="shelf-body" x={x0} y={top} width={w} height={BASE_Y - top} rx={3} fill={WOOD_DARK} />
      <rect data-part="shelf-back" x={x0 + 7} y={top + 8} width={w - 14} height={BASE_Y - top - 15} fill={adjust(WOOD_DARK, -0.4)} />
      {rows.map((r, i) => (
        <rect key={i} data-part={`shelf-board-${i + 1}`} x={x0 + 4} y={r.y + r.h} width={w - 8} height={8} fill={adjust(WOOD_DARK, 0.06)} />
      ))}
      {books}
      <rect x={x0} y={top} width={3} height={BASE_Y - top} fill="#ffffff" opacity={0.1} />
      <rect x={x0} y={BASE_Y - 8} width={w} height={8} rx={2} fill={adjust(WOOD_DARK, -0.15)} />
    </g>
  );
}

function Desk() {
  const x = 830;
  return (
    <g data-part="desk">
      <Shadow cx={910} cy={BASE_Y + 4} rx={86} ry={8} />
      {/* 脚（左）と引き出し（右） */}
      <rect data-part="desk-leg" x={x + 8} y={456} width={9} height={90} rx={2} fill={adjust(WOOD_LIGHT, -0.14)} />
      <rect data-part="desk-under" x={x + 17} y={456} width={104} height={90} fill="#10102c" opacity={0.28} />
      <rect data-part="desk-drawers" x={x + 118} y={456} width={40} height={88} rx={3} fill={adjust(WOOD_LIGHT, -0.06)} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect data-part={`desk-drawer-${i + 1}`} x={x + 123} y={461 + i * 28} width={30} height={24} rx={3.5} fill={adjust(WOOD_LIGHT, 0.04)} />
          <rect x={x + 134} y={471 + i * 28} width={9} height={3.6} rx={1.8} fill="#5b6cff" />
        </g>
      ))}
      {/* 天板（上面の帯と前の縁） */}
      <path data-part="desk-top-face" d={`M${x + 6} 432 H${x + 154} L${x + 160} 446 H${x} Z`} fill={adjust(WOOD_LIGHT, 0.2)} />
      <rect data-part="desk-top-edge" x={x} y={446} width={160} height={11} rx={3} fill={WOOD_LIGHT} />
      <rect x={x} y={446} width={160} height={2.6} rx={1.3} fill="#ffffff" opacity={0.3} />
    </g>
  );
}

function Laptop() {
  return (
    <g data-part="laptop">
      <ellipse cx={884} cy={380} rx={50} ry={34} fill="url(#sr-glow-blue)" opacity={0.55} />
      <rect data-part="laptop-screen-frame" x={852} y={384} width={64} height={46} rx={4} fill="#2c2f55" />
      <rect data-part="laptop-screen" x={856} y={388} width={56} height={38} rx={2} fill="url(#sr-screen)" />
      {/* 眠っている画面（月と zZ） */}
      <circle cx={873} cy={404} r={6} fill="#ffe9a8" opacity={0.85} />
      <circle cx={876} cy={402} r={5.4} fill="#3b4a8c" />
      <text x={891} y={410} fontFamily={FONT} fontSize={8.5} fontWeight={900} fill="#c7d2ff" opacity={0.8}>
        zZ
      </text>
      <rect data-part="laptop-base" x={844} y={430} width={80} height={9} rx={3} fill="#cfd2e6" />
      <rect x={849} y={432} width={70} height={3} rx={1.5} fill="#a9aed0" />
      <rect x={874} y={436} width={20} height={2} rx={1} fill="#8f94b8" />
    </g>
  );
}

function TomatoTimer() {
  return (
    <g data-part="tomato-timer">
      <ellipse cx={936} cy={441} rx={14} ry={3} fill="#1a1630" opacity={0.25} />
      <circle cx={936} cy={427} r={13.5} fill="#ff6a5c" />
      <ellipse cx={931} cy={421} rx={4} ry={6} fill="#ffffff" opacity={0.28} transform="rotate(20 931 421)" />
      <path d="M936 414 l-6 -3 4 -2 2 3 2 -3 4 2 -4 3z" fill="#4cc49d" />
      <path d="M936 427 V420 M936 427 L941 430" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" opacity={0.9} />
    </g>
  );
}

function DeskLamp() {
  return (
    <g data-part="desk-lamp">
      <ellipse cx={966} cy={442} rx={72} ry={14} fill="url(#sr-glow-warm)" opacity={0.65} />
      <ellipse cx={968} cy={439} rx={12} ry={3.2} fill="#5a4a3a" />
      <path d="M968 438 L960 408 L976 386" fill="none" stroke="#5a4a3a" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={960} cy={408} r={2.6} fill="#8a7358" />
      <circle cx={976} cy={386} r={3} fill="#8a7358" />
      <path data-part="desk-lamp-head" d="M970 378 Q980 372 990 382 L984 402 Q972 408 958 398 Z" fill="#ffcf7a" />
      <path d="M958 398 Q972 408 984 402" fill="none" stroke="#fff1c9" strokeWidth={3} strokeLinecap="round" />
      <path d="M972 380 Q980 376 986 382" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      <circle cx={971} cy={402} r={7} fill="url(#sr-glow-cream)" />
    </g>
  );
}

function Chair() {
  const x = 814;
  return (
    <g data-part="chair">
      <Shadow cx={x + 30} cy={566} rx={36} ry={6} />
      <rect data-part="chair-leg-back" x={x} y={520} width={6} height={42} rx={2} fill={adjust(WOOD, -0.18)} />
      <rect data-part="chair-leg-front" x={x + 48} y={520} width={6} height={42} rx={2} fill={WOOD} />
      <rect data-part="chair-back-post" x={x - 2} y={438} width={9} height={84} rx={4} fill={WOOD} />
      <rect data-part="chair-back-pad" x={x - 1} y={446} width={15} height={46} rx={7} fill="#ff9fb5" />
      <rect x={x + 1} y={450} width={4} height={38} rx={2} fill="#ffffff" opacity={0.28} />
      <rect data-part="chair-seat" x={x - 2} y={506} width={60} height={14} rx={6} fill="#ffb3c7" />
      <rect x={x} y={507} width={56} height={4} rx={2} fill="#ffffff" opacity={0.3} />
    </g>
  );
}

function WallShelfDesk() {
  return (
    <g data-part="desk-wall-shelf">
      {/* 小さな観葉植物 */}
      <g data-part="mini-plant">
        <path d="M880 340 H898 L896 322 H882Z" fill="#ffb3c7" />
        <path d="M889 322 Q880 306 876 298 Q886 300 889 314 Q892 300 902 296 Q898 308 889 322Z" fill="#4fae7b" />
        <path d="M889 322 Q889 304 889 296" stroke="#3f9e6c" strokeWidth={1.5} fill="none" />
      </g>
      {/* 本の山 */}
      <rect x={926} y={326} width={32} height={7} rx={1.5} fill="#7c9cff" />
      <rect x={929} y={319} width={28} height={7} rx={1.5} fill="#ffd36b" />
      <rect x={927} y={312} width={30} height={7} rx={1.5} fill="#ff8a8a" />
      <rect data-part="desk-shelf-board" x={860} y={340} width={106} height={8} rx={2.5} fill={WOOD_LIGHT} />
      <rect x={860} y={340} width={106} height={2.4} rx={1.2} fill="#ffffff" opacity={0.28} />
      <path d="M872 348 v14 l11 -14z" fill={WOOD_DARK} />
      <path d="M954 348 v14 l-11 -14z" fill={WOOD_DARK} />
    </g>
  );
}

function Calendar() {
  const cells: ReactNode[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 7; c++) {
      const n = r * 7 + c + 1;
      if (n > 30) continue;
      const cx = 998 + c * 7.4;
      const cy = 304 + r * 9.6;
      cells.push(
        n === 28 ? (
          <circle key={n} cx={cx} cy={cy} r={3.8} fill="#7c9cff" />
        ) : (
          <circle key={n} cx={cx} cy={cy} r={1.6} fill={INK} opacity={0.3} />
        ),
      );
    }
  }
  return (
    <g data-part="calendar">
      <rect x={986} y={272} width={68} height={86} rx={4} fill="#10102c" opacity={0.22} transform="translate(2 3)" />
      <rect data-part="calendar-paper" x={986} y={272} width={68} height={86} rx={4} fill="#fbf8f2" />
      <path d="M986 276 a4 4 0 0 1 4 -4 H1050 a4 4 0 0 1 4 4 V292 H986Z" fill="#ff8a8a" />
      <text x={1020} y={286.4} textAnchor="middle" fontFamily={FONT} fontSize={11} fontWeight={900} fill="#ffffff">
        11月
      </text>
      <circle cx={996} cy={273} r={2} fill="#5a4a3a" />
      <circle cx={1044} cy={273} r={2} fill="#5a4a3a" />
      {cells}
    </g>
  );
}

// ---------- げんかん ----------

function CorkBoard() {
  const notes = [
    { x: 1160, y: 288, w: 34, h: 36, c: '#ffe08c', r: -4, pin: '#ff6f9c' },
    { x: 1204, y: 292, w: 34, h: 36, c: '#ffb3c7', r: 3, pin: '#4cc49d' },
    { x: 1178, y: 336, w: 38, h: 34, c: '#a8e6cf', r: -2, pin: '#7c9cff' },
  ];
  return (
    <g data-part="cork-board">
      <rect x={1148} y={277} width={116} height={118} rx={7} fill="#10102c" opacity={0.2} transform="translate(2 4)" />
      <rect data-part="cork-frame" x={1148} y={276} width={116} height={118} rx={7} fill={WOOD} />
      <rect data-part="cork-surface" x={1154} y={282} width={104} height={106} rx={3} fill="#c9996a" />
      <rect x={1154} y={282} width={104} height={106} rx={3} fill="url(#sr-cork)" />
      {notes.map((n, i) => (
        <g key={i} data-part={`sticky-${i + 1}`} transform={`rotate(${n.r} ${n.x + n.w / 2} ${n.y + n.h / 2})`}>
          <rect x={n.x + 1} y={n.y + 2} width={n.w} height={n.h} fill="#10102c" opacity={0.18} />
          <rect x={n.x} y={n.y} width={n.w} height={n.h} fill={n.c} />
          {/* チェック前の四角と、文字の代わりの線 */}
          <rect x={n.x + 5} y={n.y + 9} width={6} height={6} rx={1.4} fill="none" stroke={INK} strokeOpacity={0.5} strokeWidth={1.3} />
          <rect x={n.x + 14} y={n.y + 10} width={n.w - 20} height={2.4} rx={1.2} fill={INK} opacity={0.3} />
          <rect x={n.x + 5} y={n.y + 21} width={6} height={6} rx={1.4} fill="none" stroke={INK} strokeOpacity={0.5} strokeWidth={1.3} />
          <rect x={n.x + 14} y={n.y + 22} width={n.w - 24} height={2.4} rx={1.2} fill={INK} opacity={0.3} />
          <circle cx={n.x + n.w / 2} cy={n.y + 3} r={2.6} fill={n.pin} />
        </g>
      ))}
    </g>
  );
}

function ShoeShelf() {
  const x0 = 1150;
  const w = 110;
  const shoe = (sx: number, sy: number, c: string, key: string, sole = '#ffffff') => (
    <g key={key} transform={`translate(${sx} ${sy})`}>
      <path d="M0 0 L0 -11 Q0 -15 5 -15 L11 -15 Q13 -9 21 -8 Q31 -7 31 0 Z" fill={c} />
      <rect x={0} y={-3} width={31} height={4} rx={2} fill={sole} />
      <path d="M13 -10 l5 2" stroke="#ffffff" strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
    </g>
  );
  return (
    <g data-part="shoe-shelf">
      <Shadow cx={x0 + w / 2} cy={BASE_Y + 3} rx={64} />
      <rect data-part="shoe-shelf-body" x={x0} y={462} width={w} height={84} rx={3} fill={adjust(WOOD, -0.06)} />
      <rect x={x0 + 6} y={470} width={w - 12} height={70} fill="#10102c" opacity={0.3} />
      <rect data-part="shoe-shelf-mid" x={x0 + 4} y={503} width={w - 8} height={6} fill={WOOD_LIGHT} />
      <rect data-part="shoe-shelf-base" x={x0 + 4} y={538} width={w - 8} height={7} fill={WOOD_LIGHT} />
      {shoe(x0 + 12, 503, '#7c9cff', 'a')}
      {shoe(x0 + 56, 503, '#ffd36b', 'b')}
      {shoe(x0 + 14, 538, '#ff8fb0', 'c', '#fff3dc')}
      {shoe(x0 + 62, 538, '#4cc49d', 'd')}
      <path data-part="shoe-shelf-top" d={`M${x0 - 3} 462 L${x0 + 4} 452 H${x0 + w - 4} L${x0 + w + 3} 462 Z`} fill={WOOD_LIGHT} />
      <rect x={x0 - 3} y={462} width={w + 6} height={7} rx={2} fill={WOOD_LIGHT} />
    </g>
  );
}

function Hooks() {
  return (
    <g data-part="hooks">
      <rect data-part="hook-rail" x={1284} y={314} width={74} height={9} rx={3.5} fill={WOOD} />
      <rect x={1284} y={314} width={74} height={2.6} rx={1.3} fill="#ffffff" opacity={0.25} />
      {[1303, 1339].map((hx) => (
        <g key={hx}>
          <circle cx={hx} cy={324} r={3.6} fill="#e9d8c4" />
          <path d={`M${hx} 326 q0 6 5 6`} fill="none" stroke="#e9d8c4" strokeWidth={2.6} strokeLinecap="round" />
        </g>
      ))}
      {/* こむぎのリード */}
      <g data-part="leash">
        <path d="M1303 324 C1296 346 1296 372 1306 388" fill="none" stroke="#ff8a8a" strokeWidth={4.4} strokeLinecap="round" />
        <path d="M1303 324 C1312 344 1312 366 1306 388" fill="none" stroke="#ff8a8a" strokeWidth={4.4} strokeLinecap="round" />
        <path d="M1306 388 Q1306 400 1314 400 Q1320 400 1319 392" fill="none" stroke="#e86a6a" strokeWidth={3} strokeLinecap="round" />
        <rect x={1313} y={386} width={9} height={7} rx={2} fill="#ffd36b" />
      </g>
      {/* マフラー */}
      <g data-part="muffler">
        <path d="M1332 322 H1346 Q1349 322 1349 326 V382 H1329 V326 Q1329 322 1332 322Z" fill="#7c9cff" />
        {[336, 352, 368].map((sy) => (
          <rect key={sy} x={1329} y={sy} width={20} height={6} fill="#fff3dc" opacity={0.9} />
        ))}
        <path d="M1329 382 h20 M1331 382 v7 M1335 382 v8 M1339 382 v7 M1343 382 v8 M1347 382 v7" stroke="#fff3dc" strokeWidth={1.6} strokeLinecap="round" />
        <rect x={1329} y={326} width={4} height={54} fill="#ffffff" opacity={0.15} />
      </g>
    </g>
  );
}

function Door() {
  return (
    <g data-part="door">
      <Shadow cx={1420} cy={FLOOR_Y + 10} rx={64} ry={7} o={0.2} />
      <rect data-part="door-frame" x={1362} y={234} width={116} height={290} rx={5} fill="#7a5a45" />
      <rect data-part="door-body" x={1370} y={242} width={100} height={282} rx={3} fill="url(#sr-door)" />
      {/* まる窓 */}
      <circle data-part="door-window-rim" cx={1420} cy={300} r={25} fill="#e9d8c4" />
      <circle data-part="door-window" cx={1420} cy={300} r={20} fill="url(#sr-sky)" />
      <circle cx={1427} cy={293} r={4.6} fill="#fff3c9" opacity={0.9} />
      <circle cx={1412} cy={308} r={1.1} fill="#fff6d6" />
      <circle cx={1432} cy={310} r={1} fill="#fff6d6" />
      <path d="M1404 292 Q1409 286 1416 285" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" opacity={0.35} />
      {/* 板の凹み */}
      <rect data-part="door-panel-1" x={1384} y={346} width={72} height={78} rx={5} fill="#000000" opacity={0.12} />
      <rect x={1386} y={348} width={68} height={74} rx={4} fill="#ffffff" opacity={0.06} />
      <rect data-part="door-panel-2" x={1384} y={438} width={72} height={76} rx={5} fill="#000000" opacity={0.12} />
      <rect x={1386} y={440} width={68} height={72} rx={4} fill="#ffffff" opacity={0.06} />
      <rect x={1370} y={242} width={4} height={282} fill="#ffffff" opacity={0.12} />
      {/* ドアノブ */}
      <circle data-part="door-knob" cx={1452} cy={432} r={6} fill="#ffd36b" />
      <circle cx={1450.4} cy={430.4} r={2} fill="#ffffff" opacity={0.65} />
      <rect x={1448} y={440} width={8} height={4} rx={2} fill="#7a5a45" opacity={0.5} />
    </g>
  );
}

function EntryMat() {
  const lines: ReactNode[] = [];
  for (let i = 0; i < 6; i++) lines.push(<line key={i} x1={1380 + i * 16} y1={556} x2={1376 + i * 17} y2={575} stroke="#ff8a8a" strokeWidth={2.4} opacity={0.55} />);
  return (
    <g data-part="entry-mat">
      <polygon points="1368,554 1474,554 1484,580 1358,580" fill="#1a1630" opacity={0.2} filter="url(#sr-blur-s)" />
      <polygon data-part="mat-body" points="1370,553 1472,553 1481,577 1361,577" fill="#e9d8c4" />
      {lines}
      <polygon points="1370,553 1472,553 1473,557 1369,557" fill="#ffffff" opacity={0.35} />
      <path d="M1361 577 h120" stroke="#c9b79c" strokeWidth={2} />
    </g>
  );
}

function UmbrellaStand() {
  return (
    <g data-part="umbrella-stand">
      <Shadow cx={1318} cy={BASE_Y + 3} rx={26} ry={5} />
      {/* かさ */}
      <g data-part="umbrella-1">
        <path d="M1308 446 H1316 V486 H1308Z" fill="#7c9cff" />
        <path d="M1312 446 V436 Q1312 428 1305 428" fill="none" stroke="#5a4a3a" strokeWidth={3} strokeLinecap="round" />
        <rect x={1308} y={448} width={3} height={36} fill="#ffffff" opacity={0.2} />
      </g>
      <g data-part="umbrella-2">
        <path d="M1322 454 H1330 V490 H1322Z" fill="#ffb3c7" />
        <path d="M1326 454 V445 Q1326 438 1333 438" fill="none" stroke="#5a4a3a" strokeWidth={3} strokeLinecap="round" />
      </g>
      <rect data-part="stand-body" x={1300} y={482} width={36} height={62} rx={9} fill="#cfd8e8" />
      <rect x={1300} y={482} width={36} height={8} rx={4} fill="#e6ecf7" />
      <rect x={1304} y={496} width={4} height={40} rx={2} fill="#ffffff" opacity={0.35} />
      <path d="M1300 510 H1336" stroke="#a9b6cf" strokeWidth={2} />
      <path d="M1300 524 H1336" stroke="#a9b6cf" strokeWidth={2} />
    </g>
  );
}

// ---------- 床に置く物 ----------

function PetBed() {
  return (
    <g data-part="pet-bed">
      <ellipse cx={310} cy={600} rx={58} ry={8} fill="#1a1630" opacity={0.3} filter="url(#sr-blur-s)" />
      <path d="M258 588 Q258 604 310 604 Q362 604 362 588Z" fill="#d98fa8" />
      <ellipse cx={310} cy={588} rx={52} ry={15} fill="#e7a9bd" />
      <ellipse cx={310} cy={586} rx={52} ry={14} fill="#f3c3d2" />
      <ellipse cx={310} cy={588} rx={39} ry={9.5} fill="#fff0e0" />
      <path d="M296 584 Q316 578 338 584 Q342 590 330 593 Q312 596 298 592 Q292 589 296 584Z" fill="#b9a3d6" />
      <path d="M304 586 Q318 583 334 587" fill="none" stroke="#e2d4f5" strokeWidth={1.8} strokeLinecap="round" opacity={0.8} />
      <path d="M268 580 Q280 574 296 573" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" opacity={0.4} />
    </g>
  );
}

function ChairRug() {
  return (
    <g data-part="chair-rug">
      <ellipse cx={841} cy={570} rx={42} ry={10} fill="#1a1630" opacity={0.22} filter="url(#sr-blur-s)" />
      <ellipse cx={841} cy={569} rx={40} ry={9.5} fill="#5fb89c" />
      <ellipse cx={841} cy={567} rx={40} ry={9.5} fill="#7fd3b8" />
      <ellipse cx={841} cy={567} rx={28} ry={6} fill="none" stroke="#e6fbf3" strokeWidth={1.6} opacity={0.7} />
    </g>
  );
}

function Wastebasket() {
  return (
    <g data-part="wastebasket">
      <Shadow cx={1020} cy={BASE_Y + 3} rx={22} ry={5} />
      <path d="M1000 512 H1040 L1035 546 Q1034 548 1031 548 H1009 Q1006 548 1005 546 Z" fill="#d8b48a" />
      {[1010, 1020, 1030].map((x) => (
        <line key={x} x1={x} y1={516} x2={x} y2={546} stroke="#9b6b4a" strokeWidth={1.4} opacity={0.45} />
      ))}
      <path d="M1002 526 H1038 M1004 538 H1036" stroke="#9b6b4a" strokeWidth={1.4} opacity={0.45} />
      <circle cx={1015} cy={510} r={5.5} fill="#fbf8f2" />
      <circle cx={1026} cy={511} r={4.5} fill="#e8e4f4" />
      <ellipse cx={1020} cy={512} rx={21} ry={3.6} fill="#c19a6e" />
      <ellipse cx={1020} cy={511} rx={21} ry={3.4} fill="none" stroke="#e9cfa8" strokeWidth={1.6} />
    </g>
  );
}

function WalkBag() {
  return (
    <g data-part="walk-bag">
      <Shadow cx={1283} cy={582} rx={22} ry={5} />
      <path d="M1273 556 Q1273 538 1283 538 Q1293 538 1293 556" fill="none" stroke="#4aa88b" strokeWidth={3} strokeLinecap="round" />
      <rect x={1266} y={552} width={34} height={30} rx={7} fill="#7fd3b8" />
      <rect x={1266} y={552} width={34} height={6} rx={3} fill="#98e0c8" />
      <circle cx={1283} cy={571} r={4.2} fill="#ffffff" opacity={0.9} />
      {[[-5.4, -5], [-1.8, -7.4], [1.8, -7.4], [5.4, -5]].map(([dx, dy], i) => (
        <circle key={i} cx={1283 + dx} cy={571 + dy} r={1.5} fill="#ffffff" opacity={0.9} />
      ))}
      <rect x={1269} y={555} width={3} height={22} rx={1.5} fill="#ffffff" opacity={0.25} />
    </g>
  );
}

// ---------- 光 ----------

function Glows() {
  return (
    <g data-part="glows" style={{ mixBlendMode: 'screen' }}>
      {/* ナイトテーブルのランプ（壁の光のたまり・床のたまり） */}
      <ellipse data-part="lamp-pool-wall" cx={72} cy={420} rx={190} ry={170} fill="url(#sr-glow-warm)" opacity={0.55} />
      <ellipse data-part="lamp-pool-core" cx={72} cy={418} rx={74} ry={66} fill="url(#sr-glow-warm)" opacity={0.7} />
      <ellipse data-part="lamp-pool-floor" cx={96} cy={566} rx={140} ry={26} fill="url(#sr-glow-warm)" opacity={0.5} />
      {/* デスクライト */}
      <ellipse data-part="desk-pool" cx={970} cy={430} rx={110} ry={90} fill="url(#sr-glow-warm)" opacity={0.3} />
      {/* ちゃのまのあたたかさ（ガーランド） */}
      <ellipse cx={567} cy={300} rx={230} ry={150} fill="url(#sr-glow-blue)" opacity={0.18} />
    </g>
  );
}

/** 帯の背景（壁・床・家具・光）。こむぎは上に重ねる */
export function SideBackdrop() {
  return (
    <svg data-part="side-backdrop" viewBox={`0 0 ${BAND_W} ${BAND_H}`} width={BAND_W} height={BAND_H} aria-hidden>
      <Defs />
      <Wall />
      <Floor />
      <MoonLight />
      {/* ねどこ */}
      <WallClock />
      <SmallFrame />
      <PlushShelf />
      <Nightstand />
      <NightLamp />
      <Bed />
      <Slippers />
      <PetBed />
      {/* ちゃのま */}
      <PhotoFrame />
      <Plant />
      <Window />
      <DecorSpot />
      <Rug />
      <Zabuton />
      <Chabudai />
      {/* つくえ */}
      <WallShelfDesk />
      <Calendar />
      <Bookshelf />
      <ChairRug />
      <Chair />
      <Desk />
      <Wastebasket />
      <Laptop />
      <TomatoTimer />
      <DeskLamp />
      {/* げんかん */}
      <CorkBoard />
      <ShoeShelf />
      <Hooks />
      <UmbrellaStand />
      <WalkBag />
      <Door />
      <EntryMat />
      {/* 全体 */}
      <Corners />
      <rect data-part="night-tint" x={0} y={0} width={BAND_W} height={BAND_H} fill={L.tint} opacity={0.55} />
      <Glows />
      <Garland />
    </svg>
  );
}
