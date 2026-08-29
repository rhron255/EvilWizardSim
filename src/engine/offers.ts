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

import type { Offer, RunState } from '../types';
import type { ContentBundle } from './content-port';
import { indexOf } from './content-port';
import { conditionsMet } from './conditions';
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
      conditionsMet(run, offer.requires, content),
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
        (offer.scripted ? SCRIPTED_WEIGHT_BONUS : 1),
    ) ?? QUIET_ERA_OFFER
  );
}
