import type { ApplyResult } from '../domain/life';
import { FOCUS_MIN_FOR_REWARD, REWARD_RULES } from '../domain/life';
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
 * 報酬がないとき（その日の上限・集中が短い・重複など）も、記録は残ったことをはっきり伝える。
 */
export function celebrate(result: ApplyResult, from: Point, label?: string) {
  const fx = useFx.getState();
  const island = useIsland.getState();
  const name = label ?? REWARD_RULES[result.event.type].label;
  const r = result.reward;

  if (!r) {
    const noRewardDetail =
      result.noReward === 'too-short'
        ? `ごほうびは${FOCUS_MIN_FOR_REWARD}分から。記録はちゃんと残るよ`
        : result.noReward === 'daily-cap'
          ? 'きょうの報酬はもう受け取りずみ。記録はちゃんと残るよ'
          : '記録はちゃんと残るよ';
    feedback('light', 'pop');
    island.show({
      title: `${name}を記録した`,
      detail: noRewardDetail,
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
