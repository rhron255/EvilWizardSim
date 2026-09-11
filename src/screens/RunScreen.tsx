/**
 * The screen the player looks at for ninety percent of the game.
 *
 * One centered column: a compact masthead — who you are, what you have —
 * above two tabs. Decision is the focused play surface (the next-threat and
 * patron lines, compact resources, the decline-only wards comparison, the
 * offer itself); Career is the detailed one (all six faction rows, full stat
 * captions, the complete ledger). Issue #18 split what used to be one
 * vertically stacked header, because the choice cards are the point of this
 * screen and the flat stack pushed them below the fold on a phone.
 *
 * The tier color is published here as `--ew-tier` on the screen root, so the
 * focus rings, the live ledger row and the badge all speak with the same
 * single voice (wiki/06_reference_analysis.md, principle 6).
 */

import { useCallback, useState } from 'react';
import type { Artifact, Faction, Lair, Offer, RunState, ThemeId } from '../types';
import type { Resolution } from '../components/run/resolution';
import type { DefenseReadout } from '../engine';
import { CareerTab, DecisionTab, Masthead, ResolutionOverlay, Tabs, TabsHint } from '../components/run';
import type { TabItem } from '../components/run';
import { themeAttr } from '../components/meta';
import { tierColor, tierFor, tierGlow } from '../theme/tokens';
import styles from './RunScreen.module.css';

export type RunScreenProps = {
  run: RunState;
  offer: Offer | null;
  resolution: Resolution | null;
  lairs: Lair[];
  artifacts: Artifact[];
  factions: Faction[];
  onChoose(i: number): void;
  onContinue(): void;
  /**
   * Current defence, itemised, from the engine. Passed down rather than
   * computed here so the screen stays presentational. Feeds the decline-phase
   * wards readout and its breakdown on both tabs.
   */
  defense?: DefenseReadout | null;
  /** The cosmetic theme the player is wearing. */
  themeId: ThemeId;
  /** Owed once, after the first-run guide is out of the way — see `useGame`. */
  showTabsHint: boolean;
  onDismissTabsHint(): void;
};

type RunTab = 'decision' | 'career';

export function RunScreen({
  run,
  offer,
  resolution,
  lairs,
  artifacts,
  factions,
  onChoose,
  onContinue,
  defense,
  themeId,
  showTabsHint,
  onDismissTabsHint,
}: RunScreenProps) {
  const tier = tierFor(run.notoriety);

  /**
   * Decision is selected initially and after every continue — never
   * persisted across an era. A player checks Career to understand the
   * career so far; they never need it to make the NEXT choice, so each era
   * opens back on the tab that has the choice cards on it.
   *
   * Reset happens on `handleContinue` rather than on some derived value like
   * `run.eraIndex`, because that is the one moment this component actually
   * owns: `eraIndex` already advances the instant a choice resolves, while
   * the resolution overlay is still open, so watching it would flip the tab
   * underneath an overlay that has not been dismissed yet. Nothing about the
   * player's own manual tab switch mid-era should be second-guessed.
   */
  const [tab, setTab] = useState<RunTab>('decision');
  const handleContinue = useCallback(() => {
    setTab('decision');
    onContinue();
  }, [onContinue]);

  // A player who switches tabs at all — by tap OR by the swipe TabsHint is
  // teaching — has had the hint in front of them while doing it, so there is
  // nothing left for the hint to say. Only fires the dismiss once; the
  // reducer is idempotent on an already-seen hint, but there is no reason to
  // dispatch on every subsequent switch once it is gone.
  const handleSelectTab = useCallback(
    (id: string) => {
      if (showTabsHint) onDismissTabsHint();
      setTab(id as RunTab);
    },
    [showTabsHint, onDismissTabsHint],
  );

  /**
   * The ledger's "show every era" toggle, lifted out of `Ledger` itself.
   *
   * The Career tab's content fully unmounts whenever Decision is selected —
   * `Tabs` only ever mounts the active panel — so a `useState` inside
   * `Ledger` or `CareerTab` would silently discard an explicit tap the
   * moment the player switched tabs and back. `RunScreen` is the one
   * component that survives that switch (the same lifetime the ledger had
   * before this screen had tabs at all), so it is the state's home now.
   */
  const [ledgerExpanded, setLedgerExpanded] = useState(false);

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

  const tabs: TabItem[] = [
    {
      id: 'decision',
      label: 'Decision',
      panel: (
        <DecisionTab
          run={run}
          factions={factions}
          offer={offer}
          artifacts={artifacts}
          disabled={Boolean(resolution)}
          onChoose={onChoose}
          defense={defense}
        />
      ),
    },
    {
      id: 'career',
      label: 'Career',
      panel: (
        <CareerTab
          run={run}
          lairs={lairs}
          factions={factions}
          artifacts={artifacts}
          defense={defense}
          ledgerExpanded={ledgerExpanded}
          onToggleLedgerExpanded={() => setLedgerExpanded((v) => !v)}
        />
      ),
    },
  ];

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

        <Tabs label="Run screen" tabs={tabs} selected={tab} onSelect={handleSelectTab} />
      </main>

      {showTabsHint && <TabsHint onDismiss={onDismissTabsHint} />}

      {resolution && (
        <ResolutionOverlay
          resolution={resolution}
          artifacts={artifacts}
          factions={factions}
          onContinue={handleContinue}
        />
      )}
    </div>
  );
}
