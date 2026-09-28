/**
 * The relic page (issue #78), the relic power framework (issue #80), and the
 * catalog's first actives (issue #81).
 *
 * Probes the DOM for the entry button, the page heading, relic cards (every
 * origin grants one from creation now, so there is no "zero relics" state to
 * probe any more — issue #80 retired it), the lost-this-run section, the
 * keyboard path (Tab to the Relics button, Enter to open; Tab to Back, Enter
 * to return, with focus landing correctly both ways), a relic's power line on
 * its card, and the "Your relics" resolution section an era-end trigger
 * (Mantle of Slow Moss) fires into every era.
 *
 * The last section (issue #81) reaches Final Ledger and Pale Orrery by
 * seeding an in-progress save directly — reaching either legendary through
 * genuine play is too rare for a scripted probe to rely on — and checks the
 * "· N ready" entry-button suffix, both Use buttons, and the keyboard path to
 * each one (failure mode 15: a screenshot cannot show a keypress).
 *
 *   node qa/probe-relics.mjs [--url http://localhost:5173]
 */
import { chromium } from 'playwright';
import { dismissChangelogPopup, dismissFirstRunGuide } from './first-run.mjs';

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const URL = arg('--url', 'http://localhost:5173');

const problems = [];
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });
await dismissChangelogPopup(page).catch(() => {});
await page.getByRole('button', { name: /begin a career/i }).click();
await page.waitForTimeout(400);
await page.getByRole('textbox').first().fill('Malachar the Unpaid');
// Self-Taught in a Bog grants Mantle of Slow Moss, an UNCONDITIONAL era-end
// trigger — the one power guaranteed to fire on the very first era, which is
// what makes it the right origin for a scripted probe rather than a random one.
await page.getByText('Self-Taught in a Bog', { exact: false }).click();
await page.getByRole('button', { name: /begin the career/i }).click();
await page.waitForTimeout(600);
await dismissFirstRunGuide(page);
await page.waitForTimeout(400);

// ---- The entry point exists ------------------------------------------
const openButton = page.getByRole('button', { name: /Relics/ }).first();
if (!(await openButton.isVisible().catch(() => false))) {
  problems.push('entry point: no Relics button found on a fresh run');
}

