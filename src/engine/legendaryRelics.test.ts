/**
 * The six legendaries' powers, and the catalog's first actives (issue #81,
 * slice 4 of #77).
 *
 * Four things this file has to prove, on top of "each power works":
 *
 *   1. Cinder Testament and Long Appetite react to the CHOICE's own landed
 *      effects, never the ambient run — the same `watchesPositive` guarantee
 *      slice 3's Ashen Signature pinned, now exercised by a `scaled` trigger
 *      too.
 *   2. Old-Growth Charter's contagion zeroing is scoped to the Verdant Choir
 *      alone, and combines correctly with Footnote That Bites' own unscoped
 *      halving.
 *   3. Unbroken Line actually reaches `threatGainFor` through `resolveChoice`,
 *      not just through `relicRules` in isolation.
 *   4. `activateRelic`/`canActivateRelic` enforce "at most once per career"
 *      and real affordability, and Pale Orrery's foresight is consumed by
 *      the very next gamble, win or lose.
 */
import { describe, expect, it } from 'vitest';
import type { Effect, Offer, OfferOption, RunState } from '../types';
import { createRun, resolveChoice } from './run';
import { activateRelic, canActivateRelic, projectReactions, relicRules } from './relics';
import { emptyCollection, recordRun } from './persistence';
import { REAL_CONTENT as content } from '../testing/realContent';

const BOG_ORIGIN = 'bog_autodidact'; // Mantle of Slow Moss — irrelevant to every test here except as a neutral base.

const run = (over: Partial<RunState> = {}): RunState => ({
  ...createRun({ wizardName: 'Test', originId: BOG_ORIGIN, eraCount: 16, seed: 11 }, content),
  ...over,
});

function certainOption(effects: Effect[], label = 'Do it'): OfferOption {
  return { kind: 'certain', label, effects };
}

function offerOf(effects: Effect[]): Offer {
  return {
    id: 'test_offer',
    title: 'Test',
    body: 'Test.',
    phase: 'any',
    options: [certainOption(effects), certainOption([{ t: 'notoriety', v: 0 }], 'Do nothing')],
  };
}

describe('Cinder Testament · +Notoriety the choice adds Pact Debt', () => {
  const holder = (over: Partial<RunState> = {}) =>
    run({ heldArtifactIds: ['mantle_of_slow_moss', 'cinder_testament'], ...over });

  it('fires when the CHOICE raises Pact Debt', () => {
    const raises = offerOf([{ t: 'pactDebt', v: 2 }]);
    const { next, resolution } = resolveChoice(holder(), raises, 0, content);
    expect(resolution.relicEvents).toContainEqual({
      artifactId: 'cinder_testament',
      applied: [{ t: 'notoriety', v: 3 }],
    });
    expect(next.pactDebt).toBe(2);
  });

  it('does not fire on a choice that never touches Pact Debt, even while the run already carries some', () => {
    const state = holder({ pactDebt: 5 });
    const untouching = offerOf([{ t: 'notoriety', v: 1 }]);
    const { resolution } = resolveChoice(state, untouching, 0, content);
    expect(resolution.relicEvents.some((e) => e.artifactId === 'cinder_testament')).toBe(false);
  });

  it('fires every time, unlike the once-only Ashen Signature', () => {
    let state = holder();
    const raises = offerOf([{ t: 'pactDebt', v: 1 }]);
    for (let i = 0; i < 2; i++) {
      const { next, resolution } = resolveChoice(state, raises, 0, content);
      expect(resolution.relicEvents.some((e) => e.artifactId === 'cinder_testament')).toBe(true);
      state = next;
    }
  });

  it('the anchored projection matches resolveChoice', () => {
    const state = holder();
    const option = certainOption([{ t: 'pactDebt', v: 1 }]);
    const preview = projectReactions(state, option, content);
    expect(preview.kind).toBe('certain');
    const predicted = preview.kind === 'certain' ? preview.events : [];

    const offer: Offer = { id: 'o', title: 't', body: 'b', phase: 'any', options: [option, option] };
    const { resolution } = resolveChoice(state, offer, 0, content);
    expect(resolution.relicEvents).toEqual(predicted);
  });
});

