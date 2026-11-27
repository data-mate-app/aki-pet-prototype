import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { planAssets } from './plan';
import { buildSheet, stemOf, type SheetAsset } from './sheet';

const ids = (svg: string) => [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const refs = (svg: string) => [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);

/** どのアセットにも同じ id（shadow・d-blur）がある絵。実物の書き出しと同じ状況 */
function fake(): SheetAsset {
  return {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -40 80 80" width="80" height="80">\n  <defs>\n    <filter id="d-blur"><feGaussianBlur stdDeviation="2"/></filter>\n  </defs>\n  <g id="shadow" filter="url(#d-blur)">\n    <ellipse cx="0" cy="0" rx="20" ry="8" fill="#000"/>\n  </g>\n</svg>\n',
    viewBox: [-40, -40, 80, 80],
    size: [80, 80],
  };
}

describe('stemOf', () => {
  it('種類を前に付ける（thumb と furniture で重ならない）', () => {
    expect(stemOf('furniture/bed-oat')).toBe('furniture-bed-oat');
    expect(stemOf('thumb/bed-oat')).toBe('thumb-bed-oat');
  });
  it('一覧のすべての path で stem が重ならない', () => {
    const stems = planAssets().map((s) => stemOf(s.path));
    expect(new Set(stems).size).toBe(stems.length);
  });
});

describe('組み立てた sheet.svg', () => {
  const specs = planAssets();

  it('id がすべて一意で、url(#…) の参照先がある', () => {
    const assets = new Map(specs.map((s) => [s.path, fake()]));
    const sheet = buildSheet(specs, assets);
    const list = ids(sheet);
    const dup = list.filter((id, i) => list.indexOf(id) !== i);
    expect(dup).toEqual([]);
    const set = new Set(list);
    expect(refs(sheet).filter((r) => !set.has(r))).toEqual([]);
    expect(list).toContain('thumb-bed-oat');
    expect(list).toContain('furniture-bed-oat');
  });

  const manifestUrl = new URL('../../design/manifest.json', import.meta.url);
  it.skipIf(!existsSync(manifestUrl))('書き出し済みの design/ から組み立てても id が一意', () => {
    const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8')) as { assets: { path: string; svg: string; viewBox: [number, number, number, number]; width: number; height: number }[] };
    const assets = new Map<string, SheetAsset>();
    for (const a of manifest.assets) assets.set(a.path, { svg: readFileSync(new URL(`../../design/${a.svg}`, import.meta.url), 'utf8'), viewBox: a.viewBox, size: [a.width, a.height] });
    const sheet = buildSheet(specs, assets);
    const list = ids(sheet);
    expect(list.filter((id, i) => list.indexOf(id) !== i)).toEqual([]);
    const set = new Set(list);
    expect(refs(sheet).filter((r) => !set.has(r))).toEqual([]);
  });
});
