// How much sentence fits on ONE line of the reprisal warning at 393px.
// The header sits above the choice cards, so a second line costs 19px of the
// one budget that matters on the reference device.
//
// Six factions carry the same lethal condition now (issue #14), so this
// measures a candidate per faction rather than the Academy's alone — the
// Academy's line is the one the budget was originally set by, and every other
// faction's noun has to fit the same space.
//
//   node qa/probe-seal-fit.mjs [--url http://localhost:5173]
import { chromium } from 'playwright';

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const URL = arg('--url', 'http://localhost:5173');

const CANDIDATES = [
  // The line the budget was set by, in both of its forms.
  'The Academy is 25 from the gem · acts at 55 Notoriety.',
  'The Academy is done deliberating · your fame qualifies.',
  // One per faction, distance form then past-the-line form.
  'The Covenant is 25 from the ash · acts at 55 Notoriety.',
  'The Covenant has a use for you · your fame qualifies.',
  'The Hand is 25 from the auction · acts at 55 Notoriety.',
  'The Hand has called the account · your fame qualifies.',
  'The Choir is 25 from the loam · acts at 55 Notoriety.',
  'The Choir wants the ground back · your fame qualifies.',
  'The Crown is 25 from the writ · acts at 55 Notoriety.',
  'The Crown has drawn up the writ · your fame qualifies.',
  'The Worm is 25 from the schedule · acts at 55 Notoriety.',
  'The Worm has set your date · your fame qualifies.',
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
await page.goto(`${URL}/qa/run-harness.html?scene=run`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);

const out = await page.evaluate((texts) => {
  // The warning is the paragraph naming a faction and a threshold. Found by
  // its own text rather than by a class, so a renamed CSS module cannot make
  // this probe quietly measure nothing.
  const line = [...document.querySelectorAll('p')].find((p) =>
    / · (your fame qualifies|acts at)/.test(p.textContent ?? ''),
  );
  if (!line) return { missing: true };
  const shipped = line.textContent;
  const w = Math.round(line.getBoundingClientRect().width);
  const shippedHeight = Math.round(line.getBoundingClientRect().height);
  // The height of exactly ONE line, from the stylesheet's `line-height`
  // rather than from any rendered text. A height measured off the shipped
  // line (the earlier version of this probe) is not immune to the same trap
  // it exists to catch: if the shipped line is ALREADY wrapped — a text,
  // font, or layout regression — that measurement records the WRAPPED
  // (two-line) height as "one line", and a candidate that also wraps to
  // that same height never registers as taller than it, so the probe would
  // report success while every warning on screen is wrapped. `line-height`
  // is a stylesheet property, resolved from font metrics alone — it cannot
  // itself be "wrapped", so it stays a true one-line baseline regardless of
  // what the shipped text happens to be doing.
  const computed = parseFloat(getComputedStyle(line).lineHeight);
  let one;
  if (Number.isFinite(computed)) {
    one = computed;
  } else {
    // `line-height: normal` has no resolvable px value from
    // `getComputedStyle` — fall back to a single short character, which
    // cannot wrap at this column width regardless of font.
    line.textContent = 'X';
    one = line.getBoundingClientRect().height;
  }
  one = Math.round(one);
  const rows = texts.map((t) => {
    line.textContent = t;
    return { h: Math.round(line.getBoundingClientRect().height), chars: t.length, t };
  });
  line.textContent = shipped;
  return { width: w, shipped, shippedHeight, one, rows };
}, CANDIDATES);

if (out.missing) {
  console.error('no reprisal warning on screen — the demo run should be showing one');
  await browser.close();
  process.exit(1);
}

console.log(`column ${out.width}px · one line = ${out.one}px · shipped line: "${out.shipped}" (${out.shippedHeight}px)`);

if (out.shippedHeight > out.one) {
  console.error(
    `the SHIPPED line itself is ${out.shippedHeight}px, taller than one line (${out.one}px) — ` +
      'it is already wrapped in production, before any candidate is even measured',
  );
  await browser.close();
  process.exit(1);
}

let wrapped = 0;
for (const r of out.rows) {
  const flag = r.h > out.one ? ' WRAPS' : '';
  if (r.h > out.one) wrapped++;
  console.log(`${String(r.h).padStart(3)}px  ${String(r.chars).padStart(3)}ch  ${r.t}${flag}`);
}
await browser.close();
if (wrapped > 0) {
  console.error(`${wrapped} candidate(s) wrap to a second line at 393px`);
  process.exit(1);
}
console.log('every variant fits one line');
