/**
 * Who this is happening to, and the prize it is not happening to.
 *
 * The one piece of the run screen visible above BOTH tabs (issue #18) — era,
 * lair, name, epithet, age, undeath, the Notoriety badge, the Ascension slot.
 * Everything that used to share this header with it (stats, standing, the
 * reprisal warning, the wards readout) now lives inside the Decision or
 * Career tabpanel instead, because none of it is identity: it is what has
 * happened to this wizard, not who they are.
 *
 * Two deliberate omissions, carried over unchanged from the header this
 * replaces:
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
import styles from './Masthead.module.css';

export type MastheadProps = {
  run: RunState;
  lairs: Lair[];
  hasAscensionTrophy: boolean;
};

export function Masthead({ run, lairs, hasAscensionTrophy }: MastheadProps) {
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

        {/* Name and epithet read as ONE sentence — "Malachar the Unpaid, the
            Unpleasant." — so both are rendered inline and wrap as text rather
            than as blocks. Laid out as flex items they wrapped whole, which
            stranded the comma at the start of the second line. */}
        <div className={styles.nameLine}>
          {/* The one dynamic value here: how much name there is. The stylesheet
              turns it into a type size that fits the column instead of clipping —
              the name is the identity anchor and must render in full. */}
          <h1
            className={styles.name}
            style={{ '--name-len': run.wizardName.length } as React.CSSProperties}
          >
            {run.wizardName}
          </h1>
          <span className={styles.epithet}>, {run.epithet}.</span>

          {/* What you ARE, once you have paid for it. Inline in the identity
              line so it costs no vertical space on the one screen that has
              none — and beside the epithet, because it is the same kind of
              fact: what the world would call you. */}
          {run.isLich && (
            <>
              {' '}
              <span className={styles.dot} aria-hidden="true">
                ·
              </span>{' '}
              <span className={styles.undying}>Undying</span>
            </>
          )}
        </div>

        <p className={styles.ageLine}>
          <span className={`${styles.age} ew-num`}>Age {run.age}</span>
        </p>
      </div>

      <div className={styles.right}>
        <NotorietyBadge value={run.notoriety} animateFrom={previous} size="row" />

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
    </header>
  );
}
