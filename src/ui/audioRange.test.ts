import { describe, expect, it } from 'vitest';
import { audibleRange } from './audioRange';

const wave = (lead: number, body: number, tail: number) => {
  const a = new Float32Array(lead + body + tail);
  for (let i = 0; i < body; i++) a[lead + i] = Math.sin(i / 3) * 0.5 + 0.2;
  return a;
};

describe('audibleRange', () => {
  it('先頭と末尾の無音を除く', () => {
    expect(audibleRange([wave(1105, 4000, 300)])).toEqual([1105, 5105]);
  });

  it('どれかのチャンネルが鳴っていれば音があるとみなす', () => {
    const left = new Float32Array(100);
    const right = new Float32Array(100);
    right[10] = 0.3;
    right[80] = 0.3;
    expect(audibleRange([left, right])).toEqual([10, 81]);
  });

  it('しきい値以下のごく小さな値は無音として扱う', () => {
    const a = wave(50, 100, 50);
    a[10] = 0.00005;
    expect(audibleRange([a])).toEqual([50, 150]);
  });

  it('すべて無音なら全体を返す', () => {
    expect(audibleRange([new Float32Array(64)])).toEqual([0, 64]);
    expect(audibleRange([new Float32Array(0)])).toEqual([0, 0]);
  });

  it('maxScan より内側の静かな部分は削らない', () => {
    // 先頭 2000 サンプルが無音でも、探すのが 1000 までなら削らない（曲のイントロの静けさ）
    expect(audibleRange([wave(2000, 3000, 2000)], 1e-4, 1000)).toEqual([0, 7000]);
    // 端の無音が maxScan 以内なら削る
    expect(audibleRange([wave(800, 3000, 600)], 1e-4, 1000)).toEqual([800, 3800]);
  });
});
