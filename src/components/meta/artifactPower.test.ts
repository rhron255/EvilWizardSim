/**
 * The relic line, and the header's summed version of it.
 *
 * Two registers of one vocabulary come out of one switch (see
 * `artifactPower.ts`), and this pins the property that makes that worth doing:
 * every power produces BOTH forms, and neither can be added without the other.
 * A `Record` keyed by the union is what makes the compiler enforce the sweep —
 * a new member fails to compile here as well as in the renderer, rather than
 * quietly going untested.
 */

import { describe, expect, it } from 'vitest';
import type { ArtifactPower } from '../../types';
import type { RelicPowers } from '../../engine';
import { artifactPowerText, relicPowerSummary } from './artifactPower';

/** Every member, named once. The compiler keeps this exhaustive. */
const ONE_OF_EACH: Record<ArtifactPower['p'], ArtifactPower> = {
  wards: { p: 'wards', v: 3 },
  vigil: { p: 'vigil', v: 2 },
  undimmed: { p: 'undimmed', v: 1 },
  discipline: { p: 'discipline', v: 2 },
  haggle: { p: 'haggle', v: 4 },
  grace: { p: 'grace', v: 2 },
};

const NOTHING: RelicPowers = {
  wards: 0, vigil: 0, undimmed: 0, discipline: 0, haggle: 0, grace: 0,
};

describe('artifactPowerText', () => {
  it('gives every power a sentence that names its own magnitude', () => {
    for (const power of Object.values(ONE_OF_EACH)) {
      const text = artifactPowerText(power);
      expect(text, power.p).toMatch(/\S/);
      expect(text, power.p).toContain(String(power.v));
      // A card line is a sentence. The old authored `effect` strings all ended
      // in one, and the collection grid's type is set for it.
      expect(text, power.p).toMatch(/\.$/);
    }
  });

  it('speaks the header’s vocabulary for defence', () => {
    // `stakes.ts` calls it "Wards" everywhere — "he kills you above 71",
    // "Undeath adds 90 Wards". A relic that called the same stat "Defense"
    // would be a second name for a stat the game names once.
    expect(artifactPowerText({ p: 'wards', v: 3 })).toBe('Wards +3.');
  });

  it('never renders two powers the same way', () => {
    const lines = Object.values(ONE_OF_EACH).map(artifactPowerText);
    expect(new Set(lines).size).toBe(lines.length);
  });
});

describe('relicPowerSummary', () => {
  it('is empty when nothing is held, so the caller can say what relics are for', () => {
    expect(relicPowerSummary(NOTHING)).toBe('');
  });

  it('drops the powers at zero rather than printing them as nothing', () => {
    expect(relicPowerSummary({ ...NOTHING, wards: 5 })).toBe('+5 wards');
  });

  it('joins what is held in the header’s separator, in declaration order', () => {
    // Declaration order rather than magnitude: a caption that reshuffles itself
    // as numbers cross each other is harder to read era to era, and nothing
    // here is a ranking.
    expect(relicPowerSummary({ ...NOTHING, grace: 2, wards: 5, haggle: 3 })).toBe(
      '+5 wards · follower costs −3 · standing losses −2',
    );
  });

  it('has a clause for every power, so none can be held and go unmentioned', () => {
    for (const [p, power] of Object.entries(ONE_OF_EACH)) {
      const summary = relicPowerSummary({ ...NOTHING, [p]: power.v });
      expect(summary, p).toMatch(/\S/);
      expect(summary, p).toContain(String(power.v));
    }
  });
});
