import { animate, AnimatePresence, motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FurnitureThumb } from '../../art/Furniture';
import { RoomShell, RoomTint, VIEW } from '../../art/Room';
import { categoryOf, furnitureById, type FurnitureDef, type FurnitureUse } from '../../data/furniture';
import { HUB, SLOTS, slotById, WANDER_POINTS, type RoomSlot } from '../../data/layout';
import { foodById, speciesById } from '../../data/species';
import { labelFor, lightAt } from '../../domain/daylight';
import { dayKey, summarize } from '../../domain/life';
import { conditionOf, VOICE, xpToNext, type Action, type PetSave } from '../../domain/pet';
import { compatibleSlots, nearestSlot, placeFurniture, removeFurniture, slotOf, storedFurniture, type Placement } from '../../domain/room';
import { celebrate } from '../../flows/reward';
import { hourOf, now, useApp, useNow } from '../../store';
import { BottomSheet } from '../../ui/BottomSheet';
import { feedback } from '../../ui/feedback';
import { toLocal, useFx, type Point } from '../../ui/fx';
import { Bar, Ring, Ticker } from '../../ui/gauges';
import { Coin, IconBox, IconBrush, IconMoon, IconSun, IconUndo } from '../../ui/icons';
import { SlideToConfirm } from '../../ui/inputs';
import { useIsland } from '../../ui/Island';
import { clamp, ease, spring } from '../../ui/motion';
import { Pressable } from '../../ui/Pressable';
import { anchorOf, CALLOUT_LIFT, canvasOf, clientToCanvas, floorAt, probeOf, toLayer, useSpotOf, type Pt } from './geometry';
import { FoodSheet, formatSleep, PetDetailSheet, SleepSheet, TasksSheet } from './HomeSheets';
import { GhostPiece, PetSprite, Piece, Ripple, SlotMarkers, type PieceHandle, type Spawn } from './SceneParts';
import { pick, usePet, wait, type Bubble } from './usePet';
import './Home.css';

export type HomeTab = 'focus' | 'records' | 'shop';

type Props = {
  active: boolean;
  onNavigate: (tab: HomeTab) => void;
  onTabBarHidden: (hidden: boolean) => void;
  /** お店で買った家具を部屋に置いてほしい、という依頼 */
  placeRequest: string | null;
  onPlaceHandled: () => void;
};

/** 家具の上に乗るときの高さ（マス） */
const PERCH: Partial<Record<FurnitureDef['kind'], number>> = { bed: 0.42, cushion: 0.06, beanbag: 0.2 };
const SCENE_RATIO = VIEW.h / VIEW.w;

type SheetKind = 'detail' | 'tasks' | 'food' | null;

type Drag = {
  id: string;
  fromSlot: string | null;
  wall: boolean;
  offset: Pt;
  target: string | null;
  display: Pt;
  overTray: boolean;
  ghost: boolean;
};

const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function findUse(placement: Placement, use: FurnitureUse): { slot: RoomSlot; def: FurnitureDef } | null {
  for (const slot of SLOTS) {
    const id = placement[slot.id];
    const def = id ? furnitureById[id] : undefined;
    if (def?.use === use) return { slot, def };
  }
  return null;
}

let rippleSeq = 1;

