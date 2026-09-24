/**
 * The relic power framework (issue #80, slice 3 of #77).
 *
 * Three things this file has to prove, beyond "the four powers work":
 *
 *   1. No relics held reproduces today's behaviour exactly — the framework's
 *      own acceptance bar.
 *   2. `watchesPositive` reads the CHOSEN OPTION's own landed effects, never
 *      the ambient run — the bug an earlier `if`-only design had (a starting
 *      origin grant already satisfying a threshold on era one, regardless of
 *      what era one's choice actually did).
 *   3. The anchored projection test: what `projectReactions` predicts before
 *      a commit is EXACTLY what `resolveChoice` applies for real — the same
 *      pairing discipline `projection.test.ts` holds `projectEffects` to.
 */
import { describe, expect, it } from 'vitest';
import type { Effect, Offer, OfferOption, RunState } from '../types';
import { createRun, resolveChoice } from './run';
import { applyChoiceTriggers, applyEraEndTriggers, effectiveOdds, projectReactions, relicRules } from './relics';
import { REAL_CONTENT as content } from '../testing/realContent';
import { streamFor } from './rng';

const ORIGIN = {
  academy: 'expelled_pale_academy', // Footnote That Bites (passive)
  bog: 'bog_autodidact', // Mantle of Slow Moss (eraEnd trigger)
  tower: 'inherited_tower_and_debts', // Ashen Signature (onChoice, once)
  estate: 'sold_masters_estate', // Unpaid Purse (eraEnd trigger, if maxFollowers)
};

const run = (originId: string, over: Partial<RunState> = {}): RunState => ({
  ...createRun({ wizardName: 'Test', originId, eraCount: 16, seed: 11 }, content),
  ...over,
});

function certainOption(effects: Effect[], label = 'Do it'): OfferOption {
  return { kind: 'certain', label, effects };
}

/**
 * A bare offer with the given effects as option 0, and a genuine no-op as
 * option 1 — so a test can drive era-end-only behaviour (index 1) without
 * touching pactDebt/followers/standing at all.
 */
function offerOf(effects: Effect[]): Offer {
  return {
    id: 'test_offer',
    title: 'Test',
    body: 'Test.',
    phase: 'any',
    options: [certainOption(effects), certainOption([{ t: 'notoriety', v: 0 }], 'Do nothing')],
  };
}

describe('relicRules · combined passives', () => {
  it('is neutral with no relics held', () => {
    const bare = run(ORIGIN.bog, { heldArtifactIds: [] });
    expect(relicRules(bare, content)).toEqual({ contagionLossMultiplier: 1 });
  });

  it('halves the contagion-loss multiplier while Footnote That Bites is held', () => {
    const holder = run(ORIGIN.academy);
    expect(holder.heldArtifactIds).toContain('footnote_that_bites');
    expect(relicRules(holder, content).contagionLossMultiplier).toBe(0.5);
  });

  it('halves standing actually LOST to contagion, end to end', () => {
    // pale_academy's hostileTo includes ashen_covenant and worm_below — a
    // Pale Academy LOSS spills a fraction of that loss onto both as a GAIN
    // (the mirror direction). Compare a holder against a non-holder from the
    // same starting standing.
    const base = { factionStanding: { ...run(ORIGIN.bog).factionStanding, pale_academy: 40 } };
    const holder = run(ORIGIN.academy, base);
    const nonHolder = run(ORIGIN.bog, { ...base, heldArtifactIds: [] });

    const offer = offerOf([{ t: 'standing', factionId: 'pale_academy', v: -20 }]);
    const holderNext = resolveChoice(holder, offer, 0, content).next;
    const plainNext = resolveChoice(nonHolder, offer, 0, content).next;

    const holderSpill = holderNext.factionStanding.ashen_covenant - holder.factionStanding.ashen_covenant;
    const plainSpill = plainNext.factionStanding.ashen_covenant - nonHolder.factionStanding.ashen_covenant;
    expect(holderSpill).toBeGreaterThan(0);
    expect(plainSpill).toBeGreaterThan(0);
    expect(holderSpill).toBe(Math.round(plainSpill / 2));
  });
});

describe('effectiveOdds · the seam for a future odds relic', () => {
  it('is a pass-through today: certain reads 1, gamble reads its authored odds', () => {
    const state = run(ORIGIN.bog);
    const certain: OfferOption = { kind: 'certain', label: 'x', effects: [] };
    const gamble: OfferOption = {
      kind: 'gamble',
      label: 'x',
      odds: 0.35,
      onSuccess: [{ t: 'notoriety', v: 1 }],
      onFailure: [{ t: 'notoriety', v: -1 }],
      successText: 's',
      failureText: 'f',
    };
    expect(effectiveOdds(state, certain)).toBe(1);
    expect(effectiveOdds(state, gamble)).toBe(0.35);
  });
});

