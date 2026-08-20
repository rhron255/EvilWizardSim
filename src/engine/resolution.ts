/**
 * What one era produced, in the form the UI renders it.
 *
 * `appliedEffects` is the honest ledger of what landed — post-clamp, post
 * lockout, with `artifactFrom` already collapsed into the concrete artifact it
 * granted. wiki/04's odds policy forbids undisclosed downside; this is the
 * other half of that contract, forbidding undisclosed *outcome*.
 */

import type { Artifact, EndingId, EraRecord, Effect, Outcome, Tier } from '../types';

export type Resolution = {
  outcome: Outcome;
  /** Exactly what landed, for the UI to render. */
  appliedEffects: Effect[];
  /** Result flavor line. */
  text: string;
  artifactsGained: Artifact[];
  notorietyDelta: number;
  /** ONLY set on an upward crossing into a `celebrate: true` tier. */
  tierCrossed?: Tier;
  ending?: EndingId;
  eraRecord: EraRecord;
};
