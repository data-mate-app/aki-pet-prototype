import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { PetFigure } from '../../art/Pet';
import { FOODS } from '../../data/species';
import type { Condition, PetSave, SpeciesDef } from '../../domain/pet';
import { UNLOCKS, xpToNext } from '../../domain/pet';
import { celebrate } from '../../flows/reward';
import { useApp, type Task } from '../../store';
import { BottomSheet } from '../../ui/BottomSheet';
import { centerOf } from '../../ui/fx';
import { Bar } from '../../ui/gauges';
import { IconCheck, IconPlus } from '../../ui/icons';
import { Ruler, SwipeRow } from '../../ui/inputs';
import { useIsland } from '../../ui/Island';
import { Pressable } from '../../ui/Pressable';
import { feedback } from '../../ui/feedback';

/* ------------------------------------------------------------------ */
/* ペットのくわしい様子                                                  */
/* ------------------------------------------------------------------ */

const GROWTH = [
  { key: 'focus', label: '集中力', color: 'var(--sky)', hint: '集中の記録でのびる' },
  { key: 'planning', label: '計画力', color: 'var(--berry)', hint: 'タスク完了でのびる' },
  { key: 'rhythm', label: '生活リズム', color: 'var(--sprout)', hint: '朝のチェックイン・ごはんでのびる' },
] as const;

const MOOD_LABEL: Record<Condition['mood'], string> = {
  happy: 'ごきげん',
  calm: 'おだやか',
  sleepy: 'ねむそう',
  hungry: 'おなかぺこぺこ',
  tired: 'つかれぎみ',
  bored: 'たいくつ',
  asleep: 'ねている',
};

