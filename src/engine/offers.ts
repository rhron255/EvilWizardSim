/**
 * Offer generation — wiki/04 § Offer Generation.
 *
 *   filter by phase + requires  →  drop seen-this-run  →  weight by faction
 *   standing AND by pact debt  →  sample one.
 *
 * Two guarantees are enforced here rather than left to content:
 *
 *   1. EVERY era offers at least one `certain` option. "A player should never
 *      be forced into a gamble" is a design promise, not a content review
 *      note, so the sampler only ever considers offers that carry one — and if
 *      the catalog somehow cannot supply one, it synthesizes a quiet era.
 *   2. A faction-affiliated offer surfaces at least every `FACTION_OFFER_GAP`
 *      eras, so faction identity stays present even on a run that has ignored
 *      everyone.
 *
 * The pool degrades rather than empties: seen offers are recycled
 * least-recently-seen-first before the fallback ever fires.
 */

import type { Offer, OfferOption, RunState } from '../types';
import type { ContentBundle } from './content-port';
import { indexOf } from './content-port';
import { conditionMet, conditionsMet, impliedGatesOf } from './conditions';
import {
  FACTION_OFFER_GAP,
  PACT_RELIEF_COEF,
  PACT_RELIEF_MAX,
  PACT_TEMPT_COEF,
  PACT_TEMPT_MAX,
  STANDING_WEIGHT_COEF,
  STANDING_WEIGHT_MAX,
  STANDING_WEIGHT_MIN,
} from './constants';
import { streamFor, weightedPick } from './rng';
import { clamp } from './systems';

/**
 * The safety net. Engine-owned, deliberately dull, and only reachable when the
 * authored catalog cannot produce a legal offer at all. Both options are
 * `certain`, so the no-forced-gamble guarantee holds even here.
 */
export const QUIET_ERA_OFFER: Offer = {
  id: 'engine:quiet_era',
  title: 'A Quiet Interval',
  body: 'Nothing of consequence presents itself. The reagent shelf, however, is a disgrace.',
  phase: 'any',
  options: [
    {
      kind: 'certain',
      label: 'Reorganize the tower',
      effects: [{ t: 'followers', v: 1 }],
      resultText: 'Five years of inventory. One impressed hireling.',
    },
    {
      kind: 'certain',
      label: 'Brood on the parapet',
      effects: [{ t: 'notoriety', v: 1 }],
      resultText: 'You brood magnificently. A shepherd tells someone.',
    },
  ],
};

export function hasCertainOption(offer: Offer): boolean {
  return offer.options.some((o) => o.kind === 'certain');
}

/** Offers with no options at all are unplayable; treat them as absent. */
function isStructurallyPlayable(offer: Offer): boolean {
  return offer.options.length >= 2 && offer.options.length <= 4 && hasCertainOption(offer);
}

/**
 * Whether ONE option can actually be chosen right now — every condition
 * `impliedGatesOf` derives from the option's own effects (CLAUDE.md failure
 * mode 14) evaluated through the same `conditionMet` every `requires` gate
 * already uses. No second cost walker: the derivation lives in
 * `conditions.ts`, this just asks it.
 */
export function isOptionPickable(run: RunState, option: OfferOption, content: ContentBundle): boolean {
  return impliedGatesOf(option).every((c) => conditionMet(run, c, content));
}

/**
 * The run-aware companion to `isStructurallyPlayable`. Folded into
 * `buildOfferPool`'s eligibility filter (step 1) rather than applied after,
 * so the existing degradation cascade (faction force → recycle → the
 * `QUIET_ERA_OFFER` fallback, all below) inherits this for free — see that
 * function's own comments for why an empty `eligible` was already a solved
 * problem before affordability existed. `QUIET_ERA_OFFER`'s two options cost
 * nothing, so it is provably always pickable and the cascade still
 * terminates: a run too broke for anything else gets an honest quiet era
 * instead of a stuck pool.
 *
 * Requires only ONE pickable CERTAIN option, not every option — restoring
 * the "no forced gamble" guarantee (isStructurallyPlayable's `hasCertainOption`
 * only proves a certain option EXISTS, not that its own implied cost gates are
 * currently affordable) while letting an offer with an unaffordable-but-
 * interesting option still surface, greyed, per the UI `OfferPanel`/`OptionCard`
 * already supports.
 *
 * This used to require EVERY option to be pickable (issue #41 follow-up,
 * commit 208357d). That was the fix for a real regression: an earlier version
 * of THIS function asked for exactly what it asks for again now — one
 * pickable certain option — and `buildOfferPool`'s step 2 marked an offer
 * `seenOfferIds` the instant it was DRAWN, regardless of whether the
 * interesting option was affordable, so a card shown before the player could
 * pay for it got declined (the only pickable path) and was gone for the rest
 * of the run. MEASURED across seeds 1-5 under that failure: Ascension fell to
 * 0.55-0.85% (below its 1-4% floor), full completion rose to 1096-1205 median
 * runs. `everyOptionPickable`'s all-or-nothing gate closed that hole by
 * keeping the card out of the pool entirely until every option cleared —
 * but it also closed off ever seeing an almost-affordable card, or being
 * offered it again later.
 *
 * The burn-forever half of the regression is now closed at its actual
 * source instead: `resolveChoice` (`run.ts`) only appends an offer to
 * `seenOfferIds` when the choice made didn't amount to a forced decline of an
 * unaffordable option — see the comment there. That makes permanently losing
 * a route impossible regardless of how permissive this gate is.
 *
 * The OTHER half of that measurement — full completion rising to 1096-1205 —
 * was not actually about `seenOfferIds` at all: it was pool dilution. Nearly
 * every offer in the catalog already carries a stock-free certain option
 * (`validate-content.ts`'s `hasStockFreeOption` rule requires it), so loosening
 * THIS gate alone makes almost the entire 150+ catalog eligible from era one,
 * long before it's actually interesting — confirmed by re-measuring this gate
 * change alone (without even touching `seenOfferIds`): full completion still
 * landed at 1178.5, matching the old regression almost exactly. `everyOptionPickable`
 * fixed that by keeping a partially-locked offer out of the pool entirely,
 * which is also what made it dense enough to hit the sub-1000 target.
 * `affordabilityWeight` below is what recovers that density without giving up
 * visibility: a partially-locked offer still enters the pool (this gate), but
 * at a fraction of its normal weight, so it is rarely drawn while locked — the
 * same practical rarity `everyOptionPickable` produced — without being
 * impossible to draw, which is what lets it surface early once in a while and
 * be revisited once it clears.
 */
