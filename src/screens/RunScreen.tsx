/**
 * The screen the player looks at for ninety percent of the game.
 *
 * One centered column: who you are, what you have done, what you may do next.
 * The tier color is published here as `--ew-tier` on the screen root, so the
 * focus rings, the live ledger row and the badge all speak with the same
 * single voice (wiki/06_reference_analysis.md, principle 6).
 */

import type { Artifact, Faction, Lair, Offer, RunState } from '../types';
import type { Resolution } from '../components/run/resolution';
import { Ledger, OfferPanel, ResolutionOverlay, WizardHeader } from '../components/run';
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
}: RunScreenProps) {
  const tier = tierFor(run.notoriety);

  return (
    <div
      className={styles.screen}
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
          hasAscensionTrophy={run.ending === 'ascension'}
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
