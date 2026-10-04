/**
 * Does text on the bare room read at least as well in every theme as it does
 * in the Tower's — in the pixels Chromium actually paints?
 *
 * `src/theme/themes.test.ts` holds this as a MODEL: it rebuilds each room from
 * its tokens and does the compositing arithmetic itself. A model can agree
 * with itself and still be wrong about the browser — gradients are dithered,
 * every layer is rounded to 8 bits, and a margin of a few thousandths of a
 * contrast point is below one level of that rounding (CLAUDE.md failure mode
 * 11). This is the anchor the model answers to: the rendered pixels.
 *
 * What it paints, per theme. Nothing is copied into this file — every rule is
 * read off disk:
 *   - `src/theme/ornaments.css` and `src/theme/tokens.css`, whole, with the
 *     theme selected by `data-theme`, exactly as the app selects it;
 *   - the two screen stacks: `.screen`'s `background` from
 *     `src/screens/RunScreen.module.css` (the run screen) and from
 *     `src/components/meta/craft.module.css` (every set piece), each over a
 *     box the size of the viewport;
 *   - the wallpaper: craft's `.screen::before, .wallpaper::before` rule
 *     verbatim — `--ew-line-strong` through the theme's mask at
 *     `--ew-motif-opacity` — which both stacks wear;
 *   - `--ew-tier` set to every tier colour, read from `src/theme/tokens.ts`.
 *
 * Each room is shot at 393×852 (the reference phone) and 320×568, at device
 * pixel ratios 1 and 3, and every pixel is scored against the theme's own
 * `--ew-ink` with the WCAG contrast formula. A theme's score is its worst
 * pixel anywhere on the screen, as though a line of text fell exactly there.
 *
 * Three measures, and which of them gate:
 *   - `room` (gates): the wallpaper through its real mask.
 *   - `solid` (gates): the wallpaper with its mask lifted, so it covers every
 *     pixel at full `--ew-motif-opacity` — what the model assumes, and what a
 *     glyph's solid core is wherever the mask is fully on.
 *   - `painted` (reported only): the set-piece stack with its black foot
 *     vignette left in. The settled bare-room model (D1) deliberately omits
 *     that layer, so `room` and `solid` drop it from the set-piece stack to
 *     match. In a dark room it only darkens the backdrop behind pale ink, so
 *     the omission is the harder case. In Ordinary Weather — dark ink on a
 *     light void — it is the darkest layer of the room and is NOT measured
 *     by the gate: a known, pre-existing issue, printed here so it stays seen.
 *
 * A theme FAILS if its `room` or `solid` worst, at any size and ratio, is
 * below the default room's worst for the same measure. Exit 1 on any failure.
 *
 *   PLAYWRIGHT_CHROMIUM_PATH=… node qa/probe-room-contrast.mjs [--themes a,b]
 *
 * With `--spread` it measures instead how far Chromium's painted levels stray
 * from the exact composite — the provenance of `PAINT_SLACK`, the margin the
 * unit test's model allows for exactly this.
 *
 * No dev server: the page is built with `page.setContent`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { themeIds } from './theme-ids.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

// ---------------------------------------------------------------------------
// The rules, off disk
// ---------------------------------------------------------------------------

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Every rule in a stylesheet as `{ selector, body, media }`, rules inside an
 * `@media` block included and tagged with its condition.
 */
function rulesOf(css) {
  const out = [];
  const walk = (text, media) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open === -1) break;
      const selector = text.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      for (; j < text.length && depth > 0; j++) {
        if (text[j] === '{') depth++;
        if (text[j] === '}') depth--;
      }
      const body = text.slice(open + 1, j - 1);
      if (selector.startsWith('@media')) walk(body, selector);
      else out.push({ selector, body, media });
      i = j;
    }
  };
  walk(stripComments(css), null);
  return out;
}

