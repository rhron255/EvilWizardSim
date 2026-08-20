/**
 * The beat between the choice and the next era.
 *
 * For a gamble it shows the roll landing against the odds the player was shown
 * before they committed — same numbers, same rail, now with the result on it.
 * That is the whole trick: printed odds plus a visible roll turn a coin flip
 * into a decision the player authored (wiki/06_reference_analysis.md #4).
 *
 * It is a beat, not a chore: roughly a second of staged reveal, dismissible at
 * any point with a click or Enter.
 */

import { useEffect, useId, useRef } from 'react';
import type { Artifact, Faction } from '../../types';
import { tierColor, tierFor, tierGlow } from '../../theme/tokens';
import type { Resolution } from './resolution';
import { EffectList } from './EffectList';
import { endingName, formatOdds } from './effectText';
import { NotorietyBadge } from './NotorietyBadge';
import styles from './ResolutionOverlay.module.css';

export type ResolutionOverlayProps = {
  resolution: Resolution;
  artifacts: Artifact[];
  factions: Faction[];
  onContinue(): void;
};

const OUTCOME_WORD: Record<Resolution['outcome'], string> = {
  success: 'Success',
  failure: 'Failure',
  deterministic: 'Resolved',
};

export function ResolutionOverlay({
  resolution,
  artifacts,
  factions,
  onContinue,
}: ResolutionOverlayProps) {
  const headingId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    continueRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
        event.preventDefault();
        onContinue();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onContinue]);

  const { outcome, roll, odds, eraRecord, notorietyDelta, tierCrossed } = resolution;
  const showRoll = outcome !== 'deterministic' && roll !== undefined && odds !== undefined;
  const notoriety = eraRecord.notoriety;
  const cardTier = tierCrossed ?? tierFor(notoriety);

  return (
    // Dismiss anywhere. The button below carries the keyboard affordance.
    <div
      className={styles.scrim}
      onClick={onContinue}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <div
        className={styles.card}
        data-outcome={outcome}
        style={
          {
            // The card speaks with the tier the badge is *about to* show, so the
            // focus ring, the crossing line and the digits are one color, never two.
            '--ew-tier': tierColor[cardTier.id],
            '--ew-tier-glow': tierGlow[cardTier.id],
          } as React.CSSProperties
        }
      >
        <div className={styles.top}>
          <div className={styles.verdict}>
            <p className={styles.outcome} id={headingId}>
              {OUTCOME_WORD[outcome]}
            </p>
            <p className={styles.era}>
              <span className="ew-num">Era {eraRecord.eraIndex + 1}</span>
              <span className={styles.dot} aria-hidden="true">
                ·
              </span>
              <span className="ew-num">Age {eraRecord.age}</span>
            </p>
          </div>

          <NotorietyBadge
            value={notoriety}
            animateFrom={notoriety - notorietyDelta}
            celebrate={Boolean(tierCrossed?.celebrate)}
          />
        </div>

        {showRoll && (
          <div className={styles.rollBlock}>
            <div className={styles.rail} aria-hidden="true">
              <span className={styles.railSuccess} style={{ width: `${odds * 100}%` }} />
              <span className={styles.railTick} style={{ left: `${odds * 100}%` }} />
              <span className={styles.needle} style={{ '--roll': roll } as React.CSSProperties} />
            </div>
            <p className={`${styles.rollText} ew-num`}>
              Rolled <strong>{Math.round(roll * 100)}</strong> against {formatOdds(odds)}
            </p>
          </div>
        )}

        <p className={styles.text}>{resolution.text}</p>

        <div className={styles.effects}>
          <EffectList
            effects={resolution.appliedEffects}
            artifacts={artifacts}
            factions={factions}
          />
        </div>

        {resolution.artifactsGained.length > 0 && (
          <div className={styles.relics}>
            {resolution.artifactsGained.map((a) => (
              <div key={a.id} className={styles.relic}>
                <span className={styles.relicMark} aria-hidden="true">
                  ◆
                </span>
                <span className={styles.relicBody}>
                  <span className={styles.relicName}>
                    {a.name}
                    <span className={styles.relicRarity}>{a.rarity}</span>
                  </span>
                  <span className={styles.relicFlavor}>{a.flavorText}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {tierCrossed && (
          <p className={styles.tier} data-celebrate={tierCrossed.celebrate ? 'true' : undefined}>
            <span className={styles.tierName}>{tierCrossed.name}</span>
            <span className={styles.tierLine}>{tierCrossed.line}</span>
          </p>
        )}

        {resolution.ending && (
          <p className={styles.ending}>The run ends · {endingName(resolution.ending)}</p>
        )}

        <div className={styles.foot}>
          <p className={styles.deed}>{eraRecord.deedSummary}</p>
          <button type="button" className={styles.continue} onClick={onContinue} ref={continueRef}>
            Continue
            <span className={styles.key} aria-hidden="true">
              ↵
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
