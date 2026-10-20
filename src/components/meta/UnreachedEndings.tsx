/**
 * Up to three endings the player has not reached yet, between careers (issue #113).
 *
 * Each is printed as its existing `Ending.hint` and nothing else — the same
 * line the Necrolexicon's locked slot prints, so no new disclosure is made.
 * The list reads the persisted collection and the ending catalogue only: never
 * `goodActs`/`illActs` (rule 1's hidden-counter exception), so `good_wizard`
 * and `arch_lich` show their hint with no progress and no "closer". It lives on
 * the ending card's screen, outside the share image, and never on the run
 * screen (rule 5). Driven by `endings`, so a new ending appears by itself
 * (rule 6); Ascension is listed like any other, with no counter.
 */

import type { Ending, EndingId } from '../../types';
import { unreachedEndings } from './unreachedEndings';
import styles from './UnreachedEndings.module.css';

export type UnreachedEndingsProps = {
  endings: readonly Ending[];
  endingsSeen: readonly EndingId[];
  /** Opens the Necrolexicon's Endings tab on this slot. */
  onSelect(id: EndingId): void;
};

export function UnreachedEndings({ endings, endingsSeen, onSelect }: UnreachedEndingsProps) {
  const list = unreachedEndings(endings, endingsSeen);
  // Every ending reached: nothing to point at, and no empty heading either.
  if (list.length === 0) return null;
  return (
    <aside className={styles.wrap} aria-labelledby="unreached-endings-label">
      <p id="unreached-endings-label" className={styles.label}>
        Still unwritten
      </p>
      <ul className={styles.list}>
        {list.map((ending) => (
          <li key={ending.id}>
            <button
              type="button"
              className={styles.item}
              data-ending-id={ending.id}
              onClick={() => onSelect(ending.id)}
            >
              <span className={styles.hint}>{ending.hint}</span>
              <span className={styles.chev} aria-hidden>
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
