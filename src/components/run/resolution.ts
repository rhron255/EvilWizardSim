/**
 * The engine's `Resolution`, re-exported.
 *
 * This used to be a hand-written mirror, added so the run-loop UI could be
 * built before the reducer existed. It then drifted: the mirror declared
 * `roll` and `odds` as optional local additions, the engine never supplied
 * them, and `<ResolutionOverlay>`'s roll rail — the visual proof that a gamble
 * was fair, which wiki/06 calls the load-bearing agency mechanism — silently
 * never rendered. Optional fields made the drift typecheck cleanly.
 *
 * Re-exporting is what stops that happening twice.
 */

export type { Resolution } from '../../engine';