export function PetDetailSheet({ open, onClose, pet, species, cond }: { open: boolean; onClose: () => void; pet: PetSave; species: SpeciesDef; cond: Condition }) {
  const need = xpToNext(pet.level);
  return (
    <BottomSheet open={open} onClose={onClose} detents={[0.64, 0.92]} label={`${pet.name}のようす`}>
      <div className="pd" data-sheet-scroll>
        <div className="pd-hero">
          <div className="pd-figure">
            <PetFigure
              species={species}
              pose={pet.asleepSince ? 'sleep' : 'sit'}
              expression={pet.asleepSince ? 'sleepy' : 'happy'}
              modulation={cond.modulation}
              size={132}
              props={false}
            />
          </div>
          <div>
            <div className="pd-name display">{pet.name}</div>
            <div className="pd-kind">
              {species.label}（{species.animal}）・{species.temperamentLabel}
            </div>
            <div className="pd-mood">
              いまは <b>{MOOD_LABEL[cond.mood]}</b>
            </div>
          </div>
        </div>

        <div className="pd-level card">
          <div className="pd-row">
            <span className="pd-lv">Lv {pet.level}</span>
            <span className="pd-xp num">
              {Math.round(pet.xp)} / {need} XP
            </span>
          </div>
          <Bar value={pet.xp / need} color="linear-gradient(90deg, #ffd36b, #ffb648)" height={10} />
          <div className="pd-row pd-bond">
            <span>なかよし</span>
            <span className="num">{Math.round(pet.bond)}</span>
          </div>
          <Bar value={pet.bond / 100} color="linear-gradient(90deg, #ffb3c7, #ff7aa2)" height={8} />
        </div>

        <h3 className="section-title">そだち</h3>
        <div className="card pd-growth">
          {GROWTH.map((g) => (
            <div key={g.key} className="pd-growth-row">
              <div className="pd-row">
                <span className="pd-growth-label">{g.label}</span>
                <span className="num">{Math.round(pet.growth[g.key])}</span>
              </div>
              <Bar value={pet.growth[g.key] / 100} color={g.color} height={7} />
              <div className="pd-hint">{g.hint}</div>
            </div>
          ))}
        </div>

        <h3 className="section-title">レベルでふえること</h3>
        <div className="card pd-unlocks">
          {UNLOCKS.map((u) => {
            const got = pet.level >= u.level;
            return (
              <div key={u.level} className="pd-unlock" data-got={got}>
                <span className="pd-unlock-lv num">Lv{u.level}</span>
                <div>
                  <div className="pd-unlock-title">{u.title}</div>
                  <div className="pd-hint">{u.detail}</div>
                </div>
                {got && <IconCheck size={18} />}
              </div>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* きょうのタスク                                                        */
/* ------------------------------------------------------------------ */

export function TasksSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tasks = useApp((s) => s.tasks);
  const [draft, setDraft] = useState('');
  const open_ = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    useApp.getState().addTask(title);
    feedback('light', 'pop');
    setDraft('');
  };

  const complete = (t: Task, el: HTMLElement | null) => {
    const r = useApp.getState().completeTask(t.id);
    if (r) celebrate(r, centerOf(el), `「${t.title}」`);
  };

  const remove = (t: Task) => {
    const removed = useApp.getState().removeTask(t.id);
    if (!removed) return;
    useIsland.getState().show({
      title: 'タスクを消した',
      detail: removed.title,
      action: { label: 'もとにもどす', run: () => useApp.getState().restoreTask(removed) },
      duration: 4200,
    });
  };

  return (
    <BottomSheet open={open} onClose={onClose} detents={[0.58, 0.9]} title="きょうのタスク" label="きょうのタスク">
      <div className="tasks" data-sheet-scroll>
        <form
          className="task-add"
          data-sheet-nodrag
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="やることを書く" aria-label="新しいタスク" enterKeyHint="done" />
          <Pressable className="task-add-btn" onPress={add} disabled={!draft.trim()} aria-label="タスクを足す">
            <IconPlus size={20} />
          </Pressable>
        </form>

        {open_.length === 0 && done.length === 0 && <p className="tasks-empty">やることを書くと、終わったときに一緒によろこぶよ</p>}

        <div className="task-list">
          <AnimatePresence initial={false}>
            {open_.map((t) => (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <SwipeRow onDelete={() => remove(t)}>
                  <TaskRow task={t} onComplete={complete} />
                </SwipeRow>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {done.length > 0 && (
          <>
            <h3 className="section-title">おわった</h3>
            <div className="task-list">
              {done.map((t) => (
                <motion.div key={t.id} layout className="task-row" data-done>
                  <span className="task-check" data-on>
                    <IconCheck size={16} />
                  </span>
                  <span className="task-title">{t.title}</span>
                </motion.div>
              ))}
            </div>
          </>
        )}
        <p className="tasks-note">左へスワイプで消せる。1 日 3 件まで報酬がもらえる</p>
      </div>
    </BottomSheet>
  );
}

function TaskRow({ task, onComplete }: { task: Task; onComplete: (t: Task, el: HTMLElement | null) => void }) {
  const [checking, setChecking] = useState(false);
  return (
    <div className="task-row">
      <Pressable
        className="task-check"
        data-on={checking}
        haptic={false}
        aria-label={`「${task.title}」をおわったにする`}
        onPress={() => {
          if (checking) return;
          setChecking(true);
          feedback('medium', 'snap');
          const el = document.activeElement as HTMLElement | null;
          // チェックが入る動きを見せてから下の「おわった」へ移す
          window.setTimeout(() => onComplete(task, el), 380);
        }}
      >
        <AnimatePresence>
          {checking && (
            <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 18 }}>
              <IconCheck size={16} />
            </motion.span>
          )}
        </AnimatePresence>
      </Pressable>
      <span className="task-title">{task.title}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ごはんを選ぶ                                                          */
/* ------------------------------------------------------------------ */

export function FoodSheet({ open, onClose, onPick, petName }: { open: boolean; onClose: () => void; onPick: (id: string) => void; petName: string }) {
  return (
    <BottomSheet open={open} onClose={onClose} detents={[0.42]} title="なにを食べた？" label="ごはんを記録">
      <p className="food-sub">えらぶと{petName}もいっしょに食べるよ</p>
      <div className="food-grid">
        {FOODS.map((f, i) => (
          <Pressable key={f.id} className="food-item" sound="pop" onPress={() => onPick(f.id)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.04 * i } }}>
            <span className="food-icon" aria-hidden>
              {f.icon}
            </span>
            <span>{f.label}</span>
          </Pressable>
        ))}
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* すいみんを記録する                                                    */
/* ------------------------------------------------------------------ */

export const formatSleep = (min: number) => `${Math.floor(min / 60)}時間${min % 60 ? `${min % 60}分` : ''}`;

export function SleepSheet({
  open,
  mode,
  minutes,
  onChange,
  onSave,
  onSkip,
}: {
  open: boolean;
  /** wake: いま起きた / later: あとから記録 */
  mode: 'wake' | 'later';
  minutes: number;
  onChange: (m: number) => void;
  onSave: () => void;
  onSkip: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onSkip} detents={[0.5]} label="すいみんを記録">
      <div className="sleep-sheet">
        <div className="sleep-eyebrow">{mode === 'wake' ? 'おはよう' : 'すいみん'}</div>
        <h2 className="sleep-q">どのくらい眠れた？</h2>
        <motion.div key={minutes} className="sleep-value display num" initial={{ y: 6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.16 }}>
          {formatSleep(minutes)}
        </motion.div>
        <Ruler min={60} max={720} step={15} major={4} value={minutes} onChange={onChange} format={(v) => `${v / 60}h`} />
        <p className="sleep-note">だいたいで大丈夫。元気のめやすになる</p>
        <div className="sleep-actions">
          <Pressable className="btn" data-tone="soft" onPress={onSkip}>
            記録しない
          </Pressable>
          <Pressable className="btn" data-tone="lamp" onPress={onSave} haptic={false}>
            記録する
          </Pressable>
        </div>
      </div>
    </BottomSheet>
  );
}
