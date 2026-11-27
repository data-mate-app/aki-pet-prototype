import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { formatHour } from './format';
import { buildPalette, buildTokens, collect, readJapaneseNames, readRootVars } from './palette';
import { innerOf, prefixIds } from './sheet';

const tokensCss = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
const data = collect(tokensCss);

describe('tokens.css の読み取り', () => {
  it('色の変数と日本語名を読む', () => {
    const vars = readRootVars(tokensCss);
    expect(vars.find((v) => v.name === 'ink')?.value).toBe('#252340');
    expect(readJapaneseNames(tokensCss)).toMatchObject({ ink: '夜インク', haze: '朝もや', lamp: 'ランプ', sprout: '若葉', peach: 'もも', sky: 'そら' });
  });
});

describe('palette', () => {
  const ids = (svg: string) => [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  it('id が重ならない', () => {
    const list = ids(buildPalette(data));
    expect(new Set(list).size).toBe(list.length);
  });
  it('部屋の光は 24 時を含まない', () => {
    expect(data.roomHours.map((r) => r.h)).toEqual([0, 5, 7, 12, 16.5, 18.5, 20]);
  });
  it('光のキー時刻は h:mm で書く（16.5 → 16:30）', () => {
    expect(data.roomHours.map((r) => r.label)).toEqual(['0:00', '5:00', '7:00', '12:00', '16:30', '18:30', '20:00']);
    expect(data.roomHours.map((r) => r.label)).toEqual(data.roomHours.map((r) => formatHour(r.h)));
  });
  it('tokens.json は DTCG 2025.10 の形（色はオブジェクト、影は shadow の配列）', () => {
    const t = JSON.parse(buildTokens(data));
    expect(Object.keys(t)).toEqual(['app', 'room-light', 'furniture', 'book', 'pet', 'font']);
    expect(t.app.ink).toMatchObject({ $type: 'color', $value: { colorSpace: 'srgb', alpha: 1, hex: '#252340' } });
    expect(t.app.ink.$value.components).toHaveLength(3);
    expect(typeof t.app.ink.$value).toBe('object');
    expect(t.app['shadow-1'].$type).toBe('shadow');
    expect(t.app['shadow-1'].$value).toHaveLength(2);
    expect(t.app['shadow-1'].$value[0]).toMatchObject({ offsetX: { value: 0, unit: 'px' }, offsetY: { value: 1, unit: 'px' }, blur: { value: 2, unit: 'px' }, spread: { value: 0, unit: 'px' } });
    expect(t.app['shadow-1'].$value[0].color).toMatchObject({ colorSpace: 'srgb', hex: '#252340', alpha: 0.06 });
  });
  it('tokens.json の色の値はどれも DTCG の色オブジェクト（文字列の色が残っていない）', () => {
    const t = JSON.parse(buildTokens(data));
    const bad: string[] = [];
    const visit = (o: Record<string, unknown>, path: string) => {
      if ('$type' in o && o.$type === 'color') {
        const v = o.$value as Record<string, unknown>;
        if (typeof v !== 'object' || v.colorSpace !== 'srgb' || !Array.isArray(v.components) || typeof v.alpha !== 'number') bad.push(path);
      } else if (!('$value' in o)) for (const [k, v] of Object.entries(o)) visit(v as Record<string, unknown>, `${path}.${k}`);
    };
    visit(t, '');
    expect(bad).toEqual([]);
  });
});

describe('sheet の部品', () => {
  it('prefixIds は id と url(#) を付け替える', () => {
    const s = prefixIds('<g id="a" clip-path="url(#b)"><clipPath id="b"/></g>', 'x');
    expect(s).toContain('id="x__a"');
    expect(s).toContain('url(#x__b)');
  });
  it('innerOf は外側の svg を外す', () => {
    expect(innerOf('<svg a="1">\n<g/>\n</svg>\n').trim()).toBe('<g/>');
  });
});
