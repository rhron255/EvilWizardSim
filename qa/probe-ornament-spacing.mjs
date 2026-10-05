/**
 * Does any theme ornament touch the content it decorates?
 *
 * Corner glyphs, card trims (the gilt hems, double rules, perforations) and the
 * glyph set into each section rule are all painted — pseudo-elements and
 * background layers that take no space — so nothing in the layout stops one
 * landing on a keycap or a line of text. Twenty themes draw twenty different
 * trims, at three card paddings, so this is measured rather than eyeballed
 * (CLAUDE.md failure mode 7).
 *
 * How, for each decorated element:
 *   1. screenshot it as it is;
 *   2. switch its ornament off (`--ew-trim: none`, a transparent `--ew-pip`)
 *      and screenshot it again;
 *   3. diff the two in a canvas — the differing pixels ARE the ornament, as
 *      rendered, whatever gradient or mask drew it;
 *   4. measure from those pixels to every line of text and every drawn
 *      element (keycap, rail, well) inside it.
 *
 * The anchor is the rendered pixels and the text the browser laid out; neither
 * is read from the ornament's own CSS (failure mode 11). Themes are swapped by
 * setting `data-theme` on the screen root, which is all the app itself does.
 *
 * The career it plays is a fixed one (`--seed`, see RUN_SEED), and the run
 * screen is measured only once a gamble's odds rail is on it (see RAIL).
 *
 *   node qa/probe-ornament-spacing.mjs [--url http://localhost:5173]
 *                                      [--only 393,320,1280] [--themes a,b]
 *                                      [--seed 1]
 */
import { chromium } from 'playwright';
import { openApp } from './first-run.mjs';
import { themeEndingIds, themeIds } from './theme-ids.mjs';

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const URL = arg('--url', 'http://localhost:5173');
const SIZES = {
  393: [393, 852],
  320: [320, 568],
  1280: [1280, 900],
};
const ONLY = arg('--only', '393,320,1280').split(',');
/*
 * RUN_SEED — which career the probe plays.
 *
 * The app seeds a career from `Math.random()` and `Date.now()` (`randomSeed`,
 * src/engine/rng.ts) and from nothing else; every draw after that derives from
 * the run's own seed. So pinning those two in the page pins the career: the
 * same era-one offer, the same rolls, the same ending, every run of the probe.
 * Before this, the run-screen pass measured whatever era-one offer came up,
 * and in five passes of six that offer had no gamble on it, so the tightest
 * clearance in the game (a card's bottom mark against the odds rail under it)
 * was never measured and the probe printed ✓ anyway. A seed makes a finding
 * reproducible; RAIL below is what makes the pass measure the rail at all.
 */
const RUN_SEED = Number(arg('--seed', '1'));
if (!Number.isInteger(RUN_SEED)) throw new Error(`--seed must be an integer, got ${arg('--seed', '1')}`);
/*
 * RAIL — the content the tightest ornament in the game sits nearest to.
 *
 * A gamble card ends in its odds rail, a drawn bar along the card's bottom
 * padding, so a card trim's bottom mark comes closer to it than to any line of
 * text: Assets Realised's measured 4.6-4.9px from it, against the 4px floor.
 * An era-one offer often has no gamble at all, so the run is played forward,
 * first choice each era, until one is on screen (at most RAIL_ERAS eras), and
 * the probe ASSERTS that a rail was measured against ornament at every width.
 * A pass with no rail in it is a finding, not a quieter ✓.
 */
const RAIL = 'button[data-option-index] [class*="_rail_"]';
const RAIL_ERAS = 12;

/**
 * Clearance below this, in CSS px, between an ornament and content, is a
 * finding. It is `--ew-space-1` — the smallest step of the game's own spacing
 * scale (tokens.css). Decoration may sit no closer to what it decorates than
 * the tightest gap the design system itself allows between two things.
 */
