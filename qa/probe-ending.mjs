/**
 * Is the missing ending-card content actually absent, or present-but-invisible?
 *
 * Plays to an ending, waits well past any plausible entrance animation, then
 * reports the computed opacity/visibility of every element that has text.
 */
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /begin a career/i }).click();
await page.waitForTimeout(400);
await page.getByRole('textbox').first().fill('Malachar the Unpaid');
await page.getByRole('button', { name: /begin the career/i }).click();
await page.waitForTimeout(600);

const OPTIONS = 'button[data-option-index]:not([disabled])';
const FLOW = 'button:not([data-option-index]):not([disabled])';

for (let i = 0; i < 140; i++) {
  if (await page.getByRole('button', { name: /play again|another career/i }).first().isVisible().catch(() => false)) break;
  const opts = page.locator(OPTIONS);
  const n = await opts.count().catch(() => 0);
  if (n > 0) { await opts.nth(0).click(); await page.waitForTimeout(220); continue; }
  const flow = page.locator(FLOW);
  const f = await flow.count().catch(() => 0);
  if (!f) break;
  await flow.nth(f - 1).click();
  await page.waitForTimeout(220);
}

console.log('\n--- reached ending, waiting 4s for any animation to settle ---');
await page.waitForTimeout(4000);

const report = await page.evaluate(() => {
  const out = [];
  const walk = (el, depth) => {
    const cs = getComputedStyle(el);
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    const isBtn = el.tagName === 'BUTTON';
    if (own || isBtn) {
      const r = el.getBoundingClientRect();
      out.push({
        depth,
        tag: el.tagName.toLowerCase(),
        text: (own || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 46),
        opacity: cs.opacity,
        visibility: cs.visibility,
        display: cs.display,
        transform: cs.transform === 'none' ? '-' : cs.transform.slice(0, 34),
        h: Math.round(r.height),
      });
    }
    for (const c of el.children) walk(c, depth + 1);
  };
  walk(document.getElementById('root'), 0);
  return out;
});

console.log(`\n${'op'.padEnd(6)}${'vis'.padEnd(9)}${'h'.padEnd(6)}${'transform'.padEnd(36)}text`);
for (const r of report) {
  const flag = Number(r.opacity) < 0.9 ? ' <<<' : '';
  console.log(
    `${r.opacity.padEnd(6)}${r.visibility.padEnd(9)}${String(r.h).padEnd(6)}${r.transform.padEnd(36)}${'  '.repeat(Math.min(r.depth, 6))}${r.tag}: ${r.text}${flag}`,
  );
}

await page.screenshot({ path: 'qa/screenshots/probe-ending-settled.png', fullPage: true });
console.log('\nwrote qa/screenshots/probe-ending-settled.png');
await browser.close();