// ---- A fresh run already holds its origin relic (issue #80) -----------
await openButton.click();
await page.waitForTimeout(300);
const heading = page.getByRole('heading', { name: 'Your Relics' });
if (!(await heading.isVisible().catch(() => false))) {
  problems.push('relic page: heading did not appear on open');
}
const mantleCard = page.getByText('Mantle of Slow Moss', { exact: false }).first();
if (!(await mantleCard.isVisible().catch(() => false))) {
  problems.push('relic page: the origin relic (Mantle of Slow Moss) is not shown on a brand-new run');
}
// The power line, not just the name — the acceptance item this probe exists
// for: "the relic page shows each held relic's power line."
const powerLine = await page.getByText(/era's end/i).isVisible().catch(() => false);
if (!powerLine) {
  problems.push('relic page: no power line found for the held relic');
}

// Back returns to the decision.
const backButton = page.getByRole('button', { name: /Back to the decision/ }).first();
await backButton.click();
await page.waitForTimeout(300);
if (await heading.isVisible().catch(() => false)) {
  problems.push('relic page: still visible after Back');
}

// ---- Keyboard path: Tab to Relics, Enter to open; Tab to Back, Enter back
await openButton.focus();
const focusedBeforeOpen = await page.evaluate(() => document.activeElement?.textContent ?? '');
if (!/Relics/.test(focusedBeforeOpen)) {
  problems.push(`keyboard: focus is not on the Relics button before Enter (was "${focusedBeforeOpen}")`);
}
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
if (!(await heading.isVisible().catch(() => false))) {
  problems.push('keyboard: Enter on the Relics button did not open the relic page');
}
const focusedOnOpen = await page.evaluate(() => document.activeElement?.textContent ?? '');
if (!/Your Relics/.test(focusedOnOpen)) {
  problems.push(`keyboard: focus did not move to the relic page heading on open (was "${focusedOnOpen}")`);
}

await backButton.focus();
const focusedBeforeBack = await page.evaluate(() => document.activeElement?.textContent ?? '');
if (!/Back to the decision/.test(focusedBeforeBack)) {
  problems.push(`keyboard: focus is not on Back before Enter (was "${focusedBeforeBack}")`);
}
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
if (await heading.isVisible().catch(() => false)) {
  problems.push('keyboard: Enter on Back did not return to the decision');
}
const focusedAfterBack = await page.evaluate(() => document.activeElement?.textContent ?? '');
if (!/Relics/.test(focusedAfterBack)) {
  problems.push(`keyboard: focus did not return to the Relics button after Back (was "${focusedAfterBack}")`);
}

await page.screenshot({ path: 'qa/screenshots/probe-relics-fresh.png', fullPage: true });

// ---- Take one choice: the era-end trigger should show in "Your relics" ----
const OPTIONS = 'button[data-option-index]:not([disabled])';
const options = page.locator(OPTIONS);
if ((await options.count().catch(() => 0)) === 0) {
  problems.push('decision panel: no pickable option found for the scripted first choice');
} else {
  await options.nth(0).click();
  await page.waitForTimeout(500);
  const dialog = page.getByRole('dialog').first();
  if (!(await dialog.isVisible({ timeout: 1000 }).catch(() => false))) {
    problems.push('resolution: no overlay appeared after the first choice');
  } else {
    const relicsLabel = await dialog.getByText('Your relics').isVisible().catch(() => false);
    if (!relicsLabel) {
      problems.push('resolution: "Your relics" section did not appear for an era-end trigger that should have fired');
    }
    const attributed = await dialog.getByText('Mantle of Slow Moss', { exact: false }).isVisible().catch(() => false);
    if (!attributed) {
      problems.push('resolution: the era-end reaction is not attributed to Mantle of Slow Moss by name');
    }
    await page.screenshot({ path: 'qa/screenshots/probe-relics-resolution.png', fullPage: true });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
  }
}

// ---- Play a handful more eras forward, then check the populated page -------
const FLOW = 'button:not([data-option-index]):not([disabled])';
let eras = 1;
for (let step = 0; step < 60 && eras < 8; step++) {
  const remaining = page.locator(OPTIONS);
  const count = await remaining.count().catch(() => 0);
  if (count > 0) {
    await remaining.nth(0).click();
    eras++;
    await page.waitForTimeout(250);
    continue;
  }
  const flow = page.locator(FLOW);
  const flowCount = await flow.count().catch(() => 0);
  if (flowCount === 0) break;
  await flow.nth(flowCount - 1).click();
  await page.waitForTimeout(250);
}

if (await page.getByRole('dialog').first().isVisible({ timeout: 500 }).catch(() => false)) {
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
}

const openAgain = page.getByRole('button', { name: /Relics/ }).first();
const label = (await openAgain.textContent().catch(() => '')) ?? '';
const relicCount = Number((label.match(/(\d+)/) || [])[1] ?? 0);
await openAgain.click();
await page.waitForTimeout(300);

const cards = await page.locator('article[data-rarity]').count().catch(() => 0);
if (cards === 0) {
  problems.push(`relic page: label reports ${relicCount} relics but no relic cards rendered`);
} else {
  console.log(`  relic cards : ${cards} rendered (label said ${relicCount})`);
}
// PR #88 restyled this from a sentence ("Relics add N to your wards.") to a
// terse subtitle under the heading ("+N Wards").
const wardsLine = await page.getByText(/^\+\d+ Wards$/).isVisible().catch(() => false);
if (!wardsLine) problems.push('relic page: wards subtitle ("+N Wards") not found');

const lostHeading = page.getByRole('heading', { name: 'Lost this run' });
const hasLost = await lostHeading.isVisible().catch(() => false);
console.log(`  lost section: ${hasLost ? 'present' : 'absent (nothing lost yet, expected on many runs)'}`);

await page.screenshot({ path: 'qa/screenshots/probe-relics-populated.png', fullPage: true });

// ---- Issue #81: the Use button, seeded directly (see the file header) ----
const seededRun = {
  id: 'w-probe-actives',
  seed: 42,
  wizardName: 'Probe',
  epithet: 'the Seeded',
  originId: 'bog_autodidact',
  age: 35,
  eraIndex: 3,
  eraCount: 16,
  phase: 'ascent',
  prophecyEra: 9,
  erasSinceProphecy: 0,
  notoriety: 30,
  followers: 100,
  lairId: 'rented_cellar',
  // Issue #82: three more actives join the two issue #81 already seeded here
  // (Final Ledger, Pale Orrery) — Brazier of the Ninth Clause, the Key to No
  // Particular Door, and the Sword That Was Returned all activate with no
  // `cost` gate, so holding them unspent is the whole setup.
  heldArtifactIds: [
    'final_ledger',
    'pale_orrery',
    'ninth_clause_brazier',
    'key_to_no_particular_door',
    'sword_that_was_returned',
  ],
  startingArtifactIds: [],
  knownArtifactIds: [],
  heroBandSeen: 0,
  factionStanding: {
    ashen_covenant: 0,
    gilded_hand: 30,
    pale_academy: 0,
    verdant_choir: 0,
    crownlands: 0,
    worm_below: 0,
  },
  apprentices: { count: 0, loyalty: 60 },
  pactDebt: 0,
  heroThreat: 0,
  isLich: false,
  goodActs: 0,
  illActs: 0,
  goodWizardVowed: false,
  relicState: { firedOnce: [], spent: [], foresight: false, offerRedrawSalt: 0 },
  eras: [],
  seenOfferIds: [],
};

await page.evaluate((run) => {
  localStorage.setItem('evil-wizard-sim:run', JSON.stringify({ version: 3, run }));
}, seededRun);
await page.reload({ waitUntil: 'networkidle' });
await dismissChangelogPopup(page).catch(() => {});
await page.getByRole('button', { name: /Resume run/i }).click();
await page.waitForTimeout(400);

const entryButton = page.getByRole('button', { name: /Relics/ }).first();
const entryLabel = (await entryButton.textContent().catch(() => '')) ?? '';
if (!/5 ready/.test(entryLabel)) {
  problems.push(`entry button: expected "· 5 ready" for five unspent actives, got "${entryLabel}"`);
}

await entryButton.click();
await page.waitForTimeout(300);

const useButtons = page.getByRole('button', { name: 'Use' });
const useCount = await useButtons.count().catch(() => 0);
if (useCount !== 5) {
  problems.push(
    `relic page: expected 5 Use buttons (Final Ledger, Pale Orrery, Brazier, Key, Sword), found ${useCount}`,
  );
}

// Keyboard path on the first Use button (failure mode 15).
if (useCount > 0) {
  await useButtons.first().focus();
  const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
  if (focused !== 'Use') {
    problems.push(`keyboard: focus is not on a Use button before Enter (was "${focused}")`);
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const remaining = await page.getByRole('button', { name: 'Use' }).count().catch(() => 0);
  if (remaining !== useCount - 1) {
    problems.push(
      `keyboard: pressing Enter on a Use button did not spend it (${useCount} -> ${remaining} remaining)`,
    );
  }
  const spentNote = await page.getByText('Used').isVisible().catch(() => false);
  if (!spentNote) problems.push('relic page: no "Used" note after activating');
}

// The second Use button, activated with Space instead of Enter (still
// failure mode 15 — both keys are meant to work on any button).
const secondUse = page.getByRole('button', { name: 'Use' }).first();
if (await secondUse.isVisible().catch(() => false)) {
  await secondUse.focus();
  await page.keyboard.press(' ');
  await page.waitForTimeout(300);
}

// The remaining Use buttons (Brazier, Key, Sword — three of the five, since
// one was spent by Enter and one by Space above), clicked through by mouse:
// the keyboard path is already proven by the two above, this just needs
// every new active to actually spend and narrate, not just the first two.
for (let i = 0; i < 3; i++) {
  const remainingUse = page.getByRole('button', { name: 'Use' }).first();
  if (await remainingUse.isVisible().catch(() => false)) {
    await remainingUse.click();
    await page.waitForTimeout(300);
  }
}

const noneLeft = await page.getByRole('button', { name: 'Use' }).count().catch(() => 0);
if (noneLeft !== 0) problems.push(`relic page: expected 0 Use buttons left after spending all 5, found ${noneLeft}`);
const allSpentNotes = await page.getByText('Used').count().catch(() => 0);
if (allSpentNotes !== 5) problems.push(`relic page: expected 5 "Used" notes, found ${allSpentNotes}`);

await page.screenshot({ path: 'qa/screenshots/probe-relics-actives.png', fullPage: true });

// ---- Issue #82: the Key to No Particular Door redraws the era's offer -----
// Verified separately from the generic Use-button loop above, because its
// whole effect is invisible on the relic page itself (see the doc comment on
// `redrawsOffer` in `src/types.ts`) — the only place it shows is the offer
// underneath actually changing the moment the player returns to the
// decision. A fresh seeded run holding ONLY the Key isolates that.
{
  const keyRun = {
    ...seededRun,
    id: 'w-probe-key',
    heldArtifactIds: ['key_to_no_particular_door'],
    relicState: { firedOnce: [], spent: [], foresight: false, offerRedrawSalt: 0 },
  };
  await page.evaluate((run) => {
    localStorage.setItem('evil-wizard-sim:run', JSON.stringify({ version: 3, run }));
  }, keyRun);
  await page.reload({ waitUntil: 'networkidle' });
  await dismissChangelogPopup(page).catch(() => {});
  await page.getByRole('button', { name: /Resume run/i }).click();
  await page.waitForTimeout(400);
  const offerTitleBefore = await page.locator('h2, h3').first().textContent().catch(() => '');
  await page.getByRole('button', { name: /Relics/ }).first().click();
  await page.waitForTimeout(300);
  const keyUse = page.getByRole('button', { name: 'Use' }).first();
  if (!(await keyUse.isVisible().catch(() => false))) {
    problems.push('Key to No Particular Door: no Use button on a run holding only the Key');
  } else {
    await keyUse.click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Back to the decision/ }).first().click();
    await page.waitForTimeout(300);
    const offerTitleAfter = await page.locator('h2, h3').first().textContent().catch(() => '');
    if (offerTitleAfter === offerTitleBefore) {
      // Not necessarily a bug — the redraw is seeded and CAN land on the same
      // offer — but is worth a note since silent redraw failure would look
      // identical, and this run's seed was picked to make that collision
      // unlikely, not impossible.
      console.log(
        `  note: Key redraw kept the same offer title ("${offerTitleBefore}") — seeded draw, not necessarily a bug`,
      );
    }
  }
}

