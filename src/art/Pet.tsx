import { useEffect, useState, type CSSProperties } from 'react';
import type { Action, Expression, Modulation, Pose, SpeciesDef } from '../domain/pet';
import { adjust } from './iso';
import './Pet.css';

/**
 * ペットの絵とアニメーション。
 * 姿勢 × 表情 × 一回の動作 × 調子の変調 を受け取り、部品ごとに動かす。
 * 変形の基準点はすべて足元の中心 (0,0)。CSS の transform はこの点を中心に効く。
 *
 *   <g pet>            影・小物
 *     <g turn>         向き（左右）
 *       <g act>        一回の動作（ジャンプ・伸び…）。key を変えると最初から再生
 *         <g hop>      歩くときの跳ね
 *           <g posture> 立つ・座る・寝そべる
 *             しっぽ・足・<g breath>体・耳・顔</g>
 */
export type PetArtProps = {
  species: SpeciesDef;
  pose: Pose;
  expression: Expression;
  action?: Action;
  actionKey?: number;
  modulation: Modulation;
  facing?: 1 | -1;
  /** 小物（ごはん・本）を出すか */
  props?: boolean;
};

export function PetArt({
  species,
  pose,
  expression,
  action = 'none',
  actionKey = 0,
  modulation,
  facing = 1,
  props = true,
}: PetArtProps) {
  const p = species.palette;
  const blink = useBlink(species.motion.blinkEvery, pose === 'sleep');
  const sleeping = pose === 'sleep';
  const face: Expression | 'closed' =
    sleeping || action === 'yawn' ? 'closed' : action === 'eat' || action === 'celebrate' ? 'happy' : expression;

  const vars = {
    '--spd': String(Math.max(0.35, modulation.speed || 0.6)),
    '--bounce': `${species.motion.bounce * Math.max(0.3, modulation.bounce)}px`,
    '--breath': `${species.motion.breath * (sleeping ? 1.5 : 1)}s`,
    '--droop': `${modulation.earDroop * 26}deg`,
  } as CSSProperties;

  return (
    <g className="pet" data-pose={pose} data-action={action} style={vars}>
      <ellipse className="pet-shadow" cx={2} cy={3} rx={44} ry={11} />
      <g className="pet-turn" style={{ transform: `scaleX(${facing})` }}>
        <g className="pet-act" key={actionKey} data-action={action}>
          <g className="pet-hop">
            <g className="pet-posture">
              <Tail species={species} />
              <Feet color={adjust(p.body, -0.12)} />
              <g className="pet-breath">
                <Body species={species} />
                <Paws color={adjust(p.body, -0.06)} up={action === 'celebrate'} />
                <Ears species={species} />
                <g className="pet-face">
                  <Markings species={species} />
                  <Eyes kind={face} open={modulation.eyeOpen} blink={blink} line={p.line} />
                  <Mouth species={species} expression={face} action={action} />
                  <ellipse cx={-29} cy={-46} rx={8.5} ry={5} fill={p.cheek} opacity={0.55} />
                  <ellipse cx={35} cy={-46} rx={8} ry={5} fill={p.cheek} opacity={0.55} />
                </g>
              </g>
              {props && action === 'eat' && <Bowl />}
              {props && action === 'study' && <Book />}
            </g>
          </g>
        </g>
      </g>
      {sleeping && <Zzz />}
      {(expression === 'love' || action === 'celebrate') && !sleeping && <Hearts sparkle={action === 'celebrate'} />}
    </g>
  );
}

/** 単独で置くとき用（選ぶ画面・詳細・集中モード） */
export function PetFigure({ size = 160, ...rest }: PetArtProps & { size?: number }) {
  return (
    <svg viewBox="-95 -160 190 175" width={size} height={(size * 175) / 190} style={{ overflow: 'visible' }} aria-hidden>
      <PetArt {...rest} />
    </svg>
  );
}

function useBlink([min, max]: [number, number], disabled: boolean) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (disabled) return;
    let t: number;
    let off: number;
    const loop = () => {
      t = window.setTimeout(
        () => {
          setBlink(true);
          off = window.setTimeout(() => {
            setBlink(false);
            // たまに二回まばたき
            if (Math.random() < 0.18) {
              off = window.setTimeout(() => {
                setBlink(true);
                off = window.setTimeout(() => setBlink(false), 110);
              }, 140);
            }
            loop();
          }, 120);
        },
        min + Math.random() * (max - min),
      );
    };
    loop();
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(off);
    };
  }, [min, max, disabled]);
  return blink;
}

