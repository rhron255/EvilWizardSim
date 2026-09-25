/**
 * `minArtifacts` (issue #21) is the frozen contract's newest `Condition`
 * member — gates lichdom's rite on holding a real collection, not merely one
 * relic. `holdsAnyArtifact` already covered the boolean case; this is its
 * counted sibling, same shape as `minFollowers`.
 */
import { describe, expect, it } from 'vitest';
import { conditionMet, impliedGatesOf } from './conditions';
import { REAL_CONTENT } from '../testing/realContent';
import type { Effect, OfferOption, RunState } from '../types';

const run = (heldArtifactIds: string[]): RunState =>
  ({
    id: 'r',
    seed: 1,
    wizardName: 'W',
    epithet: 'the Tested',
    originId: REAL_CONTENT.origins[0].id,
    age: 40,
    eraIndex: 5,
    eraCount: 16,
    phase: 'decline',
    prophecyEra: 5,
    erasSinceProphecy: 1,
    notoriety: 50,
    followers: 10,
    lairId: REAL_CONTENT.lairs[0].id,
    heldArtifactIds,
    startingArtifactIds: [],
    activeGrantedArtifactIds: [],
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
    relicState: { firedOnce: [], spent: [], foresight: false },
    eras: [],
    seenOfferIds: [],
  }) as RunState;

/** The first `n` real relic ids. */
const relics = (n: number) => REAL_CONTENT.artifacts.slice(0, n).map((a) => a.id);

describe('minArtifacts', () => {
  it('fails below the threshold', () => {
    expect(conditionMet(run(relics(1)), { c: 'minArtifacts', v: 3 }, REAL_CONTENT)).toBe(false);
  });

  it('passes at exactly the threshold', () => {
    expect(conditionMet(run(relics(3)), { c: 'minArtifacts', v: 3 }, REAL_CONTENT)).toBe(
      true,
    );
  });

  it('passes above the threshold', () => {
    expect(
      conditionMet(run(relics(4)), { c: 'minArtifacts', v: 3 }, REAL_CONTENT),
    ).toBe(true);
  });

  it('a threshold of zero is always met, same as an empty requires list', () => {
    expect(conditionMet(run([]), { c: 'minArtifacts', v: 0 }, REAL_CONTENT)).toBe(true);
  });
});

/**
 * `maxFollowers` (issue #80) — the mirror of `minFollowers`, added for a
 * relic's `if` (Unpaid Purse's "if under 10 Followers"). No offer has ever
 * needed "under a stock level" before; a relic trigger does.
 */
