/**
 * The theme selector and the themes themselves, MEASURED.
 *
 * CLAUDE.md failure mode 7: a screenshot cannot settle whether a theme
 * applied. It can only show a colour, and every theme here is a near-black —
 * "is that violet or is that my monitor" is not a test. So this reads computed
 * styles out of the live DOM and asserts the things that actually matter:
 *
 *   - selecting a theme changes `--ew-panel` on the screen root, and the
 *     change survives a navigation and a reload (it is persisted);
 *   - `--ew-tier` is IDENTICAL under every theme, which is the whole
 *     constraint the amended pillar rests on. EVERY theme: each one in
 *     `THEMES` is selected by name through the selector, not a sample;
 *   - the selector fits the reference device without a horizontal scrollbar
 *     and every swatch is a real touch target.
 *
 *   node qa/probe-themes.mjs [--url http://localhost:5173] [--width 393]
 */
import { chromium } from 'playwright';
import { openApp } from './first-run.mjs';
import { themeEndingIds, themes } from './theme-ids.mjs';
import { mkdir } from 'node:fs/promises';

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const URL = arg('--url', 'http://localhost:5173');
const WIDTH = Number(arg('--width', '393'));
const HEIGHT = Number(arg('--height', '852'));
const OUT = arg('--out', 'qa/screenshots');

await mkdir(OUT, { recursive: true });

const problems = [];
const note = (ok, label, detail) => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
});

console.log(`\n▸ ${URL}  @${WIDTH}×${HEIGHT}\n`);

/**
 * Seed a collection with every ending seen, so every theme is unlocked. The
 * endings are read off `THEMES` (qa/theme-ids.mjs), not hand-copied: the copy
 * that used to sit here still listed the first seven and called it "all eight
 * themes" against twenty.
 *
 * ONLY IF ABSENT. `addInitScript` runs before EVERY navigation, not once — an
 * unconditional write re-seeds on reload and silently reverts whatever the
 * probe just did. The first version of this file did exactly that and reported
 * "the chosen theme is not persisted" against an app that persists it
 * correctly, which is CLAUDE.md failure mode 11 in its purest form: when a
 * probe disagrees with a unit test, suspect the probe.
 *
 * The seed is written at `COLLECTION_VERSION` as it stands (6,
 * src/engine/constants.ts), `relicsResetAt` included, the same as
 * `probe-ornament-spacing.mjs` and `shoot-themes.mjs`. Nothing here notices
 * when the constant is bumped past it: `migrateCollection` salvages an older
 * save without a word, and through v6 that keeps every field this probe reads.
 * The loud case is a seed ABOVE `COLLECTION_VERSION`. The app takes that for a
 * save from a newer build and starts an empty collection, and the first check
 * below finds one selectable swatch where it expects every theme. (It used to
 * ask for `pressed: false` buttons, which matches every button with no
 * `aria-pressed` at all — 21 of 22 on that screen, empty collection or full.)
 */
