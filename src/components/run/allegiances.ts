/**
 * Faction standing, and the two things it can silently do to you.
 *
 * Playtest: "I've been locked up in a gem twice now without understanding why?
 * this should be made clear why the game ends abruptly."
 *
 * `sealed_in_gem` is the SECOND most common ending — 18.5% of runs — and it
 * fires the moment Pale Academy standing falls to `SEAL_MAX_STANDING` while
 * notoriety is at or above `SEAL_MIN_NOTORIETY`. Until now the run screen did
 * not show faction standing at all, so the entire condition was invisible.
 *
 * It is worse than merely hidden, because standing mostly moves by CONTAGION:
 * courting the Ashen Covenant costs Academy standing automatically (they are
 * `hostileTo` each other), so a player can be driven into the seal by choices
 * whose cards never mentioned the Academy. That is an undisclosed downside in
 * the exact sense wiki/04 forbids, arrived at by a route the player cannot see.
 *
 * The other silent effect is the artifact lockout: at or below
 * `ARTIFACT_LOCKOUT_STANDING` a faction's relics stop being grantable, so an
 * offer promising one quietly does nothing.
 */

import {
  ARTIFACT_LOCKOUT_STANDING,
  DEVOTION_STANDING,
  SEAL_FACTION,
  SEAL_MAX_STANDING,
  SEAL_MIN_NOTORIETY,
} from '../../engine';
import type { Faction, FactionId, RunState } from '../../types';

export type Allegiance = {
  id: FactionId;
  name: string;
  /** Short name for the compact strip. */
  short: string;
  standing: number;
  /** −1..1, for the bar. */
  ratio: number;
  tone: 'devoted' | 'warm' | 'neutral' | 'cold' | 'locked' | 'lethal';
  /** One line naming what this standing is currently doing. */
  note: string;
};

/**
 * Six labels that fit a third of a phone.
 *
 * Ellipsising the full names produced "ASHEN CO...", "VERDANT CH..." and
 * "CROWNLAN..." — unreadable, and worse, ambiguous at a glance in a strip whose
 * whole job is quick scanning. Each of these is the word players actually use.
 */
const SHORT_NAME: Record<FactionId, string> = {
  ashen_covenant: 'Covenant',
  gilded_hand: 'Gilded',
  pale_academy: 'Academy',
  verdant_choir: 'Choir',
  crownlands: 'Crown',
  worm_below: 'Worm',
};

function toneFor(id: FactionId, standing: number): Allegiance['tone'] {
  // The seal is the only standing value that ends a run outright.
  if (id === SEAL_FACTION && standing <= SEAL_MAX_STANDING + 12) return 'lethal';
  if (standing <= ARTIFACT_LOCKOUT_STANDING) return 'locked';
  if (standing >= DEVOTION_STANDING) return 'devoted';
  if (standing >= 20) return 'warm';
  if (standing <= -20) return 'cold';
  return 'neutral';
}

function noteFor(run: RunState, id: FactionId, standing: number, tone: Allegiance['tone']): string {
  if (id === SEAL_FACTION) {
    const armed = run.notoriety >= SEAL_MIN_NOTORIETY;
    if (standing <= SEAL_MAX_STANDING) return 'the Academy is filing you away';
    if (tone === 'lethal') {
      return armed
        ? `seals you in a gem at ${SEAL_MAX_STANDING}`
        : `seals you at ${SEAL_MAX_STANDING}, once you pass ${SEAL_MIN_NOTORIETY} Notoriety`;
    }
  }
  if (tone === 'locked') return 'their relics are locked to you';
  if (tone === 'devoted') return 'their reliquary is open';
  if (tone === 'warm') return 'their offers surface more often';
  if (tone === 'cold') return 'their offers are turning to threats';
  return 'indifferent';
}

export function allegiancesFor(run: RunState, factions: Faction[]): Allegiance[] {
  return factions.map((f) => {
    const standing = run.factionStanding[f.id] ?? 0;
    const tone = toneFor(f.id, standing);
    return {
      id: f.id,
      name: f.name,
      short: SHORT_NAME[f.id],
      standing,
      ratio: Math.max(-1, Math.min(1, standing / 100)),
      tone,
      note: noteFor(run, f.id, standing, tone),
    };
  });
}

/**
 * The one standing condition that can end a run, surfaced separately so the
 * header can warn about it without the player having to read six rows.
 * `null` when the seal is not a live threat.
 */
export type SealWarning = { standing: number; margin: number; armed: boolean };

export function sealWarningFor(run: RunState): SealWarning | null {
  const standing = run.factionStanding[SEAL_FACTION] ?? 0;
  const margin = standing - SEAL_MAX_STANDING;
  // Only warn once it is genuinely close; a full-health Academy is not news.
  if (margin > 25) return null;
  return { standing, margin, armed: run.notoriety >= SEAL_MIN_NOTORIETY };
}

/**
 * The seal, written out with BOTH of its conditions.
 *
 * It takes two numbers to end a run this way — standing at or under
 * `SEAL_MAX_STANDING` *and* notoriety at or over `SEAL_MIN_NOTORIETY` — and the
 * header used to name only the first. A wizard already past the standing
 * threshold read "The Pale Academy is done deliberating." and then died to a
 * card that granted Notoriety and never mentioned the Academy: the fame half of
 * the trigger was never disclosed, so the choice that armed it looked safe.
 *
 * Same rule as the pact caption. A threshold without the thing that trips it
 * is half a disclosure.
 *
 * Every variant is held to ONE LINE at 393px — measured, not estimated
 * (`qa/probe-seal-fit.mjs`). The header sits above the choice cards, so a
 * second line here pushes the first card 19px further down the reference
 * device; the sentence this replaced wrapped whenever the seal was armed,
 * which is exactly when the player most needs the card they are about to tap.
 */
export function sealSentence(warning: SealWarning): string {
  const distance =
    warning.margin <= 0 ? 'is done deliberating' : `is ${warning.margin} from the gem`;
  const trigger = warning.armed ? 'your fame qualifies' : `it acts at ${SEAL_MIN_NOTORIETY} Notoriety`;
  return `The Academy ${distance} · ${trigger}.`;
}
