/**
 * Deterministic hashing + PRNG for procedural ornament.
 *
 * Every sigil, glyph and seal in the meta UI is derived from a string — the
 * wizard's name, an artifact id, a faction id — so the same input always draws
 * the same mark. No image assets, and a player's sigil is stable across runs
 * and across the share image (which redraws it on a canvas from these same
 * numbers).
 */

/** FNV-1a, 32-bit. Fast, well-distributed enough for ornament. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, deterministic. Returns floats in [0, 1). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic integer in [min, max]. */
export function pickInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Deterministic member of a list. */
export function pickFrom<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length) % list.length];
}

/** Convenience: an rng seeded directly from a string. */
export function rngFor(input: string): () => number {
  return makeRng(hashString(input));
}
