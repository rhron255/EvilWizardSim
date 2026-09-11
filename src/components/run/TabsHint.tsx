/**
 * A single floating line, shown once ever, naming the one affordance the tab
 * strip does not announce on its own: a horizontal swipe over Decision or
 * Career switches between them, same as tapping the tab. Tapping the tab
 * itself needs no teaching — it looks like a tab. Swiping does not look like
 * anything.
 *
 * `position: fixed` in `TabsHint.module.css`, deliberately outside the run
 * screen's column flow — CLAUDE.md's mobile budget is explicit that anything
 * added above or alongside the choice cards pushes them further down the
 * page, and a permanent addition there would do exactly that every single
 * run. This is not permanent: it floats over the screen without claiming any
 * of its layout, and is gone for good — see `dismissTabsHint` in
 * `useGame.ts` — the moment the player switches tabs by any method, taps it
 * away directly, or lets it sit long enough to have clearly been read.
 */

import { useEffect } from 'react';
import styles from './TabsHint.module.css';

/** Long enough to read one short sentence without hurrying, short enough
 * that ignoring it doesn't mean staring at a stale toast all era. */
const AUTO_DISMISS_MS = 6000;

export type TabsHintProps = {
  onDismiss(): void;
};

export function TabsHint({ onDismiss }: TabsHintProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <p className={styles.toast} role="status">
      Swipe sideways to switch between Decision and Career.
      <button
        type="button"
        className={styles.dismiss}
        onClick={onDismiss}
        aria-label="Dismiss hint"
      >
        ×
      </button>
    </p>
  );
}
