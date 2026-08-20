/**
 * What one era produced, in the form the UI renders it.
 *
 * `appliedEffects` is the honest ledger of what landed — post-clamp, post
 * lockout, with `artifactFrom` already collapsed into the concrete artifact it
 * granted. wiki/04's odds policy forbids undisclosed downside; this is the
 * other half of that contract, forbidding undisclosed *outcome*.
 */

import type { Artifact, EndingId, EraRecord, Effect, Lair, Outcome, Tier } from '../types';

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
  /**
   * Set when the wizard changed address this era.
   *
   * Lairs move for two reasons — an authored `lairTier` effect, or the systemic
   * promotion in `promoteLair` — and the systemic one used to happen in total
   * silence. Playtest: "I don't notice the lair changes, despite them happening
   * and being displayed at the end." A progression reward nobody sees is not a
   * reward, so the resolution now carries the move and the UI announces it.
   */
  lairMoved?: { from: Lair; to: Lair; up: boolean };
  ending?: EndingId;
  eraRecord: EraRecord;

  /**
   * The roll that decided a gamble, and the threshold it was measured against.
   * Both 0..1, both absent for a deterministic choice.
   */
  roll?: number;
  odds?: number;
};
