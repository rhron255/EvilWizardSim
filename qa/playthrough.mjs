/**
 * QA harness — drives a real playthrough in a headless browser.
 *
 * This is deliberately NOT a screenshot-only script. It plays the game the way
 * a player does (click, type, choose) and fails loudly on console errors, page
 * exceptions, or a run that stalls. Visual review needs both halves: what it
 * looks like AND whether it actually works.
 *
 *   node qa/playthrough.mjs [--url http://localhost:5173] [--width 1440]
 *                           [--out qa/screenshots] [--headed] [--slow 0]
 *
 * Exit code is non-zero if the run stalled or the console reported errors,
 * so this doubles as a smoke test.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { dismissFirstRunGuide } from './first-run.mjs';

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const has = (flag) => process.argv.includes(flag);

const URL = arg('--url', 'http://localhost:5173');
const WIDTH = Number(arg('--width', '1440'));
const HEIGHT = Number(arg('--height', WIDTH < 700 ? '900' : '1000'));
const OUT = arg('--out', 'qa/screenshots');
const SLOW = Number(arg('--slow', '0'));
const LABEL = arg('--label', `${WIDTH}w`);

await mkdir(OUT, { recursive: true });

const problems = [];
const shots = [];

const browser = await chromium.launch({ headless: !has('--headed'), slowMo: SLOW });
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
});

page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
  if (m.type() === 'warning' && /React|key|act\(/i.test(m.text()))
    problems.push(`console.warn: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

async function shot(name) {
  const file = path.join(OUT, `${LABEL}-${String(shots.length).padStart(2, '0')}-${name}.png`);
  // Let fonts AND staged reveals settle. Shooting early captured a half-empty
  // card and made a correct UI look broken more than once.
  //
  // MEASURED, not guessed (`.tmp/settle.mjs`): a GAMBLE now runs the needle
  // before it names the verdict — the needle stops at ~1109ms, the verdict
  // reaches full opacity at ~1268ms, and the last consequence block lands at
  // ~1550ms. 1100 was inside the sweep, so every gamble screenshot would have
  // caught a card mid-roll with no result on it.
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(1900);
  await page.screenshot({ path: file, fullPage: true });
  shots.push(file);
  console.log(`  shot  ${file}`);
}

/** Click the first visible control whose accessible name matches. */
async function clickByName(re, { timeout = 4000, optional = false } = {}) {
  const btn = page.getByRole('button', { name: re }).first();
  try {
    await btn.waitFor({ state: 'visible', timeout });
    await btn.click();
    return true;
  } catch {
    if (!optional) problems.push(`could not click control matching ${re}`);
    return false;
  }
}

console.log(`\n▸ ${URL}  @${WIDTH}×${HEIGHT}\n`);
await page.goto(URL, { waitUntil: 'networkidle' });

// ---- Title ---------------------------------------------------------------
await shot('title');
await clickByName(/begin a career/i);

// ---- Creation ------------------------------------------------------------
await page.waitForTimeout(400);
const nameField = page.getByRole('textbox').first();
if (await nameField.isVisible().catch(() => false)) {
  await nameField.fill('Malachar the Unpaid');
  await shot('creation');
} else {
  problems.push('creation screen: no text input found');
  await shot('creation-missing-input');
}
await clickByName(/begin the career/i);

// ---- The first-run guide -------------------------------------------------
// A fresh browser profile is a first-time player, so this is what the very
// first era looks like. It is modal over the choice cards by design; walking
// it IS the playthrough.
await page.waitForTimeout(600);
if (await page.getByRole('dialog').filter({ hasText: 'One era at a time' }).isVisible().catch(() => false)) {
  await shot('first-run-guide');
}
const guideCards = await dismissFirstRunGuide(page);
if (guideCards === 0) problems.push('first-run guide never appeared for a fresh profile');

// ---- The run -------------------------------------------------------------
await page.waitForTimeout(600);
await shot('run-era-01');

let eras = 0;
let sawProphecy = false;
let sawEnding = false;

// Offer options are the only buttons carrying data-option-index. Anything else
// enabled on screen is a flow control (continue / play again / collection).
const OPTIONS = 'button[data-option-index]:not([disabled])';
const FLOW = 'button:not([data-option-index]):not([disabled])';

for (let step = 0; step < 140 && !sawEnding; step++) {
  // Terminal screen?
  const again = page.getByRole('button', { name: /play again|another career|new run/i }).first();
  if (await again.isVisible().catch(() => false)) {
    sawEnding = true;
    break;
  }

  // Prefer making a choice when one is offered.
  const options = page.locator(OPTIONS);
  const count = await options.count().catch(() => 0);
  if (count > 0) {
    await options.nth(Math.floor(Math.random() * count)).click();
    eras++;
    if (eras === 3) await shot('run-era-03');
    if (eras === 9) await shot('run-mid');
    await page.waitForTimeout(300);
    continue;
  }

  // No options: a resolution overlay or the prophecy set piece is gating.
  const body = (await page.textContent('body').catch(() => '')) ?? '';
  if (!sawProphecy && /prophec/i.test(body)) {
    sawProphecy = true;
    await shot('prophecy');
  }

  const flow = page.locator(FLOW);
  const flowCount = await flow.count().catch(() => 0);
  if (flowCount === 0) {
    problems.push(`stalled at step ${step}: nothing enabled to click`);
    await shot(`stalled-${step}`);
    break;
  }
  // The last enabled flow control is the forward action; earlier ones are
  // usually "← Back"-style escapes we do not want to take.
  await flow.nth(flowCount - 1).click();
  await page.waitForTimeout(300);
}

if (sawEnding) {
  await shot('ending');
  // Peek at the collection from the ending card.
  if (await clickByName(/collection/i, { optional: true })) {
    await page.waitForTimeout(500);
    await shot('collection');
  }
} else {
  problems.push('never reached an ending screen');
  await shot('no-ending');
}

await browser.close();

// ---- Report --------------------------------------------------------------
console.log(`\n  eras played : ${eras}`);
console.log(`  prophecy    : ${sawProphecy ? 'seen' : 'NOT SEEN'}`);
console.log(`  ending      : ${sawEnding ? 'reached' : 'NOT REACHED'}`);
console.log(`  screenshots : ${shots.length} in ${OUT}`);

if (!sawProphecy) problems.push('prophecy interstitial never appeared');

if (problems.length) {
  console.log(`\n  ✗ ${problems.length} problem(s):`);
  for (const p of problems) console.log(`      - ${p}`);
  process.exit(1);
}
console.log('\n  ✓ clean playthrough\n');
