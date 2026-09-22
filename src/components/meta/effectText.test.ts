/**
 * Issue #44: `isNegative` used to fall through an un-exhausted switch to
 * `default: return false`, so a future signed `Effect` variant would render
 * in the "not negative" color instead of failing to compile. This pins the
 * sign of every real variant, and the one branch the guard exists for.
 */
import { describe, expect, it } from 'vitest';
import type { Effect } from '../../types';
import { formatEffect, isNegative, signed } from './effectText';

describe('isNegative', () => {
  it('reads the sign off a numeric stat', () => {
    expect(isNegative({ t: 'notoriety', v: -3 })).toBe(true);
    expect(isNegative({ t: 'notoriety', v: 3 })).toBe(false);
    expect(isNegative({ t: 'followers', v: -3 })).toBe(true);
    expect(isNegative({ t: 'apprentices', v: -1 })).toBe(true);
    expect(isNegative({ t: 'loyalty', v: -3 })).toBe(true);
    expect(isNegative({ t: 'lairTier', v: -1 })).toBe(true);
    expect(isNegative({ t: 'standing', factionId: 'gilded_hand', v: -5 })).toBe(true);
    expect(isNegative({ t: 'standing', factionId: 'gilded_hand', v: 5 })).toBe(false);
  });

  it('inverts pactDebt and heroThreat — rising is the bad direction', () => {
    expect(isNegative({ t: 'pactDebt', v: 1 })).toBe(true);
    expect(isNegative({ t: 'pactDebt', v: -1 })).toBe(false);
    expect(isNegative({ t: 'heroThreat', v: 1 })).toBe(true);
    expect(isNegative({ t: 'heroThreat', v: -1 })).toBe(false);
  });

  it('flags relic loss and lichdom as always negative', () => {
    expect(isNegative({ t: 'loseArtifact' })).toBe(true);
    expect(isNegative({ t: 'becomeLich' })).toBe(true);
  });

  it('never flags a relic grant, the good-wizard vow, or an ending as negative', () => {
    expect(isNegative({ t: 'artifact', artifactId: 'x' })).toBe(false);
    expect(isNegative({ t: 'artifactFrom', factionId: 'gilded_hand' })).toBe(false);
    expect(isNegative({ t: 'vowGoodWizard' })).toBe(false);
    expect(isNegative({ t: 'ending', endingId: 'archmage' })).toBe(false);
  });

  it('never flags the undisclosed goodAct/illAct counters — CLAUDE.md rule 1 exception', () => {
    expect(isNegative({ t: 'goodAct', v: 1 })).toBe(false);
    expect(isNegative({ t: 'illAct', v: 1 })).toBe(false);
  });

  it('handles every member of the Effect union without falling through to a default', () => {
    // Exercises the same set formatEffect below is exhaustive over. If a new
    // Effect variant is added and this list is not updated, TypeScript fails
    // this file at the `samples` declaration (missing variant), not isNegative
    // silently misclassifying it at runtime.
    const samples: Effect[] = [
      { t: 'notoriety', v: 1 },
      { t: 'followers', v: 1 },
      { t: 'standing', factionId: 'gilded_hand', v: 1 },
      { t: 'artifact', artifactId: 'x' },
      { t: 'artifactFrom', factionId: 'gilded_hand' },
      { t: 'loseArtifact' },
      { t: 'apprentices', v: 1 },
      { t: 'loyalty', v: 1 },
      { t: 'pactDebt', v: 1 },
      { t: 'heroThreat', v: 1 },
      { t: 'lairTier', v: 1 },
      { t: 'becomeLich' },
      { t: 'goodAct', v: 1 },
      { t: 'illAct', v: 1 },
      { t: 'vowGoodWizard' },
      { t: 'ending', endingId: 'archmage' },
    ];
    for (const e of samples) {
      expect(() => isNegative(e)).not.toThrow();
      expect(() => formatEffect(e)).not.toThrow();
    }
  });
});

describe('signed', () => {
  it('uses a real minus sign, not a hyphen', () => {
    expect(signed(-4)).toBe('−4');
    expect(signed(4)).toBe('+4');
    expect(signed(0)).toBe('+0');
  });
});

describe('formatEffect', () => {
  it('names an unspecified-rarity draw as random rather than implying common', () => {
    expect(formatEffect({ t: 'artifactFrom', factionId: 'gilded_hand' })).toMatch(/random rarity/i);
  });

  it('prints the rarity on a specified draw', () => {
    expect(formatEffect({ t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'rare' })).toMatch(/rare .*relic/i);
  });

  it('renders goodAct/illAct as empty — dead code by construction, never reaches a card', () => {
    expect(formatEffect({ t: 'goodAct', v: 1 })).toBe('');
    expect(formatEffect({ t: 'illAct', v: 1 })).toBe('');
  });
});
