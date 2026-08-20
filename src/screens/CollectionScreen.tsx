/**
 * The persistent artifact collection — the long-term retention mechanism.
 *
 * Two rules from wiki/02, and neither is negotiable here:
 *
 *   1. All thirty slots are visible from run one. Undiscovered relics render as
 *      silhouettes with the name withheld. The visible gap is the point, so
 *      nothing on this screen hides, collapses or paginates the empty ones.
 *   2. Every relic belongs to a faction, and grouping by faction is what turns
 *      faction knowledge into routing decisions. So faction is the primary
 *      organising axis, not rarity.
 *
 * The endings get the same treatment: seven slots, three of them probably blank.
 */

import { useMemo, useState } from 'react';
import type { Artifact, Collection, Ending, Faction, FactionId } from '../types';
import {
  ArtifactGrid,
  EndingSlot,
  FactionGlyph,
  StatBlock,
  tierOf,
  tierVars,
} from '../components/meta';
import styles from './CollectionScreen.module.css';

export type CollectionScreenProps = {
  collection: Collection;
  artifacts: Artifact[];
  factions: Faction[];
  endings: Ending[];
  onBack(): void;
};

type Filter = FactionId | 'all';

export function CollectionScreen({
  collection,
  artifacts,
  factions,
  endings,
  onBack,
}: CollectionScreenProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const discovered = useMemo(
    () => new Set(collection.discoveredArtifactIds),
    [collection.discoveredArtifactIds],
  );
  const seenEndings = useMemo(() => new Set(collection.endingsSeen), [collection.endingsSeen]);
  const tier = tierOf(collection.bestNotoriety);

  const groups = useMemo(
    () =>
      factions.map((faction) => {
        const owned = artifacts.filter((a) => a.factionId === faction.id);
        return {
          faction,
          artifacts: owned,
          found: owned.filter((a) => discovered.has(a.id)).length,
        };
      }),
    [artifacts, factions, discovered],
  );

  const visible = filter === 'all' ? groups : groups.filter((g) => g.faction.id === filter);
  const foundTotal = artifacts.filter((a) => discovered.has(a.id)).length;

  return (
    <main className={styles.screen} style={tierVars(collection.bestNotoriety)}>
      <div className={styles.inner}>
        <header className={styles.top}>
          <button type="button" className={styles.back} onClick={onBack}>
            ← Back
          </button>
          <div className={styles.titleBlock}>
            <p className={styles.kicker}>Kept between lives</p>
            <h1 className={styles.title}>The Collection</h1>
          </div>
          <span className={styles.topSpacer} aria-hidden />
        </header>

        <StatBlock
          columns={4}
          className={styles.stats}
          stats={[
            { label: 'Careers', value: collection.runsCompleted },
            {
              label: 'Best notoriety',
              value: collection.bestNotoriety,
              hint: collection.runsCompleted > 0 ? tier.name : 'Not yet',
              accent: collection.runsCompleted > 0,
            },
            { label: 'Relics', value: `${foundTotal}/${artifacts.length}` },
            { label: 'Endings', value: `${seenEndings.size}/${endings.length}` },
          ]}
        />

        {/* --- faction filter ------------------------------------------------ */}
        <nav className={styles.filters} aria-label="Filter relics by faction">
          <button
            type="button"
            className={filter === 'all' ? `${styles.filter} ${styles.filterOn}` : styles.filter}
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            <span className={styles.filterName}>All</span>
            <span className={styles.filterCount}>
              {foundTotal}/{artifacts.length}
            </span>
          </button>

          {groups.map(({ faction, artifacts: owned, found }) => (
            <button
              key={faction.id}
              type="button"
              className={
                filter === faction.id ? `${styles.filter} ${styles.filterOn}` : styles.filter
              }
              aria-pressed={filter === faction.id}
              onClick={() => setFilter(faction.id)}
            >
              <FactionGlyph id={faction.id} size={16} className={styles.filterGlyph} />
              <span className={styles.filterName}>{faction.name.replace(/^The /, '')}</span>
              <span className={styles.filterCount}>
                {found}/{owned.length}
              </span>
            </button>
          ))}
        </nav>

        {/* --- relics --------------------------------------------------------- */}
        {visible.map(({ faction, artifacts: owned, found }) => (
          <section key={faction.id} className={styles.group}>
            <header className={styles.groupHead}>
              <FactionGlyph id={faction.id} size={26} className={styles.groupGlyph} />
              <div className={styles.groupText}>
                <h2 className={styles.groupName}>{faction.name}</h2>
                <p className={styles.groupDemands}>{faction.demands}</p>
              </div>
              <div className={styles.groupProgress}>
                <span className={styles.groupCount}>
                  <span className={styles.groupFound}>{found}</span>
                  <span className={styles.groupSlash}>/</span>
                  {owned.length}
                </span>
                <span className={styles.meter} aria-hidden>
                  <span
                    className={styles.meterFill}
                    style={{ width: `${owned.length ? (found / owned.length) * 100 : 0}%` }}
                  />
                </span>
              </div>
            </header>

            <ArtifactGrid
              entries={owned.map((artifact) => ({
                artifact,
                locked: !discovered.has(artifact.id),
              }))}
              factions={factions}
              minColumn={264}
            />
          </section>
        ))}

        {/* --- endings -------------------------------------------------------- */}
        <section className={styles.group}>
          <header className={styles.groupHead}>
            <div className={styles.groupText}>
              <h2 className={styles.groupName}>Endings seen</h2>
              <p className={styles.groupDemands}>
                Seven ways a career of this kind concludes. None of them is a loss.
              </p>
            </div>
            <div className={styles.groupProgress}>
              <span className={styles.groupCount}>
                <span className={styles.groupFound}>{seenEndings.size}</span>
                <span className={styles.groupSlash}>/</span>
                {endings.length}
              </span>
              <span className={styles.meter} aria-hidden>
                <span
                  className={styles.meterFill}
                  style={{ width: `${(seenEndings.size / Math.max(1, endings.length)) * 100}%` }}
                />
              </span>
            </div>
          </header>

          <div className={styles.endings}>
            {endings.map((ending) => (
              <EndingSlot key={ending.id} ending={ending} seen={seenEndings.has(ending.id)} />
            ))}
          </div>
        </section>

        <footer className={styles.bottom}>
          <button type="button" className={styles.bottomBack} onClick={onBack}>
            Back to the title
          </button>
        </footer>
      </div>
    </main>
  );
}
