/**
 * What one era produced, in the form the UI renders it.
 *
 * `appliedEffects` is the honest ledger of what landed — post-clamp, post
 * lockout, with `artifactFrom` already collapsed into the concrete artifact it
 * granted. wiki/04's odds policy forbids undisclosed downside; this is the
 * other half of that contract, forbidding undisclosed *outcome*.
 */

import type { Artifact, EndingId, EraRecord, Effect, Lair, LifelineRecovery, Outcome, Tier } from '../types';
import type { RelicEvent } from './relics';

/**
 * A change the era-end systems made on their own, after the option resolved.
 *
 * These are NOT the option's consequences and must never be rendered as if
 * they were — the whole reason this type exists is a report from play: "I died
 * being consumed by the pact, even though the last action I took had nothing
 * to do with pacts." A tick had crossed a lethal threshold in the systems
 * block, and `appliedEffects` is the *option's* ledger, so the card that
 * announced the death showed nothing that could have caused it. (That
 * particular tick is gone — pact debt no longer moves on its own — but the
 * defect it caused is the reason this channel exists, and apprentice loyalty
 * drift still ends runs the same way.)
 *
 * Only counters that are LETHAL, COUNTABLE and PLAYER-CONTROLLABLE belong
 * here. Notoriety decay and hero-threat escalation deliberately do not:
 * wiki/04 § Notoriety Decay forbids the doom meter, and "the decline works
 * because it is a number quietly going the wrong way, not because it is
 * announced". Announcing the tick that ENDS a run is the opposite case — it is
 * the same disclosure the header already makes, arriving at the moment it
 * becomes the cause of death.
 *
 * `v` is the applied delta; the second field is the value it landed on, so the
 * renderer can print the distance to the threshold without recomputing it.
 */
export type SystemicChange =
  | { t: 'loyaltyDrift'; v: number; loyalty: number }
  /**
   * The chosen one got closer, and crossed a band while doing it.
   *
   * Structured, not prose: the renderer looks the line up from content, the
   * same way every other `Effect` is data the renderer can always print. Fires
   * at most three times a run — see `heroApproachLine`.
   */
  | { t: 'heroApproach'; band: 'warn' | 'danger' | 'through'; threat: number; wards: number };

export type Resolution = {
  outcome: Outcome;
  /** Exactly what landed, for the UI to render. */
  appliedEffects: Effect[];
  /** Result flavor line. */
  text: string;
  artifactsGained: Artifact[];
  /**
   * The subset of `artifactsGained` this player has never held in any career.
   *
   * ALWAYS PRESENT, empty when nothing was new. The collection is a 30-slot
   * grid of silhouettes that a player fills across many runs, and until this
   * existed the moment a slot was finally filled looked identical to picking
   * up the fourth copy of a relic they already owned.
   */
  newToCollection: Artifact[];
  /**
   * Relics lost THIS era, named — the lich rite's forfeiture and any ordinary
   * `loseArtifact` effect. ALWAYS PRESENT, empty when nothing was lost, the
   * same `systemic`/`newToCollection` pattern: `appliedEffects` already
   * carries an unnamed `loseArtifact` line for rule 1, and this is what lets
   * a renderer say WHICH relic it was without re-deriving it from a bare
   * effect that never named one.
   */
  artifactsLost: Artifact[];
  /**
   * What a held relic did on its OWN this era — an era-end tick, or a
   * once-only reaction to the choice just made (issue #80's power
   * framework). ALWAYS PRESENT, empty when no relic fired. Kept separate from
   * `appliedEffects` for the same reason `systemic` is: attributing a relic's
   * own consequence to the option the player picked would misname its cause.
   */
  relicEvents: RelicEvent[];
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
  /**
   * What the era-end systems did on their own. ALWAYS PRESENT, empty when
   * nothing fired — an optional field here is exactly the shape that let the
   * roll rail go unrendered for a whole build (see the note in
   * `src/components/run/resolution.ts`).
   */
  systemic: SystemicChange[];
  ending?: EndingId;
  eraRecord: EraRecord;

  /**
   * The roll that decided a gamble, and the threshold it was measured against.
   * Both 0..1, both absent for a deterministic choice.
   */
  roll?: number;
  odds?: number;

  /**
   * Set when a held lifeline (issue #82) cancelled this era's ending — the
   * resolution card's one dedicated place to say so, distinct from
   * `relicEvents`: a lifeline just saved the run from ENDING, which is a
   * bigger deal than an ordinary era-tick relic reaction and reads oddly
   * folded into the same quiet list. `endingAverted` names what it saved the
   * wizard FROM (never rendered as if it happened); `applied` is the
   * recovery's own real delta, printable the same way any other effect is.
   */
  lifeline?: { artifactId: string; endingAverted: EndingId; recovery: LifelineRecovery; applied: Effect[] };
};