const MIN_CLEARANCE = 4;
/**
 * A pixel counts as ornament only if some channel moved by at least this many
 * levels against the same card with the ornament switched off.
 *
 * This number IS the line between the two kinds of card trim (CLAUDE.md,
 * styling rule 5). A MARK — a rule, a hem, a glyph, a perforation — moves a
 * channel by dozens of levels, is counted here, and must keep its clearance
 * from content. A WASH — a soft vignette, a sheen — moves no channel this far,
 * may sit behind text, and answers instead to a contrast floor: the default
 * ink on the default's version of whatever surface it lies over (13.80 on the
 * panel). `src/theme/themes.test.ts` reads this constant off disk and sorts
 * each trim layer over every surface a stylesheet lays a trim on (panel,
 * raised, hover); a layer is a mark if it reaches DRAWN on any of them. The
 * two share this threshold and those surfaces, not a classifier: this probe
 * measures cards at rest, as rendered, and the test measures the trims' own
 * CSS. Keep the declaration on one line, exactly as it is.
 */
const DRAWN = 24;
/*
 * PIXEL_CENTRE — where a drawn pixel is, for measuring.
 *
 * A screenshot pixel is a square, one device pixel on a side; the content it is
 * measured against is a DOM rect at fractional CSS px. The probe used to place
 * each drawn pixel at its top-left corner, and that error is lopsided. An edge
 * mark whose inner edge lands on a half pixel antialiases into a half-covered
 * row; the row clears DRAWN, and its top-left corner sits half a pixel nearer
 * to content above it or to its left than the mark does. Marks that reach
 * exactly 4px in (Assets Realised, The Final Number) read "3.5px from rail" in
 * one run of three, depending only on where the card happened to fall. The
 * same corner sits up to a whole pixel too far from content below it or to its
 * right, which is how the standings rule's glyph under Ordinary Weather, about
 * 3.9px above the next line of text at 393 wide, read 4.3 and passed.
 *
 * So a pixel is placed at its centre, `(i + 0.5) / scale` CSS px from the
 * clip's origin. A half-covered antialiased row then reads exactly where the
 * mark's edge is, and any pixel is off by at most half a pixel, the same in
 * every direction. That half pixel (`0.5 / scale`, 0.5 CSS px at the scale of
 * 1 used here) is the probe's resolution: a clearance it prints is good to
 * about ±0.5px, so it cannot tell 3.8 from 4.0, and MIN_CLEARANCE is applied
 * to the centre reading as it is, with no slack added for it.
 */

// Read off `THEMES` in src/theme/themes.ts, never hand-copied: a copy drifts.
const ALL_THEMES = themeIds();
const ENDINGS = themeEndingIds();
const THEMES = arg('--themes', '') ? arg('--themes', '').split(',') : ALL_THEMES;
const unknown = THEMES.filter((t) => !ALL_THEMES.includes(t));
if (unknown.length) throw new Error(`--themes names no such theme: ${unknown.join(', ')}`);
console.log(`  ${ALL_THEMES.length} themes in src/theme/themes.ts; measuring ${THEMES.length}`);

const OFF = '--ew-trim: none; --ew-pip: linear-gradient(transparent, transparent);';

const findings = [];
const worst = new Map();
/**
 * Per width: how many odds rails were measured against ornament, the nearest
 * approach, and the themes whose card drew no ornament to measure (`bare`).
 */
const rails = new Map();
const railRecord = (size) => {
  if (!rails.has(size)) rails.set(size, { count: 0, min: Infinity, theme: null, bare: new Set() });
  return rails.get(size);
};
let measured = 0;

/*
 * `--disable-partial-raster`: step 3 above assumes the ornament is the ONLY
 * thing that differs between the two shots. With partial raster on, Chromium
 * re-rasters just the rect the switched-off glyph dirtied and patches it into
 * the old tile, and the patch does not match a whole-tile raster: under the
 * real webfonts, the standings toggle's chevron, 30px above the glyph, moved
 * by 35 levels in one pixel and read as "1 ornament px ON toggle" in every
 * run. Rastering whole tiles takes the chevron back out of the diff.
 */
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  args: ['--disable-partial-raster'],
});

