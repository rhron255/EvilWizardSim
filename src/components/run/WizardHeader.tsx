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

import { useId, useState } from 'react';
import type { Faction, Lair, RunState } from '../../types';
import { tierColor, tierFor } from '../../theme/tokens';
import { NotorietyBadge } from './NotorietyBadge';
import { allegiancesFor, sealSentence, sealWarningFor } from './allegiances';
import { siegeFor, stakesFor } from './stakes';
import styles from './WizardHeader.module.css';

export type WizardHeaderProps = {
  run: RunState;
  lairs: Lair[];
  factions: Faction[];
  hasAscensionTrophy: boolean;
  /**
   * Current defence. Supplied by the screen rather than computed here so this
   * component stays presentational; `null` hides the siege readout entirely.
   */
  defense?: number | null;
};

export function WizardHeader({
  run,
  lairs,
  factions,
  hasAscensionTrophy,
  defense,
}: WizardHeaderProps) {
  // Captions are tap-to-reveal on a phone (they cost ~200px) and always shown
  // from 720px up. The VALUE keeps its denominator either way, so a lethal
  // threshold is never something you had to tap to find out about.
  const [openStat, setOpenStat] = useState<string | null>(null);
  const captionId = useId();
  const stakes = stakesFor(run);
  const allegiances = allegiancesFor(run, factions);
  const seal = sealWarningFor(run);
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
        {stakes.map((stake) => {
          const open = openStat === stake.label;
          return (
            <div
              className={styles.stat}
              key={stake.label}
              data-tone={stake.tone}
              data-open={open ? 'true' : undefined}
            >
              <button
                type="button"
                className={styles.statButton}
                aria-expanded={open}
                aria-controls={`${captionId}-${stake.label}`}
                onClick={() => setOpenStat(open ? null : stake.label)}
              >
                <dt className={styles.statLabel}>{stake.label}</dt>
                <dd className={`${styles.statValue} ew-num`}>{stake.value}</dd>
              </button>
              {/* A number nobody can act on is decoration, and one that counts
                  toward an ending is an undisclosed consequence. */}
              <dd className={styles.statCaption} id={`${captionId}-${stake.label}`}>
                {stake.caption}
              </dd>
            </div>
          );
        })}
      </dl>

      {/* Standing was invisible in the run screen while being the trigger for
          the second most common ending. It also moves by contagion, so it can
          be pushed to lethal by cards that never named the faction. */}
      <ul className={styles.allegiances} aria-label="Faction standing">
        {allegiances.map((a) => (
          <li key={a.id} className={styles.allegiance} data-tone={a.tone} title={`${a.name} — ${a.note}`}>
            <span className={styles.allegianceName}>{a.short}</span>
            <span className={`${styles.allegianceValue} ew-num`}>
              {a.standing > 0 ? `+${a.standing}` : a.standing}
            </span>
            <span className={styles.allegianceTrack} aria-hidden="true">
              <span
                className={styles.allegianceFill}
                style={{ '--ratio': Math.abs(a.ratio) } as React.CSSProperties}
                data-sign={a.ratio < 0 ? 'neg' : 'pos'}
              />
            </span>
          </li>
        ))}
      </ul>

      {seal && (
        <p className={styles.seal} data-armed={seal.armed ? 'true' : undefined}>
          {sealSentence(seal)}
        </p>
      )}

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
