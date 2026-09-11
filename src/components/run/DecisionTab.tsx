/**
 * The focused play surface (issue #18) — everything a player needs to make
 * THIS era's choice, and nothing that only matters at the end of a life.
 *
 * Ambient status first (who is nearest to acting against you, who you have
 * courted), then the compact resources, then the decline-only wards-vs-hero
 * comparison, then the offer itself. The six-faction detail, the armed
 * reprisal alarm and the complete ledger live one tap away on the Career tab
 * instead — this tab stays short on purpose, because the choice cards are the
 * point and everything above them is screen budget borrowed from that.
 */

import { useId, useState } from 'react';
import type { DefenseReadout } from '../../engine';
import type { Artifact, Faction, Offer, RunState } from '../../types';
import { nextThreatFor, patronFor, reprisalSentence } from './allegiances';
import { lichSentence, siegeFor, stakesFor } from './stakes';
import { OfferPanel } from './OfferPanel';
import styles from './DecisionTab.module.css';

export type DecisionTabProps = {
  run: RunState;
  factions: Faction[];
  offer: Offer | null;
  artifacts: Artifact[];
  disabled: boolean;
  onChoose(index: number): void;
  defense?: DefenseReadout | null;
};

export function DecisionTab({
  run,
  factions,
  offer,
  artifacts,
  disabled,
  onChoose,
  defense,
}: DecisionTabProps) {
  // Captions are tap-to-reveal on a phone (they cost ~200px) and always shown
  // from 720px up — same trade the header made, carried over unchanged.
  const [openStat, setOpenStat] = useState<string | null>(null);
  const captionId = useId();

  const threat = nextThreatFor(run);
  const patron = patronFor(run, factions);
  const stakes = stakesFor(run);
  const lich = lichSentence(run);
  const siege = defense == null ? null : siegeFor(run, defense);

  return (
    <div className={styles.tab}>
      <div className={styles.status}>
        {/* Unconditional — the ambient line the header's own reprisal warning
            never was. A player planning a career benefits from knowing who is
            closest even while that faction is in good health; the Career
            tab's armed warning stays the alarm that only speaks up close. */}
        {threat && (
          <p className={styles.threat} data-armed={threat.armed ? 'true' : undefined}>
            {reprisalSentence(threat)}
          </p>
        )}
        <p className={styles.patron}>
          <span className={styles.patronLabel}>Patron</span>
          <span className={styles.patronValue}>{patron ? patron.name : 'None yet'}</span>
        </p>
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

      {/* Stated for as long as it is true, not just on the card that did it. */}
      {lich && <p className={styles.lich}>{lich}</p>}

      {siege && (
        <div className={styles.siege} data-tone={siege.tone}>
          <p className={styles.siegeRow}>
            <span className={styles.siegeLabel}>Wards</span>
            <span className={`${styles.siegeValue} ew-num`}>{siege.wards}</span>
            <span className={styles.siegeVs} aria-hidden="true">
              against
            </span>
            <span className={styles.siegeLabel}>The hero</span>
            <span className={`${styles.siegeValue} ew-num`}>{siege.threat}</span>
          </p>

          <span className={styles.siegeRail} aria-hidden="true">
            <span
              className={styles.siegeFill}
              style={{ '--ratio': siege.ratio } as React.CSSProperties}
            />
          </span>

          <p className={styles.siegeSentence}>{siege.sentence}</p>
        </div>
      )}

      <div className={styles.offer}>
        {offer ? (
          <OfferPanel
            offer={offer}
            artifacts={artifacts}
            factions={factions}
            disabled={disabled}
            onChoose={onChoose}
          />
        ) : (
          <p className={styles.quiet}>The era turns.</p>
        )}
      </div>
    </div>
  );
}
