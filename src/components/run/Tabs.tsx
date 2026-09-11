/**
 * A generic, presentational tabs primitive — WAI-ARIA APG "tabs" pattern,
 * automatic-activation variant. It knows nothing about the game: props in,
 * JSX out, exactly like `OfferPanel`/`Ledger`.
 *
 * Automatic activation means selection and focus move together — arrowing to
 * a tab selects it, there is no separate "activate" step. That is the right
 * choice here because a caller's panel is expected to hold stateful content
 * (its own keydown listener, its own animation effects) that must not run
 * while its tab is not the one on screen, so only the selected panel's
 * content is ever mounted (see the render below).
 *
 * A horizontal swipe over the tablist OR the panel also switches tabs — the
 * reference device is a phone (CLAUDE.md, "Mobile is the target audience"),
 * and a tap-only switcher makes a player's thumb travel all the way back up
 * to the tabs every time, on a screen whose whole point is one-handed use.
 * Swipe measures only on `touchend`; it never calls `preventDefault` on
 * `touchmove`, so it cannot fight the page's own vertical scroll — the CSS
 * `touch-action: pan-y` on `.wrap` is what actually keeps a horizontal drag
 * from being swallowed by the browser's own gestures (edge-swipe-to-go-back
 * on iOS Safari, in particular) before this component ever sees it.
 *
 * The panel that becomes selected plays a brief slide-and-fade — CSS only,
 * in `Tabs.module.css` — in the direction travel actually went: `data-
 * direction` on `.wrap` compares this render's selected index against the
 * PREVIOUS one (tracked in `prevIndexRef`, updated in an effect so the
 * comparison during render still sees the old value), the same for a click,
 * an arrow key, or a swipe, so the motion always agrees with which way the
 * player just moved. It costs nothing on the unmount side: each panel `div`
 * already toggles `display: none` via `hidden`, and a CSS animation restarts
 * on its own the moment an element re-enters the render tree, so no timer or
 * transition-end listener is needed to keep it in sync with the mount/unmount
 * this component already does.
 *
 * The root `.wrap` node is forwarded via ref — not because this component
 * needs it, but because a caller with two panels of very different length
 * (Decision's cards, Career's ledger) needs a hook to reset scroll position
 * on switch: the sticky tablist alone does not do that, and a scroll deep
 * into one panel otherwise lands the player mid-way into whichever panel
 * comes up next. See `RunScreen`'s `scrollIntoView` on this ref.
 */

import { forwardRef, useCallback, useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode, TouchEvent as ReactTouchEvent } from 'react';
import styles from './Tabs.module.css';

/** Short enough to catch a deliberate flick, long enough that a tap (near-zero
 * movement) or a stray brush never registers as one. */
const SWIPE_MIN_DISTANCE = 50;
/** How much vertical drift a still-horizontal swipe is allowed — past this,
 * the gesture reads as a scroll that happened to start on a diagonal. */
const SWIPE_MAX_OFF_AXIS = 60;

export type TabItem = {
  id: string;
  label: string;
  panel: ReactNode;
};

export type TabsProps = {
  tabs: TabItem[];
  selected: string;
  onSelect(id: string): void;
  /** Accessible name for the tablist itself, e.g. "Run screen". */
  label: string;
};

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  { tabs, selected, onSelect, label },
  ref,
) {
  const base = useId();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const tabId = useCallback((id: string) => `${base}-tab-${id}`, [base]);
  const panelId = useCallback((id: string) => `${base}-panel-${id}`, [base]);

  // -1 (not found) reads as "did not move backward", which only matters if a
  // caller ever passes a `selected` id absent from `tabs` — the same case
  // every other index lookup here already treats as a no-op.
  const currentIndex = tabs.findIndex((t) => t.id === selected);
  const prevIndexRef = useRef(currentIndex);
  const direction = currentIndex >= prevIndexRef.current ? 'forward' : 'backward';
  useEffect(() => {
    prevIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Arrow keys move focus AND select in the same action (automatic
  // activation). Scoped to the tab buttons themselves via onKeyDown — unlike
  // OfferPanel's number-key shortcut, this must only fire when a tab button
  // already has focus, so a window-level listener would be wrong here.
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();

      const container = event.currentTarget.closest('[role="tablist"]');
      if (!container) return;
      const buttons = Array.from(
        container.querySelectorAll<HTMLButtonElement>('button[role="tab"]'),
      );
      if (buttons.length === 0) return;

      const current = buttons.findIndex((b) => b === event.currentTarget);
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const from = current === -1 ? 0 : current;
      const next = (((from + delta) % buttons.length) + buttons.length) % buttons.length;

      const target = tabs[next];
      buttons[next]?.focus();
      if (target) onSelect(target.id);
    },
    [onSelect, tabs],
  );

  // Single-finger only: a second finger joining mid-gesture means this was
  // never a clean swipe, so onTouchEnd below bails while any touch remains.
  const onTouchStart = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches.length === 1 ? event.touches[0] : undefined;
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }, []);

  const onTouchEnd = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start || event.touches.length > 0) return;

      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      // Dominance, not just the two absolute thresholds: 50px sideways and
      // 59px vertically clears both bounds individually, but that drag is
      // closer to a scroll than a swipe. Requiring the horizontal leg to
      // actually be the larger one catches it without tightening either
      // threshold on its own.
      if (absDx < SWIPE_MIN_DISTANCE || absDy > SWIPE_MAX_OFF_AXIS || absDx <= absDy) return;

      if (currentIndex === -1) return;
      // Swipe left (finger travels right-to-left) reveals the next tab, same
      // direction the tab strip itself already reads in.
      const delta = dx < 0 ? 1 : -1;
      const next = tabs[Math.max(0, Math.min(tabs.length - 1, currentIndex + delta))];
      if (next && next.id !== selected) onSelect(next.id);
    },
    [tabs, selected, currentIndex, onSelect],
  );

  return (
    <div
      ref={ref}
      className={styles.wrap}
      data-direction={direction}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className={styles.tablist} role="tablist" aria-label={label}>
        {tabs.map((tab) => {
          const isSelected = tab.id === selected;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={tabId(tab.id)}
              className={styles.tab}
              data-selected={isSelected || undefined}
              aria-selected={isSelected}
              aria-controls={panelId(tab.id)}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(tab.id)}
              onKeyDown={onKeyDown}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => {
        const isSelected = tab.id === selected;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={panelId(tab.id)}
            className={styles.panel}
            aria-labelledby={tabId(tab.id)}
            tabIndex={0}
            hidden={!isSelected}
          >
            {isSelected ? tab.panel : null}
          </div>
        );
      })}
    </div>
  );
});
