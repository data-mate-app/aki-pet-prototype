import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';
import { PetFigure } from '../art/Pet';
import { foodById, speciesById } from '../data/species';
import { dayKey, FOCUS_MIN_FOR_REWARD, REWARD_RULES, summarize, type LifeEvent } from '../domain/life';
import { now, useApp, useNow } from '../store';
import { feedback } from '../ui/feedback';
import { CountUp } from '../ui/gauges';
import { useIsland } from '../ui/Island';
import { Segmented, SwipeRow } from '../ui/inputs';
import { spring } from '../ui/motion';
import { Pressable } from '../ui/Pressable';
import './Records.css';

type Range = 'today' | 'week';
type Metric = 'sleep' | 'focus';

const DAY = 86_400_000;
const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'];
const MODULATION = { speed: 1, bounce: 1, earDroop: 0, eyeOpen: 1, idleExpression: 'happy' } as const;

const hm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const sleepText = (min: number) => `${Math.floor(min / 60)}時間${String(min % 60).padStart(2, '0')}分`;

function describe(ev: LifeEvent): { icon: string; name: string } {
  switch (ev.type) {
    case 'meal': {
      const f = typeof ev.value === 'string' ? foodById[ev.value] : undefined;
      return { icon: f?.icon ?? '🍽️', name: f?.label ?? REWARD_RULES.meal.label };
    }
    case 'focus':
      return { icon: '⏱️', name: `しゅうちゅう ${typeof ev.value === 'number' ? ev.value : 0}分` };
    case 'task':
      return { icon: '✅', name: ev.label ?? REWARD_RULES.task.label };
    case 'sleep':
      return { icon: '🌙', name: typeof ev.value === 'number' ? `すいみん ${sleepText(ev.value)}` : 'すいみん' };
    case 'checkin':
      return { icon: '☀️', name: REWARD_RULES.checkin.label };
    case 'reflection':
      return { icon: '📝', name: REWARD_RULES.reflection.label };
    default:
      return { icon: '🐾', name: REWARD_RULES[ev.type].label };
  }
}

export function RecordsScreen() {
  const [range, setRange] = useState<Range>('today');
  const [dir, setDir] = useState(1);
  const reduce = useReducedMotion();

  const change = (r: Range) => {
    setDir(r === 'week' ? 1 : -1);
    setRange(r);
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h1 className="screen-title">きろく</h1>
          <p className="screen-sub">{range === 'today' ? 'きょうの できごと' : 'この 1週間'}</p>
        </div>
      </div>
      <Segmented
        options={[
          { id: 'today' as Range, label: 'きょう' },
          { id: 'week' as Range, label: '1週間' },
        ]}
        value={range}
        onChange={change}
      />
      <div className="rec-stage">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={range}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: reduce ? 0 : d * 56, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: reduce ? 0 : d * -56, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ ...spring.smooth, opacity: { duration: 0.18 } }}
          >
            {range === 'today' ? <TodayView /> : <WeekView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------- きょう ---------------- */

function TodayView() {
  const log = useApp((s) => s.log);
  const removeEvent = useApp((s) => s.removeEvent);
  const restoreEvent = useApp((s) => s.restoreEvent);
  const t = useNow(30_000);
  const today = dayKey(t);
  const sum = useMemo(() => summarize(log, today), [log, today]);
  const events = useMemo(
    () => log.filter((e) => dayKey(e.timestamp) === today && e.type !== 'interaction').sort((a, b) => b.timestamp - a.timestamp),
    [log, today],
  );

  const del = (ev: LifeEvent) => {
    const removed = removeEvent(ev.eventId);
    useIsland.getState().show({
      icon: '🗑️',
      title: '記録を消した',
      detail: describe(ev).name,
      action: { label: 'もとにもどす', run: () => restoreEvent(removed ?? ev) },
    });
  };

  return (
    <>
      <div className="rec-tiles">
        <div className="rec-tile" data-unknown={sum.sleepMin === null}>
          <span className="rec-tile-label">すいみん</span>
          {sum.sleepMin === null ? (
            <>
              <span className="rec-tile-value rec-unknown-word">不明</span>
              <span className="rec-tile-note">ベッドで記録できる</span>
            </>
          ) : (
            <span className="rec-tile-value">
              <CountUp value={Math.floor(sum.sleepMin / 60)} />
              <small>時間</small>
              <CountUp value={sum.sleepMin % 60} />
              <small>分</small>
            </span>
          )}
        </div>
        <Tile label="しゅうちゅう" value={sum.focusMin} unit="分" />
        <Tile label="ごはん" value={sum.meals} unit="回" />
        <Tile label="タスク" value={sum.tasks} unit="件" />
      </div>

      <div className="section-title">きょうの きろく</div>
      {events.length === 0 ? (
        <div className="card rec-empty">
          <span className="rec-empty-icon" aria-hidden>
            🌱
          </span>
          <p>まだ記録がないよ。ホームの家具をタップすると記録できる</p>
        </div>
      ) : (
        <div className="rec-list">
          {events.map((ev, i) => {
            const d = describe(ev);
            return (
              <motion.div
                key={ev.eventId}
                className="rec-item"
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.smooth, delay: Math.min(i, 10) * 0.05 }}
              >
                <SwipeRow label="消す" onDelete={() => del(ev)}>
                  <div className="card list-row rec-row">
                    <span className="rec-icon" aria-hidden>
                      {d.icon}
                    </span>
                    <span className="rec-name">{d.name}</span>
                    {ev.rewardGranted && (
                      <span className="rec-badge" title="ごほうびをもらった" aria-label="ごほうびをもらった">
                        ★
                      </span>
                    )}
                    <span className="rec-time num">{hm(ev.timestamp)}</span>
                  </div>
                </SwipeRow>
              </motion.div>
            );
          })}
        </div>
      )}
      {events.length > 0 && <p className="rec-hint">左へスワイプすると記録を消せる</p>}
    </>
  );
}