function hasPickableCertainOption(run: RunState, offer: Offer, content: ContentBundle): boolean {
  return offer.options.some(
    (option) => option.kind === 'certain' && isOptionPickable(run, option, content),
  );
}

/**
 * Whether every option is currently affordable. An offer that clears this has
 * nothing greyed out — the ordinary, fully-open case.
 */
function everyOptionPickable(run: RunState, offer: Offer, content: ContentBundle): boolean {
  return offer.options.every((option) => isOptionPickable(run, option, content));
}

/**
 * An offer sits at reduced weight in the pool while it has at least one
 * currently-unaffordable option — visible and drawable (so the player can see
 * "almost there" and the card can be revisited once it clears, issue #61),
 * but drawn far less often than a fully-open offer so the pool's overall pace
 * stays close to the pre-#61 baseline. Full weight the instant every option
 * clears.
 *
 * 0.03 by measurement, not guess (CLAUDE.md failure mode 6): `npm run sim`
 * across seeds 1-5 at 0.05 recovered visibility but pushed full completion
 * over budget on two seeds (1055-1102 median, against the sub-1000 target);
 * at 0.02 full completion cleared comfortably on all five (848-993) but
 * lichdom reachability (2-15% of that cohort) missed on four of five,
 * including a hard 0.00%. 0.03 is the point where full completion clears
 * comfortably on every seed (857-991.5) while Ascension and lichdom land
 * within the same seed-to-seed spread the pre-existing baseline already
 * shows at its own band edges — the two checks were already intermittent
 * before this change; this doesn't make them reliably worse.
 */
const PARTIALLY_LOCKED_WEIGHT = 0.03;

export function affordabilityWeight(run: RunState, offer: Offer, content: ContentBundle): number {
  return everyOptionPickable(run, offer, content) ? 1 : PARTIALLY_LOCKED_WEIGHT;
}

/**
 * wiki/04: "factions the player has courted surface more often. This is what
 * makes deliberate routing legible."
 */
export function standingWeight(run: RunState, offer: Offer): number {
  const base = offer.weight ?? 1;
  if (!offer.factionId) return base;
  const standing = run.factionStanding[offer.factionId] ?? 0;
  const multiplier = clamp(
    1 + (standing / 100) * STANDING_WEIGHT_COEF,
    STANDING_WEIGHT_MIN,
    STANDING_WEIGHT_MAX,
  );
  return base * multiplier;
}

/**
 * The pull the interest tick used to be.
 *
 * Debt no longer grows on its own; the POOL leans instead. A wizard deep in
 * debt meets the Covenant more often — its temptations AND its ways out — so
 * the pressure that ends a run is made of cards the player was shown and
 * accepted, not of arithmetic that ran while they were looking elsewhere.
 *
 * `relieves` is weighted more gently than `tempts` (see `constants.ts`), but
 * both climb, so a deep debt is a situation rather than a sentence.
 *
 * Returns exactly `1` at zero debt for every role, which is the property worth
 * remembering: a career that never signs a pact draws from an unweighted pool.
 */
export function pactWeight(run: RunState, offer: Offer, content: ContentBundle): number {
  if (run.pactDebt <= 0) return 1;
  switch (indexOf(content).pactRole.get(offer.id) ?? 'none') {
    case 'tempts':
      return clamp(1 + run.pactDebt * PACT_TEMPT_COEF, 1, PACT_TEMPT_MAX);
    case 'relieves':
      return clamp(1 + run.pactDebt * PACT_RELIEF_COEF, 1, PACT_RELIEF_MAX);
    case 'none':
      return 1;
  }
}

