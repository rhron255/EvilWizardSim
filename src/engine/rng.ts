/**
 * Seeded pseudo-randomness.
 *
 * WHY THIS SHAPE: `RunState` is frozen by `src/types.ts` and has nowhere to
 * store a mutable PRNG cursor. Rather than smuggle one in on the side (which
 * would not survive the JSON round-trip through `localStorage`), every random
 * draw derives its stream from data that *is* in the run — `seed` plus the era
 * index plus a purpose label.
 *
 * The consequence is stronger than a threaded cursor: every engine function is
 * a pure function of `RunState`. `nextOffer(run)` called twice returns the same
 * offer. A run saved mid-arc and reloaded continues identically. Same seed,
 * same choices, same biography — which is what the sim harness and the
 * determinism tests actually depend on.
 */

export type Rng = () => number;

/** mulberry32 — small, fast, and good enough for a game about wizards. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * FNV-1a-flavored mixing of a base seed with labelled parts.
 *
 * Distinct labels give decorrelated streams, so the offer-sampling draw for
 * era 4 cannot shift the gamble roll for era 4.
 */
export function deriveSeed(seed: number, ...parts: Array<string | number>): number {
  let h = (seed >>> 0) ^ 0x9e3779b9;
  for (const part of parts) {
    const s = typeof part === 'number' ? `#${part}` : part;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h = (h ^ (h >>> 13)) >>> 0;
  }
  // Final avalanche so short labels still scatter.
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

/** A fresh, independent stream for (seed, ...parts). */
export function streamFor(seed: number, ...parts: Array<string | number>): Rng {
  return mulberry32(deriveSeed(seed, ...parts));
}

/** Stable 32-bit hash of a string. Used for deterministic run ids. */
export function hashString(s: string): number {
  return deriveSeed(0, s);
}

/** Integer in [min, max] inclusive. */
export function randInt(rng: Rng, min: number, max: number): number {
  if (max <= min) return min;
  return min + Math.floor(rng() * (max - min + 1));
}

/** Uniform pick. Returns undefined only for an empty list. */
export function pick<T>(rng: Rng, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rng() * items.length)];
}

/**
 * Weighted pick. Non-positive weights are skipped entirely; if every weight is
 * non-positive the first item wins rather than the caller getting undefined
 * for a non-empty list.
 */
export function weightedPick<T>(
  rng: Rng,
  items: readonly T[],
  weightOf: (item: T) => number,
): T | undefined {
  if (items.length === 0) return undefined;
  let total = 0;
  const weights: number[] = new Array(items.length);
  for (let i = 0; i < items.length; i++) {
    const w = weightOf(items[i]);
    const safe = Number.isFinite(w) && w > 0 ? w : 0;
    weights[i] = safe;
    total += safe;
  }
  if (total <= 0) return items[0];
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}

/** Fisher-Yates on a copy. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A non-deterministic seed, for `createRun` when the caller does not supply
 * one. This is the ONLY place the engine reaches for ambient randomness, and
 * it is outside every resolution path by construction.
 */
export function randomSeed(): number {
  const jitter = Math.floor(Math.random() * 0xffffffff);
  return deriveSeed(jitter, `${Date.now()}`) >>> 0;
}
