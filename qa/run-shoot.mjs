// Screenshot driver for the run-loop UI (ledger / offers / badge / overlay).
// Separate from qa/shoot.mjs, which belongs to the meta screens.
// Usage: node qa/run-shoot.mjs [tag]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.EWS_RUN_BASE ?? 'http://localhost:5178/qa/run-harness.html';
const tag = process.argv[2] ?? 'r1';
const out = 'qa/screenshots';
mkdirSync(out, { recursive: true });

const shots = [
  { name: 'wide-run', scene: 'run', w: 1440, h: 900, full: true },
  { name: 'wide-offerB', scene: 'offerB', w: 1440, h: 900, full: true },
  { name: 'wide-long', scene: 'long', w: 1440, h: 1000 },
  { name: 'wide-early', scene: 'early', w: 1440, h: 900, full: true },
  { name: 'wide-resolution', scene: 'resolution', w: 1440, h: 900 },
  { name: 'wide-tier', scene: 'tier', w: 1440, h: 900 },
  { name: 'narrow-run', scene: 'run', w: 400, h: 860, full: true },
  { name: 'narrow-offerB', scene: 'offerB', w: 400, h: 860, full: true },
  { name: 'narrow-resolution', scene: 'resolution', w: 400, h: 860 },
  { name: 'narrow-long', scene: 'long', w: 380, h: 860 },
];

const browser = await chromium.launch();
for (const s of shots) {
  const page = await browser.newPage({
    viewport: { width: s.w, height: s.h },
    deviceScaleFactor: 2,
  });
  page.on('pageerror', (e) => console.log(`[${s.name}] page error:`, e.message));
  await page.goto(`${BASE}?scene=${s.scene}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1400); // let the staged reveals settle
  await page.screenshot({ path: `${out}/${tag}-${s.name}.png`, fullPage: Boolean(s.full) });
  await page.close();
}

// Hover + focus states on an option card.
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`${BASE}?scene=run`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);
await page.hover('button[data-option-index="0"]');
await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/${tag}-wide-hover.png` });
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/${tag}-wide-focus.png` });
await page.close();

// The full beat: number key -> resolution -> Enter -> row appended.
const play = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await play.goto(`${BASE}?scene=run`, { waitUntil: 'networkidle' });
await play.evaluate(() => document.fonts.ready);
await play.waitForTimeout(500);
await play.keyboard.press('Digit1');
await play.waitForTimeout(320);
await play.screenshot({ path: `${out}/${tag}-beat-1-midreveal.png` });
await play.waitForTimeout(900);
await play.keyboard.press('Enter');
await play.waitForTimeout(200);
await play.screenshot({ path: `${out}/${tag}-beat-2-appending.png` });
await play.waitForTimeout(1200);
await play.screenshot({ path: `${out}/${tag}-beat-3-appended.png` });
await play.close();

await browser.close();
console.log('shot', tag);
