/**
 * Test support: the real content catalog, shaped for the tests that play it.
 *
 * Not fixture data — `REAL_CONTENT` re-exports `src/content/` as-is, and the
 * helpers below only pick real offers out of it. It lives outside
 * `src/engine/` on purpose: the engine never imports `src/content/` (see the
 * doc comment on `content-port.ts`), and a helper under that directory that
 * did would break the rule in letter even though only tests load it.
 */
import type { ContentBundle } from '../engine/content-port';
import type { EraRecord, Offer } from '../types';
import * as C from '../content';
import { deedLineFor } from '../engine/deeds';

export const REAL_CONTENT: ContentBundle = {
  factions: C.factions,
  artifacts: C.artifacts,
  lairs: C.lairs,
  origins: C.origins,
  endings: C.endings,
  offers: C.offers,
  epithets: C.epithets,
};

/**
 * The first real catalog offer matching `pred`. Chosen by shape, not id, so a
 * rename breaks nothing; if no offer has the shape any more, this throws with
 * `what` rather than letting a test silently exercise nothing.
 */
export function realOfferWhere(what: string, pred: (offer: Offer) => boolean): Offer {
  const offer = C.offers.find(pred);
  if (!offer) throw new Error(`no real offer is ${what}`);
  return offer;
}

const sampled = C.offers.filter(
  (o) => !o.scripted && o.options.some((opt) => opt.kind === 'certain'),
);

/**
 * What era `i` of a test run recorded choosing: a real offer's id, the label
 * of its first certain option, and the deed line the engine writes for it.
 * Spread into an `EraRecord` literal so its history names real cards.
 */
export function realDeed(
  i: number,
): Pick<EraRecord, 'offerId' | 'optionLabel' | 'deedSummary' | 'outcome'> {
  const offer = sampled[i % sampled.length];
  const option = offer.options.find((opt) => opt.kind === 'certain')!;
  return {
    offerId: offer.id,
    optionLabel: option.label,
    deedSummary: deedLineFor(offer, option, 'deterministic'),
    outcome: 'deterministic',
  };
}
