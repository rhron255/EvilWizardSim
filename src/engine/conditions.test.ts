/**
 * `minArtifacts` (issue #21) is the frozen contract's newest `Condition`
 * member — gates lichdom's rite on holding a real collection, not merely one
 * relic. `holdsAnyArtifact` already covered the boolean case; this is its
 * counted sibling, same shape as `minFollowers`.
 */
import { describe, expect, it } from 'vitest';
import { conditionMet } from './conditions';
import { fixtureContent } from './__fixtures__/content';
import type { RunState } from '../types';

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
    eras: [],
    seenOfferIds: [],
  }) as RunState;

describe('minArtifacts', () => {
  it('fails below the threshold', () => {
    expect(conditionMet(run(['a']), { c: 'minArtifacts', v: 3 }, fixtureContent)).toBe(false);
  });

  it('passes at exactly the threshold', () => {
    expect(conditionMet(run(['a', 'b', 'c']), { c: 'minArtifacts', v: 3 }, fixtureContent)).toBe(
      true,
    );
  });

  it('passes above the threshold', () => {
    expect(
      conditionMet(run(['a', 'b', 'c', 'd']), { c: 'minArtifacts', v: 3 }, fixtureContent),
    ).toBe(true);
  });

  it('a threshold of zero is always met, same as an empty requires list', () => {
    expect(conditionMet(run([]), { c: 'minArtifacts', v: 0 }, fixtureContent)).toBe(true);
  });
});
