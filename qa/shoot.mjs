/* Screenshot driver for the meta screens. Node + Playwright, no test runner. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.EWS_BASE ?? 'http://localhost:5173/qa/harness.html';
const OUT = 'qa/screenshots';
const ROUND = process.env.EWS_ROUND ?? 'r1';

const SHOTS = [
  { id: 'title', q: 'screen=title' },
  { id: 'title-empty', q: 'screen=title&variant=empty' },
  { id: 'creation', q: 'screen=creation' },
  { id: 'prophecy', q: 'screen=prophecy' },
  { id: 'ending', q: 'screen=ending' },
  { id: 'ending-quiet', q: 'screen=ending&variant=quiet' },
  { id: 'collection', q: 'screen=collection' },
  { id: 'collection-empty', q: 'screen=collection&variant=empty' },
];

const VIEWPORTS = [
  { tag: 'wide', width: 1440, height: 1000 },
  { tag: 'phone', width: 400, height: 860 },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`[${vp.tag}] console error:`, m.text());
  });
  page.on('pageerror', (e) => console.log(`[${vp.tag}] page error:`, e.message));

  for (const shot of SHOTS) {
    await page.goto(`${BASE}?${shot.q}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(450);
    const full = shot.id.startsWith('title') || shot.id === 'prophecy' ? false : true;
    await page.screenshot({
      path: `${OUT}/${ROUND}-${shot.id}-${vp.tag}.png`,
      fullPage: full,
    });
    console.log(`shot ${ROUND}-${shot.id}-${vp.tag}`);
  }
  await ctx.close();
}

// One extra pass: the prophecy mid-reveal, with motion enabled.
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}?screen=prophecy`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  for (const ms of [1200, 2600, 4600, 7000]) {
    await page.waitForTimeout(ms === 1200 ? 1200 : ms - prevMs(ms));
    await page.screenshot({ path: `${OUT}/${ROUND}-prophecy-t${ms}.png` });
    console.log(`shot ${ROUND}-prophecy-t${ms}`);
  }
  await ctx.close();
}

function prevMs(ms) {
  const order = [1200, 2600, 4600, 7000];
  const i = order.indexOf(ms);
  return i <= 0 ? 0 : order[i - 1];
}

await browser.close();
console.log('done');
