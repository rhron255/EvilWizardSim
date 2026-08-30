/**
 * The cover of the grimoire.
 *
 * First impression, so: one mark, one title, three doors, and a quiet footer of
 * everything the player has accumulated so far. Restraint is the design — the
 * only colour on this screen is the tier of the best run they have ever had,
 * which means a first-time player sees a grey seal and a hundred-run player
 * sees gold, without a word being written about it.
 */

import type { Collection } from '../types';
import { Sigil, themeAttr, tierOf, tierVars } from '../components/meta';
import { Flourish } from '../components/meta';
import { themeFor } from '../theme/themes';
import styles from './TitleScreen.module.css';

export type TitleScreenProps = {
  collection: Collection;
  /** Size of the full relic catalog — the denominator on the collection door. */
  artifactCount: number;
  hasResumableRun: boolean;
  onBegin(): void;
  onResume(): void;
  onViewCollection(): void;
  onViewThemes(): void;
};

export function TitleScreen({
  collection,
  artifactCount,
  hasResumableRun,
  onBegin,
  onResume,
  onViewCollection,
  onViewThemes,
}: TitleScreenProps) {
  const found = collection.discoveredArtifactIds.length;
  const tier = tierOf(collection.bestNotoriety);
  const veteran = collection.runsCompleted > 0;

  return (
    <main
      className={styles.screen}
      style={tierVars(collection.bestNotoriety)}
      {...themeAttr(collection.selectedThemeId)}
    >
      <div className={styles.backdrop} aria-hidden>
        <Sigil name="the evil wizard simulator" size={780} spin className={styles.watermark} />
      </div>

      <div className={styles.inner}>
        <header className={styles.masthead}>
          <Sigil name="grimoire" size={92} muted className={styles.crest} />

          <p className={styles.kicker}>A career in eras</p>

          <h1 className={styles.title}>
            <span className={styles.titleMain}>Evil Wizard</span>
            <span className={styles.titleSub}>Simulator</span>
          </h1>

          <Flourish className={styles.flourish} tone="tier" />

          <p className={styles.tagline}>
            Build a reputation. Earn a prophecy.
            <br />
            Find out what they write about you afterwards.
          </p>
        </header>

        <nav className={styles.doors} aria-label="Main menu">
          <button type="button" className={styles.begin} onClick={onBegin} autoFocus>
            Begin a career
          </button>

          {hasResumableRun ? (
            <button type="button" className={styles.door} onClick={onResume}>
              <span>Resume run</span>
              <span className={styles.doorNote}>in progress</span>
            </button>
          ) : null}

          <button type="button" className={styles.door} onClick={onViewCollection}>
            <span>Collection</span>
            <span className={styles.doorNote}>
              <span className={styles.num}>{found}</span>
              <span className={styles.slash}>/</span>
              <span className={styles.num}>{artifactCount}</span> relics
            </span>
          </button>

          {/* Shown from run one, like the collection door and for the same
              reason: a door to a room you have barely furnished is an argument
              for another run. `themes` names what is worn, not how many are
              locked — the count belongs on the screen itself. */}
          <button type="button" className={styles.door} onClick={onViewThemes}>
            <span>Themes</span>
            <span className={styles.doorNote}>{themeFor(collection.selectedThemeId).name}</span>
          </button>
        </nav>

        <footer className={styles.ledger}>
          <div className={styles.ledgerItem}>
            <span className={styles.ledgerLabel}>Careers</span>
            <span className={styles.ledgerValue}>{collection.runsCompleted}</span>
          </div>
          <span className={styles.ledgerRule} aria-hidden />
          <div className={styles.ledgerItem}>
            <span className={styles.ledgerLabel}>Best Notoriety</span>
            <span className={`${styles.ledgerValue} ${veteran ? styles.ledgerAccent : ''}`}>
              {collection.bestNotoriety}
            </span>
          </div>
          <span className={styles.ledgerRule} aria-hidden />
          <div className={styles.ledgerItem}>
            <span className={styles.ledgerLabel}>Best rank</span>
            <span className={styles.ledgerValue}>{veteran ? tier.name : '—'}</span>
          </div>
        </footer>

        <p className={styles.epigraph}>
          {veteran
            ? tier.line
            : 'Nobody has heard of you yet. That is a solvable problem.'}
        </p>
      </div>
    </main>
  );
}
