/**
 * The six relic powers (issue #6).
 *
 * Every relic used to be `Defense +N`, so `defenseOf` was the only place a
 * relic could be wrong. Six powers reach into four more systems, and each one
 * is a place a sign, a floor or a direction can be inverted without anything
 * failing to compile.
 *
 * ANCHORED TO THE CONSTANTS, not to the functions under test. Asserting that
 * `threatGainFor` with a `vigil` relic is less than `threatGainFor` without one
 * would pass under an implementation that subtracted the wrong amount, or
 * subtracted it in the ascent, or subtracted `wards` by mistake — both sides of
 * that comparison come from the thing being measured (CLAUDE.md failure mode
 * 11). So the expected numbers are computed here from `constants.ts`.
 *
 * The bundles are built per test with hand-made relics. The shipped catalog is
 * covered where it belongs, by `validate-content.ts`: that every power is
 * carried by something, and that no magnitude is above its cap.
 */

import { describe, expect, it } from 'vitest';
import type { ArtifactPower, RunState } from '../types';
import type { ContentBundle } from './content-port';
import * as content from '../content';
import { createRun, resolveChoice } from './run';
import { applyEffects, draftOf, projectEffects } from './effects';
import { decayFor, defenseOf, emptyRelicPowers, relicPowers, threatGainFor } from './systems';
import {
  DECAY_BASE,
  DECAY_RAMP,
  HERO_FAME_COEF,
  HERO_THREAT_BASE,
  HERO_THREAT_MIN,
  HERO_THREAT_RAMP,
  LOYALTY_DRIFT_BASE,
  LOYALTY_DRIFT_MIN,
  SOFTENED_COST_MIN,
} from './constants';

const real: ContentBundle = {
  factions: content.factions,
  artifacts: content.artifacts,
  lairs: content.lairs,
  origins: content.origins,
  endings: content.endings,
  offers: content.offers,
  epithets: content.epithets,
};

/** The real world, with a reliquary built for the test. */
function withRelics(...powers: ArtifactPower[]): ContentBundle {
  return {
    ...real,
    artifacts: powers.map((power, i) => ({
      id: `test_relic_${i}`,
      name: `Test Relic ${i}`,
      factionId: 'ashen_covenant' as const,
      rarity: 'common' as const,
      power,
      flavorText: 'It was made for a test and knows it.',
    })),
  };
}

function runHolding(bundle: ContentBundle, over: Partial<RunState> = {}): RunState {
  const base = createRun({ wizardName: 'Test', originId: 'hedge_witch', eraCount: 16, seed: 7 }, bundle);
  return {
    ...base,
    heldArtifactIds: bundle.artifacts.map((a: { id: string }) => a.id),
    ...over,
  };
}

describe('relicPowers', () => {
  it('sums each power across everything held, and leaves the rest at zero', () => {
    const bundle = withRelics(
      { p: 'wards', v: 3 },
      { p: 'wards', v: 4 },
      { p: 'grace', v: 2 },
    );
    expect(relicPowers(runHolding(bundle), bundle)).toEqual({
      wards: 7,
      vigil: 0,
      undimmed: 0,
      discipline: 0,
      haggle: 0,
      grace: 2,
    });
  });

  it('reads zero for a wizard holding nothing', () => {
    const bundle = withRelics({ p: 'wards', v: 5 });
    const run = { ...runHolding(bundle), heldArtifactIds: [] };
    expect(relicPowers(run, bundle)).toEqual(emptyRelicPowers());
  });
});

describe('wards', () => {
  it('is the only power that reaches defenseOf', () => {
    const warded = withRelics({ p: 'wards', v: 6 });
    const others = withRelics(
      { p: 'vigil', v: 6 },
      { p: 'undimmed', v: 6 },
      { p: 'discipline', v: 6 },
      { p: 'haggle', v: 6 },
      { p: 'grace', v: 6 },
    );
    const bare = withRelics();

    const floor = defenseOf(runHolding(bare), bare);
    expect(defenseOf(runHolding(warded), warded)).toBe(floor + 6);
    // Thirty points of power, none of it defence. A `grace` relic does its work
    // on the other side of the comparison, and the wards readout must not claim
    // it.
    expect(defenseOf(runHolding(others), others)).toBe(floor);
  });
});