const BODY = 'M -52 0 C -63 -2 -62 -34 -57 -54 C -50 -88 -27 -106 2 -106 C 31 -106 53 -88 59 -54 C 63 -34 64 -2 52 0 Q 0 7 -52 0 Z';

function Body({ species }: { species: SpeciesDef }) {
  const p = species.palette;
  return (
    <g>
      <path d={BODY} fill={p.body} stroke={adjust(p.body, -0.22)} strokeWidth={2.4} />
      {/* つや */}
      <path d="M -34 -86 C -24 -96 -6 -100 8 -99" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.45} />
      <ellipse cx={6} cy={-24} rx={31} ry={20} fill={p.belly} opacity={0.9} />
    </g>
  );
}

function Feet({ color }: { color: string }) {
  return (
    <g>
      <ellipse className="pet-foot pet-foot-a" cx={-24} cy={-1} rx={14} ry={7.5} fill={color} />
      <ellipse className="pet-foot pet-foot-b" cx={26} cy={-1} rx={14} ry={7.5} fill={color} />
    </g>
  );
}

function Paws({ color, up }: { color: string; up: boolean }) {
  return (
    <g className="pet-paws" data-up={up}>
      <g transform="translate(-50 -36)">
        <ellipse className="pet-paw pet-paw-l" cx={0} cy={0} rx={9} ry={11} fill={color} />
      </g>
      <g transform="translate(54 -36)">
        <ellipse className="pet-paw pet-paw-r" cx={0} cy={0} rx={9} ry={11} fill={color} />
      </g>
    </g>
  );
}

function Ears({ species }: { species: SpeciesDef }) {
  const p = species.palette;
  const edge = adjust(p.body, -0.22);
  if (species.ears === 'floppy') {
    return (
      <g>
        <g transform="translate(-36 -92)">
          <g className="pet-ear pet-ear-l">
            <path d="M 4 -6 C -22 -12 -34 22 -26 42 C -20 54 -6 44 -2 26 Z" fill={p.accent} stroke={adjust(p.accent, -0.2)} strokeWidth={2} />
          </g>
        </g>
        <g transform="translate(40 -92)">
          <g className="pet-ear pet-ear-r">
            <path d="M -4 -6 C 22 -12 34 22 26 42 C 20 54 6 44 2 26 Z" fill={p.accent} stroke={adjust(p.accent, -0.2)} strokeWidth={2} />
          </g>
        </g>
      </g>
    );
  }
  if (species.ears === 'round') {
    return (
      <g>
        <g transform="translate(-36 -94)">
          <g className="pet-ear pet-ear-l">
            <circle cx={-2} cy={-6} r={17} fill={p.body} stroke={edge} strokeWidth={2.4} />
            <circle cx={-2} cy={-5} r={9} fill={p.accent} />
          </g>
        </g>
        <g transform="translate(40 -94)">
          <g className="pet-ear pet-ear-r">
            <circle cx={2} cy={-6} r={17} fill={p.body} stroke={edge} strokeWidth={2.4} />
            <circle cx={2} cy={-5} r={9} fill={p.accent} />
          </g>
        </g>
      </g>
    );
  }
  return (
    <g>
      <g transform="translate(-30 -96)">
        <g className="pet-ear pet-ear-l">
          <path d="M -16 10 L -12 -30 Q -10 -34 -6 -31 L 18 -4 Z" fill={p.body} stroke={edge} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M -10 2 L -8 -20 L 8 -4 Z" fill={p.cheek} opacity={0.7} />
        </g>
      </g>
      <g transform="translate(36 -96)">
        <g className="pet-ear pet-ear-r">
          <path d="M 16 10 L 12 -30 Q 10 -34 6 -31 L -18 -4 Z" fill={p.body} stroke={edge} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M 10 2 L 8 -20 L -8 -4 Z" fill={p.cheek} opacity={0.7} />
        </g>
      </g>
    </g>
  );
}

function Tail({ species }: { species: SpeciesDef }) {
  const p = species.palette;
  if (species.tail === 'wag') {
    return (
      <g transform="translate(-48 -24)">
        <g className="pet-tail" data-kind="wag">
          <path d="M 0 0 C -20 -4 -28 -26 -20 -38" stroke={p.accent} strokeWidth={13} strokeLinecap="round" fill="none" />
        </g>
      </g>
    );
  }
  if (species.tail === 'puff') {
    return (
      <g transform="translate(-54 -18)">
        <g className="pet-tail" data-kind="puff">
          <circle cx={-4} cy={0} r={12} fill={p.belly} stroke={adjust(p.body, -0.2)} strokeWidth={2} />
        </g>
      </g>
    );
  }
  return (
    <g transform="translate(-48 -14)">
      <g className="pet-tail" data-kind="curl">
        <path d="M 0 0 C -34 2 -40 -40 -24 -58 C -16 -66 -6 -58 -12 -50" stroke={p.body} strokeWidth={10} strokeLinecap="round" fill="none" />
        <path d="M 0 0 C -34 2 -40 -40 -24 -58 C -16 -66 -6 -58 -12 -50" stroke={p.accent} strokeWidth={10} strokeLinecap="round" fill="none" strokeDasharray="7 9" />
      </g>
    </g>
  );
}

