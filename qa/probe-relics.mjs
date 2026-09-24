/**
 * The relic page (issue #78) — probes the DOM for the entry button, the
 * page heading, relic cards (or the empty state), the lost-this-run
 * section, and the keyboard path (Tab to the Relics button, Enter to open;
 * Tab to Back, Enter to return, with focus landing correctly both ways).
 *
 * A brand-new run at era 1 has zero relics, so this plays a handful of eras
 * forward first (same pattern `playthrough.mjs`/`probe-ending.mjs` use:
 * click whichever offer option is enabled) to get an established run before
 * checking the populated page. It also opens the page immediately on a
 * fresh run to confirm the empty state renders correctly.
 *
 *   node qa/probe-relics.mjs [--url http://localhost:5173]
 */
import { chromium } from 'playwright';
import { dismissChangelogPopup, dismissFirstRunGuide } from './first-run.mjs';

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const URL = arg('--url', 'http://localhost:5173');

const problems = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });
await dismissChangelogPopup(page).catch(() => {});
await page.getByRole('button', { name: /begin a career/i }).click();
await page.waitForTimeout(400);
await page.getByRole('textbox').first().fill('Malachar the Unpaid');
await page.getByRole('button', { name: /begin the career/i }).click();
await page.waitForTimeout(600);
await dismissFirstRunGuide(page);
await page.waitForTimeout(400);

// ---- The entry point exists ------------------------------------------
const openButton = page.getByRole('button', { name: /Relics/ }).first();
if (!(await openButton.isVisible().catch(() => false))) {
  problems.push('entry point: no Relics button found on a fresh run');
}

// ---- Fresh run: the empty state ---------------------------------------
await openButton.click();
await page.waitForTimeout(300);
const heading = page.getByRole('heading', { name: 'Your relics' });
if (!(await heading.isVisible().catch(() => false))) {
  problems.push('relic page: heading did not appear on open');
}
const emptyVisible = await page.getByText(/No relics recovered yet/).isVisible().catch(() => false);
if (!emptyVisible) {
  problems.push('relic page: empty state did not render for a fresh run with no relics');
}

// Back returns to the decision.
const backButton = page.getByRole('button', { name: /Back to the decision/ }).first();
await backButton.click();
await page.waitForTimeout(300);
if (await heading.isVisible().catch(() => false)) {
  problems.push('relic page: still visible after Back');
}

// ---- Keyboard path: Tab to Relics, Enter to open; Tab to Back, Enter back
await openButton.focus();
const focusedBeforeOpen = await page.evaluate(() => document.activeElement?.textContent ?? '');
if (!/Relics/.test(focusedBeforeOpen)) {
  problems.push(`keyboard: focus is not on the Relics button before Enter (was "${focusedBeforeOpen}")`);
}
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
if (!(await heading.isVisible().catch(() => false))) {
  problems.push('keyboard: Enter on the Relics button did not open the relic page');
}
const focusedOnOpen = await page.evaluate(() => document.activeElement?.textContent ?? '');
if (!/Your relics/.test(focusedOnOpen)) {
  problems.push(`keyboard: focus did not move to the relic page heading on open (was "${focusedOnOpen}")`);
}

await backButton.focus();
const focusedBeforeBack = await page.evaluate(() => document.activeElement?.textContent ?? '');
if (!/Back to the decision/.test(focusedBeforeBack)) {
  problems.push(`keyboard: focus is not on Back before Enter (was "${focusedBeforeBack}")`);
}
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
if (await heading.isVisible().catch(() => false)) {
  problems.push('keyboard: Enter on Back did not return to the decision');
}
const focusedAfterBack = await page.evaluate(() => document.activeElement?.textContent ?? '');
if (!/Relics/.test(focusedAfterBack)) {
  problems.push(`keyboard: focus did not return to the Relics button after Back (was "${focusedAfterBack}")`);
}

// ---- Play a handful of eras forward, then check a populated page -------
const OPTIONS = 'button[data-option-index]:not([disabled])';
const FLOW = 'button:not([data-option-index]):not([disabled])';
let eras = 0;
for (let step = 0; step < 60 && eras < 8; step++) {
  const options = page.locator(OPTIONS);
  const count = await options.count().catch(() => 0);
  if (count > 0) {
    await options.nth(0).click();
    eras++;
    await page.waitForTimeout(250);
    continue;
  }
  const flow = page.locator(FLOW);
  const flowCount = await flow.count().catch(() => 0);
  if (flowCount === 0) break;
  await flow.nth(flowCount - 1).click();
  await page.waitForTimeout(250);
}

// A resolution overlay (the era's roll/consequence beat) may still be up
// after the last click in the loop above — Enter dismisses it, same as a
// player pressing Continue.
if (await page.getByRole('dialog').first().isVisible({ timeout: 500 }).catch(() => false)) {
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
}

const openAgain = page.getByRole('button', { name: /Relics/ }).first();
const label = (await openAgain.textContent().catch(() => '')) ?? '';
const relicCount = Number((label.match(/(\d+)/) || [])[1] ?? 0);
await openAgain.click();
await page.waitForTimeout(300);

if (relicCount > 0) {
  const cards = await page.locator('article[data-rarity]').count().catch(() => 0);
  if (cards === 0) {
    problems.push(`relic page: label reports ${relicCount} relics but no relic cards rendered`);
  } else {
    console.log(`  relic cards : ${cards} rendered (label said ${relicCount})`);
  }
  const wardsLine = await page.getByText(/Relics add/).isVisible().catch(() => false);
  if (!wardsLine) problems.push('relic page: wards figure ("Relics add N to your wards") not found');
} else {
  console.log('  relic count : 0 after 8 eras — empty state expected, not a populated-card check');
}

const lostHeading = page.getByRole('heading', { name: 'Lost this run' });
const hasLost = await lostHeading.isVisible().catch(() => false);
console.log(`  lost section: ${hasLost ? 'present' : 'absent (nothing lost yet, expected on many runs)'}`);

await page.screenshot({ path: 'qa/screenshots/probe-relics-populated.png', fullPage: true });

await browser.close();

if (problems.length) {
  console.log(`\n  ✗ ${problems.length} problem(s):`);
  for (const p of problems) console.log(`      - ${p}`);
  process.exit(1);
}
console.log('\n  ✓ relic page probe clean\n');
