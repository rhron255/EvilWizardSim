/**
 * Layout + playtest sweep — plays many seeded careers and audits EVERY state.
 *
 * `playthrough.mjs` proves one random run does not crash and shoots eight
 * frames of it. That is a smoke test; it cannot say whether some offer, three
 * eras from the end of a career it did not happen to roll, overflows a 320px
 * phone. The catalogue is ~155 offers of wildly different text length, so the
 * only honest way to know is to look at all of them (failure mode 15).
 *
 *   node qa/sweep-layout.mjs [--width 393] [--height 852] [--runs 6]
 *                            [--seed 1] [--out qa/screenshots/sweep]
 *                            [--url http://localhost:5173]
 *
 * Every state it reaches — decision, resolution overlay, the relic page,
 * prophecy, ending — is audited for:
 *
 *   overflow   an element whose box leaves the viewport horizontally, outside
 *              any deliberate scroller
 *   clip       text cut by `overflow: hidden`, an ellipsis, or a line clamp
 *   tap        an interactive control under 40x40 CSS px
 *   fold       (decision only) is card 1 fully on screen; how many are
 *
 * The first occurrence of each distinct finding is screenshot to `--out`, and
 * a transcript of every decision card seen is written to `transcript.json` so
 * the copy can be read the way a player reads it.
 *
 * Exit code is non-zero if any run threw, stalled, or logged a console error.
 * Layout findings are REPORTED, not failed on — the point is a list to read,
 * not another gate that invites someone to loosen it.
 */
import { chromium } from 'playwright';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { dismissChangelogPopup, dismissFirstRunGuide } from './first-run.mjs';

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const URL = arg('--url', 'http://localhost:5173');
const WIDTH = Number(arg('--width', '393'));
const HEIGHT = Number(arg('--height', '852'));
const RUNS = Number(arg('--runs', '6'));
const SEED = Number(arg('--seed', '1'));
const OUT = arg('--out', 'qa/screenshots/sweep');

await mkdir(OUT, { recursive: true });
// Same stale-shot trap `playthrough.mjs` documents: a leftover PNG from an
// older build reads as a bug that was already fixed.
for (const f of await readdir(OUT)) {
  if (f.startsWith(`${WIDTH}w-`) && f.endsWith('.png')) await unlink(path.join(OUT, f));
}

/** mulberry32 — a seeded coin, so a finding can be reproduced by its run number. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OPTIONS = 'button[data-option-index]:not([disabled])';
const FLOW = 'button:not([data-option-index]):not([disabled])';

/** Runs in the page. Returns findings for whatever is on screen right now. */
function auditInPage() {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const clean = (el) =>
    String(el.className?.baseVal ?? el.className ?? '')
      .split(/\s+/)
      .map((c) => c.replace(/^_/, '').replace(/_[a-z0-9]{4,6}_\d+$/, ''))
      .filter(Boolean)
      .join('.');
  const label = (el) => `${el.tagName.toLowerCase()}.${clean(el)}`.slice(0, 60);
  const text = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48);

  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth) return true;
    }
    return false;
  };

  const found = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('[aria-hidden="true"]')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    // Visually-hidden by design (`srOnly`, the hidden radio behind a label): 1px boxes
    // are how a control is kept for assistive tech, not a layout finding.
    if (r.width <= 2 && r.height <= 2) continue;
    // Anything fully transparent is mid-reveal or deliberately hidden.
    let o = 1;
    for (let p = el; p; p = p.parentElement) o *= Number(getComputedStyle(p).opacity);
    if (o < 0.05) continue;

    if ((r.right > vw + 1 || r.left < -1) && !inScroller(el)) {
      found.push({ kind: 'overflow', what: label(el), text: text(el), detail: `${Math.round(r.left)}..${Math.round(r.right)} of ${vw}` });
    }
    const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasOwnText) {
      const clipsX = /(hidden|clip)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1;
      const ellipsis = cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1;
      const clamp =
        (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') && el.scrollHeight > el.clientHeight + 1;
      if (clipsX || ellipsis || clamp) {
        found.push({ kind: 'clip', what: label(el), text: text(el), detail: `${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}` });
      }
    }
    const interactive = el.matches('button, a[href], input, select, textarea, [role="button"], summary');
    if (interactive && (r.height < 40 || r.width < 40)) {
      // Inline text links inside prose are exempt from a target size rule.
      found.push({ kind: 'tap', what: label(el), text: text(el), detail: `${Math.round(r.width)}x${Math.round(r.height)}` });
    }
  }

  const options = [...document.querySelectorAll('button[data-option-index]')];
  const fold = options.length
    ? {
        count: options.length,
        firstTop: Math.round(options[0].getBoundingClientRect().top),
        firstFullyVisible: options[0].getBoundingClientRect().bottom <= vh,
        fullyVisible: options.filter((o) => o.getBoundingClientRect().bottom <= vh).length,
      }
    : null;
  return { found, fold, docWidth: document.documentElement.scrollWidth, vw };
}

