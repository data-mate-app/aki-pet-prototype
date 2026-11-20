import { AnimatePresence, motion, useAnimate } from 'motion/react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { feedback } from './feedback';
import { targetPoint, useFx, type Flight, type Float } from './fx';
import { Coin, Star } from './icons';
import './FxLayer.css';

function FlightView({ f }: { f: Flight }) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const land = useFx((s) => s.land);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const from = f.from;
      // 1. 出どころからはじけ出る
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const dist = 34 + Math.random() * 36;
      const p1 = { x: from.x + Math.cos(angle) * dist, y: from.y + Math.sin(angle) * dist };
      await animate(
        scope.current,
        { x: [from.x, p1.x], y: [from.y, p1.y], scale: [0.2, 1.25], opacity: [0, 1] },
        { duration: 0.32, delay: f.delay, ease: [0.2, 0.9, 0.3, 1.2] },
      );
      if (cancelled) return;
      // 2. 行き先へ吸い込まれる（加速しながら弧を描く）
      const to = targetPoint(f.target);
      const c = { x: (p1.x + to.x) / 2 + (Math.random() - 0.5) * 80, y: Math.min(p1.y, to.y) - 40 - Math.random() * 50 };
      const xs: number[] = [];
      const ys: number[] = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        xs.push((1 - t) ** 2 * p1.x + 2 * (1 - t) * t * c.x + t * t * to.x);
        ys.push((1 - t) ** 2 * p1.y + 2 * (1 - t) * t * c.y + t * t * to.y);
      }
      await animate(scope.current, { x: xs, y: ys, scale: [1.25, 1, 0.55] }, { duration: 0.5 + Math.random() * 0.12, ease: [0.55, 0, 0.9, 0.5] });
      if (cancelled) return;
      feedback('selection', f.kind === 'coin' ? 'coin' : undefined);
      land(f.id);
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={scope} className="fx-flight" style={{ opacity: 0 }}>
      {f.kind === 'coin' ? <Coin size={24} /> : <Star size={22} />}
    </div>
  );
}

function FloatView({ f }: { f: Float }) {
  const drop = useFx((s) => s.dropFloat);
  return (
    <motion.div
      className="fx-float"
      data-tone={f.tone}
      style={{ left: f.at.x, top: f.at.y }}
      initial={{ opacity: 0, y: 6, scale: 0.6 }}
      animate={{ opacity: [0, 1, 1, 0], y: [6, -18, -34, -52], scale: [0.6, 1.1, 1, 0.96] }}
      transition={{ duration: 1.35, times: [0, 0.2, 0.7, 1], ease: 'easeOut' }}
      onAnimationComplete={() => drop(f.id)}
    >
      {f.text}
    </motion.div>
  );
}

const CONFETTI_COLORS = ['#ffb648', '#ff6f9c', '#7c9cff', '#4cc49d', '#ffd36b', '#c7a3ff', '#ff8a8a'];

function Confetti({ seed }: { seed: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => {
        const r = (n: number) => {
          const x = Math.sin(seed * 999 + i * 77.7 + n * 13.1) * 10000;
          return x - Math.floor(x);
        };
        return {
          i,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          dx: (r(1) - 0.5) * 520,
          up: -(140 + r(2) * 260),
          down: 520 + r(3) * 260,
          rot: (r(4) - 0.5) * 1080,
          delay: r(5) * 0.12,
          w: 7 + r(6) * 6,
          h: 10 + r(7) * 8,
          round: r(8) > 0.7,
          dur: 1.7 + r(9) * 0.8,
        };
      }),
    [seed],
  );
  return (
    <div className="fx-confetti" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.i}
          className="cf-x"
          style={{ '--dx': `${p.dx}px`, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` } as CSSProperties}
        >
          <span
            className="cf-y"
            style={
              {
                '--up': `${p.up}px`,
                '--down': `${p.down}px`,
                '--rot': `${p.rot}deg`,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
                width: p.w,
                height: p.round ? p.w : p.h,
                borderRadius: p.round ? '50%' : 2,
                background: p.color,
              } as CSSProperties
            }
          />
        </span>
      ))}
    </div>
  );
}

/** 端末の枠いっぱいに重ねる演出の層 */
export function FxLayer() {
  const flights = useFx((s) => s.flights);
  const floats = useFx((s) => s.floats);
  const confetti = useFx((s) => s.confetti);
  const [shown, setShown] = useState<number[]>([]);

  useEffect(() => {
    if (!confetti) return;
    setShown((s) => [...s, confetti]);
    feedback('success', 'levelup');
    const t = window.setTimeout(() => setShown((s) => s.filter((x) => x !== confetti)), 2800);
    return () => window.clearTimeout(t);
  }, [confetti]);

  return (
    <div className="fx-layer" aria-hidden>
      {shown.map((k) => (
        <Confetti key={k} seed={k} />
      ))}
      {flights.map((f) => (
        <FlightView key={f.id} f={f} />
      ))}
      <AnimatePresence>
        {floats.map((f) => (
          <FloatView key={f.id} f={f} />
        ))}
      </AnimatePresence>
    </div>
  );
}