/** A declaration's value from a rule body, or null. */
function declaration(body, prop) {
  const m = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]*)(?:;|$)`));
  return m ? m[1].trim() : null;
}

/**
 * The one rule in `css` whose selector list is exactly `selectors` and that
 * sets `prop`, outside any `@media`. Throws if there is not exactly one, and
 * if an `@media` rule overrides it: the probe would otherwise paint a room the
 * browser never shows.
 */
function theRule(css, selectors, prop, file) {
  const same = (a) =>
    a
      .split(',')
      .map((s) => s.trim())
      .sort()
      .join(', ') === [...selectors].sort().join(', ');
  const rules = rulesOf(css).filter((r) => r.selector.split(',').some((s) => selectors.includes(s.trim())));
  const setting = rules.filter((r) => declaration(r.body, prop) !== null);
  const media = setting.filter((r) => r.media && !/forced-colors/.test(r.media));
  if (media.length) throw new Error(`${file}: ${media[0].media} overrides ${selectors.join(', ')} ${prop}`);
  const plain = setting.filter((r) => !r.media && same(r.selector));
  if (plain.length !== 1) throw new Error(`${file}: expected one ${selectors.join(', ')} rule setting ${prop}, found ${plain.length}`);
  return plain[0].body;
}

const RUN_CSS = read('src/screens/RunScreen.module.css');
const CRAFT_CSS = read('src/components/meta/craft.module.css');

const RUN_BACKGROUND = declaration(theRule(RUN_CSS, ['.screen'], 'background', 'RunScreen.module.css'), 'background');
const CRAFT_BACKGROUND = declaration(theRule(CRAFT_CSS, ['.screen'], 'background', 'craft.module.css'), 'background');
/** The wallpaper rule's body, verbatim. `composes` is CSS Modules', not CSS. */
const WALLPAPER = theRule(CRAFT_CSS, ['.screen::before', '.wallpaper::before'], 'opacity', 'craft.module.css');

/** A background value split on its top-level commas: one entry per layer. */
function layersOf(css) {
  const out = [];
  let depth = 0;
  let current = '';
  for (const ch of css) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(current.trim());
      current = '';
    } else current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/**
 * The set-piece stack without its black foot vignette — the layer D1 leaves
 * out. Found by what it is (a gradient whose only colour is black), not by
 * position, and required to be exactly one layer.
 */
const CRAFT_LAYERS = layersOf(CRAFT_BACKGROUND);
const FOOT = CRAFT_LAYERS.filter((l) => {
  const calls = l.match(/\brgba?\([^)]*\)/g) ?? [];
  return calls.length === 1 && /^rgba?\(\s*0[\s,]+0[\s,]+0[\s,/]/.test(calls[0]) && !/var\(/.test(l);
});
if (FOOT.length !== 1) throw new Error(`craft.module.css: expected one black foot vignette in .screen, found ${FOOT.length}`);
const CRAFT_D1 = CRAFT_LAYERS.filter((l) => l !== FOOT[0]).join(', ');

/** Every tier colour, read from tokens.ts. */
const TIER_COLOURS = [
  ...read('src/theme/tokens.ts')
    .match(/export const tierColor[^{]*\{([^}]*)\}/)[1]
    .matchAll(/#[0-9a-fA-F]{6}/g),
].map((m) => m[0]);
if (TIER_COLOURS.length !== 5) throw new Error(`tokens.ts: expected five tier colours, read ${TIER_COLOURS.length}`);

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
${read('src/theme/ornaments.css')}
${read('src/theme/tokens.css')}
html, body { margin: 0; padding: 0; overflow: hidden; }
.room { position: absolute; inset: 0; isolation: isolate; overflow: hidden; }
.room.run { background: ${RUN_BACKGROUND}; }
.room.craft { background: ${CRAFT_D1}; }
.room.painted { background: ${CRAFT_BACKGROUND}; }
.room::before { ${WALLPAPER} }
.room.solid::before { -webkit-mask-image: none; mask-image: none; }
</style></head><body><div class="room"></div></body></html>`;

const SIZES = [
  [393, 852],
  [320, 568],
];
const RATIOS = [1, 3];

/**
 * Worst WCAG contrast between `ink` and any pixel of a PNG, decoded in a
 * canvas with no colour management, so the levels are the ones painted.
 */
