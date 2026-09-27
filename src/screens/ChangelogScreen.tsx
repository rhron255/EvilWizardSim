/**
 * The full update history (issue #67).
 *
 * Reachable from the title screen regardless of cookie state — a returning
 * player who has already acknowledged every update can still read the whole
 * thing, same as the Collection and Themes doors it sits beside. Newest
 * first, same order the launch popup uses.
 */

import type { Changelog, Collection } from '../types';
import { sortedChangelogVersions } from '../engine';
import { formatChangelogVersion, themeAttr, tierVars } from '../components/meta';
import styles from './ChangelogScreen.module.css';

export type ChangelogScreenProps = {
  changelog: Changelog;
  collection: Collection;
  onBack(): void;
};

export function ChangelogScreen({ changelog, collection, onBack }: ChangelogScreenProps) {
  const versions = sortedChangelogVersions(changelog);

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
            <p className={styles.kicker}>Every update, kept</p>
            <h1 className={styles.title}>Changelog</h1>
          </div>
          <span className={styles.topSpacer} aria-hidden />
        </header>

        <ol className={styles.entries}>
          {versions.map((version) => {
            const entry = changelog[version];
            return (
              <li key={version} className={styles.entry}>
                <span className={styles.version}>{formatChangelogVersion(version)}</span>
                <p className={styles.summary}>{entry.summary}</p>
                <ul className={styles.details}>
                  {entry.details.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>

        <footer className={styles.bottom}>
          <button type="button" className={styles.bottomBack} onClick={onBack}>
            Back to the title
          </button>
        </footer>
      </div>
    </main>
  );
}
