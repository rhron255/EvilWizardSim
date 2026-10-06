/**
 * The header's WORST case — the longest lair name in the decline, where the
 * wards readout is also on screen.
 *
 * A random playthrough almost never reaches this: the crown lairs ("Citadel of
 * Nine Winters", "The Mouth of the World") are reached by the few careers that
 * thrive, and the decline readout adds its own rows on top of the header. Those
 * two things are exactly what compete for the same 852px, so the layout has to
 * be judged where they coincide, not where a typical era happens to land
 * (failure mode 15: verified at one state, with no worst case).
 *
 * It plays one era to get a real, valid save, rewrites that save's lair and era
 * (no other field), resumes it, and reports:
 *
 *   - whether the lair name is complete — not ellipsised, not clipped
 *   - how many lines the era/lair eyebrow takes
 *   - where the first choice card sits against the fold
 *
 *   node qa/probe-late-game.mjs [--width 393] [--height 852]
 *
 * Exits non-zero if a lair name is clipped, the page scrolls sideways, or — on a
 * reference-class screen (800px tall or more) — card 1 falls off the screen.
 * On a shorter screen the fold is REPORTED, not failed: at 320x568 the first
 * card is below the fold on every era of every career (the layout sweep
 * measures it at 0%), so a check that demanded otherwise there could only ever
 * fail, and would teach whoever read it to ignore it.
 */
import { chromium } from 'playwright';
import { dismissFirstRunGuide, openApp } from './first-run.mjs';

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const W = Number(arg('--width', '393'));
const H = Number(arg('--height', '852'));
const URL = arg('--url', 'http://localhost:5173/');

const LAIRS = [
  ['citadel_of_nine_winters', 'Citadel of Nine Winters'],
  ['mouth_of_the_world', 'The Mouth of the World'],
  ['sunless_cathedral', 'The Sunless Cathedral'],
  ['unfinished_tower', 'The Unfinished Tower'],
];
// How far past the prophecy to put the run: enough for the wards readout.
const ERAS_PAST_PROPHECY = 3;
const REQUIRE_FOLD = H >= 800;

const problems = [];
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

console.log(`\n▸ late-game header  @${W}x${H}\n`);
for (const [lairId, lairName] of LAIRS) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => problems.push(`${lairId}: pageerror ${e.message}`));
  await openApp(page, URL);
  await page.getByRole('button', { name: /begin a career/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole('textbox').first().fill('Malachar the Unpaid');
  await page.getByRole('button', { name: /begin the career/i }).click();
  await page.waitForTimeout(500);
  await dismissFirstRunGuide(page);
  await page.waitForTimeout(300);

  // One real era, so the game writes a valid save for us to edit.
  await page.locator('button[data-option-index]:not([disabled])').first().click();
  await page.waitForTimeout(1800);
  await page.locator('button:not([data-option-index]):not([disabled])').last().click();
  await page.waitForTimeout(500);

  const edited = await page.evaluate(
    ({ lairId, past }) => {
      const KEY = 'evil-wizard-sim:run';
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const save = JSON.parse(raw);
      save.run.lairId = lairId;
      save.run.eraIndex = Math.min(save.run.prophecyEra + past, save.run.eraCount - 1);
      // Past the prophecy the offer pool is the decline's; also mark it seen.
      save.run.heroThreat = Math.max(save.run.heroThreat ?? 0, 30);
      localStorage.setItem(KEY, JSON.stringify(save));
      return true;
    },
    { lairId, past: ERAS_PAST_PROPHECY },
  );
  if (!edited) {
    problems.push(`${lairId}: no in-progress save to edit`);
    await page.close();
    continue;
  }
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /resume run/i }).click();
  await page.waitForTimeout(700);
  await dismissFirstRunGuide(page).catch(() => {});

  const m = await page.evaluate(
    ({ lairName }) => {
      const eyebrow = [...document.querySelectorAll('p')].find((p) => /^Era \d+ of \d+/i.test((p.textContent || '').trim()));
      const lair = eyebrow ? [...eyebrow.querySelectorAll('span')].find((s) => (s.textContent || '').trim() === lairName) : null;
      const cs = lair ? getComputedStyle(lair) : null;
      const first = document.querySelector('button[data-option-index]');
      const r = first?.getBoundingClientRect();
      return {
        found: !!lair,
        // Distinct line tops of the eyebrow's own text — counted from the text,
        // not derived from height / line-height (`normal` parses to NaN).
        eyebrowLines: (() => {
          if (!eyebrow) return null;
          const range = document.createRange();
          range.selectNodeContents(eyebrow);
          return new Set([...range.getClientRects()].filter((q) => q.width > 1).map((q) => Math.round(q.top))).size;
        })(),
        clipped: lair ? lair.scrollWidth > lair.clientWidth + 1 && cs.overflow !== 'visible' : null,
        ellipsis: lair ? cs.textOverflow === 'ellipsis' && lair.scrollWidth > lair.clientWidth + 1 : null,
        cardTop: r ? Math.round(r.top) : null,
        cardBottom: r ? Math.round(r.bottom) : null,
        hasWards: /Wards/i.test(document.body.innerText),
        docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    },
    { lairName },
  );

  const fits = m.cardBottom !== null && m.cardBottom <= H;
  console.log(
    `  ${lairName.padEnd(26)} lines=${m.eyebrowLines} clipped=${m.clipped || m.ellipsis ? 'YES' : 'no '} card1 ${m.cardTop}..${m.cardBottom} of ${H} ${fits ? '✓' : '✗ off screen'} wards=${m.hasWards ? 'y' : 'n'} hscroll=${m.docOverflow}px`,
  );
  if (!m.found) problems.push(`${lairId}: eyebrow/lair span not found`);
  if (m.clipped || m.ellipsis) problems.push(`${lairName}: lair name is clipped`);
  if (!fits && REQUIRE_FOLD) problems.push(`${lairName}: first card does not fit above the fold`);
  if (m.docOverflow > 0) problems.push(`${lairName}: page scrolls horizontally by ${m.docOverflow}px`);
  await page.screenshot({ path: `qa/screenshots/late-game-${W}w-${lairId}.png` });
  await page.close();
}
await browser.close();

if (problems.length) {
  console.log(`\n  ✗ ${problems.length} problem(s):`);
  for (const p of problems) console.log(`      - ${p}`);
  process.exit(1);
}
console.log(
  REQUIRE_FOLD
    ? '\n  ✓ every crown lair reads in full with card 1 on screen'
    : '\n  ✓ every crown lair reads in full (fold reported only below 800px tall)',
);