const findings = new Map(); // signature -> { first, count, runs:Set, shot }
const folds = [];
const transcript = [];
const problems = [];
let shotCount = 0;

async function audit(page, state, runNo, era) {
  const res = await page.evaluate(auditInPage);
  if (res.docWidth > res.vw + 1) {
    res.found.push({ kind: 'overflow', what: 'document', text: '', detail: `scrollWidth ${res.docWidth} > ${res.vw}` });
  }
  for (const f of res.found) {
    const sig = `${state}|${f.kind}|${f.what}`;
    let entry = findings.get(sig);
    if (!entry) {
      entry = { state, kind: f.kind, what: f.what, text: f.text, detail: f.detail, count: 0, runs: new Set(), shot: null };
      findings.set(sig, entry);
      const file = path.join(OUT, `${WIDTH}w-${String(++shotCount).padStart(3, '0')}-${state}-${f.kind}.png`);
      await page.screenshot({ path: file }).catch(() => {});
      entry.shot = file;
    }
    entry.count++;
    entry.runs.add(runNo);
  }
  if (state === 'decision' && res.fold) folds.push({ run: runNo, era, ...res.fold });
}

async function playOne(browser, runNo) {
  const rand = rng(SEED * 1000 + runNo);
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`run ${runNo}: console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`run ${runNo}: pageerror: ${e.message}`));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await dismissChangelogPopup(page).catch(() => {});
  await audit(page, 'title', runNo, 0);
  await page.getByRole('button', { name: /begin a career/i }).click();
  await page.waitForTimeout(350);

  // Pick an origin at random, so all four are covered across a sweep.
  const origins = page.locator('label').filter({ has: page.locator('[class*="originInner"]') });
  const originCount = await origins.count();
  if (originCount) await origins.nth(Math.floor(rand() * originCount)).click();
  await page.getByRole('textbox').first().fill(`Sweep Wizard ${runNo}`);
  await page.evaluate(() => document.fonts?.ready);
  await audit(page, 'creation', runNo, 0);
  await page.getByRole('button', { name: /begin the career/i }).click();
  await page.waitForTimeout(500);
  await dismissFirstRunGuide(page);
  await page.waitForTimeout(400);

  let era = 0;
  let relicPageDone = false;
  let sawEnding = false;
  for (let step = 0; step < 160; step++) {
    const again = page.getByRole('button', { name: /play again|another career|new run/i }).first();
    if (await again.isVisible().catch(() => false)) {
      sawEnding = true;
      break;
    }

    const options = page.locator(OPTIONS);
    const count = await options.count().catch(() => 0);
    if (count > 0) {
      era++;
      await page.waitForTimeout(250);
      await audit(page, 'decision', runNo, era);
      transcript.push({
        run: runNo,
        era,
        text: await page.evaluate(() => {
          const main = document.querySelector('main');
          return (main?.innerText ?? '').replace(/\n{2,}/g, '\n').trim();
        }),
      });
      if (!relicPageDone && era === 6) {
        relicPageDone = true;
        const open = page.getByRole('button', { name: /Relics/ }).first();
        if (await open.isVisible().catch(() => false)) {
          await open.click();
          await page.waitForTimeout(400);
          await audit(page, 'relic-page', runNo, era);
          await page.getByRole('button', { name: /back to the decision/i }).first().click().catch(() => {});
          await page.waitForTimeout(300);
        }
      }
      // Weighted toward the first card, like a hurried player, but not always.
      const pick = rand() < 0.45 ? 0 : Math.floor(rand() * count);
      await options.nth(pick).click();
      // Long enough for the gamble reveal (~1.55s) to settle before auditing.
      await page.waitForTimeout(1700);
      if (await page.locator('[role="dialog"]').first().isVisible().catch(() => false)) {
        await audit(page, 'resolution', runNo, era);
      }
      continue;
    }

    const flow = page.locator(FLOW);
    const flowCount = await flow.count().catch(() => 0);
    if (flowCount === 0) {
      problems.push(`run ${runNo}: stalled at step ${step} (era ${era}): nothing enabled to click`);
      break;
    }
    const body = (await page.textContent('body').catch(() => '')) ?? '';
    if (/the prophecy/i.test(body) && !(await page.locator('[role="dialog"]').first().isVisible().catch(() => false))) {
      await audit(page, 'prophecy', runNo, era);
    }
    await flow.nth(flowCount - 1).click();
    await page.waitForTimeout(300);
  }

  if (sawEnding) {
    await page.waitForTimeout(3200); // the card reveals in staged bands
    await audit(page, 'ending', runNo, era);
  } else {
    problems.push(`run ${runNo}: never reached an ending`);
  }
  await context.close();
  return { era, sawEnding };
}

console.log(`\n▸ sweep  ${URL}  @${WIDTH}x${HEIGHT}  runs=${RUNS} seed=${SEED}\n`);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
for (let r = 1; r <= RUNS; r++) {
  const { era, sawEnding } = await playOne(browser, r);
  console.log(`  run ${r}: ${era} decisions · ${sawEnding ? 'ending reached' : 'NO ENDING'}`);
}
await browser.close();

// ---- Report ----------------------------------------------------------------
const rows = [...findings.values()].sort((a, b) => b.count - a.count);
console.log(`\n  LAYOUT FINDINGS (${rows.length} distinct)\n`);
for (const f of rows) {
  console.log(
    `  [${f.kind.padEnd(8)}] ${f.state.padEnd(10)} ${f.what.padEnd(46)} x${String(f.count).padEnd(3)} runs=${f.runs.size}  ${f.detail}  "${f.text}"`,
  );
}

if (folds.length) {
  const first = folds.filter((f) => f.firstFullyVisible).length;
  const two = folds.filter((f) => f.fullyVisible >= 2).length;
  const all = folds.filter((f) => f.fullyVisible === f.count).length;
  const tops = folds.map((f) => f.firstTop).sort((a, b) => a - b);
  console.log(
    `\n  FOLD  ${folds.length} decisions · card 1 fully visible ${first} (${Math.round((100 * first) / folds.length)}%) · 2+ cards ${two} (${Math.round((100 * two) / folds.length)}%) · all cards ${all} (${Math.round((100 * all) / folds.length)}%)`,
  );
  console.log(`        first card top: min ${tops[0]} · median ${tops[Math.floor(tops.length / 2)]} · max ${tops[tops.length - 1]} (viewport ${HEIGHT})`);
}

await writeFile(
  path.join(OUT, `${WIDTH}w-transcript.json`),
  JSON.stringify({ width: WIDTH, height: HEIGHT, seed: SEED, transcript, findings: rows.map((f) => ({ ...f, runs: [...f.runs] })) }, null, 1),
);
console.log(`\n  transcript: ${path.join(OUT, `${WIDTH}w-transcript.json`)} (${transcript.length} decisions)`);

if (problems.length) {
  console.log(`\n  ✗ ${problems.length} problem(s):`);
  for (const p of [...new Set(problems)].slice(0, 20)) console.log(`      - ${p}`);
  process.exit(1);
}
console.log('\n  ✓ no console errors, stalls, or missing endings');