describe('maxFollowers', () => {
  it('passes below the threshold', () => {
    expect(conditionMet({ ...run([]), followers: 5 }, { c: 'maxFollowers', v: 9 }, REAL_CONTENT)).toBe(
      true,
    );
  });

  it('passes AT the threshold — "at or under", the same reading minFollowers gives the other direction', () => {
    expect(conditionMet({ ...run([]), followers: 9 }, { c: 'maxFollowers', v: 9 }, REAL_CONTENT)).toBe(
      true,
    );
  });

  it('fails above the threshold', () => {
    expect(conditionMet({ ...run([]), followers: 10 }, { c: 'maxFollowers', v: 9 }, REAL_CONTENT)).toBe(
      false,
    );
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
  const STOCK = ['followers', 'apprentices', 'lairTier'] as const;
  /** A stock cost: followers/apprentices/lair spent, or a relic given up. */
  const isCost = (e: Effect) =>
    e.t === 'loseArtifact' || ((STOCK as readonly string[]).includes(e.t) && 'v' in e && e.v < 0);
  /** `grantsBenefit`'s documented rule, restated so inputs can be chosen by it. */
  const isBenefit = (e: Effect) =>
    e.t === 'artifact' ||
    e.t === 'artifactFrom' ||
    ((e.t === 'standing' || e.t === 'loyalty' || e.t === 'lairTier') && e.v > 0) ||
    ((e.t === 'pactDebt' || e.t === 'heroThreat') && e.v < 0);
  const followerCost = (effects: readonly Effect[]) =>
    -effects.reduce((sum, e) => (e.t === 'followers' && e.v < 0 ? sum + e.v : sum), 0);
  const onlyCost = (effects: readonly Effect[], t: Effect['t']) =>
    effects.filter(isCost).every((e) => e.t === t);

  /** The first real catalog option matching `pred`. */
  function realOption(what: string, pred: (o: OfferOption) => boolean): OfferOption {
    for (const offer of REAL_CONTENT.offers) {
      const option = offer.options.find(pred);
      if (option) return option;
    }
    throw new Error(`no real offer has ${what}`);
  }
  type Gamble = Extract<OfferOption, { kind: 'gamble' }>;

  it('derives minFollowers from a followers cost paired with a benefit', () => {
    const option = realOption(
      'a certain relic bought with followers alone',
      (o) =>
        o.kind === 'certain' &&
        o.effects.some((e) => e.t === 'artifactFrom' || e.t === 'artifact') &&
        followerCost(o.effects) > 0 &&
        onlyCost(o.effects, 'followers'),
    );
    if (option.kind !== 'certain') throw new Error('unreachable');
    expect(impliedGatesOf(option)).toEqual([{ c: 'minFollowers', v: followerCost(option.effects) }]);
  });

  it('derives minApprentices from an apprentices cost paired with a benefit', () => {
    const option = realOption(
      'a certain benefit paid for with apprentices alone',
      (o) =>
        o.kind === 'certain' &&
        o.effects.some(isBenefit) &&
        o.effects.some((e) => e.t === 'apprentices' && e.v < 0) &&
        onlyCost(o.effects, 'apprentices'),
    );
    if (option.kind !== 'certain') throw new Error('unreachable');
    const spent = -option.effects.reduce((s, e) => (e.t === 'apprentices' && e.v < 0 ? s + e.v : s), 0);
    expect(impliedGatesOf(option)).toEqual([{ c: 'minApprentices', v: spent }]);
  });

  it('derives minLairTier from a lairTier loss paired with a benefit', () => {
    const option = realOption(
      'a certain benefit paid for with a lair rung alone',
      (o) =>
        o.kind === 'certain' &&
        o.effects.some(isBenefit) &&
        o.effects.some((e) => e.t === 'lairTier' && e.v < 0) &&
        onlyCost(o.effects, 'lairTier'),
    );
    if (option.kind !== 'certain') throw new Error('unreachable');
    const lost = -option.effects.reduce((s, e) => (e.t === 'lairTier' && e.v < 0 ? s + e.v : s), 0);
    expect(impliedGatesOf(option)).toEqual([{ c: 'minLairTier', v: lost }]);
  });

  it('derives minArtifacts from loseArtifact paired with a benefit, counting repeats', () => {
    const option = realOption(
      'a certain benefit paid for with two or more relics',
      (o) =>
        o.kind === 'certain' &&
        o.effects.some(isBenefit) &&
        o.effects.filter((e) => e.t === 'loseArtifact').length >= 2,
    );
    if (option.kind !== 'certain') throw new Error('unreachable');
    const relics = option.effects.filter((e) => e.t === 'loseArtifact').length;
    const gates = impliedGatesOf(option);
    expect(gates).toContainEqual({ c: 'minArtifacts', v: relics });
    expect(gates.filter((g) => g.c === 'minArtifacts')).toHaveLength(1);
  });

  it('sums same-stat costs within one branch', () => {
    // Hand-built: no real option lists two follower costs in one branch, so
    // only a constructed input reaches the summing path.
    const relic = REAL_CONTENT.artifacts[0].id;
    const option: OfferOption = {
      kind: 'certain',
      label: 'Pay twice',
      effects: [
        { t: 'followers', v: -10 },
        { t: 'followers', v: -5 },
        { t: 'artifact', artifactId: relic },
      ],
    };
    expect(impliedGatesOf(option)).toEqual([{ c: 'minFollowers', v: 15 }]);
  });

  it('never implies a gate for a branch that grants nothing back — a pure penalty is a loss, not a purchase', () => {
    // A gamble's losing side, costing stock with nothing granted in return.
    // Greying this would reduce a broke player's agency, the opposite of
    // what the gate exists to protect.
    const option = realOption(
      'a gamble that only costs stock when it is lost, and returns nothing then',
      (o) =>
        o.kind === 'gamble' &&
        !o.onSuccess.some(isCost) &&
        followerCost(o.onFailure) > 0 &&
        !o.onFailure.some(isBenefit),
    );
    expect(impliedGatesOf(option)).toEqual([]);
  });

  it('a certain option with a cost and no benefit implies nothing — a notoriety gain is not a purchase', () => {
    const option = realOption(
      'a certain follower cost whose only upside is notoriety',
      (o) =>
        o.kind === 'certain' &&
        followerCost(o.effects) > 0 &&
        o.effects.some((e) => e.t === 'notoriety' && e.v > 0) &&
        !o.effects.some(isBenefit),
    );
    expect(impliedGatesOf(option)).toEqual([]);
  });

  it('takes the MAX of each stat across a gamble’s two branches, not the sum', () => {
    // The winning branch buys something with followers; the losing branch
    // costs MORE followers and returns nothing, so it is a pure penalty and
    // implies no gate. The gate is the winning branch's price alone — not the
    // losing branch's larger one, and not the two added together.
    const option = realOption(
      'a gamble whose win buys a benefit with followers and whose loss costs more for nothing',
      (o) =>
        o.kind === 'gamble' &&
        o.onSuccess.some(isBenefit) &&
        onlyCost(o.onSuccess, 'followers') &&
        followerCost(o.onSuccess) > 0 &&
        !o.onFailure.some(isBenefit) &&
        onlyCost(o.onFailure, 'followers') &&
        followerCost(o.onFailure) > followerCost(o.onSuccess),
    ) as Gamble;
    expect(impliedGatesOf(option)).toEqual([{ c: 'minFollowers', v: followerCost(option.onSuccess) }]);
  });

  it('takes the MAX across two branches that both grant a benefit', () => {
    const option = realOption(
      'a gamble whose two branches both buy a benefit, at different follower prices',
      (o) =>
        o.kind === 'gamble' &&
        o.onSuccess.some(isBenefit) &&
        o.onFailure.some(isBenefit) &&
        onlyCost(o.onSuccess, 'followers') &&
        onlyCost(o.onFailure, 'followers') &&
        followerCost(o.onSuccess) > 0 &&
        followerCost(o.onFailure) > 0 &&
        followerCost(o.onSuccess) !== followerCost(o.onFailure),
    ) as Gamble;
    const higher = Math.max(followerCost(option.onSuccess), followerCost(option.onFailure));
    expect(impliedGatesOf(option)).toEqual([{ c: 'minFollowers', v: higher }]);
  });

  it('an option with no stock-spending effects at all implies nothing', () => {
    const option = realOption(
      'a certain option with a downside but no stock cost',
      (o) => o.kind === 'certain' && !o.effects.some(isCost) && o.effects.some((e) => 'v' in e && e.v < 0),
    );
    expect(impliedGatesOf(option)).toEqual([]);
  });
});