function Markings({ species }: { species: SpeciesDef }) {
  const p = species.palette;
  if (species.id === 'potato') {
    return (
      <g stroke={p.accent} strokeWidth={4} strokeLinecap="round">
        <path d="M -6 -100 L -4 -88" />
        <path d="M 6 -101 L 6 -89" />
        <path d="M 18 -99 L 15 -88" />
        <g strokeWidth={1.6} stroke={p.line} opacity={0.5}>
          <path d="M -36 -52 L -50 -54" />
          <path d="M -36 -47 L -50 -45" />
          <path d="M 44 -52 L 58 -54" />
          <path d="M 44 -47 L 58 -45" />
        </g>
      </g>
    );
  }
  if (species.id === 'omochi') {
    return <ellipse cx={4} cy={-47} rx={15} ry={10.5} fill={p.belly} />;
  }
  return <ellipse cx={22} cy={-62} rx={13} ry={12} fill={adjust(p.body, 0.25)} opacity={0.8} />;
}

function Eyes({ kind, open, blink, line }: { kind: Expression | 'closed'; open: number; blink: boolean; line: string }) {
  const at: [number, number][] = [
    [-13, -60],
    [21, -60],
  ];
  if (kind === 'happy') {
    return (
      <g stroke={line} strokeWidth={3.6} strokeLinecap="round" fill="none">
        {at.map(([x, y]) => (
          <path key={x} d={`M ${x - 6} ${y + 2} Q ${x} ${y - 7} ${x + 6} ${y + 2}`} />
        ))}
      </g>
    );
  }
  if (kind === 'closed') {
    return (
      <g stroke={line} strokeWidth={3.2} strokeLinecap="round" fill="none">
        {at.map(([x, y]) => (
          <path key={x} d={`M ${x - 6} ${y} Q ${x} ${y + 5} ${x + 6} ${y}`} />
        ))}
      </g>
    );
  }
  if (kind === 'love') {
    return (
      <g fill="#ff5c8a">
        {at.map(([x, y]) => (
          <path key={x} d={`M ${x} ${y + 6} C ${x - 10} ${y - 1} ${x - 6} ${y - 9} ${x} ${y - 4} C ${x + 6} ${y - 9} ${x + 10} ${y - 1} ${x} ${y + 6} Z`} />
        ))}
      </g>
    );
  }
  const big = kind === 'surprised';
  const lid = kind === 'bored' ? 0.55 : kind === 'tired' ? 0.4 : kind === 'sleepy' ? 0.32 : 1;
  const scale = blink ? 0.08 : Math.max(0.08, Math.min(1, open) * lid);
  return (
    <g>
      {at.map(([x, y]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <g className="pet-eye" style={{ transform: `scaleY(${scale})` }}>
            <ellipse cx={0} cy={0} rx={big ? 6.6 : 5.6} ry={big ? 8.6 : 7.2} fill={line} />
            <circle cx={1.8} cy={-2.8} r={big ? 2.4 : 2} fill="#ffffff" />
          </g>
          {lid < 1 && !blink && <path d="M -7 -2 Q 0 -4 7 -2" stroke={line} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.8} />}
          {kind === 'focused' && <path d={x < 0 ? 'M -7 -13 L 6 -10' : 'M -6 -10 L 7 -13'} stroke={line} strokeWidth={2.8} strokeLinecap="round" />}
        </g>
      ))}
    </g>
  );
}

