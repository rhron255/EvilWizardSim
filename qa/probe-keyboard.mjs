/**
 * Can a whole career be played without a mouse?
 *
 * Failure mode 15 says a screenshot can never show a keypress, and until now
 * nothing in `qa/` completed a career on the keyboard. This does, from the title
 * screen to the ending, touching only `page.keyboard` after the first navigation:
 * Enter on the focused door, typing a name, Tab through the creation form,
 * number keys and arrows on the choice cards, Enter to continue past each
 * resolution, Enter through the prophecy, and Tab to Play again.
 *
 * At every transition it records where focus went and whether a focus ring is
 * actually painted on it. A keyboard player whose focus falls back to `<body>`
 * after a modal closes has to Tab from the top of the page again, on every era.
 *
 *   node qa/probe-keyboard.mjs [--width 393] [--height 852]
 *
 * Exits non-zero if the career cannot be finished on the keyboard, or a control
 * a keyboard player must use shows no focus indicator. Focus that lands on
 * `<body>` is REPORTED, not failed: the run screen's number keys work from
 * anywhere, so it costs a keyboard player nothing there — it is only a problem
 * where a Tab is the only way forward.
 */
import { chromium } from 'playwright';

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const W = Number(arg('--width', '393'));
const H = Number(arg('--height', '852'));
const URL = arg('--url', 'http://localhost:5173/');

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const problems = [];
const notes = [];
page.on('console', (m) => m.type() === 'error' && problems.push(`console.error: ${m.text()}`));
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

/** What has focus, and is a ring painted on it? */
const focus = () =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { where: 'body', label: '', ring: false };
    // The name field marks focus with the rule drawn under it (a sibling styled by
    // `.nameInput:focus-visible + .nameRule`), not an outline on the input itself,
    // so an outline/shadow test would call it unindicated when it is not.
    if (el.tagName === 'INPUT' && el.type === 'text') {
      return { where: 'input', label: '', ring: true };
    }
    const cs = getComputedStyle(el);
    const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
    const shadow = cs.boxShadow && cs.boxShadow !== 'none';
    return {
      where: el.tagName.toLowerCase() + (el.getAttribute('role') ? `[${el.getAttribute('role')}]` : ''),
      label: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('name') || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      ring: Boolean(outline || shadow),
    };
  });

const press = async (key, wait = 120) => {
  await page.keyboard.press(key);
  await page.waitForTimeout(wait);
};

/** Tab until the focused control's label matches, counting presses. */
async function tabTo(re, max = 60) {
  for (let i = 1; i <= max; i++) {
    await press('Tab', 40);
    const f = await focus();
    if (re.test(f.label)) return { presses: i, focus: f };
  }
  return null;
}

// ---- title ---------------------------------------------------------------
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// The launch popup is modal on a fresh profile. A keyboard player must be able to
// leave it without a mouse, and focus must be INSIDE it while it is open.
const popupOpen = await page.getByRole('dialog').isVisible().catch(() => false);
if (popupOpen) {
  const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
  if (!inside) problems.push('launch popup: focus is not inside the dialog when it opens');
  await press('Escape', 300);
  if (await page.getByRole('dialog').isVisible().catch(() => false)) {
    // Not every modal closes on Escape — fall back to Tab-to-Dismiss.
    const dismiss = await tabTo(/^dismiss$/i, 12);
    if (!dismiss) problems.push('launch popup: cannot be dismissed with the keyboard');
    else await press('Enter', 300);
    notes.push('launch popup: Escape does not close it (Tab to Dismiss then Enter does)');
  }
}

let f = await focus();
console.log(`  title          focus → ${f.where} "${f.label}" ring=${f.ring}`);
if (!/begin a career/i.test(f.label)) {
  const t = await tabTo(/begin a career/i, 12);
  if (!t) problems.push('title: cannot reach "Begin a career" with Tab');
  notes.push(`title: "Begin a career" is not focused on arrival (${t ? `${t.presses} Tab(s) to reach it` : 'unreachable'})`);
}
f = await focus();
if (!f.ring) problems.push('title: "Begin a career" shows no focus indicator');
await press('Enter', 500);

