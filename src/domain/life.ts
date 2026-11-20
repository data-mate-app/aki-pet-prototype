/**
 * 生活記録（LifeEvent）と、その反映。
 *
 * - 報酬（経験値・コイン）はルールで決める。AI は数値を書き換えない
 * - 報酬は eventId ごとに一度だけ。1 日の上限を超えた記録も残すが報酬は付かない
 * - 睡眠時間に比例する経験値は与えない（長く寝るほど得、にしない）
 */
import { addXp, VITAL_FLOOR, type PetSave } from './pet';

export type LifeEventType = 'checkin' | 'meal' | 'focus' | 'task' | 'reflection' | 'interaction' | 'sleep';

export type LifeEvent = {
  eventId: string;
  type: LifeEventType;
  /** ms */
  timestamp: number;
  source: 'furniture' | 'quick' | 'timer' | 'pet' | 'demo';
  /** focus: 分 / sleep: 分 / meal: 食べ物の id / task: タイトル */
  value?: number | string;
  label?: string;
  rewardGranted: boolean;
};

export type Reward = { xp: number; coins: number; bond: number };

export const REWARD_RULES: Record<LifeEventType, { reward: Reward; dailyCap: number; label: string }> = {
  checkin: { reward: { xp: 5, coins: 2, bond: 0 }, dailyCap: 1, label: '朝のチェックイン' },
  meal: { reward: { xp: 3, coins: 1, bond: 0 }, dailyCap: 3, label: 'ごはん' },
  focus: { reward: { xp: 10, coins: 4, bond: 0 }, dailyCap: 3, label: 'しゅうちゅう' },
  task: { reward: { xp: 6, coins: 2, bond: 0 }, dailyCap: 3, label: 'タスク完了' },
  reflection: { reward: { xp: 5, coins: 2, bond: 0 }, dailyCap: 1, label: '夜のふりかえり' },
  interaction: { reward: { xp: 0, coins: 0, bond: 2 }, dailyCap: 5, label: 'なでなで' },
  sleep: { reward: { xp: 0, coins: 0, bond: 0 }, dailyCap: 1, label: 'すいみん' },
};

/** 集中は 20 分以上で報酬 */
export const FOCUS_MIN_FOR_REWARD = 20;

export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function rewardFor(event: Omit<LifeEvent, 'rewardGranted'>, log: LifeEvent[]): Reward | null {
  if (log.some((e) => e.eventId === event.eventId)) return null;
  const rule = REWARD_RULES[event.type];
  if (event.type === 'focus' && (typeof event.value !== 'number' || event.value < FOCUS_MIN_FOR_REWARD)) return null;
  const today = dayKey(event.timestamp);
  const granted = log.filter((e) => e.type === event.type && e.rewardGranted && dayKey(e.timestamp) === today).length;
  if (granted >= rule.dailyCap) return null;
  const r = rule.reward;
  return r.xp || r.coins || r.bond ? r : null;
}

/** 睡眠時間（分）から起きたときの元気 */
export function energyFromSleep(minutes: number): number {
  const h = minutes / 60;
  return Math.round(Math.min(100, Math.max(30, 40 + (h - 4) * 16)));
}

/** 時間経過。起きている間だけ減り、下限で止まる */
export function tick(pet: PetSave, now: number): PetSave {
  const hours = Math.max(0, (now - pet.lastTick) / 3_600_000);
  if (hours === 0) return pet;
  const awake = pet.asleepSince === null;
  const v = pet.vitals;
  return {
    ...pet,
    lastTick: now,
    vitals: {
      energy: v.energy === null ? null : awake ? Math.max(VITAL_FLOOR.energy, v.energy - 3.5 * hours) : v.energy,
      fullness: Math.max(VITAL_FLOOR.fullness, v.fullness - (awake ? 5 : 2) * hours),
      smarts: Math.max(VITAL_FLOOR.smarts, v.smarts - 0.5 * hours),
    },
  };
}

export type ApplyResult = {
  pet: PetSave;
  event: LifeEvent;
  reward: Reward | null;
  leveledUp: number[];
};

/** 記録を反映する。報酬・状態の変化・レベルアップをまとめて返す */
export function applyEvent(pet: PetSave, input: Omit<LifeEvent, 'rewardGranted'>, log: LifeEvent[]): ApplyResult {
  const reward = rewardFor(input, log);
  const event: LifeEvent = { ...input, rewardGranted: reward !== null };
  let next: PetSave = { ...pet, vitals: { ...pet.vitals }, growth: { ...pet.growth } };

  switch (input.type) {
    case 'meal':
      next.vitals.fullness = Math.min(100, next.vitals.fullness + 35);
      next.growth.rhythm = Math.min(100, next.growth.rhythm + 1);
      break;
    case 'focus': {
      const min = typeof input.value === 'number' ? input.value : 0;
      next.vitals.smarts = Math.min(100, next.vitals.smarts + Math.round(min / 5));
      next.growth.focus = Math.min(100, next.growth.focus + Math.round(min / 15));
      break;
    }
    case 'task':
      next.vitals.smarts = Math.min(100, next.vitals.smarts + 8);
      next.growth.planning = Math.min(100, next.growth.planning + 2);
      break;
    case 'sleep': {
      const min = typeof input.value === 'number' ? input.value : 0;
      next.vitals.energy = energyFromSleep(min);
      next.asleepSince = null;
      if (min >= 360) next.growth.rhythm = Math.min(100, next.growth.rhythm + 2);
      break;
    }
    case 'checkin':
    case 'reflection':
      next.growth.rhythm = Math.min(100, next.growth.rhythm + 1);
      break;
    case 'interaction':
      break;
  }

  let leveledUp: number[] = [];
  if (reward) {
    const r = addXp(next.level, next.xp, reward.xp);
    next = { ...next, level: r.level, xp: r.xp, bond: Math.min(100, next.bond + reward.bond) };
    leveledUp = r.leveledUp;
  }
  return { pet: next, event, reward, leveledUp };
}

/** その日の要約。記録がない項目は null（不明）で返す */
export type DaySummary = {
  sleepMin: number | null;
  focusMin: number;
  meals: number;
  tasks: number;
};

export function summarize(log: LifeEvent[], day: string): DaySummary {
  const today = log.filter((e) => dayKey(e.timestamp) === day);
  const sleep = today.find((e) => e.type === 'sleep');
  return {
    sleepMin: sleep && typeof sleep.value === 'number' ? sleep.value : null,
    focusMin: today.filter((e) => e.type === 'focus').reduce((s, e) => s + (typeof e.value === 'number' ? e.value : 0), 0),
    meals: today.filter((e) => e.type === 'meal').length,
    tasks: today.filter((e) => e.type === 'task').length,
  };
}
