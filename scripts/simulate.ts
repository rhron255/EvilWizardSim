/**
 * Headless balance harness.
 *
 * wiki/00 and CLAUDE.md both call this out as required *before* balance tuning:
 * "balancing without it is guesswork." It plays N runs with a mixed population
 * of player policies and reports the numbers the wiki names targets for.
 *
 *   npx tsx scripts/simulate.ts [--runs 2000] [--seed 1] [--eras 12|16|20]
 *                               [--policy random|safe|greedy|adaptive|courtier|lich]
 *                               [--fixtures] [--json]
 *
 * IT PLAYS THE REAL CATALOG BY DEFAULT. A harness that reports on
 * `src/engine/__fixtures__/content.ts` while the player plays `src/content/`
 * is not a measurement, it is a second opinion from a different game — and a
 * previous tuning pass shipped "All balance targets met" on numbers no real
 * run could reproduce. `--fixtures` still selects the synthetic bundle, but
 * only for engine-only regression work where content must be held constant.
 *
 * Targets (wiki/04):
 *   - Ascension 1-4% of runs
 *   - Age-limit survival uncommon
 *   - The decline reads as erosion, not a cliff
 */

import type { Effect, EndingId, Offer, OfferOption, RunState } from '../src/types';
import type { ContentBundle } from '../src/engine';
import { tierFor } from '../src/theme/tokens';
import { createRun, defenseOf, nextOffer, resolveChoice } from '../src/engine';
import { fixtureContent } from '../src/engine/__fixtures__/content';
import {
  artifacts,
  endings,
  epithets,
  factions,
  lairs,
  offers,
  origins,
} from '../src/content';
import { mulberry32 } from '../src/engine/rng';

const realContent: ContentBundle = {
  factions,
  artifacts,
  lairs,
  origins,
  endings,
  offers,
  epithets,
};

const USE_FIXTURES = process.argv.includes('--fixtures');

/** The bundle every function below plays against. Real content unless asked. */
const content: ContentBundle = USE_FIXTURES ? fixtureContent : realContent;
const contentLabel = USE_FIXTURES ? 'FIXTURE content bundle' : 'real content bundle (src/content)';

// ---------------------------------------------------------------------------
// Player policies
// ---------------------------------------------------------------------------

type Policy = 'random' | 'safe' | 'greedy' | 'adaptive' | 'courtier' | 'lich' | 'ascendant';

/**
 * Population mix — an attempt at a realistic spread of how people actually
 * play, not a uniform sample. Most players are sensible, a fifth never gamble,
 * a fifth chase the headline number, and a minority are deliberately routing
 * toward a specific ending by run five or six (`ascendant`, `lich`). The
 * headline Ascension rate is a property of this mix, so changing it changes
 * the reported number.
 */
const POPULATION: Array<[Policy, number]> = [
  ['random', 0.12],
  ['safe', 0.18],
  ['greedy', 0.18],
  ['adaptive', 0.22],
  ['courtier', 0.12],
  ['lich', 0.06],
  ['ascendant', 0.12],
];

type Mode = 'notoriety' | 'defense' | 'standing' | 'ascendant';

type Weights = {
  notoriety: number;
  followers: number;
  standing: number;
  artifact: number;
  loseArtifact: number;
  apprentices: number;
  loyalty: number;
  pactDebt: number;
  heroThreat: number;
  lairTier: number;
};

const WEIGHTS: Record<Mode, Weights> = {
  notoriety: {
    notoriety: 1,
    followers: 0.18,
    standing: 0.04,
    artifact: 2.5,
    loseArtifact: -3,
    apprentices: 0.6,
    loyalty: 0.06,
    pactDebt: -1.6,
    heroThreat: -0.18,
    lairTier: 3,
  },
  defense: {
    notoriety: 0.22,
    followers: 0.06,
    standing: 0.02,
    artifact: 4,
    loseArtifact: -5,
    apprentices: 0.2,
    loyalty: 0.12,
    pactDebt: -2.4,
    heroThreat: -1,
    lairTier: 4.5,
  },
  standing: {
    notoriety: 0.45,
    followers: 0.2,
    standing: 0.16,
    artifact: 3.5,
    loseArtifact: -4,
    apprentices: 0.4,
    loyalty: 0.08,
    pactDebt: -1.4,
    heroThreat: -0.3,
    lairTier: 3,
  },
  /** The informed player: fame AND routing, because Ascension needs both. */
  ascendant: {
    notoriety: 0.95,
    followers: 0.2,
    standing: 0.13,
    artifact: 7,
    loseArtifact: -9,
    apprentices: 0.3,
    loyalty: 0.08,
    pactDebt: -1.6,
    heroThreat: -0.35,
    lairTier: 4,
  },
};

