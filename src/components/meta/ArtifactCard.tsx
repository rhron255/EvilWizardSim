/**
 * One relic slot.
 *
 * Three states, and the differences between them are the whole collection UX:
 *
 *   discovered — glyph in ink, name, faction, effect
 *   lost       — recovered this run, then given up (Lichdom, a bad gamble)
 *   locked     — silhouette, name hidden behind a redaction. The gap is the point.
 *
 * Rarity is carried by GEOMETRY — frame, elevation, glyph size, type scale —
 * with one exception: a legendary gets a tier-coloured edge. That exception is
 * deliberate and bounded. The ladder used to be a 2.8%-alpha hatch, a 1px inset
 * ring and a font-weight step, which measured as "a legendary arrives looking
 * like a common with a different word on it" and was invisible on a phone.
 *
 * Rule 3 still holds because the gold is an EDGE, never a fill or a glow, and
 * only four of the thirty relics are legendary. On the ending card, where the
 * tier colour is already spent three times over, the edge is suppressed — see
 * `.card[data-rarity='legendary']` in the stylesheet.
 */

import type { Artifact, Faction } from '../../types';
import { ArtifactGlyph, CornerMarks, FactionGlyph } from './glyphs';
import styles from './ArtifactCard.module.css';

export type ArtifactCardProps = {
  artifact: Artifact;
  /** Undiscovered. Renders as a silhouette with the name withheld. */
  locked?: boolean;
  /** Held at some point this run, but not at the end. */
  lost?: boolean;
  /**
   * First time this player has ever held it. Same string as the resolution
   * overlay uses at the moment of pickup — one concept, one vocabulary.
   */
  isNew?: boolean;
  faction?: Faction;
  /** Drops the effect line and tightens the box. Used on the ending card. */
  compact?: boolean;
};

const RARITY_PIPS = { common: 1, rare: 2, legendary: 3 } as const;

/** The glyph grows with rank. Geometry the eye reads before any word. */
const RARITY_GLYPH = { common: 0, rare: 4, legendary: 9 } as const;

export function ArtifactCard({ artifact, locked, lost, isNew, faction, compact }: ArtifactCardProps) {
  const classes = [
    styles.card,
    locked ? styles.locked : '',
    lost ? styles.lost : '',
    isNew && !locked ? styles.fresh : '',
    compact ? styles.compact : '',
  ]
    .filter(Boolean)
    .join(' ');

  // One attribute drives the whole ladder, and the resolution overlay's relic
  // row reads the same one — two renderers, one vocabulary.
  const glyphSize = (compact ? 30 : 36) + (locked ? 0 : RARITY_GLYPH[artifact.rarity]);

  return (
    <article
      className={classes}
      data-rarity={artifact.rarity}
      aria-label={
        locked
          ? `Undiscovered relic of ${faction?.name ?? 'an unknown faction'}`
          : `${artifact.name}, ${artifact.rarity}${isNew ? ', never seen before' : ''}${lost ? ', lost this run' : ''}`
      }
    >
      {/* Only the top rank gets the ceremony. */}
      {artifact.rarity === 'legendary' && !locked && (
        <CornerMarks className={styles.corner} inset={6} length={11} />
      )}

      <div className={styles.well}>
        <ArtifactGlyph
          id={artifact.id}
          name={artifact.name}
          size={glyphSize}
          locked={locked}
          className={styles.glyph}
        />
      </div>

      <div className={styles.body}>
        <header className={styles.head}>
          {locked ? (
            <span className={styles.redaction} aria-hidden />
          ) : (
            <h4 className={styles.name}>{artifact.name}</h4>
          )}
          {isNew && !locked && <span className={styles.freshBadge}>Never seen before</span>}
          <span className={styles.pips} aria-hidden>
            {Array.from({ length: RARITY_PIPS[artifact.rarity] }, (_, i) => (
              <i key={i} className={styles.pip} />
            ))}
          </span>
        </header>

        <p className={styles.meta}>
          {faction ? (
            <>
              <FactionGlyph id={faction.id} size={13} className={styles.factionMark} />
              {/* The article is dead weight at this size — every faction has one. */}
              <span className={styles.factionName}>{faction.name.replace(/^The /, '')}</span>
            </>
          ) : (
            <span className={styles.factionName}>{artifact.factionId.replace(/_/g, ' ')}</span>
          )}
          <span className={styles.dot} aria-hidden>
            ·
          </span>
          <span className={styles.rarity}>{locked ? 'Undiscovered' : artifact.rarity}</span>
          {lost ? (
            <>
              <span className={styles.dot} aria-hidden>
                ·
              </span>
              <span className={styles.lostTag}>lost</span>
            </>
          ) : null}
        </p>

        {!compact && (
          <p className={styles.effect}>
            {locked ? <span className={styles.redactionLine} aria-hidden /> : artifact.effect}
          </p>
        )}
      </div>
    </article>
  );
}
