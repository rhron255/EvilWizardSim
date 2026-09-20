/**
 * Does every relic power fit, and does it read as a fact rather than a joke?
 *
 *   node qa/probe-relic-powers.mjs [--url http://localhost:5173]
 *
 * Issue #6 replaced `Artifact.effect` — an authored string that was always
 * `Defense +N.` — with a line DERIVED from `ArtifactPower`. The longest of the
 * six is "Apprentice loyalty falls 2 slower an era.", roughly four times the
 * width of what the collection grid's card was laid out against, and 393x852
 * is the reference device rather than a breakpoint to degrade toward.
 *
 * MEASURES THE DOM, never a screenshot (CLAUDE.md failure mode 7): `scrollWidth`
 * against `clientWidth` for a clipped line, the card's own rect for a line that
 * has escaped it, and `getComputedStyle` for the one thing a bounding box
 * cannot see — that the power line and the flavour line underneath it do not
 * look alike. The power is upright in `--ew-ink`; the flavour is italic in
 * `--ew-ink-faint`. If those ever converge, the card stops distinguishing what
 * a relic DOES from what it is like, which is the whole point of printing both.
 *
 * Exits non-zero on a clipped line, an escaped line, a console error, or a
 * power the catalog carries that never reached the screen.
 */
import { chromium } from 'playwright';

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const URL = arg('--url', 'http://localhost:5173');
const W = 393;
const H = 852;

/** The six sentence shapes `artifactPowerText` can produce. */
const POWER_LINE =
  /^(Wards \+\d+\.|Hero threat rises \d+ slower an era\.|Notoriety decays \d+ slower an era\.|Apprentice loyalty falls \d+ slower an era\.|Every follower cost is \d+ smaller\.|Every standing loss is \d+ smaller\.)$/;

const problems = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

// --- 1. the collection grid, with every relic discovered -------------------
await page.goto(URL, { waitUntil: 'networkidle' });
const ids = await page.evaluate(async () => {
  const mod = await import('/src/content/artifacts.ts');
  return mod.artifacts.map((a) => a.id);
});
await page.evaluate((ids) => {
  const k = 'evil-wizard-sim:collection';
  const cur = JSON.parse(localStorage.getItem(k) || '{}');
  localStorage.setItem(
    k,
    JSON.stringify({
      version: cur.version ?? 1,
      discoveredArtifactIds: ids,
      endingsSeen: cur.endingsSeen ?? [],
      runsCompleted: cur.runsCompleted ?? 1,
      bestNotoriety: cur.bestNotoriety ?? 50,
      tutorialSeen: true,
      lastWizardName: 'Probe',
      selectedThemeId: cur.selectedThemeId ?? 'default',
    }),
  );
}, ids);
await page.reload({ waitUntil: 'networkidle' });
await page.click('text=/collection/i').catch(() => {});
await page.waitForTimeout(800);

const cards = await page.$$eval('article[data-rarity]', (nodes) => {
  const out = [];
  for (const n of nodes) {
    const ps = [...n.querySelectorAll('p')];
    const line = ps[ps.length - 1];
    if (!line) continue;
    const r = line.getBoundingClientRect();
    const card = n.getBoundingClientRect();
    out.push({
      name: (n.querySelector('h4')?.textContent ?? '(locked)').trim(),
      text: (line.textContent ?? '').trim(),
      clipped: line.scrollHeight > line.clientHeight + 1 || line.scrollWidth > line.clientWidth + 1,
      escaped: r.bottom > card.bottom + 1 || r.right > card.right + 1,
      offscreen: r.right > window.innerWidth + 1 || r.left < -1,
    });
  }
  return out;
});

const powered = cards.filter((c) => POWER_LINE.test(c.text));
if (powered.length !== ids.length) {
  problems.push(`${powered.length} relic cards printed a power line, expected ${ids.length}`);
}
for (const c of powered) {
  if (c.clipped) problems.push(`clipped on "${c.name}": ${c.text}`);
  if (c.escaped) problems.push(`escapes its card on "${c.name}": ${c.text}`);
  if (c.offscreen) problems.push(`offscreen at ${W}px on "${c.name}": ${c.text}`);
}

// --- 2. the acquisition row, where the relic is handed over ----------------
await page.goto(`${URL}/qa/run-harness.html?scene=resolution`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1400);
const handover = await page.evaluate((src) => {
  const RE = new RegExp(src);
  for (const n of document.querySelectorAll('span,p,div')) {
    if (n.children.length) continue;
    const t = (n.textContent ?? '').trim();
    if (!RE.test(t)) continue;
    const cs = getComputedStyle(n);
    const flavour = n.nextElementSibling ? getComputedStyle(n.nextElementSibling) : null;
    const r = n.getBoundingClientRect();
    return {
      text: t,
      clipped: n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1,
      offscreen: r.right > window.innerWidth + 1,
      style: cs.fontStyle,
      color: cs.color,
      flavourStyle: flavour?.fontStyle ?? null,
      flavourColor: flavour?.color ?? null,
    };
  }
  return null;
}, POWER_LINE.source);

if (!handover) {
  problems.push('the resolution card handed over a relic without saying what it does');
} else {
  if (handover.clipped) problems.push(`acquisition line clipped: ${handover.text}`);
  if (handover.offscreen) problems.push(`acquisition line offscreen at ${W}px: ${handover.text}`);
  if (handover.style !== 'normal') {
    problems.push(`acquisition line is ${handover.style} — it reads as flavour, not as a fact`);
  }
  if (handover.flavourColor && handover.flavourColor === handover.color) {
    problems.push('the power line and the flavour line under it are the same colour');
  }
}

const realErrors = errors.filter((e) => !/CERT_AUTHORITY|ERR_CERT/.test(e));
for (const e of realErrors) problems.push(`console.error: ${e}`);

console.log(`\n  relic power lines at ${W}x${H}\n`);
console.log(`  collection cards  : ${powered.length}/${ids.length} printed a power line`);
console.log(`  distinct lines    : ${new Set(powered.map((c) => c.text)).size}`);
console.log(`  handover          : ${handover ? handover.text : 'MISSING'}`);
console.log(
  `  handover styling  : ${handover ? `${handover.style} ${handover.color}` : '-'} vs flavour ${handover?.flavourStyle ?? '-'} ${handover?.flavourColor ?? '-'}`,
);

if (problems.length) {
  console.log(`\n  ✗ ${problems.length} problem(s):`);
  for (const p of problems) console.log(`      - ${p}`);
  await browser.close();
  process.exit(1);
}
console.log('\n  ✓ every power fits, and reads as a fact\n');
await browser.close();