/**
 * Wear `theme` where the app wears it. Every screen spreads `themeAttr`
 * (src/components/meta/themeAttr.ts) onto its own outermost element, the one
 * App renders straight into `#root`. On most screens that is a `<main>`, but
 * the run screen's is the `.screen` div around its `<main>`, and that div
 * hangs the key light and the wallpaper. Setting the attribute on `<main>`
 * there re-themes the cards and leaves the room in the old theme. The default
 * theme sets no attribute at all, so it is removed, never set to 'default'.
 * (ChangelogPopup wears the theme on its own scrim too, but `openApp` has
 * dismissed it before anything here runs.)
 */
async function wear(page, theme) {
  const worn = await page.evaluate((theme) => {
    const root = document.getElementById('root')?.firstElementChild;
    if (!root) return false;
    if (theme === 'default') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    return true;
  }, theme);
  if (!worn) throw new Error(`wear(${theme}): no screen root under #root`);
  await page.waitForTimeout(30);
}

/**
 * Measure one element. `extend` grows the clip below it (a section rule's
 * glyph hangs past the element's own box) and `alsoNext` adds the next
 * sibling's content, which is what that glyph could collide with.
 */
async function measure(page, handle, { size, kind, theme, index }, { extend = 0, alsoNext = false } = {}) {
  const label = `${size} ${kind}[${index}] · ${theme}`;
  await handle.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const box = await handle.boundingBox();
  if (!box || box.width < 4 || box.height < 4) return;
  const vp = page.viewportSize();
  const clip = {
    x: Math.max(0, Math.floor(box.x) - 4),
    y: Math.max(0, Math.floor(box.y) - 4),
    width: Math.min(vp.width, Math.ceil(box.width) + 8),
    height: Math.min(vp.height - Math.max(0, Math.floor(box.y) - 4), Math.ceil(box.height) + 8 + extend),
  };
  const on = await page.screenshot({ clip });
  await handle.evaluate((el, off) => el.setAttribute('style', `${el.getAttribute('style') ?? ''};${off}`), OFF);
  const off = await page.screenshot({ clip });
  await handle.evaluate((el, off) => {
    const s = (el.getAttribute('style') ?? '').replace(`;${off}`, '');
    if (s) el.setAttribute('style', s);
    else el.removeAttribute('style');
  }, OFF);

  const result = await page.evaluate(
    async ([a, b, clip, drawn, alsoNext, index]) => {
      const load = (src) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const canvas = document.createElement('canvas');
      canvas.width = ia.width;
      canvas.height = ia.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(ia, 0, 0);
      const da = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(ib, 0, 0);
      const db = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const scale = canvas.width / clip.width;
      const pts = [];
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
        if (d >= drawn) {
          // The pixel's CENTRE, not its top-left corner. See PIXEL_CENTRE.
          const p = i / 4;
          pts.push([clip.x + ((p % canvas.width) + 0.5) / scale, clip.y + (Math.floor(p / canvas.width) + 0.5) / scale]);
        }
      }

      // Content: every run of text, and every element that draws something
      // of its own (a keycap's box, a rail, a well) — but not the decorated
      // element itself, nor a full-bleed overlay laid across it.
      const el = document.querySelectorAll('[data-probe-target]')[index];
      const host = el.getBoundingClientRect();
      const roots = [el];
      if (alsoNext && el.nextElementSibling) roots.push(el.nextElementSibling);
      const rects = [];
      for (const root of roots) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) rects.push([r.left, r.top, r.right, r.bottom, 'text']);
        }
        for (const child of root.querySelectorAll('*')) {
          const cs = getComputedStyle(child);
          if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
          const r = child.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.width >= host.width * 0.9 && r.height >= host.height * 0.9) continue;
          const paints =
            (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') ||
            parseFloat(cs.borderTopWidth) > 0 ||
            ['svg', 'img', 'canvas'].includes(child.tagName.toLowerCase());
          const name = (child.getAttribute('class') || child.tagName).split(' ')[0].replace(/^_|_[a-z0-9]+_\d+$/g, '');
          if (paints) rects.push([r.left, r.top, r.right, r.bottom, name]);
        }
      }
      return { pts, rects };
    },
    [`data:image/png;base64,${on.toString('base64')}`, `data:image/png;base64,${off.toString('base64')}`, clip, DRAWN, alsoNext, await handle.evaluate((el) => [...document.querySelectorAll('[data-probe-target]')].indexOf(el))],
  );

  measured++;
  if (!result.pts.length) {
    // A rail on a card that drew no ornament at all is not a rail measured;
    // it is named in the summary so the count there adds up. See RAIL.
    if (kind === 'option card' && result.rects.some((r) => r[4] === 'rail')) railRecord(size).bare.add(theme);
    return;
  }
  let min = Infinity;
  let hit = null;
  let overlap = 0;
  for (const [x, y] of result.pts) {
    for (const [l, t, r, b, what] of result.rects) {
      const dx = Math.max(l - x, 0, x - r);
      const dy = Math.max(t - y, 0, y - b);
      const d = Math.hypot(dx, dy);
      if (d === 0) overlap++;
      if (d < min) {
        min = d;
        hit = what;
      }
    }
  }
  const key = `${size} ${kind}`;
  const prev = worst.get(key);
  if (!prev || min < prev.min) worst.set(key, { min, theme, hit });
  // A rail counts as measured only inside an option card that drew ornament:
  // a theme with no trim measures nothing against it, and the standings rule
  // also sees the cards below it (`alsoNext`) but not their trims. See RAIL.
  for (const [l, t, r, b, what] of result.rects) {
    if (kind !== 'option card' || what !== 'rail') continue;
    let d = Infinity;
    for (const [x, y] of result.pts) d = Math.min(d, Math.hypot(Math.max(l - x, 0, x - r), Math.max(t - y, 0, y - b)));
    const rail = railRecord(size);
    rail.count++;
    if (d < rail.min) Object.assign(rail, { min: d, theme });
  }
  if (overlap > 0 || min < MIN_CLEARANCE) {
    findings.push(`${label}: ${overlap ? `${overlap} ornament px ON ${hit}` : `${min.toFixed(1)}px from ${hit}`}`);
  }
}

