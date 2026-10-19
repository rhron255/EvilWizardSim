/**
 * Screen-reader structure probe (issue #120).
 *
 * Plays a career and checks what an assistive-technology user would meet:
 *  - a gamble card's accessible name carries both the success and failure words;
 *  - the result dialog has a non-empty accessible description (roll, deed, effects);
 *  - after Continue, focus is NOT on <body> (it lands on the new era's title);
 *  - the stats list is a real list, with no <dt>/<dd> inside a <button>;
 *  - the prophecy hand-off button, if one appears, has a description.
 * It also prints an ariaSnapshot of the decision and the resolution for reading.
 *
 *   node qa/probe-aria.mjs [--width 393] [--height 852] [--eras 25]
 *
 * Enters through `openApp` (failure mode 19). Exits non-zero on any problem.
 * jsdom and this probe do not replace a VoiceOver / TalkBack / NVDA pass.
 */
import { chromium } from 'playwright';
import { dismissFirstRunGuide, openApp } from './first-run.mjs';

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const W = Number(arg('--width', '393'));
const H = Number(arg('--height', '852'));
const ERAS = Number(arg('--eras', '25'));

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: W, height: H }, hasTouch: true });
await openApp(page);
await page.getByRole('button', { name: /begin a career/i }).click();
await page.waitForTimeout(300);
await page.getByRole('textbox').first().fill('Aria Tester');
await page.getByRole('button', { name: /begin the career/i }).click();
await page.waitForTimeout(500);
await dismissFirstRunGuide(page);
await page.waitForTimeout(400);

const problems = [];
let gambles = 0;
let dialogs = 0;
let refocused = 0;
let printed = { decision: false, resolution: false };

for (let era = 1; era <= ERAS; era++) {
  const options = page.locator('button[data-option-index]:not([disabled])');
  const n = await options.count();
  if (!n) break;

  const structure = await page.evaluate(() => ({
    dtInButton: document.querySelectorAll('button dt, button dd').length,
    dl: document.querySelectorAll('main dl').length,
    statsIsList: Boolean(document.querySelector('main ul li button[aria-expanded]')),
  }));
  if (structure.dtInButton) problems.push(`era ${era}: <dt>/<dd> inside a <button>`);
  if (!structure.statsIsList) problems.push(`era ${era}: the stats are not a list of buttons`);

  const names = await options.evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') ?? e.textContent ?? '').toLowerCase()));
  names.forEach((name, i) => {
    if (!/\d+\s*%/.test(name)) return;
    gambles++;
    if (!/if it works/.test(name) || !/if it fails/.test(name)) problems.push(`era ${era}: gamble card ${i + 1} name lacks the "if it works" / "if it fails" words`);
  });
  if (!printed.decision) {
    printed.decision = true;
    console.log('\n--- decision snapshot ---\n' + (await page.locator('main').ariaSnapshot()).slice(0, 1800));
  }

  await options.nth(era % n).click();
  await page.waitForTimeout(1800);

  const dialog = page.getByRole('dialog').last();
  if (await dialog.isVisible().catch(() => false)) {
    dialogs++;
    const desc = await dialog.evaluate((el) =>
      (el.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
        .filter(Boolean)
        .join(' '),
    );
    if (desc.length < 10) problems.push(`era ${era}: result dialog has no usable description`);
    if (!printed.resolution) {
      printed.resolution = true;
      console.log('\n--- resolution snapshot ---\n' + (await dialog.ariaSnapshot()).slice(0, 1800) + `\n  description: ${desc.slice(0, 200)}`);
    }
    await page.getByRole('button', { name: /^continue/i }).click();
    await page.waitForTimeout(500);
  }

  const handoff = page.locator('[aria-describedby="prophecy-handoff"]');
  if (await handoff.isVisible().catch(() => false)) {
    const text = await page.locator('#prophecy-handoff').textContent().catch(() => '');
    if (!text?.trim()) problems.push('prophecy: hand-off description is empty');
    console.log('  prophecy hand-off described: ' + (text ?? '').trim().slice(0, 80));
    await handoff.click();
    await page.waitForTimeout(600);
    continue;
  }
  if (await page.getByRole('button', { name: /play again/i }).isVisible().catch(() => false)) break;

  const active = await page.evaluate(() => ({ tag: document.activeElement?.tagName, body: document.activeElement === document.body }));
  if (active.body) problems.push(`era ${era}: focus is on <body> after Continue`);
  else if (active.tag === 'H2') refocused++;
}

await browser.close();
console.log(`\n▸ aria  @${W}x${H}  gambles ${gambles} · dialogs ${dialogs} · refocused on title ${refocused}`);
if (!gambles) problems.push('no gamble card was met; the name check measured nothing');
if (!dialogs) problems.push('no result dialog was met');
if (problems.length) {
  console.log(`  ✗ ${problems.length} problem(s):`);
  for (const p of [...new Set(problems)]) console.log(`      - ${p}`);
  process.exit(1);
}
console.log('  ✓ names, descriptions and focus hold');
