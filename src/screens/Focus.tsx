import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PetFigure } from '../art/Pet';
import { speciesById } from '../data/species';
import { dayKey, FOCUS_MIN_FOR_REWARD, summarize } from '../domain/life';
import type { Action, PetSave } from '../domain/pet';
import { celebrate } from '../flows/reward';
import { useApp, now } from '../store';
import { centerOf } from '../ui/fx';
import { feedback } from '../ui/feedback';
import { CountUp, Ticker } from '../ui/gauges';
import { IconPause, IconPlay, IconRotate, IconSound, IconStop } from '../ui/icons';
import { Ruler } from '../ui/inputs';
import { spring } from '../ui/motion';
import { setRain } from '../ui/music';
import { Pressable } from '../ui/Pressable';
import './Focus.css';

type Phase = 'idle' | 'run' | 'done';

const MOD = { speed: 1, bounce: 1, earDroop: 0, eyeOpen: 1, idleExpression: 'happy' as const };
const R = 118;
const C = 2 * Math.PI * R;

const fmt = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function FocusScreen({ onImmersive }: { onImmersive: (on: boolean) => void }) {
  const pet: PetSave = useApp((s: { pet: PetSave }) => s.pet);
  const species = speciesById[pet.speciesId];
  const [phase, setPhase] = useState<Phase>('idle');
  const [minutes, setMinutes] = useState(25);
  const [elapsed, setElapsed] = useState(0); // ms（倍速込み）
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [land, setLand] = useState(false);
  // 雨音。BGM をつけている人は最初からつける
  const [sound, setSound] = useState(() => useApp.getState().music);
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<{ min: number; total: number } | null>(null);
  const [act, setAct] = useState<{ a: Action; k: number }>({ a: 'none', k: 0 });
  const ringRef = useRef<HTMLDivElement>(null);
  const finished = useRef(false);

  const totalMs = minutes * 60000;
  const running = phase === 'run' && !paused && !confirm;

  const finish = useCallback(
    (ms: number) => {
      if (finished.current) return;
      finished.current = true;
      const min = Math.max(1, Math.floor(ms / 60000));
      const res = useApp.getState().record({ type: 'focus', source: 'timer', value: min });
      celebrate(res, centerOf(ringRef.current), 'しゅうちゅう');
      const total = summarize(useApp.getState().log, dayKey(now())).focusMin;
      setResult({ min, total });
      setConfirm(false);
      setPhase('done');
      setAct((p) => ({ a: 'celebrate', k: p.k + 1 }));
    },
    [],
  );

  // 時間を進める
  const tick = useRef(0);
  useEffect(() => {
    if (!running) return;
    tick.current = performance.now();
    const id = window.setInterval(() => {
      const t = performance.now();
      const dt = (t - tick.current) * (fast ? 60 : 1);
      tick.current = t;
      setElapsed((e) => e + dt);
    }, 250);
    return () => window.clearInterval(id);
  }, [running, fast]);

  useEffect(() => {
    if (phase === 'run' && elapsed >= totalMs) finish(totalMs);
  }, [phase, elapsed, totalMs, finish]);

  // ペットの勉強動作
  useEffect(() => {
    if (!running) return;
    let n = 0;
    const play = () => {
      n += 1;
      setAct((p) => ({ a: n % 3 === 0 ? 'nod' : 'study', k: p.k + 1 }));
    };
    const first = window.setTimeout(play, 800);
    const id = window.setInterval(play, 5200);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [running]);

  useEffect(
    () => () => {
      onImmersive(false);
    },
    [onImmersive],
  );

  // 雨音はタイマーが動いているあいだだけ（一時停止中は流したまま）
  useEffect(() => {
    setRain(sound && phase === 'run');
  }, [sound, phase]);
  useEffect(() => () => setRain(false), []);

  const start = () => {
    finished.current = false;
    setElapsed(0);
    setPaused(false);
    setConfirm(false);
    setResult(null);
    setPhase('run');
    onImmersive(true);
    feedback('medium', 'pop');
  };
  const back = () => {
    setPhase('idle');
    setLand(false);
    setFast(false);
    onImmersive(false);
    feedback('light', 'tap');
  };
  const toggleSound = () => {
    setSound((v) => !v);
    feedback('selection', 'tick');
  };

  const remain = Math.max(0, totalMs - elapsed) / 1000;
  const frac = Math.min(1, elapsed / totalMs);
  const dark = phase !== 'idle';
  const size = useMemo(() => (land ? { w: 844, h: 390, r: 90 } : { w: 390, h: 844, r: 0 }), [land]);

  if (!dark) {
    return (
      <div className="screen focus-idle">
        <header className="screen-head">
          <h1 className="screen-title">作業</h1>
          <p className="screen-sub">となりで、いっしょに すわろう</p>
        </header>
        <motion.div
          className="focus-pet"
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={spring.smooth}
        >
          <PetFigure size={170} species={species} pose="sit" expression="focused" modulation={MOD} />
        </motion.div>
        <div className="focus-minutes">
          <span className="display focus-minutes-num">
            <Ticker value={minutes} />
          </span>
          <span className="focus-minutes-unit">分</span>
        </div>
        <div className="focus-ruler">
          <Ruler min={5} max={90} step={5} value={minutes} onChange={setMinutes} major={2} format={(v) => String(v)} />
        </div>
        <p className="focus-note">{FOCUS_MIN_FOR_REWARD}分以上で報酬がもらえる</p>
        <Pressable className="btn focus-start" data-tone="lamp" onPress={start} sound="pop" haptic="medium">
          はじめる
        </Pressable>
      </div>
    );
  }

  return (
    <div className="focus-root">
      <motion.div
        className="focus-stage"
        initial={false}
        animate={{ width: size.w, height: size.h, rotate: size.r }}
        transition={spring.gentle}
        data-land={land}
      >
        <div className="focus-glow" aria-hidden />
        <div className="focus-top">
          <button type="button" className="focus-chip" data-on={fast} onClick={() => setFast((f) => !f)}>
            デモ: 早送り ×60
          </button>
          <div className="focus-top-r">
            <Pressable className="focus-icon" data-on={sound} onPress={toggleSound} aria-label="環境音" haptic={false}>
              <IconSound />
            </Pressable>
            <Pressable
              className="focus-icon"
              onPress={() => setLand((l) => !l)}
              aria-label="画面の向きをかえる"
              haptic="light"
            >
              <IconRotate />
            </Pressable>
          </div>
        </div>

        <div className="focus-body">
          <motion.div
            ref={ringRef}
            className="focus-ring"
            initial={{ scale: 1.35, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring.smooth}
          >
            <svg viewBox="0 0 260 260" width="100%" height="100%" aria-hidden>
              <circle cx="130" cy="130" r={R} className="focus-track" />
              <circle
                cx="130"
                cy="130"
                r={R}
                className="focus-arc"
                strokeDasharray={C}
                strokeDashoffset={C * frac}
                transform="rotate(-90 130 130)"
              />
            </svg>
            <div className="focus-time">
              <span className="display focus-clock num">{fmt(phase === 'done' ? 0 : remain)}</span>
              <span className="focus-state">{phase === 'done' ? 'おつかれさま' : paused ? 'ひとやすみ中' : 'しゅうちゅう中'}</span>
            </div>
          </motion.div>

          <motion.div
            className="focus-pet-run"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...spring.smooth, delay: 0.15 }}
          >
            <PetFigure
              size={land ? 150 : 170}
              species={species}
              pose="sit"
              expression={phase === 'done' ? 'happy' : 'focused'}
              action={act.a}
              actionKey={act.k}
              modulation={MOD}
            />
          </motion.div>
        </div>

        {phase === 'run' && (
          <motion.div className="focus-controls" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring.smooth}>
            <Pressable className="focus-round" onPress={() => setPaused((p) => !p)} aria-label={paused ? 'さいかい' : 'いちじていし'}>
              {paused ? <IconPlay /> : <IconPause />}
            </Pressable>
            <Pressable className="focus-round" data-tone="stop" onPress={() => setConfirm(true)} aria-label="とめる" haptic="medium">
              <IconStop />
            </Pressable>
          </motion.div>
        )}

        <AnimatePresence>
          {confirm && (
            <motion.div className="focus-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div
                className="focus-dialog"
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                transition={spring.bouncy}
              >
                <p className="focus-dialog-t">ここで おわる？</p>
                <p className="focus-dialog-d">すわった分は、ちゃんと残るよ</p>
                <Pressable className="btn" data-tone="lamp" onPress={() => finish(elapsed)} sound="pop">
                  ここまでを記録する
                </Pressable>
                <Pressable className="btn" data-tone="soft" onPress={() => setConfirm(false)}>
                  つづける
                </Pressable>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === 'done' && result && (
            <motion.div
              className="focus-result"
              initial={{ y: 80, opacity: 0, scale: 0.94 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ ...spring.bouncy, delay: 0.25 }}
            >
              <p className="focus-result-msg">
                {result.min >= FOCUS_MIN_FOR_REWARD ? 'すごい、さいごまで すわれたね' : 'すわった時間も、ちゃんと記録したよ'}
              </p>
              <div className="focus-result-row">
                <div>
                  <span className="focus-result-k">今回</span>
                  <span className="display focus-result-v">
                    <CountUp value={result.min} />
                    <small>分</small>
                  </span>
                </div>
                <div>
                  <span className="focus-result-k">きょうの合計</span>
                  <span className="display focus-result-v">
                    <CountUp value={result.total} />
                    <small>分</small>
                  </span>
                </div>
              </div>
              <Pressable className="btn" data-tone="lamp" onPress={back}>
                もどる
              </Pressable>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
