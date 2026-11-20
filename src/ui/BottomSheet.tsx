import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { feedback } from './feedback';
import { project, rubberband, spring } from './motion';
import './BottomSheet.css';

type Props = {
  open: boolean;
  onClose: () => void;
  /** 画面の高さに対する割合。小さい順 */
  detents?: number[];
  initialDetent?: number;
  title?: ReactNode;
  accessory?: ReactNode;
  children: ReactNode;
  /** 背面を暗くする（ページシート）。false なら部屋を見ながら操作できる */
  modal?: boolean;
  /** 0（閉）〜1（最初の段）の進み具合。背面の縮小などに使う */
  progress?: MotionValue<number>;
  /** 外から段を指定したいとき（ドラッグ中に下げる等） */
  detentIndex?: number;
  onDetentChange?: (index: number) => void;
  label: string;
};

/**
 * iOS のシートを手本にした下からの面。
 * - 段（detent）へ吸着。離した指の速度を加味して行き先を決める
 * - 上端を越えて引くとゴムのように抵抗する
 * - 横スクロールの中身と縦のドラッグを方向で振り分ける
 */
export function BottomSheet({
  open,
  onClose,
  detents = [0.45, 0.88],
  initialDetent = 0,
  title,
  accessory,
  children,
  modal = true,
  progress,
  detentIndex,
  onDetentChange,
  label,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [mounted, setMounted] = useState(open);
  const y = useMotionValue(10000);
  const currentDetent = useRef(initialDetent);

  useLayoutEffect(() => {
    const el = hostRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    setHeight(el.clientHeight);
    return () => ro.disconnect();
  }, [mounted]);

  const yFor = useCallback((index: number) => height * (1 - detents[index]), [height, detents]);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  // 開閉
  useEffect(() => {
    if (!height || !mounted) return;
    if (open) {
      if (y.get() > height) y.set(height);
      currentDetent.current = initialDetent;
      animate(y, yFor(initialDetent), spring.smooth);
    } else {
      animate(y, height, { ...spring.smooth, stiffness: 380 }).then(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, height, mounted]);

  // 外からの段指定
  useEffect(() => {
    if (!open || detentIndex === undefined || !height) return;
    currentDetent.current = detentIndex;
    animate(y, yFor(detentIndex), spring.smooth);
  }, [detentIndex, open, height, yFor, y]);

  const firstY = height ? yFor(0) : 1;
  const derived = useTransform(y, (v) => (height ? Math.min(1, Math.max(0, (height - v) / (height - firstY))) : 0));
  const backdropOpacity = useTransform(derived, [0, 1], [0, 0.32]);

  useEffect(() => {
    if (!progress) return;
    return derived.on('change', (v) => progress.set(v));
  }, [derived, progress]);

  // --- ドラッグ ---
  const drag = useRef<{
    id: number;
    startY: number;
    startX: number;
    startSheet: number;
    decided: 'sheet' | 'native' | null;
    scrollEl: HTMLElement | null;
    samples: { t: number; y: number }[];
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-sheet-nodrag]')) return;
    drag.current = {
      id: e.pointerId,
      startY: e.clientY,
      startX: e.clientX,
      startSheet: y.get(),
      decided: null,
      scrollEl: (e.target as HTMLElement).closest('[data-sheet-scroll]'),
      samples: [{ t: performance.now(), y: e.clientY }],
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = e.clientY - d.startY;
    const dx = e.clientX - d.startX;
    if (!d.decided) {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        d.decided = 'native';
        return;
      }
      const atTop = currentDetent.current === detents.length - 1;
      if (d.scrollEl && (d.scrollEl.scrollTop > 0 || (atTop && dy < 0))) {
        d.decided = 'native';
        return;
      }
      d.decided = 'sheet';
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (d.decided !== 'sheet') return;
    const minY = yFor(detents.length - 1);
    const raw = d.startSheet + dy;
    y.set(raw < minY ? minY + rubberband(raw - minY, height) : raw);
    d.samples.push({ t: performance.now(), y: e.clientY });
    if (d.samples.length > 6) d.samples.shift();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.decided !== 'sheet') return;
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const dt = Math.max(1, last.t - first.t);
    const velocity = ((last.y - first.y) / dt) * 1000;
    const projected = y.get() + project(velocity, 0.99);
    const closeLine = yFor(0) + (height - yFor(0)) * 0.45;
    if (projected > closeLine || velocity > 1400) {
      feedback('light');
      onClose();
      return;
    }
    let best = 0;
    for (let i = 0; i < detents.length; i++) {
      if (Math.abs(yFor(i) - projected) < Math.abs(yFor(best) - projected)) best = i;
    }
    if (best !== currentDetent.current) feedback('selection', 'tick');
    currentDetent.current = best;
    onDetentChange?.(best);
    animate(y, yFor(best), { ...spring.smooth, velocity });
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  if (!mounted) return <div ref={hostRef} hidden />;

  return (
    <div ref={hostRef} className="sheet-host" data-modal={modal}>
      {modal && (
        <motion.button
          type="button"
          aria-label="閉じる"
          className="sheet-backdrop"
          style={{ opacity: backdropOpacity }}
          onClick={onClose}
        />
      )}
      <motion.section
        role="dialog"
        aria-label={label}
        aria-modal={modal}
        className="sheet"
        style={{ y, height }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="sheet-grabber" aria-hidden />
        {(title || accessory) && (
          <header className="sheet-header">
            <h2 className="sheet-title">{title}</h2>
            {accessory}
          </header>
        )}
        <div className="sheet-body">{children}</div>
      </motion.section>
    </div>
  );
}
