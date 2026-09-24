/**
 * The run screen's decision content (issue #18, reduced to a single screen by
 * issue #36) — everything a player needs to make THIS era's choice.
 *
 * Ambient status first (who is nearest to acting against you, who you have
 * courted), then the compact resources, then the decline-only wards-vs-hero
 * comparison, then the offer itself. It renders directly below
 * `FactionStandings` on `RunScreen`, so this stays short on its own merits:
 * the choice cards are the point and everything above them is screen budget
 * borrowed from that.
 *
 * *Amended for the relic page (issue #78).* The Relics stat is the one
 * exception: it does not toggle a caption like its four neighbours, it opens
 * `RelicPage` — a view `RunScreen` swaps in for this whole panel, one tap
 * away and never persisted. See `RelicPage`'s and `RunScreen`'s doc comments
 * for why that is not the "no second screen" pillar breaking.
 */

import { useId, useState } from 'react';
import type { Ref } from 'react';
import type { ContentBundle, DefenseReadout } from '../../engine';
import type { Artifact, Faction, Offer, RunState } from '../../types';
import { nextThreatFor, patronFor, reprisalSentence } from './allegiances';
import { lichSentence, siegeFor, stakesFor } from './stakes';
import { OfferPanel } from './OfferPanel';
import styles from './DecisionPanel.module.css';

export type DecisionPanelProps = {
  run: RunState;
  factions: Faction[];
  offer: Offer | null;
  /**
   * The unprojected counterpart of `offer`, for `OfferPanel`'s affordability
   * gating — see `RunScreen`'s doc comment on the same prop. Defaults to
   * `offer` when omitted, which is correct whenever the caller already
   * passes a raw (unprojected) offer as `offer` itself, as every existing
   * test does.
   */
  rawOffer?: Offer | null;
  artifacts: Artifact[];
  content: ContentBundle;
  disabled: boolean;
  onChoose(index: number): void;
  defense?: DefenseReadout | null;
  /**
   * Opens the relic page (issue #78). The Relics stat is a navigation button
   * rather than a caption toggle whenever this is supplied — omitting it
   * (as every existing test that does not care about the relic page does)
   * keeps the old tap-to-reveal behaviour for that stat too.
   */
  onOpenRelics?(): void;
  /**
   * Attached to the Relics button's DOM node so `RunScreen` can return focus
   * to it when the player comes back from the relic page — the button is
   * re-created on every render, so a ref is the only way its identity
   * survives that round trip.
   */
  relicsButtonRef?: Ref<HTMLButtonElement>;
};

export function DecisionPanel({
  run,
  factions,
  offer,
  rawOffer,
  artifacts,
  content,
  disabled,
  onChoose,
  defense,
  onOpenRelics,
  relicsButtonRef,
}: DecisionPanelProps) {
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
    <div className={styles.panel}>
      <div className={styles.status}>
        {/* Unconditional — the ambient line the header's own reprisal warning
            never was. A player planning a career benefits from knowing who is
            closest even while that faction is in good health; `FactionStandings`'
            armed warning stays the alarm that only speaks up close. */}
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
          // The Relics stat is a navigation control (issue #78: a relic page
          // to read what you carry), not one more tap-to-reveal caption — it
          // gets its own styled variant per CLAUDE.md styling rule 2 ("a
          // control the player must find at a glance needs visual weight of
          // its own"), the same pattern `FactionStandings`'s toggle uses.
          if (stake.label === 'Relics' && onOpenRelics) {
            return (
              <div className={styles.stat} key={stake.label}>
                <dt className={styles.srOnly}>{stake.label}</dt>
                <dd className={styles.statCaption}>{stake.caption}</dd>
                <button
                  type="button"
                  className={styles.relicsButton}
                  onClick={onOpenRelics}
                  ref={relicsButtonRef}
                >
                  {stake.label} · {stake.value}
                  <span className={styles.relicsArrow} aria-hidden="true">
                    ›
                  </span>
                </button>
              </div>
            );
          }

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
            rawOffer={rawOffer ?? offer}
            run={run}
            content={content}
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