const SEED_VERSION = 6;
await page.addInitScript(
  ([endings, version]) => {
    if (localStorage.getItem('evil-wizard-sim:collection')) return;
    localStorage.setItem(
      'evil-wizard-sim:collection',
      JSON.stringify({
        version,
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
  },
  [themeEndingIds(), SEED_VERSION],
);
const ALL_THEMES = themes();
const THEME_COUNT = ALL_THEMES.length;

await openApp(page, URL);

// --- reach the selector ------------------------------------------------------
await page.getByRole('button', { name: /^Themes/ }).click();
await page.waitForSelector('main');

// Every ending is seen, so every swatch is a live control: the worn default
// and every other theme. Read off the DOM: a locked swatch is disabled and has
// no `aria-pressed`; an unlocked one has it, true or false.
const selectable = await page.evaluate(
  () => document.querySelectorAll('main div[class*="grid"] > button[aria-pressed]:not([disabled])').length,
);
note(
  selectable === THEME_COUNT,
  'selector reachable from the title, every theme unlocked',
  `${selectable} selectable swatches of ${THEME_COUNT}`,
);

// --- layout on the reference device ------------------------------------------
const layout = await page.evaluate(() => {
  const doc = document.documentElement;
  const grid = document.querySelector('main div[class*="grid"]');
  const cards = grid ? [...grid.children] : [];
  const rects = cards.map((c) => c.getBoundingClientRect());
  return {
    horizontalOverflow: doc.scrollWidth - doc.clientWidth,
    cardCount: cards.length,
    columns: new Set(rects.map((r) => Math.round(r.left))).size,
    minCardHeight: Math.min(...rects.map((r) => r.height)),
    minCardWidth: Math.min(...rects.map((r) => r.width)),
  };
});

note(layout.horizontalOverflow <= 0, 'no horizontal overflow', `${layout.horizontalOverflow}px`);
note(layout.columns === 2, 'two-column grid at 393px', `${layout.columns} columns`);
// One swatch per theme, counted against `THEMES` itself (qa/theme-ids.mjs),
// never against a number typed here: a typed "eight" is what left this probe
// passing a grid of twenty without noticing twelve were new.
note(layout.cardCount === THEME_COUNT, 'a swatch for every theme', `${layout.cardCount} cards for ${THEME_COUNT} themes`);
note(
  layout.minCardHeight >= 44,
  'every swatch clears the 44px touch floor',
  `smallest ${Math.round(layout.minCardHeight)}px`,
);

await page.screenshot({ path: `${OUT}/themes-selector.png` });
console.log(`  shot  ${OUT}/themes-selector.png`);

// --- does selecting one actually change the room? ----------------------------
// Every theme but the default, each selected by its NAME through the selector,
// the way a player does it, in `THEMES` order (qa/theme-ids.mjs). This loop
// used to hand-list four themes, so every check below that reads "every
// theme" read five rooms of twenty: the scarce colour could have moved under
// any of the other fifteen and this probe would still have said it held.
//
// Read per room: what the THEME makes `--ew-tier` and its glow (see below),
// the ink-on-panel contrast in the browser's own colours (through a probe
// element, so they are real rgb(), not the raw custom-property text), and the
// wallpaper the room hangs on its `::before`.
//
// The tier is NOT read off the screen root. Every screen pins `--ew-tier` and
// `--ew-tier-glow` inline on its root (`tierVars`, or RunScreen's own), and an
// inline declaration beats a `[data-theme]` rule, so reading `main` reads the
// pin: with `--ew-tier: #f00` added to a theme's block in tokens.css, this
// check, reading `main`, still printed one tier for every room and passed. So
// the tier is read off a bare element that wears the same `data-theme` and
// nothing else, which resolves what the theme's own stylesheet says, the
// value anything outside a pinned root would paint.
const readRoom = () =>
  page.evaluate(() => {
    const root = document.querySelector('main');
    const cs = getComputedStyle(root);
    const bare = document.createElement('div');
    if (root.hasAttribute('data-theme')) bare.setAttribute('data-theme', root.getAttribute('data-theme'));
    document.body.appendChild(bare);
    const themed = getComputedStyle(bare);
    const own = {
      tier: themed.getPropertyValue('--ew-tier').trim(),
      tierGlow: themed.getPropertyValue('--ew-tier-glow').trim(),
      legendary: themed.getPropertyValue('--ew-legendary').trim(),
    };
    bare.remove();
    const lin = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const lum = (rgb) => {
      const [r, g, b] = rgb.match(/\d+/g).map(Number);
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const probe = document.createElement('span');
    probe.style.color = cs.getPropertyValue('--ew-ink');
    probe.style.backgroundColor = cs.getPropertyValue('--ew-panel');
    root.appendChild(probe);
    const p = getComputedStyle(probe);
    const [hi, lo] = [lum(p.color), lum(p.backgroundColor)].sort((a, b) => b - a);
    probe.remove();
    const wall = getComputedStyle(root, '::before');
    return {
      theme: root.getAttribute('data-theme'),
      panel: cs.getPropertyValue('--ew-panel').trim(),
      ...own,
      contrast: (hi + 0.05) / (lo + 0.05),
      wallMask: (wall.maskImage || wall.webkitMaskImage || 'none').slice(0, 30),
      wallOpacity: Number(wall.opacity),
    };
  });

const [DEFAULT_THEME, ...EARNED_THEMES] = [
  ...ALL_THEMES.filter((t) => t.endingId === null),
  ...ALL_THEMES.filter((t) => t.endingId !== null),
];
if (DEFAULT_THEME?.endingId !== null || EARNED_THEMES.some((t) => t.endingId === null)) {
  throw new Error('probe-themes: expected exactly one theme with no ending (the default) in THEMES');
}

const before = await readRoom();
note(before.theme === null, `the default (${DEFAULT_THEME.name}) sets no data-theme attribute`, `panel ${before.panel}`);

const seen = [{ name: DEFAULT_THEME.name, ...before }];
const started = Date.now();
for (const { id, name } of EARNED_THEMES) {
  // `exact`: the accessible name is the theme's name, plus ", currently worn"
  // once it is the worn one, so no prefix of one name can select another.
  await page.getByRole('button', { name, exact: true }).click();
  await page
    .waitForFunction((id) => document.querySelector('main')?.getAttribute('data-theme') === id, id, { timeout: 2000 })
    .catch(() => {});
  const after = await readRoom();
  seen.push({ name, ...after });
  note(
    after.theme === id && after.panel !== before.panel,
    `${name} repaints the room`,
    `data-theme=${after.theme} panel ${after.panel}`,
  );
}
console.log(`  (${EARNED_THEMES.length} themes selected by name in ${((Date.now() - started) / 1000).toFixed(1)}s)`);

// --- THE constraint: the scarce colour never moves ---------------------------
const tiers = new Set(seen.map((s) => s.tier));
const glows = new Set(seen.map((s) => s.tierGlow));
const legendaries = new Set(seen.map((s) => s.legendary));
note(
  seen.length === THEME_COUNT && tiers.size === 1 && !tiers.has(''),
  'every theme leaves --ew-tier untouched',
  `${seen.length} of ${THEME_COUNT} rooms: ${[...tiers].join(' | ') || '(empty)'}`,
);
note(
  seen.length === THEME_COUNT && glows.size === 1 && !glows.has(''),
  'every theme leaves --ew-tier-glow untouched',
  `${seen.length} of ${THEME_COUNT} rooms: ${[...glows].join(' | ')}`,
);
note(legendaries.size === 1, '--ew-legendary stays pinned', [...legendaries].join(' | '));

// --- ink contrast, measured on the real rendered colours ---------------------
const dimmest = seen.reduce((a, b) => (b.contrast < a.contrast ? b : a));
note(
  dimmest.contrast >= 13.8,
  'ink clears the contrast floor in the browser, in every room',
  `lowest ${dimmest.contrast.toFixed(2)}:1, under ${dimmest.name}`,
);

// --- ornament: does the room's decoration actually draw? ---------------------
// Every shape is a data-URI SVG used as a mask. One that fails to parse is not
// an error anywhere — the mask is just empty and the wallpaper silently is not
// there, which is how eight shapes once shipped invisible past a green unit
// suite. So decode every one in a real browser, and read each room's
// wallpaper layer off the live DOM (`--ew-motif` is never none).
const ornament = await page.evaluate(async () => {
  const rootStyle = getComputedStyle(document.documentElement);
  const names = [...document.styleSheets]
    .flatMap((sheet) => {
      try {
        return [...sheet.cssRules];
      } catch {
        return [];
      }
    })
    .flatMap((rule) => (rule.style ? [...rule.style] : []))
    .filter((name) => name.startsWith('--ew-shape-'));
  const failed = [];
  for (const name of new Set(names)) {
    const src = rootStyle.getPropertyValue(name).trim().match(/^url\("(.*)"\)$/)?.[1];
    const img = new Image();
    img.src = src ?? '';
    const ok = await img.decode().then(() => img.naturalWidth > 0, () => false);
    if (!ok) failed.push(name);
  }
  return { shapes: new Set(names).size, failed };
});
note(
  ornament.shapes >= 20 && ornament.failed.length === 0,
  'every ornament shape decodes in the browser',
  ornament.failed.length ? `broken: ${ornament.failed.join(', ')}` : `${ornament.shapes} shapes`,
);
const unhung = seen.filter((s) => !(s.wallMask.startsWith('url(') && s.wallOpacity > 0));
note(
  unhung.length === 0,
  'every room hangs its wallpaper',
  unhung.length ? `none under ${unhung.map((s) => s.name).join(', ')}` : `${seen.length} rooms`,
);

// --- persistence: does the choice survive a reload? --------------------------
const chosen = await readRoom();
await page.reload({ waitUntil: 'networkidle' });
const persisted = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('evil-wizard-sim:collection')).selectedThemeId,
);
note(
  persisted === chosen.theme,
  'the chosen theme is persisted',
  `stored ${persisted}, worn ${chosen.theme}`,
);

// --- and does it reach the other screens? ------------------------------------
await page.getByRole('button', { name: /Begin a career/ }).click();
await page.waitForTimeout(150);
const onCreation = await page.evaluate(
  () => document.querySelector('main')?.getAttribute('data-theme'),
);
note(onCreation === persisted, 'the theme follows onto the creation screen', `${onCreation}`);
await page.screenshot({ path: `${OUT}/themes-creation-themed.png` });
console.log(`  shot  ${OUT}/themes-creation-themed.png`);

// --- the locked state, which is what a real new player sees ------------------
// One ending seen. Its theme and the default are the only names the selector
// may print; every other theme's name is a secret, read off `THEMES`
// (qa/theme-ids.mjs) rather than hand-listed, so a theme added tomorrow is
// checked tomorrow.
const EARNED = 'retired_to_swamp';
const shown = ALL_THEMES.filter((t) => t.endingId === null || t.endingId === EARNED).map((t) => t.name);
const secret = ALL_THEMES.map((t) => t.name).filter((name) => !shown.includes(name));
if (shown.length !== 2) {
  throw new Error(`probe-themes: expected the default and ${EARNED}'s theme to be open, found ${shown.join(', ') || 'none'}`);
}
await page.evaluate(
  ([earned, version]) => {
    localStorage.setItem(
      'evil-wizard-sim:collection',
      JSON.stringify({
        version,
        discoveredArtifactIds: [],
        endingsSeen: [earned],
        runsCompleted: 1,
        bestNotoriety: 22,
        tutorialSeen: true,
        lastWizardName: 'Malvorn',
        selectedThemeId: 'default',
        relicsResetAt: '9999',
      }),
    );
  },
  [EARNED, SEED_VERSION],
);
await openApp(page, URL);
await page.getByRole('button', { name: /^Themes/ }).click();
await page.waitForTimeout(150);

const locked = await page.evaluate((secret) => {
  const cards = [...document.querySelectorAll('main div[class*="grid"] > button')];
  return {
    total: cards.length,
    disabled: cards.filter((c) => c.disabled).length,
    // A locked card must still say something. The redaction bar stands in for
    // the name; the hint is the only real text on it.
    withHintText: cards.filter((c) => c.disabled && (c.textContent ?? '').trim().length > 12)
      .length,
    // What it prints AND what a screen reader announces. Case-sensitive, as a
    // name is printed: "good ground" in a hint is a hint, "Good Ground" a name.
    namesLeaked: [
      ...new Set(
        cards
          .filter((c) => c.disabled)
          .flatMap((c) => {
            const said = `${c.textContent ?? ''}\n${c.getAttribute('aria-label') ?? ''}\n${c.getAttribute('title') ?? ''}`;
            return secret.filter((name) => said.includes(name));
          }),
      ),
    ],
  };
}, secret);

// A one-ending player has the default and that ending's theme; the rest are
// locked. Structural, not a count, for the reason above.
note(
  locked.disabled === locked.total - 2,
  'every theme but the default and the earned one is locked',
  `${locked.disabled} of ${locked.total}`,
);
note(
  locked.withHintText === locked.disabled,
  'every locked swatch still shows its ending hint',
  `${locked.withHintText}/${locked.disabled}`,
);
note(
  locked.namesLeaked.length === 0,
  'no locked theme leaks its name',
  locked.namesLeaked.length ? `printed: ${locked.namesLeaked.join(', ')}` : `${secret.length} names checked`,
);

await page.screenshot({ path: `${OUT}/themes-selector-locked.png` });
console.log(`  shot  ${OUT}/themes-selector-locked.png`);

await browser.close();

console.log('');
if (problems.length) {
  console.log(`  ✗ ${problems.length} problem(s):`);
  for (const p of problems) console.log(`      ${p}`);
  process.exit(1);
}
console.log('  ✓ themes probe clean\n');