// ---- Issue #82: a lifeline saves the run, and the resolution card says so --
// Portcullis Tooth covers `slain_by_chosen_one` alone, which makes it the
// cheaper of the two lifelines to stage: a heroThreat far past wards, one
// choice, and the run should survive with the relic spent and the overlay's
// dedicated Lifeline block naming what it averted (mirrors the exact setup
// `relicsSlice5.test.ts`'s own lifeline test uses at the engine layer).
{
  const lifelineRun = {
    ...seededRun,
    id: 'w-probe-lifeline',
    heldArtifactIds: ['portcullis_tooth'],
    phase: 'decline',
    erasSinceProphecy: 5,
    heroThreat: 200,
    relicState: { firedOnce: [], spent: [], foresight: false, offerRedrawSalt: 0 },
  };
  await page.evaluate((run) => {
    localStorage.setItem('evil-wizard-sim:run', JSON.stringify({ version: 3, run }));
  }, lifelineRun);
  await page.reload({ waitUntil: 'networkidle' });
  await dismissChangelogPopup(page).catch(() => {});
  await page.getByRole('button', { name: /Resume run/i }).click();
  await page.waitForTimeout(400);

  const anyOption = page.locator(OPTIONS).first();
  if (!(await anyOption.isVisible().catch(() => false))) {
    problems.push('lifeline probe: no pickable option found on the seeded run');
  } else {
    await anyOption.click();
    await page.waitForTimeout(500);
    const dialog = page.getByRole('dialog').first();
    if (!(await dialog.isVisible({ timeout: 1000 }).catch(() => false))) {
      problems.push('lifeline probe: no resolution overlay appeared');
    } else {
      const lifelineLabel = await dialog.getByText('Lifeline').isVisible().catch(() => false);
      if (!lifelineLabel) {
        problems.push('lifeline probe: no "Lifeline" block in the resolution overlay');
      }
      const named = await dialog.getByText(/Portcullis Tooth/).isVisible().catch(() => false);
      if (!named) problems.push('lifeline probe: the lifeline block does not name the Portcullis Tooth');
      const averted = await dialog.getByText(/Slain by the Chosen One/i).isVisible().catch(() => false);
      if (!averted) problems.push('lifeline probe: the lifeline block does not name the averted ending');
      // The whole point: the run must NOT have ended.
      const endingLine = await dialog.getByText(/^The run ends/).isVisible().catch(() => false);
      if (endingLine) problems.push('lifeline probe: the resolution shows an ending line — the lifeline should have averted it');
      await page.screenshot({ path: 'qa/screenshots/probe-relics-lifeline.png', fullPage: true });
    }
  }
}

