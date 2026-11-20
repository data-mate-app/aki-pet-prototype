import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { furnitureById } from './data/furniture';
import { INITIAL_OWNED, INITIAL_PLACEMENT } from './data/layout';
import { applyEvent, tick, type ApplyResult, type LifeEvent, type LifeEventType } from './domain/life';
import type { PetSave, SpeciesId, Vitals } from './domain/pet';
import type { Placement } from './domain/room';

export type Task = { id: string; title: string; done: boolean; doneAt?: number };

export type RecordInput = {
  type: LifeEventType;
  source: LifeEvent['source'];
  value?: number | string;
  label?: string;
  timestamp?: number;
  eventId?: string;
};

type AppState = {
  onboarded: boolean;
  pet: PetSave;
  coins: number;
  owned: string[];
  placement: Placement;
  log: LifeEvent[];
  tasks: Task[];
  /** デモ用の時計のずれ（ms）。実時刻にこれを足したものを「いま」とする */
  clockOffset: number;
  sound: boolean;
  /** BGM（部屋の曲） */
  music: boolean;
  /** null は自動（夜に灯る） */
  lampOn: boolean | null;
  lastInteraction: number;
  /** もようがえの取り消し用（保存しない） */
  undo: Placement[];

  adopt: (speciesId: SpeciesId, name: string) => void;
  record: (input: RecordInput) => ApplyResult;
  goToSleep: () => void;
  /** 睡眠を記録せずに起こす（元気は分からないまま） */
  wake: () => void;
  setPlacement: (next: Placement) => void;
  undoPlacement: () => void;
  buy: (id: string) => boolean;
  addTask: (title: string) => void;
  completeTask: (id: string) => ApplyResult | null;
  removeTask: (id: string) => Task | null;
  restoreTask: (task: Task) => void;
  removeEvent: (eventId: string) => LifeEvent | null;
  restoreEvent: (event: LifeEvent) => void;
  setClockOffset: (ms: number) => void;
  refresh: () => void;
  setVitals: (v: Partial<Vitals>) => void;
  addCoins: (n: number) => void;
  setSound: (on: boolean) => void;
  setMusic: (on: boolean) => void;
  setLamp: (on: boolean | null) => void;
  touch: () => void;
  reset: () => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

export const now = (): number => Date.now() + useApp.getState().clockOffset;

export function hourOf(ms: number) {
  const d = new Date(ms);
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

const freshPet = (speciesId: SpeciesId = 'potato', name = 'ぽてと'): PetSave => ({
  speciesId,
  name,
  level: 1,
  xp: 0,
  bond: 10,
  // 睡眠の記録がまだないので元気は「不明」から始める
  vitals: { energy: null, fullness: 55, smarts: 8 },
  growth: { focus: 0, planning: 0, rhythm: 0 },
  asleepSince: null,
  lastTick: Date.now(),
});

/** 過去 6 日分の見本の記録。2 日は睡眠の記録がない（不明の見え方を確かめるため） */
function seedHistory(): LifeEvent[] {
  const out: LifeEvent[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sleeps = [412, null, 365, 448, null, 390];
  const focus = [
    [25, 40],
    [50],
    [],
    [25, 25, 30],
    [45],
    [20, 35],
  ];
  const meals = [3, 2, 2, 3, 1, 2];
  const tasks = [2, 1, 0, 3, 1, 2];
  for (let d = 6; d >= 1; d--) {
    const base = today.getTime() - d * 86_400_000;
    const i = 6 - d;
    const at = (h: number, m = 0) => base + h * 3_600_000 + m * 60_000;
    const sleep = sleeps[i];
    if (sleep) out.push({ eventId: `seed-s${d}`, type: 'sleep', timestamp: at(7, 10), source: 'furniture', value: sleep, rewardGranted: false });
    if (sleep) out.push({ eventId: `seed-c${d}`, type: 'checkin', timestamp: at(7, 12), source: 'quick', rewardGranted: true });
    const mealNames = ['onigiri', 'noodle', 'curry'];
    for (let k = 0; k < meals[i]; k++)
      out.push({ eventId: `seed-m${d}-${k}`, type: 'meal', timestamp: at(8 + k * 5, 15), source: 'furniture', value: mealNames[k], rewardGranted: true });
    focus[i].forEach((min, k) =>
      out.push({ eventId: `seed-f${d}-${k}`, type: 'focus', timestamp: at(10 + k * 3, 30), source: 'timer', value: min, rewardGranted: min >= 20 }),
    );
    for (let k = 0; k < tasks[i]; k++)
      out.push({ eventId: `seed-t${d}-${k}`, type: 'task', timestamp: at(15 + k, 0), source: 'quick', label: ['課題を提出', '英単語 20 個', '部屋の片付け'][k], rewardGranted: true });
  }
  return out;
}

const initial = () => ({
  onboarded: false,
  pet: freshPet(),
  coins: 40,
  owned: [...INITIAL_OWNED],
  placement: { ...INITIAL_PLACEMENT },
  log: seedHistory(),
  tasks: [
    { id: uid(), title: 'レポートの構成を考える', done: false },
    { id: uid(), title: '英単語を 20 個おぼえる', done: false },
    { id: uid(), title: '洗濯物をたたむ', done: false },
  ] as Task[],
  clockOffset: 0,
  sound: true,
  music: true,
  lampOn: null as boolean | null,
  lastInteraction: 0,
  undo: [] as Placement[],
});

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial(),

      adopt: (speciesId, name) => set({ onboarded: true, pet: { ...freshPet(speciesId, name), lastTick: now() } }),

      record: (input) => {
        const s = get();
        const ts = input.timestamp ?? now();
        const pet = tick(s.pet, ts);
        const r = applyEvent(
          pet,
          { eventId: input.eventId ?? `${input.type}-${uid()}`, type: input.type, timestamp: ts, source: input.source, value: input.value, label: input.label },
          s.log,
        );
        set({ pet: r.pet, coins: s.coins + (r.reward?.coins ?? 0), log: [...s.log, r.event], lastInteraction: ts });
        return r;
      },

      goToSleep: () => set((s) => ({ pet: { ...tick(s.pet, now()), asleepSince: now() } })),

      wake: () => set((s) => ({ pet: { ...tick(s.pet, now()), asleepSince: null } })),

      setPlacement: (next) => set((s) => ({ placement: next, undo: [...s.undo.slice(-19), s.placement] })),

      undoPlacement: () =>
        set((s) => {
          const prev = s.undo[s.undo.length - 1];
          if (!prev) return s;
          return { placement: prev, undo: s.undo.slice(0, -1) };
        }),

      buy: (id) => {
        const s = get();
        const def = furnitureById[id];
        if (!def || s.owned.includes(id) || s.coins < def.price) return false;
        set({ coins: s.coins - def.price, owned: [...s.owned, id] });
        return true;
      },

      addTask: (title) => set((s) => ({ tasks: [{ id: uid(), title, done: false }, ...s.tasks] })),

      completeTask: (id) => {
        const s = get();
        const task = s.tasks.find((t) => t.id === id);
        if (!task || task.done) return null;
        set({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: true, doneAt: now() } : t)) });
        // 同じタスクのやり直しで二重に報酬が出ないよう eventId をタスクに結びつける
        return get().record({ type: 'task', source: 'quick', label: task.title, eventId: `task-${id}` });
      },

      removeTask: (id) => {
        const s = get();
        const task = s.tasks.find((t) => t.id === id) ?? null;
        set({ tasks: s.tasks.filter((t) => t.id !== id) });
        return task;
      },

      restoreTask: (task) => set((s) => ({ tasks: [task, ...s.tasks.filter((t) => t.id !== task.id)] })),

      removeEvent: (eventId) => {
        const s = get();
        const ev = s.log.find((e) => e.eventId === eventId) ?? null;
        set({ log: s.log.filter((e) => e.eventId !== eventId) });
        return ev;
      },

      restoreEvent: (event) => set((s) => ({ log: [...s.log, event].sort((a, b) => a.timestamp - b.timestamp) })),

      setClockOffset: (ms) => set({ clockOffset: ms }),

      refresh: () => set((s) => ({ pet: tick(s.pet, now()) })),

      setVitals: (v) => set((s) => ({ pet: { ...s.pet, vitals: { ...s.pet.vitals, ...v }, lastTick: now() } })),

      addCoins: (n) => set((s) => ({ coins: Math.max(0, s.coins + n) })),

      setSound: (on) => set({ sound: on }),
      setMusic: (on) => set({ music: on }),

      setLamp: (on) => set({ lampOn: on }),

      touch: () => set({ lastInteraction: now() }),

      reset: () => set({ ...initial() }),
    }),
    {
      name: 'datamate-proto-v1',
      version: 1,
      partialize: ({ undo: _undo, ...rest }) => rest,
    },
  ),
);

/** 「いま」の時刻を一定間隔で読み直す */

export function useNow(intervalMs = 1000) {
  const offset = useApp((s) => s.clockOffset);
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setT(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return t + offset;
}
