/**
 * The launch popup for the backendless changelog (issue #67).
 *
 * Fires on the title screen when the player's acknowledged build version is
 * missing or older than the compiled one — see `App.tsx`'s changelog-ack
 * effect, which is what computes `entries` and calls `onDismiss` /
 * `onViewChangelog`. Brief on purpose: this shows each missed version's ONE
 * summary line, newest first; the fuller notes live on `ChangelogScreen`,
 * behind "View changelog".
 */

import { useEffect, useId, useRef } from 'react';
import type { PendingChangelogEntry } from '../../content/changelog';
import styles from './ChangelogPopup.module.css';

export type ChangelogPopupProps = {
  entries: PendingChangelogEntry[];
  onViewChangelog(): void;
  onDismiss(): void;
};

export function ChangelogPopup({ entries, onViewChangelog, onDismiss }: ChangelogPopupProps) {
  const headingId = useId();
  const viewRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    viewRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  return (
    <div className={styles.scrim} role="dialog" aria-modal="true" aria-labelledby={headingId}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>
          {entries.length === 1
            ? 'Since your last visit'
            : `${entries.length} updates since your last visit`}
        </p>
        <h2 className={styles.title} id={headingId}>
          What&rsquo;s new
        </h2>

        <ul className={styles.list}>
          {entries.map(({ version, entry }) => (
            <li key={version} className={styles.item}>
              <span className={styles.version}>{version}</span>
              <span className={styles.summary}>{entry.summary}</span>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <button type="button" className={styles.dismiss} onClick={onDismiss}>
            Dismiss
          </button>
          <button type="button" className={styles.view} onClick={onViewChangelog} ref={viewRef}>
            View changelog
          </button>
        </div>
      </div>
    </div>
  );
}
