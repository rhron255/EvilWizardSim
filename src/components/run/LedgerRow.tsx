/**
 * One era, one row. Append-only — nothing here is ever rewritten.
 *
 * `ageRatio` runs 0 (oldest row in the ledger) to 1 (most recent). It drives
 * the aging gradient: early eras sink toward the page, recent ones sit up.
 * That gradient is what makes a long ledger read as an accumulating record
 * rather than a list (wiki/06_reference_analysis.md, principle 5).
 */

import type { Artifact, EraRecord, Lair } from '../../types';
import { signed } from './effectText';
import styles from './LedgerRow.module.css';

export type LedgerRowProps = {
  era: EraRecord;
  lair: Lair | undefined;
  artifacts: Artifact[];
  isCurrent: boolean;
  /** 0 = oldest row, 1 = newest. */
  ageRatio: number;
};

export function LedgerRow({ era, lair, artifacts, isCurrent, ageRatio }: LedgerRowProps) {
  const gained = era.artifactsGained
    .map((id) => artifacts.find((a) => a.id === id))
    .filter((a): a is Artifact => Boolean(a));

  const gainedNames = gained.length
    ? gained.map((a) => a.name).join(', ')
    : era.artifactsGained.join(', ');

  const delta = era.notorietyDelta;

  return (
    <tr
      className={styles.row}
      data-current={isCurrent ? 'true' : undefined}
      data-outcome={era.outcome}
      style={{ '--fade': ageRatio.toFixed(3) } as React.CSSProperties}
    >
      <td className={`${styles.cell} ${styles.age} ew-num`}>{era.age}</td>

      <td className={`${styles.cell} ${styles.lair}`}>
        <span className={styles.clip} title={lair?.name ?? era.lairId}>
          {lair?.name ?? era.lairId}
        </span>
      </td>

      <td className={`${styles.cell} ${styles.notoriety} ew-num`}>
        <span className={styles.notValue}>{era.notoriety}</span>
        <span className={styles.notDelta} data-dir={delta > 0 ? 'up' : delta < 0 ? 'down' : 'none'}>
          {delta === 0 ? '·' : signed(delta)}
        </span>
      </td>

      <td className={`${styles.cell} ${styles.followers} ew-num`}>
        {era.followers.toLocaleString('en-US')}
      </td>

      {/* Marks, not names: the ledger is a record of shape, and a relic name
          long enough to be interesting is long enough to break the column.
          The names live on the resolution card and the ending screen. */}
      <td className={`${styles.cell} ${styles.artifacts}`}>
        {era.artifactsGained.length === 0 ? (
          <span className={styles.none} aria-hidden="true">
            —
          </span>
        ) : (
          <span className={styles.relic} title={gainedNames} aria-label={gainedNames}>
            {Array.from({ length: Math.min(4, era.artifactsGained.length) }, (_, i) => (
              <span key={i} className={styles.relicMark} aria-hidden="true">
                ◆
              </span>
            ))}
          </span>
        )}
      </td>

      <td className={`${styles.cell} ${styles.deeds}`}>
        <span className={styles.clip} title={era.deedSummary}>
          {era.deedSummary}
        </span>
        <span className={styles.deedLair} aria-hidden="true">
          {lair?.name ?? era.lairId}
        </span>
      </td>
    </tr>
  );
}
