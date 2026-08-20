/**
 * Aligned lifetime totals.
 *
 * A hairline-separated grid: label above, figure below, tabular figures
 * throughout so a column of numbers doesn't jitter. The separators are drawn by
 * letting the container's line colour show through a 1px gap — cheaper and
 * crisper than borders, which double up at the seams.
 */

import styles from './StatBlock.module.css';

export type Stat = {
  label: string;
  value: string | number;
  /** Small line under the figure — a tier name, a qualifier. */
  hint?: string;
  /** Carries the scarce colour. Use for at most one stat per block. */
  accent?: boolean;
};

export type StatBlockProps = {
  stats: Stat[];
  /** Preferred column count at desktop width. Collapses on narrow screens. */
  columns?: number;
  /** Larger figures, for the top of the ending card. */
  emphasis?: boolean;
  className?: string;
};

export function StatBlock({ stats, columns = 4, emphasis, className }: StatBlockProps) {
  const classes = [styles.block, emphasis ? styles.emphasis : '', className].filter(Boolean).join(' ');

  return (
    <dl
      className={classes}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {stats.map((s) => (
        <div key={s.label} className={s.accent ? `${styles.cell} ${styles.accent}` : styles.cell}>
          <dt className={styles.label}>{s.label}</dt>
          <dd className={styles.value}>{s.value}</dd>
          {s.hint ? <p className={styles.hint}>{s.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}
