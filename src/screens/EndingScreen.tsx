/**
 * The shareable object.
 *
 * Per the reference analysis this is the single most-shared element in a game
 * of this shape, so it is composed as a *card* — a bounded, framed, portrait
 * artefact that a screenshot crops cleanly — with the controls outside it.
 *
 * Two rules govern the copy: every ending is a biography and never a loss (so
 * "Retired to a Swamp" is narrated as a life that ended well, not as a failure),
 * and the lair grid is the centrepiece, because the reference game's club grid
 * was the thing people actually posted.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Artifact, Ending, Faction, Lair, RunState } from '../types';
import {
  ArtifactGrid,
  ATTRIBUTION_LABEL,
  CornerMarks,
  FactionGlyph,
  Flourish,
  LairGrid,
  Sigil,
  StatBlock,
  attributionFor,
  canRenderShareImage,
  lairTenures,
  peakNotoriety,
  preloadShareFonts,
  shareEndingImage,
  tierOf,
  tierVars,
} from '../components/meta';
import type { ArtifactGridEntry } from '../components/meta';
import { heroNameFor } from '../content/heroes';
import styles from './EndingScreen.module.css';

export type EndingScreenProps = {
  run: RunState;
  ending: Ending;
  /** Full lair ladder; tenures are reconstructed from the era log. */
  lairs: Lair[];
  /** Full relic catalog. */
  artifacts: Artifact[];
  factions: Faction[];
  onPlayAgain(): void;
  onViewCollection(): void;
  /**
   * Notification hook for the host app (routing, analytics). The image itself
   * is produced here, because only this screen can react to a failed export by
   * swapping in the "screenshot this" affordance.
   */
  onShare(): void;
};

type ShareState = 'idle' | 'working' | 'done' | 'fallback';

const RARITY_ORDER = { legendary: 0, rare: 1, common: 2 } as const;

/**
 * When each band starts its entrance, in ms after arrival.
 *
 * These used to run to 2000ms against a 900ms transition, so the card was not
 * whole until nearly three seconds in — on the payoff screen of a two-minute
 * game, where the first thing a player does is screenshot it. A share capture
 * or a quick glance landed on a half-empty card.
 *
 * The last band now finishes at ~1.16s (740ms cue + a `--ew-slow` transition).
 * The 140ms stagger is still plainly sequential — the card assembles, it does
 * not just appear — but the whole reveal is over before anyone reaches for a
 * screenshot. See also the reduced-motion branch below, which skips it.
 */
