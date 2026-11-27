import { FURNITURE, type FurnitureDef } from '../data/furniture';
import { SLOTS } from '../data/layout';
import { SPECIES } from '../data/species';
import { MODS, type Action, type Expression, type Mood, type Modulation, type Pose, type SpeciesId } from '../domain/pet';

/**
 * 書き出す一覧（名前・変種・時刻）。純粋関数だけで作る。
 * 絵を描く側（main.tsx）と、ファイルを書く側（scripts/design-export.mjs）が同じ一覧を見る。
 */

export type FurnitureVariant = 'plain' | 'mirrored' | 'wall-left' | 'wall-right';
export type TimeOfDay = 'day' | 'night';

type Base = {
  /** 出力のパス（design/svg/ からの相対、拡張子なし）。一覧の中で重ならない */
  path: string;
  label: string;
};

export type FurnitureSpec = Base & { kind: 'furniture'; furnitureId: string; variant: FurnitureVariant; time: TimeOfDay | null; hour: number };
export type ThumbSpec = Base & { kind: 'thumb'; furnitureId: string };
export type PetSpec = Base & { kind: 'pet'; speciesId: SpeciesId; state: PetStateId };
export type RoomSpec = Base & { kind: 'room'; time: TimeOfDay; hour: number };
export type RoomTintSpec = Base & { kind: 'room-tint'; time: TimeOfDay; hour: number };
export type IconSpec = Base & { kind: 'icon' };
export type AssetSpec = FurnitureSpec | ThumbSpec | PetSpec | RoomSpec | RoomTintSpec | IconSpec;

/** 昼 12:00・夜 21:00。時計だけ昼 10:10 */
export const HOUR = { day: 12, night: 21, clockDay: 10 + 10 / 60 } as const;

/** 時刻で絵が変わる家具 */
const TIMED_KINDS: FurnitureDef['kind'][] = ['desk', 'clock', 'lamp'];

/**
 * 置き場所（SLOTS）の向きから、その家具の書き出す変種を導く。
 *   R / C / F → 変種なし（描いたまま）
 *   L         → mirrored（PieceSvg と同じく mirrored で描いて scale(-1 1)）
 *   WL / WR   → 平らな正面（plain）に加えて wall-left / wall-right
 */
export function furnitureVariants(def: FurnitureDef): FurnitureVariant[] {
  const facings = new Set(SLOTS.filter((s) => s.accepts.includes(def.category)).map((s) => s.facing));
  const out: FurnitureVariant[] = [];
  if (facings.has('R') || facings.has('C') || facings.has('F') || facings.has('WL') || facings.has('WR')) out.push('plain');
  if (facings.has('L')) out.push('mirrored');
  if (facings.has('WL')) out.push('wall-left');
  if (facings.has('WR')) out.push('wall-right');
  if (out.length === 0) throw new Error(`置き場所のない家具: ${def.id}`);
  return out;
}

const VARIANT_LABEL: Record<FurnitureVariant, string> = {
  plain: '',
  mirrored: '左右反転',
  'wall-left': '左の壁',
  'wall-right': '右の壁',
};
const TIME_LABEL: Record<TimeOfDay, string> = { day: '昼', night: '夜' };

function furnitureSpecs(def: FurnitureDef): FurnitureSpec[] {
  const times: (TimeOfDay | null)[] = TIMED_KINDS.includes(def.kind) ? ['day', 'night'] : [null];
  const out: FurnitureSpec[] = [];
  for (const variant of furnitureVariants(def)) {
    for (const time of times) {
      const hour = time === null ? HOUR.day : time === 'night' ? HOUR.night : def.kind === 'clock' ? HOUR.clockDay : HOUR.day;
      const path = `furniture/${def.id}${variant === 'plain' ? '' : '_' + variant}${time ? '_' + time : ''}`;
      const labels = [def.name, VARIANT_LABEL[variant], time ? TIME_LABEL[time] : ''].filter(Boolean);
      out.push({ kind: 'furniture', path, label: labels.join('・'), furnitureId: def.id, variant, time, hour });
    }
  }
  return out;
}

// ---------- ペット ----------

export type PetStateId =
  | 'stand'
  | 'happy'
  | 'love'
  | 'surprised'
  | 'sleepy'
  | 'tired'
  | 'bored'
  | 'focused'
  | 'walk'
  | 'sit'
  | 'lie'
  | 'sleep'
  | 'jump'
  | 'celebrate'
  | 'eat'
  | 'study'
  | 'yawn';

