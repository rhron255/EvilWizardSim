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

/**
 * Endings are graded, not dropped.
 *
 * This used to map `rare → 'Uncommon'` and `legendary → 'Rare'` while the relic
 * grid two sections above printed its own rarity raw — so "Rare" on an ending
 * and "RARE" on a relic named different tiers on the same screen. These three
 * words collide with nothing: not the relic grid, not the Notoriety tiers, and
 * they read as how a biography is graded rather than as a drop table.
 */
const RARITY_LABEL = {
  common: 'Ordinary',
  rare: 'Storied',
  legendary: 'Fabled',
} as const;

export function EndingSlot({ ending, seen, current }: EndingSlotProps) {
  const classes = [styles.slot, seen ? styles.seen : styles.unseen, current ? styles.current : '']
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={classes}
      aria-label={
        seen
          ? `${ending.name} — ${ending.summary}`
          : `An ending you have not reached — ${ending.hint}`
      }
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
        {/* Locked slots say what leads here, not what happens here. The
            redaction bar on the NAME above is what reads as withheld; a second
            redacted line just made seven identical grey cards, whose only real
            text was a rarity word borrowed from the relic grid. */}
        <p className={styles.summary} data-hint={seen ? undefined : 'true'}>
          {seen ? ending.summary : ending.hint}
        </p>
      </div>

      <span className={styles.rarity}>{seen ? RARITY_LABEL[ending.rarity] : 'Unopened'}</span>
    </article>
  );
}
