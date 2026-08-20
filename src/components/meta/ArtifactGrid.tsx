/**
 * A grid of relic slots.
 *
 * Deliberately dumb: it lays out whatever entries it is handed, in the order it
 * is handed them, and never filters. The collection screen passes all thirty
 * slots including the locked ones — the caller decides what is visible, so the
 * "all slots from run one" rule can't be quietly softened here.
 */

import type { Artifact, Faction } from '../../types';
import { ArtifactCard } from './ArtifactCard';
import styles from './ArtifactGrid.module.css';

export type ArtifactGridEntry = {
  artifact: Artifact;
  locked?: boolean;
  lost?: boolean;
};

export type ArtifactGridProps = {
  entries: ArtifactGridEntry[];
  factions?: Faction[];
  compact?: boolean;
  /** Minimum column width in px. Lower for the denser collection view. */
  minColumn?: number;
  /** Shown in place of the grid when there is nothing to lay out. */
  emptyNote?: string;
};

export function ArtifactGrid({
  entries,
  factions,
  compact,
  minColumn = 280,
  emptyNote,
}: ArtifactGridProps) {
  if (entries.length === 0) {
    return emptyNote ? <p className={styles.empty}>{emptyNote}</p> : null;
  }

  return (
    <div
      className={compact ? `${styles.grid} ${styles.compact}` : styles.grid}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minColumn}px, 1fr))` }}
    >
      {entries.map(({ artifact, locked, lost }) => (
        <ArtifactCard
          key={artifact.id}
          artifact={artifact}
          locked={locked}
          lost={lost}
          compact={compact}
          faction={factions?.find((f) => f.id === artifact.factionId)}
        />
      ))}
    </div>
  );
}
