/**
 * One of the ending slots in the collection, one per ending.
 *
 * Same rule as the relic grid: every slot is visible from run one, and the ones
 * you have not reached withhold their name. An unseen ending should read as a
 * door you have not opened, not as an absence.
 */

import type { Ending } from '../../types';
import { EndingGlyph } from './glyphs';
import styles from './EndingSlot.module.css';

export type EndingSlotProps = {
  ending: Ending;
  seen: boolean;
  /**
   * This is the ending the player has just reached: the career that ended on
   * it is the one they opened the Necrolexicon from (`App` passes the finished
   * run's ending down; a visit from the title passes none).
   *
   * Required, not optional, because optional is how it went unwired: the
   * style shipped with no caller ever passing it (CLAUDE.md failure mode 2).
   *
   * The slot says so in words as well as colour — a "Just reached" label on
   * the card and in its accessible name — since the tier border and tier
   * glyph alone are a cue only a player who can tell the colours apart gets.
   */
  current: boolean;
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
  const classes = [
    styles.slot,
    seen ? styles.seen : styles.unseen,
    seen && current ? styles.current : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={classes}
      aria-label={
        seen
          ? `${current ? 'Just reached: ' : ''}${ending.name} — ${ending.summary}`
          : `An ending you have not reached — ${ending.hint}`
      }
    >
      <div className={styles.well}>
        <EndingGlyph id={ending.id} size={30} locked={!seen} className={styles.glyph} />
      </div>

      <div className={styles.body}>
        {/* Words, not only the tier border: the label is the cue a player who
            cannot tell the tier colour from the line colour still gets. Only
            a seen slot can be current — a career's ending is recorded before
            this screen can open — so a locked door never claims it. */}
        {seen && current ? (
          <p className={styles.currentLabel} data-current-label>
            Just reached
          </p>
        ) : null}
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
