import { describe, expect, it } from 'vitest';
import { applyEvent, energyFromSleep, FOCUS_MIN_FOR_REWARD, judgeReward, rewardFor, tick, type LifeEvent } from './life';
import { addXp, conditionOf, type PetSave } from './pet';

const base: PetSave = {
  speciesId: 'potato',
  name: 'ぽてと',
  level: 1,
  xp: 0,
  bond: 10,
  vitals: { energy: 70, fullness: 50, smarts: 10 },
  growth: { focus: 0, planning: 0, rhythm: 0 },
  asleepSince: null,
  lastTick: 0,
};
const T = new Date(2026, 10, 20, 12, 0).getTime();
const ev = (id: string, type: LifeEvent['type'], value?: number, t = T) => ({ eventId: id, type, timestamp: t, source: 'quick' as const, value });

describe('報酬', () => {
  it('同じ eventId には二度付けない', () => {
    const r = applyEvent(base, ev('a', 'meal'), []);
    expect(r.reward).toEqual({ xp: 3, coins: 1, bond: 0 });
    expect(rewardFor(ev('a', 'meal'), [r.event])).toBeNull();
  });

  it('1 日の上限を超えた記録は残るが報酬は付かない', () => {
    const log: LifeEvent[] = [];
    let pet = base;
    for (const id of ['m1', 'm2', 'm3', 'm4']) {
      const r = applyEvent(pet, ev(id, 'meal'), log);
      log.push(r.event);
      pet = r.pet;
    }
    expect(log.map((e) => e.rewardGranted)).toEqual([true, true, true, false]);
    expect(pet.vitals.fullness).toBe(100);
  });

  it('集中は 20 分未満なら報酬なし', () => {
    expect(rewardFor(ev('f1', 'focus', 15), [])).toBeNull();
    expect(rewardFor(ev('f2', 'focus', 25), [])).toEqual({ xp: 10, coins: 4, bond: 0 });
  });

  it('睡眠は長さに比例した経験値を出さない', () => {
    expect(applyEvent(base, ev('s', 'sleep', 600), []).reward).toBeNull();
  });
});

describe('報酬の判定', () => {
  it('報酬が付くときは理由が null', () => {
    expect(judgeReward(ev('f', 'focus', 25), [])).toEqual({ reward: { xp: 10, coins: 4, bond: 0 }, reason: null });
  });

  it('同じ eventId は duplicate', () => {
    const r = applyEvent(base, ev('a', 'meal'), []);
    expect(judgeReward(ev('a', 'meal'), [r.event])).toEqual({ reward: null, reason: 'duplicate' });
  });

  it('20 分未満や値なしの集中は too-short', () => {
    expect(judgeReward(ev('f1', 'focus', 10), [])).toEqual({ reward: null, reason: 'too-short' });
    expect(judgeReward(ev('f2', 'focus'), [])).toEqual({ reward: null, reason: 'too-short' });
  });

  it('1 日の上限を超えたら daily-cap', () => {
    const log: LifeEvent[] = [];
    for (const id of ['m1', 'm2', 'm3']) log.push(applyEvent(base, ev(id, 'meal'), log).event);
    expect(judgeReward(ev('m4', 'meal'), log)).toEqual({ reward: null, reason: 'daily-cap' });
  });

  it('ちょうど 20 分の集中は報酬が付く', () => {
    expect(judgeReward(ev('f20', 'focus', FOCUS_MIN_FOR_REWARD), [])).toEqual({ reward: { xp: 10, coins: 4, bond: 0 }, reason: null });
  });

  it('重複は too-short より優先される', () => {
    const short = applyEvent(base, ev('fs', 'focus', 10), []);
    expect(judgeReward(ev('fs', 'focus', 10), [short.event])).toEqual({ reward: null, reason: 'duplicate' });
  });

  it('ルール自体が報酬を出さないものは none', () => {
    expect(judgeReward(ev('s', 'sleep', 600), [])).toEqual({ reward: null, reason: 'none' });
  });

  it('applyEvent が noReward を返す', () => {
    expect(applyEvent(base, ev('f', 'focus', 10), []).noReward).toBe('too-short');
    const log: LifeEvent[] = [];
    for (const id of ['m1', 'm2', 'm3']) log.push(applyEvent(base, ev(id, 'meal'), log).event);
    expect(applyEvent(base, ev('m4', 'meal'), log).noReward).toBe('daily-cap');
    expect(applyEvent(base, ev('f2', 'focus', 25), []).noReward).toBeNull();
  });
});

describe('状態', () => {
  it('睡眠時間から元気が決まり、上下限がある', () => {
    expect(energyFromSleep(7 * 60)).toBe(88);
    expect(energyFromSleep(60)).toBe(30);
    expect(energyFromSleep(12 * 60)).toBe(100);
  });

  it('時間がたっても下限より下がらない（罰を与えない）', () => {
    const later = tick(base, 100 * 3_600_000);
    expect(later.vitals.fullness).toBe(10);
    expect(later.vitals.energy).toBe(15);
  });

  it('睡眠記録がなければ元気は不明のまま', () => {
    const p = { ...base, vitals: { ...base.vitals, energy: null } };
    expect(tick(p, 5 * 3_600_000).vitals.energy).toBeNull();
  });

  it('調子は眠り→疲れ→おなかの順で決まる', () => {
    expect(conditionOf({ ...base, asleepSince: 1 }, 12, true).mood).toBe('asleep');
    expect(conditionOf({ ...base, vitals: { energy: 20, fullness: 10, smarts: 0 } }, 12, true).mood).toBe('tired');
    expect(conditionOf({ ...base, vitals: { energy: 80, fullness: 20, smarts: 0 } }, 12, true).mood).toBe('hungry');
    expect(conditionOf({ ...base, vitals: { energy: 80, fullness: 80, smarts: 30 } }, 12, true).mood).toBe('happy');
  });
});

describe('レベル', () => {
  it('経験値があふれたら複数レベル上がる', () => {
    expect(addXp(1, 15, 40)).toEqual({ level: 3, xp: 3, leveledUp: [2, 3] });
  });
});
