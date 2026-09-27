/**
 * Regression for issue #49. `delta`'s noise floor is meant to hide a movement
 * that is smaller than the spread EITHER sample's own seeds show — CLAUDE.md:
 * "a movement smaller than the spread the seeds themselves show... reads
 * `±noise`". The bug computed the floor from `base`'s spread only, so a head
 * sample landing wide by chance could report a bolded "move" that was really
 * just head-side sampling noise.
 */

import { describe, expect, it } from 'vitest';
import { delta, type Band } from './balance-report';

describe('balance-report delta', () => {
  it('does not flag a move that base rounds clean on but head does not', () => {
    // Tight base sample, wide head sample, a true delta (0.01) smaller than
    // head's own spread (0.08). The old code only checked base's spread
    // (0.004) and MIN_MOVE (0.005), so it would have bolded this as a move.
    const base: Band = { mean: 0.05, min: 0.048, max: 0.052 };
    const head: Band = { mean: 0.06, min: 0.02, max: 0.1 };
    expect(delta(head, base)).toBe('');
  });

  it('still flags a move that clears both spreads', () => {
    const base: Band = { mean: 0.05, min: 0.048, max: 0.052 };
    const head: Band = { mean: 0.2, min: 0.19, max: 0.21 };
    expect(delta(head, base)).toBe('**+15.0**');
  });

  it('hides a move smaller than MIN_MOVE even when both spreads are tight', () => {
    const base: Band = { mean: 0.05, min: 0.05, max: 0.05 };
    const head: Band = { mean: 0.052, min: 0.052, max: 0.052 };
    expect(delta(head, base)).toBe('');
  });
});