export function Home({ active, onNavigate, onTabBarHidden, placeRequest, onPlaceHandled }: Props) {
  const pet = useApp((s) => s.pet);
  const coins = useApp((s) => s.coins);
  const placement = useApp((s) => s.placement);
  const owned = useApp((s) => s.owned);
  const log = useApp((s) => s.log);
  const tasks = useApp((s) => s.tasks);
  const lampOn = useApp((s) => s.lampOn);
  const canUndo = useApp((s) => s.undo.length > 0);
  const lastInteraction = useApp((s) => s.lastInteraction);

  const t = useNow(1000);
  const hour = hourOf(t);
  const species = speciesById[pet.speciesId];
  const cond = conditionOf(pet, hour, t - lastInteraction < 10 * 60_000);
  const sleeping = pet.asleepSince !== null;
  const summary = summarize(log, dayKey(t));

  const placed = useMemo(
    () =>
      SLOTS.flatMap((slot) => {
        const id = placement[slot.id];
        return id && furnitureById[id] ? [{ slot, def: furnitureById[id] }] : [];
      }),
    [placement],
  );
  const stored = storedFurniture(owned, placement);

  // ---------- 部屋の大きさ ----------
  const areaRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const [sceneW, setSceneW] = useState(390);
  const s = sceneW / VIEW.w;
  const sMV = useMotionValue(s);
  useEffect(() => sMV.set(s), [s, sMV]);
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const fit = () => setSceneW(Math.max(200, Math.min(el.clientWidth, (el.clientHeight - 8) / SCENE_RATIO)));
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, []);

  // ---------- ペット ----------
  const [initialSpot] = useState(() => {
    const st = useApp.getState();
    const bed = st.pet.asleepSince ? findUse(st.placement, 'sleep') : null;
    if (bed) return { ...useSpotOf(bed.slot, bed.def), gz: PERCH.bed };
    return { gx: HUB.gx, gy: HUB.gy };
  });
  const p = usePet(initialSpot);
  const pRef = useRef(p);
  pRef.current = p;

  const condRef = useRef(cond);
  condRef.current = cond;
  const walkSpeed = useCallback(() => speciesById[useApp.getState().pet.speciesId].motion.walkSpeed * Math.max(0.45, condRef.current.modulation.speed), []);

  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [eyesOpen, setEyesOpen] = useState(false);
  const [waking, setWaking] = useState(false);
  const [sleepSheet, setSleepSheet] = useState<{ mode: 'wake' | 'later'; minutes: number } | null>(null);
  const [ripples, setRipples] = useState<{ id: number; at: Pt }[]>([]);
  const [pokes, setPokes] = useState<Record<string, number>>({});
  const busyRef = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;
  const sheetOpenRef = useRef(false);
  sheetOpenRef.current = sheet !== null || sleepSheet !== null;
  /** ペット・家具・持ち物を指で触っている間は true（床のタップと区別する） */
  const gestureOn = useRef(false);

  const visualSleep = sleeping && !eyesOpen;

  useEffect(() => onTabBarHidden(editing || sleeping), [editing, sleeping, onTabBarHidden]);

  // 部屋の座標 → 端末の枠の座標（演出の発射点）
  const toDevice = useCallback((c: Pt): Point => {
    const el = sceneRef.current;
    if (!el) return { x: 195, y: 420 };
    const r = el.getBoundingClientRect();
    return toLocal(r.left + ((c.x - VIEW.x) / VIEW.w) * r.width, r.top + ((c.y - VIEW.y) / VIEW.h) * r.height);
  }, []);
  const petPoint = useCallback(() => toDevice({ x: pRef.current.cx.get(), y: pRef.current.cy.get() - 100 }), [toDevice]);

  const poke = (id: string) => setPokes((m) => ({ ...m, [id]: (m[id] ?? 0) + 1 }));

  // ---------- ひとりで過ごす ----------
  useEffect(() => {
    let idle = 0;
    let lastVoice = Date.now();
    const id = window.setInterval(() => {
      const pc = pRef.current;
      if (!activeRef.current || editingRef.current || busyRef.current || sheetOpenRef.current || useApp.getState().pet.asleepSince) {
        idle = 0;
        return;
      }
      const look = pc.lookRef.current;
      if (look.pose === 'walk') return;
      idle += 1;
      const c = condRef.current;
      const sp = speciesById[useApp.getState().pet.speciesId];
      if (Date.now() - lastVoice > 15000 && Math.random() < 0.1) {
        lastVoice = Date.now();
        pc.say(pick(VOICE[c.reason] ?? VOICE.calm));
        return;
      }
      const r = Math.random();
      const wander = sp.motion.wander * c.modulation.speed;
      if (idle >= 3 && r < 0.1 + wander * 0.22) {
        idle = 0;
        const cur = { gx: pc.gx.get(), gy: pc.gy.get() };
        const options = WANDER_POINTS.filter((w) => Math.hypot(w.gx - cur.gx, w.gy - cur.gy) > 0.7);
        const to = pick(options.length ? options : WANDER_POINTS);
        pc.walkTo(to.gx + (Math.random() - 0.5) * 0.5, to.gy + (Math.random() - 0.5) * 0.5, walkSpeed()).then((ok) => {
          if (ok && Math.random() < 0.35) pc.act('sniff');
        });
        return;
      }
      if (idle >= 2 && r > 0.8) {
        idle = 0;
        const low = c.mood === 'sleepy' || c.mood === 'tired';
        const choice = pick<Action | 'sit'>(low ? ['yawn', 'yawn', 'nod', 'sit'] : ['sniff', 'nod', 'stretch', 'sit']);
        if (choice === 'sit') pc.pose(look.pose === 'sit' ? 'stand' : 'sit');
        else pc.act(choice);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [walkSpeed]);

  // 他の画面から戻ったら出迎える
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current && !useApp.getState().pet.asleepSince) {
      const pc = pRef.current;
      window.setTimeout(() => {
        // お店から「部屋に置く」で来たときは、もようがえ中なので出迎えない
        if (editingRef.current) return;
        pc.act('jump', 'happy');
        pc.say('おかえり！', 1800);
        window.setTimeout(() => pc.express(null), 1400);
      }, 260);
    }
    if (!active) setSelected(null);
    wasActive.current = active;
  }, [active]);

  // ---------- 床をタップ → そこへ歩く ----------
  const onFloorTap = (e: React.PointerEvent<SVGPolygonElement>) => {
    if (gestureOn.current || editingRef.current) return;
    if (selected) {
      setSelected(null);
      return;
    }
    if (sleeping || busyRef.current) return;
    const el = sceneRef.current;
    if (!el) return;
    const g = floorAt(clientToCanvas(el, e.clientX, e.clientY));
    setRipples((r) => [...r.slice(-3), { id: rippleSeq++, at: canvasOf(g.gx, g.gy) }]);
    feedback('selection', 'tap');
    useApp.getState().touch();
    p.walkTo(g.gx, g.gy, walkSpeed()).then((ok) => {
      if (ok && Math.random() < 0.4) pRef.current.act('sniff');
    });
  };

  // ---------- ペットをタップ・なでる ----------
  const onPetDown = (e: React.PointerEvent) => {
    if (editingRef.current) return;
    e.stopPropagation();
    gestureOn.current = true;
    const sx = e.clientX;
    const sy = e.clientY;
    const t0 = performance.now();
    let lx = sx;
    let ly = sy;
    let path = 0;
    let stroked = false;
    let hearts = 0;
    const asleep = !!useApp.getState().pet.asleepSince;
    const move = (ev: PointerEvent) => {
      path += Math.hypot(ev.clientX - lx, ev.clientY - ly);
      lx = ev.clientX;
      ly = ev.clientY;
      if (asleep) return;
      if (!stroked && path > 90) {
        stroked = true;
        busyRef.current = true;
        p.stop();
        p.pose('stand', 'love');
        feedback('light', 'purr');
      }
      if (stroked && path > 90 + hearts * 70 && hearts < 7) {
        hearts += 1;
        useFx.getState().float('♥', toLocal(ev.clientX, ev.clientY - 24), 'heart');
        feedback('selection');
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      gestureOn.current = false;
      if (asleep) {
        p.say('すぅ…すぅ…', 1800);
        return;
      }
      if (stroked) {
        const r = useApp.getState().record({ type: 'interaction', source: 'pet' });
        if (r.reward) celebrate(r, petPoint());
        p.act('celebrate', 'happy');
        p.say(pick(VOICE.petted), 2000);
        window.setTimeout(() => {
          pRef.current.express(null);
          busyRef.current = false;
        }, 1600);
      } else if (path < 14 && performance.now() - t0 < 500) {
        p.stop();
        p.pose('stand');
        p.act('jump', 'surprised');
        p.say(pick(VOICE.poked), 1500);
        feedback('light', 'pop');
        useApp.getState().touch();
        window.setTimeout(() => pRef.current.express(null), 900);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  // ---------- もようがえ ----------
  const handles = useRef(new Map<string, PieceHandle>());
  const register = useCallback((id: string, h: PieceHandle | null) => {
    if (h) handles.current.set(id, h);
    else handles.current.delete(id);
  }, []);
  const spawns = useRef(new Map<string, Spawn>());
  useEffect(() => {
    spawns.current.clear();
  }, [placement]);

  const drag = useRef<Drag | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [overTray, setOverTray] = useState(false);
  const [ghost, setGhost] = useState<string | null>(null);
  const ghostX = useMotionValue(0);
  const ghostY = useMotionValue(0);

  const enterEdit = () => {
    if (editingRef.current || sleeping) return;
    editingRef.current = true;
    setEditing(true);
    setSelected(null);
    setSheet(null);
    p.stop();
    p.hush();
    p.pose('sit');
    feedback('medium');
  };

  const exitEdit = () => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setEditing(false);
    feedback('success', 'chirp');
    p.pose('stand');
  };

  const notifyStored = (id: string) => {
    useIsland.getState().show({
      icon: <IconBox size={18} />,
      title: `${furnitureById[id].name}をしまった`,
      detail: '持ち物から、いつでも出せるよ',
      action: { label: 'もとにもどす', run: () => useApp.getState().undoPlacement() },
      duration: 3600,
    });
  };

  const beginDrag = (id: string, clientX: number, clientY: number, fromTray: boolean) => {
    const el = sceneRef.current;
    if (!el) return;
    const st = useApp.getState();
    const fromSlot = fromTray ? null : slotOf(st.placement, id);
    const slot = fromSlot ? slotById[fromSlot] : null;
    const wall = categoryOf(id) === 'wall';
    const pointer = clientToCanvas(el, clientX, clientY);
    const anchor = slot ? anchorOf(slot) : { x: pointer.x, y: pointer.y + (wall ? 0 : 60) };
    drag.current = {
      id,
      fromSlot,
      wall,
      offset: { x: anchor.x - pointer.x, y: anchor.y - pointer.y },
      target: fromSlot,
      display: anchor,
      overTray: false,
      ghost: !slot,
    };
    setDragId(id);
    setDragTarget(fromSlot);
    setSelected(null);
    if (!slot) {
      const l = toLayer(anchor);
      ghostX.set(l.x);
      ghostY.set(l.y);
      setGhost(id);
    } else {
      const h = handles.current.get(id);
      if (h) animate(h.lift, 1.1, spring.snappy);
    }
    feedback('medium', 'pop');
  };

  const dragMove = (clientX: number, clientY: number) => {
    const d = drag.current;
    const el = sceneRef.current;
    if (!d || !el) return;
    const pointer = clientToCanvas(el, clientX, clientY);
    const raw = { x: pointer.x + d.offset.x, y: pointer.y + d.offset.y };
    const tray = trayRef.current?.getBoundingClientRect();
    const overTray = !!tray && clientY > tray.top - 12;
    const hit = overTray ? null : (nearestSlot(SLOTS, probeOf(raw, d.wall), categoryOf(d.id), 140) as RoomSlot | null);
    const target = hit?.id ?? null;
    if (target !== d.target) {
      d.target = target;
      setDragTarget(target);
      if (target) feedback('selection', 'tick');
    }
    if (overTray !== d.overTray) {
      d.overTray = overTray;
      setOverTray(overTray);
      feedback('light');
    }
    // 置き場所の近くでは、そちらへ少し引き寄せる（磁石）
    let disp = raw;
    if (target) {
      const a = anchorOf(slotById[target]);
      disp = { x: raw.x + (a.x - raw.x) * 0.3, y: raw.y + (a.y - raw.y) * 0.3 };
    }
    d.display = disp;
    const l = toLayer(disp);
    if (d.ghost) {
      ghostX.set(l.x);
      ghostY.set(l.y);
    } else {
      const h = handles.current.get(d.id);
      h?.x.set(l.x);
      h?.y.set(l.y);
    }
  };

  const dragEnd = (cancel = false) => {
    const d = drag.current;
    drag.current = null;
    setDragId(null);
    setDragTarget(null);
    setOverTray(false);
    setGhost(null);
    if (!d || cancel) return;
    const st = useApp.getState();
    if (d.overTray) {
      if (!d.ghost) {
        st.setPlacement(removeFurniture(st.placement, d.id));
        feedback('light', 'whoosh');
      }
      return;
    }
    if (d.target && d.target !== d.fromSlot) {
      const res = placeFurniture(SLOTS, st.placement, d.id, categoryOf, d.target);
      if (res.ok) {
        if (d.ghost) spawns.current.set(d.id, { at: d.display, fade: false });
        st.setPlacement(res.placement);
        feedback('medium', 'snap');
        if (res.displaced) notifyStored(res.displaced);
        return;
      }
    }
    feedback('light');
  };

  /** 持ち物の家具を、空いている置き場所へ自動で置く（タップ・お店から） */
  const autoPlace = (id: string) => {
    const st = useApp.getState();
    if (slotOf(st.placement, id)) {
      poke(id);
      return;
    }
    const comp = compatibleSlots(SLOTS, categoryOf(id)) as RoomSlot[];
    const slot = comp.find((sl) => !st.placement[sl.id]) ?? comp[0];
    if (!slot) return;
    const res = placeFurniture(SLOTS, st.placement, id, categoryOf, slot.id);
    if (!res.ok) return;
    const a = anchorOf(slot);
    spawns.current.set(id, { at: { x: a.x, y: a.y - 260 }, fade: true });
    st.setPlacement(res.placement);
    window.setTimeout(() => feedback('medium', 'snap'), 240);
    if (res.displaced) notifyStored(res.displaced);
  };

  // お店から「部屋に置く」
  // 受け取った直後に依頼を消すので、タイマーは effect の後始末で消さない（消すと置かれない）
  const placeTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(placeTimer.current), []);
  useEffect(() => {
    if (!active || !placeRequest) return;
    const id = placeRequest;
    onPlaceHandled();
    enterEdit();
    window.clearTimeout(placeTimer.current);
    placeTimer.current = window.setTimeout(() => autoPlace(id), 380);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, placeRequest]);

  // ---------- 家具に触る ----------
  const onPieceDown = (e: React.PointerEvent, id: string) => {
    if (useApp.getState().pet.asleepSince) return;
    e.stopPropagation();
    gestureOn.current = true;
    const sx = e.clientX;
    const sy = e.clientY;
    let lx = sx;
    let ly = sy;
    let started = false;
    const h = handles.current.get(id);
    let timer = 0;
    if (!editingRef.current) {
      // 長押しでもようがえに入り、そのまま運べる（iOS のホーム画面と同じ）
      if (h) animate(h.lift, 0.95, { duration: 0.4, ease: 'easeOut' });
      timer = window.setTimeout(() => {
        timer = 0;
        enterEdit();
        started = true;
        beginDrag(id, lx, ly, false);
      }, 420);
    }
    const move = (ev: PointerEvent) => {
      lx = ev.clientX;
      ly = ev.clientY;
      if (started) {
        dragMove(lx, ly);
        return;
      }
      const dist = Math.hypot(lx - sx, ly - sy);
      if (timer) {
        if (dist > 10) {
          window.clearTimeout(timer);
          timer = 0;
          if (h) animate(h.lift, 1, spring.snappy);
        }
      } else if (editingRef.current && dist > 6) {
        started = true;
        beginDrag(id, sx, sy, false);
        dragMove(lx, ly);
      }
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      gestureOn.current = false;
      if (timer) {
        window.clearTimeout(timer);
        if (h) animate(h.lift, 1, spring.bouncy);
        tapPiece(id);
      } else if (started) {
        dragEnd(ev.type === 'pointercancel');
      } else if (editingRef.current) {
        poke(id);
        feedback('selection');
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const onTrayDown = (e: React.PointerEvent, id: string) => {
    gestureOn.current = true;
    const sx = e.clientX;
    const sy = e.clientY;
    let started = false;
    let scrolled = false;
    const move = (ev: PointerEvent) => {
      if (started) {
        dragMove(ev.clientX, ev.clientY);
        return;
      }
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (dy < -10 && Math.abs(dy) > Math.abs(dx)) {
        started = true;
        beginDrag(id, ev.clientX, ev.clientY, true);
      } else if (Math.abs(dx) > 10) scrolled = true;
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      gestureOn.current = false;
      if (started) dragEnd(ev.type === 'pointercancel');
      else if (!scrolled && ev.type === 'pointerup') autoPlace(id);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const tapPiece = (id: string) => {
    poke(id);
    if (selected === id) {
      setSelected(null);
      return;
    }
    setSelected(id);
    feedback('light', 'tap');
    const slotId = slotOf(useApp.getState().placement, id);
    if (slotId && !busyRef.current) {
      const sl = slotById[slotId];
      p.face(sl.gx - p.gx.get() - (sl.gy - p.gy.get()));
    }
  };

  // ---------- 家具を使う ----------
  const lampLit = lampOn ?? lightAt(hour, sleeping).lampGlow > 0.4;

  const goSleep = async (slot: RoomSlot, def: FurnitureDef) => {
    busyRef.current = true;
    p.hush();
    const sp = useSpotOf(slot, def);
    const ok = await p.walkTo(sp.gx, sp.gy, walkSpeed() * 1.2, PERCH[def.kind] ?? 0);
    busyRef.current = false;
    if (!ok) return;
    useApp.getState().goToSleep();
    feedback('medium', 'purr');
    useIsland.getState().show({ icon: <IconMoon size={18} filled />, title: 'おやすみ', detail: '起きたら、下のつまみをスライドしてね', duration: 2600 });
  };

  const sitOn = async (slot: RoomSlot, def: FurnitureDef) => {
    busyRef.current = true;
    const sp = useSpotOf(slot, def);
    const ok = await p.walkTo(sp.gx, sp.gy, walkSpeed() * 1.2, PERCH[def.kind] ?? 0);
    if (ok) {
      p.pose('sit', 'happy');
      p.say(species.likes.furniture.includes(def.id) ? 'ここ、すき！' : 'よいしょ', 1800);
      await wait(1600);
      p.express(null);
    }
    // しばらく座ってから、またひとりで動き出す
    window.setTimeout(() => (busyRef.current = false), 4000);
  };

  const eat = async (foodId: string) => {
    setSheet(null);
    const food = foodById[foodId];
    busyRef.current = true;
    const table = findUse(useApp.getState().placement, 'meal');
    if (table) {
      const sp = useSpotOf(table.slot, table.def);
      await p.walkTo(sp.gx, sp.gy, walkSpeed() * 1.3);
      p.face(table.slot.gx - sp.gx - (table.slot.gy - sp.gy));
    }
    p.pose('sit');
    p.act('eat', 'happy');
    p.say(food.label, 1900, food.icon);
    feedback('light', 'munch');
    await wait(650);
    feedback('light', 'munch');
    await wait(650);
    const r = useApp.getState().record({ type: 'meal', source: table ? 'furniture' : 'quick', value: foodId });
    celebrate(r, petPoint(), food.label);
    p.act('celebrate');
    await wait(1300);
    p.express(null);
    busyRef.current = false;
  };

  const runUse = (id: string) => {
    const def = furnitureById[id];
    const st = useApp.getState();
    const slotId = slotOf(st.placement, id);
    if (!slotId) return;
    const slot = slotById[slotId];
    setSelected(null);
    switch (def.use) {
      case 'sleep':
        void goSleep(slot, def);
        return;
      case 'focus': {
        const sp = useSpotOf(slot, def);
        p.walkTo(sp.gx, sp.gy, walkSpeed());
        onNavigate('focus');
        return;
      }
      case 'records':
        onNavigate('records');
        return;
      case 'meal':
        setSheet('food');
        return;
      case 'sit':
        void sitOn(slot, def);
        return;
      case 'light':
        st.setLamp(!lampLit);
        poke(id);
        feedback('light', 'tap');
        return;
      default:
        if (def.category === 'plant') {
          poke(id);
          const a = anchorOf(slot);
          useFx.getState().float('💧', toDevice({ x: a.x, y: a.y - CALLOUT_LIFT[def.kind] + 20 }), 'plain');
          window.setTimeout(() => useFx.getState().float('✨', toDevice({ x: a.x + 30, y: a.y - CALLOUT_LIFT[def.kind] + 40 }), 'plain'), 260);
          feedback('light', 'pop');
          p.face(slot.gx - p.gx.get() - (slot.gy - p.gy.get()));
          p.act('nod', 'happy');
          window.setTimeout(() => pRef.current.express(null), 1200);
          return;
        }
        enterEdit();
    }
  };

  // ---------- ねる・おきる ----------
  const wake = async () => {
    if (waking) return;
    setWaking(true);
    feedback('success', 'chirp');
    const startOffset = useApp.getState().clockOffset;
    const nowMs = now();
    const h = hourOf(nowMs);
    let target = nowMs;
    // 夜に寝たなら、朝 7:12 まで時計を早送りする（デモで朝の光を見せるため）
    if (h >= 19 || h < 7.2) {
      const d = new Date(nowMs);
      d.setHours(7, 12, 0, 0);
      if (d.getTime() <= nowMs) d.setDate(d.getDate() + 1);
      target = d.getTime();
    }
    if (target > nowMs) {
      await animate(startOffset, startOffset + (target - nowMs), {
        duration: 2.4,
        ease: ease.inOut,
        onUpdate: (v) => useApp.getState().setClockOffset(v),
      });
    }
    const since = useApp.getState().pet.asleepSince ?? now();
    const minutes = clamp(Math.round((now() - since) / 60000 / 15) * 15, 60, 720);
    // 起きた瞬間に部屋を明るくする（睡眠の記録は、このあと聞く）
    useApp.getState().wake();
    setEyesOpen(true);
    setWaking(false);
    p.pose('stand', 'happy');
    const bed = findUse(useApp.getState().placement, 'sleep');
    if (bed) {
      const sp = useSpotOf(bed.slot, bed.def);
      const front = bed.slot.facing === 'L' ? { gx: sp.gx + 0.95, gy: sp.gy + 0.2 } : { gx: sp.gx + 0.2, gy: sp.gy + 0.95 };
      await p.walkTo(front.gx, front.gy, 1.4);
    }
    p.act('stretch');
    p.say('ふぁ〜、おはよ', 2200);
    await wait(700);
    setSleepSheet({ mode: 'wake', minutes });
  };

  const saveSleep = () => {
    const ss = sleepSheet;
    if (!ss) return;
    setSleepSheet(null);
    setEyesOpen(false);
    const r = useApp.getState().record({ type: 'sleep', source: ss.mode === 'wake' ? 'furniture' : 'quick', value: ss.minutes });
    feedback('success', 'chirp');
    useIsland.getState().show({
      icon: <IconSun size={18} />,
      title: 'すいみんを記録した',
      detail: `${formatSleep(ss.minutes)} · 元気 ${r.pet.vitals.energy ?? '?'}`,
      tone: 'good',
      duration: 2400,
    });
    p.act('celebrate', 'happy');
    window.setTimeout(() => pRef.current.express(null), 1500);
    if (ss.mode === 'wake') {
      window.setTimeout(() => {
        const c = useApp.getState().record({ type: 'checkin', source: 'quick' });
        if (c.reward) celebrate(c, petPoint());
      }, 1000);
    }
  };

  const skipSleep = () => {
    setSleepSheet(null);
    setEyesOpen(false);
    if (useApp.getState().pet.asleepSince) useApp.getState().wake();
  };

  // ---------- 描画 ----------
  const selectedPiece = selected ? placed.find((x) => x.def.id === selected) ?? null : null;
  const dragCat = dragId ? categoryOf(dragId) : null;
  const markerSlots = useMemo(() => (dragCat ? (compatibleSlots(SLOTS, dragCat) as RoomSlot[]) : []), [dragCat]);
  const occupied = useMemo(() => new Set(placed.filter((x) => x.def.id !== dragId).map((x) => x.slot.id)), [placed, dragId]);
  const tasksDone = tasks.filter((x) => x.done).length;
  const petPose = visualSleep ? 'sleep' : p.look.pose;
  const petExpr = visualSleep ? 'sleepy' : (p.look.expression ?? cond.modulation.idleExpression);

  return (
    <div className="home" data-active={active} aria-hidden={!active}>
      {/* 上: ペットの名前・レベル・コイン・3 つの値 / もようがえ中は操作の帯 */}
      <div className="home-top">
        <AnimatePresence mode="popLayout" initial={false}>
          {editing ? (
            <motion.div key="edit" className="edit-bar" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={spring.smooth}>
              <Pressable className="edit-undo glass" disabled={!canUndo} onPress={() => useApp.getState().undoPlacement()} aria-label="もとにもどす">
                <IconUndo size={18} />
              </Pressable>
              <div className="edit-title">
                <span className="display">もようがえ</span>
                <span>ドラッグで動かす・下へ運ぶとしまえる</span>
              </div>
              <Pressable className="btn" data-tone="lamp" data-size="s" onPress={exitEdit}>
                できた
              </Pressable>
            </motion.div>
          ) : (
            <motion.div key="hud" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={spring.smooth}>
              <Hud
                pet={pet}
                coins={coins}
                onOpenDetail={() => setSheet('detail')}
                onEnergyUnknown={() => setSleepSheet({ mode: 'later', minutes: 420 })}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 部屋 */}
      <div className="home-room" ref={areaRef}>
        <motion.div className="room-top" animate={{ opacity: editing || visualSleep ? 0 : 1 }} style={{ pointerEvents: editing || visualSleep ? 'none' : 'auto' }}>
          <div className="time-chip glass">
            {hour >= 6 && hour < 18 ? <IconSun size={16} /> : <IconMoon size={16} filled />}
            <span>{labelFor(hour)}</span>
            <span className="num">{hhmm(t)}</span>
          </div>
          <Pressable className="room-edit glass" onPress={enterEdit} aria-label="もようがえ">
            <IconBrush size={17} />
            <span>もようがえ</span>
          </Pressable>
        </motion.div>

        <motion.div
          className="home-zoom"
          data-lifted={dragId !== null}
          animate={{ scale: editing ? 0.86 : 1, y: editing ? -24 : 0 }}
          transition={spring.smooth}
        >
          <div className="home-scene" ref={sceneRef} style={{ width: sceneW, height: sceneW * SCENE_RATIO }} data-editing={editing}>
            <RoomShell hour={hour} onFloorTap={onFloorTap} />
            <div className="scene-layer" style={{ transform: `scale(${s})` }}>
              <SlotMarkers slots={markerSlots} target={dragTarget} occupied={occupied} visible={dragId !== null} />
              {ripples.map((r) => (
                <Ripple key={r.id} at={r.at} onDone={() => setRipples((list) => list.filter((x) => x.id !== r.id))} />
              ))}
              <AnimatePresence>
                {placed.map(({ slot, def }, i) => {
                  const isDrag = dragId === def.id;
                  const facing = isDrag && dragTarget ? slotById[dragTarget].facing : slot.facing;
                  return (
                    <Piece
                      key={def.id}
                      def={def}
                      anchor={anchorOf(slot)}
                      facing={facing}
                      depth={slot.depth}
                      hour={hour}
                      editing={editing}
                      selected={selected === def.id}
                      dragging={isDrag}
                      spawn={spawns.current.get(def.id) ?? null}
                      poke={pokes[def.id] ?? 0}
                      jiggleDelay={-(i * 0.11) % 0.32}
                      register={register}
                      onPointerDown={onPieceDown}
                    />
                  );
                })}
              </AnimatePresence>
              {ghost && <GhostPiece def={furnitureById[ghost]} facing={dragTarget ? slotById[dragTarget].facing : categoryOf(ghost) === 'wall' ? 'WL' : 'C'} hour={hour} x={ghostX} y={ghostY} />}
              <PetSprite
                species={species}
                cx={p.cx}
                cy={p.cy}
                z={p.z}
                pose={petPose}
                expression={petExpr}
                action={visualSleep ? 'none' : p.look.action}
                actionKey={p.look.actionKey}
                modulation={cond.modulation}
                facing={p.look.facing}
                dim={editing}
                onPointerDown={onPetDown}
              />
            </div>
            <RoomTint />
            <div className="scene-overlay">
              <PetBubble bubble={p.bubble} cx={p.cx} cy={p.cy} s={sMV} sleeping={visualSleep} />
              <AnimatePresence>
                {selectedPiece && !editing && (
                  <Callout
                    key={selectedPiece.def.id}
                    def={selectedPiece.def}
                    anchor={anchorOf(selectedPiece.slot)}
                    s={s}
                    sceneW={sceneW}
                    lampLit={lampLit}
                    time={hhmm(t)}
                    onUse={() => runUse(selectedPiece.def.id)}
                    onMove={enterEdit}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 下: きょうの記録 */}
      <motion.div className="today" animate={{ opacity: editing || sleeping ? 0 : 1, y: editing || sleeping ? 16 : 0 }} transition={spring.smooth} style={{ pointerEvents: editing || sleeping ? 'none' : 'auto' }}>
        <TodayTile
          label="すいみん"
          value={summary.sleepMin === null ? '不明' : `${Math.floor(summary.sleepMin / 60)}:${String(summary.sleepMin % 60).padStart(2, '0')}`}
          unknown={summary.sleepMin === null}
          color="var(--sprout)"
          onPress={() => (summary.sleepMin === null ? setSleepSheet({ mode: 'later', minutes: 420 }) : onNavigate('records'))}
        />
        <TodayTile label="ごはん" value={`${summary.meals}回`} color="var(--peach)" onPress={() => setSheet('food')} />
        <TodayTile label="集中" value={`${summary.focusMin}分`} color="var(--sky)" onPress={() => onNavigate('focus')} />
        <TodayTile label="タスク" value={`${tasksDone}/${tasks.length}`} color="var(--berry)" onPress={() => setSheet('tasks')} />
      </motion.div>

      {/* 寝ている間 */}
      <AnimatePresence>
        {visualSleep && !waking && (
          <motion.div key="wake" className="wake" initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }} transition={spring.smooth}>
            <div className="wake-time display num">{hhmm(t)}</div>
            <div className="wake-sub">{pet.name}はねむっています</div>
            <SlideToConfirm label="スライドしておきる" onConfirm={wake} icon={<IconSun size={24} />} />
          </motion.div>
        )}
        {waking && (
          <motion.div key="sweep" className="sweep" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.08 }} transition={spring.smooth}>
            <div className="sweep-time display num">{hhmm(t)}</div>
            <div className="sweep-sub">朝になっていく…</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* もようがえの持ち物（部屋を見ながら操作するので背面は暗くしない） */}
      <BottomSheet open={editing} onClose={exitEdit} detents={[0.25]} modal={false} title={`しまってある家具 · ${stored.length}`} label="しまってある家具">
        <div ref={trayRef} className="tray" data-over={overTray}>
          {stored.length === 0 ? (
            <div className="tray-empty">
              <span>ぜんぶの家具が部屋にあるよ</span>
              <Pressable
                className="btn"
                data-tone="soft"
                data-size="s"
                onPress={() => {
                  exitEdit();
                  onNavigate('shop');
                }}
              >
                お店を見る
              </Pressable>
            </div>
          ) : (
            <div className="tray-list" data-sheet-nodrag>
              <AnimatePresence initial={false}>
                {stored.map((id) => (
                  <motion.button
                    key={id}
                    type="button"
                    className="tray-item"
                    data-picked={ghost === id}
                    layout
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: ghost === id ? 0.3 : 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={spring.snappy}
                    onPointerDown={(e) => onTrayDown(e, id)}
                    aria-label={`${furnitureById[id].name}を部屋に置く`}
                  >
                    <FurnitureThumb def={furnitureById[id]} size={58} />
                    <span>{furnitureById[id].name}</span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
          <motion.div className="tray-drop" animate={{ opacity: overTray ? 1 : 0, scale: overTray ? 1 : 0.96 }} transition={spring.snappy}>
            <IconBox size={20} />
            はなすと、しまえる
          </motion.div>
        </div>
      </BottomSheet>

      <PetDetailSheet open={sheet === 'detail'} onClose={() => setSheet(null)} pet={pet} species={species} cond={cond} />
      <TasksSheet open={sheet === 'tasks'} onClose={() => setSheet(null)} />
      <FoodSheet open={sheet === 'food'} onClose={() => setSheet(null)} onPick={(id) => void eat(id)} petName={pet.name} />
      <SleepSheet
        open={sleepSheet !== null}
        mode={sleepSheet?.mode ?? 'later'}
        minutes={sleepSheet?.minutes ?? 420}
        onChange={(m) => setSleepSheet((x) => (x ? { ...x, minutes: m } : x))}
        onSave={saveSleep}
        onSkip={skipSleep}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Hud({ pet, coins, onOpenDetail, onEnergyUnknown }: { pet: PetSave; coins: number; onOpenDetail: () => void; onEnergyUnknown: () => void }) {
  const pendingCoins = useFx((s) => s.pendingCoins);
  const coinBump = useFx((s) => s.bump.coins);
  const xpBump = useFx((s) => s.bump.xp);
  const coinScale = useMotionValue(1);
  const lvScale = useMotionValue(1);
  useEffect(() => {
    if (coinBump) animate(coinScale, [1, 1.18, 1], { duration: 0.32 });
  }, [coinBump, coinScale]);
  useEffect(() => {
    if (xpBump) animate(lvScale, [1, 1.2, 1], { duration: 0.32 });
  }, [xpBump, lvScale]);
  const need = xpToNext(pet.level);
  const v = pet.vitals;
  const vitals = [
    { key: 'energy', label: '元気', value: v.energy, color: 'var(--sprout)' },
    { key: 'fullness', label: 'おなか', value: v.fullness, color: 'var(--peach)' },
    { key: 'smarts', label: 'かしこさ', value: v.smarts, color: 'var(--sky)' },
  ] as const;

  return (
    <div className="hud">
      <div className="hud-row">
        <Pressable className="hud-pet" onPress={onOpenDetail} depth={0.97} aria-label={`${pet.name}のようすを見る`}>
          <span className="hud-name display">{pet.name}</span>
          <motion.span className="hud-lv num" data-fx-target="xp" style={{ scale: lvScale }}>
            Lv{pet.level}
          </motion.span>
          <span className="hud-xp">
            <Bar value={pet.xp / need} color="linear-gradient(90deg, #ffd36b, #ffb648)" height={7} />
          </span>
        </Pressable>
        <motion.div className="coin-pill glass" data-fx-target="coins" style={{ scale: coinScale }} aria-label={`コイン ${coins}`}>
          <Coin size={22} />
          <Ticker value={coins - pendingCoins} />
        </motion.div>
      </div>
      <div className="vitals">
        {vitals.map((x) => (
          <Pressable
            key={x.key}
            className="vital glass"
            depth={0.95}
            onPress={x.value === null ? onEnergyUnknown : onOpenDetail}
            aria-label={`${x.label} ${x.value === null ? '不明' : Math.round(x.value)}`}
          >
            <Ring value={x.value} color={x.color} size={30} stroke={4.5} />
            <span className="vital-text">
              <span className="vital-label">{x.label}</span>
              <span className="vital-value num" data-unknown={x.value === null}>
                {x.value === null ? '不明' : Math.round(x.value)}
              </span>
            </span>
          </Pressable>
        ))}
      </div>
    </div>
  );
}

function TodayTile({ label, value, color, unknown, onPress }: { label: string; value: string; color: string; unknown?: boolean; onPress: () => void }) {
  return (
    <Pressable className="today-tile glass" depth={0.95} onPress={onPress} data-unknown={!!unknown}>
      <span className="today-dot" style={{ background: color }} />
      <span className="today-label">{label}</span>
      <span className="today-value num">{value}</span>
    </Pressable>
  );
}

function PetBubble({ bubble, cx, cy, s, sleeping }: { bubble: Bubble | null; cx: MotionValue<number>; cy: MotionValue<number>; s: MotionValue<number>; sleeping: boolean }) {
  const x = useTransform(() => (cx.get() - VIEW.x) * s.get());
  const y = useTransform(() => (cy.get() - VIEW.y - (sleeping ? 120 : 196)) * s.get());
  return (
    <motion.div className="bubble-anchor" style={{ x, y }}>
      <AnimatePresence mode="popLayout">
        {bubble && (
          <motion.div
            key={bubble.key}
            className="bubble"
            initial={{ opacity: 0, scale: 0.4, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -6, transition: { duration: 0.16 } }}
            transition={spring.bouncy}
          >
            {bubble.icon && <span className="bubble-icon">{bubble.icon}</span>}
            {bubble.text}
          </motion.div>
        )}
      </AnimatePresence>
      {sleeping && (
        <div className="zzz" aria-hidden>
          <span>z</span>
          <span>z</span>
          <span>Z</span>
        </div>
      )}
    </motion.div>
  );
}

function Callout({
  def,
  anchor,
  s,
  sceneW,
  lampLit,
  time,
  onUse,
  onMove,
}: {
  def: FurnitureDef;
  anchor: Pt;
  s: number;
  sceneW: number;
  lampLit: boolean;
  time: string;
  onUse: () => void;
  onMove: () => void;
}) {
  const ax = (anchor.x - VIEW.x) * s;
  const left = clamp(ax, 104, sceneW - 104);
  const top = (anchor.y - CALLOUT_LIFT[def.kind] - VIEW.y) * s;
  const primary: string | null =
    def.use === 'sleep'
      ? 'ねる'
      : def.use === 'focus'
        ? '集中する'
        : def.use === 'records'
          ? 'きろくを見る'
          : def.use === 'meal'
            ? 'ごはんを記録'
            : def.use === 'sit'
              ? 'すわらせる'
              : def.use === 'light'
                ? lampLit
                  ? 'あかりをけす'
                  : 'あかりをつける'
                : def.use === 'clock'
                  ? null
                  : def.category === 'plant'
                    ? '水をあげる'
                    : '動かす';
  return (
    <div className="callout" style={{ left, top }}>
      <motion.div
        className="callout-inner"
        style={{ transformOrigin: `calc(50% + ${ax - left}px) 100%` }}
        initial={{ opacity: 0, scale: 0.5, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.7, y: 8, transition: { duration: 0.14 } }}
        transition={spring.bouncy}
      >
        <div className="callout-body glass">
          <div className="callout-name">{def.use === 'clock' ? `いま ${time}` : def.name}</div>
          <div className="callout-actions">
            {primary && (
              <Pressable className="callout-btn" data-primary onPress={onUse} haptic="medium">
                {primary}
              </Pressable>
            )}
            {primary !== '動かす' && (
              <Pressable className="callout-btn" onPress={onMove} aria-label={`${def.name}を動かす`}>
                <IconBrush size={16} />
              </Pressable>
            )}
          </div>
        </div>
        <div className="callout-tail" style={{ left: `calc(50% + ${ax - left}px)` }} />
      </motion.div>
    </div>
  );
}