/** Tag, measure, untag — so the in-page half can find the element again. */
async function measureAll(page, selector, where, opts, limit = Infinity) {
  const handles = (await page.$$(selector)).slice(0, limit);
  for (const [i, h] of handles.entries()) {
    await h.evaluate((el) => el.setAttribute('data-probe-target', ''));
    await measure(page, h, { ...where, index: i }, opts);
    await h.evaluate((el) => el.removeAttribute('data-probe-target'));
  }
  return handles.length;
}

/**
 * A fresh context whose collection has seen `endings`, opened on the title,
 * with the career's randomness pinned to RUN_SEED.
 * The collection is written ONLY IF ABSENT: `addInitScript` runs before every
 * navigation, and the Necrolexicon pass re-opens the app mid-context.
 */
async function seeded(width, height, endings) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  // The only two inputs to a career's seed (`randomSeed`), so the only two
  // pinned. mulberry32, the generator the engine itself uses.
  await page.addInitScript((seed) => {
    let a = seed >>> 0;
    Math.random = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const now = Date.UTC(2026, 0, 1);
    Date.now = () => now;
  }, RUN_SEED);
  await page.addInitScript((endings) => {
    if (localStorage.getItem('evil-wizard-sim:collection')) return;
    localStorage.setItem(
      'evil-wizard-sim:collection',
      JSON.stringify({
        version: 6,
        discoveredArtifactIds: [],
        endingsSeen: endings,
        runsCompleted: 9,
        bestNotoriety: 88,
        tutorialSeen: true,
        lastWizardName: 'Malvorn',
        selectedThemeId: 'default',
        relicsResetAt: '9999',
      }),
    );
  }, endings);
  await openApp(page, URL);
  await page.mouse.move(1, 1);
  return { context, page };
}

