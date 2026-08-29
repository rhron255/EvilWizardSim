/**
 * The card must print what the engine will do, not what the author typed.
 *
 * Two measured gaps between the two, both of which the player only saw AFTER
 * committing:
 *
 *   - Contagion. `applyStanding` spills onto `hostileTo`, so "+8 Standing ·
 *     The Gilded Hand" also moved the Verdant Choir and the card never said so.
 *   - Floor clamps. 49.6% of accepted follower costs deducted nothing, because
 *     followers clamp at 0 and the run used to start there.
 *
 * These tests pin the PAIRING, not the arithmetic: whatever `projectEffects`
 * prints must equal what `applyEffects` later applies. A test that merely
 * asserted "−12 becomes −4" would pass just as happily against a second,
 * drifting implementation, which is the seam this repo has been bitten at.
 */
import { describe, expect, it } from 'vitest';
import type { Effect, RunState } from '../types';
import { applyEffects, draftOf, projectEffects } from './effects';
import { createRun } from './run';
import { fixtureContent as content } from './__fixtures__/content';

const run = (over: Partial<RunState> = {}): RunState => ({
  ...createRun({ wizardName: 'Test', originId: content.origins[0].id, eraCount: 16, seed: 7 }, content),
  ...over,
});

/** What the engine actually does, using the same path `resolveChoice` uses. */
const applied = (state: RunState, effects: Effect[]): Effect[] => {
  const draft = draftOf(state);
  return applyEffects(draft, effects, () => 0.5, content).applied;
};

describe('projectEffects · the card equals the outcome', () => {
  it('prints the clamped cost, not the authored one', () => {
    const broke = run({ followers: 3 });
    const shown = projectEffects(broke, [{ t: 'followers', v: -12 }], content);
    expect(shown).toEqual([{ t: 'followers', v: -3 }]);
  });

  it('prints nothing at all when the cost cannot be paid', () => {
    // `EffectList` renders an empty list as "No change", which is the honest
    // reading. What must never happen is a printed −12 that charges 0.
    const empty = run({ followers: 0 });
    expect(projectEffects(empty, [{ t: 'followers', v: -12 }], content)).toEqual([]);
  });

  /**
   * The two-way pact gambles pay their debt down against the same floor.
   *
   * `pact_the_last_wager` clears 4 on success; a wizard at 1/7 can only be
   * cleared by 1. The card has to say 1, or it is promising a discharge it
   * cannot deliver — the same defect as the −12 followers charge that deducted
   * nothing, on a stat where the number is the player's whole read of how much
   * danger they are in.
   *
   * Paired against `applied`, never asserted as a literal: a standalone
   * "−4 becomes −1" would pass against a drifting second implementation.
   */
  it('prints the debt a payment can actually clear, not the authored figure', () => {
    const barelyIndebted = run({ pactDebt: 1 });
    const authored: Effect[] = [{ t: 'pactDebt', v: -4 }];
    const shown = projectEffects(barelyIndebted, authored, content);
    expect(shown).toEqual([{ t: 'pactDebt', v: -1 }]);
    expect(shown).toEqual(applied(barelyIndebted, authored));
  });

  it('prints nothing when there is no debt for a payment to clear', () => {
    const clean = run({ pactDebt: 0 });
    const authored: Effect[] = [{ t: 'pactDebt', v: -2 }];
    expect(projectEffects(clean, authored, content)).toEqual([]);
    expect(applied(clean, authored)).toEqual([]);
  });

  it('prints a debt INCREASE at face value, since nothing clamps it', () => {
    // The other branch of the same gamble. Only the floor bites; the ceiling
    // is an ending, not a clamp, so +2 at 6/7 really is +2 and the card says
    // so before the player rolls.
    const deep = run({ pactDebt: 6 });
    const authored: Effect[] = [{ t: 'pactDebt', v: 2 }];
    expect(projectEffects(deep, authored, content)).toEqual([{ t: 'pactDebt', v: 2 }]);
    expect(projectEffects(deep, authored, content)).toEqual(applied(deep, authored));
  });

  it('names the faction the spill lands on, which the authored list never did', () => {
    const state = run();
    const authored: Effect[] = [{ t: 'standing', factionId: 'gilded_hand', v: 8 }];
    const shown = projectEffects(state, authored, content);

    expect(authored).toHaveLength(1);
    expect(shown.length).toBeGreaterThan(1);
    const spilled = shown.filter((e) => e.t === 'standing' && e.factionId !== 'gilded_hand');
    expect(spilled.length).toBeGreaterThan(0);
  });

  it('agrees with the engine for every effect kind on a real card', () => {
    const state = run({ followers: 4, notoriety: 30 });
    const effects: Effect[] = [
      { t: 'followers', v: -12 },
      { t: 'standing', factionId: 'ashen_covenant', v: 14 },
      { t: 'notoriety', v: 5 },
      { t: 'pactDebt', v: 1 },
    ];
    expect(projectEffects(state, effects, content)).toEqual(applied(state, effects));
  });

  it('leaves random and non-quantity effects exactly as authored', () => {
    // A relic draw's honest promise is its rarity and faction; resolving it
    // early would either spoil the reveal or print a lie.
    const state = run();
    const effects: Effect[] = [
      { t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'common' },
      { t: 'ending', endingId: 'lichdom' },
    ];
    expect(projectEffects(state, effects, content)).toEqual(effects);
  });

  it('does not mutate the run it is projecting against', () => {
    const state = run({ followers: 40 });
    const before = JSON.stringify(state);
    projectEffects(state, [{ t: 'followers', v: -12 }, { t: 'notoriety', v: 9 }], content);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('projects in list order, so a second hit knows about the first', () => {
    const state = run({ followers: 10 });
    const effects: Effect[] = [
      { t: 'followers', v: -6 },
      { t: 'followers', v: -9 },
    ];
    // Second charge is capped by what the first left behind: 10 → 4 → 0.
    expect(projectEffects(state, effects, content)).toEqual([
      { t: 'followers', v: -6 },
      { t: 'followers', v: -4 },
    ]);
  });
});
