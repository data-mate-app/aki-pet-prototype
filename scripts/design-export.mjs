#!/usr/bin/env node
/**
 * デザイン書き出し。pnpm design:export
 *  1. Vite を自前で起動し、書き出し用のページ（src/design-export/index.html）を開く（Google Chrome が要る）
 *  2. アセットを 1 つずつ描いて止め、SVG にする
 *  3. 実物（a）と、書き出した SVG だけを描いたもの（b）を 2 倍で撮って画素で比べる
 *  4. 一時ディレクトリへ svg・png・manifest.json などを書く（b が PNG になる）
 *  5. 最後まで成功し、全件が閾値内のときだけ、design/ の生成物と差し替える（途中で失敗したら design/ は前回のまま）
 * フォントが読めない、途中で例外、0.5% を超えるアセットがある、のどれかなら終了コード 1。
 */
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// 確認用: DESIGN_OUT で出力先、DESIGN_ONLY（正規表現）で対象を絞れる。ふだんは使わない
const OUT = process.env.DESIGN_OUT ?? join(root, 'design');
// DESIGN_ONLY は出力先を DESIGN_OUT で別に指定したときだけ。なしで使うと design/ の全件が一部だけに置き換わる
if (process.env.DESIGN_ONLY && !process.env.DESIGN_OUT) {
  console.error('DESIGN_ONLY は DESIGN_OUT（出力先）と一緒にだけ使えます。design/ を一部のアセットだけに置き換えないためです。');
  process.exit(1);
}
const THRESHOLD = 0.005; // 差のある画素の割合
const CHANNEL_DIFF = 24; // 1 チャンネルの差
const MARGIN = 8; // viewBox の外側も撮る（範囲の測り漏れを見つけるため）
const FONTS = 'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Zen+Maru+Gothic:wght@500;700;900&display=swap';

/**
 * 描画に使うフォントが本当に読めているか。document.fonts.check は @font-face が 1 つもないと true を返すので使わない
 * （CSS が取れないとき代替フォントで黙って描いてしまう）。読めなければ例外。
 */
const FONT_NEEDS = [
  ['Dela Gothic One 400', '400 20px "Dela Gothic One"', 'zZ'],
  ['Zen Maru Gothic 500', '500 20px "Zen Maru Gothic"', 'あ'],
  ['Zen Maru Gothic 700', '700 20px "Zen Maru Gothic"', 'あ'],
  ['Zen Maru Gothic 900', '900 20px "Zen Maru Gothic"', 'あ'],
];
async function ensureFonts(page, where) {
  const missing = await page.evaluate(async (needs) => {
    const out = [];
    for (const [name, font, text] of needs) {
      let faces = [];
      try {
        faces = await document.fonts.load(font, text);
      } catch {
        faces = [];
      }
      if (faces.length === 0 || faces.some((f) => f.status !== 'loaded')) out.push(name);
    }
    await document.fonts.ready;
    return out;
  }, FONT_NEEDS);
  if (missing.length) throw new Error(`フォントを読めない（${where}）: ${missing.join(', ')}。ネットワーク（fonts.googleapis.com）を確かめてください。代替フォントでは書き出しません`);
}

// 途中の出力はここへ。最後まで成功したときだけ OUT へ差し替える
await mkdir(OUT, { recursive: true });
const STAGE = await mkdtemp(join(dirname(OUT), '.design-export-'));

