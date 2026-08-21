/**
 * The first-run guide, as a player with no localStorage actually meets it.
 *
 * Checks the three things a component test cannot: that it mounts at all in
 * the real app (this repo's most repeated failure is a correct mapping nobody
 * calls), that it fits the reference device without scrolling, and that it
 * does not come back on the second career.
 */
import { chromium } from 'playwright';

const arg = (f, d) => {
  const i = process.argv.indexOf(f);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const W = Number(arg('--width', '393'));
const H = Number(arg('--height', '852'));

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));

async function startCareer(name) {
  await page.getByRole('button', { name: /begin a career|another career/i }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('textbox').first().fill(name);
  await page.getByRole('button', { name: /begin the career/i }).click();
  await page.waitForTimeout(700);
}

const guide = () => page.getByRole('dialog').filter({ hasText: 'One era at a time' });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

await startCareer('Malachar the Unpaid');

const shown = await guide().isVisible();
const box = await page.evaluate(() => {
  const card = document.querySelector('[role="dialog"] > div');
  if (!card) return null;
  const r = card.getBoundingClientRect();
  return {
    top: Math.round(r.top),
    bottom: Math.round(r.bottom),
    height: Math.round(r.height),
    fitsViewport: r.top >= 0 && r.bottom <= innerHeight,
    // Is the run screen legible behind it? The guide names the strip.
    allegiancesBehind: Boolean(document.querySelector('ul[aria-label="Faction standing"]')),
  };
});

const titles = [];
for (let i = 0; i < 3; i++) {
  titles.push(await page.locator('[role="dialog"] h2').innerText());
  await page.screenshot({ path: `qa/screenshots/first-run-${W}-card${i + 1}.png` });
  await page.getByRole('button', { name: /next|begin/i }).click();
  await page.waitForTimeout(320);
}

const goneAfterWalk = (await page.getByRole('dialog').count()) === 0;
const optionsReachable = await page.locator('button[data-option-index]').first().isVisible();

// Second career, same browser profile: it must not come back.
await page.evaluate(() => scrollTo(0, 0));
await page.locator('button[data-option-index]').first().click();
await page.waitForTimeout(300);
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await startCareer('Second Attempt');
const backOnSecondRun = (await page.getByRole('dialog').count()) > 0;

console.log(
  JSON.stringify(
    { shown, box, titles, goneAfterWalk, optionsReachable, backOnSecondRun, problems },
    null,
    2,
  ),
);
await browser.close();
process.exit(shown && goneAfterWalk && !backOnSecondRun && problems.length === 0 ? 0 : 1);
