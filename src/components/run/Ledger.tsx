/**
 * The hero element: an append-only table of the wizard's life, one row per era.
 *
 * "By the late run the player is looking at a table with fifteen seasons in it,
 * and *that* is what makes quitting expensive" — wiki/06_reference_analysis.md,
 * principle 5. Everything here serves legibility at twenty rows: fixed column
 * widths, tabular figures, a pinned header, and an aging gradient that pushes
 * the early eras back without ever hiding them.
 *
 * On a phone the frame is capped at three rows, because the order
 * header -> ledger -> offer is fixed (wiki/01 §3) and every pixel this table
 * spends is a pixel the choice cards spend below the fold. The cap is a
 * SCROLLPORT height, never a slice of the data: all the rows are rendered, the
 * internal scroll is pinned to the newest one, and the era count in the corner
 * is the toggle that opens the frame to full height.
 */

import { useEffect, useId, useRef } from 'react';
import type { Artifact, EraRecord, Lair } from '../../types';
import { LedgerRow } from './LedgerRow';
import styles from './Ledger.module.css';

export type LedgerProps = {
  eras: EraRecord[];
  lairs: Lair[];
  artifacts: Artifact[];
  /**
   * Collapsed by default, and only ON A PHONE does collapsed mean anything —
   * the stylesheet caps the frame at three rows below 700px and leaves the
   * desktop height alone. The rows are never removed from the DOM, so the
   * record is still whole to a screen reader and to Ctrl-F; what is capped is
   * how much of the screen it may spend before the choice cards.
   *
   * Controlled by the caller rather than owned here (issue #18): the Career
   * tab this now lives in fully unmounts when the Decision tab is selected —
   * only the active tabpanel's content is ever mounted, so it can never run a
   * `window` keydown listener while hidden. A local `useState` would have
   * silently discarded an explicit "show every era" tap the moment the
   * player switched tabs and switched back, which is the same shape of loss
   * rule 2 ("the ledger appends and never resets") exists to prevent, one
   * layer up from the row data itself. `RunScreen` is the parent that
   * actually survives a tab switch, so it is where this state now lives.
   */
  expanded: boolean;
  onToggleExpanded(): void;
};

export function Ledger({ eras, lairs, artifacts, expanded, onToggleExpanded }: LedgerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(-1);
  const scrollId = useId();

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

  // Changing the cap changes the scrollport height. The browser clamps
  // scrollTop on its own, but only downwards — collapsing from a tall frame can
  // still leave the newest era above the fold of the frame, so re-pin it. The
  // current row staying visible is the whole reason the ledger sits up here.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
  }, [expanded]);

  const lastIndex = eras.length - 1;
  const count = `${eras.length} ${eras.length === 1 ? 'era' : 'eras'}`;

  return (
    <section className={styles.wrap} aria-labelledby="ledger-heading" data-expanded={expanded ? 'true' : undefined}>
      <header className={styles.head}>
        <h2 id="ledger-heading" className={styles.heading}>
          The Ledger
        </h2>
        {eras.length === 0 ? (
          <span className={`${styles.count} ew-num`}>{count}</span>
        ) : (
          <button
            type="button"
            className={`${styles.count} ${styles.countButton} ew-num`}
            onClick={onToggleExpanded}
            aria-expanded={expanded}
            aria-controls={scrollId}
            title={expanded ? 'Show fewer eras' : 'Show every era'}
          >
            {count}
            <span className={styles.chevron} aria-hidden="true">
              ▾
            </span>
          </button>
        )}
      </header>

      <div className={styles.frame}>
        <div
          className={styles.scroll}
          id={scrollId}
          ref={scrollRef}
          tabIndex={0}
          role="region"
          aria-label="Era history, scrollable"
        >
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
            </tbody>
          </table>

          {/* Outside the table on purpose. As a `colSpan={6}` row it invented a
              sixth column on phones, where the Lair column is hidden and only
              five exist — the header then covered five and the pinned header
              background stopped short of the frame. It is also half the height
              here, which matters on a screen where the choices sit below. */}
          {eras.length === 0 && (
            <p className={styles.empty}>Nothing yet. The first era writes the first line.</p>
          )}
        </div>
        <div className={styles.fade} aria-hidden="true" />
      </div>
    </section>
  );
}
