import { motion, type HTMLMotionProps } from 'motion/react';
import { forwardRef, useRef } from 'react';
import { feedback, type HapticKind, type SoundKind } from './feedback';
import { spring } from './motion';

type Props = Omit<HTMLMotionProps<'button'>, 'onClick'> & {
  onPress?: () => void;
  /** 長押し（既定 420ms）。設定すると押し込みが深くなる */
  onLongPress?: () => void;
  longPressMs?: number;
  haptic?: HapticKind | false;
  sound?: SoundKind | false;
  /** 押したときの縮み具合 */
  depth?: number;
};

/**
 * 押した瞬間に縮み、離すと少し行き過ぎて戻るボタン。
 * Duolingo や iOS のコントロールセンターのように「押した」が指先に返ることを優先する。
 */
export const Pressable = forwardRef<HTMLButtonElement, Props>(function Pressable(
  { onPress, onLongPress, longPressMs = 420, haptic = 'light', sound = 'tap', depth = 0.94, children, ...rest },
  ref,
) {
  const timer = useRef<number | null>(null);
  const longFired = useRef(false);
  /** 押し始めがこのボタンだったか（別の場所で押して、指の下に現れたこのボタンで離したときの click を無視する） */
  const pressedHere = useRef(false);

  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      whileTap={{ scale: depth }}
      transition={spring.snappy}
      onPointerDown={() => {
        pressedHere.current = true;
        longFired.current = false;
        if (!onLongPress) return;
        clear();
        timer.current = window.setTimeout(() => {
          longFired.current = true;
          feedback('medium', 'pop');
          onLongPress();
        }, longPressMs);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onClick={(e) => {
        if (e.detail !== 0 && !pressedHere.current) return;
        pressedHere.current = false;
        if (longFired.current) return;
        if (haptic) feedback(haptic, sound || undefined);
        onPress?.();
      }}
      {...rest}
    >
      {children}
    </motion.button>
  );
});