describe('era-end triggers', () => {
  it('Mantle of Slow Moss adds Verdant Choir standing every era, contagion included', () => {
    const bog = run(ORIGIN.bog);
    const offer = offerOf([]);
    const before = bog.factionStanding.verdant_choir;

    const { next, resolution } = resolveChoice(bog, offer, 1, content); // the 0-notoriety filler option

    expect(next.factionStanding.verdant_choir).toBe(before + 2);
    const event = resolution.relicEvents.find((e) => e.artifactId === 'mantle_of_slow_moss');
    expect(event).toBeDefined();
    expect(event!.applied.some((e) => e.t === 'standing' && e.factionId === 'verdant_choir' && e.v === 2)).toBe(
      true,
    );
    // The Choir's own hostileTo list should show up in the SAME event —
    // "contagion applies and is shown" is the power's own description.
    expect(event!.applied.length).toBeGreaterThan(1);
  });

  it('fires every era, not just once', () => {
    let state = run(ORIGIN.bog);
    const offer = offerOf([]);
    for (let i = 0; i < 3; i++) {
      const { next, resolution } = resolveChoice(state, offer, 1, content);
      expect(resolution.relicEvents.some((e) => e.artifactId === 'mantle_of_slow_moss')).toBe(true);
      state = next;
    }
  });

  it('Unpaid Purse tops followers up only while under ten', () => {
    const poor = run(ORIGIN.estate, { followers: 3 });
    const offer = offerOf([]);
    const { next: poorNext, resolution: poorRes } = resolveChoice(poor, offer, 1, content);
    expect(poorNext.followers).toBe(13);
    expect(poorRes.relicEvents.some((e) => e.artifactId === 'unpaid_purse')).toBe(true);

    const flush = run(ORIGIN.estate, { followers: 40 });
    const { next: flushNext, resolution: flushRes } = resolveChoice(flush, offer, 1, content);
    expect(flushNext.followers).toBe(40);
    expect(flushRes.relicEvents.some((e) => e.artifactId === 'unpaid_purse')).toBe(false);
  });

  it('is skipped, like decay, when the era-ending option already ended the run', () => {
    const poor = run(ORIGIN.estate, { followers: 3 });
    const offer = offerOf([{ t: 'ending', endingId: 'retired_to_swamp' }]);
    const { resolution } = resolveChoice(poor, offer, 0, content);
    expect(resolution.ending).toBe('retired_to_swamp');
    expect(resolution.relicEvents.some((e) => e.artifactId === 'unpaid_purse')).toBe(false);
  });
});

describe('once-only triggers · Ashen Signature', () => {
  it('reacts to the CHOICE raising Pact Debt, not to the ambient run', () => {
    // Inherited a Tower and Its Debts starts pactDebt at 2 from the ORIGIN
    // itself — never a choice. An option that never touches pactDebt must
    // not arm the relic just because the run already carries debt (the exact
    // bug `watchesPositive` replaced an `if`-based design to fix).
    const tower = run(ORIGIN.tower);
    expect(tower.pactDebt).toBe(2);
    const untouching = offerOf([{ t: 'notoriety', v: 5 }]);
    const { next, resolution } = resolveChoice(tower, untouching, 0, content);
    expect(next.pactDebt).toBe(2);
    expect(resolution.relicEvents.some((e) => e.artifactId === 'ashen_signature')).toBe(false);
    expect(next.relicState.firedOnce).not.toContain('ashen_signature');
  });

  it('fires the FIRST time a choice actually raises Pact Debt, reducing it by one', () => {
    const tower = run(ORIGIN.tower);
    const raises = offerOf([{ t: 'pactDebt', v: 2 }]);
    const { next, resolution } = resolveChoice(tower, raises, 0, content);

    // +2 landed at face value (the option's own ledger); the relic's -1 is a
    // SEPARATE, attributed event, never folded into the option's own number.
    expect(resolution.appliedEffects).toContainEqual({ t: 'pactDebt', v: 2 });
    expect(resolution.relicEvents).toContainEqual({
      artifactId: 'ashen_signature',
      applied: [{ t: 'pactDebt', v: -1 }],
    });
    expect(next.pactDebt).toBe(3); // 2 (origin) + 2 (choice) - 1 (relic)
    expect(next.relicState.firedOnce).toContain('ashen_signature');
  });

  it('never fires a second time, even on a later choice that also raises debt', () => {
    const tower = run(ORIGIN.tower);
    const raises = offerOf([{ t: 'pactDebt', v: 2 }]);
    const once = resolveChoice(tower, raises, 0, content).next;
    const twice = resolveChoice(once, raises, 0, content);

    expect(twice.resolution.relicEvents.some((e) => e.artifactId === 'ashen_signature')).toBe(false);
    expect(twice.next.pactDebt).toBe(once.pactDebt + 2); // full cost, no further discount
  });
});

