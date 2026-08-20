/**
 * One of the seven ending slots in the collection.
 *
 * Same rule as the relic grid: all seven are visible from run one, and the ones
 * you have not reached withhold their name. An unseen ending should read as a
 * door you have not opened, not as an absence.
 */

import type { Ending } from '../../types';
import { EndingGlyph } from './glyphs';
import styles from './EndingSlot.module.css';

export type EndingSlotProps = {
  ending: Ending;
  seen: boolean;
  /** Highlighted as the one just reached, on the ending screen. */
  current?: boolean;
};

const RARITY_LABEL = {
  common: 'Common',
  rare: 'Uncommon',
  legendary: 'Rare',
} as const;

export function EndingSlot({ ending, seen, current }: EndingSlotProps) {
  const classes = [styles.slot, seen ? styles.seen : styles.unseen, current ? styles.current : '']
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={classes}
      aria-label={seen ? `${ending.name} — ${ending.summary}` : 'An ending you have not reached'}
    >
      <div className={styles.well}>
        <EndingGlyph id={ending.id} size={30} locked={!seen} className={styles.glyph} />
      </div>

      <div className={styles.body}>
        {seen ? (
          <h4 className={styles.name}>{ending.name}</h4>
        ) : (
          <span className={styles.redaction} aria-hidden />
        )}
        <p className={styles.summary}>
          {seen ? ending.summary : <span className={styles.redactionLine} aria-hidden />}
        </p>
      </div>

      <span className={styles.rarity}>{RARITY_LABEL[ending.rarity]}</span>
    </article>
  );
}
