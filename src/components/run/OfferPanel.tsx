/**
 * The era's decision: title, comedic body, and 2-4 choice cards.
 *
 * Keyboard-complete by design — number keys pick directly, arrows walk the
 * list, Enter commits the focused card. The panel never requires typing
 * (wiki/06_reference_analysis.md, principle 3).
 */

import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import type { Artifact, Effect, Faction, Offer, OfferOption, RunState } from '../../types';
import type { ContentBundle, RelicEvent, RelicReactionPreview } from '../../engine';
import { conditionMet, effectiveOdds, impliedGatesOf, isOptionPickable, projectReactions } from '../../engine';
import { describeGate } from './effectText';
import { OptionCard, RelicReactions } from './OptionCard';
import styles from './OfferPanel.module.css';

export type OfferPanelProps = {
  offer: Offer;
  /**
   * The unprojected counterpart of `offer` — same options, same order,
   * authored magnitudes rather than the run-projected ones `offer` may carry.
   * Affordability gating (`gateFor` below) is computed against THIS, never
   * against `offer`: a projected follower cost that floor-clamped from -15 to
   * -8 would otherwise gate on -8, and a wizard with exactly 8 followers would
   * see the card as pickable right up until the engine — which validates
   * against the same authored magnitudes this prop carries — refuses it.
   * Defaults to `offer` when omitted, which is correct wherever the caller's
   * `offer` was never projected to begin with.
   */
  rawOffer?: Offer;
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

// ---------------------------------------------------------------------------
// Ambient relic reactions (styling convention 3)
// ---------------------------------------------------------------------------

function sameApplied(a: readonly Effect[], b: readonly Effect[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Every branch of every option this offer previews — a `certain` has one, a `gamble` two. */
function allBranches(previews: readonly RelicReactionPreview[]): RelicEvent[][] {
  return previews.flatMap((p) => (p.kind === 'certain' ? [p.events] : [p.onSuccess, p.onFailure]));
}

/**
 * A relic event is AMBIENT for this offer when it lands, with the exact same
 * applied effects, on EVERY branch of EVERY option — an unconditional
 * era-end trigger (the Mantle) fires the same way whatever gets picked, so it
 * is not a consequence of the choice at all. Printing it on every card
 * anyway is exactly what CLAUDE.md's styling convention 3 bans: "if two
 * elements on one screen state the same … consequence, drop whichever copy
 * is not the ambient line for it." This IS that ambient line — rendered once
 * for the whole offer instead of once per card (issue #80 review).
 *
 * An event that varies by branch (the Purse only tops up on branches that
 * leave followers under ten) or is absent on some — never counts as ambient,
 * and stays exactly where it already was: attributed to the specific
 * branch that actually produces it.
 */
function ambientReactionsOf(previews: readonly RelicReactionPreview[]): RelicEvent[] {
  const branches = allBranches(previews);
  const [first, ...rest] = branches;
  if (!first) return [];
  return first.filter((event) =>
    rest.every((branch) =>
      branch.some((e) => e.artifactId === event.artifactId && sameApplied(e.applied, event.applied)),
    ),
  );
}

function withoutAmbient(events: readonly RelicEvent[], ambient: readonly RelicEvent[]): RelicEvent[] {
  const ambientIds = new Set(ambient.map((e) => e.artifactId));
  return events.filter((e) => !ambientIds.has(e.artifactId));
}

function withoutAmbientReactions(
  preview: RelicReactionPreview,
  ambient: readonly RelicEvent[],
): RelicReactionPreview {
  return preview.kind === 'certain'
    ? { kind: 'certain', events: withoutAmbient(preview.events, ambient) }
    : {
        kind: 'gamble',
        onSuccess: withoutAmbient(preview.onSuccess, ambient),
        onFailure: withoutAmbient(preview.onFailure, ambient),
      };
}

export function OfferPanel({
  offer,
  rawOffer,
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
  const gateOptions = (rawOffer ?? offer).options;

  const optionGates = useMemo(
    () => gateOptions.map((option) => gateFor(run, option, content)),
    [gateOptions, run, content],
  );

  // Rule 1: any deterministic relic reaction is projected onto the card
  // before the commit. Computed from `gateOptions` (the AUTHORED option,
  // same as `gateFor` above) so the preview matches what `resolveChoice` will
  // actually apply, never a copy already rewritten by `projectEffects`.
  const optionReactions = useMemo(
    () => gateOptions.map((option) => projectReactions(run, option, content)),
    [gateOptions, run, content],
  );

  // Same reasoning as `optionReactions`: computed from `gateOptions` (the
  // AUTHORED option) so the odds printed on the card are the odds
  // `resolveChoice` actually rolls against, via the same `effectiveOdds` seam
  // — never `option.odds` read straight off a UI-projected copy.
  const optionOdds = useMemo(
    () => gateOptions.map((option) => effectiveOdds(run, option)),
    [gateOptions, run],
  );

  // Styling convention 3: a reaction every branch of every option produces
  // identically (an unconditional era-end trigger) is not a consequence of
  // THIS choice, so it renders once, ambient to the offer, rather than
  // repeated on every card — see `ambientReactionsOf`'s own doc comment.
  const ambientReactions = useMemo(() => ambientReactionsOf(optionReactions), [optionReactions]);
  const cardReactions = useMemo(
    () => optionReactions.map((preview) => withoutAmbientReactions(preview, ambientReactions)),
    [optionReactions, ambientReactions],
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

        {/* Styling convention 3: stated once, here, for whichever option gets
            picked — never repeated per-card once it no longer distinguishes
            them (see `ambientReactionsOf`). */}
        {ambientReactions.length > 0 && (
          <div className={styles.ambientReactions}>
            <p className={styles.ambientReactionsLabel}>Whatever you choose</p>
            <RelicReactions events={ambientReactions} artifacts={artifacts} factions={factions} />
          </div>
        )}
      </header>

      <div className={styles.options} role="group" aria-label="Choices" ref={listRef}>
        {offer.options.map((option, i) => {
          const gate = optionGates[i];
          return (
            <OptionCard
              key={`${offer.id}-${i}-${option.label}`}
              option={option}
              rawOption={gateOptions[i]}
              odds={optionOdds[i]}
              index={i}
              artifacts={artifacts}
              factions={factions}
              disabled={disabled || !gate?.pickable}
              reason={gate?.reason}
              reactions={cardReactions[i]}
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
