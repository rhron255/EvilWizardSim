/**
 * The screen the player looks at for ninety percent of the game.
 *
 * One continuous column: a compact masthead — who you are, what you have —
 * then the six faction standings, then the decision content itself (the
 * next-threat and patron lines, compact resources, the decline-only wards
 * comparison, the offer). Issue #18 once split this into a Decision/Career
 * tab pair because the flat stack pushed the choice cards below the fold on
 * a phone; issue #36 removed the split again — the ledger and the Career-only
 * detail it carried are gone rather than moved, and the faction standings
 * that used to live one tap away now sit where the tab controls themselves
 * used to be, directly below the masthead.
 *
 * *Amended for the relic page (issue #78).* The decision content can be
 * swapped for a relic page — what you hold, what you lost, the wards figure
 * — one tap away on the Relics stat. This is not a second SCREEN and not a
 * regression of "no tabs": there is no persistent nav, nothing above the
 * masthead grew, the swap is local `view` state that is never persisted (a
 * reload always lands back on the decision), and a player who never opens it
 * sees no difference at all. It replaces only the decision content — the
 * masthead and faction standings stay put, because those are ambient status,
 * not "decision content" the issue meant to hide.
 *
 * The tier color is published here as `--ew-tier` on the screen root, so the
 * focus rings and the badge speak with the same single voice
 * (wiki/06_reference_analysis.md, principle 6).
 */

import { useEffect, useRef, useState } from 'react';
import type { Artifact, Faction, Lair, Offer, RunState, ThemeId } from '../types';
import type { Resolution } from '../components/run/resolution';
import type { ContentBundle, DefenseReadout } from '../engine';
import {
  DecisionPanel,
  FactionStandings,
  Masthead,
  RelicPage,
  ResolutionOverlay,
} from '../components/run';
import { themeAttr } from '../components/meta';
import { tierColor, tierFor, tierGlow } from '../theme/tokens';
import styles from './RunScreen.module.css';

export type RunScreenProps = {
  run: RunState;
  offer: Offer | null;
  /**
   * The same offer `offer` is a projection of, unprojected. Passed through to
   * `DecisionPanel`/`OfferPanel` for affordability gating only — see the doc
   * comment on `shownOffer` in `App.tsx` for why gating cannot use the
   * projected copy. Optional so tests that only care about the display (and
   * pass an unprojected catalog offer as `offer`) do not have to wire a
   * second, identical prop.
   */
  rawOffer?: Offer | null;
  resolution: Resolution | null;
  lairs: Lair[];
  artifacts: Artifact[];
  factions: Faction[];
  content: ContentBundle;
  onChoose(i: number): void;
  onContinue(): void;
  /** Spends a held relic's active power (issue #81) from the relic page. */
  onUseRelic(artifactId: string): void;
  /**
   * Current defence, itemised, from the engine. Passed down rather than
   * computed here so the screen stays presentational. Feeds the decline-phase
   * wards readout and its breakdown.
   */
  defense?: DefenseReadout | null;
  /** The cosmetic theme the player is wearing. */
  themeId: ThemeId;
};

export function RunScreen({
  run,
  offer,
  rawOffer,
  resolution,
  lairs,
  artifacts,
  factions,
  content,
  onChoose,
  onContinue,
  onUseRelic,
  defense,
  themeId,
}: RunScreenProps) {
  const tier = tierFor(run.notoriety);

  // Not persisted anywhere — plain `useState` already gives the "a reload
  // lands on the decision" behaviour the issue asks for, with nothing extra
  // needed to keep it out of `RunState` or storage.
  const [view, setView] = useState<'decision' | 'relics'>('decision');
  const relicsButtonRef = useRef<HTMLButtonElement>(null);
  const returningToDecision = useRef(false);

  function openRelics() {
    setView('relics');
  }

  function backToDecision() {
    // The Relics button does not exist in the DOM until `DecisionPanel`
    // re-mounts on the next render, so the focus call has to happen in an
    // effect keyed on `view` rather than right here (issue #78 QA caught the
    // stale-ref case: `relicsButtonRef.current` was still null at this exact
    // point mid-click).
    returningToDecision.current = true;
    setView('decision');
  }

  useEffect(() => {
    if (view === 'decision' && returningToDecision.current) {
      returningToDecision.current = false;
      relicsButtonRef.current?.focus({ preventScroll: true });
    }
  }, [view]);

  /**
   * Undeath outranks the wardrobe.
   *
   * Cold Room is a theme now, but a lich wears it whether or not they chose
   * it: the cold is a STATE CHANGE the screen is reporting, not a cosmetic —
   * it was the whole answer to "a state this large was missing a visible
   * signal". Leaving the player's own theme up would mean paying for the rite
   * and having nothing change.
   */
  const effectiveTheme: ThemeId = run.isLich ? 'lichdom' : themeId;

  return (
    <div
      className={styles.screen}
      {...themeAttr(effectiveTheme)}
      style={
        {
          '--ew-tier': tierColor[tier.id],
          '--ew-tier-glow': tierGlow[tier.id],
        } as React.CSSProperties
      }
    >
      <div className={styles.grain} aria-hidden="true" />

      <main className={styles.column}>
        <Masthead run={run} lairs={lairs} hasAscensionTrophy={run.ending === 'ascension'} />

        <FactionStandings run={run} factions={factions} />

        {view === 'relics' ? (
          <RelicPage
            run={run}
            artifacts={artifacts}
            factions={factions}
            content={content}
            defense={defense}
            onBack={backToDecision}
            onUseRelic={onUseRelic}
          />
        ) : (
          <DecisionPanel
            run={run}
            factions={factions}
            offer={offer}
            rawOffer={rawOffer ?? offer}
            artifacts={artifacts}
            content={content}
            disabled={Boolean(resolution)}
            onChoose={onChoose}
            defense={defense}
            onOpenRelics={openRelics}
            relicsButtonRef={relicsButtonRef}
          />
        )}
      </main>

      {resolution && (
        <ResolutionOverlay
          resolution={resolution}
          artifacts={artifacts}
          factions={factions}
          onContinue={onContinue}
        />
      )}
    </div>
  );
}
