/**
 * Lair tenures, derived from the append-only era log.
 *
 * The ending card's lair grid is the highest-value element on the screen — the
 * reference game's club grid was its most-shared object — and it is entirely
 * reconstructable from `run.eras`, which is why nothing here needs the engine.
 */

import type { Lair, RunState } from '../../types';

export type LairTenure = {
  lair: Lair;
  /** Age when the wizard moved in. */
  fromAge: number;
  /** Age at the last era spent here. */
  toAge: number;
  eras: number;
  /** The lair the career ended in. */
  last: boolean;
};

/**
 * Walk the era log in order and collapse consecutive eras in the same lair into
 * one tenure. A wizard who returns to an earlier lair gets two entries, because
 * that is a different chapter of the same biography.
 */
export function lairTenures(run: RunState, lairs: Lair[]): LairTenure[] {
  const byId = new Map(lairs.map((l) => [l.id, l]));
  const out: LairTenure[] = [];

  for (const era of run.eras) {
    const lair = byId.get(era.lairId);
    if (!lair) continue;

    const prev = out[out.length - 1];
    if (prev && prev.lair.id === lair.id) {
      prev.toAge = era.age;
      prev.eras += 1;
    } else {
      out.push({ lair, fromAge: era.age, toAge: era.age, eras: 1, last: false });
    }
  }

  // Cover the case where the run's current lair never made it into the log.
  if (out.length === 0) {
    const lair = byId.get(run.lairId);
    if (lair) out.push({ lair, fromAge: run.age, toAge: run.age, eras: 1, last: true });
  } else {
    out[out.length - 1].last = true;
    out[out.length - 1].toAge = Math.max(out[out.length - 1].toAge, run.age);
  }

  return out;
}

const NUMERALS: [number, string][] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

/** Lair tiers read as a ladder; roman numerals make that legible at a glance. */
export function roman(n: number): string {
  if (n <= 0) return '0';
  let rest = Math.floor(n);
  let out = '';
  for (const [value, glyph] of NUMERALS) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}
