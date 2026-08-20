/**
 * The odds-display guarantee, rendered.
 *
 * Every consequence in the data becomes a line here — see `effectText.ts` for
 * the exhaustive walk of the `Effect` union. Muted on purpose: a gain is not a
 * celebration, a loss is not a punishment. The numbers are straight-faced
 * (wiki/02_data_models_and_content-1.md, Tone rule).
 */

import type { Artifact, Effect, Faction } from '../../types';
import { describeEffect, effectKey } from './effectText';
import styles from './EffectList.module.css';

export type EffectListProps = {
  effects: Effect[];
  artifacts: Artifact[];
  factions: Faction[];
  /** Inline, comma-flowed. Used inside a gamble's branch lines. */
  compact?: boolean;
};

export function EffectList({ effects, artifacts, factions, compact = false }: EffectListProps) {
  if (effects.length === 0) {
    return <span className={styles.nothing}>No change</span>;
  }

  const lines = effects.map((effect, i) => ({
    key: effectKey(effect, i),
    line: describeEffect(effect, artifacts, factions),
  }));

  if (compact) {
    return (
      <span className={styles.inline}>
        {lines.map(({ key, line }, i) => (
          <span key={key} className={styles.inlineItem} data-tone={line.tone}>
            {i > 0 && <span className={styles.sep} aria-hidden="true">, </span>}
            {line.num && <span className={`${styles.num} ew-num`}>{line.num}</span>}
            <span className={styles.label}>{line.text}</span>
          </span>
        ))}
      </span>
    );
  }

  return (
    <ul className={styles.list}>
      {lines.map(({ key, line }) => (
        <li key={key} className={styles.row} data-tone={line.tone}>
          <span className={`${styles.num} ew-num`}>{line.num ?? ''}</span>
          <span className={styles.label}>{line.text}</span>
        </li>
      ))}
    </ul>
  );
}
