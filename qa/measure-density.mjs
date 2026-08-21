/**
 * Density ruler for the run screen and the creation screen.
 *
 * The defect this exists for is "the main game screen still requires me to
 * scroll around": at 393x852 the header + ledger pushed the first choice card
 * below the fold on every era. Eyeballing a screenshot cannot tell you by how
 * much, and CLAUDE.md #7 says screenshots lie — so this measures.
 *
 * Reports, mid-run and with NO overlay up:
 *   - viewport height
 *   - bottom of the header, bottom of the ledger
 *   - top of the first `button[data-option-index]`  <- the number that matters
 *   - how far the page must scroll for that button to be fully visible
 * plus the creation screen's total scroll height.
 *
 *   node qa/measure-density.mjs [--width 393] [--height 852] [--eras 6]
 */
import { chromium } from 'playwright';

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const WIDTH = Number(arg('--width', '393'));
const HEIGHT = Number(arg('--height', '852'));
const ERAS = Number(arg('--eras', '6'));
const URL = arg('--url', 'http://localhost:5173');

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
});
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE.ERROR:', m.text());
});

const OPTIONS = 'button[data-option-index]:not([disabled])';
const FLOW = 'button:not([data-option-index]):not([disabled])';

await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /begin a career/i }).click();
await page.waitForTimeout(400);
await page.getByRole('textbox').first().fill('Malachar the Unpaid');

// ---- creation screen height ---------------------------------------------
await page.evaluate(() => document.fonts?.ready);
await page.waitForTimeout(500);
const creation = await page.evaluate(() => {
  const doc = document.scrollingElement ?? document.documentElement;
  const commit = [...document.querySelectorAll('button')].find((b) =>
    /begin the career/i.test(b.textContent || '')
  );
  const firstOrigin = document.querySelectorAll('input[type=radio]')[0];
  return {
    scrollHeight: doc.scrollHeight,
    viewport: innerHeight,
    screens: +(doc.scrollHeight / innerHeight).toFixed(2),
    commitTop: commit ? Math.round(commit.getBoundingClientRect().top + doc.scrollTop) : null,
    firstRadioTop: firstOrigin
      ? Math.round(firstOrigin.closest('label').getBoundingClientRect().top + doc.scrollTop)
      : null,
  };
});
await page.screenshot({
  path: `qa/screenshots/measure-${WIDTH}-creation.png`,
  fullPage: true,
});

// --long picks the 20-era career, which is the ledger's worst case.
if (process.argv.includes('--long')) {
  await page.getByRole('radio', { name: /long/i }).first().check({ force: true });
  await page.waitForTimeout(200);
}

await page.getByRole('button', { name: /begin the career/i }).click();
await page.waitForTimeout(700);

// ---- play forward to mid-run --------------------------------------------
let eras = 0;
for (let i = 0; i < 200 && eras < ERAS; i++) {
  const opts = page.locator(OPTIONS);
  const n = await opts.count().catch(() => 0);
  if (n > 0) {
    await opts.nth(0).click();
    eras++;
    await page.waitForTimeout(220);
    continue;
  }
  const flow = page.locator(FLOW);
  const f = await flow.count().catch(() => 0);
  if (!f) break;
  await flow.nth(f - 1).click();
  await page.waitForTimeout(220);
}

// Clear any overlay so the run screen itself is what we measure.
for (let i = 0; i < 8; i++) {
  const opts = await page.locator(OPTIONS).count().catch(() => 0);
  if (opts > 0) break;
  const cont = page.getByRole('button', { name: /continue|onward|proceed|go on/i }).first();
  if (!(await cont.isVisible().catch(() => false))) break;
  await cont.click();
  await page.waitForTimeout(250);
}

await page.evaluate(() => document.fonts?.ready);
await page.waitForTimeout(1200);

