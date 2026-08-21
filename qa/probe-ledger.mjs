/**
 * Capture the run screen with a deep ledger and NO resolution overlay, so the
 * aging gradient can be judged on its own rather than through a backdrop scrim.
 */
import { chromium } from 'playwright';
import { dismissFirstRunGuide } from './first-run.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /begin a career/i }).click();
await page.waitForTimeout(400);
await page.getByRole('textbox').first().fill('Vashter of the Long Arrears');
await page.getByRole('button', { name: /begin the career/i }).click();
await page.waitForTimeout(600);

// A fresh profile is a first-time player: the guide is modal over the choice
// cards until it is walked.
await dismissFirstRunGuide(page);

const OPTIONS = 'button[data-option-index]:not([disabled])';
const FLOW = 'button:not([data-option-index]):not([disabled])';

let eras = 0;
// Advance until the ledger is deep, always leaving the loop with an OFFER
// showing (no overlay), which is the state worth looking at.
for (let i = 0; i < 200 && eras < 6; i++) {
  const opts = page.locator(OPTIONS);
  const n = await opts.count().catch(() => 0);
  if (n > 0) {
    await opts.nth(0).click();
    eras++;
    await page.waitForTimeout(200);
    continue;
  }
  const flow = page.locator(FLOW);
  const f = await flow.count().catch(() => 0);
  if (!f) break;
  await flow.nth(f - 1).click();
  await page.waitForTimeout(200);
}

// Clear whatever overlay is up so the ledger is unobstructed. Only ever click
// a genuine "continue" — the ending screen's controls would navigate away.
for (let i = 0; i < 6; i++) {
  const opts = await page.locator(OPTIONS).count().catch(() => 0);
  if (opts > 0) break;
  const cont = page.getByRole('button', { name: /continue|onward|proceed|go on/i }).first();
  if (!(await cont.isVisible().catch(() => false))) break;
  await cont.click();
  await page.waitForTimeout(250);
}

await page.evaluate(() => document.fonts?.ready);
await page.waitForTimeout(1800);
await page.screenshot({ path: 'qa/screenshots/probe-ledger-clean.png', fullPage: true });
console.log(`eras played: ${eras} -> qa/screenshots/probe-ledger-clean.png`);

// Report the ledger rows' computed opacity, to separate "aging gradient" from
// "animation never finished".
const rows = await page.evaluate(() => {
  const trs = [...document.querySelectorAll('tbody tr')];
  return trs.map((tr, i) => ({
    i,
    opacity: getComputedStyle(tr).opacity,
    color: getComputedStyle(tr.querySelector('td') ?? tr).color,
    text: (tr.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 44),
  }));
});
console.log('\nledger rows (top = oldest):');
for (const r of rows) console.log(`  [${r.i}] opacity=${r.opacity}  color=${r.color}  ${r.text}`);

await browser.close();
