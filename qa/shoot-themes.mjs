/**
 * Every theme, photographed on the screens a player actually sits in.
 *
 * `probe-themes.mjs` MEASURES the selector (tier untouched, contrast, layout);
 * this one is the picture half of that: for each theme it seeds a collection
 * that has seen every ending and is wearing that theme, then shoots the title,
 * the first era of a run, and (once) the selector. Ornament and palette are a
 * judgement a reviewer makes by eye, so the eye needs every theme side by side
 * on the same screens — not three themes picked at random.
 *
 *   node qa/shoot-themes.mjs [--url http://localhost:5173] [--width 393]
 *                            [--height 852] [--out qa/screenshots/themes]
 *                            [--only lichdom,ascension]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { openApp, dismissFirstRunGuide } from './first-run.mjs';
import { themeEndingIds, themeIds } from './theme-ids.mjs';

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const URL = arg('--url', 'http://localhost:5173');
const WIDTH = Number(arg('--width', '393'));
const HEIGHT = Number(arg('--height', '852'));
const OUT = arg('--out', 'qa/screenshots/themes');
const ONLY = arg('--only', '');

// Read off `THEMES` in src/theme/themes.ts (qa/theme-ids.mjs), never
// hand-copied: a hand list missed a new theme without a word, because a probe
// cannot photograph a theme it was never told about.
const ALL = themeIds();
const ENDINGS = themeEndingIds();
const THEMES = ONLY ? ALL.filter((id) => ONLY.split(',').includes(id)) : ALL;
const unknown = ONLY ? ONLY.split(',').filter((id) => !ALL.includes(id)) : [];
if (unknown.length) throw new Error(`--only names no such theme: ${unknown.join(', ')}`);
console.log(`  ${ALL.length} themes in src/theme/themes.ts; shooting ${THEMES.length}`);

await mkdir(OUT, { recursive: true });
const problems = [];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});

for (const [i, theme] of THEMES.entries()) {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`${theme}: pageerror ${e.message}`));
  await page.addInitScript(
    ([theme, endings]) => {
      if (localStorage.getItem('evil-wizard-sim:collection')) return;
      localStorage.setItem(
        'evil-wizard-sim:collection',
        JSON.stringify({
          version: 6,
          discoveredArtifactIds: [],
          endingsSeen: endings,
          runsCompleted: 9,
          bestNotoriety: 88,
          tutorialSeen: true,
          lastWizardName: 'Malvorn',
          selectedThemeId: theme,
          relicsResetAt: '9999',
        }),
      );
    },
    [theme, ENDINGS],
  );
  await openApp(page, URL);
  const prefix = `${OUT}/${String(i).padStart(2, '0')}-${theme}`;

  const worn = await page.evaluate(() => document.querySelector('main')?.getAttribute('data-theme'));
  if ((worn ?? 'default') !== theme) problems.push(`${theme}: title wears ${worn ?? 'default'}`);
  await page.screenshot({ path: `${prefix}-title.png` });

  if (i === 0) {
    await page.getByRole('button', { name: /^Themes/ }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/selector.png`, fullPage: true });
    await page.getByRole('button', { name: /back/i }).first().click();
    await page.waitForTimeout(200);
  }

  await page.getByRole('button', { name: /begin a career/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /begin the career/i }).click();
  await page.waitForTimeout(500);
  await dismissFirstRunGuide(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${prefix}-run.png` });
  console.log(`  shot  ${prefix}-{title,run}.png`);
  await context.close();
}

await browser.close();
if (problems.length) {
  console.log(`\n✗ ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`\n✓ ${THEMES.length} theme(s) shot`);