const server = await createServer({ root, configFile: join(root, 'vite.config.ts'), server: { host: '127.0.0.1', port: 5399, strictPort: false }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];

// --disable-gpu: ぼかしの影の薄い縁が実行のたびに 1 バイト単位で変わるのを避ける（ソフトウェア描画なら毎回同じ）
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu', ...(process.env.DESIGN_CHROME_ARGS ?? '').split(' ').filter(Boolean)] });
let exitCode = 0;
try {
  const context = await browser.newContext({ viewport: { width: 1800, height: 1800 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const app = await context.newPage();
  app.on('pageerror', (e) => console.error('[page error]', e.message));
  app.on('console', (m) => (m.type() === 'error' ? console.error('[console]', m.text()) : undefined));
  await app.goto(new URL('src/design-export/index.html', base).href);
  await app.waitForFunction(() => document.documentElement.dataset.ready === 'true');

  const plain = await context.newPage();
  await plain.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><link href="${FONTS}" rel="stylesheet"><style>html,body{margin:0;background:transparent}body{overflow:hidden}svg{display:block}#b{position:absolute}</style></head><body><div id="b"></div></body></html>`,
    { waitUntil: 'networkidle' },
  );
  await ensureFonts(app, '実物のページ');
  await ensureFonts(plain, '比較のページ');

  const only = process.env.DESIGN_ONLY ? new RegExp(process.env.DESIGN_ONLY) : null;
  const specs = (await app.evaluate(() => window.__design.specs)).filter((s) => !only || only.test(s.path));
  const iconSvg = await readFile(join(root, 'public/icon.svg'), 'utf8');

  const results = [];
  const manifest = [];
  const sheetAssets = new Map();
  for (const spec of specs) {
    const info = await app.evaluate((p) => window.__design.render(p), spec.path);
    const svg = info.svg ?? iconSvg;
    const m = MARGIN;
    const shotA = await app.screenshot({ clip: { x: info.clip.x - m, y: info.clip.y - m, width: info.clip.width + 2 * m, height: info.clip.height + 2 * m }, omitBackground: true });

    const svgForPage = info.svg ? svg : svg.replace('<svg ', `<svg width="${info.size[0]}" height="${info.size[1]}" `);
    // 実物（a）と同じページ上の位置・同じ大きさのページに置く（描画の格子が同じになり、縁の差が出にくい）
    await plain.evaluate(
      async ([s, x, y]) => {
        const b = document.getElementById('b');
        b.style.left = x + 'px';
        b.style.top = y + 'px';
        b.innerHTML = s;
        await document.fonts.ready;
      },
      [svgForPage, info.clip.x, info.clip.y],
    );
    const shotB = await plain.screenshot({ clip: { x: info.clip.x - m, y: info.clip.y - m, width: info.clip.width + 2 * m, height: info.clip.height + 2 * m }, omitBackground: true });
    const png = await plain.screenshot({ clip: { x: info.clip.x, y: info.clip.y, width: info.clip.width, height: info.clip.height }, omitBackground: true });

    if (process.env.DESIGN_DEBUG_DIR) {
      const name = spec.path.replace(/\//g, '__');
      await mkdir(process.env.DESIGN_DEBUG_DIR, { recursive: true });
      await writeFile(join(process.env.DESIGN_DEBUG_DIR, `${name}_a.png`), shotA);
      await writeFile(join(process.env.DESIGN_DEBUG_DIR, `${name}_b.png`), shotB);
    }
    const diff = await plain.evaluate(
      async ([a, b, tol]) => {
        const load = (b64) =>
          new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = () => rej(new Error('画像を読めない'));
            img.src = 'data:image/png;base64,' + b64;
          });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        if (ia.width !== ib.width || ia.height !== ib.height) return { error: `大きさが違う ${ia.width}x${ia.height} / ${ib.width}x${ib.height}` };
        const read = (img) => {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          return ctx.getImageData(0, 0, img.width, img.height).data;
        };
        const da = read(ia);
        const db = read(ib);
        let diff = 0;
        let drawn = 0;
        for (let i = 0; i < da.length; i += 4) {
          if (da[i + 3] > 0 || db[i + 3] > 0) drawn++;
          // 透明に近い画素の色はノイズなので、アルファを掛けた値（premultiplied）で比べる
          const aa = da[i + 3];
          const ab = db[i + 3];
          if (
            Math.abs(aa - ab) > tol ||
            Math.abs((da[i] * aa) / 255 - (db[i] * ab) / 255) > tol ||
            Math.abs((da[i + 1] * aa) / 255 - (db[i + 1] * ab) / 255) > tol ||
            Math.abs((da[i + 2] * aa) / 255 - (db[i + 2] * ab) / 255) > tol
          )
            diff++;
        }
        return { diff, drawn, width: ia.width, height: ia.height };
      },
      [shotA.toString('base64'), shotB.toString('base64'), CHANNEL_DIFF],
    );
    if (diff.error) throw new Error(`${spec.path}: ${diff.error}`);
    const fraction = diff.drawn === 0 ? 1 : diff.diff / diff.drawn;
    results.push({ path: spec.path, fraction, diff: diff.diff, drawn: diff.drawn });

    const svgPath = join(STAGE, 'svg', `${spec.path}.svg`);
    const pngPath = join(STAGE, 'png', `${spec.path}@2x.png`);
    await mkdir(dirname(svgPath), { recursive: true });
    await mkdir(dirname(pngPath), { recursive: true });
    await writeFile(svgPath, svg);
    await writeFile(pngPath, png);
    manifest.push({
      path: spec.path,
      kind: spec.kind,
      label: spec.label,
      svg: `svg/${spec.path}.svg`,
      png: `png/${spec.path}@2x.png`,
      viewBox: info.viewBox,
      width: info.size[0],
      height: info.size[1],
      anchor: spec.kind === 'icon' ? { x: 0, y: 0 } : { x: -info.viewBox[0], y: -info.viewBox[1] },
    });
    sheetAssets.set(spec.path, { svg, viewBox: info.viewBox, size: info.size });
    await app.evaluate(() => window.__design.clear());
    process.stdout.write(`\r${manifest.length}/${specs.length} ${spec.path}                    `);
  }
  process.stdout.write('\n');

  await writeFile(join(STAGE, 'manifest.json'), JSON.stringify({ assets: manifest }, null, 2) + '\n');

  if (!only) {
    // 一覧シートと色・文字の一覧（書き出し済みの SVG から組み立てる。描き直さない）
    const { buildSheet } = await server.ssrLoadModule('/src/design-export/sheet.ts');
    const { buildPalette, buildTokens } = await server.ssrLoadModule('/src/design-export/palette.ts');
    const files = { sheet: buildSheet(specs, sheetAssets), palette: buildPalette() };
    await writeFile(join(STAGE, 'sheet.svg'), files.sheet);
    await writeFile(join(STAGE, 'palette.svg'), files.palette);
    await writeFile(join(STAGE, 'tokens.json'), buildTokens());
    const shotCtx = await browser.newContext({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    for (const name of ['sheet', 'palette']) {
      const page = await shotCtx.newPage();
      const svgText = files[name];
      const m = svgText.match(/viewBox="0 0 (\d+) (\d+)"/);
      const [w, h] = [Number(m[1]), Number(m[2])];
      await page.setViewportSize({ width: w, height: h });
      await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><link href="${FONTS}" rel="stylesheet"><style>html,body{margin:0}svg{display:block}</style></head><body>${svgText}</body></html>`, { waitUntil: 'networkidle' });
      await ensureFonts(page, `${name}.png のページ`);
      await writeFile(join(STAGE, `${name}.png`), await page.screenshot({ clip: { x: 0, y: 0, width: w, height: h } }));
      await page.close();
    }
    await shotCtx.close();
  }

  const sorted = [...results].sort((a, b) => b.fraction - a.fraction || a.path.localeCompare(b.path));
  const pct = (f) => (f * 100).toFixed(3) + '%';
  console.log(`比較（アルファを掛けた各チャンネルの差 > ${CHANNEL_DIFF} の画素 / 描かれた画素。閾値 ${pct(THRESHOLD)}）`);
  console.log(`最大: ${pct(sorted[0].fraction)}  ${sorted[0].path}`);
  console.log('上位 5 件:');
  for (const r of sorted.slice(0, 5)) console.log(`  ${pct(r.fraction).padStart(8)}  ${r.diff}/${r.drawn}  ${r.path}`);
  const over = sorted.filter((r) => r.fraction > THRESHOLD);
  if (over.length) {
    console.error(`閾値を超えたアセット ${over.length} 件:`);
    for (const r of over) console.error(`  ${pct(r.fraction)}  ${r.path}`);
    exitCode = 1;
  } else {
    console.log(`全 ${results.length} 件が閾値内`);
  }
  if (exitCode === 0) {
    // 全件成功。生成物だけ差し替える（README.md など手書きのものは触らない）
    for (const name of ['svg', 'png', 'manifest.json', ...(only ? [] : ['sheet.svg', 'sheet.png', 'palette.svg', 'palette.png', 'tokens.json'])]) {
      await rm(join(OUT, name), { recursive: true, force: true });
      await rename(join(STAGE, name), join(OUT, name));
    }
  } else {
    console.error(`失敗したので ${OUT} は前回のままです`);
  }
} catch (e) {
  console.error(e);
  exitCode = 1;
} finally {
  await browser.close();
  await server.close();
  await rm(STAGE, { recursive: true, force: true });
}
process.exit(exitCode);
