/**
 * The two things a canvas screenshot cannot pin.
 *
 * The share card is a fixed 1080x1350 canvas with variable-height sections
 * above a footer drawn at a fixed offset, and nothing clamped the two against
 * each other. A ten-lair, six-relic career drew its relic names on top of the
 * footer text, and the lair grid `.slice(0, 8)` dropped the last two rungs
 * while the stat tile above it printed "LAIRS 10" — the card contradicting
 * itself about the biography it exists to report.
 *
 * jsdom has no canvas, so the arithmetic lives in `planShareTail`, a pure
 * function the renderer actually calls (`rg planShareTail` — one definition,
 * one call site). These tests pin its two invariants:
 *
 *   1. The tail never reaches the footer.
 *   2. The slots always account for every tenure.
 *
 * Both are properties, checked across the whole reachable range rather than at
 * a couple of hand-picked sizes: 6000 simulated careers against the real
 * catalog topped out at nine lairs, and the ladder has ten rungs.
 */
import { describe, expect, it } from 'vitest';
import { planShareTail } from './shareImage';

/** The real call site's numbers: see `drawCard`. */
const AT = { tailTop: 980, footRuleY: 1350 - 46 - 40 - 24 };

const plan = (tenures: number, relicLines = 1) => planShareTail({ ...AT, tenures, relicLines });

/** How many distinct tenures the grid actually draws or accounts for. */
function accountedFor(slots: ReturnType<typeof plan>['slots']): number {
  return slots.reduce((n, s) => n + (s.kind === 'more' ? s.count : 1), 0);
}

describe('planShareTail · the tail never reaches the footer', () => {
  it('keeps every reachable career clear of the footer rule', () => {
    // Asserted against the footer position the RENDERER passes in, never
    // against `p.limitY`. The first version of this test compared the plan's
    // bottom to the plan's own limit, so widening the limit satisfied it — a
    // test that grades its own homework, and it stayed green under a mutation
    // that reintroduced the overlap.
    for (let tenures = 0; tenures <= 12; tenures++) {
      for (let lines = 1; lines <= 3; lines++) {
        const p = plan(tenures, lines);
        expect(
          p.bottomY,
          `${tenures} lairs / ${lines} relic lines overran the footer`,
        ).toBeLessThan(AT.footRuleY);
      }
    }
  });

  it('reports the shape it was actually given', () => {
    // A regression guard on the guard: if `fits` ever goes false for a career
    // the game can produce, the ladder has run out of room and the card is
    // back to overlapping.
    for (let tenures = 0; tenures <= 12; tenures++) {
      expect(plan(tenures, 3).fits, `${tenures} lairs does not fit`).toBe(true);
    }
  });

  it('never draws more grid rows than the slots need', () => {
    const p = plan(7, 1);
    expect(p.rows).toBe(Math.ceil(p.slots.length / p.cols));
  });
});

describe('planShareTail · the grid accounts for every lair', () => {
  it('draws all of them whenever they fit', () => {
    for (let tenures = 0; tenures <= 10; tenures++) {
      const p = plan(tenures, 1);
      expect(accountedFor(p.slots), `${tenures} lairs`).toBe(tenures);
      expect(p.slots.filter((s) => s.kind === 'more')).toHaveLength(0);
    }
  });

  it('names the count when it cannot draw them all, rather than dropping them', () => {
    // Forced by squeezing the available height, not by a reachable career —
    // the point is that the elision path is honest, not that it is common.
    const squeezed = planShareTail({ tailTop: 980, footRuleY: 1090, tenures: 14, relicLines: 3 });
    expect(accountedFor(squeezed.slots)).toBe(14);
    const more = squeezed.slots.filter((s) => s.kind === 'more');
    expect(more).toHaveLength(1);
  });

  it('keeps the lair the career ended in, which is the one the biography needs', () => {
    const squeezed = planShareTail({ tailTop: 980, footRuleY: 1090, tenures: 14, relicLines: 3 });
    const last = squeezed.slots[squeezed.slots.length - 1];
    expect(last).toEqual({ kind: 'tenure', index: 13 });
  });

  it('handles a career with no lair log at all', () => {
    const p = plan(0, 1);
    expect(p.slots).toEqual([]);
    expect(p.bottomY).toBeLessThanOrEqual(p.limitY);
  });
});

describe('planShareTail · density before elision', () => {
  it('keeps the comfortable two-column grid for a common career', () => {
    // Mean lairs held is 4.72; the typical card must not pay for the rare one.
    for (const tenures of [1, 2, 3, 4, 5, 6]) {
      expect(plan(tenures, 1).cols, `${tenures} lairs`).toBe(2);
    }
  });

  it('goes wider before it goes smaller', () => {
    const wide = plan(9, 2);
    expect(wide.cols).toBe(3);
    expect(accountedFor(wide.slots)).toBe(9);
  });
});
