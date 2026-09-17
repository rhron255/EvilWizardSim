/**
 * Regression for issue #46: the epithet fallback must reflect the wizard's
 * PEAK notoriety, not whatever it has decayed to by the time the run ends.
 * `peakTier` existed with exactly that doc comment and zero call sites —
 * the fallback used `tierFor(run.notoriety)` instead. See CLAUDE.md failure
 * mode 2.
 */

import { describe, expect, it } from 'vitest';
import { createRun } from './run';
import { projectedEpithet } from './epithets';
import { fixtureContent } from './__fixtures__/content';
import type { ContentBundle } from './content-port';
import type { EraRecord } from '../types';

const start = () =>
  createRun(
    { wizardName: 'Test', originId: fixtureContent.origins[0].id, eraCount: 16, seed: 42 },
    fixtureContent,
  );

const era = (over: Partial<EraRecord>): EraRecord => ({
  eraIndex: 0,
  age: 30,
  lairId: fixtureContent.lairs[0].id,
  notoriety: 50,
  notorietyDelta: 0,
  followers: 0,
  artifactsGained: [],
  deedSummary: 'It is done.',
  offerId: fixtureContent.offers[0].id,
  optionLabel: 'Go',
  outcome: 'deterministic',
  phase: 'ascent',
  ...over,
});

// No authored epithets, so `projectedEpithet` always falls through to the
// engine's tier-derived fallback — isolates the fallback logic under test.
const noEpithets: ContentBundle = { ...fixtureContent, epithets: [] };

describe('epithet fallback', () => {
  it('uses the peak tier, not the decayed current tier', () => {
    const decayed = {
      ...start(),
      notoriety: 45, // local_menace (40-59)
      eras: [era({ notoriety: 92 })], // legend (90-99), reached earlier in the run
    };
    expect(projectedEpithet(decayed, noEpithets)).toBe('the Legend');
  });

  it('still falls back to the current tier when it is also the peak', () => {
    const flat = { ...start(), notoriety: 45, eras: [era({ notoriety: 30 })] };
    expect(projectedEpithet(flat, noEpithets)).toBe('the Local Nuisance');
  });
});
