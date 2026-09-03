/**
 * Headless balance harness.
 *
 * wiki/00 and CLAUDE.md both call this out as required *before* balance tuning:
 * "balancing without it is guesswork." It plays N runs with a mixed population
 * of player policies and reports the numbers the wiki names targets for.
 *
 *   npx tsx scripts/simulate.ts [--runs 2000] [--seed 1] [--eras <RUN_LENGTHS>]
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

import type {
  Effect,
  EndingId,
  FactionId,
  Offer,
  OfferOption,
  RunState,
  TierId,
} from '../src/types';
import type { ContentBundle } from '../src/engine';
import { TIERS, tierFor } from '../src/theme/tokens';
import { ascensionReady, createRun, defenseOf, nextOffer, resolveChoice } from '../src/engine';
import {
  ASCENSION_LEGENDARIES,
  ASCENSION_MIN_NOTORIETY,
  CONTAGION_GAIN,
  CONTAGION_LOSS,
  PACT_LIMIT,
  RUN_LENGTHS,
  SEAL_MAX_STANDING,
  SEAL_MIN_NOTORIETY,
} from '../src/engine/constants';
import { REPRISAL_BY_FACTION } from '../src/engine/endings';
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

/**
 * The five factions a simulated player deliberately antagonises.
 *
 * Not the Academy: its reprisal is the one that has always been reachable by
 * ordinary play (15-18% of runs, through contagion nobody aimed), so a cohort
 * for it would measure a policy rather than the game. The other five needed
 * one — every existing policy either courts a faction or ignores it, and none
 * drives one to −55 on purpose, so all five reprisals read 0.00% in a
 * population that has never met a player who wanted them.
 */
const PARIAH_TARGETS = [
  'ashen_covenant',
  'gilded_hand',
  'verdant_choir',
  'crownlands',
  'worm_below',
] as const satisfies readonly FactionId[];

type PariahTarget = (typeof PARIAH_TARGETS)[number];
type PariahPolicy = `pariah_${PariahTarget}`;

/** A type predicate, so the exhaustive `switch` in `modeFor` stays exhaustive. */
function isPariah(policy: Policy): policy is PariahPolicy {
  return policy.startsWith('pariah_');
}

function pariahTarget(policy: PariahPolicy): PariahTarget {
  return policy.slice('pariah_'.length) as PariahTarget;
}

type Policy =
  | 'random'
  | 'safe'
  | 'greedy'
  | 'adaptive'
  | 'courtier'
  | 'lich'
  | 'ascendant'
  | 'reckless'
  | PariahPolicy;

/**
 * Population mix — an attempt at a realistic spread of how people actually
 * play, not a uniform sample. Most players are sensible, a fifth never gamble,
 * a fifth chase the headline number, and a minority are deliberately routing
 * toward a specific ending by run five or six (`ascendant`, `lich`). The
 * headline Ascension rate is a property of this mix, so changing it changes
 * the reported number.
 *
 * `reckless` was added when pact debt stopped ticking upward on its own. Every
 * other policy prices debt through a convex potential and therefore never
 * accepts a card that reaches `PACT_LIMIT` — which is correct play, and left
 * `consumed_by_pact` at 1.20% while a player who simply keeps saying yes hits
 * 9.67%. A population made entirely of optimisers cannot measure an ending
 * that exists to punish not paying attention.
 *
 * THE `pariah_*` COHORTS ARE DELIBERATELY NOT IN THIS MIX. They were, at 2%
 * each, and that was a mistake of exactly the kind this file keeps a list of:
 * a tenth of the sample handed to players who spend a career making one enemy
 * and therefore almost never ascend, which lowered the headline Ascension rate
 * by a tenth before the mechanic under test did anything at all. The rates in
 * this report are compared against `qa/baseline-endings.json`, and a diff is
 * only attributable to the change under test if the POPULATION is the same
 * population — so it is the same eight policies, at the same shares, as the
 * baseline was recorded with.
 *
 * Reachability for the cohort-shaped endings is measured by `reprisalProbe`
 * instead, on its own sample, which is where a question about one kind of
 * player belongs.
 */
const POPULATION: Array<[Policy, number]> = [
  ['random', 0.12],
  ['safe', 0.16],
  ['greedy', 0.14],
  ['adaptive', 0.2],
  ['courtier', 0.11],
  ['lich', 0.06],
  ['ascendant', 0.11],
  ['reckless', 0.1],
];

type Mode = 'notoriety' | 'defense' | 'standing' | 'ascendant' | 'reckless';

type Weights = {
  notoriety: number;
  followers: number;
  standing: number;
  artifact: number;
  loseArtifact: number;
  apprentices: number;
  loyalty: number;
  pactDebt: number;
  /**
   * Whether this player watches the ceiling.
   *
   * `true` — debt is priced through `pactPotential`, so the last point costs
   * far more than the first and a card that would reach `PACT_LIMIT` is scored
   * as the ending it is. This is correct play and describes most of the
   * population.
   *
   * `false` — debt is a flat linear cost and the ceiling is not modelled at
   * all. Not a worse bot: a DIFFERENT one, and the one the pact ending is
   * written for. The player in the original bug report — "I died being consumed
   * by the pact, even though the last action I took had nothing to do with
   * pacts" — was not tracking a denominator either.
   */
  pactCeilingAware: boolean;
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
    pactCeilingAware: true,
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
    pactCeilingAware: true,
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
    pactCeilingAware: true,
    heroThreat: -0.3,
    lairTier: 3,
  },
  /**
   * The player who is not counting.
   *
   * Fame-hungry like `notoriety`, and debt is merely a mild running cost — no
   * ceiling term, no death score at the crossing. Deliberately NOT a copy of
   * another mode's numbers: `lich` was a copy of `adaptive` and reported 0.00%
   * for the branch it is named after, which is the failure this comment exists
   * to prevent a second time.
   */
  reckless: {
    notoriety: 1.15,
    followers: 0.22,
    standing: 0.05,
    artifact: 2.2,
    loseArtifact: -2.5,
    apprentices: 0.7,
    loyalty: 0.04,
    pactDebt: -0.5,
    pactCeilingAware: false,
    heroThreat: -0.12,
    lairTier: 3.2,
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
    pactCeilingAware: true,
    heroThreat: -0.35,
    lairTier: 4,
  },
};

