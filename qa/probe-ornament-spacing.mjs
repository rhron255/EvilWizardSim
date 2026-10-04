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
 *   node qa/probe-ornament-spacing.mjs [--url http://localhost:5173]
 *                                      [--only 393,320,1280] [--themes a,b]
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

/**
 * Clearance below this, in CSS px, between an ornament and content, is a
 * finding. It is `--ew-space-1` — the smallest step of the game's own spacing
 * scale (tokens.css). Decoration may sit no closer to what it decorates than
 * the tightest gap the design system itself allows between two things.
 */
const MIN_CLEARANCE = 4;
/**
 * A pixel counts as ornament only if some channel moved by at least this many
 * levels over the panel with the ornament switched off.
 *
 * This number IS the line between the two kinds of card trim (CLAUDE.md,
 * styling rule 5). A MARK — a rule, a hem, a glyph, a perforation — moves a
 * channel by dozens of levels, is counted here, and must keep its clearance
 * from content. A WASH — a soft vignette, a frost — moves no channel this far,
 * may sit behind text, and answers instead to the ink's panel contrast floor
 * at its strongest stop. `src/theme/themes.test.ts` reads this constant off
 * disk to sort every theme's trim into one kind or the other, so the probe and
 * the unit test cannot disagree about which kind a trim is. Keep the
 * declaration on one line, exactly as it is.
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
  if (!result.pts.length) return;
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
 * A fresh context whose collection has seen `endings`, opened on the title.
 * The seed is written ONLY IF ABSENT: `addInitScript` runs before every
 * navigation, and the Necrolexicon pass re-opens the app mid-context.
 */
async function seeded(width, height, endings) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
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

/**
 * Does each swatch's glyph sit where the selector puts it?
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
 */
async function measureSwatches(size, width, height) {
  const { context, page } = await seeded(width, height, ENDINGS);
  await page.getByRole('button', { name: /^Themes/ }).click();
  await page.waitForTimeout(150);
  let beside = 0;
  let above = 0;
  for (const theme of THEMES) {
    await wear(page, theme);
    const swatchGlyphs = await page.evaluate(() =>
      [...document.querySelectorAll('[data-part="glyph"]')].map((g) => {
        const name = g.parentElement;
        const text = name.lastChild;
        const range = document.createRange();
        range.selectNodeContents(text);
        const first = range.getClientRects()[0];
        const gr = g.getBoundingClientRect();
        // The name's own box starts at the top of its first LINE BOX. The text
        // rect above starts at the top of the font's content area, which in a
        // face with tall ascenders (DejaVu, the fallback here when Google Fonts
        // cannot load) spills past a 1.15 line box by about a pixel — so it
        // would read a cleanly dropped name as overlapping the glyph. A name
        // that is bare text, with no box of its own, cannot drop at all.
        const lineTop = text.nodeType === Node.ELEMENT_NODE ? text.getBoundingClientRect().top : first.top;
        return {
          name: name.textContent,
          // Dropped: the name's first line starts below the glyph's middle,
          // so the glyph has a line to itself. Whether it is clear of the
          // name is then `below`, checked by the caller.
          dropped: lineTop > (gr.top + gr.bottom) / 2,
          off: (gr.top + gr.bottom) / 2 - (first.top + first.bottom) / 2,
          gap: first.left - gr.right,
          below: lineTop - gr.bottom,
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
    }
  }
  console.log(`  swatches   ${beside + above} glyphs under ${THEMES.length} worn theme(s): ${beside} beside the name's first line, ${above} on a line of their own`);
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
  await page.mouse.move(1, 1);
  for (const theme of THEMES) {
    await wear(page, theme);
    await measureAll(page, 'button[data-option-index]', { size, theme, kind: 'option card' });
    await measureAll(page, 'main > header', { size, theme, kind: 'masthead rule' }, { extend: 10, alsoNext: true });
    await measureAll(page, 'main > section', { size, theme, kind: 'standings rule' }, { extend: 10, alsoNext: true });
  }
  console.log(`  run screen measured under ${THEMES.length} themes`);

  // --- play to the ending screen (lair cards), first option every time
  for (let step = 0; step < 160; step++) {
    if (await page.getByRole('button', { name: /play again|another career|new run/i }).first().isVisible().catch(() => false)) break;
    const option = page.locator('button[data-option-index]:not([disabled])').first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
      await page.waitForTimeout(80);
      continue;
    }
    const flow = page.locator('button:not([data-option-index]):not([disabled])');
    const n = await flow.count();
    if (!n) break;
    await flow.nth(n - 1).click();
    await page.waitForTimeout(80);
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
