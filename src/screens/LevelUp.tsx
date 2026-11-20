import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PetFigure } from '../art/Pet';
import { speciesById } from '../data/species';
import { UNLOCKS, type Modulation } from '../domain/pet';
import { useApp } from '../store';
import { useFx } from '../ui/fx';
import { spring } from '../ui/motion';
import { Pressable } from '../ui/Pressable';
import './LevelUp.css';

const MOD: Modulation = { speed: 1, bounce: 1, earDroop: 0, eyeOpen: 1, idleExpression: 'happy' };

export function LevelUpModal() {
  const level = useFx((s) => s.levelUp);
  const close = useFx((s) => s.closeLevelUp);
  const pet = useApp((s) => s.pet);
  const reduce = useReducedMotion();
  const species = speciesById[pet.speciesId];
  const unlocks = level == null ? [] : UNLOCKS.filter((u) => u.level === level);

  return (
    <AnimatePresence>
      {level != null && (
        <motion.div
          className="lvl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="lvl-rays"
            aria-hidden
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="lvl-card"
            role="dialog"
            aria-label={`レベル ${level}`}
            initial={{ scale: 0.7, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={spring.bouncy}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lvl-pet">
              <PetFigure size={170} species={species} pose="stand" expression="happy" action="celebrate" actionKey={level} modulation={MOD} />
            </div>
            <motion.div
              className="display lvl-title"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...spring.bouncy, delay: 0.15 }}
            >
              レベル {level}
            </motion.div>
            <div className="lvl-unlock">
              {unlocks.length > 0 ? (
                <>
                  <div className="lvl-sub">できるようになったこと</div>
                  {unlocks.map((u) => (
                    <div key={u.title} className="lvl-item">
                      <b>{u.title}</b>
                      <span>{u.detail}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="lvl-sub">つぎの楽しみまで、あと少し</div>
              )}
            </div>
            <Pressable className="btn lvl-btn" data-tone="lamp" haptic="medium" sound="pop" onPress={close}>
              やったね
            </Pressable>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