/** An ending effect is a run-terminating commitment; ordinary policies avoid it. */
const ENDING_SCORE = -80;

/**
 * How much worse the LAST point of debt is than the first.
 *
 * Debt used to be priced linearly — `e.v * w.pactDebt`, the same charge at 6/7
 * as at 0/7 — which was tolerable while an automatic interest tick was doing
 * most of the killing. It is not tolerable now. `consumed_by_pact` is reached
 * ONLY through cards a player accepted, so these policies ARE the mechanism
 * under test, and a bot that prices its seventh point of debt like its first
 * walks into a wall no human walks into. Measuring that population would be
 * CLAUDE.md failure mode 5 for the fourth time: a harness confidently
 * reporting a rate for a game nobody plays.
 *
 * So debt is scored through a convex potential rather than a linear one, and
 * the cost of a card is the DIFFERENCE in potential it moves you across:
 *
 *   potential(d) = d + PACT_DREAD * d² / PACT_LIMIT
 *
 * At `PACT_DREAD = 2` the step from 5 to 6 costs about 3.2x the step from 0 to
 * 1, and paying debt down from a deep hole is worth proportionally more —
 * which is what makes an exit card something a policy will actually take.
 */
const PACT_DREAD = 2;

const pactPotential = (debt: number) => debt + (PACT_DREAD * debt * debt) / PACT_LIMIT;

/**
 * The price of moving debt from `from` to `to`.
 *
 * Reaching the ceiling is not expensive, it is the ending — scored as one,
 * because that is exactly what the engine will do with it.
 */
function pactCost(from: number, to: number, w: Weights): number {
  // The player who is not counting prices a point of debt as a point of debt,
  // wherever the balance stands. That is the whole difference.
  if (!w.pactCeilingAware) return w.pactDebt * (to - Math.max(0, from));
  if (to >= PACT_LIMIT) return ENDING_SCORE;
  return w.pactDebt * (pactPotential(to) - pactPotential(Math.max(0, from)));
}

/**
 * `debt` is the run's CURRENT pact debt, so the same card is priced
 * differently by a wizard who owes nothing and one who owes six.
 */
function scoreEffects(
  effects: readonly Effect[],
  w: Weights,
  takesLichdom: boolean,
  debt: number,
): number {
  let total = 0;
  // Debt accumulates WITHIN a branch: a card that adds 2 and then 2 again has
  // to be priced as the move from d to d+4, not as two independent steps from
  // d. The engine's floor clamp is mirrored here for the same reason.
  let running = debt;
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
      case 'pactDebt': {
        const next = Math.max(0, running + e.v);
        total += pactCost(running, next, w);
        running = next;
        break;
      }
      case 'heroThreat':
        total += e.v * w.heroThreat;
        break;
      case 'lairTier':
        total += e.v * w.lairTier;
        break;
      case 'becomeLich':
        // Not an ending — a transformation. The lich player wants it; everyone
        // else is looking at "forfeit the vault and the household".
        //
        // This is a flat price for a variable cost, which is a known
        // simplification: a wizard holding four relics forfeits more than one
        // holding none. Pricing it against the actual holdings was tried and
        // is WORSE — the card's own `+12 Notoriety` is already scored above,
        // so any additional "what the rite buys" term double-counts, and a
        // wizard with an empty vault ends up being paid to take it (43% of
        // runs became liches, and Legend and lair targets both broke). Leave
        // it flat unless you are prepared to re-derive the whole player model.
        total += takesLichdom ? 40 : -30;
        break;
      case 'ending':
        total += e.endingId === 'lichdom' && takesLichdom ? 40 : ENDING_SCORE;
        break;
    }
  }
  return total;
}

function optionScore(
  option: OfferOption,
  w: Weights,
  takesLichdom: boolean,
  debt: number,
): number {
  if (option.kind === 'certain') return scoreEffects(option.effects, w, takesLichdom, debt);
  // Both branches are priced from the SAME starting debt, which is what makes
  // a two-way gamble legible to a policy: at 5/7 the failure branch crosses
  // the ceiling and is scored as the ending it is, so the expected value
  // collapses exactly where a player would feel it collapse.
  return (
    option.odds * scoreEffects(option.onSuccess, w, takesLichdom, debt) +
    (1 - option.odds) * scoreEffects(option.onFailure, w, takesLichdom, debt)
  );
}

