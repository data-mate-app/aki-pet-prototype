import { labelFor } from './daylight';

/** 部屋で流れる BGM。集中しているあいだは音楽を止める（環境音は別に選べる） */
export type MusicScene = 'day' | 'night' | 'none';

export function musicSceneFor(hour: number, { asleep, focusing }: { asleep: boolean; focusing: boolean }): MusicScene {
  if (focusing) return 'none';
  if (asleep) return 'night';
  const label = labelFor(hour);
  return label === '夜' || label === '深夜' ? 'night' : 'day';
}
