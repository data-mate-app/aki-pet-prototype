import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';
import { feedback } from './feedback';
import { spring } from './motion';
import './Island.css';

export type IslandMessage = {
  id: number;
  icon?: ReactNode;
  title: string;
  detail?: string;
  /** 押すと実行。ボタン名は動作をそのまま書く */
  action?: { label: string; run: () => void };
  tone?: 'default' | 'good' | 'alert';
  duration?: number;
};

type IslandState = {
  current: IslandMessage | null;
  queue: IslandMessage[];
  show: (m: Omit<IslandMessage, 'id'>) => void;
  dismiss: () => void;
};

let seq = 1;

export const useIsland = create<IslandState>((set, get) => ({
  current: null,
  queue: [],
  show: (m) => {
    const msg = { ...m, id: seq++ };
    if (get().current) set((s) => ({ queue: [...s.queue, msg] }));
    else set({ current: msg });
  },
  dismiss: () => {
    const [next, ...rest] = get().queue;
    set({ current: null, queue: rest });
    if (next) window.setTimeout(() => set({ current: next }), 260);
  },
}));

/**
 * 画面上部の黒いカプセルが、知らせのときだけ横と下に膨らむ。
 * Dynamic Island の「形が変わって中身が現れる」順番（形→中身）を守る。
 */
export function Island() {
  const current = useIsland((s) => s.current);
  const dismiss = useIsland((s) => s.dismiss);

  useEffect(() => {
    if (!current) return;
    feedback(current.tone === 'alert' ? 'warning' : 'light', current.tone === 'good' ? 'chirp' : 'pop');
    const t = window.setTimeout(dismiss, current.duration ?? 3200);
    return () => window.clearTimeout(t);
  }, [current, dismiss]);

  return (
    <div className="island-anchor" aria-live="polite">
      <motion.div
        className="island"
        data-tone={current?.tone ?? 'default'}
        layout
        transition={spring.bouncy}
        style={{ borderRadius: 999 }}
        onClick={current ? dismiss : undefined}
        drag={current ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.6, bottom: 0.15 }}
        onDragEnd={(_, info) => {
          if (info.offset.y < -18 || info.velocity.y < -300) dismiss();
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {current ? (
            <motion.div
              key={current.id}
              className="island-content"
              initial={{ opacity: 0, filter: 'blur(6px)', scale: 0.92 }}
              animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, transition: { delay: 0.08, duration: 0.22 } }}
              exit={{ opacity: 0, filter: 'blur(6px)', scale: 0.92, transition: { duration: 0.12 } }}
            >
              {current.icon && <span className="island-icon">{current.icon}</span>}
              <span className="island-text">
                <strong>{current.title}</strong>
                {current.detail && <small>{current.detail}</small>}
              </span>
              {current.action && (
                <button
                  type="button"
                  className="island-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    feedback('medium', 'tap');
                    current.action?.run();
                    dismiss();
                  }}
                >
                  {current.action.label}
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div key="idle" className="island-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
