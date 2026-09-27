/**
 * The theme selector.
 *
 * Cosmetics earned across runs, chosen by the player. That "chosen" is what
 * this screen exists to make true, and what the amended rule 3 turns on: the
 * Notoriety tier colour is still the only reward the GAME hands you inside a
 * run, and nothing here is imposed.
 *
 * Every theme is on screen from run one — the locked ones redacted, showing
 * the hint of the ending that grants them, exactly as the collection's locked
 * ending slots do. The visible gap is the point.
 */

import { useMemo } from 'react';
import type { Collection, Ending, ThemeId } from '../types';
import { THEMES, isThemeUnlocked } from '../theme/themes';
import { Sigil, ThemeSwatch, themeAttr, tierVars } from '../components/meta';
import styles from './ThemeScreen.module.css';

export type ThemeScreenProps = {
  collection: Collection;
  /** The full ending catalog — locked swatches borrow their `hint`. */
  endings: Ending[];
  onSelect(id: ThemeId): void;
  onBack(): void;
};

export function ThemeScreen({ collection, endings, onSelect, onBack }: ThemeScreenProps) {
  const hintFor = useMemo(() => {
    const byId = new Map(endings.map((e) => [e.id, e.hint]));
    return (id: ThemeId) => byId.get(id as Ending['id']);
  }, [endings]);

  const unlockedCount = THEMES.filter((t) =>
    isThemeUnlocked(t.id, collection.endingsSeen),
  ).length;

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
            <p className={styles.kicker}>Worn between lives</p>
            <h1 className={styles.title}>Themes</h1>
          </div>
          <span className={styles.topSpacer} aria-hidden />
        </header>

        <div className={styles.intro}>
          <Sigil name="themes" size={64} muted className={styles.crest} />
          <p className={styles.blurb}>
            Every ending you reach leaves its colours behind. They change nothing
            about a run — only the room you play it in.
          </p>
          <p className={styles.count}>
            <span className={styles.num}>{unlockedCount}</span>
            <span className={styles.slash}>/</span>
            <span className={styles.num}>{THEMES.length}</span> unlocked
          </p>
        </div>

        <div className={styles.grid}>
          {THEMES.map((theme) => {
            const unlocked = isThemeUnlocked(theme.id, collection.endingsSeen);
            return (
              <ThemeSwatch
                key={theme.id}
                theme={theme}
                unlocked={unlocked}
                selected={collection.selectedThemeId === theme.id}
                hint={theme.endingId ? hintFor(theme.endingId) : undefined}
                onSelect={onSelect}
              />
            );
          })}
        </div>

        <footer className={styles.bottom}>
          <button type="button" className={styles.bottomBack} onClick={onBack}>
            Back to the title
          </button>
        </footer>
      </div>
    </main>
  );
}
