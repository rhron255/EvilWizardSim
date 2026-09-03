/**
 * `requires` evaluation — the gate on whether an offer may enter the pool.
 *
 * Pure, total, and exhaustive over the `Condition` union. An unknown condition
 * fails closed (the offer does not surface) rather than throwing, so a bad
 * content edit degrades the pool instead of killing the run.
 */

import type { Condition, RunState } from '../types';
import type { ContentBundle } from './content-port';
import { indexOf } from './content-port';

export function conditionMet(run: RunState, condition: Condition, content: ContentBundle): boolean {
  switch (condition.c) {
    case 'minNotoriety':
      return run.notoriety >= condition.v;
    case 'maxNotoriety':
      return run.notoriety <= condition.v;
    case 'minStanding':
      return (run.factionStanding[condition.factionId] ?? 0) >= condition.v;
    case 'maxStanding':
      return (run.factionStanding[condition.factionId] ?? 0) <= condition.v;
    case 'minApprentices':
      return run.apprentices.count >= condition.v;
    case 'minFollowers':
      return run.followers >= condition.v;
    case 'minPactDebt':
      return run.pactDebt >= condition.v;
    case 'minLairTier': {
      const index = indexOf(content);
      const rung = index.lairRung.get(run.lairId);
      const tier = rung === undefined ? 0 : (index.lairLadder[rung]?.tier ?? 0);
      return tier >= condition.v;
    }
    case 'minEraIndex':
      return run.eraIndex >= condition.v;
    case 'hasArtifact':
      return run.heldArtifactIds.includes(condition.artifactId);
    case 'holdsAnyArtifact':
      return run.heldArtifactIds.length > 0;
    case 'minArtifacts':
      return run.heldArtifactIds.length >= condition.v;
    default:
      return false;
  }
}

export function conditionsMet(
  run: RunState,
  conditions: Condition[] | undefined,
  content: ContentBundle,
): boolean {
  if (!conditions || conditions.length === 0) return true;
  for (const condition of conditions) {
    if (!conditionMet(run, condition, content)) return false;
  }
  return true;
}
