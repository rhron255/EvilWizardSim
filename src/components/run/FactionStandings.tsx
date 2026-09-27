/**
 * All six faction standings, with a readable note on each (issue #36),
 * collapsed by default to the two most extreme rows (issue #36 follow-up).
 *
 * This used to be the Career tab's opening section, one tap away from the
 * choice cards. Removing the tab split (issue #36) means it now sits where
 * the tab controls themselves used to: directly below the masthead, above
 * the decision content, on the one screen that exists now — which means all
 * six rows compete with the choice cards for the same screen budget CLAUDE.md
 * calls out as scarce on a phone. Showing only the best and worst standing by
 * default, with the rest one tap away, keeps that promise the way the old
 * Career tab used to, without bringing back a second screen.
 *
 * Standing was invisible in the run screen for a long time while being the
 * trigger for the second most common ending. It also moves by CONTAGION, so
 * it can be pushed to lethal by cards that never named the faction —
 * `allegiances.ts` has the full history.
 *
 * The per-row note is dropped while collapsed. `DecisionPanel`'s ambient
 * threat line already names the same standing-driven consequence for
 * whichever faction is actually closest to acting (`nextThreatFor`), so a
 * second copy of that sentence sitting under one of only two visible rows
 * read as repetition rather than disclosure. Expanding restores it: reading
 * all six is exactly the "tell me everything" moment the note earns its
 * space back for.
 *
 * This section used to carry a second alarm line of its own
 * (`reprisalWarningFor`), shown only when it named a faction other than
 * `DecisionPanel`'s ambient `nextThreatFor` line — which could happen back
 * when five of the six reprisals were decline-only and the two functions
 * scanned differently ('live' vs 'any'). Now that every reprisal is live in
 * every phase, both functions always resolve to the same nearest-by-standing
 * faction, so that alarm could never again name a different one — a
 * permanently-false condition is dead code, not a rare case, so it was
 * removed rather than left to rot (styling rule 3: don't restate a
 * disclosure already on screen — this alarm could no longer say anything
 * `DecisionPanel`'s line had not already said).
 */

import { useId, useState } from 'react';
import { allegiancesFor, extremeAllegiances } from './allegiances';
import type { Faction, RunState } from '../../types';
import styles from './FactionStandings.module.css';

export type FactionStandingsProps = {
  run: RunState;
  factions: Faction[];
};

export function FactionStandings({ run, factions }: FactionStandingsProps) {
  // Local state, not lifted: this component is mounted for the whole run now
  // that there is no second tab to unmount it — see the doc comment `Ledger`
  // used to carry for why that would once have mattered.
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  const allegiances = allegiancesFor(run, factions);
  const extremes = extremeAllegiances(allegiances);
  const shown = expanded ? allegiances : extremes;
  const collapsible = allegiances.length > extremes.length;

  return (
    <section className={styles.section}>
      <ul className={styles.allegiances} aria-label="Faction standing" id={listId}>
        {shown.map((a) => (
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
            {expanded && <span className={styles.allegianceNote}>{a.note}</span>}
          </li>
        ))}
      </ul>

      {collapsible && (
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show fewer factions' : 'Show all six factions'}
          <span className={styles.toggleArrow} data-open={expanded ? 'true' : undefined} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
