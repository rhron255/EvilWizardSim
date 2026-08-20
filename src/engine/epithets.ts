/**
 * Epithet projection.
 *
 * wiki/02 § Naming Rules: "Epithets: generated from the highest-magnitude deed
 * of the run." Content encodes that ranking by ORDER — the first matching
 * predicate wins, so authors put the loudest deeds first. The engine only
 * supplies a bland tier-derived fallback so a run is never nameless.
 *
 * Called every era so `run.epithet` is always current, and exported publicly
 * so the header can show what the wizard would be remembered as *right now*.
 */

import type { RunState } from '../types';
import type { ContentBundle } from './content-port';
import { FALLBACK_EPITHETS } from './content-port';
import { tierFor } from '../theme/tokens';

export function projectedEpithet(run: RunState, content: ContentBundle): string {
  for (const epithet of content.epithets) {
    let matched = false;
    try {
      matched = epithet.when(run);
    } catch {
      // A throwing predicate is a content bug, not a reason to lose a run.
      matched = false;
    }
    if (matched) return epithet.text;
  }
  return FALLBACK_EPITHETS[tierFor(run.notoriety).id];
}
