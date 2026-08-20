/**
 * The systems that run *between* choices: era arithmetic, notoriety decay,
 * hero escalation, defense, and the tier-crossing check.
 *
 * Nothing here reads content except `defenseOf`, and nothing here is random.
 * Every number comes from `constants.ts`.
 */

import type { FactionId, Phase, RunState, Tier } from '../types';
import { TIERS, tierFor } from '../theme/tokens';
import type { ContentBundle } from './content-port';
import { indexOf } from './content-port';
import {
  DECAY_BASE,
  DECAY_RAMP,
  DEF_FLOOR,
  DEF_LAIR,
  DEF_LICH,
  DEF_NOTORIETY,
  HERO_FAME_COEF,
  HERO_THREAT_BASE,
  HERO_THREAT_RAMP,
  PROPHECY_FRACTION,
  START_AGE,
  YEARS_PER_ERA,
} from './constants';

export const FACTION_IDS: FactionId[] = [
  'ashen_covenant',
  'gilded_hand',
  'pale_academy',
  'verdant_choir',
  'crownlands',
  'worm_below',
];

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Notoriety is an integer 0-99. The ledger prints it; it never shows decimals. */
export function clampNotoriety(v: number): number {
  return clamp(Math.round(v), 0, 99);
}

export function emptyStanding(): Record<FactionId, number> {
  return {
    ashen_covenant: 0,
    gilded_hand: 0,
    pale_academy: 0,
    verdant_choir: 0,
    crownlands: 0,
    worm_below: 0,
  };
}

/** wiki/01: 5 in-world years per era, starting at 20. */
export function ageForEra(eraIndex: number): number {
  return START_AGE + eraIndex * YEARS_PER_ERA;
}

/** Scripted, never sampled — identical pacing every run of a given length. */
export function prophecyEraFor(eraCount: number): number {
  const era = Math.round(eraCount * PROPHECY_FRACTION);
  // Always leave at least one ascent era and one decline era, however short
  // the run is configured to be.
  return clamp(era, 1, Math.max(1, eraCount - 1));
}

export function phaseFor(eraIndex: number, prophecyEra: number): Phase {
  return eraIndex >= prophecyEra ? 'decline' : 'ascent';
}

export function erasSinceProphecyFor(eraIndex: number, prophecyEra: number): number {
  return Math.max(0, eraIndex - prophecyEra);
}

/**
 * wiki/04: `decayPerEra = base * (1 + erasSinceProphecy * 0.15)`, zero during
 * ascent, zero for a lich. Rounded, because the ledger shows whole numbers and
 * a fractional slide would read as a rendering bug.
 */
export function decayFor(run: Pick<RunState, 'phase' | 'erasSinceProphecy' | 'isLich'>): number {
  if (run.phase !== 'decline') return 0;
  if (run.isLich) return 0;
  return Math.round(DECAY_BASE * (1 + run.erasSinceProphecy * DECAY_RAMP));
}

/**
 * Threat added at the end of a decline era. Ramps on time and on fame: the
 * more famous the wizard, the better the hero the Crownlands can afford.
 */
export function threatGainFor(
  run: Pick<RunState, 'phase' | 'erasSinceProphecy' | 'notoriety'>,
): number {
  if (run.phase !== 'decline') return 0;
  const gain =
    HERO_THREAT_BASE + HERO_THREAT_RAMP * run.erasSinceProphecy + HERO_FAME_COEF * run.notoriety;
  return Math.round(gain * 10) / 10;
}

/**
 * What stands between the wizard and the chosen one.
 *
 * wiki/04: "derived from Notoriety, artifacts held, and lair tier". Followers
 * deliberately contribute nothing — they are ledger filler by design
 * (wiki/02 § three currencies), and giving them defense would collapse two
 * currencies into one.
 */
export function defenseOf(run: RunState, content: ContentBundle): number {
  const index = indexOf(content);

  let artifactDefense = 0;
  for (const id of run.heldArtifactIds) {
    artifactDefense += index.artifactById.get(id)?.defense ?? 0;
  }

  const rung = index.lairRung.get(run.lairId);
  const lairTier = rung === undefined ? 0 : (index.lairLadder[rung]?.tier ?? 0);

  const total =
    DEF_FLOOR +
    run.notoriety * DEF_NOTORIETY +
    artifactDefense +
    lairTier * DEF_LAIR +
    (run.isLich ? DEF_LICH : 0);
  return Math.round(total * 10) / 10;
}

/**
 * The one celebrated moment in the UI. Returns a tier ONLY for an upward
 * crossing into a `celebrate: true` band — sliding back down 75 during the
 * decline must never fire confetti.
 */
export function tierCrossing(before: number, after: number): Tier | undefined {
  const from = tierFor(before);
  const to = tierFor(after);
  if (from.id === to.id) return undefined;
  if (!to.celebrate) return undefined;
  if (to.min <= from.min) return undefined;
  return to;
}

/** Highest tier reached at any point in the run — used for epithet fallbacks. */
export function peakTier(run: RunState): Tier {
  let peak = run.notoriety;
  for (const era of run.eras) peak = Math.max(peak, era.notoriety);
  return tierFor(peak);
}

export function peakNotoriety(run: RunState): number {
  let peak = run.notoriety;
  for (const era of run.eras) peak = Math.max(peak, era.notoriety);
  return peak;
}

/** Exported for tests that assert the tier table is the shared one. */
export { TIERS, tierFor };
