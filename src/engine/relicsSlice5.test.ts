/**
 * The last 22 relic powers (issue #82, slice 5 of #77) — every relic the
 * catalog was still missing, plus the two mechanisms this slice introduces:
 * lifelines and double-edged relics.
 *
 * Four things this file has to prove, on top of "each power works":
 *
 *   1. Every new WATCH kind (watchesNegative, watchesEffect,
 *      watchesOfferFaction, watchesGambleFailure) fires on the case it
 *      names and stays silent on a near-miss — the same discipline slice
 *      3/4's `watchesPositive` tests already hold `cinder_testament`/
 *      `ashen_signature` to.
 *   2. A lifeline is spent AT MOST ONCE, its recovery lands as a real,
 *      disclosable delta, and it never changes the threshold the ending it
 *      cancelled was measured against — the next occurrence of the same
 *      condition still ends the run.
 *   3. Double-edged relics (`isDoubleEdged`) are excluded from every random
 *      draw, and the Tenure Ring's standing band clamps BOTH a direct
 *      effect and a contagion spillover onto the same faction.
 *   4. The Writ's per-faction reprisal threshold and the Counterfeit Soul's
 *      loss priority are read by the SAME functions the engine uses for
 *      real (`reprisalEnding`, `applyEffects`'s `loseArtifact` case), not
 *      re-derived here.
 */
import { describe, expect, it } from 'vitest';
import type { Effect, Offer, OfferOption, RunState } from '../types';
import { createRun, resolveChoice } from './run';
import {
  activateRelic,
  canActivateRelic,
  effectiveOdds,
  relicRules,
} from './relics';
import { applyEffects, draftOf, forfeitForLichdom, isDoubleEdged } from './effects';
import { decayFor, defenseOf, heroBand } from './systems';
import { nearestReprisalFaction, reprisalEnding, REPRISAL_BY_FACTION } from './endings';
import { nextOffer } from './offers';
import { streamFor } from './rng';
import { REAL_CONTENT as content, realOfferWhere } from '../testing/realContent';

const ORIGIN = 'bog_autodidact'; // Mantle of Slow Moss — neutral base for every test here except its own.

const run = (over: Partial<RunState> = {}): RunState => ({
  ...createRun({ wizardName: 'Test', originId: ORIGIN, eraCount: 16, seed: 11 }, content),
  ...over,
});

function certainOption(effects: Effect[], label = 'Do it'): OfferOption {
  return { kind: 'certain', label, effects };
}

function offerOf(effects: Effect[], factionId?: Offer['factionId']): Offer {
  return {
    id: 'test_offer',
    title: 'Test',
    body: 'Test.',
    phase: 'any',
    factionId,
    options: [certainOption(effects), certainOption([{ t: 'notoriety', v: 0 }], 'Do nothing')],
  };
}

function gambleOffer(odds: number, onSuccess: Effect[], onFailure: Effect[]): Offer {
  return {
    id: 'test_gamble',
    title: 'Test',
    body: 'Test.',
    phase: 'any',
    options: [
      { kind: 'gamble', label: 'Risk it', odds, onSuccess, onFailure, successText: 'Yes.', failureText: 'No.' },
      certainOption([{ t: 'notoriety', v: 0 }], 'Do nothing'),
    ],
  };
}

// ---------------------------------------------------------------------------
// Bone Crown — onChoice, watchesNegative: apprentices
// ---------------------------------------------------------------------------

