import { animate, useMotionValue, useTransform } from 'motion/react';

type AnimationPlaybackControls = ReturnType<typeof animate>;
import { useCallback, useMemo, useRef, useState } from 'react';
import { toCanvas } from '../../art/iso';
import type { Action, Expression, Pose } from '../../domain/pet';

export type PetLook = {
  pose: Pose;
  /** null のときは調子の既定の表情 */
  expression: Expression | null;
  action: Action;
  actionKey: number;
  facing: 1 | -1;
};

export type Bubble = { key: number; text: string; icon?: string };

let bubbleSeq = 1;

/**
 * 部屋の中のペットの位置と見た目。
 * 位置は床のマス座標（gx, gy）と高さ gz を motion value で持ち、描画位置はそこから計算する。
 * 歩く・止まる・何かに乗るは、すべてここを通す（途中で次の命令が来たら前の動きは止める）。
 */
export function usePet(start: { gx: number; gy: number; gz?: number }) {
  const gx = useMotionValue(start.gx);
  const gy = useMotionValue(start.gy);
  const gz = useMotionValue(start.gz ?? 0);
  const cx = useTransform(() => toCanvas(gx.get(), gy.get(), gz.get()).x);
  const cy = useTransform(() => toCanvas(gx.get(), gy.get(), gz.get()).y);
  // 床の上では奥行き＝gx+gy。家具の上に乗ったら少し手前へ出す
  const z = useTransform(() => 1000 + Math.round((gx.get() + gy.get()) * 100) + 8 + (gz.get() > 0.02 ? 20 : 0));

  const [look, setLookState] = useState<PetLook>({ pose: 'stand', expression: null, action: 'none', actionKey: 0, facing: 1 });
  const lookRef = useRef(look);
  const setLook = useCallback((fn: (l: PetLook) => PetLook) => {
    setLookState((l) => {
      const n = fn(l);
      lookRef.current = n;
      return n;
    });
  }, []);

  const [bubble, setBubble] = useState<Bubble | null>(null);
  const bubbleTimer = useRef<number | null>(null);

  const anims = useRef<AnimationPlaybackControls[]>([]);
  const pending = useRef<((ok: boolean) => void) | null>(null);

  const api = useMemo(() => {
    const stop = () => {
      anims.current.forEach((a) => a.stop());
      anims.current = [];
      pending.current?.(false);
      pending.current = null;
    };

    const face = (dirX: number) => {
      if (Math.abs(dirX) < 0.04) return;
      setLook((l) => ({ ...l, facing: dirX > 0 ? 1 : -1 }));
    };

    /** 一回だけの動作。同じ動作でも key が変わるので最初から再生される */
    const act = (action: Action, expression?: Expression | null) =>
      setLook((l) => ({ ...l, action, actionKey: l.actionKey + 1, expression: expression === undefined ? l.expression : expression }));

    const pose = (p: Pose, expression?: Expression | null) =>
      setLook((l) => ({ ...l, pose: p, expression: expression === undefined ? l.expression : expression }));

    const express = (expression: Expression | null) => setLook((l) => ({ ...l, expression }));

    /**
     * 床の (tx, ty) まで歩く。speed はマス/秒。perch > 0 なら着いたあと家具の上へ跳び乗る。
     * 途中で止められたら false で終わる。
     */
    const walkTo = (tx: number, ty: number, speed: number, perch = 0): Promise<boolean> => {
      stop();
      return new Promise<boolean>((resolve) => {
        pending.current = resolve;
        const finish = (ok: boolean) => {
          if (pending.current !== resolve) return;
          pending.current = null;
          resolve(ok);
        };
        const dx = tx - gx.get();
        const dy = ty - gy.get();
        const dist = Math.hypot(dx, dy);
        const wasUp = gz.get() > 0.02;

        const land = () => {
          if (perch > 0) {
            setLook((l) => ({ ...l, pose: 'stand', action: 'jump', actionKey: l.actionKey + 1 }));
            const a = animate(gz, [gz.get(), perch + 0.35, perch], { duration: 0.42, times: [0, 0.45, 1], ease: ['easeOut', 'easeIn'] });
            anims.current = [a];
            a.then(() => finish(true));
          } else {
            setLook((l) => ({ ...l, pose: 'stand' }));
            finish(true);
          }
        };

        if (dist < 0.06) {
          if (wasUp && perch === 0) {
            const a = animate(gz, 0, { duration: 0.25, ease: 'easeIn' });
            anims.current = [a];
            a.then(land);
          } else land();
          return;
        }

        face(dx - dy);
        setLook((l) => ({ ...l, pose: 'walk', action: 'none' }));
        const duration = Math.max(0.35, dist / Math.max(0.35, speed));
        const delay = wasUp ? 0.22 : 0;
        const list: AnimationPlaybackControls[] = [];
        if (wasUp) list.push(animate(gz, [gz.get(), gz.get() + 0.25, 0], { duration: 0.3, times: [0, 0.4, 1] }));
        const ax = animate(gx, tx, { duration, delay, ease: 'linear' });
        list.push(ax, animate(gy, ty, { duration, delay, ease: 'linear' }));
        anims.current = list;
        ax.then(() => {
          if (pending.current !== resolve) return;
          land();
        });
      });
    };

    /** その場へ瞬間移動（起動時に寝ていたときなど） */
    const place = (x: number, y: number, z = 0) => {
      stop();
      gx.set(x);
      gy.set(y);
      gz.set(z);
    };

    const say = (text: string, ms = 2600, icon?: string) => {
      if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
      setBubble({ key: bubbleSeq++, text, icon });
      bubbleTimer.current = window.setTimeout(() => setBubble(null), ms);
    };

    const hush = () => {
      if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
      setBubble(null);
    };

    return { stop, face, act, pose, express, walkTo, place, say, hush };
  }, [gx, gy, gz, setLook]);

  return { gx, gy, gz, cx, cy, z, look, lookRef, bubble, ...api };
}

export type PetController = ReturnType<typeof usePet>;

export const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

export const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
