import { animate, motion, useAnimate, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { feedback } from './feedback';
import { project, rubberband, spring } from './motion';
import './controls.css';

/* ------------------------------------------------------------------ */
/* 長押しで確定するボタン（購入など、取り消しにくい操作）                  */
/* ------------------------------------------------------------------ */

export function HoldButton({
  children,
  onConfirm,
  onReject,
  disabled,
  ms = 850,
  tone = 'lamp',
  hint,
}: {
  children: ReactNode;
  onConfirm: () => void;
  /** 押せない状態で押されたとき（足りない理由を見せる） */
  onReject?: () => void;
  disabled?: boolean;
  ms?: number;
  tone?: 'lamp' | 'ink';
  hint?: string;
}) {
  const progress = useMotionValue(0);
  const [scope, animateEl] = useAnimate<HTMLButtonElement>();
  const ctrl = useRef<ReturnType<typeof animate> | null>(null);
  const ticks = useRef(0);
  const done = useRef(false);
  const scaleX = useTransform(progress, [0, 1], [0, 1]);

  const start = () => {
    if (disabled) {
      feedback('error', 'error');
      animateEl(scope.current, { x: [0, -10, 9, -7, 5, -2, 0] }, { duration: 0.42 });
      onReject?.();
      return;
    }
    done.current = false;
    ticks.current = 0;
    feedback('light');
    ctrl.current?.stop();
    ctrl.current = animate(progress, 1, {
      duration: (ms / 1000) * (1 - progress.get()),
      ease: 'linear',
      onUpdate: (v) => {
        const step = Math.floor(v * 4);
        if (step > ticks.current && step < 4) {
          ticks.current = step;
          feedback('selection', 'tick');
        }
      },
      onComplete: () => {
        done.current = true;
        feedback('success', 'reward');
        animateEl(scope.current, { scale: [1, 1.06, 1] }, { duration: 0.35 });
        onConfirm();
        animate(progress, 0, { delay: 0.4, duration: 0.3 });
      },
    });
  };

  const cancel = () => {
    if (done.current) return;
    ctrl.current?.stop();
    animate(progress, 0, spring.snappy);
  };

  return (
    <motion.button
      ref={scope}
      type="button"
      className="hold"
      data-tone={tone}
      data-disabled={disabled}
      whileTap={{ scale: 0.97 }}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start();
      }}
      onKeyUp={cancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <motion.span className="hold-fill" style={{ scaleX }} aria-hidden />
      <span className="hold-label">{children}</span>
      {hint && <span className="hold-hint">{hint}</span>}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/* セグメント（iOS の UISegmentedControl）                              */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'm',
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: 's' | 'm';
}) {
  const id = useId();
  return (
    <div className="seg" data-size={size} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          className="seg-item"
          data-on={o.id === value}
          onClick={() => {
            if (o.id === value) return;
            feedback('selection', 'tick');
            onChange(o.id);
          }}
        >
          {o.id === value && <motion.span layoutId={`seg-${id}`} className="seg-thumb" transition={spring.snappy} />}
          <span className="seg-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 横にスワイプして消す行                                                */
/* ------------------------------------------------------------------ */

export function SwipeRow({
  children,
  onDelete,
  label = '消す',
}: {
  children: ReactNode;
  onDelete: () => void;
  label?: string;
}) {
  const x = useMotionValue(0);
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [gone, setGone] = useState(false);
  const REVEAL = 84;
  const actionWidth = useTransform(x, (v) => Math.max(REVEAL, -v));
  const iconScale = useTransform(x, [-30, -REVEAL], [0.4, 1]);

  const commit = () => {
    const w = ref.current?.offsetWidth ?? 360;
    feedback('medium', 'whoosh');
    animate(x, -w - 40, { type: 'spring', stiffness: 400, damping: 40 }).then(() => {
      setGone(true);
    });
  };

  return (
    <motion.div
      className="swipe"
      ref={ref}
      initial={false}
      animate={gone ? { height: 0, opacity: 0, marginBottom: 0 } : { height: 'auto', opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      onAnimationComplete={() => {
        if (gone) onDelete();
      }}
    >
      <motion.button type="button" className="swipe-action" data-armed={armed} style={{ width: actionWidth }} onClick={commit} aria-label={label}>
        <motion.span style={{ scale: iconScale }}>{label}</motion.span>
      </motion.button>
      <motion.div
        className="swipe-content"
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -400, right: 0 }}
        dragElastic={{ left: 0.1, right: 0.04 }}
        dragMomentum={false}
        onDrag={(_, info: PanInfo) => {
          const w = ref.current?.offsetWidth ?? 360;
          const next = info.offset.x < -w * 0.5;
          if (next !== armed) {
            feedback(next ? 'medium' : 'light');
            setArmed(next);
          }
        }}
        onDragEnd={(_, info: PanInfo) => {
          const w = ref.current?.offsetWidth ?? 360;
          if (info.offset.x < -w * 0.5 || info.velocity.x < -900) {
            commit();
            return;
          }
          setArmed(false);
          const open = x.get() < -REVEAL / 2 && info.velocity.x < 300;
          animate(x, open ? -REVEAL : 0, spring.snappy);
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* スライドして確定（スライドでおきる）                                   */
/* ------------------------------------------------------------------ */

export function SlideToConfirm({ label, onConfirm, icon }: { label: string; onConfirm: () => void; icon: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [max, setMax] = useState(240);
  const x = useMotionValue(0);
  const [done, setDone] = useState(false);
  const textOpacity = useTransform(x, [0, max * 0.6], [1, 0]);
  const fill = useTransform(x, (v) => v + 62);

  useLayoutEffect(() => {
    const el = track.current;
    if (el) setMax(el.offsetWidth - 62);
  }, []);

  return (
    <div className="slide" ref={track}>
      <motion.div className="slide-fill" style={{ width: fill }} />
      <motion.span className="slide-label" style={{ opacity: textOpacity }}>
        <span className="shimmer">{label}</span>
      </motion.span>
      <motion.button
        type="button"
        className="slide-knob"
        aria-label={label}
        style={{ x }}
        drag={done ? false : 'x'}
        dragConstraints={{ left: 0, right: max }}
        dragElastic={0.04}
        dragMomentum={false}
        onDragStart={() => feedback('light')}
        onDragEnd={() => {
          if (x.get() > max * 0.82) {
            setDone(true);
            animate(x, max, spring.snappy);
            feedback('success', 'chirp');
            onConfirm();
          } else {
            animate(x, 0, { type: 'spring', stiffness: 500, damping: 22 });
          }
        }}
        onClick={() => {
          // キーボード・支援技術からも押せるように（クリックで確定）
          if (x.get() < 4 && !done) {
            setDone(true);
            animate(x, max, spring.smooth);
            onConfirm();
          }
        }}
      >
        {icon}
      </motion.button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 目盛りを横に送って値を選ぶ                                             */
/* ------------------------------------------------------------------ */

export function Ruler({
  min,
  max,
  step,
  value,
  onChange,
  major,
  format,
  gap = 14,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  /** 何目盛りごとに数字を出すか */
  major: number;
  format: (v: number) => string;
  gap?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  const count = Math.round((max - min) / step);
  const indexOf = (v: number) => Math.round((v - min) / step);
  const x = useMotionValue(-indexOf(value) * gap);
  const last = useRef(indexOf(value));
  const drag = useRef<{ id: number; start: number; startX: number; samples: { t: number; x: number }[] } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.offsetWidth));
    ro.observe(el);
    setW(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // 外から値が変わったとき
  useEffect(() => {
    if (drag.current) return;
    const target = -indexOf(value) * gap;
    if (Math.abs(x.get() - target) > 1) animate(x, target, spring.smooth);
    last.current = indexOf(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(
    () =>
      x.on('change', (v) => {
        const i = Math.max(0, Math.min(count, Math.round(-v / gap)));
        if (i !== last.current) {
          last.current = i;
          feedback('selection', 'tick');
          onChange(min + i * step);
        }
      }),
    [x, count, gap, min, step, onChange],
  );

  const settle = (velocity: number) => {
    const projected = x.get() + project(velocity, 0.996);
    const i = Math.max(0, Math.min(count, Math.round(-projected / gap)));
    animate(x, -i * gap, { type: 'spring', stiffness: 260, damping: 32, velocity });
  };

  return (
    <div
      className="ruler"
      ref={ref}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={format(value)}
      tabIndex={0}
      data-sheet-nodrag
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(max, value + step));
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(min, value - step));
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        drag.current = { id: e.pointerId, start: e.clientX, startX: x.get(), samples: [{ t: performance.now(), x: e.clientX }] };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const raw = d.startX + (e.clientX - d.start);
        const lo = -count * gap;
        x.set(raw > 0 ? rubberband(raw, w) : raw < lo ? lo + rubberband(raw - lo, w) : raw);
        d.samples.push({ t: performance.now(), x: e.clientX });
        if (d.samples.length > 6) d.samples.shift();
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        const a = d.samples[0];
        const b = d.samples[d.samples.length - 1];
        const v = ((b.x - a.x) / Math.max(1, b.t - a.t)) * 1000;
        settle(v);
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      }}
      onPointerCancel={() => {
        drag.current = null;
        settle(0);
      }}
      onWheel={(e) => {
        const lo = -count * gap;
        x.set(Math.max(lo, Math.min(0, x.get() - (e.deltaX || e.deltaY) * 0.6)));
        window.clearTimeout((ref.current as unknown as { _t?: number })._t);
        (ref.current as unknown as { _t?: number })._t = window.setTimeout(() => settle(0), 120);
      }}
    >
      <motion.div className="ruler-track" style={{ x, left: w / 2 }}>
        {Array.from({ length: count + 1 }, (_, i) => {
          const isMajor = i % major === 0;
          return (
            <span key={i} className="ruler-tick" data-major={isMajor} style={{ left: i * gap }}>
              {isMajor && <span className="ruler-num num">{format(min + i * step)}</span>}
            </span>
          );
        })}
      </motion.div>
      <span className="ruler-center" aria-hidden />
      <span className="ruler-fade" aria-hidden />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* スイッチ                                                             */
/* ------------------------------------------------------------------ */

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="switch"
      data-on={on}
      onClick={() => {
        feedback('light', 'tap');
        onChange(!on);
      }}
    >
      <motion.span className="switch-knob" layout transition={spring.snappy} whileTap={{ width: 34 }} />
    </button>
  );
}
