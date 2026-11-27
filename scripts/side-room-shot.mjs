#!/usr/bin/env node
/**
 * 横スクロールの「へや」別案の撮影。
 *   先に `pnpm dev` を起動してから: node scripts/side-room-shot.mjs http://localhost:5320/side-room.html
 * docs/mockups/side-room/ に次を書く（Google Chrome が要る）。
 *   chanoma.png / nedoko.png / tsukue.png / genkan.png … 375×812 ×2、isMobile・hasTouch
 *   panorama.png … 帯だけ 1500×812（?panorama）
 *   pc.png … 1440×900
 *   reduced.png … prefers-reduced-motion: reduce の初期位置
 * コンソールのエラーが 1 件でもあれば終了コード 1。
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const url = process.argv[2];
if (!url) {
  console.error('使い方: node scripts/side-room-shot.mjs <side-room.html の URL>');
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs', 'mockups', 'side-room');
await mkdir(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });

async function open(opts, query = '') {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(url + query, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // 外部フォントが読めなければ代替フォントで撮ってしまうので、止める
  const ok = await page.evaluate(async () => {
    const f = await document.fonts.load('900 16px "Zen Maru Gothic"', 'あ');
    return f.length > 0;
  });
  if (!ok) {
    console.error('Zen Maru Gothic が読めません（ネットワークを確認）');
    process.exit(1);
  }
  await page.waitForTimeout(500);
  return { ctx, page };
}

const phone = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

// 初期位置・各場所
{
  const { ctx, page } = await open(phone);
  await page.screenshot({ path: join(OUT, 'chanoma.png') });
  for (const [i, name] of [[0, 'nedoko'], [2, 'tsukue'], [3, 'genkan']]) {
    await page.locator('.sr-cell').nth(i).click();
    await page.waitForTimeout(1100);
    await page.screenshot({ path: join(OUT, `${name}.png`) });
  }
  await ctx.close();
}
// 動きを減らす
{
  const { ctx, page } = await open({ ...phone, reducedMotion: 'reduce' });
  await page.screenshot({ path: join(OUT, 'reduced.png') });
  await ctx.close();
}
// パノラマ（帯だけ）
{
  const { ctx, page } = await open({ viewport: { width: 1500, height: 812 }, deviceScaleFactor: 1 }, '?panorama');
  await page.screenshot({ path: join(OUT, 'panorama.png') });
  await ctx.close();
}
// PC 幅
{
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.screenshot({ path: join(OUT, 'pc.png') });
  await ctx.close();
}

await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('撮影しました:', OUT);
