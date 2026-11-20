import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { FurnitureArt } from '../../art/Furniture';
import { PLANE, pts } from '../../art/iso';
import { PetArt } from '../../art/Pet';
import { VIEW, VIEWBOX } from '../../art/Room';
import type { FurnitureDef } from '../../data/furniture';
import type { RoomSlot } from '../../data/layout';
import type { Action, Expression, Modulation, Pose, SpeciesDef } from '../../domain/pet';
import { spring } from '../../ui/motion';
import { isWallSlot, PET_SCALE, PET_VIEW, PIECE_VIEW, toLayer, type Pt } from './geometry';

/* ------------------------------------------------------------------ */
/* 家具 1 つ                                                            */
/* ------------------------------------------------------------------ */

export type PieceHandle = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  lift: MotionValue<number>;
  /** 置き場所へ戻る（落ちて着地する） */
  settle: (land?: boolean) => void;
};

/** 新しく部屋に出てくる家具の出どころ。fade: 上から降ってくる / false: 指で運んできた絵からそのまま引き継ぐ */
export type Spawn = { at: Pt; fade: boolean };

type PieceProps = {
  def: FurnitureDef;
  /** 描画の基準点（キャンバス座標） */
  anchor: Pt;
  facing: RoomSlot['facing'];
  depth: number;
  hour: number;
  editing: boolean;
  selected: boolean;
  dragging: boolean;
  spawn?: Spawn | null;
  /** 値が変わるたびに、ぽよんと弾む（タップ・水やりなど） */
  poke?: number;
  jiggleDelay: number;
  register: (id: string, h: PieceHandle | null) => void;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
};

/** 家具の絵を基準点 (0,0) に合わせて置く SVG。部屋の家具と、運んでいる途中の絵で共通 */
export function PieceSvg({ def, facing, hour, onPointerDown }: { def: FurnitureDef; facing: RoomSlot['facing']; hour: number; onPointerDown?: (e: React.PointerEvent) => void }) {
  const [vx, vy, vw, vh] = PIECE_VIEW[def.kind];
  const mirrored = facing === 'L';
  const art = <FurnitureArt def={def} mirrored={mirrored} hour={hour} />;
  return (
    <svg className="piece-svg" viewBox={`${vx} ${vy} ${vw} ${vh}`} width={vw} height={vh} style={{ left: vx, top: vy }} aria-hidden>
      <g className="piece-art" onPointerDown={onPointerDown}>
        {facing === 'WL' || facing === 'WR' ? (
          <g transform={facing === 'WL' ? PLANE.leftWall : PLANE.rightWall}>{art}</g>
        ) : mirrored ? (
          <g transform="scale(-1 1)">{art}</g>
        ) : (
          art
        )}
      </g>
    </svg>
  );
}

export function Piece({ def, anchor, facing, depth, hour, editing, selected, dragging, spawn, poke = 0, jiggleDelay, register, onPointerDown }: PieceProps) {
  const start = toLayer(spawn?.at ?? anchor);
  const x = useMotionValue(start.x);
  const y = useMotionValue(start.y);
  const lift = useMotionValue(spawn && !spawn.fade ? 1.1 : 1);
  const sx = useMotionValue(1);
  const sy = useMotionValue(1);
  const opacity = useMotionValue(spawn?.fade ? 0 : 1);
  const firstPoke = useRef(poke);
  useEffect(() => {
    if (poke === firstPoke.current) return;
    animate(sx, [1, 0.93, 1.05, 1], { duration: 0.46, times: [0, 0.3, 0.65, 1] });
    animate(sy, [1, 1.08, 0.96, 1], { duration: 0.46, times: [0, 0.3, 0.65, 1] });
  }, [poke, sx, sy]);
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  const scaleX = useTransform(() => lift.get() * sx.get());
  const scaleY = useTransform(() => lift.get() * sy.get());

  const settle = (land = true) => {
    const a = toLayer(anchorRef.current);
    const far = Math.hypot(x.get() - a.x, y.get() - a.y);
    animate(x, a.x, spring.snapIn);
    animate(y, a.y, far > 120 ? { type: 'spring', stiffness: 380, damping: 22 } : spring.snapIn);
    animate(lift, 1, spring.snapIn);
    animate(opacity, 1, { duration: 0.18 });
    if (land) {
      // 着地のつぶれ（横に広がって縦に縮み、すぐ戻る）
      animate(sx, [1, 1.07, 0.98, 1], { duration: 0.42, delay: far > 120 ? 0.22 : 0.08, times: [0, 0.35, 0.7, 1] });
      animate(sy, [1, 0.88, 1.03, 1], { duration: 0.42, delay: far > 120 ? 0.22 : 0.08, times: [0, 0.35, 0.7, 1] });
    }
  };

  useLayoutEffect(() => {
    register(def.id, { x, y, lift, settle });
    return () => register(def.id, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id]);

  // 置き場所が変わった・ドラッグが終わったら、基準点へ吸い付く
  useEffect(() => {
    if (dragging) return;
    const a = toLayer(anchor);
    if (Math.abs(x.get() - a.x) > 0.5 || Math.abs(y.get() - a.y) > 0.5 || opacity.get() < 1) settle(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor.x, anchor.y, dragging]);

  return (
    <motion.div
      className="piece"
      data-kind={def.kind}
      data-selected={selected}
      data-dragging={dragging}
      initial={false}
      exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.2 } }}
      style={{ x, y, opacity, zIndex: dragging ? 4000 : 1000 + Math.round(depth * 100) }}
    >
      <motion.div className="piece-lift" style={{ scaleX, scaleY }}>
        <div className="piece-jiggle" data-on={editing && !dragging} style={{ animationDelay: `${jiggleDelay}s` } as CSSProperties}>
          <PieceSvg def={def} facing={facing} hour={hour} onPointerDown={(e) => onPointerDown(e, def.id)} />
        </div>
      </motion.div>
    </motion.div>
  );
}

