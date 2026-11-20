import {
  AnimatePresence,
  motion,
  useAnimate,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type PanInfo,
} from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { CATEGORY_LABEL, FURNITURE, type FurnitureDef } from '../data/furniture';
import { FurnitureArt, FurnitureThumb, THUMB_VIEW } from '../art/Furniture';
import type { FurnitureCategory } from '../domain/room';
import { useApp } from '../store';
import { feedback } from '../ui/feedback';
import { useFx } from '../ui/fx';
import { Ticker } from '../ui/gauges';
import { Coin, IconCheck, IconClose } from '../ui/icons';
import { HoldButton } from '../ui/inputs';
import { useIsland } from '../ui/Island';
import { spring } from '../ui/motion';
import { Pressable } from '../ui/Pressable';
import './Shop.css';

const USE_TEXT: Record<string, string> = {
  sleep: 'タップでねる',
  focus: '集中モードの入口',
  meal: 'ごはんを記録できる',
  light: '夜になると灯る',
  sit: 'ペットのお気に入りになるかも',
};
const useText = (d: FurnitureDef) => (d.use ? (USE_TEXT[d.use] ?? '部屋のかざり') : '部屋のかざり');

const FORSALE = FURNITURE.filter((f) => f.price > 0);
const CATEGORIES: FurnitureCategory[] = (Object.keys(CATEGORY_LABEL) as FurnitureCategory[]).filter((c) =>
  FORSALE.some((f) => f.category === c),
);

