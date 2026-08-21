// Probe the "while you were elsewhere" block at the reference device.
// Viewport shots only: the overlay is position:fixed and fullPage stitches it
// over the content behind (CLAUDE.md § 7).
import { chromium } from 'playwright';
const BASE = 'http://localhost:5178/qa/run-harness.html';
const browser = await chromium.launch();
for (const [w, h, tag] of [[393, 852, 'phone'], [1440, 900, 'wide']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.log(`[${tag}] page error:`, e.message));
  page.on('console', (m) => m.type() === 'error' && console.log(`[${tag}] console:`, m.text()));
  await page.goto(`${BASE}?scene=resolutionFail`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  const data = await page.evaluate(() => {
    const label = [...document.querySelectorAll('p')].find(
      (p) => p.textContent.trim() === 'While you were elsewhere',
    );
    if (!label) return { found: false };
    const block = label.parentElement;
    const card = block.closest('[class*="card"]');
    const r = block.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    return {
      found: true,
      opacity: getComputedStyle(block).opacity,
      block: { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) },
      card: {
        top: Math.round(cr.top),
        bottom: Math.round(cr.bottom),
        scrollH: card.scrollHeight,
        clientH: card.clientHeight,
        scrolls: card.scrollHeight > card.clientHeight,
      },
      lines: [...block.querySelectorAll('li')].map((li) => li.innerText.replace(/\n/g, ' · ')),
      viewport: { w: innerWidth, h: innerHeight },
    };
  });
  console.log(tag, JSON.stringify(data, null, 2));
  await page.screenshot({ path: `qa/screenshots/systemic-${tag}.png` });
  await page.close();
}
await browser.close();
