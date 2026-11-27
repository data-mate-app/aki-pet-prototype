import { GRID as G, iso, PLANE, pts, WALL_H as H } from './iso';
import { WINDOW } from '../data/layout';

/** 部屋の見える範囲（1000×1000 のキャンバスから切り出す） */
export const VIEW = { x: 60, y: 6, w: 880, h: 968 };
export const VIEWBOX = `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`;
const T = 0.16; // 壁の厚み
const SLAB = 0.34; // 床の厚み

/** 部屋全体のシルエット（夜の色を重ねるときの型抜き） */
export const SILHOUETTE: [number, number, number][] = [
  [-T, -T, H],
  [-T, G, H],
  [-T, G, -SLAB],
  [G, G, -SLAB],
  [G, -T, -SLAB],
  [G, -T, H],
];

/**
 * どの画面からも使う SVG の定義。部屋が表示されていない画面（お店の一覧など）でも
 * 家具のサムネイルが影のフィルタを参照するため、アプリの根元に一度だけ置く。
 */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <defs>
        <filter id="soft-shadow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="glow-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <radialGradient id="lamp-glow">
          <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.75" />
          <stop offset="0.45" stopColor="#ffc860" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffb648" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sky-top)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sky-bottom)' }} />
        </linearGradient>
        <linearGradient id="wall-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--wall-l)' }} />
          <stop offset="1" style={{ stopColor: 'var(--wall-l)', stopOpacity: 0.92 }} />
        </linearGradient>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="rgba(37,35,64,0.05)" />
          <rect width="3" height="8" fill="rgba(37,35,64,0.16)" />
        </pattern>
      </defs>
    </svg>
  );
}