async function worstPixel(decoder, png, ink) {
  return decoder.evaluate(
    async ([b64, ink]) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }), {
        colorSpaceConversion: 'none',
        premultiplyAlpha: 'none',
      });
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const g = canvas.getContext('2d', { colorSpace: 'srgb' });
      g.drawImage(bitmap, 0, 0);
      const d = g.getImageData(0, 0, bitmap.width, bitmap.height).data;
      const lin = Array.from({ length: 256 }, (_, c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      const lum = (r, g, b) => 0.2126 * lin[r] + 0.7152 * lin[g] + 0.0722 * lin[b];
      const li = lum(...ink);
      let worst = Infinity;
      let at = null;
      for (let i = 0; i < d.length; i += 4) {
        const lb = lum(d[i], d[i + 1], d[i + 2]);
        const c = (Math.max(li, lb) + 0.05) / (Math.min(li, lb) + 0.05);
        if (c < worst) {
          worst = c;
          at = [d[i], d[i + 1], d[i + 2], ((i / 4) % bitmap.width) / bitmap.width, Math.floor(i / 4 / bitmap.width) / bitmap.height];
        }
      }
      return { worst, at };
    },
    [png.toString('base64'), ink],
  );
}

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.trim().slice(i, i + 2), 16));

/** One theme at one size and ratio: its worst pixel under each measure. */
async function measureTheme(page, decoder, theme) {
  await page.evaluate((theme) => {
    if (theme === 'default') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, theme);
  const ink = hexToRgb(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ew-ink')));
  const out = { room: { worst: Infinity }, solid: { worst: Infinity }, painted: { worst: Infinity } };
  const shots = [
    ['room', 'run', null],
    ['solid', 'run solid', null],
    ...TIER_COLOURS.flatMap((tier) => [
      ['room', 'craft', tier],
      ['solid', 'craft solid', tier],
      ['painted', 'painted', tier],
    ]),
  ];
  for (const [measure, cls, tier] of shots) {
    await page.evaluate(
      ([cls, tier]) => {
        const room = document.querySelector('.room');
        room.className = `room ${cls}`;
        if (tier) room.style.setProperty('--ew-tier', tier);
        else room.style.removeProperty('--ew-tier');
      },
      [cls, tier],
    );
    const png = await page.screenshot({ animations: 'disabled' });
    const hit = await worstPixel(decoder, png, ink);
    if (hit.worst < out[measure].worst) out[measure] = { ...hit, stack: cls.split(' ')[0], tier };
  }
  return out;
}

// ---------------------------------------------------------------------------
// --spread: how far the painted levels stray from the exact composite
// ---------------------------------------------------------------------------

/**
 * The provenance of `PAINT_SLACK` in `src/theme/themes.test.ts`, kept where it
 * can be re-measured rather than quoted.
 *
 * The model composites each room in exact arithmetic. Chromium dithers every
 * gradient and lands every layer on an 8-bit level, so what it paints strays
 * from that. This samples a grid of points on every room — every tier, both
 * stacks, the wallpaper solid so its layer covers each point — computes the
 * exact composite at each pixel's centre from the theme's own computed
 * tokens, and reports how far the painted channel lies from it. A theme whose
 * key light has a layer other than a plain radial (the Sword's linear glint)
 * is skipped and named, rather than modelled loosely.
 */
const RADIAL_LAYER =
  /^radial-gradient\(\s*([\d.]+)%\s+([\d.]+)%\s+at\s+(-?[\d.]+)%\s+(-?[\d.]+)%\s*,\s*rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)\s*,\s*transparent\s+([\d.]+)%\s*\)$/;
const TIER_LAYER =
  /radial-gradient\(\s*([\d.]+)%\s+([\d.]+)%\s+at\s+(-?[\d.]+)%\s+(-?[\d.]+)%\s*,\s*color-mix\(in srgb,\s*var\(--ew-tier\)\s*([\d.]+)%\s*,\s*transparent\)\s*,\s*transparent\s+([\d.]+)%\s*\)/;

/** A radial gradient's alpha at (x, y), both fractions of the box. */
const radialAt = (g, x, y) => g.alpha * Math.max(0, 1 - Math.hypot((x - g.cx) / g.rx, (y - g.cy) / g.ry) / g.stop);

/** The painted channels at each of `points`, device pixels. */
async function pixelsAt(decoder, png, points) {
  return decoder.evaluate(
    async ([b64, points]) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }), { colorSpaceConversion: 'none' });
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const g = canvas.getContext('2d');
      g.drawImage(bitmap, 0, 0);
      const d = g.getImageData(0, 0, bitmap.width, bitmap.height).data;
      return points.map(([x, y]) => {
        const i = (y * bitmap.width + x) * 4;
        return [d[i], d[i + 1], d[i + 2]];
      });
    },
    [png.toString('base64'), points],
  );
}

