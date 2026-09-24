/**
 * One tappable choice.
 *
 * For a gamble this card is the contract with the player: both branches and
 * their probability are printed before the commit, in the format specified by
 * wiki/04_operational_behaviors-1.md. The odds are not a footnote — they are
 * the second-largest thing on the card after the label, with a rail that shows
 * the split as a quantity you can see rather than read.
 */

import type { Artifact, Faction, OfferOption } from '../../types';
import { EffectList } from './EffectList';
import { formatOdds } from './effectText';
import styles from './OptionCard.module.css';

export type OptionCardProps = {
  option: OfferOption;
  /**
   * The same option `option` may be a run-projected view of, unprojected.
   * Used only for the price shown when `reason` is set — see the note there.
   * Defaults to `option` when omitted.
   */
  rawOption?: OfferOption;
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
   * `rawOption` (never the projected `option`) is what it costs: a projected
   * "-8 Followers" on a wizard with exactly 8 was what made an unaffordable
   * option read as paid-for at a glance.
   */
  reason?: string;
  onChoose(index: number): void;
};

export function OptionCard({
  option,
  rawOption,
  index,
  artifacts,
  factions,
  disabled = false,
  reason,
  onChoose,
}: OptionCardProps) {
  const isGamble = option.kind === 'gamble';
  const successPct = isGamble ? Math.round(option.odds * 100) : 100;
  // Only swapped in for the price — the label, kind and odds never move
  // between the projected and authored copies of one option.
  const priced = reason ? (rawOption ?? option) : option;

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
        <span className={styles.lockMark} aria-hidden="true">
          ✕
        </span>
      )}

      <span className={styles.keycap} aria-hidden="true">
        {index + 1}
      </span>

      <span className={styles.body}>
        <span className={styles.label}>{option.label}</span>

        {priced.kind === 'certain' ? (
          <span className={styles.certain}>
            <EffectList effects={priced.effects} artifacts={artifacts} factions={factions} />
          </span>
        ) : (
          <span className={styles.branches}>
            <span className={styles.branch} data-branch="success">
              <span className={`${styles.pct} ew-num`}>{formatOdds(priced.odds)}</span>
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
              </span>
            </span>

            <span className={styles.branch} data-branch="failure">
              <span className={`${styles.pct} ew-num`}>{formatOdds(1 - priced.odds)}</span>
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
