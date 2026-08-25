/**
 * Disclosure tests.
 *
 * These exist because of a real death: "I've been consumed by the pact while at
 * 6 out of 7." The ceiling was disclosed and the CLOCK was not, so the header
 * implied one era of headroom where there was none.
 */
import { describe, expect, it } from 'vitest';
import { heroBand, PACT_INTEREST_MIN_DEBT, PACT_LIMIT } from '../../engine';
import type { DefenseReadout } from '../../engine';
import type { RunState } from '../../types';
import { siegeFor, stakesFor } from './stakes';

const run = (over: Partial<RunState> = {}): RunState =>
  ({
    id: 'r',
    seed: 1,
    wizardName: 'W',
    epithet: 'the Tested',
    originId: 'o',
    age: 60,
    eraIndex: 9,
    eraCount: 16,
    phase: 'decline',
    prophecyEra: 9,
    erasSinceProphecy: 1,
    notoriety: 50,
    followers: 10,
    lairId: 'l',
    heldArtifactIds: [],
    factionStanding: {
      ashen_covenant: 0,
      gilded_hand: 0,
      pale_academy: 0,
      verdant_choir: 0,
      crownlands: 0,
      worm_below: 0,
    },
    apprentices: { count: 0, loyalty: 60 },
    pactDebt: 0,
    heroThreat: 0,
    isLich: false,
    eras: [],
    seenOfferIds: [],
    ...over,
  }) as RunState;

const pact = (r: RunState) => stakesFor(r).find((s) => s.label === 'Pact Debt')!;

describe('pact debt disclosure', () => {
  it('shows the ceiling as a denominator', () => {
    expect(pact(run({ pactDebt: 3 })).value).toBe(`3 / ${PACT_LIMIT}`);
  });

  it('says the debt grows on its own once it is accruing', () => {
    const s = pact(run({ pactDebt: 3, phase: 'decline' }));
    expect(s.caption).toMatch(/an era/i);
  });

  it('warns that collection is THIS era at one point short of the limit', () => {
    // The exact case that was reported. Interest lands at end of era, so a
    // wizard here has no headroom at all and the caption must not imply any.
    const s = pact(run({ pactDebt: PACT_LIMIT - 1, phase: 'decline' }));
    expect(s.tone).toBe('danger');
    expect(s.caption).toMatch(/collects this era/i);
    expect(s.caption).not.toMatch(new RegExp(`in full at ${PACT_LIMIT}`));
  });

  it('does not claim interest during the ascent, when none accrues', () => {
    const s = pact(run({ pactDebt: PACT_LIMIT - 1, phase: 'ascent', erasSinceProphecy: 0 }));
    expect(s.caption).not.toMatch(/collects this era/i);
  });

  it('flags that a quiet debt will start growing after the prophecy', () => {
    const s = pact(run({ pactDebt: PACT_INTEREST_MIN_DEBT, phase: 'ascent' }));
    expect(s.caption).toMatch(/after the prophecy/i);
  });

  it('stays calm at zero', () => {
    const s = pact(run({ pactDebt: 0 }));
    expect(s.tone).toBeUndefined();
  });
});

/**
 * The hero rail, asserted at its ENDS.
 *
 * CLAUDE.md failure mode 13: the faction standing bar spread ±100 across half
 * its track under `overflow: hidden`, so it hit the end of the rail at ±50 and
 * every value past that drew an identical picture — including the difference
 * between "the Academy dislikes you" and "the Academy is sealing you in a gem".
 * It looked correct in every screenshot, because the common values are inside
 * the range that works.
 *
 * So this checks 0 and 1 and the clamp beyond them, not a typical value. It
 * also pins the pairing that matters: the rail and the era-end narrative beat
 * must band off the same function, or the bar can say "halfway" while the
 * fiction says "at the gate".
 */
describe('the hero rail', () => {
  const decline = (heroThreat: number): RunState =>
    run({ phase: 'decline', heroThreat } as Partial<RunState>);
  const wards = (total: number): DefenseReadout => ({
    total,
    terms: [{ label: 'Lair', value: total }],
  });

  it('is empty when the hero has not started', () => {
    expect(siegeFor(decline(0), wards(100))!.ratio).toBe(0);
  });

  it('is full when the hero reaches the wards, not at half of them', () => {
    expect(siegeFor(decline(100), wards(100))!.ratio).toBe(1);
  });

  it('reads the middle as the middle', () => {
    expect(siegeFor(decline(50), wards(100))!.ratio).toBeCloseTo(0.5);
  });

  it('clamps past the end rather than overflowing the track', () => {
    expect(siegeFor(decline(400), wards(100))!.ratio).toBe(1);
    expect(siegeFor(decline(-20), wards(100))!.ratio).toBe(0);
  });

  it('takes its tone from the shared band function, not a local threshold', () => {
    // If these ever drift apart, the bar and the narrative beat disagree about
    // how close the hero is — which is the whole reason `heroBand` is in the
    // engine rather than beside the readout.
    for (const threat of [0, 30, 59, 60, 84, 85, 99]) {
      const siege = siegeFor(decline(threat), wards(100))!;
      const band = heroBand(threat, 100);
      const expected = band === 'calm' ? 'calm' : band === 'warn' ? 'warn' : 'danger';
      expect(siege.tone, `threat ${threat}`).toBe(expected);
    }
  });

  it('stays out of the ascent entirely', () => {
    expect(siegeFor(run({ phase: 'ascent' } as Partial<RunState>), wards(100))).toBeNull();
  });
});
