/**
 * Allegiances, stats and history, detailed (issue #18) — everything the
 * Decision tab holds back because it costs vertical space the choice cards
 * need more. Nothing here is time-sensitive: a player checks this tab to
 * understand the career so far, not to make the next choice, so it is never
 * the default tab and its own tab selection is never remembered between eras.
 */

import type { DefenseReadout } from '../../engine';
import type { Artifact, Faction, Lair, RunState } from '../../types';
import { allegiancesFor, reprisalSentence, reprisalWarningFor } from './allegiances';
import { siegeFor, stakesFor } from './stakes';
import { Ledger } from './Ledger';
import styles from './CareerTab.module.css';

export type CareerTabProps = {
  run: RunState;
  lairs: Lair[];
  factions: Faction[];
  artifacts: Artifact[];
  defense?: DefenseReadout | null;
  /**
   * Owned by `RunScreen`, not here — this tab's own content fully unmounts
   * when Decision is selected, so any state kept in this component would be
   * silently discarded the moment the player switched tabs and switched
   * back. See the doc comment on `Ledger`'s matching props.
   */
  ledgerExpanded: boolean;
  onToggleLedgerExpanded(): void;
};

export function CareerTab({
  run,
  lairs,
  factions,
  artifacts,
  defense,
  ledgerExpanded,
  onToggleLedgerExpanded,
}: CareerTabProps) {
  const allegiances = allegiancesFor(run, factions);
  const reprisal = reprisalWarningFor(run);
  const stakes = stakesFor(run);
  const siege = defense == null ? null : siegeFor(run, defense);

  return (
    <div className={styles.tab}>
      <section className={styles.section}>
        <p className={styles.eyebrow}>Faction standing</p>
        {/* Standing was invisible in the run screen while being the trigger
            for the second most common ending. It also moves by contagion, so
            it can be pushed to lethal by cards that never named the
            faction. */}
        <ul className={styles.allegiances} aria-label="Faction standing">
          {allegiances.map((a) => (
            <li
              key={a.id}
              className={styles.allegiance}
              data-tone={a.tone}
              title={`${a.name} · ${a.note}`}
            >
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
                {a.sealAt !== null && (
                  <span
                    className={styles.allegianceMark}
                    style={{ '--at': `${50 + a.sealAt * 50}%` } as React.CSSProperties}
                  />
                )}
              </span>
              <span className={styles.allegianceNote}>{a.note}</span>
            </li>
          ))}
        </ul>

        {/* The alarm, not the ambient line — that lives on the Decision tab
            as `nextThreatFor`. This is the SAME computation with the
            proximity gates layered on, so the two can never disagree about
            which faction is closest. */}
        {reprisal && (
          <p className={styles.reprisal} data-armed={reprisal.armed ? 'true' : undefined}>
            {reprisalSentence(reprisal)}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <p className={styles.eyebrow}>Stakes</p>
        <dl className={styles.stats}>
          {stakes.map((stake) => (
            <div className={styles.stat} key={stake.label} data-tone={stake.tone}>
              <dt className={styles.statLabel}>{stake.label}</dt>
              <dd className={`${styles.statValue} ew-num`}>{stake.value}</dd>
              <dd className={styles.statCaption}>{stake.caption}</dd>
            </div>
          ))}
        </dl>

        {siege && (
          <div className={styles.wards} data-tone={siege.tone}>
            <p className={styles.wardsHeading}>
              <span className={styles.statLabel}>Wards</span>
              <span className={`${styles.wardsTotal} ew-num`}>{siege.wards}</span>
            </p>
            {/* Where every point comes from. `siegeFor` already computes this
                list, largest first, zero terms dropped — the Decision tab's
                sentence only ever names the largest one; this is the rest of
                it, always visible rather than tap-to-reveal, because a
                player checking this tab is asking exactly this question. */}
            <ul className={styles.wardsList} aria-label="Wards breakdown">
              {siege.terms.map((term) => {
                const value = Math.round(term.value);
                return (
                  <li
                    key={term.label}
                    className={styles.wardsTerm}
                    data-earned={term.earned ? 'true' : undefined}
                  >
                    <span className={styles.wardsTermLabel}>{term.label}</span>
                    <span className={`${styles.wardsTermValue} ew-num`}>
                      {value >= 0 ? `+${value}` : value}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <Ledger
          eras={run.eras}
          lairs={lairs}
          artifacts={artifacts}
          expanded={ledgerExpanded}
          onToggleExpanded={onToggleLedgerExpanded}
        />
      </section>
    </div>
  );
}
