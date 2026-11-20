import { AnimatePresence, animate, motion, useMotionValue, useTransform, type MotionValue, type PanInfo } from 'motion/react';
import { useRef, useState } from 'react';
import { PetFigure } from '../art/Pet';
import { SPECIES, speciesById } from '../data/species';
import type { Modulation, SpeciesId } from '../domain/pet';
import { useApp } from '../store';
import { feedback } from '../ui/feedback';
import { useFx } from '../ui/fx';
import { IconChevron } from '../ui/icons';
import { clamp, project, rubberband, spring } from '../ui/motion';
import { Pressable } from '../ui/Pressable';
import './Onboarding.css';

const MOD: Modulation = { speed: 1, bounce: 1, earDroop: 0, eyeOpen: 1, idleExpression: 'happy' };
const ITEM = 250;
const MAX_NAME = 8;

const slide = {
  enter: (d: number) => ({ x: d * 90, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d * -90, opacity: 0 }),
};

export function Onboarding() {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [index, setIndex] = useState(0);
  const [name, setName] = useState('');

  const species = SPECIES[index];
  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };

  const next = () => {
    if (step === 1) setName(species.label);
    go(step + 1);
  };

  const decide = () => {
    feedback('success', 'reward');
    useFx.getState().celebrate();
    setShow(false);
  };

  const finish = () => {
    useApp.getState().adopt(species.id, name.trim() || species.label);
  };

  return (
    <AnimatePresence onExitComplete={finish}>
      {show && (
        <motion.div
          className="onb"
          initial={{ opacity: 1 }}
          exit={{ scale: 1.7, opacity: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
        >
          <motion.div className="onb-bg" animate={{ backgroundColor: step === 0 ? '#ffe9c2' : species.palette.body }} transition={{ duration: 0.6 }} />
          <div className="onb-wash" />
          {step > 0 && (
            <Pressable className="onb-back" aria-label="もどる" onPress={() => go(step - 1)}>
              <span style={{ display: 'inline-flex', transform: 'scaleX(-1)' }}>
                <IconChevron size={22} />
              </span>
            </Pressable>
          )}
          {step > 0 && (
            <div className="onb-steps" aria-hidden>
              {[1, 2, 3].map((n) => (
                <span key={n} data-on={n <= step} />
              ))}
            </div>
          )}
          <AnimatePresence custom={dir} initial={false}>
            <motion.div
              key={step}
              className="onb-panel"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={spring.smooth}
            >
              {step === 0 && <Welcome onStart={next} />}
              {step === 1 && <Pick index={index} setIndex={setIndex} onNext={next} />}
              {step === 2 && <NameStep id={species.id} name={name} setName={setName} onNext={next} />}
              {step === 3 && <Confirm id={species.id} name={name} onDecide={decide} />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="onb-center">
      <div className="onb-ghosts" aria-hidden>
        {SPECIES.map((s, i) => (
          <motion.div
            key={s.id}
            className="onb-ghost"
            style={{ left: `${10 + i * 32}%`, top: `${12 + (i % 2) * 18}%` }}
            animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
          >
            <PetFigure size={120} species={s} pose="sit" expression="happy" modulation={MOD} />
          </motion.div>
        ))}
      </div>
      <div className="onb-welcome">
        <motion.h1 className="display onb-title" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.bouncy}>
          DataMate
        </motion.h1>
        <p className="onb-lead">きみの毎日が、この子の部屋になる</p>
        <Pressable className="btn onb-cta" data-tone="lamp" onPress={onStart}>
          はじめる
        </Pressable>
      </div>
    </div>
  );
}

function Pick({ index, setIndex, onNext }: { index: number; setIndex: (i: number) => void; onNext: () => void }) {
  const n = SPECIES.length;
  const min = -(n - 1) * ITEM;
  const x = useMotionValue(-index * ITEM);
  const start = useRef(0);
  const [jump, setJump] = useState(0);

  const settle = (i: number, velocity = 0) => {
    setIndex(i);
    animate(x, -i * ITEM, { ...spring.smooth, velocity });
  };

  const onPanStart = () => {
    start.current = x.get();
    x.stop();
  };
  const onPan = (_: PointerEvent, info: PanInfo) => {
    const raw = start.current + info.offset.x;
    if (raw > 0) x.set(rubberband(raw, ITEM));
    else if (raw < min) x.set(min + rubberband(raw - min, ITEM));
    else x.set(raw);
  };
  const onPanEnd = (_: PointerEvent, info: PanInfo) => {
    const target = x.get() + project(info.velocity.x);
    const i = clamp(Math.round(-target / ITEM), 0, n - 1);
    if (i !== index) feedback('selection', 'tick');
    settle(i, info.velocity.x);
  };

  const s = SPECIES[index];
  return (
    <div className="onb-pick">
      <h2 className="display onb-h">だれと くらす？</h2>
      <motion.div className="onb-track" onPanStart={onPanStart} onPan={onPan} onPanEnd={onPanEnd}>
        {SPECIES.map((sp, i) => (
          <Slot
            key={sp.id}
            i={i}
            x={x}
            onTapCenter={() => {
              if (i !== index) {
                feedback('selection', 'tick');
                settle(i);
              } else {
                feedback('light', 'pop');
                setJump((k) => k + 1);
              }
            }}
            active={i === index}
            jump={jump}
          />
        ))}
      </motion.div>
      <div className="onb-info" key={s.id}>
        <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring.smooth}>
          <div className="display onb-name">{s.label}</div>
          <div className="onb-tags">
            <span className="chip">{s.animal}</span>
            <span className="chip">{s.temperamentLabel}</span>
          </div>
          <p className="onb-blurb">{s.blurb}</p>
        </motion.div>
      </div>
      <div className="onb-dots" aria-hidden>
        {SPECIES.map((sp, i) => (
          <span key={sp.id} data-on={i === index} />
        ))}
      </div>
      <Pressable className="btn onb-cta" data-tone="lamp" onPress={onNext}>
        {s.label}にする
      </Pressable>
    </div>
  );
}

function Slot({ i, x, active, jump, onTapCenter }: { i: number; x: MotionValue<number>; active: boolean; jump: number; onTapCenter: () => void }) {
  const dist = useTransform(x, (v) => (v + i * ITEM) / ITEM);
  const scale = useTransform(dist, [-1, 0, 1], [0.62, 1, 0.62]);
  const opacity = useTransform(dist, [-1, 0, 1], [0.35, 1, 0.35]);
  const sp = SPECIES[i];
  return (
    <motion.div className="onb-slot" style={{ x, left: `calc(50% - ${ITEM / 2}px + ${i * ITEM}px)`, width: ITEM }}>
      <motion.button
        type="button"
        aria-label={sp.label}
        className="onb-slot-btn"
        style={{ scale, opacity }}
        onTap={onTapCenter}
      >
        <PetFigure
          size={190}
          species={sp}
          pose="stand"
          expression="happy"
          action={active && jump > 0 ? 'jump' : 'none'}
          actionKey={jump}
          modulation={MOD}
        />
      </motion.button>
    </motion.div>
  );
}

function NameStep({ id, name, setName, onNext }: { id: SpeciesId; name: string; setName: (v: string) => void; onNext: () => void }) {
  const [key, setKey] = useState(0);
  const sp = speciesById[id];
  const ok = name.trim().length > 0;
  return (
    <div className="onb-center onb-namestep">
      <h2 className="display onb-h">なまえを きめよう</h2>
      <div className="onb-pet">
        <PetFigure size={170} species={sp} pose="stand" expression="happy" action={key ? 'nod' : 'none'} actionKey={key} modulation={MOD} />
      </div>
      <input
        className="onb-input display"
        value={name}
        maxLength={MAX_NAME}
        aria-label="なまえ"
        autoFocus
        onChange={(e) => {
          setName(e.target.value.slice(0, MAX_NAME));
          setKey((k) => k + 1);
          feedback('selection', 'tick');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && ok) onNext();
        }}
      />
      <div className="onb-count">{name.length} / {MAX_NAME}</div>
      <Pressable className="btn onb-cta" data-tone="lamp" disabled={!ok} onPress={onNext}>
        これにする
      </Pressable>
    </div>
  );
}

function Confirm({ id, name, onDecide }: { id: SpeciesId; name: string; onDecide: () => void }) {
  const sp = speciesById[id];
  return (
    <div className="onb-center">
      <motion.div className="onb-pet" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={spring.bouncy}>
        <PetFigure size={220} species={sp} pose="stand" expression="love" action="celebrate" actionKey={1} modulation={MOD} />
      </motion.div>
      <h2 className="display onb-h">{name}が まってるよ</h2>
      <p className="onb-lead">きょうから、いっしょ</p>
      <Pressable className="btn onb-cta" data-tone="lamp" haptic="medium" sound="pop" onPress={onDecide}>
        この子とくらす
      </Pressable>
    </div>
  );
}