/** 床の板。gy 方向に 0.5 マスずつ、継ぎ目をずらす */
function Planks() {
  const rows = [];
  for (let i = 0; i < G * 2; i++) {
    const y0 = i * 0.5;
    rows.push(<polygon key={`p${i}`} data-part={`plank-${i + 1}`} points={pts([[0, y0, 0], [G, y0, 0], [G, y0 + 0.5, 0], [0, y0 + 0.5, 0]])} style={{ fill: i % 2 ? 'var(--floor-b)' : 'var(--floor-a)' }} />);
    const seam = ((i * 37) % 10) / 10;
    for (const [si, sx] of [0.6 + seam * 1.6, 2.6 + seam * 1.4].entries()) {
      const a = iso(sx, y0, 0);
      const b = iso(sx, y0 + 0.5, 0);
      rows.push(<line key={`s${i}-${sx}`} data-part={`plank-${i + 1}-seam-${si + 1}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(60,30,10,0.12)" strokeWidth={1.5} />);
    }
    const a = iso(0, y0, 0);
    const b = iso(G, y0, 0);
    rows.push(<line key={`l${i}`} data-part={`plank-${i + 1}-edge`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(60,30,10,0.1)" strokeWidth={1.2} />);
  }
  return <g data-part="planks">{rows}</g>;
}

function Window({ hour }: { hour: number }) {
  const { gx, w, gz, h } = WINDOW;
  const top = iso(gx, 0, gz + h);
  const W = w * 100;
  const Hh = h * 100;
  const day = hour >= 6 && hour <= 18.6;
  const t = Math.min(1, Math.max(0, (hour - 6) / 12.6));
  const sun = { x: 26 + t * (W - 52), y: Hh - 30 - Math.sin(Math.PI * t) * (Hh - 70) };
  const night = hour >= 19.3 || hour < 5.2;
  return (
    <g data-part="window" transform={`translate(${top.x} ${top.y}) ${PLANE.rightWall}`}>
      <defs>
        <clipPath id="glass">
          <rect x={10} y={10} width={W - 20} height={Hh - 20} rx={6} />
        </clipPath>
      </defs>
      {/* 枠の奥行き */}
      <rect data-part="frame-shadow" x={-6} y={-6} width={W + 12} height={Hh + 12} rx={12} fill="rgba(37,35,64,0.1)" />
      <rect data-part="frame" x={0} y={0} width={W} height={Hh} rx={10} fill="#fffdf8" />
      <g data-part="glass" clipPath="url(#glass)">
        <rect data-part="sky" x={0} y={0} width={W} height={Hh} fill="url(#sky)" />
        {night && (
          <g data-part="stars">
            {[
              [30, 30],
              [70, 64],
              [120, 26],
              [150, 80],
              [48, 104],
              [100, 120],
              [160, 40],
            ].map(([x, y], i) => (
              <circle key={i} data-part={`star-${i + 1}`} className="twinkle" style={{ animationDelay: `${i * 0.37}s` }} cx={x} cy={y} r={i % 3 ? 1.6 : 2.4} fill="#fff" />
            ))}
          </g>
        )}
        {night && (
          <g data-part="moon" transform={`translate(${W - 58} 44)`}>
            <circle data-part="moon-disc" r={17} fill="#fff6d8" />
            <circle data-part="moon-cut" cx={8} cy={-5} r={15} style={{ fill: 'var(--sky-top)' }} />
          </g>
        )}
        {day && (
          <g data-part="sun" transform={`translate(${sun.x} ${sun.y})`}>
            <circle data-part="sun-glow" r={30} fill="#fff3c4" opacity={0.35} />
            <circle data-part="sun-disc" r={17} fill={hour > 16.5 ? '#ffb27a' : '#fff1b0'} />
          </g>
        )}
        <g className="clouds" data-part="clouds" opacity={night ? 0.25 : 0.9}>
          <path data-part="cloud-1" d="M 20 120 q 10 -18 28 -10 q 10 -16 28 -4 q 18 0 16 14 Z" fill="#fff" />
          <path data-part="cloud-2" d="M 110 70 q 8 -14 22 -8 q 8 -12 22 -3 q 14 0 12 11 Z" fill="#fff" opacity={0.8} />
        </g>
      </g>
      {/* 桟 */}
      <rect data-part="mullion-vertical" x={W / 2 - 4} y={8} width={8} height={Hh - 16} fill="#fffdf8" />
      <rect data-part="mullion-horizontal" x={8} y={Hh / 2 - 3} width={W - 16} height={6} fill="#fffdf8" />
      <rect data-part="glass-edge" x={10} y={10} width={W - 20} height={Hh - 20} rx={6} fill="none" stroke="rgba(37,35,64,0.12)" strokeWidth={2} />
      {/* 窓台 */}
      <rect data-part="sill" x={-14} y={Hh - 4} width={W + 28} height={14} rx={4} fill="#f3ece2" />
      <rect data-part="sill-shadow" x={-14} y={Hh + 8} width={W + 28} height={5} rx={2} fill="rgba(37,35,64,0.12)" />
      {/* カーテン */}
      <g className="curtain-l" data-part="curtain-left">
        <path data-part="curtain-left-cloth" d={`M -26 -16 L 24 -16 Q 30 ${Hh * 0.5} 10 ${Hh + 6} L -26 ${Hh + 6} Z`} fill="#ffd7a8" />
        <path data-part="curtain-left-fold" d={`M -10 -16 Q -4 ${Hh * 0.5} -12 ${Hh + 6}`} stroke="#f2bd86" strokeWidth={4} fill="none" />
      </g>
      <g className="curtain-r" data-part="curtain-right">
        <path data-part="curtain-right-cloth" d={`M ${W + 26} -16 L ${W - 24} -16 Q ${W - 30} ${Hh * 0.5} ${W - 10} ${Hh + 6} L ${W + 26} ${Hh + 6} Z`} fill="#ffd7a8" />
        <path data-part="curtain-right-fold" d={`M ${W + 10} -16 Q ${W + 4} ${Hh * 0.5} ${W + 12} ${Hh + 6}`} stroke="#f2bd86" strokeWidth={4} fill="none" />
      </g>
      <rect data-part="curtain-rod" x={-40} y={-26} width={W + 80} height={9} rx={4.5} fill="#c9a27e" />
    </g>
  );
}

/** 窓から床へ落ちる日だまり */
function SunPatch() {
  const L = { x: 0.32, y: 1, z: 0.88 };
  const { gx, w, gz, h } = WINDOW;
  const hit = (x: number, z: number): [number, number, number] => {
    const t = z / L.z;
    return [x + L.x * t, L.y * t, 0];
  };
  const p = pts([hit(gx + 0.1, gz + 0.1), hit(gx + w - 0.1, gz + 0.1), hit(gx + w - 0.1, gz + h - 0.1), hit(gx + 0.1, gz + h - 0.1)]);
  return <polygon data-part="sun-patch" className="sun-patch" points={p} fill="#fff6d0" filter="url(#soft-shadow)" style={{ opacity: 'calc(var(--sun) * 0.42)' as unknown as number, mixBlendMode: 'soft-light' }} />;
}

/** 部屋の殻（壁・床・窓）。家具とペットはこの上に別の層で重ねる */
export function RoomShell({ hour, onFloorTap }: { hour: number; onFloorTap?: (e: React.PointerEvent<SVGPolygonElement>) => void }) {
  const wainscot = 1.1;
  return (
    <svg className="room-shell" viewBox={VIEWBOX} preserveAspectRatio="xMidYMid meet" aria-hidden>
      <g data-part="room" transform="translate(500 430)">
        {/* 床の厚み（ジオラマの台） */}
        <polygon data-part="slab-left" points={pts([[-T, G, 0], [G, G, 0], [G, G, -SLAB], [-T, G, -SLAB]])} fill="#c99a74" />
        <polygon data-part="slab-right" points={pts([[G, -T, 0], [G, G, 0], [G, G, -SLAB], [G, -T, -SLAB]])} fill="#b4835f" />
        <polygon data-part="slab-highlight" points={pts([[-T, G, -0.08], [G, G, -0.08], [G, G, -0.12], [-T, G, -0.12]])} fill="rgba(255,255,255,0.18)" />

        {/* 壁 */}
        <polygon data-part="wall-left" points={pts([[0, 0, 0], [0, G, 0], [0, G, H], [0, 0, H]])} fill="url(#wall-l)" />
        <polygon data-part="wall-right" points={pts([[0, 0, 0], [G, 0, 0], [G, 0, H], [0, 0, H]])} style={{ fill: 'var(--wall-r)' }} />
        {/* 腰壁 */}
        <polygon data-part="wainscot-left" points={pts([[0, 0, 0], [0, G, 0], [0, G, wainscot], [0, 0, wainscot]])} fill="rgba(160,120,90,0.1)" />
        <polygon data-part="wainscot-right" points={pts([[0, 0, 0], [G, 0, 0], [G, 0, wainscot], [0, 0, wainscot]])} fill="rgba(160,120,90,0.14)" />
        <polygon data-part="wainscot-rail-left" points={pts([[0, 0, wainscot], [0, G, wainscot], [0, G, wainscot + 0.06], [0, 0, wainscot + 0.06]])} fill="rgba(255,255,255,0.55)" />
        <polygon data-part="wainscot-rail-right" points={pts([[0, 0, wainscot], [G, 0, wainscot], [G, 0, wainscot + 0.06], [0, 0, wainscot + 0.06]])} fill="rgba(255,255,255,0.4)" />
        {Array.from({ length: 9 }).map((_, i) => {
          const g = 0.5 + i * 0.5;
          const a = iso(0, g, 0.14);
          const b = iso(0, g, wainscot - 0.02);
          const c = iso(g, 0, 0.14);
          const d = iso(g, 0, wainscot - 0.02);
          return (
            <g key={i} data-part={`wainscot-groove-${i + 1}`} stroke="rgba(120,80,50,0.12)" strokeWidth={1.5}>
              <line data-part={`wainscot-groove-left-${i + 1}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
              <line data-part={`wainscot-groove-right-${i + 1}`} x1={c.x} y1={c.y} x2={d.x} y2={d.y} />
            </g>
          );
        })}
        {/* 隅の陰 */}
        <polygon data-part="corner-shade" points={pts([[0, 0, 0], [0, 0.5, 0], [0, 0.5, H], [0, 0, H]])} fill="rgba(37,35,64,0.05)" />

        <Window hour={hour} />

        {/* 床 */}
        <polygon data-part="floor" points={pts([[0, 0, 0], [G, 0, 0], [G, G, 0], [0, G, 0]])} style={{ fill: 'var(--floor-a)' }} />
        <Planks />
        <polygon
          data-part="floor-hit"
          className="room-floor"
          points={pts([[0, 0, 0], [G, 0, 0], [G, G, 0], [0, G, 0]])}
          fill="transparent"
          onPointerUp={onFloorTap}
        />
        <SunPatch />
        {/* 幅木 */}
        <polygon data-part="baseboard-left" points={pts([[0, 0, 0], [0, G, 0], [0, G, 0.12], [0, 0, 0.12]])} fill="#efe6da" />
        <polygon data-part="baseboard-right" points={pts([[0, 0, 0], [G, 0, 0], [G, 0, 0.12], [0, 0, 0.12]])} fill="#e2d6c6" />
        {/* 壁と床の境の陰 */}
        <polygon data-part="floor-edge-shade" points={pts([[0, 0, 0], [G, 0, 0], [G, 0.18, 0], [0.18, 0.18, 0], [0.18, G, 0], [0, G, 0]])} fill="rgba(37,35,64,0.08)" />

        {/* 壁の厚み（切り口） */}
        <polygon data-part="wall-top-left" points={pts([[0, 0, H], [0, G, H], [-T, G, H], [-T, -T, H]])} fill="#fffaf2" />
        <polygon data-part="wall-top-right" points={pts([[0, 0, H], [G, 0, H], [G, -T, H], [-T, -T, H]])} fill="#fffaf2" />
        <polygon data-part="wall-end-left" points={pts([[0, G, -SLAB], [0, G, H], [-T, G, H], [-T, G, -SLAB]])} fill="#e9dccb" />
        <polygon data-part="wall-end-right" points={pts([[G, 0, -SLAB], [G, 0, H], [G, -T, H], [G, -T, -SLAB]])} fill="#d9c8b4" />
      </g>
    </svg>
  );
}

/** 家具の上から重ねる時間帯の色。部屋の形で型抜きする */
export function RoomTint() {
  return (
    <svg className="room-tint" viewBox={VIEWBOX} aria-hidden>
      <g data-part="room" transform="translate(500 430)">
        <polygon data-part="night-tint" points={pts(SILHOUETTE)} style={{ fill: 'var(--room-tint)' }} />
      </g>
    </svg>
  );
}