describe('vigil', () => {
  const decline = { phase: 'decline' as const, erasSinceProphecy: 3, notoriety: 50 };
  const expected = HERO_THREAT_BASE + HERO_THREAT_RAMP * 3 + HERO_FAME_COEF * 50;

  it('subtracts from the hero’s gain, by exactly what is held', () => {
    const bundle = withRelics({ p: 'vigil', v: 2 }, { p: 'vigil', v: 1 });
    expect(threatGainFor(runHolding(bundle, decline), bundle)).toBe(Math.round(expected - 3));
  });

  it('never stops him — the floor is HERO_THREAT_MIN', () => {
    // The build the floor exists for, and it is not a contrived one: a quiet
    // wizard early in the decline generates about `HERO_THREAT_BASE` a era, so
    // a few vigil relics cover the whole of it. Without the floor this career
    // would hold him at a standstill forever and `slain_by_chosen_one` would
    // stop being reachable from it — rule 6, not a tuning preference.
    const quiet = { phase: 'decline' as const, erasSinceProphecy: 0, notoriety: 10 };
    const bundle = withRelics({ p: 'vigil', v: 4 }, { p: 'vigil', v: 4 });
    expect(HERO_THREAT_BASE + HERO_FAME_COEF * 10).toBeLessThan(8);
    expect(threatGainFor(runHolding(bundle, quiet), bundle)).toBe(HERO_THREAT_MIN);
  });

  it('does nothing in the ascent, where there is no hero yet', () => {
    const bundle = withRelics({ p: 'vigil', v: 3 });
    const ascent = { phase: 'ascent' as const, erasSinceProphecy: 0, notoriety: 50 };
    expect(threatGainFor(runHolding(bundle, ascent), bundle)).toBe(0);
  });
});

describe('undimmed', () => {
  const decline = { phase: 'decline' as const, erasSinceProphecy: 4, isLich: false };
  const expected = DECAY_BASE * (1 + 4 * DECAY_RAMP);

  it('slows the slide by exactly what is held', () => {
    const bundle = withRelics({ p: 'undimmed', v: 2 });
    expect(decayFor(runHolding(bundle, decline), bundle)).toBe(Math.round(expected - 2));
  });

  it('cannot push decay below zero, which would be notoriety arriving unasked', () => {
    const bundle = withRelics({ p: 'undimmed', v: 4 }, { p: 'undimmed', v: 4 });
    expect(decayFor(runHolding(bundle, decline), bundle)).toBe(0);
  });
});

describe('haggle', () => {
  it('shrinks a follower cost, and the offer card prints the shrunken one', () => {
    const bundle = withRelics({ p: 'haggle', v: 3 });
    const run = runHolding(bundle, { followers: 40 });
    expect(projectEffects(run, [{ t: 'followers', v: -12 }], bundle)).toEqual([
      { t: 'followers', v: -9 },
    ]);
  });

  it('never haggles a cost down to nothing, which would be failure mode 14 again', () => {
    // The floor is the whole reason `SOFTENED_COST_MIN` exists. Without it a
    // Gilded Hand collector clears `concordat_academy`'s minFollowers gate,
    // pays zero and takes the legendary, while the card narrates a payment —
    // which is the exact bug issue #41 closed, reopened by a relic.
    const bundle = withRelics({ p: 'haggle', v: 5 });
    const draft = draftOf(runHolding(bundle, { followers: 40 }));
    applyEffects(draft, [{ t: 'followers', v: -2 }], () => 0, bundle);
    expect(draft.followers).toBe(40 - SOFTENED_COST_MIN);
  });

  it('prices the card against the relics held BEFORE it, not the one it is granting', () => {
    // `artifactFrom` pushes its draw onto the draft mid-list, so a branch that
    // grants a relic and then charges followers used to discount its own cost
    // with the relic it was in the middle of handing over — while the offer
    // card, which cannot project a random draw, printed the undiscounted
    // number. Seven authored branches had this shape.
    const bundle: ContentBundle = {
      ...real,
      artifacts: [{
        id: 'test_haggler', name: 'Test Haggler', factionId: 'gilded_hand' as const,
        rarity: 'common' as const, power: { p: 'haggle' as const, v: 5 },
        flavorText: 'It knows what you paid.',
      }],
    };
    const run = { ...runHolding(bundle), heldArtifactIds: [], followers: 40,
      factionStanding: { ...runHolding(bundle).factionStanding, gilded_hand: 40 } };
    const effects = [
      { t: 'artifactFrom' as const, factionId: 'gilded_hand' as const },
      { t: 'followers' as const, v: -12 },
    ];
    const draft = draftOf(run);
    applyEffects(draft, effects, () => 0.5, bundle);
    // Held nothing when the card was offered, so it costs the printed twelve.
    expect(draft.followers).toBe(28);
    // And that is exactly what the card printed.
    const printed = projectEffects(run, effects, bundle).find((e) => e.t === 'followers');
    expect(printed).toEqual({ t: 'followers', v: -12 });
  });

  it('leaves gains alone — it is a discount, not a multiplier', () => {
    const bundle = withRelics({ p: 'haggle', v: 5 });
    const draft = draftOf(runHolding(bundle, { followers: 10 }));
    applyEffects(draft, [{ t: 'followers', v: 6 }], () => 0, bundle);
    expect(draft.followers).toBe(16);
  });
});

