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

/**
 * Merge repeats of the same additive effect into one line.
 *
 * A single option can touch the same faction twice — once directly, once as
 * contagion along `hostileTo` — and each landed separately, so a resolution
 * could read "-15 Standing · The Pale Academy" and "-12 Standing · The Pale
 * Academy" three lines apart. Both true, and together unreadable: the player
 * cannot see their net position without doing arithmetic. Same for a stat hit
 * twice by one card.
 *
 * Only quantities merge. `loseArtifact` stays one line per relic, because
 * losing three is three losses, not a `-3`.
 */
function coalesce(effects: Effect[]): Effect[] {
  const out: Effect[] = [];
  const at = new Map<string, number>();

  for (const e of effects) {
    let bucket: string | null = null;
    if (e.t === 'standing') bucket = `standing:${e.factionId}`;
    else if (
      e.t === 'notoriety' ||
      e.t === 'followers' ||
      e.t === 'apprentices' ||
      e.t === 'loyalty' ||
      e.t === 'pactDebt' ||
      e.t === 'heroThreat' ||
      e.t === 'lairTier'
    ) {
      bucket = e.t;
    }

    if (bucket === null) {
      out.push(e);
      continue;
    }

    const seen = at.get(bucket);
    if (seen === undefined) {
      at.set(bucket, out.length);
      out.push({ ...e });
      continue;
    }
    const prev = out[seen] as Extract<Effect, { v: number }>;
    prev.v += (e as Extract<Effect, { v: number }>).v;
  }

  // A pair that cancels exactly is not a consequence worth a line.
  return out.filter((e) => !('v' in e) || e.v !== 0);
}

export function EffectList({ effects, artifacts, factions, compact = false }: EffectListProps) {
  const merged = coalesce(effects);

  if (merged.length === 0) {
    return <span className={styles.nothing}>No change</span>;
  }

  const lines = merged.map((effect, i) => ({
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
