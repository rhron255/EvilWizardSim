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
 */

import { useCallback, useId } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import styles from './Tabs.module.css';

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

export function Tabs({ tabs, selected, onSelect, label }: TabsProps) {
  const base = useId();

  const tabId = useCallback((id: string) => `${base}-tab-${id}`, [base]);
  const panelId = useCallback((id: string) => `${base}-panel-${id}`, [base]);

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

  return (
    <div className={styles.wrap}>
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
}
