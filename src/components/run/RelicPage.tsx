/**
 * The relic page (issue #78, slice 1 of #77 — resolves #6).
 *
 * During a run the player could only ever see a relic COUNT. Nothing listed
 * which relics they held, a relic that was lost was never named, and the
 * wards figure the header already prints ("Relics add N to your wards") had
 * no page naming which relics contributed it. This is that page: reached one
 * tap away from the Relics stat, never in the way of the decision.
 *
 * It is a VIEW inside `RunScreen`, not a second screen in the routing sense —
 * see the amendment to `RunScreen`'s own doc comment and to CLAUDE.md's "one
 * continuous screen" section for why that distinction matters here. It is not
 * persisted: `RunScreen` holds it in local `useState`, so a reload always
 * lands back on the decision.
 *
 * Held relics reuse `ArtifactCard` with its opt-in flavour line — the same
 * card the ending screen and the collection already use, so a relic's
 * presentation is not invented a second time here. "Lost this run" is
 * derived exactly the way `EndingScreen` already derives it: the union of
 * every era's `artifactsGained`, `startingArtifactIds` (an origin's own
 * grant), `activeGrantedArtifactIds` (an active's own grant, issue #81),
 * `triggerGrantedArtifactIds` (a trigger's own grant, issue #82 — none of
 * the three ever lands in `eras`, see each field's doc comment in
 * `types.ts`), and the current `heldArtifactIds`, minus whatever is still
 * held.
 *
 * *Amended to drop the offer card's "Whatever you choose" line.* A relic
 * whose era-end trigger fires no matter what gets picked used to print that
 * line, unchanged, on every single offer of the run — repetitive rather than
 * informative once a player had seen it once. This page now opens with a
 * subtitle stating the total wards, then a plain, scannable summary: every
 * held relic's name on its own line, followed by its EFFECT on the line below
 * it — a hard break, not the flex-wrap row `RelicReactions` uses on an offer
 * card (which only drops to a second line when the first is too long to fit,
 * so a short name and a short effect can still land side by side there; this
 * summary always stacks the two). The effect itself uses the same
 * colour-coded, comma-flowed notation `EffectList` already renders for an
 * ordinary offer's consequences, preceded by a short line saying WHEN it
 * fires (`relicTriggerWhen`: "When you lose a gamble:", "Every era's end:").
 * *Amended from play:* the summary once dropped that condition entirely, and
 * every trigger read as a flat bonus paid each era — "+3 Notoriety" for a
 * relic that only pays when you lose a gamble. The effect is the terse
 * notation; the condition is never optional. The fuller sentence
 * `relicPowerText` builds still appears on the card below under
 * "Artifacts". Only a `trigger` power carries a
 * discrete `Effect[]` to render that way; a `passive` rate change (the only
 * other kind authored so far) has no such list, so it falls back to its own
 * prose, and a relic with no power at all gets no effect line. This is
 * deliberately NOT the same guarantee rule 1 makes for an offer card: a
 * player who never opens this page gets no pre-commit warning about an
 * era-end power, only the resolution screen's own after-the-fact "Your
 * relics" section — an accepted gap.
 */

import { useEffect, useRef } from 'react';
import { canActivateRelic } from '../../engine';
import type { ContentBundle, DefenseReadout } from '../../engine';
import type { Artifact, Faction, RelicPower, RunState } from '../../types';
import { ArtifactCard, relicPowerText, relicTriggerWhen } from '../meta';
import { EffectList } from './EffectList';
import { factionFor } from './effectText';
import styles from './RelicPage.module.css';

type TriggerPower = Extract<RelicPower, { kind: 'trigger' }>;

function hasTriggerPower(artifact: Artifact): artifact is Artifact & { power: TriggerPower } {
  return artifact.power?.kind === 'trigger';
}

/**
 * A trigger power whose whole effect is discrete `RelicEffect[]` rows
 * `EffectList` can render — true for the common case (Mantle of Slow Moss),
 * false for one whose effect lives entirely in `scaled` instead (The Long
 * Appetite: `effects: []`, everything in `perUnit`/`perUnitEffect`). Getting
 * this wrong reads as a real disclosure bug, not a blank state: `EffectList`
 * renders an empty array as the literal string "No change," directly
 * contradicting a relic that visibly does something every era.
 */
function hasDiscreteTriggerEffects(
  artifact: Artifact,
): artifact is Artifact & { power: TriggerPower } {
  return hasTriggerPower(artifact) && artifact.power.effects.length > 0;
}