// ---- Issue #82: a double-edged relic's power prints on the card, pre-commit
// Rule 1 ("no undisclosed downside"): Tenure Ring is reachable only via
// `ascent_pale_academy_loan`'s named grant, and its power is a real cost (a
// capped standing band) that "Gain The Tenure Ring" alone would hide until
// after commit. Seed 18 at era 3 with 40 Pale Academy standing draws that
// exact offer first (found by walking `nextOffer` directly — see
// `scripts/_find-seed.mts` if this ever needs re-deriving after an offer
// pool change), so this checks the real card the player sees, not a
// synthetic one — `EffectList.test.tsx` already pins `describeEffect`'s own
// output; this proves the option card actually reaches the player with it.
{
  const loanRun = {
    ...seededRun,
    id: 'w-probe-double-edged',
    seed: 18,
    heldArtifactIds: [],
    phase: 'ascent',
    factionStanding: { ...seededRun.factionStanding, pale_academy: 40 },
    relicState: { firedOnce: [], spent: [], foresight: false, offerRedrawSalt: 0 },
    seenOfferIds: [],
  };
  await page.evaluate((run) => {
    localStorage.setItem('evil-wizard-sim:run', JSON.stringify({ version: 3, run }));
  }, loanRun);
  await page.reload({ waitUntil: 'networkidle' });
  await dismissChangelogPopup(page).catch(() => {});
  await page.getByRole('button', { name: /Resume run/i }).click();
  await page.waitForTimeout(400);
  const cardText = await page.locator('body').innerText().catch(() => '');
  if (!/Interlibrary Loan/.test(cardText)) {
    problems.push(`double-edged probe: expected the "Interlibrary Loan" offer at seed 18/era 3, screen shows something else`);
  } else if (!/Tenure Ring/.test(cardText)) {
    problems.push('double-edged probe: "Interlibrary Loan" is on screen but does not mention The Tenure Ring');
  } else if (!/held between/i.test(cardText)) {
    problems.push('double-edged probe: "Gain The Tenure Ring" is on screen without its power text');
  } else {
    console.log('  double-edged: The Tenure Ring grant card found and disclosed pre-commit');
  }
  await page.screenshot({ path: 'qa/screenshots/probe-relics-double-edged.png', fullPage: true });
}

await browser.close();

if (problems.length) {
  console.log(`\n  ✗ ${problems.length} problem(s):`);
  for (const p of problems) console.log(`      - ${p}`);
  process.exit(1);
}
console.log('\n  ✓ relic page probe clean\n');
