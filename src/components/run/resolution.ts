/**
 * Local mirror of the engine's `Resolution`.
 *
 * The engine does not exist yet. The run-loop UI is written against this
 * structurally-identical shape so it can be built, typechecked and reviewed
 * ahead of the reducer; the orchestrator reconciles the two by re-exporting the
 * engine type from here (or by deleting this file and pointing imports at the
 * engine) once it lands.
 *
 * `roll` and `odds` are OPTIONAL additions, not part of the agreed shape. They
 * exist so `<ResolutionOverlay>` can show the roll landing against the odds the
 * player was shown before committing — the visual proof that the outcome was
 * authored rather than arbitrary (wiki/04_operational_behaviors-1.md, Odds
 * Presentation Policy). Both degrade gracefully when absent, and because they
 * are optional an engine `Resolution` without them stays assignable here.
 */

import type { Artifact, Effect, EndingId, EraRecord, Outcome, Tier } from '../../types';

export type Resolution = {
  outcome: Outcome;
  appliedEffects: Effect[];
  /** One-line flavor for the outcome. Comedic register; the numbers are not. */
  text: string;
  artifactsGained: Artifact[];
  notorietyDelta: number;
  /** Present only when this era moved the wizard into a new tier. */
  tierCrossed?: Tier;
  /** Present only when this era terminated the run. */
  ending?: EndingId;
  eraRecord: EraRecord;

  /** 0..1 — the roll that decided a gamble. Optional; see note above. */
  roll?: number;
  /** 0..1 — the success threshold that was printed on the option. Optional. */
  odds?: number;
};
