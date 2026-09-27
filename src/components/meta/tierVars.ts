/**
 * Bind the one scarce colour to a subtree.
 *
 * `--ew-tier` / `--ew-tier-glow` are declared on :root in tokens.css and are
 * expected to be re-bound at runtime. The meta screens are presentational and
 * must not reach for app state, so each one sets the pair itself from whatever
 * notoriety it is showing: the title screen from the collection's best run, the
 * ending card from the run's peak, the creation screen from nothing at all.
 */

import type { CSSProperties } from 'react';
import { tierColor, tierFor, tierGlow } from '../../theme/tokens';
import type { Tier } from '../../types';

export type TierVars = CSSProperties & {
  '--ew-tier': string;
  '--ew-tier-glow': string;
};

export function tierVars(notoriety: number): TierVars {
  const tier = tierFor(notoriety);
  return {
    '--ew-tier': tierColor[tier.id],
    '--ew-tier-glow': tierGlow[tier.id],
  };
}

/** The tier itself, for the name and the player-facing line. */
export function tierOf(notoriety: number): Tier {
  return tierFor(notoriety);
}

/** Highest notoriety reached at any point in a run, not the final figure. */
export function peakNotoriety(eras: { notoriety: number }[], fallback = 0): number {
  return eras.reduce((max, e) => Math.max(max, e.notoriety), fallback);
}
