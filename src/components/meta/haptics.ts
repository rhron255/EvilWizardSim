/**
 * A tap on the shoulder — never a sound.
 *
 * The game is text; its voice is the writing and its one chromatic reward is the
 * tier badge (wiki/06 principle 6). Audio would be a second, louder voice, and
 * was deliberately not added. A short vibration is the smallest thing that makes
 * a phone feel like it noticed a moment, so that is all this is.
 *
 * Four moments, all of them ones the screen is already staging:
 *   - `success` / `failure`  the verdict of a gamble, on the roll's settle
 *   - `crossing`             a celebrated Notoriety tier crossing
 *   - `prophecy`             the headline of the prophecy interstitial
 * A certain choice has no roll and gets nothing: deterministic eras stay quiet,
 * exactly as they stay grey.
 *
 * What this is NOT: a channel for information. No beat carries anything the
 * card does not already print, and a player with vibration off, on iOS Safari
 * (which has no such API), on a desktop, or with the OS asking for reduced
 * motion, misses nothing. That is why it needs no setting and no disclosure.
 */

export type Beat = 'success' | 'failure' | 'crossing' | 'prophecy';

/** Milliseconds on/off/on…, per `navigator.vibrate`. Each totals under 200. */
export const BEATS: Record<Beat, readonly number[]> = {
  success: [18],
  failure: [14, 90, 14],
  crossing: [20, 60, 20, 60, 30],
  prophecy: [80],
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Request a beat. Returns whether the platform accepted it — a value for tests
 * and nothing else; no caller should branch on it.
 *
 * Every failure mode ends in `false`, silently: the API is missing (iOS Safari,
 * desktops), the browser refuses because the page has not been tapped yet
 * (Chrome throws or returns false), or the player asked for reduced motion. A
 * vibration that cannot happen is not worth a crash.
 */
export function beat(kind: Beat): boolean {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
    if (prefersReducedMotion()) return false;
    return navigator.vibrate(BEATS[kind] as number[]);
  } catch {
    return false;
  }
}
