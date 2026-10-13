/**
 * Regression for issue #48. Epithet predicates are matched in list order —
 * see the doc comment on `epithets` — so `overstaffed` (apprentices >= 5)
 * must not pre-empt the more specific `well_served` (apprentices >= 3 AND
 * loyalty >= 75) for the case that satisfies both.
 */

import { describe, expect, it } from 'vitest';
import { createRun, projectedEpithet, RUN_LENGTHS, START_AGE, YEARS_PER_ERA } from '../engine';
import type { ContentBundle } from '../engine';
import * as C from './index';

const real: ContentBundle = {
  factions: C.factions,
  artifacts: C.artifacts,
  lairs: C.lairs,
  origins: C.origins,
  endings: C.endings,
  offers: C.offers,
  epithets: C.epithets,
};

describe('epithet priority', () => {
  it('crowns a wizard with 5+ loyal apprentices Well-Served, not Overstaffed', () => {
    const run = {
      ...createRun({ wizardName: 'Test', originId: real.origins[0].id, eraCount: 16, seed: 1 }, real),
      apprentices: { count: 5, loyalty: 80 },
    };
    expect(projectedEpithet(run, real)).toBe('the Well-Served');
  });

  it('never names a slain career "Whom the Sword Missed" (issue #104)', () => {
    const base = createRun({ wizardName: 'Test', originId: real.origins[0].id, eraCount: 16, seed: 1 }, real);
    const alive = { ...base, heroThreat: 60 };
    expect(projectedEpithet(alive, real)).toBe('Whom the Sword Missed');
    const slain = { ...alive, ending: 'slain_by_chosen_one' as const };
    expect(projectedEpithet(slain, real)).not.toBe('Whom the Sword Missed');
  });
});

/**
 * Issue #105. "the Tenant" and "the Quietly Persistent" were gated on ages
 * (140, 150) a career can never reach (the longest run ends at 120). Each now
 * needs the run to have gone its full length, so each has a career that earns
 * it — and a career that does not.
 */
describe('epithets that used to be unearnable', () => {
  const base = () =>
    createRun({ wizardName: 'Test', originId: real.origins[0].id, eraCount: 12, seed: 1 }, real);
  const finished = (over: Partial<ReturnType<typeof base>>) => {
    const r = base();
    return { ...r, eraIndex: r.eraCount, ...over };
  };

  it('the longest run cannot reach the ages the old conditions asked for', () => {
    const longest = Math.max(...RUN_LENGTHS);
    expect(START_AGE + longest * YEARS_PER_ERA).toBeLessThan(140);
  });

  it('names a wizard who finishes the career still in a cottage the Tenant', () => {
    const run = finished({ lairId: 'leaning_cottage', notoriety: 50 });
    expect(projectedEpithet(run, real)).toBe('the Tenant');
  });

  it('does not name a wizard who left the cottage behind, or who is not finished, the Tenant', () => {
    expect(projectedEpithet(finished({ lairId: 'repossessed_mill', notoriety: 50 }), real)).not.toBe('the Tenant');
    expect(projectedEpithet({ ...base(), lairId: 'leaning_cottage' }, real)).not.toBe('the Tenant');
  });

  it('names a finished career that never left Unknown the Quietly Persistent', () => {
    const run = finished({ lairId: 'repossessed_mill', notoriety: 20 });
    expect(projectedEpithet(run, real)).toBe('the Quietly Persistent');
  });

  it('judges Quietly Persistent on peak notoriety, not where the career ended', () => {
    const r = finished({ lairId: 'repossessed_mill', notoriety: 20 });
    const famousOnce = { ...r, eras: [{ ...({} as (typeof r.eras)[number]), notoriety: 55 }] };
    expect(projectedEpithet(famousOnce, real)).not.toBe('the Quietly Persistent');
  });
});
