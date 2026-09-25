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
import type { ContentBundle } from './content-port';
import { createRun, resolveChoice } from './run';
import { applyChoiceTriggers, applyEraEndTriggers, effectiveOdds, projectReactions, relicRules } from './relics';
import { emptyCollection, recordRun } from './persistence';
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
    // pale_academy's hostileTo includes ashen_covenant and worm_below —
    // COURTING (gaining standing with) pale_academy spills a fraction of that
    // gain onto both as a LOSS. That loss is what Footnote That Bites halves
    // ("the footnote bites back... half as hard"); the mirror direction
    // (losing pale_academy standing warms its enemies) is a GAIN for them and
    // must stay untouched by a multiplier named for loss — see the doc
    // comment on `applyStanding`'s `contagionLossMultiplier` param. Compare a
    // holder against a non-holder from the same starting standing.
    const base = { factionStanding: { ...run(ORIGIN.bog).factionStanding, pale_academy: 20 } };
    const holder = run(ORIGIN.academy, base);
    const nonHolder = run(ORIGIN.bog, { ...base, heldArtifactIds: [] });

    const offer = offerOf([{ t: 'standing', factionId: 'pale_academy', v: 20 }]);
    const holderNext = resolveChoice(holder, offer, 0, content).next;
    const plainNext = resolveChoice(nonHolder, offer, 0, content).next;

    const holderSpill = holderNext.factionStanding.ashen_covenant - holder.factionStanding.ashen_covenant;
    const plainSpill = plainNext.factionStanding.ashen_covenant - nonHolder.factionStanding.ashen_covenant;
    expect(holderSpill).toBeLessThan(0);
    expect(plainSpill).toBeLessThan(0);
    expect(holderSpill).toBe(Math.round(plainSpill / 2));
  });
});