/** 持ち物から引き出して運んでいる途中の家具 */
export function GhostPiece({ def, facing, hour, x, y }: { def: FurnitureDef; facing: RoomSlot['facing']; hour: number; x: MotionValue<number>; y: MotionValue<number> }) {
  return (
    <motion.div className="piece" data-dragging style={{ x, y, zIndex: 4000 }}>
      <motion.div className="piece-lift" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1.1, opacity: 1 }} transition={spring.bouncy}>
        <PieceSvg def={def} facing={facing} hour={hour} />
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* ペット                                                               */
/* ------------------------------------------------------------------ */

type PetSpriteProps = {
  species: SpeciesDef;
  cx: MotionValue<number>;
  cy: MotionValue<number>;
  z: MotionValue<number>;
  pose: Pose;
  expression: Expression;
  action: Action;
  actionKey: number;
  modulation: Modulation;
  facing: 1 | -1;
  dim: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
};

export function PetSprite({ species, cx, cy, z, pose, expression, action, actionKey, modulation, facing, dim, onPointerDown }: PetSpriteProps) {
  const [vx, vy, vw, vh] = PET_VIEW;
  const x = useTransform(() => cx.get() - VIEW.x);
  const y = useTransform(() => cy.get() - VIEW.y);
  return (
    <motion.div className="pet-sprite" style={{ x, y, zIndex: z }} animate={{ opacity: dim ? 0.35 : 1 }} data-dim={dim}>
      <svg
        className="pet-svg"
        viewBox={`${vx} ${vy} ${vw} ${vh}`}
        width={vw * PET_SCALE}
        height={vh * PET_SCALE}
        style={{ left: vx * PET_SCALE, top: vy * PET_SCALE }}
        aria-hidden
      >
        <g className="pet-hit" onPointerDown={onPointerDown}>
          {/* 指が当たりやすいよう、体より少し広い透明の当たり判定 */}
          <ellipse cx={0} cy={-62} rx={74} ry={78} fill="transparent" />
          <PetArt species={species} pose={pose} expression={expression} action={action} actionKey={actionKey} modulation={modulation} facing={facing} />
        </g>
      </svg>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* 置き場所の印（もようがえ中）                                          */
/* ------------------------------------------------------------------ */

function footprint(s: RoomSlot): string {
  if (s.facing === 'WL') {
    const gz = s.gz ?? 2.5;
    return pts([
      [0, s.gy - 0.5, gz - 0.55],
      [0, s.gy + 0.5, gz - 0.55],
      [0, s.gy + 0.5, gz + 0.55],
      [0, s.gy - 0.5, gz + 0.55],
    ]);
  }
  if (s.facing === 'WR') {
    const gz = s.gz ?? 2.5;
    return pts([
      [s.gx - 0.5, 0, gz - 0.55],
      [s.gx + 0.5, 0, gz - 0.55],
      [s.gx + 0.5, 0, gz + 0.55],
      [s.gx - 0.5, 0, gz + 0.55],
    ]);
  }
  const [hw, hd] = s.kind === 'rug' ? [1.45, 1.15] : [0.48, 0.48];
  return pts([
    [s.gx - hw, s.gy - hd, 0],
    [s.gx + hw, s.gy - hd, 0],
    [s.gx + hw, s.gy + hd, 0],
    [s.gx - hw, s.gy + hd, 0],
  ]);
}

export function SlotMarkers({ slots, target, occupied, visible }: { slots: RoomSlot[]; target: string | null; occupied: Set<string>; visible: boolean }) {
  return (
    <motion.svg className="slot-markers" viewBox={VIEWBOX} width={VIEW.w} height={VIEW.h} initial={false} animate={{ opacity: visible ? 1 : 0 }} aria-hidden>
      <g transform="translate(500 430)">
        {slots.map((s) => {
          const on = s.id === target;
          return (
            <motion.polygon
              key={s.id}
              points={footprint(s)}
              className="slot-marker"
              data-on={on}
              data-wall={isWallSlot(s)}
              data-occupied={occupied.has(s.id)}
              initial={false}
              animate={{ opacity: on ? 1 : 0.75 }}
            />
          );
        })}
      </g>
    </motion.svg>
  );
}

/* ------------------------------------------------------------------ */
/* 床をタップした所の波紋                                                */
/* ------------------------------------------------------------------ */

export function Ripple({ at, onDone }: { at: Pt; onDone: () => void }) {
  const p = toLayer(at);
  return (
    <div className="ripple" style={{ left: p.x, top: p.y }}>
      {[0, 0.12].map((d) => (
        <motion.span
          key={d}
          className="ripple-ring"
          initial={{ scale: 0.2, opacity: 0.9 }}
          animate={{ scale: 1.4, opacity: 0 }}
          transition={{ duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={d ? onDone : undefined}
        />
      ))}
    </div>
  );
}
