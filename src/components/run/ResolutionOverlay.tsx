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
import { describeSystemic, endingName, formatOdds, systemicKey } from './effectText';
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

/**
 * At or below this probability, a win is worth naming.
 *
 * Reported from play: there are not enough moments that feel like getting away
 * with something. The game already produces them — a 1-in-5 gamble comes off
 * several times a career — and then reports them in the same small grey word
 * it uses for buying a hat. This is not comedy in the numbers (rule 4): the
 * number was printed before the commit, the roll is on the rail above, and
 * this only says out loud which side of it the player landed on.
 */
const LONG_ODDS = 0.4;

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
  const againstTheOdds = outcome === 'success' && odds !== undefined && odds <= LONG_ODDS;
  const newRelicIds = new Set(resolution.newToCollection.map((a) => a.id));
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
        /* Drives the whole reveal schedule. A gamble makes the player watch the
           needle before it names the verdict; a certain choice has nothing to
           watch and keeps the fast reveal. */
        data-rolling={showRoll ? 'true' : undefined}
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
            {againstTheOdds && (
              <p className={styles.againstOdds}>
                Against the odds · <span className="ew-num">{formatOdds(odds)}</span>
              </p>
            )}
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

        {/* Separated from the option's own consequences on purpose. Reported
            from play: "I died being consumed by the pact, even though the last
            action I took had nothing to do with pacts." The tick that killed
            the run was real, systemic, and printed nowhere — but folding it in
            above would have blamed it on the card the player just picked. */}
        {resolution.systemic.length > 0 && (
          <div className={styles.systemic}>
            <p className={styles.systemicLabel}>While you were elsewhere</p>
            <ul className={styles.systemicList}>
              {resolution.systemic.map((change, i) => {
                const line = describeSystemic(change);
                return (
                  <li
                    key={systemicKey(change, i)}
                    className={styles.systemicRow}
                    data-tone={line.tone}
                  >
                    <span className={`${styles.systemicNum} ew-num`}>{line.num}</span>
                    <span className={styles.systemicBody}>
                      <span className={styles.systemicName}>{line.text}</span>
                      <span className={styles.systemicNote}>{line.note}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {resolution.artifactsGained.length > 0 && (
          <div className={styles.relics}>
            {/* `data-rarity` below is the same hook `ArtifactCard` reads. This
                row is hand-rolled rather than an ArtifactCard — different
                layout, and it carries `data-new` — but it must not speak a
                different vocabulary, so its ladder mirrors that stylesheet's.

                This is the ACQUISITION moment, and until now rarity here was
                the printed word and nothing else: a legendary and a common
                arrived as identical rows. */}
            {resolution.artifactsGained.map((a) => (
              <div
                key={a.id}
                className={styles.relic}
                data-rarity={a.rarity}
                data-new={newRelicIds.has(a.id) || undefined}
              >
                <span className={styles.relicMark} aria-hidden="true">
                  ◆
                </span>
                <span className={styles.relicBody}>
                  <span className={styles.relicName}>
                    {a.name}
                    <span className={styles.relicRarity}>{a.rarity}</span>
                  </span>
                  {/* The collection is 30 silhouettes a player fills across
                      many careers, and until now the run that finally filled
                      one looked exactly like picking up a relic they already
                      owned. */}
                  {newRelicIds.has(a.id) && (
                    <span className={styles.relicNew}>Never seen before</span>
                  )}
                  <span className={styles.relicFlavor}>{a.flavorText}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {resolution.lairMoved && (
          <p className={styles.lairMove} data-up={resolution.lairMoved.up ? 'true' : undefined}>
            <span className={styles.lairMoveLabel}>
              {resolution.lairMoved.up ? 'You have moved up' : 'You have lost ground'}
            </span>
            <span className={styles.lairMoveName}>{resolution.lairMoved.to.name}</span>
            <span className={styles.lairMoveFrom}>from {resolution.lairMoved.from.name}</span>
          </p>
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

        {/* The deed line the ledger is about to receive was echoed here, which
            printed the same sentence twice on every resolution — the overlay's
            pull quote IS the deed line. The ledger row underneath is where it
            belongs permanently. */}
        <div className={styles.foot}>
          <p className={styles.deedNote}>Recorded in the ledger</p>
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
