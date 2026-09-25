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
 * grant — never in `eras`, see that field's doc comment in `types.ts`), and
 * the current `heldArtifactIds`, minus whatever is still held.
 *
 * *Amended to drop the offer card's "Whatever you choose" line, and to fold
 * the wards figure into this page's own heading.* A relic whose era-end
 * trigger fires no matter what gets picked used to print that line, unchanged,
 * on every single offer of the run — repetitive rather than informative once
 * a player had seen it once. This page now opens with a plain, scannable
 * summary instead: every held relic's name, then its EFFECT — the same terse
 * "+2 Standing · The Verdant Choir" notation `formatEffects` already renders
 * for an ordinary offer, not the fuller descriptive sentence `relicPowerText`
 * builds around it (the "At every era's end, if …:" framing and the gating
 * condition). That fuller sentence still appears once, on the full card
 * below under "Artifacts" — this summary is the quick version, not a second
 * copy of the same disclosure. A relic with no `Effect[]` of its own (a bare
 * passive rate change, or no power at all) has nothing terse to print, so it
 * falls back to `relicPowerText` or is named with no effect line at all. This
 * is deliberately NOT the same guarantee rule 1 makes for an offer card: a
 * player who never opens this page gets no pre-commit warning about an
 * era-end power, only the resolution screen's own after-the-fact "Your
 * relics" section — an accepted gap.
 */

import { useEffect, useRef } from 'react';
import type { DefenseReadout } from '../../engine';
import type { Artifact, Faction, RunState } from '../../types';
import { ArtifactCard, formatEffects, relicPowerText } from '../meta';
import styles from './RelicPage.module.css';

export type RelicPageProps = {
  run: RunState;
  artifacts: Artifact[];
  factions: Faction[];
  defense?: DefenseReadout | null;
  onBack(): void;
};

function factionFor(factions: Faction[], id: string): Faction | undefined {
  return factions.find((f) => f.id === id);
}

/**
 * The terse "+2 Standing · The Verdant Choir" reading of a relic's power, not
 * the descriptive sentence — only a `trigger` power carries a discrete
 * `Effect[]` to render that way. A `passive` rate change (the only other
 * kind authored so far) has no such list, so its own prose is the only
 * representation there is; `null` (no power) has nothing to say at all.
 */
function effectsFor(artifact: Artifact, faction: Faction | undefined): string | null {
  const power = artifact.power;
  if (!power) return null;
  const ctx = { factions: faction && [faction] };
  if (power.kind === 'trigger') return formatEffects(power.effects, ctx).join(', ');
  return relicPowerText(power, ctx);
}

export function RelicPage({ run, artifacts, factions, defense, onBack }: RelicPageProps) {
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

      <h2 className={styles.heading} tabIndex={-1} ref={headingRef}>
        Your Relics{relicsTerm ? ` (+${Math.round(relicsTerm.value)} Wards)` : ''}
      </h2>

      {held.length > 0 && (
        <ul className={styles.summaryList} aria-label="Relic summary">
          {held.map((artifact) => {
            const faction = factionFor(factions, artifact.factionId);
            const effects = effectsFor(artifact, faction);
            return (
              <li key={artifact.id} className={styles.summaryItem}>
                <p className={styles.summaryName}>{artifact.name}</p>
                {effects && <p className={styles.summaryEffect}>{effects}</p>}
              </li>
            );
          })}
        </ul>
      )}

      <h3 className={styles.subHeading}>Artifacts</h3>

      {held.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <ul className={styles.grid}>
          {held.map((artifact) => (
            <li key={artifact.id}>
              <ArtifactCard
                artifact={artifact}
                faction={factionFor(factions, artifact.factionId)}
                showFlavour
              />
            </li>
          ))}
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
