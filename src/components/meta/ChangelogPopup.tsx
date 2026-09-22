/**
 * The launch popup for the backendless changelog (issue #67).
 *
 * Fires on the title screen when the player's acknowledged build version is
 * missing or older than the compiled one — see `App.tsx`'s changelog-ack
 * effect, which is what computes `entries` and calls `onDismiss` /
 * `onViewChangelog`. Brief on purpose: this shows each missed version's ONE
 * summary line, newest first; the fuller notes live on `ChangelogScreen`,
 * behind "View changelog".
 *
 * Rendered as a SIBLING of `TitleScreen`, not a child of it (see `App.tsx`)
 * — so it does not sit under the `data-theme` attribute `TitleScreen` sets on
 * its own root, and needs to carry `themeId` and apply `themeAttr` itself
 * (PR #68 review: "is the changelog themed as well?" — it was not).
 *
 * Also a sibling of every other title-screen control, still mounted and
 * still reachable by keyboard while this is open — Shift+Tab out of Dismiss
 * used to land on Begin/Resume behind it, which navigates away without ever
 * calling `onDismiss`, so the update comes back unacknowledged (PR #68
 * review). The keydown handler below traps Tab inside the card instead of
 * relying on DOM order to keep focus in.
 */

import { useEffect, useId, useRef } from 'react';
import type { PendingChangelogEntry, ThemeId } from '../../types';
import { formatChangelogVersion } from './changelogFormat';
import { themeAttr } from './themeAttr';
import styles from './ChangelogPopup.module.css';

export type ChangelogPopupProps = {
  entries: PendingChangelogEntry[];
  themeId: ThemeId;
  onViewChangelog(): void;
  onDismiss(): void;
};

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function ChangelogPopup({ entries, themeId, onViewChangelog, onDismiss }: ChangelogPopupProps) {
  const headingId = useId();
  const viewRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    viewRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
        return;
      }
      if (event.key !== 'Tab' || !cardRef.current) return;

      const focusable = Array.from(cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      // Wrap within the card rather than letting Tab escape to the
      // (still-mounted, still-interactive) title screen behind the scrim.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  return (
    <div
      className={styles.scrim}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      {...themeAttr(themeId)}
    >
      <div className={styles.card} ref={cardRef}>
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
              <span className={styles.version}>{formatChangelogVersion(version)}</span>
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
