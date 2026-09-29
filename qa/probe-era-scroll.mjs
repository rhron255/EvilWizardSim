/**
 * Does each era start at the top of the page?
 *
 * The run screen is one column that scrolls as a whole, and on a phone the
 * choice cards run past the fold. A player who scrolls down to reach the LAST
 * option, taps it and continues used to arrive at the next era still scrolled
 * the same distance — the wizard's name and standings off the top of the
 * screen (measured before the fix: 275-372px down at 320px, every era).
 *
 * This plays like that player: every era it scrolls to the last card, taps it,
 * continues, and reads `scrollY` and the masthead's position at the start of
 * the next era. Failure mode 15's cousin: a layout is only verified when you
 * have used it the way a thumb does, not the way `click()` does.
 *
 *   node qa/probe-era-scroll.mjs [--width 393] [--height 852] [--eras 10]
 *
 * Exits non-zero if any era after the first opens scrolled, or with the
 * masthead off screen.
 */
import { chromium } from 'playwright';
import { dismissFirstRunGuide, openApp } from './first-run.mjs';

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const W = Number(arg('--width', '393'));
const H = Number(arg('--height', '852'));
const ERAS = Number(arg('--eras', '10'));

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true });
await openApp(page);
await page.getByRole('button', { name: /begin a career/i }).click();
await page.waitForTimeout(300);
await page.getByRole('textbox').first().fill('Scroll Tester');
await page.getByRole('button', { name: /begin the career/i }).click();
await page.waitForTimeout(500);
await dismissFirstRunGuide(page);
await page.waitForTimeout(400);

const rows = [];
const problems = [];
for (let era = 1; era <= ERAS; era++) {
  const options = page.locator('button[data-option-index]:not([disabled])');
  const n = await options.count();
  if (!n) break;
  await options.nth(n - 1).scrollIntoViewIfNeeded();
  const scrolledToTap = await page.evaluate(() => Math.round(window.scrollY));
  await options.nth(n - 1).click();
  await page.waitForTimeout(1800);
  await page.locator('button:not([data-option-index]):not([disabled])').last().click();
  await page.waitForTimeout(700);
  const next = await page.evaluate(() => {
    const h = document.querySelector('main h1');
    return { y: Math.round(window.scrollY), mastheadTop: h ? Math.round(h.getBoundingClientRect().top) : null };
  });
  rows.push({ era, options: n, scrolledToTap, nextEraScrollY: next.y, mastheadTop: next.mastheadTop });
  if (await page.getByRole('button', { name: /play again/i }).isVisible().catch(() => false)) break;
  if (next.y !== 0) problems.push(`era ${era + 1} opened ${next.y}px down the page`);
  if (next.mastheadTop !== null && next.mastheadTop < 0) problems.push(`era ${era + 1}: the masthead is above the top of the screen`);
}
console.log(`\n▸ era scroll  @${W}x${H}\n`);
console.table(rows);
await browser.close();

if (problems.length) {
  console.log(`  ✗ ${problems.length} problem(s):`);
  for (const p of problems) console.log(`      - ${p}`);
  process.exit(1);
}
console.log('  ✓ every era starts at the top');