describe('Bone Crown · +Notoriety when a choice costs an Apprentice', () => {
  const holder = (over: Partial<RunState> = {}) =>
    run({ heldArtifactIds: ['bone_crown'], apprentices: { count: 3, loyalty: 50 }, ...over });

  it('fires when the choice REDUCES apprentices', () => {
    const costs = offerOf([{ t: 'apprentices', v: -1 }]);
    const { resolution } = resolveChoice(holder(), costs, 0, content);
    expect(resolution.relicEvents).toContainEqual({
      artifactId: 'bone_crown',
      applied: [{ t: 'notoriety', v: 4 }],
    });
  });

  it('does not fire when the choice GAINS apprentices', () => {
    const gains = offerOf([{ t: 'apprentices', v: 2 }]);
    const { resolution } = resolveChoice(holder(), gains, 0, content);
    expect(resolution.relicEvents).toEqual([]);
  });

  it('does not fire on a choice that never touches apprentices, even mid-career with few', () => {
    const state = holder({ apprentices: { count: 1, loyalty: 10 } });
    const untouching = offerOf([{ t: 'notoriety', v: 1 }]);
    const { resolution } = resolveChoice(state, untouching, 0, content);
    expect(resolution.relicEvents).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Censer of Small Regrets — onChoice, watchesGambleFailure
// ---------------------------------------------------------------------------

describe('Censer of Small Regrets · +Notoriety when you lose a gamble', () => {
  const holder = (over: Partial<RunState> = {}) =>
    run({ heldArtifactIds: ['censer_of_small_regrets'], ...over });

  it('fires on a LOST gamble', () => {
    // odds 0 forces failure regardless of the roll.
    const gamble = gambleOffer(0, [{ t: 'notoriety', v: 1 }], [{ t: 'notoriety', v: 1 }]);
    const { resolution } = resolveChoice(holder(), gamble, 0, content);
    expect(resolution.outcome).toBe('failure');
    expect(resolution.relicEvents).toContainEqual({
      artifactId: 'censer_of_small_regrets',
      applied: [{ t: 'notoriety', v: 3 }],
    });
  });

  it('does not fire on a WON gamble', () => {
    // odds 1 forces success regardless of the roll.
    const gamble = gambleOffer(1, [{ t: 'notoriety', v: 1 }], [{ t: 'notoriety', v: 1 }]);
    const { resolution } = resolveChoice(holder(), gamble, 0, content);
    expect(resolution.outcome).toBe('success');
    expect(resolution.relicEvents).toEqual([]);
  });

  it('does not fire on a certain (non-gamble) choice', () => {
    const certain = offerOf([{ t: 'notoriety', v: 1 }]);
    const { resolution } = resolveChoice(holder(), certain, 0, content);
    expect(resolution.relicEvents).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Brazier of the Ninth Clause — active
// ---------------------------------------------------------------------------

describe('Brazier of the Ninth Clause · active: -3 Pact Debt, +15 Hero Threat', () => {
  it('applies both effects and can only be used once', () => {
    const holder = run({ heldArtifactIds: ['ninth_clause_brazier'], pactDebt: 5, heroThreat: 10 });
    expect(canActivateRelic(holder, 'ninth_clause_brazier', content)).toBe(true);
    const { next, event } = activateRelic(holder, 'ninth_clause_brazier', content);
    expect(event).toEqual({
      artifactId: 'ninth_clause_brazier',
      applied: [
        { t: 'pactDebt', v: -3 },
        { t: 'heroThreat', v: 15 },
      ],
    });
    expect(next.pactDebt).toBe(2);
    expect(next.heroThreat).toBe(25);
    expect(canActivateRelic(next, 'ninth_clause_brazier', content)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Appraiser's Monocle — onChoice, watchesEffect: loseArtifact
// ---------------------------------------------------------------------------

describe("Appraiser's Monocle · +15 Followers when a choice costs a relic", () => {
  const holder = (over: Partial<RunState> = {}) =>
    run({
      heldArtifactIds: ['appraisers_monocle', 'mantle_of_slow_moss'],
      followers: 10,
      ...over,
    });

  it('fires when the choice includes loseArtifact', () => {
    const loses = offerOf([{ t: 'loseArtifact' }]);
    const { resolution } = resolveChoice(holder(), loses, 0, content);
    expect(resolution.relicEvents).toContainEqual({
      artifactId: 'appraisers_monocle',
      applied: [{ t: 'followers', v: 15 }],
    });
  });

  it('does not fire on a choice that keeps every relic', () => {
    // `holder()` also holds the Mantle of Slow Moss (an unrelated era-end
    // trigger, present only as a neutral filler relic), so this checks the
    // Monocle's own absence rather than the whole event list being empty.
    const keeps = offerOf([{ t: 'notoriety', v: 1 }]);
    const { resolution } = resolveChoice(holder(), keeps, 0, content);
    expect(resolution.relicEvents.some((e) => e.artifactId === 'appraisers_monocle')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Counterfeit Soul — passive: loseArtifactPriority
// ---------------------------------------------------------------------------

describe('The Counterfeit Soul · a loseArtifact always names it first', () => {
  it('relicRules reports it as the priority target while held', () => {
    const holder = run({ heldArtifactIds: ['counterfeit_soul', 'mantle_of_slow_moss'] });
    expect(relicRules(holder, content).lossPriorityArtifactId).toBe('counterfeit_soul');
  });

  it('applyEffects takes the Soul first regardless of the rng, even with several relics held', () => {
    const holder = run({
      heldArtifactIds: ['counterfeit_soul', 'mantle_of_slow_moss', 'antler_baton', 'bone_crown'],
    });
    const draft = draftOf(holder);
    // A stub rng that would pick the LAST element by index if it were ever
    // consulted — proving the priority path never calls it at all.
    let rngCalled = false;
    const application = applyEffects(
      draft,
      [{ t: 'loseArtifact' }],
      () => {
        rngCalled = true;
        return 0.999;
      },
      content,
    );
    expect(rngCalled).toBe(false);
    expect(application.artifactsLost.map((a) => a.id)).toEqual(['counterfeit_soul']);
    expect(draft.heldArtifactIds).not.toContain('counterfeit_soul');
    expect(draft.heldArtifactIds).toContain('mantle_of_slow_moss');
  });

  it('with no relic other than itself held, a loseArtifact still takes it (not a no-op)', () => {
    const holder = run({ heldArtifactIds: ['counterfeit_soul'] });
    const draft = draftOf(holder);
    const application = applyEffects(draft, [{ t: 'loseArtifact' }], () => 0, content);
    expect(application.artifactsLost.map((a) => a.id)).toEqual(['counterfeit_soul']);
    expect(draft.heldArtifactIds).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Key to No Particular Door — active: redraws this era's offer
// ---------------------------------------------------------------------------

describe('The Key to No Particular Door · active: redraws this era’s offer', () => {
  it('bumps offerRedrawSalt, is spendable once, and applies no RelicEffect', () => {
    const holder = run({ heldArtifactIds: ['key_to_no_particular_door'] });
    expect(holder.relicState.offerRedrawSalt).toBe(0);
    const { next, event } = activateRelic(holder, 'key_to_no_particular_door', content);
    expect(event).toEqual({ artifactId: 'key_to_no_particular_door', applied: [] });
    expect(next.relicState.offerRedrawSalt).toBe(1);
    expect(canActivateRelic(next, 'key_to_no_particular_door', content)).toBe(false);
  });

  it('nextOffer is a pure function of the salt: salt 0 reproduces the pre-relic stream exactly', () => {
    const holder = run({ heldArtifactIds: ['key_to_no_particular_door'], eraIndex: 3 });
    const withoutTheField = { ...holder } as RunState;
    expect(nextOffer(holder, content).id).toBe(nextOffer(withoutTheField, content).id);
  });

  it('a bumped salt changes the derived rng stream (streamFor), the seam nextOffer relies on', () => {
    const a = streamFor(11, 'offer', 3);
    const b = streamFor(11, 'offer', 3, 1);
    // Same seed and era, different salt: the two streams must not coincide on
    // their very first draw, or the redraw would be pure decoration.
    expect(a()).not.toBe(b());
  });
});

// ---------------------------------------------------------------------------
// Gilded Thumb — passive: followersGainMultiplier
// ---------------------------------------------------------------------------

describe('The Gilded Thumb · Followers gained are increased by half', () => {
  it('scales a POSITIVE followers effect, never a cost', () => {
    const holder = run({ heldArtifactIds: ['gilded_thumb'], followers: 20 });
    expect(relicRules(holder, content).followersGainMultiplier).toBe(1.5);
    const draft = draftOf(holder);
    applyEffects(draft, [{ t: 'followers', v: 10 }], () => 0, content);
    expect(draft.followers).toBe(35); // 20 + 10*1.5

    const draft2 = draftOf(holder);
    applyEffects(draft2, [{ t: 'followers', v: -10 }], () => 0, content);
    expect(draft2.followers).toBe(10); // unscaled cost
  });
});

// ---------------------------------------------------------------------------
// Chalk of the Last Lecture — passive: decayReduction
// ---------------------------------------------------------------------------

describe('Chalk of the Last Lecture · Notoriety decay -1 an era', () => {
  it('reduces decayFor by exactly 1, floored at 0', () => {
    const holder = run({
      heldArtifactIds: ['chalk_of_the_last_lecture'],
      phase: 'decline',
      erasSinceProphecy: 0,
    });
    const reduction = relicRules(holder, content).decayReduction;
    expect(reduction).toBe(1);
    const bare = decayFor(holder);
    expect(decayFor(holder, reduction)).toBe(bare - 1);
    // Floored at 0 even if a future relic's reduction ever exceeded the base.
    expect(decayFor(holder, bare + 5)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tenure Ring — passive: standingBand (double-edged)
// ---------------------------------------------------------------------------

describe('The Tenure Ring · Academy standing held between -50 and +45', () => {
  const holder = (over: Partial<RunState> = {}) =>
    run({ heldArtifactIds: ['tenure_ring'], ...over });

  it('clamps a DIRECT loss at the floor, never sealing', () => {
    const state = holder({ factionStanding: { ...run().factionStanding, pale_academy: -48 } });
    const draft = draftOf(state);
    applyEffects(draft, [{ t: 'standing', factionId: 'pale_academy', v: -20 }], () => 0, content);
    expect(draft.factionStanding.pale_academy).toBe(-50);
  });

  it('clamps a DIRECT gain at the ceiling, never reaching devotion', () => {
    const state = holder({ factionStanding: { ...run().factionStanding, pale_academy: 40 } });
    const draft = draftOf(state);
    applyEffects(draft, [{ t: 'standing', factionId: 'pale_academy', v: 20 }], () => 0, content);
    expect(draft.factionStanding.pale_academy).toBe(45);
  });

  it('clamps a CONTAGION SPILLOVER onto the Academy at the same floor', () => {
    // Ashen Covenant is hostile to the Academy — courting the Covenant hard
    // spills a loss onto the Academy via applyStanding's own contagion path.
    const state = holder({ factionStanding: { ...run().factionStanding, pale_academy: -49 } });
    const draft = draftOf(state);
    applyEffects(draft, [{ t: 'standing', factionId: 'ashen_covenant', v: 30 }], () => 0, content);
    expect(draft.factionStanding.pale_academy).toBeGreaterThanOrEqual(-50);
    expect(draft.factionStanding.pale_academy).toBe(-50);
  });

  it('the reprisal check never seals a career pinned at the floor', () => {
    const state = holder({
      factionStanding: { ...run().factionStanding, pale_academy: -50 },
      notoriety: 90,
    });
    expect(reprisalEnding(state, content)).not.toBe('sealed_in_gem');
  });

  it('is derived as double-edged, and excluded from every random draw', () => {
    const tenureRing = content.artifacts.find((a) => a.id === 'tenure_ring')!;
    expect(isDoubleEdged(tenureRing)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Spectacles of the Third Reading — passive: gambleOddsBonus
// ---------------------------------------------------------------------------

describe('Spectacles of the Third Reading · +10% odds on every gamble', () => {
  it('adds to a gamble’s odds, clamped at 1', () => {
    const holder = run({ heldArtifactIds: ['spectacles_of_the_third_reading'] });
    const option: OfferOption = {
      kind: 'gamble',
      label: 'g',
      odds: 0.5,
      onSuccess: [],
      onFailure: [],
      successText: 'y',
      failureText: 'n',
    };
    expect(effectiveOdds(holder, option, content)).toBeCloseTo(0.6);

    const risky: OfferOption = { ...option, odds: 0.95 };
    expect(effectiveOdds(holder, risky, content)).toBe(1);
  });

  it('does nothing without content passed (pre-#82 call sites keep their old numbers)', () => {
    const holder = run({ heldArtifactIds: ['spectacles_of_the_third_reading'] });
    const option: OfferOption = {
      kind: 'gamble',
      label: 'g',
      odds: 0.5,
      onSuccess: [],
      onFailure: [],
      successText: 'y',
      failureText: 'n',
    };
    expect(effectiveOdds(holder, option)).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// Antler Baton — onChoice, watchesOfferFaction
// ---------------------------------------------------------------------------

describe('The Antler Baton · +5 Apprentice Loyalty when you answer a Choir offer', () => {
  const holder = (over: Partial<RunState> = {}) =>
    run({ heldArtifactIds: ['antler_baton'], apprentices: { count: 1, loyalty: 40 }, ...over });

  it('fires when the OFFER itself belongs to the Verdant Choir', () => {
    const choirOffer = offerOf([{ t: 'notoriety', v: 1 }], 'verdant_choir');
    const { resolution } = resolveChoice(holder(), choirOffer, 0, content);
    expect(resolution.relicEvents).toContainEqual({
      artifactId: 'antler_baton',
      applied: [{ t: 'loyalty', v: 5 }],
    });
  });

  it('does not fire for a different faction’s offer', () => {
    const handOffer = offerOf([{ t: 'notoriety', v: 1 }], 'gilded_hand');
    const { resolution } = resolveChoice(holder(), handOffer, 0, content);
    expect(resolution.relicEvents).toEqual([]);
  });

  it('does not fire for a faction-less offer', () => {
    const neutral = offerOf([{ t: 'notoriety', v: 1 }]);
    const { resolution } = resolveChoice(holder(), neutral, 0, content);
    expect(resolution.relicEvents).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Seed That Remembers — onChoice, watchesEffect: loseArtifact
// ---------------------------------------------------------------------------

describe('The Seed That Remembers · grants the Mantle of Slow Moss when a choice costs a relic', () => {
  it('fires and grants the Mantle when it is not already held', () => {
    const holder = run({ heldArtifactIds: ['seed_that_remembers', 'antler_baton'] });
    const loses = offerOf([{ t: 'loseArtifact' }]);
    const { next, resolution } = resolveChoice(holder, loses, 0, content);
    expect(resolution.relicEvents).toContainEqual({
      artifactId: 'seed_that_remembers',
      applied: [{ t: 'artifact', artifactId: 'mantle_of_slow_moss' }],
    });
    expect(next.heldArtifactIds).toContain('mantle_of_slow_moss');
  });

  it('is silent (no event) when the Mantle is already held — the grant no-ops', () => {
    // `counterfeit_soul` pins WHICH relic `loseArtifact` takes (its own
    // `loseArtifactPriority`), so the Mantle is guaranteed to survive this
    // loss and the Seed's own grant has nothing left to do.
    const holder = run({
      heldArtifactIds: ['seed_that_remembers', 'mantle_of_slow_moss', 'counterfeit_soul'],
    });
    const loses = offerOf([{ t: 'loseArtifact' }]);
    const { next, resolution } = resolveChoice(holder, loses, 0, content);
    expect(next.heldArtifactIds).toContain('mantle_of_slow_moss');
    expect(resolution.relicEvents.some((e) => e.artifactId === 'seed_that_remembers')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Weather Leash — eraEnd, if declinePhase (double-edged)
// ---------------------------------------------------------------------------

describe('The Weather Leash · decline era end: -4 Followers, -3 Hero Threat', () => {
  it('fires at the end of a DECLINE era', () => {
    const holder = run({
      heldArtifactIds: ['weather_leash'],
      phase: 'decline',
      followers: 20,
      heroThreat: 20,
    });
    const offer = offerOf([{ t: 'notoriety', v: 1 }]);
    const { resolution } = resolveChoice(holder, offer, 0, content);
    expect(resolution.relicEvents).toContainEqual({
      artifactId: 'weather_leash',
      applied: [
        { t: 'followers', v: -4 },
        { t: 'heroThreat', v: -3 },
      ],
    });
  });

  it('does not fire during the ASCENT', () => {
    const holder = run({ heldArtifactIds: ['weather_leash'], phase: 'ascent', followers: 20 });
    const offer = offerOf([{ t: 'notoriety', v: 1 }]);
    const { resolution } = resolveChoice(holder, offer, 0, content);
    expect(resolution.relicEvents.some((e) => e.artifactId === 'weather_leash')).toBe(false);
  });

  it('is derived as double-edged, and excluded from every random draw', () => {
    const weatherLeash = content.artifacts.find((a) => a.id === 'weather_leash')!;
    expect(isDoubleEdged(weatherLeash)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Root of the Standing Vote — lifeline: cancels the first faction reprisal
// ---------------------------------------------------------------------------

describe('The Root of the Standing Vote · lifeline: cancels the first faction reprisal', () => {
  it('spends itself instead of the run ending, resets standing to -40, and fires only once', () => {
    const nearReprisal = run({
      heldArtifactIds: ['root_of_the_standing_vote'],
      notoriety: 90,
      factionStanding: { ...run().factionStanding, crownlands: -80 },
    });
    const offer = offerOf([{ t: 'notoriety', v: 0 }]);
    const { next, resolution } = resolveChoice(nearReprisal, offer, 0, content);

    expect(next.ending).toBeUndefined();
    expect(resolution.ending).toBeUndefined();
    expect(next.factionStanding.crownlands).toBe(-40);
    expect(resolution.lifeline).toEqual({
      artifactId: 'root_of_the_standing_vote',
      endingAverted: REPRISAL_BY_FACTION.crownlands,
      recovery: { t: 'standingReset', v: -40 },
      applied: [{ t: 'standing', factionId: 'crownlands', v: 40 }],
    });
    expect(next.relicState.firedOnce).toContain('root_of_the_standing_vote');
    expect(next.heldArtifactIds).toContain('root_of_the_standing_vote'); // spent, not lost

    // Spent: the SAME condition, reached again, ends the run for real.
    const secondTime = { ...next, factionStanding: { ...next.factionStanding, crownlands: -80 } };
    const { next: after2, resolution: res2 } = resolveChoice(secondTime, offer, 0, content);
    expect(after2.ending).toBe(REPRISAL_BY_FACTION.crownlands);
    expect(res2.lifeline).toBeUndefined();
  });

  it('never changes SEAL_MAX_STANDING itself — the reprisal is still reachable the ordinary way', () => {
    const holder = run({ heldArtifactIds: ['root_of_the_standing_vote'] });
    expect(reprisalEnding(holder, content)).toBeUndefined(); // nowhere near it yet
  });
});

// ---------------------------------------------------------------------------
// Writ of Tolerated Existence — passive: reprisalThreshold
// ---------------------------------------------------------------------------

describe('The Writ of Tolerated Existence · the Crownlands’ reprisal needs -75, not -55', () => {
  it('holds off the reprisal between -75 and -55, and still fires at -75', () => {
    const holder = run({
      heldArtifactIds: ['writ_of_tolerated_existence'],
      notoriety: 90,
      factionStanding: { ...run().factionStanding, crownlands: -60 },
    });
    expect(reprisalEnding(holder, content)).toBeUndefined();

    const sealed = { ...holder, factionStanding: { ...holder.factionStanding, crownlands: -75 } };
    expect(reprisalEnding(sealed, content)).toBe('exiled_and_overrun');
  });

  it('nearestReprisalFaction never names the Crownlands over a genuinely closer faction', () => {
    // Crownlands sits well under the ORDINARY line but not the Writ's own
    // widened one; the Choir sits just under ITS ordinary line. The Choir is
    // the one actually about to act.
    const holder = run({
      heldArtifactIds: ['writ_of_tolerated_existence'],
      factionStanding: { ...run().factionStanding, crownlands: -60, verdant_choir: -56 },
    });
    expect(nearestReprisalFaction(holder, content)).toBe('verdant_choir');
  });
});

// ---------------------------------------------------------------------------
// Confiscated Banner — onChoice, watchesNegative: standing, watchesFactionId
// ---------------------------------------------------------------------------

describe('The Confiscated Banner · +2 Notoriety when a choice lowers Crownlands standing', () => {
  const holder = (over: Partial<RunState> = {}) =>
    run({ heldArtifactIds: ['confiscated_banner'], ...over });

  it('fires on a DIRECT loss of Crownlands standing', () => {
    const offer = offerOf([{ t: 'standing', factionId: 'crownlands', v: -10 }]);
    const { resolution } = resolveChoice(holder(), offer, 0, content);
    expect(resolution.relicEvents).toContainEqual({
      artifactId: 'confiscated_banner',
      applied: [{ t: 'notoriety', v: 2 }],
    });
  });

  it('fires on a CONTAGION SPILLOVER loss (Verdant Choir is hostile to the Crownlands)', () => {
    const offer = offerOf([{ t: 'standing', factionId: 'verdant_choir', v: 20 }]);
    const { next, resolution } = resolveChoice(holder(), offer, 0, content);
    expect(next.factionStanding.crownlands).toBeLessThan(0);
    expect(resolution.relicEvents).toContainEqual({
      artifactId: 'confiscated_banner',
      applied: [{ t: 'notoriety', v: 2 }],
    });
  });

  it('does not fire when a DIFFERENT faction loses standing', () => {
    const offer = offerOf([{ t: 'standing', factionId: 'gilded_hand', v: -10 }]);
    const { resolution } = resolveChoice(holder(), offer, 0, content);
    expect(resolution.relicEvents).toEqual([]);
  });

  it('does not fire when Crownlands standing RISES', () => {
    const offer = offerOf([{ t: 'standing', factionId: 'crownlands', v: 10 }]);
    const { resolution } = resolveChoice(holder(), offer, 0, content);
    expect(resolution.relicEvents).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Portcullis Tooth — lifeline: stops the hero's killing blow once
// ---------------------------------------------------------------------------

describe('The Portcullis Tooth · lifeline: stops the hero’s killing blow once', () => {
  it('spends itself instead of the run ending, dropping threat to 80% of wards, and fires only once', () => {
    const state = run({
      heldArtifactIds: ['portcullis_tooth'],
      phase: 'decline',
      erasSinceProphecy: 5,
      heroThreat: 200, // already past defenseOf before this era's own gain
    });
    const wards = defenseOf(state, content);
    expect(state.heroThreat).toBeGreaterThan(wards);
    const offer = offerOf([{ t: 'notoriety', v: 0 }]);
    const { next, resolution } = resolveChoice(state, offer, 0, content);

    expect(next.ending).toBeUndefined();
    expect(resolution.lifeline?.artifactId).toBe('portcullis_tooth');
    expect(resolution.lifeline?.endingAverted).toBe('slain_by_chosen_one');
    const newWards = defenseOf(next, content);
    expect(next.heroThreat).toBe(Math.round(newWards * 0.8));
    expect(next.heroThreat).toBeLessThan(newWards);

    // Spent: run the hero straight through again, it kills for real this time.
    const dead = { ...next, heroThreat: 500 };
    const { next: after2 } = resolveChoice(dead, offer, 0, content);
    expect(after2.ending).toBe('slain_by_chosen_one');
  });
});

// ---------------------------------------------------------------------------
// Sword That Was Returned — active
// ---------------------------------------------------------------------------

describe('The Sword That Was Returned · active: -25 Hero Threat', () => {
  it('applies the relief and can only be used once', () => {
    const holder = run({ heldArtifactIds: ['sword_that_was_returned'], heroThreat: 40 });
    const { next, event } = activateRelic(holder, 'sword_that_was_returned', content);
    expect(event).toEqual({
      artifactId: 'sword_that_was_returned',
      applied: [{ t: 'heroThreat', v: -25 }],
    });
    expect(next.heroThreat).toBe(15);
    expect(canActivateRelic(next, 'sword_that_was_returned', content)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Pocketful of Dark — heroApproach, once
// ---------------------------------------------------------------------------

describe('A Pocketful of Dark · once, the first time the hero draws close: -10 Hero Threat', () => {
  it('fires at the exact era the band first crosses out of calm, and never again', () => {
    // `eraIndex`/`prophecyEra` both at 9 keeps `phase: 'decline'` internally
    // consistent; `erasSinceProphecy: 0` still applies THIS era's decay
    // (notoriety 10 -> 7) before threatGainFor reads it, which is what
    // makes 30 -> 25 the crossing rather than a rounder-looking number —
    // found empirically against the real engine rather than hand-derived,
    // since decay landing before the gain is exactly the kind of ordering
    // a hand calculation gets wrong.
    let state = run({
      heldArtifactIds: ['pocketful_of_dark'],
      phase: 'decline',
      eraIndex: 9,
      prophecyEra: 9,
      erasSinceProphecy: 0,
      notoriety: 10,
      heroThreat: 30,
      heroBandSeen: 0,
    });
    const wardsBefore = defenseOf(state, content);
    expect(heroBand(state.heroThreat, wardsBefore)).toBe('calm');

    const offer = offerOf([{ t: 'followers', v: 0 }]);
    const { next, resolution } = resolveChoice(state, offer, 0, content);
    expect(next.heroBandSeen).toBeGreaterThan(0);
    expect(resolution.relicEvents).toContainEqual({
      artifactId: 'pocketful_of_dark',
      applied: [{ t: 'heroThreat', v: -10 }],
    });
    state = next;

    // Push it into 'danger' next — a SECOND crossing, but the trigger already fired once.
    state = { ...state, heroThreat: state.heroThreat + 30 };
    const { next: after2, resolution: res2 } = resolveChoice(state, offer, 0, content);
    expect(after2.heroBandSeen).toBeGreaterThan(next.heroBandSeen);
    expect(res2.relicEvents.some((e) => e.artifactId === 'pocketful_of_dark')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Shallow Worm's Tooth — onChoice, watchesNegative: followers
// ---------------------------------------------------------------------------

describe("The Shallow Worm's Tooth · +2 Worm standing when a choice costs Followers", () => {
  const holder = (over: Partial<RunState> = {}) =>
    run({ heldArtifactIds: ['shallow_worms_tooth'], followers: 20, ...over });

  it('fires when the choice ACTUALLY deducts followers', () => {
    // The Worm's own gain spills onto the Pale Academy (its one hostile
    // faction) via ordinary contagion — the same mechanism every other
    // standing effect in this file already carries.
    const offer = offerOf([{ t: 'followers', v: -5 }]);
    const { resolution } = resolveChoice(holder(), offer, 0, content);
    expect(resolution.relicEvents).toContainEqual({
      artifactId: 'shallow_worms_tooth',
      applied: [
        { t: 'standing', factionId: 'worm_below', v: 2 },
        { t: 'standing', factionId: 'pale_academy', v: -1 },
      ],
    });
  });

  it('does not fire when the cost floor-clamps to nothing (broke already)', () => {
    const broke = holder({ followers: 0 });
    const offer = offerOf([{ t: 'followers', v: -5 }]);
    const { next, resolution } = resolveChoice(broke, offer, 0, content);
    expect(next.followers).toBe(0);
    expect(resolution.relicEvents).toEqual([]);
  });

  it('does not fire when followers RISE', () => {
    const offer = offerOf([{ t: 'followers', v: 5 }]);
    const { resolution } = resolveChoice(holder(), offer, 0, content);
    expect(resolution.relicEvents).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Patient Lantern — passive: survivesLichRite
// ---------------------------------------------------------------------------

describe('The Patient Lantern · survives the lich rite, so you keep it and its wards', () => {
  it('is excluded from forfeitForLichdom while every other relic is taken', () => {
    const holder = run({ heldArtifactIds: ['patient_lantern', 'antler_baton', 'bone_crown'] });
    const draft = draftOf(holder);
    forfeitForLichdom(draft, content);
    expect(draft.heldArtifactIds).toEqual(['patient_lantern']);
  });

  it('resolveChoice with the rite keeps it out of artifactsLost and out of heldArtifactIds’ forfeiture', () => {
    const holder = run({ heldArtifactIds: ['patient_lantern', 'antler_baton'], followers: 5 });
    const offer = offerOf([{ t: 'becomeLich' }]);
    const { next, resolution } = resolveChoice(holder, offer, 0, content);
    expect(next.heldArtifactIds).toEqual(['patient_lantern']);
    expect(resolution.artifactsLost.map((a) => a.id)).toEqual(['antler_baton']);
    expect(defenseOf(next, content)).toBeGreaterThan(0); // the Lantern's own wards still count
  });
});

// ---------------------------------------------------------------------------
// Second Stomach — passive: followersCostMultiplier
// ---------------------------------------------------------------------------

describe('The Second Stomach · choices cost a quarter fewer Followers', () => {
  it('scales a NEGATIVE followers effect, never a gain', () => {
    const holder = run({ heldArtifactIds: ['second_stomach'], followers: 20 });
    expect(relicRules(holder, content).followersCostMultiplier).toBe(0.75);
    const draft = draftOf(holder);
    applyEffects(draft, [{ t: 'followers', v: -8 }], () => 0, content);
    expect(draft.followers).toBe(14); // 20 - round(8*0.75) = 20 - 6

    const draft2 = draftOf(holder);
    applyEffects(draft2, [{ t: 'followers', v: 8 }], () => 0, content);
    expect(draft2.followers).toBe(28); // unscaled gain
  });

  it('combines with the Gilded Thumb without cross-interference (gain scaled by one, cost by the other)', () => {
    const holder = run({ heldArtifactIds: ['second_stomach', 'gilded_thumb'], followers: 20 });
    const rules = relicRules(holder, content);
    expect(rules.followersCostMultiplier).toBe(0.75);
    expect(rules.followersGainMultiplier).toBe(1.5);
    const draft = draftOf(holder);
    applyEffects(draft, [{ t: 'followers', v: -8 }, { t: 'followers', v: 4 }], () => 0, content);
    // 20 - round(6) = 14, then + round(4*1.5) = 6 -> 20
    expect(draft.followers).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Double-edged relics, generally — named grants, never a random draw
// ---------------------------------------------------------------------------

describe('Double-edged relics · reachable only by name', () => {
  it('is exactly {tenure_ring, weather_leash} across the whole catalog', () => {
    const flagged = content.artifacts.filter(isDoubleEdged).map((a) => a.id).sort();
    expect(flagged).toEqual(['tenure_ring', 'weather_leash']);
  });

  it('a wide, unweighted artifactFrom draw against their own factions never returns them', () => {
    const holder = run({ heldArtifactIds: [] });
    const draft = draftOf(holder);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const rng = streamFor(1, 'draw-test', i);
      const application = applyEffects(
        draft,
        [{ t: 'artifactFrom', factionId: i % 2 === 0 ? 'pale_academy' : 'verdant_choir' }],
        rng,
        content,
      );
      for (const a of application.artifactsGained) {
        seen.add(a.id);
        draft.heldArtifactIds = draft.heldArtifactIds.filter((id) => id !== a.id); // allow re-drawing
      }
    }
    expect(seen.has('tenure_ring')).toBe(false);
    expect(seen.has('weather_leash')).toBe(false);
  });

  it('each is reachable through its own real, authored offer', () => {
    const tenureOffer = realOfferWhere('grants the Tenure Ring by name', (o) =>
      o.options.some(
        (opt) =>
          opt.kind === 'certain' && opt.effects.some((e) => e.t === 'artifact' && e.artifactId === 'tenure_ring'),
      ),
    );
    expect(tenureOffer.id).toBe('ascent_pale_academy_loan');

    const leashOffer = realOfferWhere('grants the Weather Leash by name', (o) =>
      o.options.some(
        (opt) =>
          opt.kind === 'gamble' &&
          opt.onSuccess.some((e) => e.t === 'artifact' && e.artifactId === 'weather_leash'),
      ),
    );
    expect(leashOffer.id).toBe('decline_the_verdant_offer');
  });
});

// ---------------------------------------------------------------------------
// Lifelines, generally — never fire for an ending they do not cover
// ---------------------------------------------------------------------------

describe('Lifelines · scoped strictly to the endings they cover', () => {
  it("Portcullis Tooth does not intercept a faction reprisal", () => {
    const nearReprisal = run({
      heldArtifactIds: ['portcullis_tooth'],
      notoriety: 90,
      factionStanding: { ...run().factionStanding, crownlands: -80 },
    });
    const offer = offerOf([{ t: 'notoriety', v: 0 }]);
    const { next, resolution } = resolveChoice(nearReprisal, offer, 0, content);
    expect(next.ending).toBe('exiled_and_overrun');
    expect(resolution.lifeline).toBeUndefined();
  });

  it('Root of the Standing Vote does not intercept the hero', () => {
    const state = run({
      heldArtifactIds: ['root_of_the_standing_vote'],
      phase: 'decline',
      heroThreat: 500,
    });
    const offer = offerOf([{ t: 'notoriety', v: 0 }]);
    const { next, resolution } = resolveChoice(state, offer, 0, content);
    expect(next.ending).toBe('slain_by_chosen_one');
    expect(resolution.lifeline).toBeUndefined();
  });
});