describe('startingArtifactIds · an origin relic survives its own loss', () => {
  /**
   * The origin's `{ t: 'artifact' }` grant lands in `createRun`, before
   * `run.eras` has a single entry. `recordRun`'s discovered-artifact fold
   * (and `RelicPage`/`EndingScreen`'s own "ever held" derivations) read
   * `eras[].artifactsGained` plus current `heldArtifactIds` — neither of
   * which ever names an origin relic that gets lost before an era completes.
   * `startingArtifactIds` is what closes that gap (Codex review, PR #87).
   */
  it('createRun records the origin grant', () => {
    const state = run(ORIGIN.academy);
    expect(state.startingArtifactIds).toEqual(['footnote_that_bites']);
  });

  it('recordRun still counts an origin relic as discovered after it is lost, with no era ever gaining it', () => {
    const held = run(ORIGIN.academy);
    expect(held.heldArtifactIds).toContain('footnote_that_bites');

    // Simulate it having been lost before a single era completed: gone from
    // `heldArtifactIds`, and `eras` stays empty — `startingArtifactIds` is
    // the only thing left naming it.
    const lost: RunState = { ...held, heldArtifactIds: [], eras: [] };
    expect(lost.eras.flatMap((e) => e.artifactsGained)).not.toContain('footnote_that_bites');

    const collection = recordRun(emptyCollection(), lost, content);
    expect(collection.discoveredArtifactIds).toContain('footnote_that_bites');
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

describe('fireTriggers · relics never respond to each other', () => {
  /**
   * Issue #80 review: `heldTriggers` already snapshots WHO fires before any
   * of them run (it returns a plain array, so a relic another relic's
   * effects add or remove mid-pass still gets its fixed turn) — but nothing
   * did the same for WHETHER each one's `if` is met, so a relic earlier in
   * `heldArtifactIds` could change draft state a LATER relic's `if` then read
   * LIVE, arming it within the same pass. That made the ordering of an
   * unordered array a hidden gameplay input, and contradicted this file's own
   * header ("relics respond only to your choices and the passing of time,
   * never to each other").
   *
   * Two synthetic era-end relics pin the fix, since no two real ones happen
   * to interact this way today: A drops followers by 5 unconditionally; B's
   * `if` requires followers at or under 9 — the same `maxFollowers`
   * condition the real Unpaid Purse uses. Starting at 12, real play must
   * never let A's drop arm B in the SAME pass.
   */
  it("does not let an earlier relic's effect arm a later relic's `if` within one pass", () => {
    const syntheticContent: ContentBundle = {
      ...content,
      artifacts: [
        ...content.artifacts,
        {
          id: 'test_relic_a',
          name: 'Test Relic A',
          factionId: content.artifacts[0].factionId,
          rarity: 'common',
          flavorText: 'x',
          power: { kind: 'trigger', when: 'eraEnd', effects: [{ t: 'followers', v: -5 }] },
        },
        {
          id: 'test_relic_b',
          name: 'Test Relic B',
          factionId: content.artifacts[0].factionId,
          rarity: 'common',
          flavorText: 'x',
          power: {
            kind: 'trigger',
            when: 'eraEnd',
            if: [{ c: 'maxFollowers', v: 9 }],
            effects: [{ t: 'notoriety', v: 1 }],
          },
        },
      ],
    };
    const state: RunState = {
      ...run(ORIGIN.bog, { heldArtifactIds: ['test_relic_a', 'test_relic_b'] }),
      followers: 12,
    };
    const rng = streamFor(state.seed, 'test');
    const events = applyEraEndTriggers(state, syntheticContent, rng);
    expect(events.some((e) => e.artifactId === 'test_relic_a')).toBe(true);
    expect(events.some((e) => e.artifactId === 'test_relic_b')).toBe(false);
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

describe('projectReactions · a relic the SAME option removes', () => {
  /**
   * Issue #80 review regression: with only one relic held, `loseArtifact` is
   * not a coin flip — there is exactly one candidate, so the preview must
   * treat the loss as certain rather than pretending the relic is still
   * there. Repro from review: a Self-Taught-in-a-Bog wizard holding only the
   * (unconditional, era-end) Mantle of Slow Moss picks an option that sells
   * it off; the card previously still showed the Mantle's standing reaction,
   * which `resolveChoice` never produces because the relic is already gone
   * by the time the era-end block runs.
   */
  it('shows no era-end reaction for the single relic an option is about to lose, matching resolveChoice', () => {
    const bog = run(ORIGIN.bog);
    expect(bog.heldArtifactIds).toEqual(['mantle_of_slow_moss']);
    const sellsIt: OfferOption = {
      kind: 'certain',
      label: 'x',
      effects: [{ t: 'loseArtifact' }, { t: 'followers', v: 20 }, { t: 'notoriety', v: -2 }],
    };
    const offer: Offer = { id: 'o', title: 't', body: 'b', phase: 'any', options: [sellsIt, sellsIt] };

    const preview = projectReactions(bog, sellsIt, content);
    expect(preview.kind).toBe('certain');
    const predicted = preview.kind === 'certain' ? preview.events : [];
    expect(predicted).toEqual([]);

    const { next, resolution } = resolveChoice(bog, offer, 0, content);
    expect(next.heldArtifactIds).toEqual([]);
    expect(resolution.relicEvents).toEqual(predicted);
  });
});

describe('projectReactions · terminal branches', () => {
  /**
   * `resolveChoice` skips era-end triggers whenever the option's own effects
   * request an ending (see "is skipped, like decay, when the era-ending
   * option already ended the run" above) — there is no "end of the era" left
   * for a relic to fire at. The preview has to say nothing there too, or a
   * player holding the unconditional Mantle sees a reaction beneath a
   * scripted terminal choice that committing will never actually produce
   * (Codex review, PR #87).
   */
  it('shows no era-end reaction for an option that ends the run outright, matching resolveChoice', () => {
    const bog = run(ORIGIN.bog);
    const terminal: OfferOption = {
      kind: 'certain',
      label: 'x',
      effects: [{ t: 'ending', endingId: 'retired_to_swamp' }],
    };
    const offer: Offer = { id: 'o', title: 't', body: 'b', phase: 'any', options: [terminal, terminal] };

    const preview = projectReactions(bog, terminal, content);
    expect(preview.kind).toBe('certain');
    const predicted = preview.kind === 'certain' ? preview.events : [];
    expect(predicted).toEqual([]);

    const { resolution } = resolveChoice(bog, offer, 0, content);
    expect(resolution.ending).toBe('retired_to_swamp');
    expect(resolution.relicEvents).toEqual(predicted);
  });

  /**
   * The lich rite (`{ t: 'becomeLich' }`, the real catalog's only way to take
   * it — see `scripted.ts`'s "The Long Arrangement") forfeits every held
   * relic BEFORE `resolveChoice`'s era-end block runs, whether or not the
   * rite happens to also clear a requested ending (it transforms and
   * CONTINUES when eras are left, per `becomeLich`'s own doc comment in
   * `run.ts`). So even though the rite does not stop the run here, the
   * Mantle's era-end reaction still must not appear: it is the very relic the
   * rite just took. The preview has to reach the same empty answer by
   * forfeiting on the same throwaway draft `resolveChoice` will, not by
   * accident.
   */
  it('shows no era-end reaction for a relic the SAME choice forfeits to the lich rite', () => {
    const bog = run(ORIGIN.bog, { eraCount: 16, eraIndex: 2 });
    expect(bog.heldArtifactIds).toContain('mantle_of_slow_moss');
    const rite: OfferOption = { kind: 'certain', label: 'x', effects: [{ t: 'becomeLich' }] };
    const offer: Offer = { id: 'o', title: 't', body: 'b', phase: 'any', options: [rite, rite] };

    const preview = projectReactions(bog, rite, content);
    expect(preview.kind).toBe('certain');
    const predicted = preview.kind === 'certain' ? preview.events : [];
    expect(predicted).toEqual([]);

    const { next, resolution } = resolveChoice(bog, offer, 0, content);
    expect(resolution.ending).toBeUndefined();
    expect(next.isLich).toBe(true);
    expect(next.heldArtifactIds).toEqual([]);
    expect(resolution.relicEvents).toEqual(predicted);
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