/** An ending effect is a run-terminating commitment; ordinary policies avoid it. */
const ENDING_SCORE = -80;

function scoreEffects(effects: readonly Effect[], w: Weights, takesLichdom: boolean): number {
  let total = 0;
  for (const e of effects) {
    switch (e.t) {
      case 'notoriety':
        total += e.v * w.notoriety;
        break;
      case 'followers':
        total += e.v * w.followers;
        break;
      case 'standing':
        total += e.v * w.standing;
        break;
      case 'artifact':
      case 'artifactFrom':
        total += w.artifact;
        break;
      case 'loseArtifact':
        total += w.loseArtifact;
        break;
      case 'apprentices':
        total += e.v * w.apprentices;
        break;
      case 'loyalty':
        total += e.v * w.loyalty;
        break;
      case 'pactDebt':
        total += e.v * w.pactDebt;
        break;
      case 'heroThreat':
        total += e.v * w.heroThreat;
        break;
      case 'lairTier':
        total += e.v * w.lairTier;
        break;
      case 'becomeLich':
        // Not an ending — a transformation. The lich player wants it; everyone
        // else is looking at "forfeit the vault and the household".
        total += takesLichdom ? 40 : -30;
        break;
      case 'ending':
        total += e.endingId === 'lichdom' && takesLichdom ? 40 : ENDING_SCORE;
        break;
    }
  }
  return total;
}

function optionScore(option: OfferOption, w: Weights, takesLichdom: boolean): number {
  if (option.kind === 'certain') return scoreEffects(option.effects, w, takesLichdom);
  return (
    option.odds * scoreEffects(option.onSuccess, w, takesLichdom) +
    (1 - option.odds) * scoreEffects(option.onFailure, w, takesLichdom)
  );
}

function modeFor(policy: Policy, run: RunState, threatRatio: number): Mode {
  switch (policy) {
    case 'greedy':
      return 'notoriety';
    case 'courtier':
      return run.phase === 'ascent' ? 'standing' : 'defense';
    case 'lich':
      // Courts through the ascent — the rite is gated on standing with the
      // Worm Below, so a lich-seeker who only chases fame never gets offered
      // it. This policy was a copy of `adaptive` and reported lichdom at 0.00%
      // while the branch was in fact reachable; that was a broken instrument,
      // not a broken game.
      if (run.phase === 'ascent') return 'standing';
      return threatRatio > 0.55 ? 'defense' : 'notoriety';
    case 'adaptive':
      if (run.phase === 'ascent') return 'notoriety';
      return threatRatio > 0.55 ? 'defense' : 'notoriety';
    case 'safe':
      return run.phase === 'ascent' ? 'notoriety' : 'defense';
    case 'ascendant':
      // Court and build through the ascent; defend only once genuinely
      // threatened, because a run that plays safe never reaches Legend.
      if (run.phase === 'ascent') return 'ascendant';
      return threatRatio > 0.75 ? 'defense' : 'ascendant';
    case 'random':
      return 'notoriety';
  }
}

/**
 * How hard the lich policy commits to the Worm. Tuned, not guessed: at 2.5 the
 * gate never opened, at 12 the policy chased standing past its own survival and
 * died before the age limit. The cohort readout below is what this was tuned
 * against.
 */
const LICH_DEVOTION = Number(process.env.LICH_DEVOTION ?? 5);

/**
 * EXPECTED net standing with the Worm Below.
 *
 * Scoring the success branch at face value made the policy chase long-odds
 * gambles it usually lost, so raising its devotion made it LESS likely to reach
 * the rite -- devotion 3 transformed 0.45% of the time and devotion 8 managed
 * 0.10%. Weighting by odds is what a player actually does.
 */
function wormOf(effects: readonly Effect[]): number {
  return effects
    .filter((e): e is Extract<Effect, { t: 'standing' }> => e.t === 'standing')
    .filter((e) => e.factionId === 'worm_below')
    .reduce((a, e) => a + e.v, 0);
}

