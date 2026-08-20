/**
 * Terminal-state evaluation — all seven endings from wiki/01 § 7.
 *
 * wiki/03 § Event Flow: "The ending check runs **after** every era, not only
 * at the age limit — hero threat and pact debt can terminate a run mid-arc."
 *
 * ORDER MATTERS and is deliberate:
 *
 *   1. `ascension`  — the top prize outranks the blade. A wizard who has the
 *      legendaries and the fame transcends before the chosen one lands the
 *      hit. Gated to the decline phase, because ending the run before the
 *      prophecy would amputate the arc the whole design rests on.
 *   2. `slain_by_chosen_one` — the default shape of a life that ran out.
 *   3. `sealed_in_gem` — the Academy files a dangerous alumnus away.
 *   4. `betrayed_by_apprentice` — a full tower and an empty well of loyalty.
 *   5. `consumed_by_pact` — the debt comes due.
 *   6. Age limit → `lichdom` if the wizard already paid for it, else
 *      `retired_to_swamp`, which is the catch-all so no state is undefined.
 *
 * Nothing here reads as "you lost" (wiki/06 principle 8). The engine decides
 * WHICH biography; content decides how it reads.
 */

import type { EndingId, RunState } from '../types';
import type { ContentBundle } from './content-port';
import { indexOf } from './content-port';
import {
  ASCENSION_LEGENDARIES,
  ASCENSION_MIN_NOTORIETY,
  BETRAYAL_MAX_LOYALTY,
  BETRAYAL_MIN_APPRENTICES,
  PACT_LIMIT,
  SEAL_FACTION,
  SEAL_MAX_STANDING,
  SEAL_MIN_NOTORIETY,
} from './constants';
import { defenseOf } from './systems';

export function legendariesHeld(run: RunState, content: ContentBundle): number {
  const index = indexOf(content);
  let n = 0;
  for (const id of run.heldArtifactIds) {
    if (index.artifactById.get(id)?.rarity === 'legendary') n++;
  }
  return n;
}

export function ascensionReady(run: RunState, content: ContentBundle): boolean {
  if (run.isLich) return false;
  if (run.phase !== 'decline') return false;
  if (run.notoriety < ASCENSION_MIN_NOTORIETY) return false;
  return legendariesHeld(run, content) >= ASCENSION_LEGENDARIES;
}

/**
 * Evaluate every terminal condition against a run that has just finished an
 * era and advanced. Returns `undefined` when the biography continues.
 */
export function checkEndings(run: RunState, content: ContentBundle): EndingId | undefined {
  if (run.ending) return run.ending;

  if (ascensionReady(run, content)) return 'ascension';

  if (run.heroThreat > defenseOf(run, content)) return 'slain_by_chosen_one';

  if (
    (run.factionStanding[SEAL_FACTION] ?? 0) <= SEAL_MAX_STANDING &&
    run.notoriety >= SEAL_MIN_NOTORIETY
  ) {
    return 'sealed_in_gem';
  }

  if (
    run.apprentices.count >= BETRAYAL_MIN_APPRENTICES &&
    run.apprentices.loyalty <= BETRAYAL_MAX_LOYALTY
  ) {
    return 'betrayed_by_apprentice';
  }

  if (run.pactDebt >= PACT_LIMIT) return 'consumed_by_pact';

  if (run.eraIndex >= run.eraCount) {
    return run.isLich ? 'lichdom' : 'retired_to_swamp';
  }

  return undefined;
}