describe('grace', () => {
  /** The named faction's own line, ignoring whatever spilled onto its enemies. */
  const namedDelta = (bundle: ContentBundle, v: number): number => {
    const projected = projectEffects(
      runHolding(bundle),
      [{ t: 'standing', factionId: 'crownlands', v }],
      bundle,
    );
    const line = projected.find((e) => e.t === 'standing' && e.factionId === 'crownlands');
    return line && line.t === 'standing' ? line.v : 0;
  };

  it('softens a standing loss by exactly what is held', () => {
    expect(namedDelta(withRelics({ p: 'grace', v: 2 }), -10)).toBe(-8);
  });

  it('leaves a gain at full size', () => {
    expect(namedDelta(withRelics({ p: 'grace', v: 3 }), 10)).toBe(10);
  });

  it('never softens a loss down to nothing, which would close the reprisal endings', () => {
    // Contagion is CLAUDE.md's named route into `sealed_in_gem` — 18.5% of
    // runs — and the five faction reprisals are reachable only through
    // standing going down. An ordinary +8 gain spills −2; two common grace
    // relics would erase that entirely without the floor.
    const bundle = withRelics({ p: 'grace', v: 3 });
    expect(namedDelta(bundle, -2)).toBe(-SOFTENED_COST_MIN);
  });

  it('softens the CONTAGION spill too, which is the half a player cannot see', () => {
    // The Crownlands are hostile to the Worm Below, so courting them spills a
    // loss onto it. That invisible route is the one a player cannot plan
    // around, so a grace that covered only the named loss would leave the
    // damage that actually matters at full strength.
    const bare = withRelics();
    const graced = withRelics({ p: 'grace', v: 1 });
    const spillOf = (bundle: ContentBundle) => {
      const run = runHolding(bundle);
      const projected = projectEffects(
        run,
        [{ t: 'standing', factionId: 'crownlands', v: 20 }],
        bundle,
      );
      const spill = projected.find((e) => e.t === 'standing' && e.factionId === 'worm_below');
      return spill && spill.t === 'standing' ? spill.v : 0;
    };
    const bareSpill = spillOf(bare);
    // Large enough that the floor is not what is being measured here.
    expect(bareSpill).toBeLessThan(-SOFTENED_COST_MIN);
    expect(spillOf(graced)).toBe(bareSpill + 1);
  });
});

describe('discipline', () => {
  /** Play one decline era and read the drift the era-end systems reported. */
  function driftAfterAnEra(bundle: ContentBundle): number {
    const base = runHolding(bundle, {
      phase: 'decline',
      eraIndex: 12,
      erasSinceProphecy: 3,
      apprentices: { count: 3, loyalty: 90 },
    });
    const offer = { ...content.offers[0], options: [{ kind: 'certain' as const, label: 'Wait', effects: [] }] };
    const { resolution } = resolveChoice(base, offer, 0, bundle);
    const row = resolution.systemic.find((c) => c.t === 'loyaltyDrift');
    return row && row.t === 'loyaltyDrift' ? row.v : 0;
  }

  it('slows the drift, and the systemic row reports the slowed number', () => {
    // Three apprentices: `-(LOYALTY_DRIFT_BASE + 3)`, less the discipline held.
    const bare = withRelics();
    expect(driftAfterAnEra(bare)).toBe(-(LOYALTY_DRIFT_BASE + 3));
    const bundle = withRelics({ p: 'discipline', v: 2 });
    expect(driftAfterAnEra(bundle)).toBe(-(LOYALTY_DRIFT_BASE + 3 - 2));
  });

  it('cannot stop it — the floor keeps betrayed_by_apprentice reachable', () => {
    const bundle = withRelics({ p: 'discipline', v: 4 }, { p: 'discipline', v: 4 });
    expect(driftAfterAnEra(bundle)).toBe(-LOYALTY_DRIFT_MIN);
  });
});

describe('a lich', () => {
  it('keeps no power, because the rite forfeits the reliquary', () => {
    const bundle = withRelics({ p: 'wards', v: 9 }, { p: 'vigil', v: 3 });
    const run = runHolding(bundle, { isLich: true, heldArtifactIds: [] });
    expect(relicPowers(run, bundle)).toEqual(emptyRelicPowers());
  });
});