const run = await page.evaluate(() => {
  const doc = document.scrollingElement ?? document.documentElement;
  const y = (el) => (el ? Math.round(el.getBoundingClientRect().top + doc.scrollTop) : null);
  const bottom = (el) => (el ? Math.round(el.getBoundingClientRect().bottom + doc.scrollTop) : null);

  const header = document.querySelector('main header');
  const ledger = document.querySelector('section[aria-labelledby="ledger-heading"]');
  const scroll = ledger?.querySelector('[role="region"]');
  const first = document.querySelector('button[data-option-index]');
  const rows = [...document.querySelectorAll('tbody tr')];
  const current = rows.find((r) => r.dataset.current === 'true');

  return {
    viewport: innerHeight,
    pageScrollHeight: doc.scrollHeight,
    scrollY: Math.round(doc.scrollTop),
    headerTop: y(header),
    headerBottom: bottom(header),
    headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
    ledgerTop: y(ledger),
    ledgerBottom: bottom(ledger),
    ledgerHeight: ledger ? Math.round(ledger.getBoundingClientRect().height) : null,
    ledgerScrollH: scroll?.scrollHeight ?? null,
    ledgerClientH: scroll?.clientHeight ?? null,
    rowCount: rows.length,
    currentRowVisibleInLedger: current && scroll
      ? current.getBoundingClientRect().bottom <= scroll.getBoundingClientRect().bottom + 1 &&
        current.getBoundingClientRect().top >= scroll.getBoundingClientRect().top - 1
      : null,
    // Seed-independent: everything above the offer block is header + ledger +
    // gaps, which is the part this pass actually controls. `firstOptionTop`
    // additionally carries the offer's own title and body, and those vary in
    // length from era to era, so compare both.
    offerTop: y(first?.closest('section') ?? document.querySelector('main > div:last-child')),
    firstOptionTop: y(first),
    firstOptionBottom: bottom(first),
    firstOptionHeight: first ? Math.round(first.getBoundingClientRect().height) : null,
    optionCount: document.querySelectorAll('button[data-option-index]').length,
    headerParts: header
      ? [...header.children].map((c) => ({
          tag: c.tagName.toLowerCase(),
          cls: c.className.toString().replace(/_[\w-]+$/, '').slice(0, 28),
          top: Math.round(c.getBoundingClientRect().top),
          h: Math.round(c.getBoundingClientRect().height),
        }))
      : null,
  };
});

run.scrollToSeeFirstOption =
  run.firstOptionTop == null ? null : Math.max(0, run.firstOptionTop - run.viewport + 24);
run.scrollToFullySeeFirstOption =
  run.firstOptionBottom == null ? null : Math.max(0, run.firstOptionBottom - run.viewport + 16);

// The above-the-fold view is the whole point, so pin the page to the top: a
// click can leave the document scrolled and make a fixed layout look better
// (or worse) than a player's first sight of it.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(250);
await page.screenshot({ path: `qa/screenshots/measure-${WIDTH}-run-viewport.png` });
await page.screenshot({
  path: `qa/screenshots/measure-${WIDTH}-run-full.png`,
  fullPage: true,
});

// The ledger's expand toggle, open, with the newest era still in frame.
// Scoped to the ledger on purpose: the header's stat captions are also
// aria-expanded buttons, and an unscoped selector opens one of those instead.
const toggle = page
  .locator('section[aria-labelledby="ledger-heading"] button[aria-expanded]')
  .first();
let expanded = null;
if (await toggle.isVisible().catch(() => false)) {
  await toggle.click();
  await page.waitForTimeout(600);
  expanded = await page.evaluate(() => {
    const doc = document.scrollingElement ?? document.documentElement;
    const ledger = document.querySelector('section[aria-labelledby="ledger-heading"]');
    const scroll = ledger?.querySelector('[role="region"]');
    const rows = [...document.querySelectorAll('tbody tr')];
    const current = rows.find((r) => r.dataset.current === 'true');
    const first = document.querySelector('button[data-option-index]');
    return {
      ledgerHeight: Math.round(ledger.getBoundingClientRect().height),
      clientH: scroll.clientHeight,
      scrollH: scroll.scrollHeight,
      rowsVisible: +((scroll.clientHeight - 22) / ((scroll.scrollHeight - 22) / rows.length)).toFixed(
        1
      ),
      currentRowInFrame:
        current.getBoundingClientRect().bottom <= scroll.getBoundingClientRect().bottom + 1,
      firstOptionTop: Math.round(first.getBoundingClientRect().top + doc.scrollTop),
    };
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `qa/screenshots/measure-${WIDTH}-run-expanded.png` });
}

console.log(`\n=== ${WIDTH}x${HEIGHT}, ${eras} eras played ===`);
console.log('creation:', JSON.stringify(creation, null, 2));
console.log('run:', JSON.stringify(run, null, 2));
console.log('ledger expanded:', JSON.stringify(expanded, null, 2));

await browser.close();