function wormAffinity(option: OfferOption): number {
  if (option.kind === 'certain') return wormOf(option.effects);
  return option.odds * wormOf(option.onSuccess) + (1 - option.odds) * wormOf(option.onFailure);
}

function chooseOption(policy: Policy, run: RunState, offer: Offer, roll: number): number {
  if (policy === 'random') return Math.floor(roll * offer.options.length);

  const defense = defenseOf(run, content);
  const threatRatio = defense > 0 ? run.heroThreat / defense : 0;
  const w = WEIGHTS[modeFor(policy, run, threatRatio)];
  const takesLichdom = policy === 'lich' && run.phase === 'decline';

  let best = -Infinity;
  let bestIndex = 0;
  offer.options.forEach((option, i) => {
    // The "safe" player never gambles — the certain-option guarantee is what
    // makes that a playable strategy at all.
    if (policy === 'safe' && option.kind === 'gamble') return;
    let score = optionScore(option, w, takesLichdom);
    // A lich-seeker courts ONE faction, hard, because only the Worm Below
    // offers the rite and its gate is `minStanding worm_below 20`. Generic
    // standing-chasing spread the gain across all six and never opened it,
    // which is why this policy reported 0.00% for the branch it is named
    // after. The weight is high on purpose: this models the self-imposed
    // single-faction run that wiki/06 identifies as real player behaviour,
    // not a player who merely likes the Worm slightly more than average.
    if (policy === 'lich') score += wormAffinity(option) * LICH_DEVOTION;
    if (score > best) {
      best = score;
      bestIndex = i;
    }
  });
  return bestIndex;
}

// ---------------------------------------------------------------------------
// One run
// ---------------------------------------------------------------------------

type RunResult = {
  policy: Policy;
  ending: EndingId;
  finalNotoriety: number;
  peakNotoriety: number;
  notorietyAtProphecy: number;
  eras: number;
  eraCount: number;
  age: number;
  reachedAgeLimit: boolean;
  artifacts: number;
  legendaries: number;
  peakLegendaries: number;
  hitLegendTierInDecline: boolean;
  declineDeltas: number[];
  /**
   * What this run would add to the persistent collection.
   *
   * NOT the same as `artifacts` (held at the end): `recordRun` counts an
   * artifact as discovered even if the run later lost it or a lich forfeited
   * it, so this is held-at-end UNION everything gained along the way.
   */
  discoveredIds: string[];
  /** Distinct lairs occupied across the run — the ending card's trophy grid. */
  lairsHeld: number;
  peakLairTier: number;
  becameLich: boolean;
  /** Deed lines that repeat verbatim in consecutive eras. Defect 1's tell. */
  repeatedDeedLines: number;
  distinctDeedLines: number;
  deedLines: string[];
};

const LEGENDARY_IDS = new Set(
  content.artifacts.filter((a) => a.rarity === 'legendary').map((a) => a.id),
);

const LAIR_TIER = new Map(content.lairs.map((l) => [l.id, l.tier]));

