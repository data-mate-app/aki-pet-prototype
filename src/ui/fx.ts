import { create } from 'zustand';

/**
 * 画面をまたぐ演出（コインが飛んでいく、紙吹雪、レベルアップ）。
 * 座標はすべて端末の枠（.device）の左上を原点にした px。
 */
export type Point = { x: number; y: number };
export type FxTarget = 'coins' | 'xp';

export type Flight = {
  id: number;
  kind: 'coin' | 'star';
  from: Point;
  target: FxTarget;
  delay: number;
  amount: number;
};

export type Float = { id: number; text: string; at: Point; tone: 'heart' | 'xp' | 'coin' | 'plain' };

type FxState = {
  flights: Flight[];
  floats: Float[];
  /** すでに増えているが、まだ届いていない（飛んでいる）コイン */
  pendingCoins: number;
  bump: Record<FxTarget, number>;
  confetti: number;
  levelUp: number | null;
  launch: (kind: Flight['kind'], from: Point, target: FxTarget, count: number, total: number) => void;
  land: (id: number) => void;
  float: (text: string, at: Point, tone?: Float['tone']) => void;
  dropFloat: (id: number) => void;
  celebrate: () => void;
  showLevelUp: (level: number) => void;
  closeLevelUp: () => void;
};

let seq = 1;

export const useFx = create<FxState>((set) => ({
  flights: [],
  floats: [],
  pendingCoins: 0,
  bump: { coins: 0, xp: 0 },
  confetti: 0,
  levelUp: null,
  launch: (kind, from, target, count, total) => {
    const n = Math.max(1, count);
    const per = total / n;
    const flights = Array.from({ length: n }, (_, i) => ({
      id: seq++,
      kind,
      from: { x: from.x + (Math.random() - 0.5) * 30, y: from.y + (Math.random() - 0.5) * 20 },
      target,
      delay: i * 0.07,
      amount: per,
    }));
    set((s) => ({ flights: [...s.flights, ...flights], pendingCoins: s.pendingCoins + (kind === 'coin' ? total : 0) }));
  },
  land: (id) =>
    set((s) => {
      const f = s.flights.find((x) => x.id === id);
      if (!f) return s;
      return {
        flights: s.flights.filter((x) => x.id !== id),
        pendingCoins: Math.max(0, s.pendingCoins - (f.kind === 'coin' ? f.amount : 0)),
        bump: { ...s.bump, [f.target]: s.bump[f.target] + 1 },
      };
    }),
  float: (text, at, tone = 'plain') => set((s) => ({ floats: [...s.floats, { id: seq++, text, at, tone }] })),
  dropFloat: (id) => set((s) => ({ floats: s.floats.filter((f) => f.id !== id) })),
  celebrate: () => set((s) => ({ confetti: s.confetti + 1 })),
  showLevelUp: (level) => set({ levelUp: level }),
  closeLevelUp: () => set({ levelUp: null }),
}));

export function deviceRect(): DOMRect {
  const el = document.querySelector('.device');
  return el ? el.getBoundingClientRect() : new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}

/** 画面座標を端末の枠の座標へ */
export function toLocal(clientX: number, clientY: number): Point {
  const r = deviceRect();
  return { x: clientX - r.left, y: clientY - r.top };
}

export function centerOf(el: Element | null | undefined): Point {
  if (!el) {
    const r = deviceRect();
    return { x: r.width / 2, y: r.height / 2 };
  }
  const b = el.getBoundingClientRect();
  return toLocal(b.left + b.width / 2, b.top + b.height / 2);
}

export function targetPoint(target: FxTarget): Point {
  const el = document.querySelector(`[data-fx-target="${target}"]`);
  if (el) return centerOf(el);
  const r = deviceRect();
  return { x: r.width - 60, y: 70 };
}