function Mouth({ species, expression, action }: { species: SpeciesDef; expression: Expression | 'closed'; action: Action }) {
  const line = species.palette.line;
  const nose =
    species.id === 'potato' ? (
      <path d="M 1 -54 L 7 -54 L 4 -50.5 Z" fill="#ff8fa6" stroke={line} strokeWidth={1.2} strokeLinejoin="round" />
    ) : (
      <ellipse cx={4} cy={-53} rx={4.6} ry={3.3} fill={line} />
    );
  let mouth;
  if (action === 'yawn') {
    mouth = (
      <g transform="translate(4 -42)">
        <ellipse className="pet-yawn" cx={0} cy={0} rx={6} ry={8} fill="#8a3a4a" />
      </g>
    );
  } else if (action === 'eat') {
    mouth = (
      <g transform="translate(4 -44)">
        <ellipse className="pet-chew" cx={0} cy={0} rx={5} ry={4} fill="#8a3a4a" />
      </g>
    );
  } else if (expression === 'happy' || expression === 'love') {
    mouth = (
      <g>
        <path d="M -4 -48 Q 4 -34 12 -48 Z" fill="#8a3a4a" stroke={line} strokeWidth={1.6} strokeLinejoin="round" />
        <path d="M 0 -41 Q 4 -37 8 -41" fill="#ff8fa6" />
      </g>
    );
  } else if (expression === 'surprised') {
    mouth = <ellipse cx={4} cy={-43} rx={3.6} ry={4.4} fill="#8a3a4a" />;
  } else if (expression === 'tired' || expression === 'bored' || expression === 'sleepy') {
    mouth = <path d="M -1 -45 Q 4 -47 9 -45" stroke={line} strokeWidth={2.4} strokeLinecap="round" fill="none" />;
  } else if (species.id === 'potato') {
    mouth = <path d="M -3 -47 Q 0.5 -43 4 -47 Q 7.5 -43 11 -47" stroke={line} strokeWidth={2.2} strokeLinecap="round" fill="none" />;
  } else {
    mouth = <path d="M -1 -47 Q 4 -42.5 9 -47" stroke={line} strokeWidth={2.4} strokeLinecap="round" fill="none" />;
  }
  return (
    <g>
      {nose}
      {mouth}
    </g>
  );
}

function Bowl() {
  return (
    <g className="pet-prop" transform="translate(44 -4)">
      <ellipse cx={0} cy={0} rx={20} ry={7} fill="#2a2140" opacity={0.15} />
      <path d="M -19 -14 L 19 -14 Q 16 2 0 2 Q -16 2 -19 -14 Z" fill="#ffffff" stroke="rgba(37,35,64,0.25)" strokeWidth={1.6} />
      <ellipse cx={0} cy={-14} rx={19} ry={5} fill="#ffe7bf" stroke="rgba(37,35,64,0.2)" strokeWidth={1.2} />
      <path className="pet-steam" d="M -4 -24 q -5 -6 0 -12 t 0 -12" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.8} />
    </g>
  );
}

function Book() {
  return (
    <g className="pet-prop" transform="translate(40 -30)">
      <g className="pet-book">
      <path d="M 0 0 L -22 -8 L -22 14 L 0 22 Z" fill="#7c9cff" />
      <path d="M 0 0 L 22 -8 L 22 14 L 0 22 Z" fill="#5d7df0" />
      <path d="M 0 2 L -18 -4 L -18 12 L 0 18 Z" fill="#ffffff" />
      <path d="M 0 2 L 18 -4 L 18 12 L 0 18 Z" fill="#f2f4ff" />
      <path d="M -14 2 L -4 6 M -14 7 L -4 11" stroke="#b8c4ee" strokeWidth={1.5} />
      </g>
    </g>
  );
}

function Zzz() {
  return (
    <g className="pet-zzz" fontFamily="var(--font-display)" fill="#ffffff" stroke="#3b3a6a" strokeWidth={1.2} paintOrder="stroke">
      <text x={30} y={-90} fontSize={20}>
        z
      </text>
      <text x={30} y={-90} fontSize={26}>
        z
      </text>
      <text x={30} y={-90} fontSize={32}>
        Z
      </text>
    </g>
  );
}

function Hearts({ sparkle }: { sparkle: boolean }) {
  const heart = 'M 0 6 C -10 -1 -6 -9 0 -4 C 6 -9 10 -1 0 6 Z';
  return (
    <g className="pet-hearts">
      {[
        { x: -40, d: 0 },
        { x: 44, d: 0.35 },
        { x: 4, d: 0.7 },
      ].map((h, i) => (
        <g key={i} transform={`translate(${h.x} -96)`}>
          <path
            className="pet-heart"
            style={{ animationDelay: `${h.d}s` }}
            d={sparkle ? 'M 0 -10 L 3 -3 L 10 0 L 3 3 L 0 10 L -3 3 L -10 0 L -3 -3 Z' : heart}
            fill={sparkle ? '#ffd36b' : '#ff6f9c'}
          />
        </g>
      ))}
    </g>
  );
}
