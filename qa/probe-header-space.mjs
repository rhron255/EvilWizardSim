/**
 * The header's vertical rhythm, as numbers.
 *
 * Spacing complaints are subjective, but "how many pixels sit between these two
 * bands" is not, and neither is "is the first choice card fully on screen" —
 * which is the acceptance criterion the design can actually satisfy
 * (CLAUDE.md § 12; the 520px one was invented and unmeetable).
 *
 * Prints the gap BETWEEN consecutive bands, not their offsets, because the gap
 * is the thing being tuned.
 *
 * Issue #18 shrank `<header>` to just the masthead — identity and the
 * Notoriety badge/trophy. The stats and allegiance strip this probe used to
 * measure inside it now live in the Decision/Career tabpanels below the
 * header instead, so they are out of `bands`' scope entirely rather than
 * silently absent from it; the first-card check at the bottom (the actual
 * acceptance criterion) is unaffected either way, since it scans the whole
 * page rather than `<header>` specifically.
 */
import { chromium } from 'playwright';
import { dismissFirstRunGuide } from './first-run.mjs';

const URL = process.env.EWS_URL ?? 'http://localhost:5173';
const WIDTH = Number(process.env.EWS_WIDTH ?? 393);
const HEIGHT = Number(process.env.EWS_HEIGHT ?? 852);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
});

await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /begin a career/i }).first().click();
const field = page.getByRole('textbox').first();
await field.waitFor({ state: 'visible', timeout: 5000 });
await field.fill('Malachar the Unpaid');
await page.getByRole('button', { name: /begin the career/i }).first().click();
await page.waitForTimeout(500);
await dismissFirstRunGuide(page).catch(() => {});
await page.waitForTimeout(400);

// From the TOP of the page, or "the first card is fully on screen" is a claim
// about wherever the page happened to be scrolled to.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(150);

const out = await page.evaluate(() => {
  const header = document.querySelector('header');
  const h1 = document.querySelector('h1');
  const badge = document.querySelector('header [aria-label^="Notoriety"]')?.parentElement;

  // All three of these are the masthead's own content and always present —
  // unlike the pre-#18 header, nothing here is conditional, so nothing is
  // silently filtered out if missing: a `null` in this list is a real defect.
  const bands = [
    ['eyebrow', header.querySelector('p')],
    ['name line', h1?.parentElement],
    ['age line', h1?.parentElement?.nextElementSibling],
  ];
  const missing = bands.filter(([, el]) => !el).map(([label]) => label);

  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) };
  };

  const rows = bands.filter(([, el]) => el).map(([label, el]) => ({ label, ...box(el) }));

  // Gap from each band to the next.
  for (let i = 0; i < rows.length - 1; i++) rows[i].gapBelow = rows[i + 1].top - rows[i].bottom;

  const badgeBox = badge ? box(badge) : null;
  const nameBox = h1 ? h1.getBoundingClientRect() : null;

  // First choice card — the offer options are buttons in the offer panel.
  const cards = [...document.querySelectorAll('button')].filter(
    (b) => b.getBoundingClientRect().width > 200 && b.getBoundingClientRect().height > 60,
  );
  const first = cards[0]?.getBoundingClientRect() ?? null;

  return {
    rows,
    missing,
    headerH: Math.round(header.getBoundingClientRect().height),
    headerBottom: Math.round(header.getBoundingClientRect().bottom),
    // Horizontal breathing room between the name column and the badge column.
    nameToBadge: badgeBox && nameBox ? Math.round(badge.getBoundingClientRect().left - nameBox.right) : null,
    firstCard: first
      ? { top: Math.round(first.top), bottom: Math.round(first.bottom) }
      : null,
    viewportH: window.innerHeight,
  };
});

if (out.missing.length) {
  console.log(`\n  MISSING BAND(S): ${out.missing.join(', ')} — the masthead's markup may have changed.`);
}
console.log(`\n  header rhythm @${WIDTH}×${HEIGHT}\n`);
for (const r of out.rows) {
  const gap = r.gapBelow === undefined ? '' : `   gap below: ${String(r.gapBelow).padStart(3)}px`;
  console.log(`  ${r.label.padEnd(12)} y ${String(r.top).padStart(4)}..${String(r.bottom).padStart(4)}  h=${String(r.h).padStart(3)}${gap}`);
}
console.log(`\n  header height     ${out.headerH}px  (ends at y=${out.headerBottom})`);
console.log(`  name → badge gap  ${out.nameToBadge}px`);
if (out.firstCard) {
  const fits = out.firstCard.bottom <= out.viewportH;
  console.log(
    `  first choice card y ${out.firstCard.top}..${out.firstCard.bottom} of ${out.viewportH}  ` +
      `${fits ? '✓ fully on screen' : '✗ CUT OFF'}`,
  );
}
console.log('');

await browser.close();