function modeFor(policy: Policy, run: RunState, threatRatio: number): Mode {
  // A pariah still has to LIVE to the decline and be famous enough to be worth
  // acting on — the reprisal needs notoriety ≥ SEAL_MIN_NOTORIETY and, for
  // five of the six factions, the decline phase. So the base play is
  // `adaptive`; the spite rides on top of it rather than replacing it.
  if (isPariah(policy)) {
    if (run.phase === 'ascent') return 'notoriety';
    return threatRatio > 0.55 ? 'defense' : 'notoriety';
  }
  switch (policy) {
    case 'reckless':
      return 'reckless';
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
function standingOf(effects: readonly Effect[], factionId: FactionId): number {
  return effects
    .filter((e): e is Extract<Effect, { t: 'standing' }> => e.t === 'standing')
    .filter((e) => e.factionId === factionId)
    .reduce((a, e) => a + e.v, 0);
}

/** Odds-weighted, for the same reason `wormOf` is. */
function evOf(option: OfferOption, of: (effects: readonly Effect[]) => number): number {
  if (option.kind === 'certain') return of(option.effects);
  return option.odds * of(option.onSuccess) + (1 - option.odds) * of(option.onFailure);
}

function wormAffinity(option: OfferOption): number {
  return evOf(option, (fx) => standingOf(fx, 'worm_below'));
}

/**
 * Who is hostile to whom, read from content rather than restated.
 *
 * A pariah needs both routes down, because the direct one is not enough on its
 * own: cards offering a large negative on one named faction are rare, while
 * cards offering a large POSITIVE to that faction's enemy are everywhere, and
 * `applyStanding` spills `CONTAGION_GAIN` of every gain onto the enemies of
 * whoever gained. Courting the Covenant is how most players reach the gem
 * without ever choosing to; it is also how a pariah gets there on purpose.
 */
const HOSTILE_TOWARD = new Map<FactionId, FactionId[]>(
  content.factions.map((f) => [
    f.id,
    content.factions.filter((g) => g.hostileTo.includes(f.id)).map((g) => g.id),
  ]),
);

/**
 * EXPECTED standing damage to one faction — the sign-flipped mirror of
 * `wormAffinity`, with the contagion route added.
 *
 * A gain for a faction hostile to the target costs the target
 * `CONTAGION_GAIN` of it; a LOSS for that faction hands the target
 * `CONTAGION_LOSS` back. Both rates come from `constants.ts`, so a change to
 * the contagion model moves the policy with it instead of leaving a bot
 * playing the old game.
 */
function spiteOf(effects: readonly Effect[], target: FactionId): number {
  let total = -standingOf(effects, target);
  for (const enemy of HOSTILE_TOWARD.get(target) ?? []) {
    const v = standingOf(effects, enemy);
    total += v * (v > 0 ? CONTAGION_GAIN : CONTAGION_LOSS);
  }
  return total;
}

/**
 * What the damage is WORTH, given where the target already stands.
 *
 * Priced through a remaining-distance potential for the same reason pact debt
 * is priced through a convex one: a flat per-point value describes a bot, not a
 * player. Two things fall out of it, and both were bugs before it existed.
 *
 * Damage past `SEAL_MAX_STANDING` is worth nothing, so a pariah whose enemy is
 * already deep enough stops feuding and spends the rest of the career doing
 * what the OTHER half of the trigger needs — getting famous. Without that the
 * cohort drove its target under the line in 16% of runs and converted 19% of
 * those, because it was still picking spite over fame at 30 Notoriety with
 * three eras left, in a game that will not act on an obscure wizard.
 *
 * And a card that would overshoot is priced only for the part that counts, so
 * the policy prefers the cheap route to the line over the spectacular one.
 */
function spiteAffinity(option: OfferOption, target: FactionId, standing: number): number {
  const remaining = Math.max(0, standing - SEAL_MAX_STANDING);
  if (remaining === 0) return 0;
  const damage = evOf(option, (fx) => spiteOf(fx, target));
  return Math.min(damage, remaining);
}

/**
 * How hard a pariah commits to being hated. Tuned the way `LICH_DEVOTION` was:
 * the cohort readout below is what it was fitted against, not a guess.
 */
const PARIAH_SPITE = Number(process.env.PARIAH_SPITE ?? 5);

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
    let score = optionScore(option, w, takesLichdom, run.pactDebt);
    // A lich-seeker courts ONE faction, hard, because only the Worm Below
    // offers the rite and its gate is `minStanding worm_below 20`. Generic
    // standing-chasing spread the gain across all six and never opened it,
    // which is why this policy reported 0.00% for the branch it is named
    // after. The weight is high on purpose: this models the self-imposed
    // single-faction run that wiki/06 identifies as real player behaviour,
    // not a player who merely likes the Worm slightly more than average.
    if (policy === 'lich') score += wormAffinity(option) * LICH_DEVOTION;
    // The mirror of the line above: one faction, hard, in the other direction.
    if (isPariah(policy)) {
      const target = pariahTarget(policy);
      score += spiteAffinity(option, target, run.factionStanding[target] ?? 0) * PARIAH_SPITE;
    }
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
  /**
   * Pact debt diagnostics.
   *
   * `consumed_by_pact` is now reached only through cards the player accepted,
   * so its rate is downstream of a chain the old harness measured no part of:
   * did the wizard ever take debt at all, how deep did it get, and how many
   * eras separated the first point from the end. A rate alone cannot tell
   * "nobody signs anything" apart from "everybody signs and nobody crosses",
   * and those two want opposite fixes.
   */
  peakPactDebt: number;
  everInDebt: boolean;
  erasCarryingDebt: number;
  artifacts: number;
  legendaries: number;
  peakLegendaries: number;
  /**
   * Ascension's two conjuncts, measured against `ASCENSION_MIN_NOTORIETY` and
   * `ASCENSION_LEGENDARIES` — never against a literal.
   *
   * The harness previously hard-coded `notoriety >= 90` and reported it as
   * "reached Legend tier in decline" while the engine gated on 84, and printed
   * "2+ legendaries" as the binding conjunct while `ASCENSION_LEGENDARIES` was
   * 1. Both conjuncts are upper bounds on the ascension rate by construction,
   * so printing 0.05% above a 2.20% headline was arithmetically impossible —
   * that impossibility is the only reason it was caught. `everAscensionReady`
   * exists so the impossibility is now a target check rather than a thing a
   * reader has to notice.
   */
  metNotorietyConjunct: boolean;
  metLegendaryConjunct: boolean;
  /** The engine's own `ascensionReady`, sampled at every era boundary. */
  everAscensionReady: boolean;
  declineDeltas: number[];
  /**
   * What this run would add to the persistent collection.
   *
   * NOT the same as `artifacts` (held at the end): `recordRun` counts an
   * artifact as discovered even if the run later lost it or a lich forfeited
   * it, so this is held-at-end UNION everything gained along the way.
   */
  discoveredIds: string[];
  /**
   * The lowest each faction's standing ever went.
   *
   * A reprisal rate on its own cannot tell "the cohort never got anyone angry
   * enough" apart from "it did, and something else ended the run first", and
   * those two want opposite fixes — the same reason the pact ladder is printed
   * as a chain rather than a rate.
   */
  /**
   * The feud ladder, per run: which grievance cards this career was shown, and
   * which rungs it actually took.
   *
   * Per-CARD rather than a count, because the counts were misleading in the
   * exact way CLAUDE.md warns about — a pariah takes grievance cards aimed at
   * other factions too (declining one costs its proposer standing), so a bare
   * "grievances taken" number said the ladder was being climbed when it was
   * not.
   */
  grievancesSeen: string[];
  grievancesTaken: string[];
  minStanding: Record<FactionId, number>;
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
  let peakPactDebt = run.pactDebt;
  let erasCarryingDebt = 0;
  let metNotorietyConjunct = false;
  let metLegendaryConjunct = false;
  let everAscensionReady = false;
  let becameLich = false;
  const declineDeltas: number[] = [];
  const minStanding = { ...run.factionStanding };

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
    // Ascension's conjuncts, read off the same state `checkEndings` saw, with
    // the same thresholds it used. `ascensionReady` is called rather than
    // reimplemented: it also carries the `isLich` and phase gates, and a
    // hand-copy of it is exactly the drift that produced the old readout.
    if (run.phase === 'decline' && run.notoriety >= ASCENSION_MIN_NOTORIETY) {
      metNotorietyConjunct = true;
    }
    if (run.heldArtifactIds.filter((id) => LEGENDARY_IDS.has(id)).length >= ASCENSION_LEGENDARIES) {
      metLegendaryConjunct = true;
    }
    if (ascensionReady(run, content)) everAscensionReady = true;
    peakPactDebt = Math.max(peakPactDebt, run.pactDebt);
    if (run.pactDebt > 0) erasCarryingDebt++;
    for (const [id, v] of Object.entries(run.factionStanding) as [FactionId, number][]) {
      if (v < minStanding[id]) minStanding[id] = v;
    }
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
    // Mirrors the age-limit branch of `checkEndings` (endings.ts). It reads
    // two state fields rather than restating a threshold, so there is no
    // constant to import — but it IS a copy of an engine rule, so if that
    // branch ever changes shape this line has to move with it.
    peakPactDebt,
    everInDebt: peakPactDebt > 0,
    erasCarryingDebt,
    reachedAgeLimit: run.eraIndex >= run.eraCount,
    artifacts: run.heldArtifactIds.length,
    legendaries: run.heldArtifactIds.filter((id) => LEGENDARY_IDS.has(id)).length,
    peakLegendaries,
    metNotorietyConjunct,
    metLegendaryConjunct,
    everAscensionReady,
    declineDeltas,
    discoveredIds: Array.from(discovered),
    grievancesSeen: run.seenOfferIds.filter((id) => id.startsWith('grievance_')),
    grievancesTaken: run.eras
      .filter((e) => {
        if (!e.offerId.startsWith('grievance_')) return false;
        // The first option is always the act; the second is walking away.
        const offer = content.offers.find((o) => o.id === e.offerId);
        return offer?.options[0].label === e.optionLabel;
      })
      .map((e) => e.offerId),
    minStanding,
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

/**
 * Brief / Standard / Long, from `RUN_LENGTHS` — the harness does not keep its
 * own copy of the three lengths. The 25/50/25 SPLIT is a harness modelling
 * choice (most people take the default), not an engine constant; the wiki sets
 * no distribution over run lengths.
 */
const ERA_LENGTH_WEIGHTS = [0.25, 0.5, 0.25] as const;

function pickEraCount(roll: number): number {
  let acc = 0;
  for (let i = 0; i < RUN_LENGTHS.length; i++) {
    acc += ERA_LENGTH_WEIGHTS[i] ?? 0;
    if (roll < acc) return RUN_LENGTHS[i];
  }
  return RUN_LENGTHS[RUN_LENGTHS.length - 1];
}

/**
 * Reachability, measured on a sample big enough to mean something.
 *
 * The pariah cohorts inside the population are ~40 runs each, where one career
 * either way moves the rate by two and a half points — so a floor checked
 * against them would be checking noise. Rule 6 is not a rate target, it is
 * "every ending must be reachable", and the honest way to answer it is to play
 * a proper sample of the player who wants each one.
 *
 * Deliberately separate from the headline population: these runs are NOT mixed
 * into the distribution above, because a population made of people all chasing
 * the same rare ending is not a population (CLAUDE.md failure mode 5).
 */
const PROBE_RUNS = 200;

function reprisalProbe(baseSeed: number): Map<FactionId, RunResult[]> {
  const out = new Map<FactionId, RunResult[]>();
  for (const faction of PARIAH_TARGETS) {
    const rng = mulberry32((baseSeed ^ 0x9e3779b9) + faction.length);
    const runs: RunResult[] = [];
    for (let i = 0; i < PROBE_RUNS; i++) {
      runs.push(playRun(baseSeed + 104_729 + i * 7919, pickEraCount(rng()), `pariah_${faction}`));
    }
    out.set(faction, runs);
  }
  return out;
}

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
      const eraCount = pickEraCount(rng());
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

/**
 * Display order only — narrative, not a source of truth about WHICH endings
 * exist. `ALL_ENDING_IDS` is the content bundle's own list, so an ending added
 * to `src/content/endings.ts` is measured for reachability the same day it is
 * authored rather than the day someone remembers to retype it here. Rule 6
 * ("every ending must be reachable") is only enforceable against a list the
 * harness cannot forget to update.
 */
const ENDING_ORDER: EndingId[] = [
  'slain_by_chosen_one',
  'retired_to_swamp',
  'sealed_in_gem',
  'betrayed_by_apprentice',
  'consumed_by_pact',
  'lichdom',
  'ascension',
  // The five reprisals that joined the seal, in faction order.
  'eternally_repurposed',
  'liquidated',
  'turned_to_fertilizer',
  'exiled_and_overrun',
  'consumed',
  // The five faction leadership endings, in the same faction order. `lichdom`
  // is the Worm Below's and is already listed above, among the original seven.
  'contract_writer',
  'grand_arbiter',
  'archmage',
  'archdruid',
  'overthrown_the_kingdom',
];

const ALL_ENDING_IDS: EndingId[] = content.endings.map((e) => e.id);
const UNORDERED_ENDINGS = ALL_ENDING_IDS.filter((id) => !ENDING_ORDER.includes(id));
const DISPLAY_ENDINGS: EndingId[] = [
  ...ENDING_ORDER.filter((id) => ALL_ENDING_IDS.includes(id)),
  ...UNORDERED_ENDINGS,
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

/**
 * A tier band's floor, read from `src/theme/tokens.ts` rather than retyped.
 *
 * Every threshold this harness prints or checks has to come from the module
 * that owns it. The tier table is the UI's, the ending gates are
 * `constants.ts`'s, and the moment the harness keeps its own copy of either it
 * starts grading a game nobody plays — which is how it came to print
 * "Legend tier" over a hard-coded 90 while the engine gated Ascension at 84.
 */
function tierMin(id: TierId): number {
  const tier = TIERS.find((t) => t.id === id);
  if (!tier) throw new Error(`unknown tier id: ${id}`);
  return tier.min;
}

const LOCAL_MENACE_MIN = tierMin('local_menace');
const NAMED_THREAT_MIN = tierMin('named_threat');
const KINGDOM_MIN = tierMin('kingdom');
const LEGEND_MIN = tierMin('legend');

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
    const eraCount = forcedEras ? parseInt(forcedEras, 10) : pickEraCount(lengthRoll);

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
          endings: Object.fromEntries(DISPLAY_ENDINGS.map((e) => [e, byEnding.get(e) ?? 0])),
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

  // Reachability, measured apart from the population it must not distort.
  // AFTER the `--json` early return: that path is used to diff distributions
  // between slices and has no business paying for a thousand extra runs.
  const probe = reprisalProbe(baseSeed);

  /** Every career the harness played, for the reachability check only. */
  const byEndingAnywhere = new Map(byEnding);
  for (const cohort of probe.values()) {
    for (const r of cohort) {
      byEndingAnywhere.set(r.ending, (byEndingAnywhere.get(r.ending) ?? 0) + 1);
    }
  }

  console.log('');
  console.log('EVIL WIZARD SIMULATOR - balance report');
  console.log(`${runs} runs | base seed ${baseSeed} | ${contentLabel}`);
  console.log(rule());

  // --- ending distribution ---------------------------------------------
  console.log('');
  console.log('ENDING DISTRIBUTION');
  console.log(`${pad('ending', 24)}${padLeft('n', 6)}${padLeft('share', 9)}  distribution`);
  for (const ending of DISPLAY_ENDINGS) {
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
  const ascensionReadyRuns = results.filter((r) => r.everAscensionReady).length;
  const ageLimit = results.filter((r) => r.reachedAgeLimit).length;
  const slain = byEnding.get('slain_by_chosen_one') ?? 0;
  const declineAll = results.flatMap((r) => r.declineDeltas);
  const declineNoto = results.filter((r) => r.declineDeltas.length > 0);
  // "Near miss" is the Kingdom-Level band's floor, not a coincidence and not a
  // literal: wiki/04 § Near-Miss Tuning is about players who saw the violet
  // badge and still did not transcend.
  const nearMiss = results.filter(
    (r) => r.ending !== 'ascension' && r.peakNotoriety >= KINGDOM_MIN,
  ).length;
  // The badge the ending screen prints is `tierFor(peak)`, so the share of
  // careers that finish showing the grey UNKNOWN badge is the same number as
  // "never crossed 40", stated from the player's side. Kept explicit because
  // that is the side the design cares about.
  const unknownBadgeRate =
    results.filter((r) => tierFor(r.peakNotoriety).id === 'unknown').length / total;

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
  row(`near-miss (peak ${KINGDOM_MIN}+, no ascend)`, pct(nearMiss, total));
  row('ending screen shows the grey badge', `${(unknownBadgeRate * 100).toFixed(2)}%`);
  console.log(rule());
  console.log('  ascension is the AND of two rare things:');
  row(
    `  ...notoriety ${ASCENSION_MIN_NOTORIETY}+ in decline`,
    pct(results.filter((r) => r.metNotorietyConjunct).length, total),
  );
  row(
    `  ...ever held ${ASCENSION_LEGENDARIES}+ legendary`,
    pct(results.filter((r) => r.metLegendaryConjunct).length, total),
  );
  row('  ...both at once (engine ascensionReady)', pct(ascensionReadyRuns, total));
  console.log(rule());
  row('mean notoriety at prophecy', mean(declineNoto.map((r) => r.notorietyAtProphecy)).toFixed(1));
  row('mean notoriety delta / decline era', mean(declineAll).toFixed(2));
  row('worst single decline era', String(Math.min(...(declineAll.length ? declineAll : [0]))));
  row('decline eras with delta <= -10', pct(declineAll.filter((d) => d <= -10).length, declineAll.length));

  // --- the scarce color, the trophy case, the ledger ----------------------
  const tierReach = (min: number) => pct(results.filter((r) => r.peakNotoriety >= min).length, total);
  console.log(rule());
  console.log('  notoriety tier REACHED at peak (the rationed color):');
  row(`  ...Local Menace (${LOCAL_MENACE_MIN}+)`, tierReach(LOCAL_MENACE_MIN));
  row(`  ...Named Threat (${NAMED_THREAT_MIN}+)`, tierReach(NAMED_THREAT_MIN));
  row(`  ...Kingdom-Level (${KINGDOM_MIN}+, violet)`, tierReach(KINGDOM_MIN));
  row(`  ...Legend (${LEGEND_MIN}+, gold)`, tierReach(LEGEND_MIN));
  console.log('  the tier the ENDING SCREEN actually shows (tierOf peak):');
  for (const tier of TIERS) {
    const n = results.filter((r) => tierFor(r.peakNotoriety).id === tier.id).length;
    row(`  ...${tier.name}`, pct(n, total));
  }
  // --- the pact ladder ----------------------------------------------------
  //
  // Printed as a CHAIN, not a rate. `consumed_by_pact` is the end of a
  // sequence — sign something, keep signing, get deep, cross — and a bare
  // share cannot say which link is short. The first build of this system read
  // 0.90% and the chain immediately said why: the debt was being taken and
  // then paid off, never carried.
  console.log(rule());
  row('runs that ever carried pact debt', pct(results.filter((r) => r.everInDebt).length, total));
  row('mean peak pact debt', mean(results.map((r) => r.peakPactDebt)).toFixed(2));
  row('...among runs that took any', mean(
    results.filter((r) => r.everInDebt).map((r) => r.peakPactDebt),
  ).toFixed(2));
  for (const d of [2, 4, 6]) {
    row(`runs reaching ${d}+ pact debt`, pct(results.filter((r) => r.peakPactDebt >= d).length, total));
  }
  row(
    'mean eras spent carrying debt',
    mean(results.filter((r) => r.everInDebt).map((r) => r.erasCarryingDebt)).toFixed(1),
  );
  {
    const reckless = results.filter((r) => r.policy === 'reckless');
    row(
      'CONSUMED, population-wide',
      pct(results.filter((r) => r.ending === 'consumed_by_pact').length, total),
    );
    row(
      'CONSUMED, among the reckless cohort',
      pct(reckless.filter((r) => r.ending === 'consumed_by_pact').length, Math.max(1, reckless.length)),
    );
  }
  row(
    'CONSUMED, among runs reaching 4+',
    pct(
      results.filter((r) => r.peakPactDebt >= 4 && r.ending === 'consumed_by_pact').length,
      Math.max(1, results.filter((r) => r.peakPactDebt >= 4).length),
    ),
  );

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
  // --- the faction reprisals ----------------------------------------------
  //
  // Printed as a CHAIN and per cohort, for the two reasons the pact ladder is:
  // a bare rate cannot separate "nobody ever made that enemy" from "they did
  // and something else killed them first", and a cohort-level effect measured
  // population-wide mostly measures the population mix. The population column
  // is printed WITHOUT a target beside it, deliberately.
  //
  // `card` is how many of that faction's grievance cards the career was shown,
  // and how many it took. It is the one column that says whether the route
  // exists as opposed to whether the odds were kind — the first build of those
  // cards was seen by a fifth of the cohort that wanted it.
  console.log(rule());
  console.log(
    `  FACTION REPRISALS  (${PROBE_RUNS}-run cohort probes, then the population)`,
  );
  console.log(
    `${pad('  faction', 20)}${padLeft('cohort', 8)}${padLeft('low', 7)}${padLeft(`<=${SEAL_MAX_STANDING}`, 9)}${padLeft('+fame', 8)}${padLeft('card', 12)}${padLeft('reprisal', 10)}${padLeft('pop', 8)}`,
  );
  for (const [factionId, endingId] of Object.entries(REPRISAL_BY_FACTION) as [
    FactionId,
    EndingId,
  ][]) {
    const cohort = probe.get(factionId) ?? [];
    const deep = cohort.filter((r) => r.minStanding[factionId] <= SEAL_MAX_STANDING);
    const drove = deep.length;
    // Both halves, in the order a career meets them. A cohort that gets its
    // enemy deep enough and stays too obscure to be worth acting on is a
    // different problem from one that never makes the enemy.
    const famous = deep.filter((r) => r.peakNotoriety >= SEAL_MIN_NOTORIETY).length;
    const reached = cohort.filter((r) => r.ending === endingId).length;
    console.log(
      pad(`  ${factionId}`, 20) +
        padLeft(cohort.length ? String(cohort.length) : '-', 8) +
        padLeft(
          cohort.length ? mean(cohort.map((r) => r.minStanding[factionId])).toFixed(0) : '-',
          7,
        ) +
        padLeft(cohort.length ? pct(drove, cohort.length) : '-', 9) +
        padLeft(drove ? pct(famous, drove) : '-', 8) +
        padLeft(
          cohort.length
            ? `${mean(cohort.map((r) => r.grievancesSeen.filter((id) => id.includes(factionId)).length)).toFixed(2)}/${mean(
                cohort.map((r) => r.grievancesTaken.filter((id) => id.includes(factionId)).length),
              ).toFixed(2)}`
            : '-',
          12,
        ) +
        padLeft(cohort.length ? pct(reached, cohort.length) : '-', 10) +
        padLeft(pct(byEnding.get(endingId) ?? 0, total), 8),
    );
  }

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
  const localMenaceCount = results.filter((r) => r.peakNotoriety >= LOCAL_MENACE_MIN).length;
  const localMenaceRate = localMenaceCount / total;
  const namedThreatRate = results.filter((r) => r.peakNotoriety >= NAMED_THREAT_MIN).length / total;
  const kingdomRate = results.filter((r) => r.peakNotoriety >= KINGDOM_MIN).length / total;
  const legendRate = results.filter((r) => r.peakNotoriety >= LEGEND_MIN).length / total;
  const lichSeekers = results.filter((r) => r.policy === 'lich');
  const lichSeekerRuns = lichSeekers.length;
  const lichSeekerLichdoms = lichSeekers.filter((r) => r.ending === 'lichdom').length;
  const lichSeekerLichdomRate = lichSeekerRuns > 0 ? lichSeekerLichdoms / lichSeekerRuns : 0;
  const meanLairs = mean(results.map((r) => r.lairsHeld));
  const repeatRate = repeatedDeeds / Math.max(1, allDeeds.length);
  const notorietyConjunct = results.filter((r) => r.metNotorietyConjunct).length / total;
  const legendaryConjunct = results.filter((r) => r.metLegendaryConjunct).length / total;
  const checks: Array<[string, boolean, string]> = [
    [
      /*
       * Provenance: wiki/04 § Near-Miss Tuning names 1-4%; this is the one
       * headline band in the file that the wiki states outright, and the one
       * that may not simply be widened.
       *
       * KNOWN RED SINCE THE FACTION REPRISALS LANDED (#14 slice 1), at
       * 0.80-1.20% against a pre-reprisal 1.50-1.65%. Do not tune this band,
       * and do not reach for `ASCENSION_MIN_NOTORIETY` to make the row go
       * green: the cause is measured and is neither threshold. Careers end
       * ~0.8 eras earlier now (mean run length 13.42 -> 12.62), so BOTH
       * conjuncts fell together — 84+ notoriety 9.85% -> 7.35%, a legendary
       * ever held 10.35% -> 8.40%. Slice 4 gives the Gilded Hand and the
       * Verdant Choir a legendary each, which lifts the second one, and the
       * issue plans to re-tune the threshold there with numbers on both sides.
       * Lowering it now and raising it then is how `DEF_LICH` got distorted
       * twice. Re-measure when slice 4 lands.
       */
      'Ascension in 1-4%',
      ascensionRate >= 0.01 && ascensionRate <= 0.04,
      pct(ascension, total),
    ],
    [
      // INSTRUMENT SELF-CHECK, not a balance target. Three identities that
      // hold by construction, checked PER RUN rather than as population rates
      // because a rate comparison can pass on a coincidence:
      //
      //   1. every run that ends in `ascension` satisfies BOTH conjuncts;
      //   2. every run that ever satisfies `ascensionReady` ends in
      //      `ascension` (`checkEndings` tests it first, so it cannot be
      //      overtaken by another ending);
      //   3. therefore the headline rate cannot exceed either conjunct.
      //
      // All three were false for the entire life of the old readout, which
      // printed a 0.05% conjunct above a 2.20% headline and was believed. No
      // wiki provenance is needed or possible: this is arithmetic, and it is
      // here so a future drift in either threshold is a [FAIL] and not
      // something a reader has to happen to notice.
      'Instrument: ascension conjuncts reconcile',
      results.every(
        (r) =>
          (r.ending !== 'ascension' || (r.metNotorietyConjunct && r.metLegendaryConjunct)) &&
          r.everAscensionReady === (r.ending === 'ascension'),
      ) &&
        ascensionRate <= notorietyConjunct + 1e-9 &&
        ascensionRate <= legendaryConjunct + 1e-9,
      `${pct(ascension, total)} vs ${pct(ascensionReadyRuns, total)}`,
    ],
    [
      // PROVENANCE: the WORD is wiki/04 § Hero Escalation ("survival to the
      // age limit is uncommon — the swamp retirement ending should feel
      // earned, not default"). The 8-35% BAND is not in the wiki; it is a
      // reading of "uncommon" wide enough to admit the courtier build, which
      // deliberately survives, without letting retirement become the default.
      'Age-limit survival uncommon (8-35%)',
      survivalRate >= 0.08 && survivalRate <= 0.35,
      pct(ageLimit, total),
    ],
    [
      // PROVENANCE: wiki/04 § Notoriety Decay ("the decline should feel like
      // erosion, not a cliff"). The -12 and the 12% are NOT in the wiki: -12
      // is four times `DECAY_BASE`, i.e. an era that lost noticeably more than
      // four ordinary eras' drift, and 12% is "fewer than one era in eight".
      // Both are this harness's operationalisation of a qualitative line.
      'Decline is erosion, not a cliff (<12% of eras <= -12)',
      cliffRate < 0.12,
      `${(cliffRate * 100).toFixed(2)}%`,
    ],
    [
      /*
       * Rule 6, counted against the content bundle rather than a literal
       * seven — and against every run this harness plays, not only the
       * headline population.
       *
       * Endings are ALLOWED to differ wildly in difficulty; what they may not
       * do is be unreachable. Measuring that on the population alone made the
       * gate seed-dependent the moment the rarest reprisals landed: the
       * Covenant's is reached by ~3.5% of a pariah cohort that is ~40 runs of
       * the 2000, so the expected count is 1.4 and a quarter of seeds produce
       * none. Seed 6 duly produced none, and a load-bearing gate that goes red
       * on a seed change is worse than one that fails honestly.
       *
       * The fix is NOT to raise the pariah share until the number cooperates —
       * a population made of people all chasing rare endings is not a
       * population (CLAUDE.md failure mode 5), and inflating it would corrupt
       * every other rate in this report to make one check pass. So the count
       * spans the population plus the cohort probes: 3000 careers, in which
       * the rarest ending is expected seven times.
       *
       * The population share stays printed above, deliberately without a
       * target beside it. An ending that occurs only in its own cohort is a
       * rare ending, which is allowed; an ending that occurs nowhere is a
       * broken one, which is not.
       *
       * THIS IS THE ONLY REACHABILITY ROW, and there used to be a second one
       * asserting each reprisal turned up inside its own 200-run cohort. It
       * was deleted rather than tuned: at a 1% cohort rate the expected count
       * is two and one seed in eight produces none, so it went red on seed 2
       * for a reason that was arithmetic rather than a defect. A gate that
       * flickers is a gate people stop reading. The combined count is 3000
       * careers precisely so it does not flicker.
       */
      `Every authored ending occurs (${ALL_ENDING_IDS.length} in content, ${
        total + [...probe.values()].reduce((a, c) => a + c.length, 0)
      } careers)`,
      ALL_ENDING_IDS.every((e) => (byEndingAnywhere.get(e) ?? 0) > 0),
      `${ALL_ENDING_IDS.filter((e) => (byEndingAnywhere.get(e) ?? 0) > 0).length}/${
        ALL_ENDING_IDS.length
      }`,
    ],
    [
      /*
       * PROVENANCE: none in the wiki. wiki/01 § 7 lists `consumed_by_pact`
       * with the note "High-variance play punished" and sets no rate; the
       * 8-18% band was chosen in the session that deleted the interest tick.
       * Stated as invented so nobody chases it the way the lichdom band was
       * chased twice.
       *
       * Measured against the RECKLESS COHORT, not the population. Debt now
       * moves only on cards the player accepted, and every other policy prices
       * it through a convex potential that refuses anything reaching
       * `PACT_LIMIT` — so population-wide this reads ~1%, which is a fact
       * about optimisers rather than about the game. CLAUDE.md failure mode 5:
       * "a cohort-level effect measured population-wide mostly measures the
       * population mix." The population figure is printed above, deliberately
       * without a target.
       */
      'Consumed by the pact, among the reckless (8-18%)',
      (() => {
        const cohort = results.filter((r) => r.policy === 'reckless');
        if (cohort.length === 0) return false;
        const share = cohort.filter((r) => r.ending === 'consumed_by_pact').length / cohort.length;
        return share >= 0.08 && share <= 0.18;
      })(),
      pct(
        results.filter((r) => r.policy === 'reckless' && r.ending === 'consumed_by_pact').length,
        Math.max(1, results.filter((r) => r.policy === 'reckless').length),
      ),
    ],
    [
      // PROVENANCE: none. The wiki names no ceiling on any single ending; it
      // only lists the seven and calls Ascension "genuinely uncommon"
      // (wiki/01 § 7). 45% is a floor under variety — it keeps the biography
      // from being a coin toss between two outcomes — and it is stated here
      // as invented so nobody chases it the way the lichdom band was chased.
      'No single ending above 45%',
      topEndingShare <= 0.45,
      `${topEndingName} ${(topEndingShare * 100).toFixed(2)}%`,
    ],
    [
      // PROVENANCE: none in the wiki. wiki/02 marks the tier thresholds
      // "starting guesses" and both wiki/00:80 and wiki/02:214 leave
      // "tune Notoriety tier thresholds against real run distributions" open,
      // so there is no authored rate to cite; this band is set from the
      // measured distribution (see the tuning note in src/theme/tokens.ts).
      // It exists because crossing 40 is the first time the game's one
      // rationed colour does anything, and it was the only tier crossing with
      // no check at all.
      `Local Menace (${LOCAL_MENACE_MIN}+) reached in 70-95% of runs`,
      localMenaceRate >= 0.7 && localMenaceRate <= 0.95,
      pct(localMenaceCount, total),
    ],
    [
      // PROVENANCE: none — same open task as the Local Menace check above.
      // Band set from the measured distribution: the bronze badge should be
      // the median career's high-water mark without being universal.
      `Named Threat (${NAMED_THREAT_MIN}+) reached in 35-75% of runs`,
      namedThreatRate >= 0.35 && namedThreatRate <= 0.75,
      pct(results.filter((r) => r.peakNotoriety >= NAMED_THREAT_MIN).length, total),
    ],
    [
      // PROVENANCE: wiki/02's tier table says of the 75 crossing "the color
      // moment. Crossing 75 must feel like an event." An event roughly one
      // career in five clears that bar; the 12-40% band is this harness's,
      // not the wiki's.
      `Kingdom-Level (${KINGDOM_MIN}+) reached in 12-40% of runs`,
      kingdomRate >= 0.12 && kingdomRate <= 0.4,
      pct(results.filter((r) => r.peakNotoriety >= KINGDOM_MIN).length, total),
    ],
    [
      // PROVENANCE: wiki/02's tier table calls Legend "Rare. Ascension
      // territory." The 1-12% band is not authored. The floor matters more
      // than the ceiling: Legend must stay reachable, because it is the
      // notoriety side of Ascension's AND.
      `Legend (${LEGEND_MIN}+) stays rare (1-12%)`,
      legendRate >= 0.01 && legendRate <= 0.12,
      pct(results.filter((r) => r.peakNotoriety >= LEGEND_MIN).length, total),
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
      // PROVENANCE: wiki/01 § 8 specifies "a grid of lairs held, one card
      // each" as the ending card's centrepiece; a grid of one is not a grid.
      // The 3-5 BAND is not authored anywhere — it is the range that fills
      // the card without making any single lair unmemorable.
      'Trophy case: mean lairs held 3-5',
      meanLairs >= 3 && meanLairs <= 5,
      meanLairs.toFixed(2),
    ],
    [
      // PROVENANCE: CLAUDE.md rule 2 ("if rows start reading alike, the ledger
      // has stopped saying anything"). The 2% is not authored; it is strict
      // enough that a stock-tail regression shows up immediately.
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
