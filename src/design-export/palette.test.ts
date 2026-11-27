import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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
  it('tokens.json は DTCG の形で、色は hex', () => {
    const t = JSON.parse(buildTokens(data));
    expect(Object.keys(t)).toEqual(['app', 'room-light', 'furniture', 'book', 'pet', 'font']);
    expect(t.app.ink).toMatchObject({ $type: 'color', $value: '#252340' });
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
