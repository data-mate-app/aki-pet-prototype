import { describe, expect, it } from 'vitest';
import { musicSceneFor } from './soundscape';

const awake = { asleep: false, focusing: false };

describe('musicSceneFor', () => {
  it('朝・昼・夕方は昼の曲、夜・深夜は夜の曲', () => {
    expect(musicSceneFor(7, awake)).toBe('day');
    expect(musicSceneFor(13.5, awake)).toBe('day');
    expect(musicSceneFor(18.9, awake)).toBe('day');
    expect(musicSceneFor(19, awake)).toBe('night');
    expect(musicSceneFor(23.5, awake)).toBe('night');
    expect(musicSceneFor(2, awake)).toBe('night');
  });

  it('寝ているあいだは昼でも夜の曲', () => {
    expect(musicSceneFor(13, { asleep: true, focusing: false })).toBe('night');
  });

  it('集中しているあいだは音楽を止める', () => {
    expect(musicSceneFor(13, { asleep: false, focusing: true })).toBe('none');
    expect(musicSceneFor(22, { asleep: true, focusing: true })).toBe('none');
  });
});
