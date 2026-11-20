import type { FurnitureCategory } from '../domain/room';

/**
 * 家具カタログ。New Roots と同じく「持っている家具」と「置いている家具」は別に持つ
 * （持ち物は store の owned、置き場所は placement）。
 *
 * use: 家具そのものが生活記録の入口になる（SVG 整理の「ベッドで就寝入力」「本棚で履歴」）
 */
export type FurnitureKind =
  | 'bed'
  | 'desk'
  | 'bookshelf'
  | 'lowtable'
  | 'cushion'
  | 'beanbag'
  | 'plant'
  | 'cactus'
  | 'lamp'
  | 'rug'
  | 'clock'
  | 'poster';

export type FurnitureUse = 'sleep' | 'focus' | 'records' | 'meal' | 'sit' | 'light' | 'clock';

export type FurnitureDef = {
  id: string;
  name: string;
  kind: FurnitureKind;
  category: FurnitureCategory;
  /** 主色 */
  color: string;
  /** 差し色 */
  accent: string;
  price: number;
  use?: FurnitureUse;
  blurb: string;
  /** ペットが使うときに立つ位置（家具中心からのマス数、正面向き基準） */
  petSpot?: { gx: number; gy: number };
};

export const FURNITURE: FurnitureDef[] = [
  { id: 'bed-oat', name: 'ふかふかベッド', kind: 'bed', category: 'bed', color: '#c99a6b', accent: '#8fb3e8', price: 0, use: 'sleep', blurb: 'タップで「ねる」。起きると睡眠時間が元気になる', petSpot: { gx: 0.15, gy: 0 } },
  { id: 'desk-birch', name: 'まどべの机', kind: 'desk', category: 'desk', color: '#d8b48a', accent: '#5b6cff', price: 0, use: 'focus', blurb: 'タップで集中モードへ', petSpot: { gx: 0, gy: 0.75 } },
  { id: 'shelf-walnut', name: 'きろくの本棚', kind: 'bookshelf', category: 'shelf', color: '#9b6b4a', accent: '#ff8a8a', price: 0, use: 'records', blurb: 'これまでの記録が並ぶ', petSpot: { gx: 0, gy: 0.6 } },
  { id: 'table-round', name: 'まるいちゃぶ台', kind: 'lowtable', category: 'table', color: '#c08a5b', accent: '#ffffff', price: 0, use: 'meal', blurb: 'タップで「ごはんを記録」', petSpot: { gx: 0.55, gy: 0.55 } },
  { id: 'cushion-mint', name: 'ざぶとん', kind: 'cushion', category: 'seat', color: '#7fd3b8', accent: '#ffffff', price: 0, use: 'sit', blurb: 'ペットのお気に入りの場所', petSpot: { gx: 0, gy: 0 } },
  { id: 'plant-monstera', name: 'モンステラ', kind: 'plant', category: 'plant', color: '#4fae7b', accent: '#e9d8c4', price: 0, blurb: '部屋にみどりを' },
  { id: 'rug-wave', name: 'なみのラグ', kind: 'rug', category: 'rug', color: '#9fb0ff', accent: '#eef1ff', price: 0, blurb: '床のまんなかに敷く' },
  { id: 'clock-round', name: 'かべどけい', kind: 'clock', category: 'wall', color: '#ffffff', accent: '#252340', price: 0, use: 'clock', blurb: 'いまの時刻を指す' },

  { id: 'lamp-amber', name: 'あかりスタンド', kind: 'lamp', category: 'light', color: '#ffcf7a', accent: '#5a4a3a', price: 24, use: 'light', blurb: '夜になると灯る' },
  { id: 'poster-hill', name: 'おかのポスター', kind: 'poster', category: 'wall', color: '#ffd8a8', accent: '#4cc49d', price: 12, blurb: '壁に飾る' },
  { id: 'beanbag-berry', name: 'ビーズクッション', kind: 'beanbag', category: 'seat', color: '#ff8fb0', accent: '#ffffff', price: 30, use: 'sit', blurb: 'しずみこむ座りごこち', petSpot: { gx: 0, gy: 0 } },
  { id: 'cactus-trio', name: 'サボテン三兄弟', kind: 'cactus', category: 'plant', color: '#6cc08b', accent: '#f2c9a0', price: 16, blurb: 'ちいさな鉢がみっつ' },
  { id: 'rug-sun', name: 'おひさまラグ', kind: 'rug', category: 'rug', color: '#ffc867', accent: '#fff3d6', price: 28, blurb: '明るい黄色のまるいラグ' },
  { id: 'bed-mint', name: 'ミントのベッド', kind: 'bed', category: 'bed', color: '#e9e4f5', accent: '#6fd0b2', price: 60, use: 'sleep', blurb: 'さわやかな寝ごこち', petSpot: { gx: 0.15, gy: 0 } },
  { id: 'poster-night', name: 'よぞらのポスター', kind: 'poster', category: 'wall', color: '#2c3570', accent: '#ffd36b', price: 14, blurb: '星と月の絵' },
  { id: 'plant-pothos', name: 'ポトス', kind: 'plant', category: 'plant', color: '#7ccf6a', accent: '#c7b8f2', price: 18, blurb: 'つるがのびる' },
];

export const furnitureById = Object.fromEntries(FURNITURE.map((f) => [f.id, f])) as Record<string, FurnitureDef>;

export const categoryOf = (id: string) => furnitureById[id].category;

export const CATEGORY_LABEL: Record<FurnitureCategory, string> = {
  bed: 'ベッド',
  desk: 'つくえ',
  shelf: 'たな',
  table: 'テーブル',
  seat: 'すわる',
  plant: 'しょくぶつ',
  light: 'あかり',
  rug: 'ラグ',
  wall: 'かべ',
};
