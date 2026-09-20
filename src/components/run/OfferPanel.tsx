/**
 * The era's decision: title, comedic body, and 2-4 choice cards.
 *
 * Keyboard-complete by design — number keys pick directly, arrows walk the
 * list, Enter commits the focused card. The panel never requires typing
 * (wiki/06_reference_analysis.md, principle 3).
 */

import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import type { Artifact, Faction, Offer, OfferOption, RunState } from '../../types';
import type { ContentBundle } from '../../engine';
import { conditionMet, impliedGatesOf, isOptionPickable } from '../../engine';
import { describeGate } from './effectText';
import { OptionCard } from './OptionCard';
import styles from './OfferPanel.module.css';

export type OfferPanelProps = {
  offer: Offer;
  run: RunState;
  content: ContentBundle;
  artifacts: Artifact[];
  factions: Faction[];
  disabled?: boolean;
  onChoose(index: number): void;
};

type OptionGate = { pickable: boolean; reason?: string };

/**
 * Whether ONE option can actually be chosen right now, and — if not — why.
 *
 * `isOptionPickable` is the source of truth for the boolean. The reason line
 * is derived separately, by re-walking the same `impliedGatesOf(option)` list
 * through `conditionMet` to find the first gate that is failing — the two
 * calls are not the same work twice: `isOptionPickable` only needs to know
 * IF something fails, this needs to know WHICH one, to describe it.
 *
 * `reason` stays `undefined` if `isOptionPickable` says the option cannot be
 * chosen but no single failing gate can be found (should not happen given the
 * two functions' documented contracts, but degrading to today's plain
 * disabled-and-dimmed card — full `EffectList` still shown — is safer than a
 * blank reason line).
 */
function gateFor(
  run: RunState,
  option: OfferOption,
  content: ContentBundle,
): OptionGate {
  if (isOptionPickable(run, option, content)) return { pickable: true };
  const failing = impliedGatesOf(option).find((c) => !conditionMet(run, c, content));
  return {
    pickable: false,
    reason: failing ? describeGate(failing, run, content) : undefined,
  };
}

export function OfferPanel({
  offer,
  run,
  content,
  artifacts,
  factions,
  disabled = false,
  onChoose,
}: OfferPanelProps) {
  const titleId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const count = offer.options.length;

  const optionGates = useMemo(
    () => offer.options.map((option) => gateFor(run, option, content)),
    [offer.options, run, content],
  );

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
          // A disabled `<button>` refuses a click on its own; this path goes
          // straight through `window`'s keydown listener and never touches
          // the button, so it needs its own explicit affordability check —
          // the same one `disabled` on the card enforces for click/Enter.
          if (optionGates[index]?.pickable) onChoose(index);
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
  }, [count, disabled, moveFocus, onChoose, optionGates]);

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
        {offer.options.map((option, i) => {
          const gate = optionGates[i];
          return (
            <OptionCard
              key={`${offer.id}-${i}-${option.label}`}
              option={option}
              index={i}
              artifacts={artifacts}
              factions={factions}
              disabled={disabled || !gate?.pickable}
              reason={gate?.reason}
              onChoose={onChoose}
            />
          );
        })}
      </div>

      <p className={styles.hint} aria-hidden="true">
        <span className={styles.hintKeys}>1</span>–<span className={styles.hintKeys}>{count}</span>{' '}
        to choose · <span className={styles.hintKeys}>↑↓</span> to move ·{' '}
        <span className={styles.hintKeys}>↵</span> to commit
      </p>
    </section>
  );
}