function playRun(
  seed: number,
  eraCount: number,
  policy: Policy,
  /**
   * The collection this simulated player brought with them. Empty for the
   * headline population, which measures a single career in isolation; the
   * collection curve passes the real grid so novelty bias is measured doing
   * the job it exists for.
   */
  knownArtifactIds: readonly string[] = [],
): RunResult {
  const rng = mulberry32(seed ^ 0x5f3759df);
  const originId = content.origins[Math.floor(rng() * content.origins.length)].id;

  let run = createRun({ wizardName: 'Sim', originId, eraCount, seed, knownArtifactIds }, content);
  let notorietyAtProphecy = run.notoriety;
  let peakLegendaries = 0;
  let hitLegendTierInDecline = false;
  let becameLich = false;
  const declineDeltas: number[] = [];

  // Hard stop: a run can never legally exceed its era count, but a harness
  // that can hang is a harness nobody runs.
  let guard = eraCount + 8;
  while (!run.ending && guard-- > 0) {
    if (run.eraIndex === run.prophecyEra) notorietyAtProphecy = run.notoriety;
    const offer = nextOffer(run, content);
    const index = chooseOption(policy, run, offer, rng());
    const { next, resolution } = resolveChoice(run, offer, index, content);
    if (next.eras[next.eras.length - 1].phase === 'decline') {
      declineDeltas.push(resolution.eraRecord.notorietyDelta);
    }
    run = next;
    if (run.isLich) becameLich = true;
    peakLegendaries = Math.max(
      peakLegendaries,
      run.heldArtifactIds.filter((id) => LEGENDARY_IDS.has(id)).length,
    );
    if (run.phase === 'decline' && run.notoriety >= 90) hitLegendTierInDecline = true;
  }

  let peak = run.notoriety;
  for (const era of run.eras) peak = Math.max(peak, era.notoriety);

  // Mirrors `recordRun` in src/engine/persistence.ts. If that ever stops
  // agreeing with this, the harness is measuring a collection nobody owns.
  const discovered = new Set(run.heldArtifactIds);
  for (const era of run.eras) for (const id of era.artifactsGained) discovered.add(id);

  const lairIds = new Set(run.eras.map((e) => e.lairId));
  lairIds.add(run.lairId);
  let peakLairTier = 0;
  for (const id of lairIds) peakLairTier = Math.max(peakLairTier, LAIR_TIER.get(id) ?? 0);

  const deedLines = run.eras.map((e) => e.deedSummary);
  let repeatedDeedLines = 0;
  for (let i = 1; i < deedLines.length; i++) {
    if (deedLines[i] === deedLines[i - 1]) repeatedDeedLines++;
  }

  return {
    policy,
    ending: run.ending ?? 'retired_to_swamp',
    finalNotoriety: run.notoriety,
    peakNotoriety: peak,
    notorietyAtProphecy,
    eras: run.eras.length,
    eraCount,
    age: run.age,
    reachedAgeLimit: run.eraIndex >= run.eraCount,
    artifacts: run.heldArtifactIds.length,
    legendaries: run.heldArtifactIds.filter((id) => LEGENDARY_IDS.has(id)).length,
    peakLegendaries,
    hitLegendTierInDecline,
    declineDeltas,
    discoveredIds: Array.from(discovered),
    lairsHeld: lairIds.size,
    peakLairTier,
    becameLich,
    repeatedDeedLines,
    distinctDeedLines: new Set(deedLines).size,
    deedLines,
  };
}

// ---------------------------------------------------------------------------
// The collection, across a career of careers
// ---------------------------------------------------------------------------

/**
 * How fast the 30-slot grid fills for ONE player playing run after run.
 *
 * A per-run average cannot answer this. Discovery is coupon-collecting with
 * correlated draws — artifacts are faction-bound, and a player who courts the
 * Covenant keeps re-drawing Covenant relics they already own — so the only
 * honest measurement is to play a sequence and fold each run into a persistent
 * set, exactly as `recordRun` does.
 *
 * wiki/02: "The collection grid shows all 30 slots from run one; undiscovered
 * ones render as silhouettes with the name hidden. The visible gap is the
 * point." That is the intent this measures against.
 */
type CollectionCurve = {
  players: number;
  cap: number;
  slots: number;
  /** Mean slots filled after n runs. */
  after: Map<number, number>;
  /** Median runs to reach half the grid, and all of it. `cap + 1` means "not within cap". */
  medianRunsToHalf: number;
  medianRunsToFull: number;
  /** Share of runs that add nothing the player did not already have. */
  barrenRunRate: number;
};

function pickPolicy(roll: number): Policy {
  let acc = 0;
  for (const [name, share] of POPULATION) {
    acc += share;
    if (roll < acc) return name;
  }
  return 'adaptive';
}