async function measureSpread(themes) {
  const t = CRAFT_D1.match(TIER_LAYER);
  if (!t) throw new Error('craft.module.css: no tier vignette in .screen to model');
  const [rx, ry, cx, cy, mix, stop] = t.slice(1).map((n) => parseFloat(n) / 100);
  const tierShape = { rx, ry, cx, cy, stop, alpha: mix };
  const FX = [0.02, 0.15, 0.3, 0.45, 0.5, 0.55, 0.7, 0.85, 0.98];
  const FY = [0.001, 0.01, 0.03, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 0.97, 0.999];
  const skipped = new Set();
  const histogram = new Map();
  let lo = Infinity;
  let hi = -Infinity;
  let samples = 0;
  for (const [width, height] of SIZES) {
    for (const dpr of RATIOS) {
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
      const page = await ctx.newPage();
      await page.setContent(PAGE);
      for (const theme of themes) {
        const tokens = await page.evaluate((theme) => {
          if (theme === 'default') document.documentElement.removeAttribute('data-theme');
          else document.documentElement.setAttribute('data-theme', theme);
          const cs = getComputedStyle(document.documentElement);
          const get = (name) => cs.getPropertyValue(name).trim();
          return { void: get('--ew-void'), line: get('--ew-line-strong'), light: get('--ew-light'), opacity: Number(get('--ew-motif-opacity')) };
        }, theme);
        const lights = [];
        for (const layer of tokens.light === 'none' ? [] : layersOf(tokens.light)) {
          const m = layer.replace(/\s+/g, ' ').match(RADIAL_LAYER);
          if (!m) skipped.add(theme);
          else {
            const [rx, ry, cx, cy] = m.slice(1, 5).map((n) => parseFloat(n) / 100);
            lights.push({ rx, ry, cx, cy, colour: m.slice(5, 8).map(Number), alpha: Number(m[8]), stop: parseFloat(m[9]) / 100 });
          }
        }
        if (skipped.has(theme)) continue;
        for (const tier of [null, ...TIER_COLOURS]) {
          await page.evaluate((tier) => {
            const room = document.querySelector('.room');
            room.className = `room ${tier ? 'craft' : 'run'} solid`;
            if (tier) room.style.setProperty('--ew-tier', tier);
            else room.style.removeProperty('--ew-tier');
          }, tier);
          const points = FY.flatMap((fy) => FX.map((fx) => [Math.floor(fx * width * dpr), Math.floor(fy * height * dpr)]));
          const painted = await pixelsAt(decoder, await page.screenshot(), points);
          points.forEach(([px, py], k) => {
            const x = (px + 0.5) / (width * dpr);
            const y = (py + 0.5) / (height * dpr);
            // Bottom first: the tier vignette, the light's layers (listed top
            // first, so reversed), then the wallpaper over everything.
            const layers = [
              ...(tier ? [{ colour: hexToRgb(tier), alpha: radialAt(tierShape, x, y) }] : []),
              ...[...lights].reverse().map((g) => ({ colour: g.colour, alpha: radialAt(g, x, y) })),
              { colour: hexToRgb(tokens.line), alpha: tokens.opacity },
            ];
            const exact = layers.reduce((c, l) => c.map((v, i) => v + (l.colour[i] - v) * l.alpha), hexToRgb(tokens.void));
            painted[k].forEach((level, i) => {
              const off = level - exact[i];
              lo = Math.min(lo, off);
              hi = Math.max(hi, off);
              samples++;
              const bin = Math.round(off * 2) / 2;
              histogram.set(bin, (histogram.get(bin) ?? 0) + 1);
            });
          });
        }
      }
      await ctx.close();
    }
  }
  console.log(`Painted level minus exact composite, ${samples} channel samples, ${SIZES.map((s) => s.join('x')).join(' and ')}, DPR ${RATIOS.join(' and ')}:`);
  console.log(`  from ${lo.toFixed(2)} to +${hi.toFixed(2)} levels`);
  console.log(`  ${[...histogram].sort((a, b) => a[0] - b[0]).map(([bin, n]) => `${bin}: ${n}`).join('  ')}`);
  if (skipped.size) console.log(`  not modelled (a key-light layer that is not a plain radial): ${[...skipped].join(', ')}`);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const ALL = themeIds();
const ONLY = arg('--themes', '') ? arg('--themes', '').split(',') : ALL;
const unknown = ONLY.filter((t) => !ALL.includes(t));
if (unknown.length) throw new Error(`--themes names no such theme: ${unknown.join(', ')}`);
const THEMES = ['default', ...ONLY.filter((t) => t !== 'default')];

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const decoder = await (await browser.newContext()).newPage();

if (process.argv.includes('--spread')) {
  await measureSpread(THEMES);
  await browser.close();
  process.exit(0);
}

/** results[theme][measure] = worst over every size and ratio, with where. */
const results = new Map(THEMES.map((t) => [t, {}]));
for (const [width, height] of SIZES) {
  for (const dpr of RATIOS) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
    const page = await ctx.newPage();
    await page.setContent(PAGE);
    for (const theme of THEMES) {
      const got = await measureTheme(page, decoder, theme);
      const into = results.get(theme);
      for (const [measure, hit] of Object.entries(got)) {
        if (!into[measure] || hit.worst < into[measure].worst) into[measure] = { ...hit, size: `${width}x${height}@${dpr}` };
      }
    }
    await ctx.close();
  }
}
await browser.close();

