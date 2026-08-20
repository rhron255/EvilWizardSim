/**
 * Who this is happening to, and the prize it is not happening to.
 *
 * Two deliberate omissions:
 *   - The phase is never named. The decline works because a number is quietly
 *     going the wrong way, not because the UI announces a losing half
 *     (wiki/04_operational_behaviors-1.md — "do not add a doom meter").
 *   - The empty Ascension slot is never explained. It sits there from era one
 *     to the last, unlabelled beyond its name, because the near-miss is the
 *     point (wiki/04_operational_behaviors-1.md, Near-Miss Tuning).
 */

import type { Lair, RunState } from '../../types';
import { tierColor, tierFor } from '../../theme/tokens';
import { NotorietyBadge } from './NotorietyBadge';
import { siegeFor, stakesFor } from './stakes';
import styles from './WizardHeader.module.css';

export type WizardHeaderProps = {
  run: RunState;
  lairs: Lair[];
  hasAscensionTrophy: boolean;
  /**
   * Current defence. Supplied by the screen rather than computed here so this
   * component stays presentational; `null` hides the siege readout entirely.
   */
  defense?: number | null;
};

export function WizardHeader({ run, lairs, hasAscensionTrophy, defense }: WizardHeaderProps) {
  const stakes = stakesFor(run);
  const siege = defense == null ? null : siegeFor(run, defense);
  const lair = lairs.find((l) => l.id === run.lairId);
  const previous = run.eras.length > 1 ? run.eras[run.eras.length - 2].notoriety : undefined;
  const tier = tierFor(run.notoriety);

  return (
    <header
      className={styles.header}
      style={{ '--ew-tier': tierColor[tier.id] } as React.CSSProperties}
    >
      <div className={styles.identity}>
        <p className={styles.eyebrow}>
          <span className="ew-num">
            Era {Math.min(run.eraIndex + 1, run.eraCount)} of {run.eraCount}
          </span>
          <span className={styles.dot} aria-hidden="true">
            ·
          </span>
          <span className={styles.lair} title="A better lair wards off the hero">
            {lair?.name ?? run.lairId}
          </span>
        </p>

        {/* The one dynamic value here: how much name there is. The stylesheet
            turns it into a type size that fits the column instead of clipping —
            the name is the identity anchor and must render in full. */}
        <h1
          className={styles.name}
          style={{ '--name-len': run.wizardName.length } as React.CSSProperties}
        >
          {run.wizardName}
        </h1>

        <p className={styles.epithet}>
          {run.epithet}
          <span className={styles.dot} aria-hidden="true">
            ·
          </span>
          <span className={`${styles.age} ew-num`}>Age {run.age}</span>
        </p>
      </div>

      <div className={styles.right}>
        <NotorietyBadge value={run.notoriety} animateFrom={previous} />

        <div
          className={styles.trophy}
          data-earned={hasAscensionTrophy ? 'true' : undefined}
          title="Ascension"
        >
          <span className={styles.trophySlot} aria-hidden="true">
            <svg viewBox="0 0 24 24" className={styles.trophyMark} focusable="false">
              <path
                d="M12 2.5 14.6 9l6.9.4-5.3 4.4 1.7 6.7L12 16.9 6.1 20.5l1.7-6.7L2.5 9.4 9.4 9z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className={styles.trophyLabel}>Ascension</span>
        </div>
      </div>

      <dl className={styles.stats}>
        {stakes.map((stake) => (
          <div className={styles.stat} key={stake.label} data-tone={stake.tone}>
            <dt className={styles.statLabel}>{stake.label}</dt>
            <dd className={`${styles.statValue} ew-num`}>{stake.value}</dd>
            {/* The caption is the whole point: a number nobody can act on is
                just decoration, and one that silently counts toward an ending
                is an undisclosed consequence. */}
            <dd className={styles.statCaption}>{stake.caption}</dd>
          </div>
        ))}
      </dl>

      {siege && (
        <p className={styles.siege} data-tone={siege.tone}>
          <span className={styles.siegeLabel}>Wards</span>
          <span className={`${styles.siegeValue} ew-num`}>{siege.wards}</span>
          <span className={styles.siegeVs} aria-hidden="true">
            against
          </span>
          <span className={styles.siegeLabel}>The hero</span>
          <span className={`${styles.siegeValue} ew-num`}>{siege.threat}</span>
        </p>
      )}
    </header>
  );
}