export type PetState = { id: PetStateId; label: string; pose: Pose; expression: Expression; action: Action; mood: Mood };

/**
 * ペットの 17 状態。作業票の表のとおり。アプリ（Home.tsx・usePet.ts・Focus.tsx）で実際に出る
 * 組み合わせと違うものは、アプリに合わせて直してある（eat は p.pose('sit') のあと p.act('eat') なので sit）。
 */
export const PET_STATES: PetState[] = [
  { id: 'stand', label: 'ふつう', pose: 'stand', expression: 'neutral', action: 'none', mood: 'calm' },
  { id: 'happy', label: 'よろこぶ', pose: 'stand', expression: 'happy', action: 'none', mood: 'happy' },
  { id: 'love', label: 'なでられる', pose: 'stand', expression: 'love', action: 'none', mood: 'happy' },
  { id: 'surprised', label: 'おどろく', pose: 'stand', expression: 'surprised', action: 'none', mood: 'calm' },
  { id: 'sleepy', label: 'ねむい', pose: 'stand', expression: 'sleepy', action: 'none', mood: 'sleepy' },
  { id: 'tired', label: 'つかれた', pose: 'stand', expression: 'tired', action: 'none', mood: 'tired' },
  { id: 'bored', label: 'たいくつ', pose: 'stand', expression: 'bored', action: 'none', mood: 'bored' },
  { id: 'focused', label: 'しゅうちゅう', pose: 'sit', expression: 'focused', action: 'none', mood: 'calm' },
  { id: 'walk', label: 'あるく', pose: 'walk', expression: 'neutral', action: 'none', mood: 'calm' },
  { id: 'sit', label: 'すわる', pose: 'sit', expression: 'neutral', action: 'none', mood: 'calm' },
  { id: 'lie', label: 'ねそべる', pose: 'lie', expression: 'neutral', action: 'none', mood: 'calm' },
  { id: 'sleep', label: 'ねむる', pose: 'sleep', expression: 'neutral', action: 'none', mood: 'asleep' },
  { id: 'jump', label: 'ジャンプ', pose: 'stand', expression: 'happy', action: 'jump', mood: 'happy' },
  { id: 'celebrate', label: 'おいわい', pose: 'stand', expression: 'happy', action: 'celebrate', mood: 'happy' },
  { id: 'eat', label: 'たべる', pose: 'sit', expression: 'happy', action: 'eat', mood: 'calm' },
  { id: 'study', label: 'べんきょう', pose: 'sit', expression: 'focused', action: 'study', mood: 'calm' },
  { id: 'yawn', label: 'あくび', pose: 'stand', expression: 'sleepy', action: 'yawn', mood: 'sleepy' },
];

export function modulationOf(state: PetState): Modulation {
  return MODS[state.mood];
}

/** 表との違い（報告用）。plan.test.ts で表と照合している */
export const PET_STATE_OVERRIDES: { id: PetStateId; field: 'pose'; ticket: Pose; app: Pose; why: string }[] = [
  { id: 'eat', field: 'pose', ticket: 'stand', app: 'sit', why: 'Home.tsx: p.pose(\'sit\') のあと p.act(\'eat\', \'happy\')' },
];

// ---------- 一覧 ----------

export function planAssets(): AssetSpec[] {
  const out: AssetSpec[] = [];
  for (const def of FURNITURE) out.push(...furnitureSpecs(def));
  for (const def of FURNITURE) out.push({ kind: 'thumb', path: `thumb/${def.id}`, label: `${def.name}（おみせの絵）`, furnitureId: def.id });
  for (const sp of SPECIES) {
    for (const st of PET_STATES) {
      out.push({ kind: 'pet', path: `pet/${sp.id}_${st.id}`, label: `${sp.label}（${sp.animal}）／${st.label}`, speciesId: sp.id, state: st.id });
    }
  }
  out.push({ kind: 'room', path: 'room/room_day', label: '部屋（昼）', time: 'day', hour: HOUR.day });
  out.push({ kind: 'room', path: 'room/room_night', label: '部屋（夜）', time: 'night', hour: HOUR.night });
  out.push({ kind: 'room-tint', path: 'room/room-tint_night', label: '部屋の夜の色かぶせ（家具の上に重ねる）', time: 'night', hour: HOUR.night });
  out.push({ kind: 'icon', path: 'icon/app-icon', label: 'アプリアイコン' });
  return out;
}
