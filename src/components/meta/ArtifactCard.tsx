/**
 * One relic slot.
 *
 * Three states, and the differences between them are the whole collection UX:
 *
 *   discovered — glyph in ink, name, faction, effect
 *   lost       — recovered this run, then given up (Lichdom, a bad gamble)
 *   locked     — silhouette, name hidden behind a redaction. The gap is the point.
 *
 * Rarity is carried by weight, frame and ground texture, never by a new hue.
 * The only chromatic value in this game is the Notoriety tier and a relic is
 * not allowed to compete with it.
 */

import type { Artifact, Faction } from '../../types';
import { ArtifactGlyph, FactionGlyph } from './glyphs';
import styles from './ArtifactCard.module.css';

export type ArtifactCardProps = {
  artifact: Artifact;
  /** Undiscovered. Renders as a silhouette with the name withheld. */
  locked?: boolean;
  /** Held at some point this run, but not at the end. */
  lost?: boolean;
  faction?: Faction;
  /** Drops the effect line and tightens the box. Used on the ending card. */
  compact?: boolean;
};

const RARITY_CLASS = {
  common: styles.common,
  rare: styles.rare,
  legendary: styles.legendary,
} as const;

const RARITY_PIPS = { common: 1, rare: 2, legendary: 3 } as const;

export function ArtifactCard({ artifact, locked, lost, faction, compact }: ArtifactCardProps) {
  const classes = [
    styles.card,
    RARITY_CLASS[artifact.rarity],
    locked ? styles.locked : '',
    lost ? styles.lost : '',
    compact ? styles.compact : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={classes}
      aria-label={
        locked
          ? `Undiscovered relic of ${faction?.name ?? 'an unknown faction'}`
          : `${artifact.name}, ${artifact.rarity}${lost ? ', lost this run' : ''}`
      }
    >
      <div className={styles.well}>
        <ArtifactGlyph
          id={artifact.id}
          name={artifact.name}
          size={compact ? 30 : 36}
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
