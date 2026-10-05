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
 *                            [--career-seed 7]
 *
 * Every state it reaches — the creation screen, decision, resolution overlay,
 * the relic page, prophecy, ending, and the Necrolexicon opened from the
 * ending card (each of its tabs in turn) — is audited for:
 *
 *   overflow   an element whose box leaves the viewport horizontally, outside
 *              any deliberate scroller
 *   clip       text cut by `overflow: hidden`, an ellipsis, or a line clamp
 *   tap        an interactive control whose HIT AREA is under 44x44 CSS px
 *   overlap    two controls' hit areas cross, or one's hit area lies over
 *              another's own box (it would take that control's taps)
 *   fold       (decision only) is card 1 fully on screen; how many are
 *
 * The hit area is what a finger actually lands on, not the element's box: a
 * compact pill extends it with a transparent `::after` (FactionStandings'
 * toggle, the stat buttons, the Relics pill), so the box alone under-reports
 * it and was flagging all three as too small. It is measured by asking the
 * page — `document.elementFromPoint` along the control's centre lines, across
 * its box and any absolutely positioned pseudo-element it extends itself by —
 * so whatever covers or clips it counts the way it counts for a thumb. A
 * control whose own centre belongs to something else (the run screen under
 * the resolution overlay's scrim) cannot be tapped at all right now, and is
 * skipped rather than reported as zero pixels tall.
 *
 * The first occurrence of each distinct finding is screenshot to `--out`, and
 * a transcript of every decision card seen is written to `transcript.json` so
 * the copy can be read the way a player reads it.
 *
 * The sweep's own coin is seeded, but the game rolls its careers from the
 * clock, so two sweeps meet different offers and their FOLD numbers differ by
 * tens of pixels with nothing changed. `--career-seed` pins the game's dice
 * too (`Math.random` and `Date.now`, before the app loads), so the same
 * careers replay card for card: run it against a build before and after a
 * change, and every first-card top that moved is the change.
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
const CAREER_SEED = arg('--career-seed', null);

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

  // ---- hit areas ----------------------------------------------------------
  // WCAG 2.5.5's 44px, the figure every hit-area comment in the run screen
  // cites (Apple's HIG uses the same 44pt). It used to be 40 here, which a
  // 43px Relics pill passed.
  const TAP = 44;
  // A label wrapping a radio or checkbox is the control a finger meets: the
  // input inside it is a 1px `srOnly` box (skipped below), and the label's box
  // and any pseudo-element it extends itself by are what select it — the
  // creation screen's epithet chips, origin cards and length options.
  const INTERACTIVE =
    'button, a[href], input, select, textarea, [role="button"], summary, label:has(input[type="radio"], input[type="checkbox"])';
  const ownerAt = (x, y) => document.elementFromPoint(x, y)?.closest(INTERACTIVE) ?? null;

  /** The nearest box an absolutely positioned child of `el` is placed against: its padding box. */
  const containingBlock = (el) => {
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.position !== 'static' || cs.transform !== 'none' || cs.filter !== 'none' || cs.containerType !== 'normal' || /paint|layout|strict|content/.test(cs.contain)) {
        const r = p.getBoundingClientRect();
        return { left: r.left + p.clientLeft, top: r.top + p.clientTop };
      }
    }
    return { left: -window.scrollX, top: -window.scrollY };
  };

  /** The control's box, grown by any absolutely positioned pseudo-element that takes pointer events. */
  const declaredHit = (el) => {
    const r = el.getBoundingClientRect();
    const box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    for (const which of ['::before', '::after']) {
      const ps = getComputedStyle(el, which);
      if (ps.content === 'none' || ps.content === 'normal' || ps.display === 'none') continue;
      if (ps.pointerEvents === 'none' || ps.visibility === 'hidden') continue;
      if (ps.position !== 'absolute') continue; // an in-flow one sits inside the box already
      // A positioned box's insets and size resolve to their used pixels.
      const cb = containingBlock(el);
      const left = cb.left + parseFloat(ps.left);
      const top = cb.top + parseFloat(ps.top);
      const w = parseFloat(ps.width);
      const h = parseFloat(ps.height);
      if (![left, top, w, h].every(Number.isFinite)) continue;
      box.left = Math.min(box.left, left);
      box.top = Math.min(box.top, top);
      box.right = Math.max(box.right, left + w);
      box.bottom = Math.max(box.bottom, top + h);
    }
    return box;
  };

  /**
   * The pixels along one line, through `from`, that land on `el`.
   *
   * Sampled at whole pixels, not pixel centres. Chromium's `elementFromPoint`
   * answers for the whole pixel a point starts in: a box from 310 to 348
   * owns every y in (309, 348), so a sample at 309.5 lands on it, and centre
   * samples counted every free-standing control one pixel taller and wider
   * than it is — a 43px hit area passed the 44px floor. At whole pixels the
   * same box answers at 310 through 347: 38.
   */
  const runThrough = (el, from, to, at, point) => {
    let n = 0;
    for (let v = Math.floor(from); v < to; v += 1) if (ownerAt(...point(v, at)) === el) n++;
    return n;
  };

  const controls = [];
  for (const el of document.querySelectorAll(INTERACTIVE)) {
    if (el.closest('[aria-hidden="true"]') || el.closest('[inert]')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2) continue; // srOnly radios behind their labels
    controls.push({ el, hit: declaredHit(el) });
  }
  const hitFindings = [];
  const live = [];
  for (const c of controls) {
    // elementFromPoint sees the viewport only: bring the whole hit area into
    // it — through every scroller it sits in, not just the page (the
    // resolution card scrolls inside a fixed scrim, and its Continue button
    // read 6px short at 320 while half of it was below the fold) — and put
    // every one of them back afterwards, so the fold below reads the page as
    // the player left it.
    const r0 = c.hit;
    const moved = r0.top < 0 || r0.bottom > vh || r0.left < 0 || r0.right > vw;
    const restore = [];
    if (moved) {
      for (let p = c.el.parentElement; p; p = p.parentElement)
        if (p.scrollHeight > p.clientHeight || p.scrollWidth > p.clientWidth) restore.push([p, p.scrollLeft, p.scrollTop]);
      restore.push([null, window.scrollX, window.scrollY]);
      c.el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    }
    const putBack = () => {
      for (const [p, x, y] of restore) {
        if (p) {
          p.scrollLeft = x;
          p.scrollTop = y;
        } else window.scrollTo({ left: x, top: y, behavior: 'instant' });
      }
    };
    const hit = declaredHit(c.el);
    const own = c.el.getBoundingClientRect();
    const cx = Math.min(Math.max(own.left + own.width / 2, 0.5), vw - 0.5);
    const cy = Math.min(Math.max(own.top + own.height / 2, 0.5), vh - 0.5);
    if (ownerAt(cx, cy) !== c.el) {
      putBack();
      continue; // covered (a modal's scrim) — not a target at all right now
    }
    const h = runThrough(c.el, Math.max(hit.top - 4, 0), Math.min(hit.bottom + 4, vh), cx, (v, x) => [x, v]);
    const w = runThrough(c.el, Math.max(hit.left - 4, 0), Math.min(hit.right + 4, vw), cy, (v, y) => [v, y]);
    if (h < TAP || w < TAP) {
      hitFindings.push({ kind: 'tap', what: label(c.el), text: text(c.el), detail: `hit ${w}x${h} (box ${Math.round(own.width)}x${Math.round(own.height)})` });
    }
    // Anything else answering inside this control's own box: a neighbour's
    // extended hit area laid over it, taking taps meant for it.
    const thieves = new Set();
    const step = 4;
    for (let y = Math.max(own.top, 0) + 1; y < Math.min(own.bottom, vh) - 0.5; y += step)
      for (let x = Math.max(own.left, 0) + 1; x < Math.min(own.right, vw) - 0.5; x += step) {
        const o = ownerAt(x, y);
        if (o && o !== c.el && !c.el.contains(o) && !o.contains(c.el)) thieves.add(o);
      }
    for (const t of thieves) hitFindings.push({ kind: 'overlap', what: `${label(t)} over ${label(c.el)}`.slice(0, 60), text: text(c.el), detail: 'takes taps inside its box' });
    // Geometry for the crossing check below is taken from the first pass,
    // before anything scrolled, so every control is in the same frame.
    live.push(c);
    putBack();
  }
  // Two hit areas that cross: whichever paints later takes the shared strip.
  // Only within one layer, though. A control in a sticky or fixed box (the
  // Necrolexicon's tab strip) and one in the page scrolling under it cross
  // wherever the scroll happens to leave them — the relic filters slide under
  // the tabs — and there the pinned layer paints over and takes the strip by
  // design. Whatever it takes from the other's visible box is still caught,
  // by the in-box check above.
  const layerOf = (el) => {
    for (let p = el; p && p !== document.documentElement; p = p.parentElement)
      if (/^(sticky|fixed)$/.test(getComputedStyle(p).position)) return p;
    return null;
  };
  for (const c of live) c.layer = layerOf(c.el);
  for (let i = 0; i < live.length; i++)
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i];
      const b = live[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (a.layer !== b.layer) continue;
      const x = Math.min(a.hit.right, b.hit.right) - Math.max(a.hit.left, b.hit.left);
      const y = Math.min(a.hit.bottom, b.hit.bottom) - Math.max(a.hit.top, b.hit.top);
      if (x > 0.5 && y > 0.5) {
        hitFindings.push({ kind: 'overlap', what: `${label(a.el)} × ${label(b.el)}`.slice(0, 60), text: text(b.el), detail: `${x.toFixed(1)}x${y.toFixed(1)} shared` });
      }
    }

  const found = [...hitFindings];
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
  if (CAREER_SEED !== null) {
    await page.addInitScript((seed) => {
      let a = seed >>> 0;
      Math.random = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const t0 = 1_700_000_000_000 + seed;
      let tick = 0;
      Date.now = () => t0 + tick++;
    }, Number(CAREER_SEED) * 1000 + runNo);
  }

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
    // The ending card's door into the Necrolexicon: every tab, so the relic
    // tab's faction filters are measured as well as the tab strip itself.
    const lexicon = page.getByRole('button', { name: /view necrolexicon/i }).first();
    if (await lexicon.isVisible().catch(() => false)) {
      await lexicon.click();
      await page.waitForTimeout(400);
      const tabs = page.getByRole('tab');
      const tabCount = await tabs.count();
      if (!tabCount) problems.push(`run ${runNo}: the Necrolexicon showed no tabs`);
      for (let t = 0; t < tabCount; t++) {
        const tab = tabs.nth(t);
        const name = ((await tab.textContent()) ?? `tab${t}`).trim().toLowerCase();
        await tab.click();
        await page.mouse.move(0, 0); // no hover state left on the tab just pressed
        await page.waitForTimeout(300);
        await audit(page, `lexicon-${name}`, runNo, era);
      }
    } else {
      problems.push(`run ${runNo}: no View Necrolexicon button on the ending card`);
    }
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
    `  [${f.kind.padEnd(8)}] ${f.state.padEnd(17)} ${f.what.padEnd(46)} x${String(f.count).padEnd(3)} runs=${f.runs.size}  ${f.detail}  "${f.text}"`,
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
  JSON.stringify({ width: WIDTH, height: HEIGHT, seed: SEED, careerSeed: CAREER_SEED, folds, transcript, findings: rows.map((f) => ({ ...f, runs: [...f.runs] })) }, null, 1),
);
console.log(`\n  transcript: ${path.join(OUT, `${WIDTH}w-transcript.json`)} (${transcript.length} decisions)`);

if (problems.length) {
  console.log(`\n  ✗ ${problems.length} problem(s):`);
  for (const p of [...new Set(problems)].slice(0, 20)) console.log(`      - ${p}`);
  process.exit(1);
}
console.log('\n  ✓ no console errors, stalls, or missing endings');
