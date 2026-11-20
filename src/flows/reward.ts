import type { ApplyResult } from '../domain/life';
import { REWARD_RULES } from '../domain/life';
import { useFx, type Point } from '../ui/fx';
import { useIsland } from '../ui/Island';
import { feedback } from '../ui/feedback';

/**
 * 記録したあとの演出をひとまとめにする。どの画面から記録しても同じ順番で返す。
 *
 *   1. 記録した場所からコインと星がはじけて、上の数字へ吸い込まれる
 *   2. 数字が届いた分だけ回る（Ticker）
 *   3. Island に「何を記録したか」と「何が増えたか」
 *   4. レベルが上がったら、コインが届いたあとに祝う
 *
 * 報酬がない（その日の上限に達した）ときも、記録は残ったことをはっきり伝える。
 */
export function celebrate(result: ApplyResult, from: Point, label?: string) {
  const fx = useFx.getState();
  const island = useIsland.getState();
  const name = label ?? REWARD_RULES[result.event.type].label;
  const r = result.reward;

  if (!r) {
    feedback('light', 'pop');
    island.show({
      title: `${name}を記録した`,
      detail: 'きょうの報酬はもう受け取りずみ。記録はちゃんと残るよ',
      tone: 'default',
      duration: 2600,
    });
    return;
  }

  feedback('success', 'chirp');
  if (r.coins > 0) fx.launch('coin', from, 'coins', Math.min(8, r.coins + 2), r.coins);
  if (r.xp > 0) fx.launch('star', { x: from.x + 10, y: from.y - 10 }, 'xp', Math.min(5, Math.ceil(r.xp / 3)), r.xp);
  if (r.bond > 0) fx.float(`♥ +${r.bond}`, { x: from.x, y: from.y - 30 }, 'heart');

  const parts = [r.xp ? `+${r.xp} XP` : null, r.coins ? `+${r.coins} コイン` : null, r.bond ? `なかよし +${r.bond}` : null].filter(Boolean);
  if (result.event.type !== 'interaction') {
    island.show({ title: `${name}を記録した`, detail: parts.join(' · '), tone: 'good', duration: 2200 });
  }

  const level = result.leveledUp[result.leveledUp.length - 1];
  if (level) {
    window.setTimeout(() => {
      useFx.getState().celebrate();
      useFx.getState().showLevelUp(level);
    }, 1100);
  }
}