/** Eras since a faction-affiliated offer last surfaced. */
function erasSinceFactionOffer(run: RunState, content: ContentBundle): number {
  const index = indexOf(content);
  let count = 0;
  for (let i = run.eras.length - 1; i >= 0; i--) {
    const offer = index.offerById.get(run.eras[i].offerId);
    if (offer?.factionId) return count;
    count++;
  }
  return count;
}

/**
 * Recycling order for a drained pool: the offer seen longest ago comes back
 * first. `seenOfferIds` is append-ordered, so a lower index is older.
 */
function recencyRank(run: RunState, offer: Offer): number {
  const at = run.seenOfferIds.indexOf(offer.id);
  return at === -1 ? -1 : at;
}

/**
 * Offers the engine positions itself, and therefore withholds from the random
 * pool. Everything else marked `scripted` is gated by its own `requires` and
 * competes normally — at a raised weight, since a set piece that loses a coin
 * flip to a texture card is a set piece nobody sees.
 */
export const ENGINE_PLACED_OFFER_IDS: ReadonlySet<string> = new Set(['prophecy']);

/** Set pieces should win the draw when they are eligible at all. */
const SCRIPTED_WEIGHT_BONUS = 4;

export type OfferPoolDebug = {
  eligible: number;
  unseen: number;
  factionForced: boolean;
  recycled: boolean;
  fallback: boolean;
};

/** Pool construction, exposed separately so tests can assert on the stages. */
export function buildOfferPool(
  run: RunState,
  content: ContentBundle,
): { pool: Offer[]; debug: OfferPoolDebug } {
  const debug: OfferPoolDebug = {
    eligible: 0,
    unseen: 0,
    factionForced: false,
    recycled: false,
    fallback: false,
  };

  // 1. Phase + requires + structural playability.
  //
  //    `scripted` does NOT mean "never sampled". It marks a pivotal set piece,
  //    and all but one of them are placed by their own `requires` gate. Only
  //    offers the engine positions itself (the prophecy, which is pinned to
  //    `prophecyEra`) are withheld here — excluding the whole `scripted` class
  //    stranded five of the catalog's most important cards, including the
  //    lichdom branch, so `lichdom` was unreachable in 2000 simulated runs.
  const eligible = content.offers.filter(
    (offer) =>
      !ENGINE_PLACED_OFFER_IDS.has(offer.id) &&
      isStructurallyPlayable(offer) &&
      (offer.phase === 'any' || offer.phase === run.phase) &&
      conditionsMet(run, offer.requires, content) &&
      hasPickableCertainOption(run, offer, content),
  );
  debug.eligible = eligible.length;

  // 2. Exclude offers already seen this run.
  const seen = new Set(run.seenOfferIds);
  const unseen = eligible.filter((offer) => !seen.has(offer.id));
  debug.unseen = unseen.length;

  let pool = unseen;

  // 3. Faction cadence guarantee.
  if (erasSinceFactionOffer(run, content) >= FACTION_OFFER_GAP - 1) {
    const factionOffers = pool.filter((offer) => offer.factionId);
    if (factionOffers.length > 0) {
      pool = factionOffers;
      debug.factionForced = true;
    }
  }

  // 4. Graceful degradation: recycle least-recently-seen rather than crash.
  if (pool.length === 0 && eligible.length > 0) {
    debug.recycled = true;
    const ranked = eligible
      .slice()
      .sort((a, b) => recencyRank(run, a) - recencyRank(run, b) || a.id.localeCompare(b.id));
    pool = ranked.slice(0, Math.max(3, Math.ceil(ranked.length / 3)));
  }

  if (pool.length === 0) {
    debug.fallback = true;
    pool = [QUIET_ERA_OFFER];
  }

  return { pool, debug };
}

/**
 * ONE offer for the current era, with 2-4 options.
 *
 * Pure: the same `RunState` always yields the same offer, because the sampling
 * stream is derived from `(seed, era index)` and nothing else.
 */
export function nextOffer(run: RunState, content: ContentBundle): Offer {
  // The prophecy is pinned to its era. The full-screen interstitial announces
  // the birth; this card is where the player answers it.
  if (run.eraIndex === run.prophecyEra && !run.seenOfferIds.includes('prophecy')) {
    const prophecy = content.offers.find((o) => o.id === 'prophecy');
    if (prophecy && isStructurallyPlayable(prophecy)) return prophecy;
  }

  const { pool } = buildOfferPool(run, content);
  const rng = streamFor(run.seed, 'offer', run.eraIndex);
  return (
    weightedPick(
      rng,
      pool,
      (offer) =>
        standingWeight(run, offer) *
        pactWeight(run, offer, content) *
        affordabilityWeight(run, offer, content) *
        (offer.scripted ? SCRIPTED_WEIGHT_BONUS : 1),
    ) ?? QUIET_ERA_OFFER
  );
}
