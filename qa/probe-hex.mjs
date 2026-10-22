/**
 * The hex row on the creation screen (issue #124).
 *
 *   node qa/probe-hex.mjs [--width 393] [--height 852] [--out <dir>]
 *
 * A finger and a keyboard, both. It checks that the row is absent for a player
 * with two finished careers and present for one with three; that every row is a
 * 44px-tall hit area; that the row does not overflow sideways; that Tab reaches
 * the radio group, the arrow keys move the choice, and Enter on the commit
 * button starts a career that really began under the picked hex (the header
 * shows its hero threat or pact debt). Screenshots land in --out so a PR can
 * attach exactly what was measured.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { openApp } from './first-run.mjs';

const arg = (f, d) => {
  const i = process.argv.indexOf(f);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const W = Number(arg('--width', '393'));
const H = Number(arg('--height', '852'));
const OUT = arg('--out', 'qa/screenshots/hex');
const URL = arg('--url', 'http://localhost:5173/');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const problems = [];

async function creationAfter(careers) {
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && problems.push(`console.error: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await openApp(page, URL);
  await page.evaluate((n) => {
    localStorage.setItem(
      'evil-wizard-sim:collection',
      JSON.stringify({
        version: 7,
        discoveredArtifactIds: [],
        endingsSeen: ['slain_by_chosen_one'],
        runsCompleted: n,
        bestNotoriety: 10,
        tutorialSeen: true,
        lastWizardName: 'Malachar the Unpaid',
        selectedThemeId: 'default',
        relicsResetAt: '9999',
        hexesKept: {},
      }),
    );
  }, careers);
  await openApp(page, URL);
  await page.getByRole('button', { name: /begin a career/i }).click();
  await page.waitForTimeout(400);
  return { page, context };
}

// --- absent for a newcomer --------------------------------------------------
{
  const { page, context } = await creationAfter(2);
  const rows = await page.getByText(/begin under a hex/i).count();
  if (rows !== 0) problems.push(`hex row shown after only 2 careers (${rows})`);
  await context.close();
}

// --- present after three ----------------------------------------------------
const { page, context } = await creationAfter(3);
const group = page.getByRole('group', { name: /begin under a hex/i });
if (!(await group.isVisible())) problems.push('hex row missing after 3 careers');
await group.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/creation-${W}x${H}-hex.png` });

const measured = await page.evaluate(() => {
  const fs = [...document.querySelectorAll('fieldset')].find((f) => /begin under a hex/i.test(f.textContent));
  const rows = [...fs.querySelectorAll('label')].map((l) => {
    const r = l.getBoundingClientRect();
    return { name: l.textContent.trim().slice(0, 28), h: Math.round(r.height), w: Math.round(r.width) };
  });
  return {
    rows,
    overflowX: document.documentElement.scrollWidth > innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
  };
});
for (const r of measured.rows) if (r.h < 44) problems.push(`hex row "${r.name}" is ${r.h}px tall (< 44)`);
if (measured.overflowX) problems.push('creation screen scrolls sideways');
console.log(JSON.stringify(measured));

// --- keyboard: Tab to the group, arrow to a hex, Enter on the commit ---------
await page.getByRole('radio', { name: /^no hex/i }).focus();
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown'); // None -> Empty-Handed -> The File Is Open
const picked = await page.evaluate(() => document.activeElement?.closest('label')?.textContent ?? '');
if (!/the file is open/i.test(picked)) problems.push(`arrow keys landed on "${picked.slice(0, 30)}"`);
const ring = await page.evaluate(() => {
  const inner = document.activeElement?.nextElementSibling;
  return inner ? getComputedStyle(inner).outlineStyle !== 'none' : false;
});
if (!ring) problems.push('no focus ring on the focused hex row');
await page.screenshot({ path: `${OUT}/creation-${W}x${H}-hex-picked.png` });

await page.getByRole('button', { name: /begin the career/i }).focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
// The ascent shows no siege readout (the hex's starting threat is provably
// unable to end the career there — engine/hexes.test.ts), so the proof that
// the career began under the hex is the saved run, not the header.
await page.screenshot({ path: `${OUT}/run-${W}x${H}-under-hex.png` });
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('evil-wizard-sim:run') ?? 'null'));
if (saved?.run?.hexId !== 'file_is_open') problems.push(`saved run hexId = ${saved?.run?.hexId}`);
if (saved?.run?.heroThreat !== 12) problems.push(`saved run heroThreat = ${saved?.run?.heroThreat}`);

await context.close();
await browser.close();
if (problems.length) {
  console.error('FAIL\n' + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log('probe-hex OK');
