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
  /** 0-based. Rendered as the 1-based keycap and used for the number shortcut. */
  index: number;
  artifacts: Artifact[];
  factions: Faction[];
  disabled?: boolean;
  onChoose(index: number): void;
};

export function OptionCard({
  option,
  index,
  artifacts,
  factions,
  disabled = false,
  onChoose,
}: OptionCardProps) {
  const isGamble = option.kind === 'gamble';
  const successPct = isGamble ? Math.round(option.odds * 100) : 100;

  return (
    <button
      type="button"
      className={styles.card}
      data-kind={option.kind}
      disabled={disabled}
      onClick={() => onChoose(index)}
      data-option-index={index}
    >
      <span className={styles.keycap} aria-hidden="true">
        {index + 1}
      </span>

      <span className={styles.body}>
        <span className={styles.label}>{option.label}</span>

        {option.kind === 'certain' ? (
          <span className={styles.certain}>
            <EffectList effects={option.effects} artifacts={artifacts} factions={factions} />
          </span>
        ) : (
          <span className={styles.branches}>
            <span className={styles.branch} data-branch="success">
              <span className={`${styles.pct} ew-num`}>{formatOdds(option.odds)}</span>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
              <span className={styles.branchEffects}>
                <EffectList
                  effects={option.onSuccess}
                  artifacts={artifacts}
                  factions={factions}
                  compact
                />
              </span>
            </span>

            <span className={styles.branch} data-branch="failure">
              <span className={`${styles.pct} ew-num`}>{formatOdds(1 - option.odds)}</span>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
              <span className={styles.branchEffects}>
                <EffectList
                  effects={option.onFailure}
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
      </span>
    </button>
  );
}
