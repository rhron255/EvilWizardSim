/**
 * The hero element: an append-only table of the wizard's life, one row per era.
 *
 * "By the late run the player is looking at a table with fifteen seasons in it,
 * and *that* is what makes quitting expensive" — wiki/06_reference_analysis.md,
 * principle 5. Everything here serves legibility at twenty rows: fixed column
 * widths, tabular figures, a pinned header, and an aging gradient that pushes
 * the early eras back without ever hiding them.
 */

import { useEffect, useRef } from 'react';
import type { Artifact, EraRecord, Lair } from '../../types';
import { LedgerRow } from './LedgerRow';
import styles from './Ledger.module.css';

export type LedgerProps = {
  eras: EraRecord[];
  lairs: Lair[];
  artifacts: Artifact[];
};

export function Ledger({ eras, lairs, artifacts }: LedgerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(-1);

  // The live row is the bottom row, so the ledger opens at the bottom — a long
  // run must never load with its current era off-screen. First paint jumps;
  // every later append eases down so the new line is seen arriving.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const first = lastCount.current === -1;
    const appended = eras.length > lastCount.current;
    lastCount.current = eras.length;
    if (!appended) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: el.scrollHeight, behavior: first || reduce ? 'auto' : 'smooth' });
  }, [eras.length]);

  const lastIndex = eras.length - 1;

  return (
    <section className={styles.wrap} aria-labelledby="ledger-heading">
      <header className={styles.head}>
        <h2 id="ledger-heading" className={styles.heading}>
          The Ledger
        </h2>
        <span className={`${styles.count} ew-num`}>
          {eras.length} {eras.length === 1 ? 'era' : 'eras'}
        </span>
      </header>

      <div className={styles.frame}>
        <div className={styles.scroll} ref={scrollRef} tabIndex={0} role="region" aria-label="Era history, scrollable">
          <table className={styles.table}>
            <caption className={styles.srOnly}>
              One row per era: age, lair, notoriety, followers, artifacts gained and the deed.
            </caption>
            {/* Widths live on the header cells, not a colgroup: dropping the
                Lair column on narrow screens then stays a plain display:none
                instead of a positional remap of <col> elements. */}
            <thead className={styles.thead}>
              <tr>
                <th scope="col" className={`${styles.th} ${styles.thAge}`}>
                  Age
                </th>
                <th scope="col" className={`${styles.th} ${styles.thLair}`}>
                  Lair
                </th>
                <th scope="col" className={`${styles.th} ${styles.thNot}`}>
                  <span className={styles.wide}>Notoriety</span>
                  <span className={styles.tight}>Not.</span>
                </th>
                <th scope="col" className={`${styles.th} ${styles.thNum} ${styles.thFol}`}>
                  <span className={styles.wide}>Followers</span>
                  <span className={styles.tight}>Fol.</span>
                </th>
                <th scope="col" className={`${styles.th} ${styles.thCentre} ${styles.thArt}`}>
                  <span className={styles.wide}>Artifacts</span>
                  <span className={styles.tight}>Rel.</span>
                </th>
                <th scope="col" className={styles.th}>
                  Deeds
                </th>
              </tr>
            </thead>
            <tbody className={styles.rows}>
              {eras.map((era, i) => (
                <LedgerRow
                  key={era.eraIndex}
                  era={era}
                  lair={lairs.find((l) => l.id === era.lairId)}
                  artifacts={artifacts}
                  isCurrent={i === lastIndex}
                  ageRatio={eras.length > 1 ? i / (eras.length - 1) : 1}
                />
              ))}
              {eras.length === 0 && (
                <tr>
                  <td className={styles.empty} colSpan={6}>
                    Nothing yet. The first era writes the first line.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.fade} aria-hidden="true" />
      </div>
    </section>
  );
}
