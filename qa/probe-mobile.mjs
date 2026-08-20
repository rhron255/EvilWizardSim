/** Inspect the 400px layout: clipped stat captions and the overlay footer. */
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 900 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /begin a career/i }).click();
await page.waitForTimeout(400);
await page.getByRole('textbox').first().fill('Malachar the Unpaid');
await page.getByRole('button', { name: /begin the career/i }).click();
await page.waitForTimeout(600);

const OPTIONS = 'button[data-option-index]:not([disabled])';

// Take one choice so a resolution overlay is up.
await page.locator(OPTIONS).first().click();
await page.waitForTimeout(900);

const report = await page.evaluate(() => {
  const out = [];
  // Anything whose text is visually cut off by its own box.
  for (const el of document.querySelectorAll('dd, dt, p, span, button')) {
    const cs = getComputedStyle(el);
    const clipped = el.scrollHeight > el.clientHeight + 1 && cs.overflow !== 'visible';
    const r = el.getBoundingClientRect();
    if (clipped) {
      out.push({
        kind: 'CLIPPED',
        tag: el.tagName.toLowerCase(),
        cls: el.className?.toString().slice(0, 40),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 44),
        scroll: el.scrollHeight,
        client: el.clientHeight,
        overflow: cs.overflow,
      });
    }
    if (el.tagName === 'BUTTON' && r.width > 0) {
      out.push({
        kind: 'BUTTON',
        tag: 'button',
        cls: el.className?.toString().slice(0, 40),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30),
        top: Math.round(r.top),
        h: Math.round(r.height),
        opacity: cs.opacity,
        visible: r.top < innerHeight && r.bottom > 0,
      });
    }
  }
  return out;
});

for (const r of report) console.log(JSON.stringify(r));

// Clear the overlay, then capture the VIEWPORT only. A fullPage shot stitches
// a position:fixed overlay over the page behind it, which reads as clipped
// text and a missing button when neither is actually true.
const cont = page.getByRole('button', { name: /continue/i }).first();
if (await cont.isVisible().catch(() => false)) await cont.click();
await page.waitForTimeout(700);
await page.evaluate(() => document.fonts?.ready);
await page.screenshot({ path: 'qa/screenshots/probe-mobile.png' });
await browser.close();
