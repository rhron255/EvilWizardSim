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
 * The tier color is published here as `--ew-tier` on the screen root, so the
 * focus rings and the badge speak with the same single voice
 * (wiki/06_reference_analysis.md, principle 6).
 */

import type { Artifact, Faction, Lair, Offer, RunState, ThemeId } from '../types';
import type { Resolution } from '../components/run/resolution';
import type { RelicPowers } from '../engine';
import type { Siege } from '../components/run';
import { DecisionPanel, FactionStandings, Masthead, ResolutionOverlay } from '../components/run';
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
   * The decline-phase wards readout, already derived: wards against threat,
   * the rate, the terms and the caption. Built by `siegeFor` in `App`, beside
   * the `defenseReadout` it is made from, because it needs the content bundle
   * to price the hero's next era — `vigil` relics slow him.
   *
   * Null outside the decline, where there is no hero to read against.
   */
  siege?: Siege | null;
  /**
   * Every relic power in hand, summed. From `relicPowers` in `App`, the same
   * place `siege` comes from.
   *
   * Required rather than nullable: a wizard always has a reliquary, even an
   * empty one, so the header's Relics caption never needs a null branch. Build
   * it from the bundle whose artifacts the run actually holds — a bundle whose
   * ids do not match `run.heldArtifactIds` sums to all zeros and silently
   * renders the empty-reliquary caption, which is how the `DecisionPanel`
   * tests spent a while asserting nothing.
   */
  relics: RelicPowers;
  /** The cosmetic theme the player is wearing. */
  themeId: ThemeId;
};

export function RunScreen({
  run,
  offer,
  resolution,
  lairs,
  artifacts,
  factions,
  onChoose,
  onContinue,
  siege,
  relics,
  themeId,
}: RunScreenProps) {
  const tier = tierFor(run.notoriety);

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

        <DecisionPanel
          run={run}
          factions={factions}
          offer={offer}
          artifacts={artifacts}
          disabled={Boolean(resolution)}
          onChoose={onChoose}
          siege={siege}
          relics={relics}
        />
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
