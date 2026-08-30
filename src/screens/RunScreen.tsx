/**
 * The screen the player looks at for ninety percent of the game.
 *
 * One centered column: who you are, what you have done, what you may do next.
 * The tier color is published here as `--ew-tier` on the screen root, so the
 * focus rings, the live ledger row and the badge all speak with the same
 * single voice (wiki/06_reference_analysis.md, principle 6).
 */

import type { Artifact, Faction, Lair, Offer, RunState, ThemeId } from '../types';
import type { Resolution } from '../components/run/resolution';
import type { DefenseReadout } from '../engine';
import { Ledger, OfferPanel, ResolutionOverlay, WizardHeader } from '../components/run';
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
   * wards readout and its breakdown.
   */
  defense?: DefenseReadout | null;
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
  defense,
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
        <WizardHeader
          run={run}
          lairs={lairs}
          factions={factions}
          hasAscensionTrophy={run.ending === 'ascension'}
          defense={defense}
        />

        <Ledger eras={run.eras} lairs={lairs} artifacts={artifacts} />

        <div className={styles.offer}>
          {offer ? (
            <OfferPanel
              offer={offer}
              artifacts={artifacts}
              factions={factions}
              disabled={Boolean(resolution)}
              onChoose={onChoose}
            />
          ) : (
            <p className={styles.quiet}>The era turns.</p>
          )}
        </div>
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
