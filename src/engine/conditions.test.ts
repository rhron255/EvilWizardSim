/**
 * `minArtifacts` (issue #21) is the frozen contract's newest `Condition`
 * member — gates lichdom's rite on holding a real collection, not merely one
 * relic. `holdsAnyArtifact` already covered the boolean case; this is its
 * counted sibling, same shape as `minFollowers`.
 */
import { describe, expect, it } from 'vitest';
import { conditionMet, impliedGatesOf } from './conditions';
import { REAL_CONTENT } from './testContent';
import type { Effect, OfferOption, RunState } from '../types';

const run = (heldArtifactIds: string[]): RunState =>
  ({
    id: 'r',
    seed: 1,
    wizardName: 'W',
    epithet: 'the Tested',
    originId: 'o',
    age: 40,
    eraIndex: 5,
    eraCount: 16,
    phase: 'decline',
    prophecyEra: 5,
    erasSinceProphecy: 1,
    notoriety: 50,
    followers: 10,
    lairId: 'l',
    heldArtifactIds,
    knownArtifactIds: [],
    heroBandSeen: 0,
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
  }) as RunState;

describe('minArtifacts', () => {
  it('fails below the threshold', () => {
    expect(conditionMet(run(['a']), { c: 'minArtifacts', v: 3 }, REAL_CONTENT)).toBe(false);
  });

  it('passes at exactly the threshold', () => {
    expect(conditionMet(run(['a', 'b', 'c']), { c: 'minArtifacts', v: 3 }, REAL_CONTENT)).toBe(
      true,
    );
  });

  it('passes above the threshold', () => {
    expect(
      conditionMet(run(['a', 'b', 'c', 'd']), { c: 'minArtifacts', v: 3 }, REAL_CONTENT),
    ).toBe(true);
  });

  it('a threshold of zero is always met, same as an empty requires list', () => {
    expect(conditionMet(run([]), { c: 'minArtifacts', v: 0 }, REAL_CONTENT)).toBe(true);
  });
});

/**
 * `impliedGatesOf` — issue #41's replacement for the 13 hand-written
 * `requires` gates. Derives what a `certain: false` (i.e. an unaffordable
 * cost) an option's OWN effects imply, so the gate cannot drift from the
 * cost it describes (CLAUDE.md failure modes 3/4: never mirror a fact
 * across a seam).
 */
describe('impliedGatesOf', () => {
  const certain = (effects: Effect[]): OfferOption => ({
    kind: 'certain',
    label: 'test',
    effects,
  });

  const gamble = (onSuccess: Effect[], onFailure: Effect[]): OfferOption => ({
    kind: 'gamble',
    label: 'test',
    odds: 0.5,
    onSuccess,
    onFailure,
    successText: 's',
    failureText: 'f',
  });

  it('derives minFollowers from a followers cost paired with a benefit', () => {
    const option = certain([
      { t: 'followers', v: -30 },
      { t: 'artifact', artifactId: 'x' },
    ]);
    expect(impliedGatesOf(option)).toEqual([{ c: 'minFollowers', v: 30 }]);
  });

  it('derives minApprentices from an apprentices cost paired with a benefit', () => {
    const option = certain([
      { t: 'apprentices', v: -1 },
      { t: 'artifactFrom', factionId: 'ashen_covenant' },
    ]);
    expect(impliedGatesOf(option)).toEqual([{ c: 'minApprentices', v: 1 }]);
  });

  it('derives minLairTier from a lairTier loss paired with a benefit', () => {
    const option = certain([
      { t: 'lairTier', v: -1 },
      { t: 'standing', factionId: 'verdant_choir', v: 10 },
    ]);
    expect(impliedGatesOf(option)).toEqual([{ c: 'minLairTier', v: 1 }]);
  });

  it('derives minArtifacts from loseArtifact paired with a benefit, counting repeats', () => {
    const option = certain([
      { t: 'loseArtifact' },
      { t: 'loseArtifact' },
      { t: 'standing', factionId: 'gilded_hand', v: 15 },
    ]);
    expect(impliedGatesOf(option)).toEqual([{ c: 'minArtifacts', v: 2 }]);
  });

  it('sums same-stat costs within one branch', () => {
    const option = certain([
      { t: 'followers', v: -10 },
      { t: 'followers', v: -5 },
      { t: 'artifact', artifactId: 'x' },
    ]);
    expect(impliedGatesOf(option)).toEqual([{ c: 'minFollowers', v: 15 }]);
  });

  it('never implies a gate for a branch that grants nothing back — a pure penalty is a loss, not a purchase', () => {
    // A gamble's losing side, costing stock and standing, with nothing
    // granted in return. Greying this would reduce a broke player's agency,
    // the opposite of what the gate exists to protect.
    const option = gamble(
      [{ t: 'standing', factionId: 'crownlands', v: 10 }],
      [
        { t: 'followers', v: -20 },
        { t: 'standing', factionId: 'crownlands', v: -30 },
      ],
    );
    expect(impliedGatesOf(option)).toEqual([]);
  });

  it('a certain option with a cost and no benefit implies nothing', () => {
    const option = certain([{ t: 'followers', v: -10 }, { t: 'notoriety', v: 2 }]);
    expect(impliedGatesOf(option)).toEqual([]);
  });

  it('takes the MAX of each stat across a gamble’s two branches, not the sum', () => {
    // Success grants an artifact for 10 followers; failure grants nothing (a
    // penalty) for 20. Only the success branch implies a gate — the failure
    // branch is a pure penalty per the rule above — so the gate is 10, not
    // 20 and not 30.
    const option = gamble(
      [
        { t: 'followers', v: -10 },
        { t: 'artifact', artifactId: 'x' },
      ],
      [{ t: 'followers', v: -20 }],
    );
    expect(impliedGatesOf(option)).toEqual([{ c: 'minFollowers', v: 10 }]);
  });

  it('takes the MAX across two branches that both grant a benefit', () => {
    const option = gamble(
      [
        { t: 'followers', v: -10 },
        { t: 'artifact', artifactId: 'x' },
      ],
      [
        { t: 'followers', v: -25 },
        { t: 'artifact', artifactId: 'y' },
      ],
    );
    expect(impliedGatesOf(option)).toEqual([{ c: 'minFollowers', v: 25 }]);
  });

  it('an option with no stock-spending effects at all implies nothing', () => {
    const option = certain([
      { t: 'notoriety', v: -5 },
      { t: 'standing', factionId: 'pale_academy', v: -10 },
    ]);
    expect(impliedGatesOf(option)).toEqual([]);
  });
});