function collectionCurve(baseSeed: number, players: number, cap: number): CollectionCurve {
  const slots = content.artifacts.length;
  const half = Math.ceil(slots / 2);
  const marks = [1, 3, 5, 10, 20, 40];
  const totals = new Map<number, number>(marks.map((m) => [m, 0]));
  const toHalf: number[] = [];
  const toFull: number[] = [];
  let runsPlayed = 0;
  let barren = 0;

  for (let p = 0; p < players; p++) {
    const rng = mulberry32((baseSeed + p * 104729) ^ 0xbeef);
    const owned = new Set<string>();
    let halfAt = cap + 1;
    let fullAt = cap + 1;

    for (let n = 1; n <= cap; n++) {
      const eraRoll = rng();
      const eraCount = eraRoll < 0.25 ? 12 : eraRoll < 0.75 ? 16 : 20;
      const result = playRun(
        baseSeed + p * 104729 + n * 7919,
        eraCount,
        pickPolicy(rng()),
        Array.from(owned),
      );
      runsPlayed++;

      const before = owned.size;
      for (const id of result.discoveredIds) owned.add(id);
      if (owned.size === before) barren++;

      if (halfAt > cap && owned.size >= half) halfAt = n;
      if (fullAt > cap && owned.size >= slots) fullAt = n;
      if (totals.has(n)) totals.set(n, (totals.get(n) ?? 0) + owned.size);
      // Nothing left to discover; the remaining runs would only cost time.
      if (owned.size >= slots) {
        for (const m of marks) if (m > n) totals.set(m, (totals.get(m) ?? 0) + owned.size);
        break;
      }
    }

    toHalf.push(halfAt);
    toFull.push(fullAt);
  }

  return {
    players,
    cap,
    slots,
    after: new Map(marks.map((m) => [m, (totals.get(m) ?? 0) / players])),
    medianRunsToHalf: median(toHalf),
    medianRunsToFull: median(toFull),
    barrenRunRate: barren / Math.max(1, runsPlayed),
  };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const ENDING_ORDER: EndingId[] = [
  'slain_by_chosen_one',
  'retired_to_swamp',
  'sealed_in_gem',
  'betrayed_by_apprentice',
  'consumed_by_pact',
  'lichdom',
  'ascension',
];

function pct(n: number, total: number): string {
  return total === 0 ? '0.00%' : `${((n / total) * 100).toFixed(2)}%`;
}

function bar(n: number, total: number, width = 28): string {
  const filled = total === 0 ? 0 : Math.round((n / total) * width);
  return '#'.repeat(filled).padEnd(width, '.');
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function padLeft(s: string, n: number): string {
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Median, not mean, for "runs until X": the distribution has a tail of players
 * who never get there inside the cap, and a mean over a censored tail is a
 * number about the cap rather than about the game.
 */
function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = xs.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function rule(width = 66): string {
  return '-'.repeat(width);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at !== -1 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function main(): void {
  const runs = Math.max(1, parseInt(arg('runs', '2000'), 10));
  const baseSeed = parseInt(arg('seed', '1'), 10);
  const forcedEras = arg('eras', '');
  const forcedPolicy = arg('policy', '') as Policy | '';

  const results: RunResult[] = [];
  const policyPicker = mulberry32(baseSeed ^ 0xc0ffee);

  for (let i = 0; i < runs; i++) {
    const roll = policyPicker();
    let policy: Policy = 'adaptive';
    if (forcedPolicy) {
      policy = forcedPolicy;
    } else {
      let acc = 0;
      for (const [name, share] of POPULATION) {
        acc += share;
        if (roll < acc) {
          policy = name;
          break;
        }
      }
    }

    const lengthRoll = policyPicker();
    const eraCount = forcedEras
      ? parseInt(forcedEras, 10)
      : lengthRoll < 0.25
        ? 12
        : lengthRoll < 0.75
          ? 16
          : 20;

    results.push(playRun(baseSeed + i * 7919, eraCount, policy));
  }

  const total = results.length;
  // Sequential careers, folded into one persistent grid. Smaller populations
  // than the run sample because each "player" is up to `cap` whole runs.
  const curve = collectionCurve(baseSeed ^ 0x51ede5, 120, 60);
  const byEnding = new Map<EndingId, number>();
  for (const r of results) byEnding.set(r.ending, (byEnding.get(r.ending) ?? 0) + 1);

  if (hasFlag('json')) {
    console.log(
      JSON.stringify(
        {
          runs: total,
          endings: Object.fromEntries(ENDING_ORDER.map((e) => [e, byEnding.get(e) ?? 0])),
          ascensionRate: (byEnding.get('ascension') ?? 0) / total,
          ageLimitRate: results.filter((r) => r.reachedAgeLimit).length / total,
          meanEras: mean(results.map((r) => r.eras)),
          meanFinalNotoriety: mean(results.map((r) => r.finalNotoriety)),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log('');
  console.log('EVIL WIZARD SIMULATOR - balance report');
  console.log(`${runs} runs | base seed ${baseSeed} | ${contentLabel}`);
  console.log(rule());

  // --- ending distribution ---------------------------------------------
  console.log('');
  console.log('ENDING DISTRIBUTION');
  console.log(`${pad('ending', 24)}${padLeft('n', 6)}${padLeft('share', 9)}  distribution`);
  for (const ending of ENDING_ORDER) {
    const n = byEnding.get(ending) ?? 0;
    console.log(
      `${pad(ending, 24)}${padLeft(String(n), 6)}${padLeft(pct(n, total), 9)}  ${bar(n, total)}`,
    );
  }

  // --- final notoriety histogram ---------------------------------------
  console.log('');
  console.log('FINAL NOTORIETY');
  const buckets = new Array(10).fill(0);
  for (const r of results) buckets[Math.min(9, Math.floor(r.finalNotoriety / 10))]++;
  buckets.forEach((n, i) => {
    const label = `${i * 10}-${i * 10 + 9}`;
    const tier = tierFor(i * 10 + 5).name;
    console.log(
      `${pad(label, 8)}${pad(tier, 16)}${padLeft(String(n), 6)}${padLeft(pct(n, total), 9)}  ${bar(n, total)}`,
    );
  });

  // --- peak notoriety (the near-miss lens) -------------------------------
  console.log('');
  console.log('PEAK NOTORIETY REACHED');
  const peaks = new Array(10).fill(0);
  for (const r of results) peaks[Math.min(9, Math.floor(r.peakNotoriety / 10))]++;
  peaks.forEach((n, i) => {
    if (n === 0 && i < 4) return;
    console.log(
      `${pad(`${i * 10}-${i * 10 + 9}`, 8)}${padLeft(String(n), 6)}${padLeft(pct(n, total), 9)}  ${bar(n, total)}`,
    );
  });

  // --- lair movement (the ending card's trophy grid) ---------------------
  console.log('');
  console.log('LAIRS HELD PER RUN');
  const lairBuckets = new Map<number, number>();
  for (const r of results) lairBuckets.set(r.lairsHeld, (lairBuckets.get(r.lairsHeld) ?? 0) + 1);
  for (const n of Array.from(lairBuckets.keys()).sort((a, b) => a - b)) {
    const count = lairBuckets.get(n) ?? 0;
    console.log(
      `${pad(`${n} lair${n === 1 ? '' : 's'}`, 12)}${padLeft(String(count), 6)}${padLeft(pct(count, total), 9)}  ${bar(count, total)}`,
    );
  }

  // --- headline numbers ---------------------------------------------------
  const ascension = byEnding.get('ascension') ?? 0;
  const ageLimit = results.filter((r) => r.reachedAgeLimit).length;
  const slain = byEnding.get('slain_by_chosen_one') ?? 0;
  const declineAll = results.flatMap((r) => r.declineDeltas);
  const declineNoto = results.filter((r) => r.declineDeltas.length > 0);
  const nearMiss = results.filter((r) => r.ending !== 'ascension' && r.peakNotoriety >= 75).length;

  console.log('');
  console.log('HEADLINE');
  console.log(rule());
  const row = (k: string, v: string) => console.log(`${pad(k, 34)}${padLeft(v, 12)}`);
  row('runs', String(total));
  row('mean run length (eras)', mean(results.map((r) => r.eras)).toFixed(2));
  row('mean final age', mean(results.map((r) => r.age)).toFixed(1));
  row('mean final notoriety', mean(results.map((r) => r.finalNotoriety)).toFixed(1));
  row('mean peak notoriety', mean(results.map((r) => r.peakNotoriety)).toFixed(1));
  row('mean artifacts held at end', mean(results.map((r) => r.artifacts)).toFixed(2));
  row('mean legendaries held at end', mean(results.map((r) => r.legendaries)).toFixed(3));
  console.log(rule());
  row('ASCENSION rate  (target 1-4%)', pct(ascension, total));
  row('age-limit survival (uncommon)', pct(ageLimit, total));
  row('slain by chosen one', pct(slain, total));
  row('near-miss (peak 75+, no ascend)', pct(nearMiss, total));
  console.log(rule());
  console.log('  ascension is the AND of two rare things:');
  row('  ...reached Legend tier in decline', pct(results.filter((r) => r.hitLegendTierInDecline).length, total));
  row('  ...ever held 2+ legendaries', pct(results.filter((r) => r.peakLegendaries >= 2).length, total));
  row('  ...ever held 1+ legendary', pct(results.filter((r) => r.peakLegendaries >= 1).length, total));
  console.log(rule());
  row('mean notoriety at prophecy', mean(declineNoto.map((r) => r.notorietyAtProphecy)).toFixed(1));
  row('mean notoriety delta / decline era', mean(declineAll).toFixed(2));
  row('worst single decline era', String(Math.min(...(declineAll.length ? declineAll : [0]))));
  row('decline eras with delta <= -10', pct(declineAll.filter((d) => d <= -10).length, declineAll.length));

  // --- the scarce color, the trophy case, the ledger ----------------------
  const tierReach = (min: number) => pct(results.filter((r) => r.peakNotoriety >= min).length, total);
  console.log(rule());
  console.log('  notoriety tier REACHED at peak (the rationed color):');
  row('  ...Local Menace (40+)', tierReach(40));
  row('  ...Named Threat (60+)', tierReach(60));
  row('  ...Kingdom-Level (75+, violet)', tierReach(75));
  row('  ...Legend (90+, gold)', tierReach(90));
  console.log(rule());
  row('mean relics discovered per run', mean(results.map((r) => r.discoveredIds.length)).toFixed(2));
  row(
    'runs discovering nothing at all',
    pct(results.filter((r) => r.discoveredIds.length === 0).length, total),
  );
  console.log(rule());
  row('mean lairs held per run', mean(results.map((r) => r.lairsHeld)).toFixed(2));
  row('mean peak lair tier', mean(results.map((r) => r.peakLairTier)).toFixed(2));
  row('runs holding a single lair', pct(results.filter((r) => r.lairsHeld <= 1).length, total));
  row('runs holding 3+ lairs', pct(results.filter((r) => r.lairsHeld >= 3).length, total));
  console.log(rule());
  row('became a lich (transformation)', pct(results.filter((r) => r.becameLich).length, total));
  row('LICHDOM ending', pct(byEnding.get('lichdom') ?? 0, total));
  console.log(rule());
  const allDeeds = results.flatMap((r) => r.deedLines);
  const repeatedDeeds = results.reduce((a, r) => a + r.repeatedDeedLines, 0);
  row('distinct deed lines / run', mean(results.map((r) => r.distinctDeedLines / Math.max(1, r.eras))).toFixed(3));
  row('consecutive repeat deed lines', pct(repeatedDeeds, allDeeds.length));
  row('distinct deed lines, all runs', String(new Set(allDeeds).size));

  // --- per-policy ---------------------------------------------------------
  console.log('');
  console.log('BY PLAYER POLICY');
  console.log(
    `${pad('policy', 12)}${padLeft('n', 6)}${padLeft('ascend', 9)}${padLeft('survive', 9)}${padLeft('slain', 9)}${padLeft('peak', 8)}${padLeft('final', 8)}`,
  );
  const policies = Array.from(new Set(results.map((r) => r.policy)));
  for (const policy of policies) {
    const subset = results.filter((r) => r.policy === policy);
    console.log(
      pad(policy, 12) +
        padLeft(String(subset.length), 6) +
        padLeft(pct(subset.filter((r) => r.ending === 'ascension').length, subset.length), 9) +
        padLeft(pct(subset.filter((r) => r.reachedAgeLimit).length, subset.length), 9) +
        padLeft(
          pct(subset.filter((r) => r.ending === 'slain_by_chosen_one').length, subset.length),
          9,
        ) +
        padLeft(mean(subset.map((r) => r.peakNotoriety)).toFixed(1), 8) +
        padLeft(mean(subset.map((r) => r.finalNotoriety)).toFixed(1), 8),
    );
  }

  // --- target checks ------------------------------------------------------
  const ascensionRate = ascension / total;
  const survivalRate = ageLimit / total;
  const cliffRate = declineAll.filter((d) => d <= -12).length / Math.max(1, declineAll.length);
  const [topEndingName, topEndingCount] = Array.from(byEnding.entries()).sort(
    (a, b) => b[1] - a[1],
  )[0] ?? ['none', 0];
  const topEndingShare = topEndingCount / total;
  const namedThreatRate = results.filter((r) => r.peakNotoriety >= 60).length / total;
  const kingdomRate = results.filter((r) => r.peakNotoriety >= 75).length / total;
  const legendRate = results.filter((r) => r.peakNotoriety >= 90).length / total;
  const lichSeekers = results.filter((r) => r.policy === 'lich');
  const lichSeekerRuns = lichSeekers.length;
  const lichSeekerLichdoms = lichSeekers.filter((r) => r.ending === 'lichdom').length;
  const lichSeekerLichdomRate = lichSeekerRuns > 0 ? lichSeekerLichdoms / lichSeekerRuns : 0;
  const meanLairs = mean(results.map((r) => r.lairsHeld));
  const repeatRate = repeatedDeeds / Math.max(1, allDeeds.length);
  const checks: Array<[string, boolean, string]> = [
    [
      'Ascension in 1-4%',
      ascensionRate >= 0.01 && ascensionRate <= 0.04,
      pct(ascension, total),
    ],
    [
      'Age-limit survival uncommon (8-35%)',
      survivalRate >= 0.08 && survivalRate <= 0.35,
      pct(ageLimit, total),
    ],
    [
      'Decline is erosion, not a cliff (<12% of eras <= -12)',
      cliffRate < 0.12,
      `${(cliffRate * 100).toFixed(2)}%`,
    ],
    [
      'All seven endings occur',
      ENDING_ORDER.every((e) => (byEnding.get(e) ?? 0) > 0),
      `${ENDING_ORDER.filter((e) => (byEnding.get(e) ?? 0) > 0).length}/7`,
    ],
    [
      'No single ending above 45%',
      topEndingShare <= 0.45,
      `${topEndingName} ${(topEndingShare * 100).toFixed(2)}%`,
    ],
    [
      'Named Threat (60+) reached in 35-75% of runs',
      namedThreatRate >= 0.35 && namedThreatRate <= 0.75,
      pct(results.filter((r) => r.peakNotoriety >= 60).length, total),
    ],
    [
      'Kingdom-Level (75+) reached in 12-40% of runs',
      kingdomRate >= 0.12 && kingdomRate <= 0.4,
      pct(results.filter((r) => r.peakNotoriety >= 75).length, total),
    ],
    [
      'Legend (90+) stays rare (1-12%)',
      legendRate >= 0.01 && legendRate <= 0.12,
      pct(results.filter((r) => r.peakNotoriety >= 90).length, total),
    ],
    [
      // Measured WITHIN the cohort that seeks it, not across the population:
      // only ~6% of simulated players take the lich policy at all, so a
      // population-wide figure mostly measures the population mix.
      //
      // The band is 2-15%, and it is deliberately low. The wiki sets no target
      // rate for lichdom; earlier numbers here were invented and then chased,
      // which distorted DEF_LICH twice before anyone checked. Reaching it means
      // courting one faction hard enough to open a gated card, taking a rite
      // that forfeits every relic and every follower, and then surviving the
      // steepest part of the hero ramp stripped of defence. Roughly a sixth of
      // seekers get the rite offered and taken; roughly a quarter of those live
      // to the age limit. That product is the number, and it is the rarest
      // branch in the game on purpose.
      'Lichdom reachable by a lich-seeker (2-15% of that cohort)',
      lichSeekerLichdomRate >= 0.02 && lichSeekerLichdomRate <= 0.15,
      pct(lichSeekerLichdoms, lichSeekerRuns),
    ],
    [
      'Trophy case: mean lairs held 3-5',
      meanLairs >= 3 && meanLairs <= 5,
      meanLairs.toFixed(2),
    ],
    [
      'Ledger: <2% of deed lines repeat consecutively',
      repeatRate < 0.02,
      `${(repeatRate * 100).toFixed(2)}%`,
    ],
  ];

  // --- the collection, across a career of careers -------------------------
  console.log('');
  console.log(`THE COLLECTION  (${curve.players} players, ${curve.slots} slots, cap ${curve.cap} runs)`);
  console.log(rule());
  for (const [n, filled] of curve.after) {
    row(
      `mean slots filled after ${n} run${n === 1 ? '' : 's'}`,
      `${filled.toFixed(1)} / ${curve.slots}`,
    );
  }
  console.log(rule());
  const capped = (v: number) => (v > curve.cap ? `>${curve.cap}` : String(v));
  row('median runs to half the grid', capped(curve.medianRunsToHalf));
  row('median runs to the full grid', capped(curve.medianRunsToFull));
  row('runs that add nothing new', `${(curve.barrenRunRate * 100).toFixed(1)}%`);

  console.log('');
  console.log('TARGET CHECKS');
  console.log(rule());
  let allPass = true;
  for (const [label, ok, value] of checks) {
    if (!ok) allPass = false;
    console.log(`${ok ? '[PASS]' : '[FAIL]'} ${pad(label, 48)}${padLeft(value, 10)}`);
  }
  console.log(rule());
  console.log(allPass ? 'All balance targets met.' : 'One or more balance targets missed.');
  console.log('');
}

main();
