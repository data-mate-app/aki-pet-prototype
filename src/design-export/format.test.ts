import { describe, expect, it } from 'vitest';
import { fmt, formatHour, inverse, matrixToTransform, mul, parseBoxShadow, parseColor, roundNumbers, toDtcgColor, type Mat } from './format';

describe('fmt / roundNumbers', () => {
  it('小数 3 桁までに丸め、末尾の 0 と -0 を落とす', () => {
    expect(fmt(1.23456)).toBe('1.235');
    expect(fmt(2)).toBe('2');
    expect(fmt(0.5)).toBe('0.5');
    expect(fmt(-0.0001)).toBe('0');
    expect(fmt(-1.2004)).toBe('-1.2');
  });
  it('points や d の中の数値をまとめて丸める', () => {
    expect(roundNumbers('M 0.123456 -4.5 L 10,20.0004')).toBe('M 0.123 -4.5 L 10,20');
    expect(roundNumbers('12.34567,-0.00001')).toBe('12.346,0');
  });
});

describe('roundNumbers は区切りを保つ', () => {
  it('負号が丸めで消えても前の数と繋がらない', () => {
    expect(roundNumbers('M10-0.0001L20 30')).toBe('M10 0L20 30');
    expect(roundNumbers('M10-0.0001-5')).toBe('M10 0-5');
    expect(roundNumbers('M1.5.0004L2 2')).toBe('M1.5 0L2 2');
  });
  it('元から区切りがあるところは増やさない', () => {
    expect(roundNumbers('M10 -0.0001L20,-0.0002')).toBe('M10 0L20,0');
    expect(roundNumbers('M10-5L2-3')).toBe('M10-5L2-3');
    expect(roundNumbers('M.5.5')).toBe('M0.5 0.5');
  });
  it('丸めた結果を数え直すと、数の個数が変わらない', () => {
    const d = 'M10-0.0001L20 30-0.00004.00001-7';
    const count = (s: string) => (s.match(/-?(?:\d+\.?\d*|\.\d+)/g) ?? []).length;
    expect(count(roundNumbers(d))).toBe(count(d));
  });
});

describe('formatHour', () => {
  it('分は 60 進法で書く', () => {
    expect(formatHour(16.5)).toBe('16:30');
    expect(formatHour(18.5)).toBe('18:30');
    expect(formatHour(0)).toBe('0:00');
    expect(formatHour(5)).toBe('5:00');
    expect(formatHour(10 + 10 / 60)).toBe('10:10');
    expect(formatHour(7.9999999)).toBe('8:00');
  });
});

describe('DTCG の値', () => {
  it('色は colorSpace / components / alpha / hex', () => {
    expect(toDtcgColor('#252340')).toEqual({ colorSpace: 'srgb', components: [0.1451, 0.1373, 0.251], alpha: 1, hex: '#252340' });
    expect(toDtcgColor('rgba(37, 35, 64, 0.5)').alpha).toBe(0.5);
  });
  it('影は box-shadow の層ごとのオブジェクトの配列', () => {
    const s = parseBoxShadow('0 1px 2px rgba(37, 35, 64, 0.06), 0 4px 14px rgba(37, 35, 64, 0.06)');
    expect(s).toHaveLength(2);
    expect(s[1]).toMatchObject({ offsetX: { value: 0, unit: 'px' }, offsetY: { value: 4, unit: 'px' }, blur: { value: 14, unit: 'px' }, spread: { value: 0, unit: 'px' } });
    expect(s[1].color.alpha).toBe(0.06);
    expect(() => parseBoxShadow('inset 0 1px red')).toThrow();
  });
});

describe('parseColor', () => {
  it('rgb() は #rrggbb と不透明度 1', () => {
    expect(parseColor('rgb(244, 201, 138)')).toEqual({ hex: '#f4c98a', alpha: 1 });
  });
  it('rgba() は色と不透明度に分ける', () => {
    expect(parseColor('rgba(37, 35, 64, 0.12)')).toEqual({ hex: '#252340', alpha: 0.12 });
  });
  it('transparent は不透明度 0', () => {
    expect(parseColor('rgba(0, 0, 0, 0)')?.alpha).toBe(0);
    expect(parseColor('transparent')?.alpha).toBe(0);
  });
  it('#hex はそのまま、色でなければ null', () => {
    expect(parseColor('#FFF')).toEqual({ hex: '#ffffff', alpha: 1 });
    expect(parseColor('none')).toBeNull();
    expect(parseColor('url("#sky")')).toBeNull();
  });
});

describe('matrixToTransform', () => {
  it('単位行列は省く', () => {
    expect(matrixToTransform([1, 0, 0, 1, 0, 0])).toBeNull();
    expect(matrixToTransform([1, 0, 0, 1, 1e-9, -1e-9])).toBeNull();
  });
  it('平行移動だけなら translate()', () => {
    expect(matrixToTransform([1, 0, 0, 1, 500, 430])).toBe('translate(500 430)');
    expect(matrixToTransform([1, 0, 0, 1, -0.12345, 2])).toBe('translate(-0.123 2)');
  });
  it('それ以外は matrix()', () => {
    expect(matrixToTransform([-1, 0, 0, 1, 0, 0])).toBe('matrix(-1 0 0 1 0 0)');
    expect(matrixToTransform([0.8660254, 0.5, 0, 1, 10, 0])).toBe('matrix(0.866025 0.5 0 1 10 0)');
  });
});

describe('行列の合成と逆行列', () => {
  const m: Mat = [0.866, 0.5, -0.866, 0.5, 12, -7];
  it('inv(m) × m は単位行列', () => {
    const r = mul(inverse(m), m);
    [1, 0, 0, 1, 0, 0].forEach((v, i) => expect(r[i]).toBeCloseTo(v, 9));
  });
  it('親の逆行列 × 自分で、親からの相対になる', () => {
    const parent: Mat = [1, 0, 0, 1, 500, 430];
    const self: Mat = [1, 0, 0, 1, 520, 440];
    expect(matrixToTransform(mul(inverse(parent), self))).toBe('translate(20 10)');
  });
});