// Offer options are the only buttons carrying `data-option-index`; anything
// else enabled is a flow control (continue, return to your work, play again).
const OPTION = 'button[data-option-index]:not([disabled])';
const FLOW = 'button:not([data-option-index]):not([disabled])';

const atEnding = (page) =>
  page.getByRole('button', { name: /play again|another career|new run/i }).first().isVisible().catch(() => false);

/**
 * One click forward: the first choice when one is offered, otherwise the last
 * enabled flow control (the earlier ones are back-style escapes). False when
 * nothing is left to click.
 */
async function playStep(page) {
  const option = page.locator(OPTION).first();
  if (await option.isVisible().catch(() => false)) {
    await option.click();
    await page.waitForTimeout(80);
    return true;
  }
  const flow = page.locator(FLOW);
  const n = await flow.count();
  if (!n) return false;
  await flow.nth(n - 1).click();
  await page.waitForTimeout(80);
  return true;
}

/**
 * Play the career forward, first choice each era, until a card with an odds
 * rail is on screen with nothing over it, or RAIL_ERAS eras have gone by.
 * Returns the era it stopped on; the caller asserts a rail was measured.
 */
async function playToRail(page) {
  let era = 1;
  while (era < RAIL_ERAS && !(await page.locator(RAIL).count())) {
    await page.locator(OPTION).first().click();
    era++;
    // The resolution, perhaps the prophecy, then the next era's choices.
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(80);
      if (await atEnding(page)) return era;
      if (await page.locator(OPTION).first().isVisible().catch(() => false)) break;
      if (!(await playStep(page))) return era;
    }
  }
  return era;
}

/**
 * Does each swatch's name sit where the selector puts it, glyph and all?
 *
 * A locked swatch withholds its glyph along with its name, so this runs in a
 * collection that has seen EVERY ending: under the run's own nine-ending seed
 * it found ten glyphs of twenty and called the selector measured. The count
 * is asserted, so a swatch that stops drawing its glyph is a finding rather
 * than a smaller number nobody reads.
 *
 * Two layouts are right (ThemeSwatch.module.css, `.name`): the glyph beside the
 * name, centred on its FIRST line and clear of its first letter; or, when the
 * name's longest word cannot fit beside it, the glyph on a line of its own with
 * the name starting below it. Each worn theme is measured, because the name is
 * set in the WORN room's display face (one theme changes it), not the
 * previewed one's.
 *
 * Where the glyph sits is half of it. The name itself must also read as
 * words, and stay in its card, so for every swatch:
 *
 *   - no word is split across two lines. A split is the layout a glyph check
 *     cannot see: shrink the name's box below its longest word (a stray
 *     `min-width: 0` on `.nameText` does it) and the glyph stays beside a
 *     first line that ends "Correspon-". The ONE split allowed is a word wider
 *     than the card's whole content box, which has nowhere else to go; once
 *     names scale down to fit their card (so that even Correspondence in Inter
 *     at 320 fits), that allowance should never be used, and the summary line
 *     prints how often it was;
 *   - the name's rightmost text rect ends inside the card's content box (its
 *     border box less border and padding), so no letter runs into the padding
 *     or out of the card.
 *
 * Both are read off the text the browser laid out (a Range over each word),
 * never off the stylesheet that is supposed to produce it (failure mode 11).
 */