describe('Long Appetite · +1 Notoriety per 10 Followers a choice actually spends', () => {
  const holder = (over: Partial<RunState> = {}) =>
    run({ heldArtifactIds: ['mantle_of_slow_moss', 'long_appetite'], followers: 100, ...over });

  it('scales with the magnitude actually spent, floored to whole units', () => {
    const spends23 = offerOf([{ t: 'followers', v: -23 }]);
    const { resolution } = resolveChoice(holder(), spends23, 0, content);
    expect(resolution.relicEvents).toContainEqual({
      artifactId: 'long_appetite',
      applied: [{ t: 'notoriety', v: 2 }], // floor(23 / 10) = 2
    });
  });

  it('does not fire under one whole unit', () => {
    const spends9 = offerOf([{ t: 'followers', v: -9 }]);
    const { resolution } = resolveChoice(holder(), spends9, 0, content);
    expect(resolution.relicEvents.some((e) => e.artifactId === 'long_appetite')).toBe(false);
  });

  it('does not fire on a Followers GAIN', () => {
    const gains = offerOf([{ t: 'followers', v: 40 }]);
    const { resolution } = resolveChoice(holder(), gains, 0, content);
    expect(resolution.relicEvents.some((e) => e.artifactId === 'long_appetite')).toBe(false);
  });

  it('reads a cost the FLOOR ate as zero spent, not the authored number (rule 1)', () => {
    // Starting at 3 Followers, a `-23` cost floors to a real spend of only 3.
    const almostBroke = holder({ followers: 3 });
    const spends23 = offerOf([{ t: 'followers', v: -23 }]);
    const { resolution } = resolveChoice(almostBroke, spends23, 0, content);
    expect(resolution.appliedEffects).toContainEqual({ t: 'followers', v: -3 });
    expect(resolution.relicEvents.some((e) => e.artifactId === 'long_appetite')).toBe(false);
  });

  it('the anchored projection matches resolveChoice', () => {
    const state = holder();
    const option = certainOption([{ t: 'followers', v: -35 }]);
    const preview = projectReactions(state, option, content);
    expect(preview.kind).toBe('certain');
    const predicted = preview.kind === 'certain' ? preview.events : [];

    const offer: Offer = { id: 'o', title: 't', body: 'b', phase: 'any', options: [option, option] };
    const { resolution } = resolveChoice(state, offer, 0, content);
    expect(resolution.relicEvents).toEqual(predicted);
  });
});

describe('Old-Growth Charter · zeroes contagion loss from a Verdant Choir gain alone', () => {
  it('zeroes the Choir spill, unlike an unrelated faction gain', () => {
    const holder = run({ heldArtifactIds: ['old_growth_charter'] });
    const choirGain = offerOf([{ t: 'standing', factionId: 'verdant_choir', v: 20 }]);
    const { next } = resolveChoice(holder, choirGain, 0, content);
    // verdant_choir's hostileTo includes crownlands (see factions.ts) — a
    // gain would ordinarily spill a loss there; zeroed here.
    expect(next.factionStanding.crownlands).toBe(holder.factionStanding.crownlands);
  });

  it('combines with Footnote That Bites: halves every OTHER faction, zeroes only the Choir', () => {
    const holder = run({ heldArtifactIds: ['footnote_that_bites', 'old_growth_charter'] });
    expect(relicRules(holder, content).contagionLossMultiplierFor('verdant_choir')).toBe(0);
    expect(relicRules(holder, content).contagionLossMultiplierFor('pale_academy')).toBe(0.5);
  });

  it('leaves an unscoped faction courted normally, at the ordinary rate', () => {
    const holder = run({ heldArtifactIds: ['old_growth_charter'] });
    const bare = run({ heldArtifactIds: [] });
    const academyGain = offerOf([{ t: 'standing', factionId: 'pale_academy', v: 20 }]);
    const holderNext = resolveChoice(holder, academyGain, 0, content).next;
    const bareNext = resolveChoice(bare, academyGain, 0, content).next;
    expect(holderNext.factionStanding.ashen_covenant).toBe(bareNext.factionStanding.ashen_covenant);
  });
});

describe('Unbroken Line · halves the fame term of threatGainFor, reached through resolveChoice', () => {
  const decliner = (heldArtifactIds: string[]) =>
    run({
      heldArtifactIds,
      phase: 'decline',
      erasSinceProphecy: 2,
      notoriety: 50,
      eraIndex: 9,
      prophecyEra: 9,
    });

  it('halves the threat gained at era end relative to no relic held', () => {
    const bare = decliner([]);
    const holder = decliner(['unbroken_line']);
    const quiet = offerOf([]);

    const bareNext = resolveChoice(bare, quiet, 1, content).next;
    const holderNext = resolveChoice(holder, quiet, 1, content).next;

    const bareGain = bareNext.heroThreat - bare.heroThreat;
    const holderGain = holderNext.heroThreat - holder.heroThreat;
    expect(holderGain).toBeLessThan(bareGain);
    // Only the fame term is halved — the base+ramp clock term survives, so
    // the halving is not exactly 50% of the total gain.
    expect(holderGain).toBeGreaterThan(0);
  });
});

