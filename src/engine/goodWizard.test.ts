/**
 * The Good Wizard route's rule-1 exception (issue #23) — enforced, not just
 * asserted.
 *
 * `goodActs`/`illActs` are the one deliberate hole in "an effect exists so
 * nothing is ever smuggled into prose undisclosed" (see the doc comment on
 * `Effect` in `types.ts`), defensible on exactly one ground: the route can
 * only ever ADD an ending, never end a run early, never close a door, never
 * move any other threshold. These tests are what pays for that claim — if a
 * future change wires either counter into a defense term, a weighting, or
 * any condition besides `minGoodActs`/`maxIllActs`, the sweep below goes red.
 */

import { describe, expect, it } from 'vitest';
import { checkEndings, createRun, decayFor, defenseOf, threatGainFor } from './index';
import type { ContentBundle } from './index';
import { applyEffects, draftOf, projectEffects } from './effects';
import { conditionMet } from './conditions';
import { fixtureContent } from './__fixtures__/content';
import type { Condition, Offer, RunState } from '../types';

const content: ContentBundle = fixtureContent;

const start = (over: Partial<RunState> = {}): RunState => ({
  ...createRun({ wizardName: 'Test', originId: content.origins[0].id, eraCount: 16, seed: 7 }, content),
  ...over,
});

describe('the rule-1 exception: nothing but good_wizard reads the counters', () => {
  it('does not move defenseOf, threatGainFor, or decayFor', () => {
    const base = start({ phase: 'decline', erasSinceProphecy: 3, notoriety: 40, heroThreat: 20 });
    const baseline = {
      defense: defenseOf(base, content),
      threat: threatGainFor(base),
      decay: decayFor(base),
    };
    for (const goodActs of [0, 1, 4, 8, 50]) {
      for (const illActs of [0, 1, 3, 20]) {
        const run = { ...base, goodActs, illActs };
        expect(defenseOf(run, content)).toBe(baseline.defense);
        expect(threatGainFor(run)).toBe(baseline.threat);
        expect(decayFor(run)).toBe(baseline.decay);
      }
    }
  });

  it('does not change checkEndings for any branch except the age-limit good_wizard check', () => {
    // One representative run per earlier branch in checkEndings' priority
    // order — ascension, slain, reprisal, betrayal, pact — each replayed at a
    // spread of goodActs/illActs. If either counter ever moved one of these,
    // the branch it moved would flip here.
    const cases: Partial<RunState>[] = [
      { phase: 'decline', heroThreat: 999, notoriety: 50 }, // slain
      {
        phase: 'decline',
        notoriety: 60,
        factionStanding: { ...start().factionStanding, pale_academy: -60 },
      }, // reprisal
      { phase: 'decline', apprentices: { count: 3, loyalty: 0 } }, // betrayed
      { phase: 'decline', pactDebt: 7 }, // consumed by pact
      { phase: 'decline', eraIndex: 16, eraCount: 16 }, // age limit, no vow
    ];

    for (const over of cases) {
      const base = start(over);
      const baseline = checkEndings(base, content);
      for (const goodActs of [0, 4, 8, 50]) {
        for (const illActs of [0, 1, 20]) {
          const run = { ...base, goodActs, illActs };
          expect(checkEndings(run, content)).toBe(baseline);
        }
      }
    }
  });

  it('is checked FIRST at the age limit, ahead of lichdom', () => {
    const run = start({ phase: 'decline', eraIndex: 16, eraCount: 16, isLich: true, goodWizardVowed: true });
    expect(checkEndings(run, content)).toBe('good_wizard');
  });

  it('falls through to lichdom when the vow was never taken', () => {
    const run = start({ phase: 'decline', eraIndex: 16, eraCount: 16, isLich: true, goodWizardVowed: false });
    expect(checkEndings(run, content)).toBe('lichdom');
  });

  it('conditionMet reads goodActs/illActs ONLY for minGoodActs/maxIllActs', () => {
    const run = start({ goodActs: 5, illActs: 2, notoriety: 10, followers: 3, pactDebt: 1 });
    const unrelated: Condition[] = [
      { c: 'minNotoriety', v: 5 },
      { c: 'maxNotoriety', v: 50 },
      { c: 'minFollowers', v: 1 },
      { c: 'minPactDebt', v: 1 },
      { c: 'minEraIndex', v: 0 },
      { c: 'holdsAnyArtifact' },
      { c: 'minArtifacts', v: 0 },
    ];
    const baseline = unrelated.map((c) => conditionMet(run, c, content));
    for (const goodActs of [0, 4, 8, 50]) {
      for (const illActs of [0, 1, 20]) {
        const swept = { ...run, goodActs, illActs };
        const after = unrelated.map((c) => conditionMet(swept, c, content));
        expect(after).toEqual(baseline);
      }
    }
    // The two conditions that DO read them, reading them correctly.
    expect(conditionMet(run, { c: 'minGoodActs', v: 5 }, content)).toBe(true);
    expect(conditionMet(run, { c: 'minGoodActs', v: 6 }, content)).toBe(false);
    expect(conditionMet(run, { c: 'maxIllActs', v: 2 }, content)).toBe(true);
    expect(conditionMet(run, { c: 'maxIllActs', v: 1 }, content)).toBe(false);
  });
});

describe('the rule-1 exception: nothing on screen ever sees the counters', () => {
  const goodActOffer: Offer = {
    id: 'test_virtue_offer',
    title: 'Test',
    body: 'Test.',
    phase: 'any',
    options: [
      {
        kind: 'certain',
        label: 'Do the constructive thing',
        effects: [
          { t: 'goodAct', v: 1 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Do the harmful thing',
        effects: [
          { t: 'illAct', v: 1 },
          { t: 'notoriety', v: 2 },
        ],
      },
    ],
  };

  it('applyEffects never pushes goodAct/illAct to the applied ledger', () => {
    const run = start();
    const draft = draftOf(run);
    const application = applyEffects(
      draft,
      goodActOffer.options[0].kind === 'certain' ? goodActOffer.options[0].effects : [],
      () => 0.5,
      content,
    );
    expect(draft.goodActs).toBe(1);
    expect(application.applied.some((e) => e.t === 'goodAct')).toBe(false);
    // The other effect on the same card is unaffected — this is a silence on
    // the ONE variant, not a silence on the whole option.
    expect(application.applied.some((e) => e.t === 'notoriety')).toBe(true);
  });

  it('projectEffects drops goodAct/illAct entirely rather than passing them through raw', () => {
    const run = start();
    const projected = projectEffects(
      run,
      goodActOffer.options[0].kind === 'certain' ? goodActOffer.options[0].effects : [],
      content,
    );
    expect(projected.some((e) => e.t === 'goodAct')).toBe(false);
    expect(projected.some((e) => e.t === 'notoriety')).toBe(true);
  });
});
