/**
 * The lair grid — the centrepiece of the ending card.
 *
 * One tile per tenure, in the order they were held, so the grid reads as a
 * career ladder rather than a set. Deliberately laid out as a trophy case
 * (glyph over name over dates, four across) rather than as list rows: the
 * reference game's club grid was its most-shared object precisely because it
 * read as a shelf of things at a glance.
 *
 * The final lair is marked, quietly, because that is where the biography ends.
 *
 * LAYOUT NOTE. The markup and the stylesheet had drifted apart: the CSS
 * described a `well / body / tierRow` card, the JSX emitted four bare children
 * into a two-column grid. The rung numeral and the "Last" badge landed in the
 * same auto-placed cell with no box between them and rendered as `ILAST`, and
 * the name and the dates were dealt into side-by-side columns and collided.
 * Every element on this tile now has an explicit home.
 */

import type { LairTenure } from './tenure';
import { roman } from './tenure';
import { LairGlyph } from './glyphs';
import styles from './LairGrid.module.css';

export type LairGridProps = {
  tenures: LairTenure[];
  /** One-line blurb under each name. Off by default — it doubles the height. */
  showBlurb?: boolean;
};

export function LairGrid({ tenures, showBlurb = false }: LairGridProps) {
  return (
    <ol className={styles.grid}>
      {tenures.map((t, i) => (
        <li
          key={`${t.lair.id}-${i}`}
          className={t.last ? `${styles.card} ${styles.last}` : styles.card}
        >
          <span className={styles.well} aria-hidden>
            <LairGlyph tier={t.lair.tier} size={28} className={styles.glyph} />
          </span>

          <div className={styles.body}>
            <div className={styles.tierRow}>
              <span className={styles.tier}>
                Tier <span className={styles.tierNum}>{roman(t.lair.tier + 1)}</span>
              </span>
              {t.last ? <span className={styles.lastTag}>Last</span> : null}
            </div>

            <h4 className={styles.name}>{t.lair.name}</h4>

            <p className={styles.span}>
              <span className={styles.spanPart}>
                <span className={styles.spanLabel}>Aged</span>
                <span className={styles.num}>
                  {t.fromAge}
                  {'–'}
                  {t.toAge}
                </span>
              </span>
              <span className={styles.dot} aria-hidden>
                ·
              </span>
              <span className={styles.spanPart}>
                <span className={styles.num}>{t.eras}</span>
                <span className={styles.unit}>{t.eras === 1 ? 'era' : 'eras'}</span>
              </span>
            </p>
          </div>

          {showBlurb ? <p className={styles.blurb}>{t.lair.blurb}</p> : null}
        </li>
      ))}
    </ol>
  );
}
