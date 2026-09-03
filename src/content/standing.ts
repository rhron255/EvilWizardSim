/**
 * What the six think of you, once it is over.
 *
 * Reported from play: the factions feel like a nuisance rather than something
 * you built. During a run that is fair — standing's only visible payoffs are a
 * locked reliquary and a gem, both punishments — and the ending card drew six
 * bars and said nothing at all.
 *
 * `src/components/meta/standing.ts` picks the two ends of the ledger: the
 * faction you courted past `DEVOTION_STANDING` and the one you drove under
 * `ARTIFACT_LOCKOUT_STANDING`. This file supplies what each of them says.
 *
 * TWELVE LINES, NOT EIGHTY-FOUR. Keyed on faction and polarity, shared across
 * all seven original endings — the tier coda varies on its own axis, and
 * keeping the two independent is the difference between a card that reads
 * differently every run and a content job nobody finishes. The reprisals and
 * the leadership endings each break that independence a little, on purpose:
 * `NEMESIS_BY_ENDING` and `PATRON_BY_ENDING` below are the SMALL, targeted
 * exception — a handful of overrides for the endings where the generic line
 * would contradict what the card just said, not a second eighty-four.
 *
 * Each line is a complete sentence and stands alone. A wizard may have a
 * patron and no nemesis, or neither; the passage has to read correctly with
 * one line or none, so there is no connective text between them. Two full
 * stops is the passage.
 *
 * Register: each faction's approval and grievance should sound like THAT
 * faction's idea of the thing. The Gilded Hand's fondness is an invoice; the
 * Choir's is horticultural; the Worm's is a schedule.
 */

import type { EndingId, FactionId } from '../types';

const PATRON: Record<FactionId, string> = {
  ashen_covenant: 'The Ashen Covenant keeps your name on the roll, unburnt, as a courtesy.',
  gilded_hand: 'The Gilded Hand marks the account preferred, and the terms outlive you.',
  pale_academy: 'The Pale Academy cites you now without the disclaimer it used to attach.',
  verdant_choir: 'The Verdant Choir has decided to let something grow over you.',
  crownlands: 'The Crownlands recorded you as compliant, on schedule, and remain uneasy.',
  worm_below: 'The Worm Below counts you among its own, which was always the arrangement.',
};

const NEMESIS: Record<FactionId, string> = {
  ashen_covenant: 'The Ashen Covenant did not threaten you. It simply stopped offering terms.',
  gilded_hand: 'The Gilded Hand still lists you, under a heading it does not sell from.',
  pale_academy: 'The Pale Academy cites you only as a methodological failure.',
  verdant_choir: 'The Verdant Choir is taking the ground back, at its own pace.',
  crownlands: 'The Crownlands still have the file open.',
  worm_below: 'The Worm Below holds no grudge. It has simply moved you up the schedule.',
};

/**
 * When your nemesis is also the faction that ended the run.
 *
 * Two of the generic lines break in that case, for different reasons, and both
 * are reachable — `sealed_in_gem` is 18.5% of runs and is *caused* by Pale
 * Academy standing, so a wizard sealed in a gem very often has the Academy as
 * their nemesis by definition.
 *
 *   - `consumed_by_pact` + Ashen Covenant: the generic line is FACTUALLY WRONG,
 *     not merely redundant. "It simply stopped offering terms" contradicts a
 *     card whose entire subject is the terms being executed.
 *   - `sealed_in_gem` + Pale Academy: the generic line is true but restates the
 *     ending's act as an attitude, under a card that already prints "At the
 *     hands of The Pale Academy". The variant moves from the act to the
 *     aftermath, which is what earns it the space.
 *
 * A patron who is also the ending's faction needs no variant: the regard and
 * the procedure are genuinely separate things, and the collision reads as irony
 * rather than contradiction.
 *
 * The five reprisals added with the seal's generalisation each need one for the
 * same reason the seal did, and more urgently: a reprisal is CAUSED by that
 * faction's standing, so the faction that ended the run is very often the
 * nemesis the card is about to name. Every one of the generic lines describes a
 * grievance still running — "still lists you", "is taking the ground back", "has
 * moved you up the schedule" — under a card whose whole subject is that the
 * matter finished. Each variant moves from the act to the aftermath.
 */
/**
 * When your patron is also the faction that CROWNED you.
 *
 * `patronFaction` and `leadershipEnding` share a threshold (`DEVOTION_STANDING`
 * plus `PATRON_MARGIN`), so a wizard who reaches a leadership ending has, by
 * construction, that same faction as their patron — the generic `PATRON` line
 * fires on every one of these cards, not occasionally. Five of the six needed
 * a variant for it: the generic line describes ongoing courtship ("keeps your
 * name on the roll, as a courtesy", "let something grow over you") under a card
 * whose subject is that the courtship is OVER and the faction lost. `lichdom`
 * needs none — its `PATRON` line ("counts you among its own") already reads as
 * an arrival rather than a courtesy, because the Worm's crown was never a
 * standing total to begin with.
 */
const PATRON_BY_ENDING: Partial<Record<EndingId, Partial<Record<FactionId, string>>>> = {
  contract_writer: {
    ashen_covenant: 'The Ashen Covenant does not call you a courtesy any longer. It calls you a signatory.',
  },
  grand_arbiter: {
    gilded_hand: 'The Gilded Hand no longer marks your account preferred. It marks it authoritative.',
  },
  archmage: {
    pale_academy: 'The Pale Academy does not merely cite you now. It defers to you, disclaimer removed.',
  },
  archdruid: {
    verdant_choir: 'The Verdant Choir did not let something grow over you. It let you lead the grove.',
  },
  overthrown_the_kingdom: {
    crownlands: 'The Crownlands do not record you as compliant and uneasy. They record you as the Crown.',
  },
};

const NEMESIS_BY_ENDING: Partial<Record<EndingId, Partial<Record<FactionId, string>>>> = {
  consumed_by_pact: {
    ashen_covenant: 'The Ashen Covenant collected without warmth. The account is closed regardless.',
  },
  sealed_in_gem: {
    pale_academy: 'The Pale Academy considers the matter closed and checks the cabinet anyway.',
  },
  eternally_repurposed: {
    ashen_covenant: 'The Ashen Covenant made no threat and offered no terms. It raised a requisition.',
  },
  liquidated: {
    gilded_hand: 'The Gilded Hand lists you under assets realised, the only heading that ever closes.',
  },
  turned_to_fertilizer: {
    verdant_choir: 'The Verdant Choir took the ground back and has since stopped thinking about it.',
  },
  exiled_and_overrun: {
    crownlands: 'The Crownlands closed the file, then reopened it once, to note it was foreseeable.',
  },
  consumed: {
    worm_below: 'The Worm Below holds no grudge and no appetite now. The schedule simply ran out.',
  },
};

export function patronLineFor(factionId: FactionId, endingId: EndingId): string {
  return PATRON_BY_ENDING[endingId]?.[factionId] ?? PATRON[factionId];
}

export function nemesisLineFor(factionId: FactionId, endingId: EndingId): string {
  return NEMESIS_BY_ENDING[endingId]?.[factionId] ?? NEMESIS[factionId];
}
