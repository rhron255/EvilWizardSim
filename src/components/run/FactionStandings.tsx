/**
 * All six faction standings, with a readable note on each (issue #36).
 *
 * This used to be the Career tab's opening section, one tap away from the
 * choice cards. Removing the tab split (issue #36) means it now sits where
 * the tab controls themselves used to: directly below the masthead, above
 * the decision content, on the one screen that exists now.
 *
 * Standing was invisible in the run screen for a long time while being the
 * trigger for the second most common ending. It also moves by CONTAGION, so
 * it can be pushed to lethal by cards that never named the faction —
 * `allegiances.ts` has the full history.
 */

import { allegiancesFor, reprisalSentence, reprisalWarningFor } from './allegiances';
import type { Faction, RunState } from '../../types';
import styles from './FactionStandings.module.css';

export type FactionStandingsProps = {
  run: RunState;
  factions: Faction[];
};

export function FactionStandings({ run, factions }: FactionStandingsProps) {
  const allegiances = allegiancesFor(run, factions);
  const reprisal = reprisalWarningFor(run);

  return (
    <section className={styles.section}>
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

      {/* The alarm, not the ambient line — that lives in `DecisionPanel` as
          `nextThreatFor`. This is the SAME computation with the proximity
          gates layered on, so the two can never disagree about which faction
          is closest. */}
      {reprisal && (
        <p className={styles.reprisal} data-armed={reprisal.armed ? 'true' : undefined}>
          {reprisalSentence(reprisal)}
        </p>
      )}
    </section>
  );
}
