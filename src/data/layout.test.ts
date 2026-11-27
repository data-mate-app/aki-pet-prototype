import { describe, expect, it } from 'vitest';
import { nearestSlot } from '../domain/room';
import { anchorOf, isWallSlot, probeOf } from '../screens/home/geometry';
import { SLOTS } from './layout';

describe('置き場所データ', () => {
  for (const s of SLOTS) {
    for (const c of s.accepts) {
      it(`${s.id} / ${c}: 基準点まで運ぶとその置き場所に吸い付く`, () => {
        const probe = probeOf(anchorOf(s), isWallSlot(s));
        expect(nearestSlot(SLOTS, probe, c, 140)?.id).toBe(s.id);
      });
    }
  }
});