async function measureSwatches(size, width, height) {
  const { context, page } = await seeded(width, height, ENDINGS);
  await page.getByRole('button', { name: /^Themes/ }).click();
  await page.waitForTimeout(150);
  let beside = 0;
  let above = 0;
  /** Words split only because they are wider than the whole card: word → times. */
  const wideSplits = new Map();
  for (const theme of THEMES) {
    await wear(page, theme);
    const swatchGlyphs = await page.evaluate(() =>
      [...document.querySelectorAll('[data-part="glyph"]')].map((g) => {
        const name = g.parentElement;
        const text = name.lastChild;
        const node = text.nodeType === Node.TEXT_NODE ? text : document.createTreeWalker(text, NodeFilter.SHOW_TEXT).nextNode();
        const range = document.createRange();
        range.selectNodeContents(node);
        const lines = [...range.getClientRects()].filter((r) => r.width > 0);
        const first = lines[0];
        const gr = g.getBoundingClientRect();
        // The name's own box starts at the top of its first LINE BOX. The text
        // rect above starts at the top of the font's content area, which in a
        // face with tall ascenders (DejaVu, the fallback here when Google Fonts
        // cannot load) spills past a 1.15 line box by about a pixel — so it
        // would read a cleanly dropped name as overlapping the glyph. A name
        // that is bare text, with no box of its own, cannot drop at all.
        const lineTop = text.nodeType === Node.ELEMENT_NODE ? text.getBoundingClientRect().top : first.top;

        // The card's content box: its border box less border and padding.
        const card = g.closest('button');
        const cs = getComputedStyle(card);
        const cr = card.getBoundingClientRect();
        const contentLeft = cr.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
        const contentRight = cr.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);

        // Each word's own rects: more than one line top is a word split across
        // lines. Its whole width is the sum of its pieces, the width it would
        // need on one line.
        const splits = [];
        for (const m of node.data.matchAll(/\S+/g)) {
          const word = document.createRange();
          word.setStart(node, m.index);
          word.setEnd(node, m.index + m[0].length);
          const pieces = [...word.getClientRects()].filter((r) => r.width > 0);
          const tops = pieces.map((r) => r.top);
          if (Math.max(...tops) - Math.min(...tops) > 1) {
            splits.push({ word: m[0], width: pieces.reduce((w, r) => w + r.width, 0) });
          }
        }
        return {
          name: name.textContent,
          // Dropped: the name's first line starts below the glyph's middle,
          // so the glyph has a line to itself. Whether it is clear of the
          // name is then `below`, checked by the caller.
          dropped: lineTop > (gr.top + gr.bottom) / 2,
          off: (gr.top + gr.bottom) / 2 - (first.top + first.bottom) / 2,
          gap: first.left - gr.right,
          below: lineTop - gr.bottom,
          content: contentRight - contentLeft,
          overrun: Math.max(...lines.map((r) => r.right)) - contentRight,
          splits,
        };
      }),
    );
    if (swatchGlyphs.length !== ALL_THEMES.length) {
      findings.push(`${size} swatches · ${theme}: ${swatchGlyphs.length} glyphs for ${ALL_THEMES.length} themes, every one of them unlocked`);
    }
    for (const s of swatchGlyphs) {
      if (s.dropped) {
        above++;
        // Layout positions are in 1/64 px; anything under a tenth is rounding.
        if (s.below < -0.1) findings.push(`${size} swatch "${s.name}" · ${theme}: glyph on its own line overlaps the name by ${(-s.below).toFixed(1)}px`);
      } else {
        beside++;
        if (Math.abs(s.off) > 2 || s.gap < 3) findings.push(`${size} swatch "${s.name}" · ${theme}: glyph ${s.off.toFixed(1)}px off its first line, ${s.gap.toFixed(1)}px from the name`);
      }
      for (const split of s.splits) {
        // Allowed only for a word that cannot fit on any one line of the card.
        if (split.width > s.content) wideSplits.set(split.word, (wideSplits.get(split.word) ?? 0) + 1);
        else findings.push(`${size} swatch "${s.name}" · ${theme}: "${split.word}" split across two lines, though it is ${split.width.toFixed(1)}px and the card's content box is ${s.content.toFixed(1)}px`);
      }
      if (s.overrun > 0.1) findings.push(`${size} swatch "${s.name}" · ${theme}: the name runs ${s.overrun.toFixed(1)}px past the card's content box`);
    }
  }
  console.log(`  swatches   ${beside + above} glyphs under ${THEMES.length} worn theme(s): ${beside} beside the name's first line, ${above} on a line of their own`);
  const wide = [...wideSplits].map(([word, n]) => `"${word}" ×${n}`).join(', ');
  console.log(`  swatches   every name checked for a mid-word split and an overrun; split only where a word is wider than its whole card: ${wide || 'none'}`);
  await context.close();
}

