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
 * every era's `artifactsGained` and the current `heldArtifactIds`, minus
 * whatever is still held.
 */

import { useEffect, useRef } from 'react';
import type { DefenseReadout } from '../../engine';
import type { Artifact, Faction, RunState } from '../../types';
import { ArtifactCard } from '../meta';
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
    ...run.heldArtifactIds,
  ]);
  const lost = [...everGained]
    .filter((id) => !run.heldArtifactIds.includes(id))
    .map((id) => artifacts.find((a) => a.id === id))
    .filter((a): a is Artifact => Boolean(a));

  const relicsTerm = defense?.terms.find((t) => t.label === 'Relics');

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={onBack}>
        ‹ Back to the decision
      </button>

      <h2 className={styles.heading} tabIndex={-1} ref={headingRef}>
        Your relics
      </h2>

      {relicsTerm && (
        <p className={styles.wards}>
          Relics add <span className="ew-num">{Math.round(relicsTerm.value)}</span> to your wards.
        </p>
      )}

      {held.length === 0 ? (
        <p className={styles.empty}>No relics recovered yet. The hero has nothing to fear from your walls.</p>
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
          <h3 className={styles.lostHeading}>Lost this run</h3>
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

      <button type="button" className={styles.back} onClick={onBack}>
        ‹ Back to the decision
      </button>
    </div>
  );
}
