/**
 * Stalls and Hero Threat (issue #147): a stall that sells threat relief must
 * not surface while there is less threat than its largest relief, or the
 * player pays full price for a clamped, partial delivery.
 */
import { describe, expect, it } from 'vitest';
import { shopOffers } from './shops';
import { conditionMet } from '../../engine/conditions';
import { REAL_CONTENT } from '../../testing/realContent';
import type { Effect, RunState } from '../../types';

const reliefOf = (effects: readonly Effect[]): number =>
  effects.reduce((sum, e) => (e.t === 'heroThreat' && e.v < 0 ? sum - e.v : sum), 0);

describe('shop stalls gate on hero threat', () => {
  it('every stall that sells threat relief requires at least its largest relief', () => {
    for (const offer of shopOffers) {
      const largest = Math.max(
        0,
        ...offer.options.map((o) => (o.kind === 'certain' ? reliefOf(o.effects) : 0)),
      );
      if (largest === 0) continue;
      const gate = (offer.requires ?? []).find((c) => c.c === 'minHeroThreat');
      expect(gate, offer.id).toBeDefined();
      expect(gate && gate.c === 'minHeroThreat' ? gate.v : 0, offer.id).toBeGreaterThanOrEqual(largest);
    }
  });

  it('minHeroThreat reads RunState.heroThreat', () => {
    const at = (heroThreat: number) => ({ heroThreat }) as RunState;
    expect(conditionMet(at(7), { c: 'minHeroThreat', v: 8 }, REAL_CONTENT)).toBe(false);
    expect(conditionMet(at(8), { c: 'minHeroThreat', v: 8 }, REAL_CONTENT)).toBe(true);
  });
});
