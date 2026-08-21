/** Land on the prophecy interstitial and hold there long enough to look at it. */
import { chromium } from 'playwright';
import { dismissFirstRunGuide } from './first-run.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE.ERR:', m.text()));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /begin a career/i }).click();
await page.waitForTimeout(400);
await page.getByRole('textbox').first().fill('Malachar the Unpaid');
await page.getByRole('button', { name: /begin the career/i }).click();
await page.waitForTimeout(600);

// A fresh profile is a first-time player: the guide is modal over the choice
// cards until it is walked.
await dismissFirstRunGuide(page);

const OPTIONS = 'button[data-option-index]:not([disabled])';

// The interstitial is the only screen with no ledger and no offer options.
const onInterstitial = async () => {
  const opts = await page.locator(OPTIONS).count().catch(() => 0);
  if (opts > 0) return false;
  const body = (await page.textContent('body').catch(() => '')) ?? '';
  return /The child's name is|child was born this year/i.test(body);
};

let found = false;
for (let i = 0; i < 120 && !found; i++) {
  if (await onInterstitial()) {
    found = true;
    break;
  }
  const opts = page.locator(OPTIONS);
  const n = await opts.count().catch(() => 0);
  if (n > 0) {
    await opts.nth(0).click();
    await page.waitForTimeout(220);
    continue;
  }
  const cont = page.getByRole('button', { name: /continue|onward|proceed|go on|accept/i }).first();
  if (!(await cont.isVisible().catch(() => false))) break;
  await cont.click();
  await page.waitForTimeout(260);
}

if (!found) {
  console.log('never reached the interstitial');
} else {
  // The set piece is staged; let it finish before judging it.
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(3300);
  await page.screenshot({ path: 'qa/screenshots/probe-prophecy-late.png', fullPage: true });
  console.log('captured qa/screenshots/probe-prophecy-late.png');
}

await browser.close();
