/**
 * One tappable choice.
 *
 * For a gamble this card is the contract with the player: both branches and
 * their probability are printed before the commit, in the format specified by
 * wiki/04_operational_behaviors-1.md. The odds are not a footnote — they are
 * the second-largest thing on the card after the label, with a rail that shows
 * the split as a quantity you can see rather than read.
 */

import type { RelicEvent, RelicReactionPreview } from '../../engine';
import type { Artifact, Effect, Faction, OfferOption } from '../../types';
import { EffectList } from './EffectList';
import { artifactName, formatOdds } from './effectText';
import styles from './OptionCard.module.css';

/**
 * One attributed line per relic that actually reacts to this branch (issue
 * #80's rule-1 requirement: "any deterministic relic reaction is projected
 * onto the offer card before the player commits"). Reuses `EffectList`'s
 * `compact` renderer for the effect part, so a relic whose own effect fans
 * out (a standing gain that spills contagion) reads with the same
 * comma-flowed vocabulary the option's own effects already use — no second
 * rendering language invented for it.
 */
export function RelicReactions({
  events,
  artifacts,
  factions,
}: {
  events: RelicEvent[];
  artifacts: Artifact[];
  factions: Faction[];
}) {
  if (events.length === 0) return null;
  return (
    <ul className={styles.reactions}>
      {events.map((event) => (
        <li key={event.artifactId} className={styles.reactionRow}>
          <span className={styles.reactionName}>{artifactName(event.artifactId, artifacts)}</span>
          <EffectList effects={event.applied} artifacts={artifacts} factions={factions} compact />
        </li>
      ))}
    </ul>
  );
}

/**
 * The stock types `impliedGatesOf` (`src/engine/conditions.ts`) gates on —
 * the ones that floor-clamp, so their PROJECTED magnitude can read as
 * cheaper than the authored cost the gate actually enforces. `standing` is
 * deliberately excluded even though `projectEffects` also rewrites it
 * (contagion can add rows a `standing` effect's author never wrote): that
 * rewrite is additional honest disclosure, not a clamp hiding the true cost,
 * so it must stay projected even on a card the player cannot afford.
 * `loseArtifact` needs no entry here — it is never in `PROJECTABLE`
 * (`src/engine/effects.ts`), so the authored and projected copies are
 * already identical.
 */
const GATED_STOCK_TYPES: ReadonlySet<Effect['t']> = new Set(['followers', 'apprentices', 'lairTier']);

/**
 * Swap in the authored magnitude for exactly the stock costs a floor clamp
 * can hide, while keeping every other effect — including contagion rows
 * `projectEffects` adds that the authored list never had — as projected.
 *
 * This is intentionally NOT "show the whole authored option instead of the
 * projected one" on an unaffordable card: that swap was tried first and a
 * review caught the regression it causes (PR #85) — a card whose Standing
 * effect fans out via contagion (`applyStanding`'s `hostileTo` spill) would
 * silently lose those extra rows the instant it became unaffordable, one of
 * the exact undisclosed-consequence shapes CLAUDE.md's rule 1 bans. Only the
 * types the affordability gate itself cares about (`GATED_STOCK_TYPES`) are
 * ever swapped, matched by type and by the order they occur in — safe
 * because none of them fan out the way `standing` does, so the authored and
 * projected lists always carry the same count of each.
 */
function withAuthoredStockCosts(projected: readonly Effect[], authored: readonly Effect[]): Effect[] {
  const pending = new Map<Effect['t'], Effect[]>();
  for (const effect of authored) {
    if (!GATED_STOCK_TYPES.has(effect.t)) continue;
    const queue = pending.get(effect.t) ?? [];
    queue.push(effect);
    pending.set(effect.t, queue);
  }
  return projected.map((effect) => {
    if (!GATED_STOCK_TYPES.has(effect.t)) return effect;
    return pending.get(effect.t)?.shift() ?? effect;
  });
}