describe('activateRelic / canActivateRelic · the catalog\'s first actives', () => {
  describe('Final Ledger', () => {
    it('cannot be used below its Followers cost', () => {
      const poor = run({ heldArtifactIds: ['final_ledger'], followers: 10 });
      expect(canActivateRelic(poor, 'final_ledger', content)).toBe(false);
      const { next, event } = activateRelic(poor, 'final_ledger', content);
      expect(event).toBeNull();
      expect(next).toBe(poor);
    });

    it('spends the cost and grants a rare relic from the best-standing faction', () => {
      const flush = run({
        heldArtifactIds: ['final_ledger'],
        followers: 40,
        factionStanding: { ...run().factionStanding, gilded_hand: 30, worm_below: -10 },
      });
      const { next, event } = activateRelic(flush, 'final_ledger', content);
      expect(next.followers).toBe(15);
      expect(event).not.toBeNull();
      expect(event!.applied.some((e) => e.t === 'followers' && e.v === -25)).toBe(true);
      const grant = event!.applied.find((e) => e.t === 'artifact');
      expect(grant).toBeDefined();
      const grantedId = grant && grant.t === 'artifact' ? grant.artifactId : undefined;
      const granted = content.artifacts.find((a) => a.id === grantedId);
      expect(granted?.factionId).toBe('gilded_hand'); // the best-standing faction
      expect(granted?.rarity).toBe('rare');
      expect(next.heldArtifactIds).toContain(grantedId);
      // PR #89 review (Codex): the grant has to survive in some record
      // besides `heldArtifactIds` — an active fires between eras, never
      // through `resolveChoice`, so `eras[].artifactsGained` never gets an
      // entry for it. Without `activeGrantedArtifactIds`, losing this relic
      // later would make it vanish from every "ever held" reconstruction.
      expect(next.activeGrantedArtifactIds).toEqual([grantedId]);
    });

    it('survives being lost afterward, in recordRun and in the "ever held" union RelicPage/EndingScreen both use', () => {
      const flush = run({
        heldArtifactIds: ['final_ledger'],
        followers: 40,
        factionStanding: { ...run().factionStanding, gilded_hand: 30 },
      });
      const { next: granted } = activateRelic(flush, 'final_ledger', content);
      const grantedId = granted.activeGrantedArtifactIds[0];
      expect(grantedId).toBeDefined();

      // Lost before any era completes — `eras` stays empty, and the relic is
      // gone from `heldArtifactIds` too, the same shape of gap
      // `startingArtifactIds` was introduced to close for an origin's grant.
      const lost: RunState = { ...granted, heldArtifactIds: [], eras: [] };
      expect(lost.eras.flatMap((e) => e.artifactsGained)).not.toContain(grantedId);

      const collection = recordRun(emptyCollection(), lost, content);
      expect(collection.discoveredArtifactIds).toContain(grantedId);
    });

    it('can never be used twice', () => {
      const flush = run({ heldArtifactIds: ['final_ledger'], followers: 100 });
      const once = activateRelic(flush, 'final_ledger', content).next;
      expect(canActivateRelic(once, 'final_ledger', content)).toBe(false);
      const twice = activateRelic(once, 'final_ledger', content);
      expect(twice.event).toBeNull();
      expect(twice.next).toBe(once);
    });
  });

  describe('Pale Orrery', () => {
    const gambleOffer: Offer = {
      id: 'g',
      title: 't',
      body: 'b',
      phase: 'any',
      options: [
        {
          kind: 'gamble',
          label: 'Risk it',
          odds: 0.1,
          successText: 'won',
          failureText: 'lost',
          onSuccess: [{ t: 'notoriety', v: 5 }],
          onFailure: [{ t: 'notoriety', v: -5 }],
        },
      ],
    };

    it('arms foresight, making the next gamble certain', () => {
      const holder = run({ heldArtifactIds: ['pale_orrery'] });
      const { next, event } = activateRelic(holder, 'pale_orrery', content);
      expect(event).not.toBeNull();
      expect(next.relicState.foresight).toBe(true);

      const { next: after, resolution } = resolveChoice(next, gambleOffer, 0, content);
      expect(resolution.outcome).toBe('success');
      expect(after.notoriety).toBe(next.notoriety + 5);
    });

    it('is consumed by the next gamble even if it were to fail on an unarmed roll otherwise', () => {
      const holder = run({ heldArtifactIds: ['pale_orrery'] });
      const armed = activateRelic(holder, 'pale_orrery', content).next;
      const { next: afterFirst } = resolveChoice(armed, gambleOffer, 0, content);
      expect(afterFirst.relicState.foresight).toBe(false);
    });

    it('cannot be used twice', () => {
      const holder = run({ heldArtifactIds: ['pale_orrery'] });
      const once = activateRelic(holder, 'pale_orrery', content).next;
      expect(canActivateRelic(once, 'pale_orrery', content)).toBe(false);
    });
  });

  it('canActivateRelic is false for a relic not held at all', () => {
    const bare = run({ heldArtifactIds: [] });
    expect(canActivateRelic(bare, 'final_ledger', content)).toBe(false);
  });

  it('canActivateRelic is false for a non-active power', () => {
    const holder = run({ heldArtifactIds: ['cinder_testament'] });
    expect(canActivateRelic(holder, 'cinder_testament', content)).toBe(false);
  });
});