export function ShopScreen({
  onPlace,
  onModal,
}: {
  onPlace: (furnitureId: string) => void;
  /** 詳細を開いている間はタブバーを下げる（モーダルの上にタブバーが乗らないように） */
  onModal?: (open: boolean) => void;
}) {
  const coins = useApp((s: { coins: number }) => s.coins);
  const owned = useApp((s: { owned: string[] }) => s.owned);
  const [cat, setCat] = useState<'all' | FurnitureCategory>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    onModal?.(openId !== null);
  }, [openId, onModal]);
  useEffect(() => () => onModal?.(false), [onModal]);

  const items = FORSALE.filter((f) => cat === 'all' || f.category === cat);
  const chips: { id: 'all' | FurnitureCategory; label: string }[] = [
    { id: 'all', label: 'すべて' },
    ...CATEGORIES.map((c) => ({ id: c, label: CATEGORY_LABEL[c] })),
  ];

  return (
    <>
      <div className="screen shop-screen">
        <div className="screen-head">
          <h1 className="screen-title">お店</h1>
          <div className="shop-wallet glass" aria-label={`コイン ${coins}`}>
            <Coin size={18} />
            <Ticker value={coins} />
          </div>
        </div>

        <div className="shop-chips" role="tablist">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={cat === c.id}
              className="shop-chip"
              onClick={() => {
                feedback('selection', 'tick');
                setCat(c.id);
              }}
            >
              {cat === c.id && <motion.span layoutId="shop-chip-bg" className="shop-chip-bg" transition={spring.snappy} />}
              <span className="shop-chip-label">{c.label}</span>
            </button>
          ))}
        </div>

        <motion.div className="shop-grid" layout>
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((d) => {
              const has = owned.includes(d.id);
              const short = !has && coins < d.price;
              return (
                <motion.button
                  key={d.id}
                  type="button"
                  className="shop-card"
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={spring.smooth}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    feedback('light');
                    setOpenId(d.id);
                  }}
                >
                  <motion.span layoutId={`shop-bg-${d.id}`} className="shop-card-bg" transition={spring.smooth} />
                  <motion.span layoutId={`shop-art-${d.id}`} className="shop-card-art" transition={spring.smooth}>
                    <FurnitureThumb def={d} size={96} />
                  </motion.span>
                  <span className="shop-card-name">{d.name}</span>
                  {has ? (
                    <span className="shop-have">
                      <IconCheck size={14} />
                      もってる
                    </span>
                  ) : (
                    <span className="shop-price" data-short={short}>
                      <Coin size={16} />
                      <span className="num">{d.price}</span>
                    </span>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {openId && (
          <Detail
            key={openId}
            def={FORSALE.find((f) => f.id === openId)!}
            onClose={() => setOpenId(null)}
            onPlace={(id) => {
              setOpenId(null);
              onPlace(id);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Detail({
  def,
  onClose,
  onPlace,
}: {
  def: FurnitureDef;
  onClose: () => void;
  onPlace: (id: string) => void;
}) {
  const coins = useApp((s: { coins: number }) => s.coins);
  const has = useApp((s: { owned: string[] }) => s.owned.includes(def.id));
  const [justBought, setJustBought] = useState(false);
  const reduce = useReducedMotion();
  const controls = useDragControls();
  const [bounceScope, bounce] = useAnimate<HTMLDivElement>();
  const tiltX = useMotionValue(0);
  const tilt = useSpring(tiltX, { stiffness: 260, damping: 14 });
  const rotateY = useTransform(tilt, [-1, 1], [-22, 22]);
  const rotateZ = useTransform(tilt, [-1, 1], [-4, 4]);
  const drag = useRef<{ x: number } | null>(null);
  const need = def.price - coins;

  const buy = () => {
    if (!useApp.getState().buy(def.id)) return;
    setJustBought(true);
    useFx.getState().celebrate();
    if (!reduce) bounce(bounceScope.current, { y: [0, -34, 0], scale: [1, 1.12, 1] }, { duration: 0.55, ease: 'easeOut' });
  };

  const reject = () => {
    useIsland.getState().show({ icon: <Coin size={20} />, title: `あと ${need} コイン`, detail: '記録するとたまるよ' });
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  return (
    <div className="shop-detail-root">
      <motion.div
        className="shop-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="shop-panel"
        role="dialog"
        aria-label={def.name}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={onDragEnd}
        onPointerDown={(e) => {
          if (!(e.target as HTMLElement).closest('[data-nodrag]')) controls.start(e);
        }}
        exit={{ opacity: 0 }}
        transition={spring.smooth}
      >
        <motion.div layoutId={`shop-bg-${def.id}`} className="shop-panel-bg" transition={spring.smooth} />
        <div className="shop-panel-body">
          <div className="shop-grabber" aria-hidden />
          <button type="button" className="shop-close" data-nodrag aria-label="とじる" onClick={onClose}>
            <IconClose size={20} />
          </button>

          <motion.div layoutId={`shop-art-${def.id}`} className="shop-stage" transition={spring.smooth}>
            <motion.div
              data-nodrag
              className="shop-tilt"
              style={{ rotateY, rotateZ }}
              onPointerDown={(e) => {
                drag.current = { x: e.clientX };
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (drag.current) tiltX.set(Math.max(-1, Math.min(1, (e.clientX - drag.current.x) / 90)));
              }}
              onPointerUp={() => {
                drag.current = null;
                tiltX.set(0);
              }}
              onPointerCancel={() => {
                drag.current = null;
                tiltX.set(0);
              }}
            >
              <motion.div
                ref={bounceScope}
                className="shop-bob"
                animate={reduce ? undefined : { y: [0, -8, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg viewBox={THUMB_VIEW[def.kind]} width="100%" height="100%" aria-hidden style={{ overflow: 'visible' }}>
                  <FurnitureArt def={def} hour={12} />
                </svg>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            className="shop-info"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.12, ...spring.smooth } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            <h2 className="shop-name">{def.name}</h2>
            <p className="shop-blurb">{def.blurb}</p>
            <div className="shop-meta">
              <span className="shop-use">{useText(def)}</span>
              <span className="shop-price shop-price-l">
                <Coin size={20} />
                <span className="num">{def.price}</span>
              </span>
            </div>

            <div className="shop-actions" data-nodrag>
              {!has ? (
                <HoldButton onConfirm={buy} onReject={reject} disabled={coins < def.price} hint={`${def.price} コイン`}>
                  ながおしで買う
                </HoldButton>
              ) : justBought ? (
                <div className="shop-pair">
                  <Pressable className="btn" data-tone="lamp" onPress={() => onPlace(def.id)}>
                    部屋に置く
                  </Pressable>
                  <Pressable className="btn" data-tone="soft" onPress={onClose}>
                    あとで
                  </Pressable>
                </div>
              ) : (
                <Pressable className="btn" data-tone="lamp" onPress={() => onPlace(def.id)}>
                  部屋に置く
                </Pressable>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
