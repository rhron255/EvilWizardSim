/**
 * The Necrolexicon — the in-game reference (issue #66).
 *
 * Replaces the old Collection screen rather than sitting beside it: the
 * relic grid and ending slots below are that screen's content verbatim,
 * under a Relics tab and an Endings tab, alongside two new ones — Factions
 * and Mechanics — that the issue asks for. One screen, four categories, so
 * "what does this mean?" and "what have I found?" live behind the same door.
 *
 * Two rules carry over unchanged from the screen this replaces (wiki/02):
 *
 *   1. All relic slots are visible from run one. Undiscovered relics render as
 *      silhouettes with the name withheld. Tab switching must not paginate,
 *      collapse or filter that gap away.
 *   2. Every relic belongs to a faction, and grouping by faction is what turns
 *      faction knowledge into routing decisions.
 *
 * The Factions and Mechanics tabs are pure reference prose — nothing on them
 * is gated by discovery, because they explain rules the player needs DURING
 * a run, not content the run reveals. Neither one names an ending or hints at
 * a threshold a locked ending slot is still withholding (CLAUDE.md's
 * undisclosed-secret rule extends to this screen, not just to the grid).
 */

import { useMemo, useState } from 'react';
import type { Artifact, Collection, Ending, Faction, FactionId, Mechanic } from '../types';
import {
  ArtifactGrid,
  EndingSlot,
  FactionGlyph,
  StatBlock,
  themeAttr,
  tierOf,
  tierVars,
} from '../components/meta';
import styles from './NecrolexiconScreen.module.css';

/**
 * Spells out small counts for prose ("Nineteen ways…"). The catalog has
 * already grown past the seven this array was first written for. `lichdom`
 * and `sealed_in_gem` were already among that original seven — as the Worm
 * Below's leadership ending and the Pale Academy's reprisal, respectively —
 * so issue #14 added five MORE faction reprisals and five more faction
 * leaderships on top of those two, plus the Good Wizard route's two
 * (`good_wizard`, `arch_lich`): 7 + 5 + 5 + 2 = nineteen endings today. This
 * covers up to twenty rather than hardcoding a count that keeps moving.
 */
const COUNT_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty',
];

function countWord(n: number): string {
  const word = COUNT_WORDS[n];
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : String(n);
}

export type NecrolexiconScreenProps = {
  collection: Collection;
  artifacts: Artifact[];
  factions: Faction[];
  endings: Ending[];
  mechanics: Mechanic[];
  onBack(): void;
  onViewThemes(): void;
};

type Category = 'factions' | 'relics' | 'endings' | 'mechanics';
type Filter = FactionId | 'all';

const TABS: { id: Category; label: string }[] = [
  { id: 'factions', label: 'Factions' },
  { id: 'relics', label: 'Relics' },
  { id: 'endings', label: 'Endings' },
  { id: 'mechanics', label: 'Mechanics' },
];

export function NecrolexiconScreen({
  collection,
  artifacts,
  factions,
  endings,
  mechanics,
  onBack,
  onViewThemes,
}: NecrolexiconScreenProps) {
  const [category, setCategory] = useState<Category>('factions');
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
    <main
      className={styles.screen}
      style={tierVars(collection.bestNotoriety)}
      {...themeAttr(collection.selectedThemeId)}
    >
      <div className={styles.inner}>
        <header className={styles.top}>
          <button type="button" className={styles.back} onClick={onBack}>
            ← Back
          </button>
          <div className={styles.titleBlock}>
            <p className={styles.kicker}>What every term means</p>
            <h1 className={styles.title}>The Necrolexicon</h1>
          </div>
          <span className={styles.topSpacer} aria-hidden />
        </header>

        <StatBlock
          columns={4}
          className={styles.stats}
          stats={[
            { label: 'Careers', value: collection.runsCompleted },
            {
              label: 'Best Notoriety',
              value: collection.bestNotoriety,
              hint: collection.runsCompleted > 0 ? tier.name : 'Not yet',
              accent: collection.runsCompleted > 0,
            },
            { label: 'Relics', value: `${foundTotal}/${artifacts.length}` },
            { label: 'Endings', value: `${seenEndings.size}/${endings.length}` },
          ]}
        />

        {/* --- category tabs -------------------------------------------------- */}
        <nav className={styles.tabs} aria-label="Necrolexicon sections" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={category === tab.id}
              className={category === tab.id ? `${styles.tab} ${styles.tabOn}` : styles.tab}
              onClick={() => setCategory(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* --- factions --------------------------------------------------------- */}
        {category === 'factions' && (
          <section className={styles.factionEntries} aria-label="Factions">
            {factions.map((faction) => (
              <article key={faction.id} className={styles.factionEntry}>
                <header className={styles.factionHead}>
                  <FactionGlyph id={faction.id} size={26} className={styles.groupGlyph} />
                  <h2 className={styles.groupName}>{faction.name}</h2>
                </header>
                <p className={styles.entryBlurb}>{faction.blurb}</p>
                <p className={styles.entryLabel}>What standing with them does</p>
                <p className={styles.entryBlurb}>{faction.demands}</p>
              </article>
            ))}
          </section>
        )}

        {/* --- relics --------------------------------------------------------- */}
        {category === 'relics' && (
          <>
            <nav className={styles.filters} aria-label="Filter relics by faction">
              <button
                type="button"
                className={
                  filter === 'all' ? `${styles.filter} ${styles.filterOn}` : styles.filter
                }
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
          </>
        )}

        {/* --- endings -------------------------------------------------------- */}
        {category === 'endings' && (
          <section className={styles.group}>
            <header className={styles.groupHead}>
              <div className={styles.groupText}>
                <h2 className={styles.groupName}>Endings seen</h2>
                <p className={styles.groupDemands}>
                  {countWord(endings.length)} ways a career of this kind concludes. None of them
                  is a loss.
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

            {/* Each of those slots also granted a palette. The link sits here
                rather than in the header because this is the section that makes
                it mean something — the themes ARE the endings, seen from the
                other side. */}
            <p className={styles.endingsNote}>
              Every ending leaves its colours behind.{' '}
              <button type="button" className={styles.inlineLink} onClick={onViewThemes}>
                Choose a theme
              </button>
            </p>
          </section>
        )}

        {/* --- mechanics -------------------------------------------------------- */}
        {category === 'mechanics' && (
          <section className={styles.factionEntries} aria-label="Mechanics">
            {mechanics.map((mechanic) => (
              <article key={mechanic.id} className={styles.factionEntry}>
                <h2 className={styles.groupName}>{mechanic.name}</h2>
                <p className={styles.entryBlurb}>{mechanic.blurb}</p>
              </article>
            ))}
          </section>
        )}

        <footer className={styles.bottom}>
          <button type="button" className={styles.bottomBack} onClick={onBack}>
            Back to the title
          </button>
        </footer>
      </div>
    </main>
  );
}