export type RelicPageProps = {
  run: RunState;
  artifacts: Artifact[];
  factions: Faction[];
  content: ContentBundle;
  defense?: DefenseReadout | null;
  onBack(): void;
  /**
   * Spends a held relic's active power (issue #81). Only ever called for an
   * artifact `canActivateRelic` currently allows — the Use button below is
   * the only caller, and it does not render when that check is false.
   */
  onUseRelic(artifactId: string): void;
};

/**
 * The descriptive fallback for a relic with no discrete `Effect[]` to render
 * tersely — a `passive` rate change, or one of the deferred `active`/
 * `lifeline` placeholders. `null` (no power) has nothing to say at all.
 */
function descriptionFor(artifact: Artifact, faction: Faction | undefined): string | null {
  if (!artifact.power) return null;
  return relicPowerText(artifact.power, { factions: faction && [faction] });
}

export function RelicPage({
  run,
  artifacts,
  factions,
  content,
  defense,
  onBack,
  onUseRelic,
}: RelicPageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Focus moves to the page heading on open — the same "the switch was
  // thrown, prove it to a screen reader too" idiom `ResolutionOverlay` uses
  // for its own continue button.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const held = run.heldArtifactIds
    .map((id) => artifacts.find((a) => a.id === id))
    .filter((a): a is Artifact => Boolean(a));

  // Same derivation `EndingScreen` uses for its own relic grid: everything
  // ever gained this run, minus what is still held.
  const everGained = new Set<string>([
    ...run.eras.flatMap((e) => e.artifactsGained),
    ...run.startingArtifactIds,
    ...run.activeGrantedArtifactIds,
    ...run.triggerGrantedArtifactIds,
    ...run.heldArtifactIds,
  ]);
  const lost = [...everGained]
    .filter((id) => !run.heldArtifactIds.includes(id))
    .map((id) => artifacts.find((a) => a.id === id))
    .filter((a): a is Artifact => Boolean(a));

  const relicsTerm = defense?.terms.find((t) => t.label === 'Relics');

  const emptyText =
    lost.length > 0
      ? 'None held right now. The hero has nothing to fear from your walls.'
      : 'No relics recovered yet. The hero has nothing to fear from your walls.';

  return (
    <div className={styles.page}>
      <div className={styles.backBar}>
        <button type="button" className={styles.back} onClick={onBack}>
          ‹ Back to the decision
        </button>
      </div>

      <div className={styles.titleGroup}>
        <h2 className={styles.heading} tabIndex={-1} ref={headingRef}>
          Your Relics
        </h2>

        {relicsTerm && <p className={styles.subtitle}>+{Math.round(relicsTerm.value)} Wards</p>}
      </div>

      {held.length > 0 && (
        <div className={styles.summaryList} role="group" aria-label="Relic summary">
          {held.map((artifact) => {
            const faction = factionFor(factions, artifact.factionId);
            const showEffects = hasDiscreteTriggerEffects(artifact);
            const description = showEffects ? null : descriptionFor(artifact, faction);
            return (
              <div key={artifact.id} className={styles.summaryItem}>
                <p className={styles.summaryName}>{artifact.name}</p>
                {showEffects && (
                  <p className={styles.summaryWhen}>
                    {relicTriggerWhen(artifact.power, { factions })}:
                  </p>
                )}
                {showEffects && (
                  <EffectList
                    effects={artifact.power.effects}
                    artifacts={artifacts}
                    factions={factions}
                    endings={content.endings}
                    compact
                  />
                )}
                {description && <p className={styles.summaryOtherDesc}>{description}</p>}
              </div>
            );
          })}
        </div>
      )}

      <h3 className={styles.subHeading}>Artifacts</h3>

      {held.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <ul className={styles.grid}>
          {held.map((artifact) => {
            const isActive = artifact.power?.kind === 'active';
            const usable = isActive && canActivateRelic(run, artifact.id, content);
            const spent = isActive && run.relicState.spent.includes(artifact.id);
            return (
              <li key={artifact.id}>
                <ArtifactCard
                  artifact={artifact}
                  faction={factionFor(factions, artifact.factionId)}
                  showFlavour
                  onUseActive={usable ? () => onUseRelic(artifact.id) : undefined}
                  activeSpent={spent}
                />
              </li>
            );
          })}
        </ul>
      )}

      {lost.length > 0 && (
        <section className={styles.lostSection}>
          <h3 className={styles.subHeading}>Lost this run</h3>
          <ul className={styles.grid}>
            {lost.map((artifact) => (
              <li key={artifact.id}>
                <ArtifactCard
                  artifact={artifact}
                  faction={factionFor(factions, artifact.factionId)}
                  lost
                  showFlavour
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