const base = results.get('default');
const fmt = (n) => n.toFixed(3).padStart(7);
const where = (h) => `${h.size} ${h.stack}${h.tier ? ` ${h.tier}` : ''} rgb(${h.at.slice(0, 3)}) at ${Math.round(h.at[3] * 100)}%,${Math.round(h.at[4] * 100)}%`;

console.log(`Bare-room contrast in Chromium: worst pixel against --ew-ink, ${SIZES.map((s) => s.join('x')).join(' and ')}, DPR ${RATIOS.join(' and ')}.`);
console.log('`room` and `solid` gate against the default; `painted` keeps the foot vignette D1 omits and is reported only.\n');
console.log(`${'theme'.padEnd(24)} ${'room'.padStart(7)} ${'margin'.padStart(7)} ${'solid'.padStart(7)} ${'margin'.padStart(7)} ${'painted'.padStart(7)}  worst room pixel`);
const failures = [];
for (const theme of THEMES) {
  const r = results.get(theme);
  const mRoom = r.room.worst - base.room.worst;
  const mSolid = r.solid.worst - base.solid.worst;
  const fail = mRoom < 0 || mSolid < 0;
  if (fail) failures.push(theme);
  console.log(
    `${theme.padEnd(24)} ${fmt(r.room.worst)} ${fmt(mRoom)} ${fmt(r.solid.worst)} ${fmt(mSolid)} ${fmt(r.painted.worst)}  ${where(r.room)}${fail ? '  FAIL' : ''}`,
  );
}
console.log('');
if (failures.length) {
  console.log(`FAIL: ${failures.length} theme(s) read worse on the bare room than the default does: ${failures.join(', ')}`);
  process.exit(1);
}
console.log(`PASS: every theme's bare room reads at least as well as the default's (${fmt(base.room.worst).trim()} with its mask, ${fmt(base.solid.worst).trim()} solid).`);