describe('no relics held reproduces today\'s behaviour exactly', () => {
  it('applyChoiceTriggers and applyEraEndTriggers are no-ops', () => {
    const bare = { ...run(ORIGIN.bog), heldArtifactIds: [] };
    const rng = streamFor(bare.seed, 'test');
    expect(applyChoiceTriggers({ ...bare }, content, rng, [{ t: 'pactDebt', v: 5 }])).toEqual([]);
    expect(applyEraEndTriggers({ ...bare }, content, rng)).toEqual([]);
  });

  it('resolveChoice produces no relicEvents for a relic-free run', () => {
    const bare = run(ORIGIN.bog, { heldArtifactIds: [] });
    const offer = offerOf([{ t: 'pactDebt', v: 3 }, { t: 'followers', v: -2 }]);
    const { resolution } = resolveChoice(bare, offer, 0, content);
    expect(resolution.relicEvents).toEqual([]);
  });
});

describe('projectReactions · never draws from the rng', () => {
  /**
   * Regression pin for a real crash found by `qa/playthrough.mjs`: most of
   * the catalog is free to grant or lose a relic on ANY option, but
   * `applyEffects` only draws from the rng for `artifactFrom`/`loseArtifact`.
   * Previewing the option's FULL authored effects (rather than filtering
   * those two out first) threw the instant a real card carrying one was
   * offered — which crashed `OfferPanel` on the very first era of an actual
   * playthrough, well before any unit test exercised a real catalog offer
   * through this path.
   */
  it('previews an option that also grants a random relic, without throwing', () => {
    const state = run(ORIGIN.tower);
    const option: OfferOption = {
      kind: 'certain',
      label: 'x',
      effects: [
        { t: 'pactDebt', v: 1 },
        { t: 'artifactFrom', factionId: 'worm_below' },
      ],
    };
    expect(() => projectReactions(state, option, content)).not.toThrow();
    const preview = projectReactions(state, option, content);
    expect(preview.kind).toBe('certain');
  });

  it('previews an option that loses a random held relic, without throwing', () => {
    const state = run(ORIGIN.tower);
    const option: OfferOption = { kind: 'certain', label: 'x', effects: [{ t: 'loseArtifact' }] };
    expect(() => projectReactions(state, option, content)).not.toThrow();
  });
});

describe('projectReactions · the anchored projection test', () => {
  /**
   * For every trigger power in the catalog: what the card previews before
   * commit must equal what `resolveChoice` actually applies. Nothing here can
   * drift because `projectReactions` and `resolveChoice` share the same
   * `applyChoiceTriggers`/`applyEraEndTriggers` implementation — this test is
   * what would catch it if a future edit ever forked the two.
   */
  const cases: { name: string; originId: string; option: OfferOption }[] = [
    {
      name: 'Mantle of Slow Moss (era-end)',
      originId: ORIGIN.bog,
      option: { kind: 'certain', label: 'x', effects: [] },
    },
    {
      name: 'Unpaid Purse (era-end, conditional)',
      originId: ORIGIN.estate,
      option: { kind: 'certain', label: 'x', effects: [] },
    },
    {
      name: 'Ashen Signature (once, watches the choice)',
      originId: ORIGIN.tower,
      option: { kind: 'certain', label: 'x', effects: [{ t: 'pactDebt', v: 1 }] },
    },
  ];

  for (const { name, originId, option } of cases) {
    it(`matches resolveChoice for ${name}`, () => {
      const state = originId === ORIGIN.estate ? run(originId, { followers: 2 }) : run(originId);
      const offer: Offer = { id: 'o', title: 't', body: 'b', phase: 'any', options: [option, option] };

      const preview = projectReactions(state, option, content);
      expect(preview.kind).toBe('certain');
      const predicted = preview.kind === 'certain' ? preview.events : [];

      const { resolution } = resolveChoice(state, offer, 0, content);
      expect(resolution.relicEvents).toEqual(predicted);
    });
  }
});
