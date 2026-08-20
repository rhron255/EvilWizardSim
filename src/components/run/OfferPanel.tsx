/**
 * The era's decision: title, comedic body, and 2-4 choice cards.
 *
 * Keyboard-complete by design — number keys pick directly, arrows walk the
 * list, Enter commits the focused card. The panel never requires typing
 * (wiki/06_reference_analysis.md, principle 3).
 */

import { useCallback, useEffect, useId, useRef } from 'react';
import type { Artifact, Faction, Offer } from '../../types';
import { OptionCard } from './OptionCard';
import styles from './OfferPanel.module.css';

export type OfferPanelProps = {
  offer: Offer;
  artifacts: Artifact[];
  factions: Faction[];
  disabled?: boolean;
  onChoose(index: number): void;
};

export function OfferPanel({
  offer,
  artifacts,
  factions,
  disabled = false,
  onChoose,
}: OfferPanelProps) {
  const titleId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const count = offer.options.length;

  const buttons = useCallback((): HTMLButtonElement[] => {
    const el = listRef.current;
    if (!el) return [];
    return Array.from(el.querySelectorAll<HTMLButtonElement>('button[data-option-index]'));
  }, []);

  const moveFocus = useCallback(
    (delta: number) => {
      const items = buttons();
      if (items.length === 0) return;
      const active = document.activeElement;
      const current = items.findIndex((b) => b === active);
      const next = current === -1 ? (delta > 0 ? 0 : items.length - 1) : current + delta;
      const clamped = ((next % items.length) + items.length) % items.length;
      items[clamped]?.focus();
    },
    [buttons],
  );

  // Number keys work from anywhere on the screen — the player's hands should
  // never have to find the list first.
  useEffect(() => {
    if (disabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (event.key >= '1' && event.key <= '9') {
        const index = Number(event.key) - 1;
        if (index < count) {
          event.preventDefault();
          onChoose(index);
        }
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        moveFocus(1);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        moveFocus(-1);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [count, disabled, moveFocus, onChoose]);

  const faction = offer.factionId ? factions.find((f) => f.id === offer.factionId) : undefined;

  return (
    <section className={styles.panel} aria-labelledby={titleId} data-disabled={disabled}>
      <header className={styles.header}>
        {faction && <p className={styles.eyebrow}>{faction.name}</p>}
        <h2 id={titleId} className={styles.title}>
          {offer.title}
        </h2>
        <p className={styles.body}>{offer.body}</p>
      </header>

      <div className={styles.options} role="group" aria-label="Choices" ref={listRef}>
        {offer.options.map((option, i) => (
          <OptionCard
            key={`${offer.id}-${i}-${option.label}`}
            option={option}
            index={i}
            artifacts={artifacts}
            factions={factions}
            disabled={disabled}
            onChoose={onChoose}
          />
        ))}
      </div>

      <p className={styles.hint} aria-hidden="true">
        <span className={styles.hintKeys}>1</span>–<span className={styles.hintKeys}>{count}</span>{' '}
        to choose · <span className={styles.hintKeys}>↑↓</span> to move ·{' '}
        <span className={styles.hintKeys}>↵</span> to commit
      </p>
    </section>
  );
}
