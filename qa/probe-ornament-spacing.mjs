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

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
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
          const p = i / 4;
          pts.push([clip.x + (p % canvas.width) / scale, clip.y + Math.floor(p / canvas.width) / scale]);
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

for (const size of ONLY) {
  const [width, height] = SIZES[size];
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
  }, ENDINGS.slice(0, 9));
  await openApp(page, URL);
  await page.mouse.move(1, 1);
  console.log(`\n▸ ${width}×${height}`);

  // --- the theme picker: does each swatch's glyph sit on its name's first line?
  await page.getByRole('button', { name: /^Themes/ }).click();
  await page.waitForTimeout(150);
  const swatchGlyphs = await page.evaluate(() =>
    [...document.querySelectorAll('[data-part="glyph"]')].map((g) => {
      const name = g.parentElement;
      const range = document.createRange();
      range.selectNodeContents(name.lastChild);
      const first = range.getClientRects()[0];
      const gr = g.getBoundingClientRect();
      return { name: name.textContent, off: (gr.top + gr.bottom) / 2 - (first.top + first.bottom) / 2, gap: first.left - gr.right };
    }),
  );
  for (const s of swatchGlyphs) {
    if (Math.abs(s.off) > 2 || s.gap < 3) findings.push(`${size} swatch "${s.name}": glyph ${s.off.toFixed(1)}px off its first line, ${s.gap.toFixed(1)}px from the name`);
  }
  console.log(`  swatches   ${swatchGlyphs.length} glyphs checked against their names`);
  await page.getByRole('button', { name: /back/i }).first().click();

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