export type OptionCardProps = {
  option: OfferOption;
  /**
   * The same option `option` may be a run-projected view of, unprojected.
   * Used only for the price shown when `reason` is set, and only to recover
   * the authored magnitude of the specific stock costs a floor clamp can
   * hide — see `withAuthoredStockCosts`' doc comment. Defaults to `option`
   * when omitted.
   */
  rawOption?: OfferOption;
  /**
   * The odds a gamble actually carries for this run (`effectiveOdds`,
   * `src/engine/relics.ts`) — what `resolveChoice` rolls against, not
   * necessarily `option.odds`. Undefined for a test or caller that has not
   * wired it, which falls back to `option.odds` and renders exactly like
   * today; a `certain` option ignores this entirely. Wiring it here, rather
   * than leaving the card to read `option.odds` on its own, is what keeps a
   * future odds-changing relic from making the printed number and the real
   * roll two different odds for the same option — the same seam
   * `effectiveOdds`'s own doc comment describes.
   */
  odds?: number;
  /** 0-based. Rendered as the 1-based keycap and used for the number shortcut. */
  index: number;
  artifacts: Artifact[];
  factions: Faction[];
  disabled?: boolean;
  /**
   * Set only when `disabled` is true BECAUSE the option is currently
   * unaffordable (per `impliedGatesOf`/`isOptionPickable` in the engine) —
   * never merely because a resolution overlay is up. Its presence, not
   * `disabled` alone, adds the reason line and the lock mark, and states the
   * reason in the `aria-label` (mirrors `ThemeSwatch`'s locked swatch).
   *
   * The price still prints alongside it — a card the player cannot afford is
   * exactly the card where they most need to see what it actually costs, and
   * the authored magnitude of the gated stock cost (never the projected,
   * floor-clamped one) is what it costs: a projected "-8 Followers" on a
   * wizard with exactly 8 was what made an unaffordable option read as
   * paid-for at a glance. See `withAuthoredStockCosts` for why this swaps
   * only that cost and not the option's other, still-projected effects.
   */
  reason?: string;
  /**
   * What a held relic will do if this option is picked (`projectReactions`,
   * `src/engine/relics.ts`) — undefined for a test or caller that has not
   * wired it, which renders exactly like today: no reaction lines. Computed
   * from `rawOption`, the authored option, the same input `projectReactions`
   * itself expects.
   */
  reactions?: RelicReactionPreview;
  onChoose(index: number): void;
};

export function OptionCard({
  option,
  rawOption,
  odds,
  index,
  artifacts,
  factions,
  disabled = false,
  reason,
  reactions,
  onChoose,
}: OptionCardProps) {
  const isGamble = option.kind === 'gamble';
  const printedOdds = odds ?? (isGamble ? option.odds : 1);
  const successPct = isGamble ? Math.round(printedOdds * 100) : 100;
  // Merged, not swapped: an unaffordable card keeps every projected effect
  // (contagion rows included) and only its gated stock cost reverts to the
  // authored number. See `withAuthoredStockCosts`.
  const priced =
    reason && rawOption
      ? option.kind === 'certain' && rawOption.kind === 'certain'
        ? { ...option, effects: withAuthoredStockCosts(option.effects, rawOption.effects) }
        : option.kind === 'gamble' && rawOption.kind === 'gamble'
          ? {
              ...option,
              onSuccess: withAuthoredStockCosts(option.onSuccess, rawOption.onSuccess),
              onFailure: withAuthoredStockCosts(option.onFailure, rawOption.onFailure),
            }
          : option
      : option;

  return (
    <button
      type="button"
      className={styles.card}
      data-kind={option.kind}
      data-unaffordable={reason ? 'true' : undefined}
      disabled={disabled}
      aria-label={reason ? `${option.label} — unaffordable: ${reason}` : undefined}
      onClick={() => onChoose(index)}
      data-option-index={index}
    >
      {reason && (
        <svg
          className={styles.lockMark}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line x1="4" y1="4" x2="96" y2="96" />
          <line x1="96" y1="4" x2="4" y2="96" />
        </svg>
      )}

      <span className={styles.keycap} aria-hidden="true">
        {index + 1}
      </span>

      <span className={styles.body}>
        <span className={styles.label}>{option.label}</span>

        {priced.kind === 'certain' ? (
          <span className={styles.certain}>
            <EffectList effects={priced.effects} artifacts={artifacts} factions={factions} />
            {reactions?.kind === 'certain' && (
              <RelicReactions events={reactions.events} artifacts={artifacts} factions={factions} />
            )}
          </span>
        ) : (
          <span className={styles.branches}>
            <span className={styles.branch} data-branch="success">
              <span className={`${styles.pct} ew-num`}>{formatOdds(printedOdds)}</span>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
              <span className={styles.branchEffects}>
                <EffectList
                  effects={priced.onSuccess}
                  artifacts={artifacts}
                  factions={factions}
                  compact
                />
                {reactions?.kind === 'gamble' && (
                  <RelicReactions events={reactions.onSuccess} artifacts={artifacts} factions={factions} />
                )}
              </span>
            </span>

            <span className={styles.branch} data-branch="failure">
              <span className={`${styles.pct} ew-num`}>{formatOdds(1 - printedOdds)}</span>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
              <span className={styles.branchEffects}>
                <EffectList
                  effects={priced.onFailure}
                  artifacts={artifacts}
                  factions={factions}
                  compact
                />
                {reactions?.kind === 'gamble' && (
                  <RelicReactions events={reactions.onFailure} artifacts={artifacts} factions={factions} />
                )}
              </span>
            </span>

            {/* The split as a quantity, under the numbers that name it. */}
            <span className={styles.rail} aria-hidden="true">
              <span className={styles.railFill} style={{ width: `${successPct}%` }} />
            </span>
          </span>
        )}

        {reason && <span className={styles.reason}>{reason}</span>}
      </span>
    </button>
  );
}
