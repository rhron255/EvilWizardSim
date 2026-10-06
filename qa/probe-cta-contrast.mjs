/**
 * Is the title screen's primary button readable at every tier?
 *
 * The button's label used the tier colour outright, and the tier colour is what
 * a first-time player has too: Unknown is a warm grey (#7A7365), ~3.8:1 against
 * the button's own tinted panel — under the 4.5:1 a 16px label needs, and on the
 * first control anyone ever sees it read as disabled.
 *
 * `color-mix()` cannot be resolved in jsdom, and re-deriving the mix in a unit
 * test would only grade the implementation's own homework (failure mode 11). So
 * this asks a real browser what colours it actually painted, for a fresh profile
 * and for a profile whose best career reached each tier, and computes the WCAG
 * ratio from those.
 *
 *   node qa/probe-cta-contrast.mjs
 *
 * Exits non-zero if any tier's label falls under 4.5:1.
 */
import { chromium } from 'playwright';
import { dismissChangelogPopup } from './first-run.mjs';

const TIERS = [
  ['unknown', 0],
  ['local_menace', 45],
  ['named_threat', 65],
  ['kingdom', 80],
  ['legend', 95],
];
const FLOOR = 4.5;

/** Parse the colour formats Chromium hands back from `getComputedStyle`. */
function parse(css) {
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  }
  const c = css.match(/color\(srgb ([^)]+)\)/);
  if (c) {
    const [r, g, b, a = 1] = c[1].split(/[\s/]+/).filter(Boolean).map(Number);
    return { r: r * 255, g: g * 255, b: b * 255, a };
  }
  throw new Error(`cannot parse colour: ${css}`);
}
const lin = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const problems = [];
console.log('\n▸ title primary button contrast\n');

for (const [tier, best] of TIERS) {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await context.newPage();
  await page.addInitScript(
    ({ best }) => {
      try {
        localStorage.setItem(
          'evil-wizard-sim:collection',
          JSON.stringify({
            version: 6,
            discoveredArtifactIds: [],
            endingsSeen: [],
            runsCompleted: best > 0 ? 3 : 0,
            bestNotoriety: best,
            tutorialSeen: true,
            lastWizardName: '',
            selectedThemeId: 'default',
            relicsResetAt: '9999-12-31T00:00:00Z',
          }),
        );
      } catch {
        /* storage unavailable — the probe will report the default tier */
      }
    },
    { best },
  );
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await dismissChangelogPopup(page).catch(() => {});
  const styles = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /begin a career/i.test(x.textContent || ''));
    const cs = getComputedStyle(b);
    return { color: cs.color, background: cs.backgroundColor };
  });
  const fg = parse(styles.color);
  let bg = parse(styles.background);
  // A translucent fill sits on the page's own void; composite it so the ratio is honest.
  if (bg.a < 1) {
    const void_ = { r: 11, g: 10, b: 9 };
    bg = { r: bg.r * bg.a + void_.r * (1 - bg.a), g: bg.g * bg.a + void_.g * (1 - bg.a), b: bg.b * bg.a + void_.b * (1 - bg.a), a: 1 };
  }
  const r = ratio(fg, bg);
  const ok = r >= FLOOR;
  console.log(`  ${tier.padEnd(13)} ${r.toFixed(2)}:1 ${ok ? '✓' : `✗ under ${FLOOR}:1`}   label ${styles.color}  on ${styles.background}`);
  if (!ok) problems.push(`${tier}: ${r.toFixed(2)}:1`);
  await context.close();
}
await browser.close();

if (problems.length) {
  console.log(`\n  ✗ ${problems.length} tier(s) under ${FLOOR}:1: ${problems.join(', ')}`);
  process.exit(1);
}
console.log(`\n  ✓ every tier clears ${FLOOR}:1`);
