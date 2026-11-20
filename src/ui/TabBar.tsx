import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { feedback } from './feedback';
import './TabBar.css';

export type TabItem<T extends string> = { id: T; label: string; icon: (active: boolean) => ReactNode };

type Props<T extends string> = {
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  hidden?: boolean;
};

/**
 * 浮かぶガラスのタブバー。
 * - 選択の印は水滴のように、進む側の縁が先に、残る側の縁が遅れて追いかける（伸びて縮む）
 * - 押したまま横へなぞると印が指についてきて、離した所のタブを開く（iOS 26 のタブバーの操作）
 */
export function TabBar<T extends string>({ tabs, active, onChange, hidden }: Props<T>) {
  const barRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [rects, setRects] = useState<{ left: number; width: number }[]>([]);
  const left = useMotionValue(0);
  const right = useMotionValue(0);
  const lift = useMotionValue(1);
  const [scrub, setScrub] = useState<number | null>(null);
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === active));
  const shown = scrub ?? activeIndex;
  const first = useRef(true);

  const measure = useCallback(() => {
    const bar = barRef.current;
    if (!bar) return;
    const b = bar.getBoundingClientRect();
    setRects(
      itemRefs.current.map((el) => {
        const r = el?.getBoundingClientRect();
        return r ? { left: r.left - b.left, width: r.width } : { left: 0, width: 0 };
      }),
    );
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (barRef.current) ro.observe(barRef.current);
    return () => ro.disconnect();
  }, [measure, tabs.length]);

  // 選択が変わったら水滴を動かす
  useEffect(() => {
    const r = rects[activeIndex];
    if (!r || scrub !== null) return;
    const L = r.left + 4;
    const R = r.left + r.width - 4;
    if (first.current) {
      left.set(L);
      right.set(R);
      first.current = false;
      return;
    }
    const goingRight = L > left.get();
    const lead = { type: 'spring' as const, stiffness: 720, damping: 42 };
    const trail = { type: 'spring' as const, stiffness: 240, damping: 26 };
    animate(left, L, goingRight ? trail : lead);
    animate(right, R, goingRight ? lead : trail);
  }, [activeIndex, rects, left, right, scrub]);

  const width = useTransform(() => right.get() - left.get());
  const base = rects[0]?.width ? rects[0].width - 8 : 80;
  // 伸びたぶん縦を少し縮めて、量が保たれているように見せる
  const squash = useTransform(() => Math.max(0.8, Math.min(1, base / Math.max(1, right.get() - left.get()))) * lift.get());
  const scaleX = useTransform(() => lift.get());

  // --- なぞって選ぶ ---
  const press = useRef<{ x: number; id: number; moved: boolean } | null>(null);

  const indexAt = (clientX: number) => {
    const bar = barRef.current?.getBoundingClientRect();
    if (!bar) return activeIndex;
    const x = clientX - bar.left;
    let best = 0;
    rects.forEach((r, i) => {
      if (Math.abs(r.left + r.width / 2 - x) < Math.abs(rects[best].left + rects[best].width / 2 - x)) best = i;
    });
    return best;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    press.current = { x: e.clientX, id: e.pointerId, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    if (!p.moved && Math.abs(e.clientX - p.x) < 10) return;
    if (!p.moved) {
      p.moved = true;
      barRef.current?.setPointerCapture(e.pointerId);
      animate(lift, 1.12, { type: 'spring', stiffness: 500, damping: 26 });
      feedback('light');
    }
    const bar = barRef.current!.getBoundingClientRect();
    const w = base;
    const cx = Math.min(bar.width - w / 2 - 4, Math.max(w / 2 + 4, e.clientX - bar.left));
    left.set(cx - w / 2);
    right.set(cx + w / 2);
    const i = indexAt(e.clientX);
    if (i !== scrub) {
      if (scrub !== null) feedback('selection', 'tick');
      setScrub(i);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    if (p.moved) {
      const i = indexAt(e.clientX);
      animate(lift, 1, { type: 'spring', stiffness: 500, damping: 30 });
      setScrub(null);
      const r = rects[i];
      const spring = { type: 'spring' as const, stiffness: 520, damping: 30 };
      animate(left, r.left + 4, spring);
      animate(right, r.left + r.width - 4, spring);
      if (tabs[i].id !== active) {
        feedback('light', 'tap');
        onChange(tabs[i].id);
      }
    }
  };

  return (
    <motion.nav
      className="tabbar-wrap"
      initial={false}
      animate={hidden ? { y: 120, opacity: 0 } : { y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      aria-label="画面の切り替え"
    >
      <div
        ref={barRef}
        className="tabbar glass"
        role="tablist"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <motion.div className="tabbar-drop" style={{ x: left, width, scaleY: squash, scaleX }} aria-hidden />
        {tabs.map((t, i) => {
          const on = i === shown;
          return (
            <button
              key={t.id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={t.id === active}
              className="tabbar-item"
              data-on={on}
              onClick={() => {
                if (press.current?.moved) return;
                if (t.id === active) return;
                feedback('light', 'tap');
                onChange(t.id);
              }}
            >
              <motion.span
                className="tabbar-icon"
                animate={on ? { scale: [1, 0.78, 1.16, 1], y: [0, 1, -2, 0] } : { scale: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                {t.icon(on)}
              </motion.span>
              <span className="tabbar-label">{t.label}</span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