for (const size of ONLY) {
  const [width, height] = SIZES[size];
  console.log(`\n▸ ${width}×${height}`);

  // --- the theme picker, every swatch unlocked
  await measureSwatches(size, width, height);

  // Everything else runs in a collection that has seen nine endings, not all:
  // the Necrolexicon pass below needs unseen ending slots to measure.
  const { context, page } = await seeded(width, height, ENDINGS.slice(0, 9));

  // --- the run screen
  await page.getByRole('button', { name: /begin a career/i }).click();
  await page.getByRole('button', { name: /begin the career/i }).click();
  await page.waitForSelector('button[data-option-index]');
  const era = await playToRail(page);
  await page.mouse.move(1, 1);
  console.log(`  run screen at era ${era} (seed ${RUN_SEED}): ${await page.locator(RAIL).count()} odds rail(s) on screen`);
  for (const theme of THEMES) {
    await wear(page, theme);
    await measureAll(page, 'button[data-option-index]', { size, theme, kind: 'option card' });
    await measureAll(page, 'main > header', { size, theme, kind: 'masthead rule' }, { extend: 10, alsoNext: true });
    await measureAll(page, 'main > section', { size, theme, kind: 'standings rule' }, { extend: 10, alsoNext: true });
  }
  console.log(`  run screen measured under ${THEMES.length} themes`);
  const rail = rails.get(size);
  if (!rail?.count) {
    findings.push(`${size} option card: no odds rail measured against ornament (seed ${RUN_SEED}, stopped at era ${era} of at most ${RAIL_ERAS}), so the tightest clearance in the game went unchecked`);
  } else {
    const bare = rail.bare.size ? `; no ornament drawn on its card under ${[...rail.bare].join(', ')}` : '';
    console.log(`  odds rail  ${rail.count} measured; nearest ornament ${rail.min.toFixed(1)}px, under ${rail.theme}${bare}`);
  }

  // --- play to the ending screen (lair cards), first option every time
  for (let step = 0; step < 160; step++) {
    if (await atEnding(page)) break;
    if (!(await playStep(page))) break;
  }
  await page.mouse.move(1, 1);
  const lairs = (await page.$$('[class*="_card_"][class*="_pips_"]')).length;
  for (const theme of THEMES) {
    await wear(page, theme);
    await measureAll(page, '[class*="_card_"][class*="_pips_"]', { size, theme, kind: 'lair card' }, {}, 3);
  }
  console.log(`  ending screen measured (${lairs} lair cards)`);

  // --- the Necrolexicon: faction plates, ending slots, mechanics
  await openApp(page, URL);
  await page.getByRole('button', { name: /^Necrolexicon/ }).click();
  await page.waitForTimeout(150);
  const tabs = page.getByRole('tab');
  for (const [i, name] of [[0, 'faction plate'], [2, 'ending slot'], [3, 'mechanics plate']]) {
    await tabs.nth(i).click();
    await page.waitForTimeout(120);
    await page.mouse.move(1, 1);
    for (const theme of THEMES) {
      await wear(page, theme);
      // The first four of each: every kind of slot (seen, unseen) appears in them.
      const sel = i === 2 ? 'main [class*="_slot_"]' : 'main [class*="_factionEntry_"]';
      await measureAll(page, sel, { size, theme, kind: name }, {}, 4);
    }
  }
  console.log('  necrolexicon measured');
  await context.close();
}

await browser.close();

console.log(`\n  ${measured} decorated elements measured`);
console.log('\n  CLOSEST APPROACH, per kind of element (any theme):');
for (const [key, w] of [...worst.entries()].sort()) {
  console.log(`    ${key.padEnd(24)} ${w.min.toFixed(1).padStart(5)}px  under ${w.theme}, to ${w.hit}`);
}
if (findings.length) {
  console.log(`\n  ✗ ${findings.length} finding(s):\n    ${findings.join('\n    ')}`);
  process.exitCode = 1;
} else {
  console.log(`\n  ✓ every ornament clears content by at least ${MIN_CLEARANCE}px`);
}