function Tile({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rec-tile">
      <span className="rec-tile-label">{label}</span>
      <span className="rec-tile-value">
        <CountUp value={value} />
        <small>{unit}</small>
      </span>
    </div>
  );
}

/* ---------------- 1週間 ---------------- */

type Day = { key: string; label: string; sleepMin: number | null; focusMin: number; isToday: boolean };

function WeekView() {
  const log = useApp((s) => s.log);
  const pet = useApp((s) => s.pet);
  const t = useNow(60_000);
  const [metric, setMetric] = useState<Metric>('sleep');
  const [sel, setSel] = useState(6);
  const reduce = useReducedMotion();

  const days: Day[] = useMemo(() => {
    const base = now();
    return Array.from({ length: 7 }, (_, i) => {
      const ms = base - (6 - i) * DAY;
      const key = dayKey(ms);
      const s = summarize(log, key);
      return { key, label: i === 6 ? 'きょう' : WEEKDAY[new Date(ms).getDay()], sleepMin: s.sleepMin, focusMin: s.focusMin, isToday: i === 6 };
    });
    // t が変わると日付をまたいだ可能性があるので作り直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log, t]);

  const max = metric === 'sleep' ? Math.max(600, ...days.map((d) => d.sleepMin ?? 0)) : Math.max(60, ...days.map((d) => d.focusMin));
  const CHART_H = 150;
  const valueText = (d: Day) =>
    metric === 'sleep' ? (d.sleepMin === null ? '不明' : sleepText(d.sleepMin)) : `${d.focusMin}分`;

  const focusDays = days.filter((d) => d.focusMin >= FOCUS_MIN_FOR_REWARD).length;
  const sleepKnown = days.filter((d) => d.sleepMin !== null).length;
  const diary =
    focusDays > 0
      ? `こんしゅうは ${focusDays} 日、${FOCUS_MIN_FOR_REWARD}分以上しゅうちゅうできたね`
      : 'こんしゅうは のんびりだったね。ぼくは となりに いるよ';
  const diary2 =
    sleepKnown === 0
      ? 'ねむった時間は まだ わからないよ'
      : sleepKnown === 7
        ? 'ねむった時間も ぜんぶ わかったよ'
        : `ねむった時間は ${sleepKnown} 日ぶん わかったよ`;

  return (
    <>
      <div className="rec-chips" role="radiogroup" aria-label="ひょうじする きろく">
        {(
          [
            ['sleep', 'すいみん（時間）'],
            ['focus', 'しゅうちゅう（分）'],
          ] as [Metric, string][]
        ).map(([id, label]) => (
          <Pressable
            key={id}
            className="rec-chip"
            role="radio"
            aria-checked={metric === id}
            data-on={metric === id}
            haptic="selection"
            sound="tick"
            onPress={() => setMetric(id)}
          >
            {label}
          </Pressable>
        ))}
      </div>

      <div className="card rec-chart" style={{ ['--chart-h' as string]: `${CHART_H}px` }}>
        <div className="rec-cols">
          {days.map((d, i) => {
            const val = metric === 'sleep' ? d.sleepMin : d.focusMin;
            const unknown = val === null;
            const h = unknown ? 40 : Math.max(5, (val / max) * CHART_H);
            const on = sel === i;
            return (
              <button
                key={d.key}
                type="button"
                className="rec-col"
                data-on={on}
                aria-pressed={on}
                aria-label={`${d.label} ${valueText(d)}`}
                onClick={() => {
                  if (!on) feedback('selection', 'tick');
                  setSel(i);
                }}
              >
                {on && <motion.span layoutId="rec-col-bg" className="rec-col-bg" transition={spring.snappy} />}
                <span className="rec-bubble-slot">
                  {on && (
                    <motion.span layoutId="rec-bubble" className="rec-bubble" transition={spring.snappy}>
                      <span className="num">{valueText(d)}</span>
                    </motion.span>
                  )}
                </span>
                <span className="rec-bar-area">
                  <motion.span
                    className="rec-bar"
                    data-unknown={unknown}
                    data-on={on}
                    initial={{ height: 0 }}
                    animate={{ height: h }}
                    transition={reduce ? { duration: 0 } : { ...spring.smooth, delay: i * 0.06 }}
                  >
                    {unknown && <span className="rec-bar-unknown">不明</span>}
                  </motion.span>
                </span>
                <span className="rec-day" data-today={d.isToday}>
                  {d.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="section-title">ペットの にっき</div>
      <motion.div
        className="card rec-diary"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.smooth, delay: 0.3 }}
      >
        <div className="rec-diary-pet">
          <PetFigure size={72} species={speciesById[pet.speciesId]} pose="sit" expression="happy" modulation={MODULATION} />
        </div>
        <div className="rec-diary-text">
          <p>{diary}</p>
          <p className="rec-diary-sub">{diary2}</p>
        </div>
      </motion.div>
    </>
  );
}
