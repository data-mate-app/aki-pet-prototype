import type { SpeciesDef, SpeciesId } from '../domain/pet';

/**
 * 3 種族。見た目・動き・好みの違いはこのデータだけで表し、
 * 描画とアニメーションは共通の部品（Pet.tsx）が受け持つ。
 * 新しい種族はここに 1 件足し、耳としっぽの型を選べば動く。
 */
export const SPECIES: SpeciesDef[] = [
  {
    id: 'komugi',
    label: 'こむぎ',
    animal: 'いぬ',
    temperament: 'genki',
    temperamentLabel: '元気',
    blurb: 'よく走りまわる。ほめられるのが好き',
    palette: { body: '#f4c98a', belly: '#fff3dc', accent: '#c98a52', cheek: '#ff9c86', line: '#4b3324' },
    ears: 'floppy',
    tail: 'wag',
    motion: { walkSpeed: 1.25, bounce: 9, breath: 2.6, blinkEvery: [2200, 4200], wander: 0.85 },
    likes: { furniture: ['cushion-mint', 'rug-sun'], food: ['onigiri', 'curry'] },
  },
  {
    id: 'omochi',
    label: 'おもち',
    animal: 'くま',
    temperament: 'nonbiri',
    temperamentLabel: 'のんびり',
    blurb: 'ゆっくり歩く。ベッドとおやつに弱い',
    palette: { body: '#ffd7df', belly: '#fff6f7', accent: '#e99aae', cheek: '#ff8fa6', line: '#4a3342' },
    ears: 'round',
    tail: 'puff',
    motion: { walkSpeed: 0.75, bounce: 4, breath: 3.6, blinkEvery: [3200, 6000], wander: 0.4 },
    likes: { furniture: ['bed-mint', 'beanbag-berry'], food: ['sweets', 'bread'] },
  },
  {
    id: 'potato',
    label: 'ぽてと',
    animal: 'ねこ',
    temperament: 'koukishin',
    temperamentLabel: '好奇心',
    blurb: '新しい家具をすぐ調べにいく。高いところが好き',
    palette: { body: '#aab3cf', belly: '#f1f3fb', accent: '#7c86a8', cheek: '#ffa0b4', line: '#2f3150' },
    ears: 'pointy',
    tail: 'curl',
    motion: { walkSpeed: 1, bounce: 6, breath: 3, blinkEvery: [2600, 5200], wander: 0.65 },
    likes: { furniture: ['shelf-walnut', 'cactus-trio'], food: ['salad', 'noodle'] },
  },
];

export const speciesById = Object.fromEntries(SPECIES.map((s) => [s.id, s])) as Record<SpeciesId, SpeciesDef>;

export const FOODS = [
  { id: 'onigiri', label: 'おにぎり', icon: '🍙' },
  { id: 'bread', label: 'パン', icon: '🍞' },
  { id: 'noodle', label: 'めん', icon: '🍜' },
  { id: 'curry', label: 'カレー', icon: '🍛' },
  { id: 'salad', label: 'サラダ', icon: '🥗' },
  { id: 'sweets', label: 'おやつ', icon: '🍪' },
] as const;

export const foodById = Object.fromEntries(FOODS.map((f) => [f.id, f])) as Record<string, (typeof FOODS)[number]>;
