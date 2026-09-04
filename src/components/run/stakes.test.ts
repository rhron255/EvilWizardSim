/**
 * Disclosure tests.
 *
 * These exist because of a real death: "I've been consumed by the pact while at
 * 6 out of 7." The ceiling was disclosed and the CLOCK was not, so the header
 * implied one era of headroom where there was none.
 *
 * The clock is gone — debt moves only on a card the player picked — so these
 * now pin the OPPOSITE failure: a caption that still promises a rate would
 * mislead a player exactly as badly, in the other direction.
 */
import { describe, expect, it } from 'vitest';
import { heroBand, PACT_LIMIT } from '../../engine';
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
    goodActs: 0,
    illActs: 0,
    goodWizardVowed: false,
    eras: [],
    seenOfferIds: [],
    ...over,
  }) as RunState;

const pact = (r: RunState) => stakesFor(r).find((s) => s.label === 'Pact Debt')!;

describe('pact debt disclosure', () => {
  it('shows the ceiling as a denominator', () => {
    expect(pact(run({ pactDebt: 3 })).value).toBe(`3 / ${PACT_LIMIT}`);
  });

  it('names the ceiling, which is now the whole rule', () => {
    expect(pact(run({ pactDebt: 3, phase: 'decline' })).caption).toMatch(
      new RegExp(`in full at ${PACT_LIMIT}`),
    );
  });

  /**
   * The regression pin for the tick's removal.
   *
   * Anchored to the rendered caption string, not to a constant the caption
   * also reads — a deleted constant cannot fail a test, so asserting against
   * `PACT_INTEREST` would have gone green the moment it stopped existing
   * (failure mode 11). Every phase and every balance is checked, because the
   * old caption had four branches and only two of them mentioned a rate.
   */
  it('never promises a per-era rate, at any debt in any phase', () => {
    for (const phase of ['ascent', 'decline'] as const) {
      for (let debt = 0; debt <= PACT_LIMIT; debt++) {
        const { caption } = pact(run({ pactDebt: debt, phase, erasSinceProphecy: 2 }));
        expect(caption).not.toMatch(/an era/i);
        expect(caption).not.toMatch(/eras left/i);
        expect(caption).not.toMatch(/this era/i);
        expect(caption).not.toMatch(/after the prophecy/i);
      }
    }
  });

  it('reads the same in both phases, because the phase no longer changes it', () => {
    const ascent = pact(run({ pactDebt: 5, phase: 'ascent' }));
    const decline = pact(run({ pactDebt: 5, phase: 'decline', erasSinceProphecy: 3 }));
    expect(ascent.caption).toBe(decline.caption);
    expect(ascent.tone).toBe(decline.tone);
  });

  /**
   * Tone at the EXTREMES, not at a typical value (failure mode 13). `left` is
   * a distance and still true; it is the one thing here that still escalates.
   */
  it('escalates tone on remaining headroom, and only there', () => {
    expect(pact(run({ pactDebt: 0 })).tone).toBeUndefined();
    expect(pact(run({ pactDebt: PACT_LIMIT - 3 })).tone).toBeUndefined();
    expect(pact(run({ pactDebt: PACT_LIMIT - 2 })).tone).toBe('warn');
    expect(pact(run({ pactDebt: PACT_LIMIT - 1 })).tone).toBe('danger');
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
    terms: [{ label: 'Lair', value: total, earned: true }],
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

/**
 * The caption credits whatever is actually holding the hero off.
 *
 * It used to hardcode the lair, which was right for most runs and wrong for
 * the one that matters most: a lich's `Undeath` is worth 60, more than the
 * entire ten-rung lair ladder, and the caption went on crediting a lair that
 * might be worth 8. Taking the rite is the biggest defensive swing in the
 * game and the readout said nothing about it — `DEF_LICH` was disclosed
 * NOWHERE, on the card or after it.
 */
describe('the wards caption names what is carrying you', () => {
  const decline = (heroThreat: number): RunState =>
    run({ phase: 'decline', heroThreat } as Partial<RunState>);

  const readout = (terms: DefenseReadout['terms']): DefenseReadout => ({
    total: terms.reduce((a, t) => a + t.value, 0),
    terms,
  });

  it('credits the largest EARNED term, not always the lair', () => {
    const siege = siegeFor(
      decline(10),
      readout([
        { label: 'Lair', value: 8, earned: true },
        { label: 'Relics', value: 30, earned: true },
        { label: 'Standing ground', value: 42, earned: false },
      ]),
    )!;
    expect(siege.sentence).toContain('relics adds 30');
    expect(siege.sentence).not.toContain('lair adds');
  });

  it('credits a lich its undeath, which outweighs the whole lair ladder', () => {
    const siege = siegeFor(
      decline(10),
      readout([
        { label: 'Lair', value: 24, earned: true },
        { label: 'Undeath', value: 60, earned: true },
        { label: 'Standing ground', value: 42, earned: false },
      ]),
    )!;
    expect(siege.sentence).toContain('undeath adds 60');
  });

  it('never credits the floor, which is not something anyone built', () => {
    // `Standing ground` is a constant. Naming it would be advice nobody can act
    // on, and it is the largest term for most of the early decline.
    const siege = siegeFor(
      decline(10),
      readout([
        { label: 'Lair', value: 8, earned: true },
        { label: 'Standing ground', value: 42, earned: false },
      ]),
    )!;
    expect(siege.sentence).not.toContain('standing ground');
    expect(siege.sentence).toContain('lair adds 8');
  });

  it('orders the terms largest first, so terms[0] is the answer', () => {
    const siege = siegeFor(
      decline(10),
      readout([
        { label: 'Lair', value: 8, earned: true },
        { label: 'Undeath', value: 60, earned: true },
        { label: 'Relics', value: 0, earned: true },
      ]),
    )!;
    expect(siege.terms[0].label).toBe('Undeath');
    // Zero terms are noise — a wizard with no relics needs no row saying so.
    expect(siege.terms.map((t) => t.label)).not.toContain('Relics');
  });
});

/**
 * The Good Wizard route's rule-1 exception (issue #23) — per the issue's own
 * checklist: extend this file to assert ABSENCE. `goodActs`/`illActs` never
 * feed `stakesFor` or `siegeFor` today — neither function reads them — so
 * this pins that against regression rather than merely observing it once.
 */
describe('the Good Wizard counters never surface in the header', () => {
  const MENTION = /good act|ill act|virtue|goodwizard|good wizard/i;

  it('stakesFor never mentions them, at any goodActs/illActs', () => {
    for (const goodActs of [0, 1, 4, 8, 50]) {
      for (const illActs of [0, 1, 3, 20]) {
        const stakes = stakesFor(run({ goodActs, illActs } as Partial<RunState>));
        for (const stake of stakes) {
          expect(stake.label).not.toMatch(MENTION);
          expect(stake.caption).not.toMatch(MENTION);
        }
      }
    }
  });

  it('siegeFor never mentions them, at any goodActs/illActs', () => {
    const wards: DefenseReadout = { total: 60, terms: [{ label: 'Lair', value: 60, earned: true }] };
    for (const goodActs of [0, 1, 4, 8, 50]) {
      for (const illActs of [0, 1, 3, 20]) {
        const siege = siegeFor(
          run({ phase: 'decline', heroThreat: 30, goodActs, illActs } as Partial<RunState>),
          wards,
        );
        expect(siege!.sentence).not.toMatch(MENTION);
      }
    }
  });
});