// ---- creation --------------------------------------------------------------
f = await focus();
console.log(`  creation       focus → ${f.where} "${f.label}" ring=${f.ring}`);
if (f.where !== 'input') {
  notes.push(`creation: the name field is not focused on arrival (focus is ${f.where})`);
  const t = await tabTo(/^$/, 6); // the textbox has no label text; fall through
  void t;
}
await page.keyboard.press('Control+A');
await page.keyboard.type('Keyboard Only', { delay: 15 });
const toBegin = await tabTo(/begin the career/i, 60);
if (!toBegin) {
  problems.push('creation: "Begin the career" cannot be reached with Tab');
} else {
  console.log(`  creation       Tab presses from the name field to "Begin the career": ${toBegin.presses}`);
  if (toBegin.presses > 25) notes.push(`creation: ${toBegin.presses} Tabs from the name to the commit button`);
  if (!toBegin.focus.ring) problems.push('creation: "Begin the career" shows no focus indicator');
  await press('Enter', 700);
}

// ---- first-run guide (modal on a fresh profile) ----------------------------
for (let i = 0; i < 5; i++) {
  const dialog = await page.getByRole('dialog').isVisible().catch(() => false);
  if (!dialog) break;
  f = await focus();
  if (f.where === 'body') notes.push('first-run guide: focus is on <body> while the guide is open');
  await press('Enter', 250);
}

// ---- the run ---------------------------------------------------------------
let eras = 0;
let sawProphecy = false;
let bodyAfterOverlay = 0;
let overlayNoRing = 0;
let arrowsWork = null;
for (let step = 0; step < 170; step++) {
  if (await page.getByRole('button', { name: /play again/i }).first().isVisible().catch(() => false)) break;

  const cards = await page.locator('button[data-option-index]:not([disabled])').count();
  const dialog = await page.getByRole('dialog').isVisible().catch(() => false);

  if (cards > 0 && !dialog) {
    eras++;
    if (arrowsWork === null) {
      // Arrow keys must move focus between the cards.
      await press('ArrowDown', 80);
      const a = await focus();
      arrowsWork = a.where === 'button' && a.label.length > 0;
      if (arrowsWork && !a.ring) problems.push('run: a focused choice card shows no focus indicator');
    }
    // Number keys pick from anywhere; vary the pick so several cards are exercised.
    await press(String(1 + (eras % Math.min(cards, 3))), 120);
    await page.waitForTimeout(900);
    continue;
  }

  if (dialog) {
    f = await focus();
    if (f.where === 'body') bodyAfterOverlay++;
    else if (!f.ring) overlayNoRing++;
    await press('Enter', 200);
    continue;
  }

  // Neither cards nor a dialog: the prophecy interstitial (or a screen mid-transition).
  const body = (await page.textContent('body').catch(() => '')) ?? '';
  if (/the prophecy|a child|is born/i.test(body)) sawProphecy = true;
  await press('Enter', 300); // skip the staging
  f = await focus();
  await press('Enter', 300); // continue once the button is live
}

const atEnd = await page.getByRole('button', { name: /play again/i }).first().isVisible().catch(() => false);
console.log(`  run            ${eras} decisions made with number keys · prophecy ${sawProphecy ? 'seen' : 'not seen'} · arrows move focus: ${arrowsWork}`);
console.log(`  resolution     focus on <body> when the overlay opened: ${bodyAfterOverlay} time(s) · overlay focus without a ring: ${overlayNoRing}`);
if (!atEnd) problems.push('never reached the ending on the keyboard');
if (arrowsWork === false) problems.push('run: arrow keys do not move focus between choice cards');
if (bodyAfterOverlay > 0) notes.push(`resolution: focus was on <body> when ${bodyAfterOverlay} overlay(s) opened (Enter/Escape still work — they are window-level)`);

// ---- ending: Play again must be a Tab away -----------------------------------
if (atEnd) {
  await page.waitForTimeout(3500); // the card reveals in bands
  const start = await focus();
  console.log(`  ending         focus on arrival → ${start.where} "${start.label}"`);
  const t = await tabTo(/play again/i, 80);
  if (!t) problems.push('ending: "Play again" cannot be reached with Tab');
  else {
    console.log(`  ending         Tab presses to "Play again": ${t.presses}`);
    if (t.presses > 30) notes.push(`ending: ${t.presses} Tabs to reach Play again (the card is long; a skip link or focus-on-arrival would help)`);
    if (!t.focus.ring) problems.push('ending: "Play again" shows no focus indicator');
  }
}

await browser.close();
console.log(`\n  notes (reported, not failed):${notes.length ? '' : ' none'}`);
for (const n of notes) console.log(`    · ${n}`);
if (problems.length) {
  console.log(`\n  ✗ ${problems.length} problem(s):`);
  for (const p of [...new Set(problems)]) console.log(`      - ${p}`);
  process.exit(1);
}
console.log('\n  ✓ a whole career plays through on the keyboard alone');
