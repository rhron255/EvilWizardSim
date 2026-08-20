/**
 * Disclosure tests.
 *
 * These exist because of a real death: "I've been consumed by the pact while at
 * 6 out of 7." The ceiling was disclosed and the CLOCK was not, so the header
 * implied one era of headroom where there was none.
 */
import { describe, expect, it } from 'vitest';
import { PACT_INTEREST_MIN_DEBT, PACT_LIMIT } from '../../engine';
import type { RunState } from '../../types';
import { stakesFor } from './stakes';

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
