/**
 * Regression for issue #48. Epithet predicates are matched in list order —
 * see the doc comment on `epithets` — so `overstaffed` (apprentices >= 5)
 * must not pre-empt the more specific `well_served` (apprentices >= 3 AND
 * loyalty >= 75) for the case that satisfies both.
 */

import { describe, expect, it } from 'vitest';
import { createRun, projectedEpithet } from '../engine';
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
});
