import { animate, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import './controls.css';

/**
 * 輪のゲージ。value が null のときは「不明」として斜線で塗り、責めない言い方の
 * ラベルを出す（データがないことを 0 と同じに見せない）。
 */
export function Ring({
  value,
  color,
  size = 46,
  stroke = 6,
  children,
  track = 'rgba(37,35,64,0.09)',
}: {
  value: number | null;
  color: string;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  track?: string;
}) {
  const r = (size - stroke) / 2;
  const v = value === null ? 0 : Math.max(0, Math.min(100, value)) / 100;
  const prev = useRef(v);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (v > prev.current + 0.01) setPulse((p) => p + 1);
    prev.current = v;
  }, [v]);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={value === null ? 'url(#hatch)' : track} strokeWidth={stroke} />
        {value !== null && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            initial={false}
            animate={{ pathLength: Math.max(0.001, v) }}
            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          />
        )}
      </svg>
      {pulse > 0 && (
        <motion.span
          key={pulse}
          className="ring-pulse"
          style={{ borderColor: color }}
          initial={{ opacity: 0.8, scale: 0.9 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      )}
      <div className="ring-center">{value === null ? <span className="ring-unknown">?</span> : children}</div>
    </div>
  );
}

/** 横長のゲージ（経験値など） */
export function Bar({ value, color, height = 8 }: { value: number; color: string; height?: number }) {
  return (
    <div className="bar" style={{ height }}>
      <motion.div
        className="bar-fill"
        style={{ background: color }}
        initial={false}
        animate={{ scaleX: Math.max(0, Math.min(1, value)) }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      />
    </div>
  );
}

/**
 * 数字が回って変わる（オドメーター）。桁ごとに縦に流れる。
 */
export function Ticker({ value, className }: { value: number; className?: string }) {
  const digits = String(Math.max(0, Math.round(value))).split('');
  return (
    <span className={`ticker num ${className ?? ''}`} aria-label={String(Math.round(value))}>
      {digits.map((d, i) => (
        <Digit key={digits.length - i} d={Number(d)} />
      ))}
    </span>
  );
}

function Digit({ d }: { d: number }) {
  const y = useSpring(d, { stiffness: 260, damping: 26 });
  useEffect(() => {
    y.set(d);
  }, [d, y]);
  const pct = useTransform(y, (v) => `${-v * 10}%`);
  return (
    <span className="ticker-digit" aria-hidden>
      <motion.span className="ticker-col" style={{ y: pct }}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i}>{i}</span>
        ))}
      </motion.span>
    </span>
  );
}

/** ゆっくり数える数字（タイマーの合計など） */
export function CountUp({ value, duration = 0.8 }: { value: number; duration?: number }) {
  const mv = useMotionValue(value);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const c = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
  }, [value, duration, mv]);
  return <span className="num">{shown}</span>;
}
