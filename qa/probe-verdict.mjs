/**
 * The verdict, at arm's length.
 *
 * "The failure / success indication is not clear enough." Type size and colour
 * are exactly the kind of claim a screenshot can settle and a unit test
 * cannot, so this reads the computed styles for both outcomes and shoots them
 * at the reference device.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5178/qa/run-harness.html';
const browser = await chromium.launch();
const out = {};

for (const [scene, label] of [
  ['resolution', 'success'],
  ['resolutionFail', 'failure'],
  ['resolutionFlat', 'deterministic'],
]) {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.log(`[${label}] page error:`, e.message));
  await page.goto(`${BASE}?scene=${scene}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1900);

  out[label] = await page.evaluate(() => {
    // `[data-outcome]` also matches every ledger row, and the ledger comes
    // first in the DOM — scope to the overlay.
    const card = document.querySelector('[role="dialog"] [data-outcome]');
    const word = card.querySelector('p');
    const cs = getComputedStyle(word);
    const odds = [...card.querySelectorAll('p')].find((p) => /Against the odds/.test(p.textContent));
    const relicNew = [...card.querySelectorAll('span')].find(
      (s) => s.textContent.trim() === 'Never seen before',
    );
    return {
      word: word.textContent.trim(),
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      color: cs.color,
      cardBorderTop: getComputedStyle(card).borderTopColor,
      againstTheOdds: odds ? odds.textContent.replace(/\s+/g, ' ').trim() : null,
      neverSeenBefore: relicNew ? getComputedStyle(relicNew).opacity : null,
      cardFits: card.scrollHeight <= card.clientHeight,
    };
  });
  await page.screenshot({ path: `qa/screenshots/verdict-${label}.png` });
  await page.close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