const REVEAL_CUES = [40, 180, 320, 460, 600, 740] as const;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function EndingScreen({
  run,
  ending,
  lairs,
  artifacts,
  factions,
  onPlayAgain,
  onViewCollection,
  onShare,
}: EndingScreenProps) {
  const [stage, setStage] = useState(0);
  const [share, setShare] = useState<ShareState>('idle');

  const peak = peakNotoriety(run.eras, run.notoriety);
  const tier = tierOf(peak);
  const startAge = run.eras[0]?.age ?? run.age;
  const tenures = useMemo(() => lairTenures(run, lairs), [run, lairs]);

  /**
   * Who ended it. `null` for the three self-determined endings, which render
   * no attribution at all — see components/meta/attribution.ts for why that is
   * a design decision rather than a missing case.
   *
   * The hero is resolved here rather than passed in because the seed is the
   * only input: the same seed always faces the same chosen one, which is what
   * makes a replayed seed a rematch and what lets recognition accrue.
   */
  const attribution = useMemo(
    () => attributionFor(ending.id, { heroName: heroNameFor(run.seed), factions }),
    [ending.id, run.seed, factions],
  );

  const relics: ArtifactGridEntry[] = useMemo(() => {
    const recovered = new Set<string>([
      ...run.eras.flatMap((e) => e.artifactsGained),
      ...run.heldArtifactIds,
    ]);
    return [...recovered]
      .map((id) => artifacts.find((a) => a.id === id))
      .filter((a): a is Artifact => Boolean(a))
      .map((artifact) => ({ artifact, lost: !run.heldArtifactIds.includes(artifact.id) }))
      .sort(
        (a, b) =>
          Number(a.lost) - Number(b.lost) ||
          RARITY_ORDER[a.artifact.rarity] - RARITY_ORDER[b.artifact.rarity] ||
          a.artifact.name.localeCompare(b.artifact.name),
      );
  }, [run.eras, run.heldArtifactIds, artifacts]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setStage(REVEAL_CUES.length);
      return;
    }
    const timers = REVEAL_CUES.map((ms, i) =>
      window.setTimeout(() => setStage((s) => Math.max(s, i + 1)), ms),
    );
    return () => timers.forEach(window.clearTimeout);
  }, []);

  useEffect(() => {
    void preloadShareFonts();
  }, []);

  const handleShare = useCallback(async () => {
    onShare();
    if (!canRenderShareImage()) {
      setShare('fallback');
      return;
    }
    setShare('working');
    const result = await shareEndingImage({ run, ending, lairs, artifacts });
    if (result.ok) setShare('done');
    else if (result.reason === 'cancelled') setShare('idle');
    else setShare('fallback');
  }, [artifacts, ending, lairs, onShare, run]);

  const at = (n: number) => (stage >= n ? styles.in : styles.out);

  const shareLabel =
    share === 'working'
      ? 'Drawing…'
      : share === 'done'
        ? 'Image saved'
        : share === 'fallback'
          ? 'Screenshot this card'
          : 'Share image';

  return (
    <main className={styles.screen} style={tierVars(peak)}>
      <article className={`${styles.card} ${at(1)}`} aria-label={`The life of ${run.wizardName}`}>
        <CornerMarks className={styles.corner} inset={9} length={16} />

        {/* --- identity --------------------------------------------------- */}
        <header className={styles.crown}>
          <p className={styles.wordmark}>Evil Wizard Simulator</p>

          <Sigil name={run.wizardName} size={168} className={styles.sigil} />

          <p className={styles.lifeOf}>The life of</p>
          <h1
            className={styles.name}
            style={{ '--name-len': run.wizardName.length } as React.CSSProperties}
          >
            {run.wizardName}
          </h1>
          {run.epithet ? <p className={styles.epithet}>{run.epithet}</p> : null}

          <Flourish className={styles.flourish} tone="tier" />

          <p className={styles.span}>
            Aged <span className={styles.num}>{startAge}</span> to{' '}
            <span className={styles.num}>{run.age}</span>
            <span className={styles.sep} aria-hidden>
              ·
            </span>
            <span className={styles.num}>{run.eras.length}</span> eras
            <span className={styles.sep} aria-hidden>
              ·
            </span>
            <span className={styles.tierName}>{tier.name}</span>
          </p>
        </header>

        {/* --- the ending -------------------------------------------------- */}
        <section className={`${styles.ending} ${at(2)}`}>
          <p className={styles.sectionLabel}>Its conclusion</p>
          <h2 className={styles.endingName}>{ending.name}</h2>
          {/* The agent, directly under the ending it caused — this is the line
              a player screenshots, and the reason the cast is fixed. Absent
              entirely for the self-determined endings; there is no "—" or
              "nobody" placeholder, because a blank is the honest answer. */}
          {attribution ? (
            <p className={styles.attribution} data-attribution>
              <span className={styles.attributionLabel}>{ATTRIBUTION_LABEL}</span>
              <span className={styles.attributionName}>{attribution}</span>
            </p>
          ) : null}
          <p className={styles.narration}>{ending.narration}</p>
        </section>

        {/* --- lifetime totals --------------------------------------------- */}
        <section className={`${styles.totals} ${at(3)}`}>
          <StatBlock
            emphasis
            columns={4}
            stats={[
              { label: 'Peak Notoriety', value: peak, hint: tier.name, accent: true },
              { label: 'Followers', value: run.followers.toLocaleString('en-US') },
              { label: 'Lairs held', value: tenures.length },
              { label: 'Relics kept', value: run.heldArtifactIds.length },
            ]}
          />
          <StatBlock
            columns={4}
            className={styles.totalsMinor}
            stats={[
              { label: 'Eras lived', value: run.eras.length },
              { label: 'Apprentices', value: run.apprentices.count },
              { label: 'Loyalty', value: `${run.apprentices.loyalty}%` },
              { label: 'Pact Debt', value: run.pactDebt },
            ]}
          />
        </section>

        {/* --- the centrepiece --------------------------------------------- */}
        <section className={`${styles.section} ${at(4)}`}>
          <h3 className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Lairs held</span>
            <span className={styles.headRule} aria-hidden />
            <span className={styles.count}>{tenures.length}</span>
          </h3>
          <LairGrid tenures={tenures} />
        </section>

        {/* --- relics ------------------------------------------------------- */}
        <section className={`${styles.section} ${at(5)}`}>
          <h3 className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Relics recovered</span>
            <span className={styles.headRule} aria-hidden />
            <span className={styles.count}>{relics.length}</span>
          </h3>
          <ArtifactGrid
            entries={relics}
            factions={factions}
            minColumn={300}
            emptyNote="Not one relic, in a whole career."
          />
        </section>

        {/* --- allegiances --------------------------------------------------- */}
        <section className={`${styles.section} ${at(5)}`}>
          <h3 className={styles.sectionHead}>
            <span className={styles.sectionLabel}>Allegiances</span>
            <span className={styles.headRule} aria-hidden />
          </h3>
          <ul className={styles.standings}>
            {factions.map((faction) => {
              const value = run.factionStanding[faction.id] ?? 0;
              const magnitude = Math.min(100, Math.abs(value)) / 2;
              return (
                <li key={faction.id} className={styles.standing}>
                  <FactionGlyph id={faction.id} size={17} className={styles.standingGlyph} />
                  <span className={styles.standingName}>{faction.name}</span>
                  <span className={styles.track} aria-hidden>
                    <span className={styles.axis} />
                    <span
                      className={value < 0 ? `${styles.fill} ${styles.fillDown}` : styles.fill}
                      style={
                        value < 0
                          ? { right: '50%', width: `${magnitude}%` }
                          : { left: '50%', width: `${magnitude}%` }
                      }
                    />
                  </span>
                  <span className={styles.standingValue}>
                    {value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '0'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* --- footer -------------------------------------------------------- */}
        <footer className={`${styles.foot} ${at(6)}`}>
          <span className={styles.footRule} aria-hidden />
          <p className={styles.footLine}>{tier.line}</p>
          <p className={styles.footMark}>
            Run <span className={styles.num}>{run.seed.toString(16).slice(0, 8)}</span>
          </p>
        </footer>
      </article>

      {/* --- controls, deliberately outside the card ------------------------
          Play again leads: this is a replay game, and the run that just ended
          is the argument for the next one. Share and collection are real but
          secondary, so they share one row beneath it. DOM order is visual
          order — no `order:` shuffling, so tab order matches what is read. */}
      <nav className={`${styles.controls} ${at(6)}`} aria-label="After the run">
        <button type="button" className={styles.primary} onClick={onPlayAgain}>
          Play again
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={handleShare}
          disabled={share === 'working'}
        >
          {shareLabel}
        </button>
        <button type="button" className={styles.secondary} onClick={onViewCollection}>
          View collection
        </button>
      </nav>

      <p className={styles.controlNote} role="status">
        {share === 'fallback'
          ? 'This browser will not hand over an image file. The card above is sized to screenshot — take one.'
          : share === 'done'
            ? 'Saved. The seal is drawn from the name, so it is only ever yours.'
            : 'One life. Plenty of second runs.'}
      </p>
    </main>
  );
}
