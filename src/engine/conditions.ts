/**
 * `requires` evaluation — the gate on whether an offer may enter the pool.
 *
 * Pure, total, and exhaustive over the `Condition` union. An unknown condition
 * fails closed (the offer does not surface) rather than throwing, so a bad
 * content edit degrades the pool instead of killing the run.
 */

import type { Condition, Effect, OfferOption, RunState } from '../types';
import type { ContentBundle } from './content-port';
import { indexOf } from './content-port';

export function conditionMet(run: RunState, condition: Condition, content: ContentBundle): boolean {
  switch (condition.c) {
    case 'minNotoriety':
      return run.notoriety >= condition.v;
    case 'maxNotoriety':
      return run.notoriety <= condition.v;
    case 'minStanding':
      return (run.factionStanding[condition.factionId] ?? 0) >= condition.v;
    case 'maxStanding':
      return (run.factionStanding[condition.factionId] ?? 0) <= condition.v;
    case 'minApprentices':
      return run.apprentices.count >= condition.v;
    case 'minFollowers':
      return run.followers >= condition.v;
    case 'maxFollowers':
      return run.followers <= condition.v;
    case 'minPactDebt':
      return run.pactDebt >= condition.v;
    case 'minLairTier': {
      const index = indexOf(content);
      const rung = index.lairRung.get(run.lairId);
      const tier = rung === undefined ? 0 : (index.lairLadder[rung]?.tier ?? 0);
      return tier >= condition.v;
    }
    case 'minEraIndex':
      return run.eraIndex >= condition.v;
    case 'hasArtifact':
      return run.heldArtifactIds.includes(condition.artifactId);
    case 'holdsAnyArtifact':
      return run.heldArtifactIds.length > 0;
    case 'minArtifacts':
      return run.heldArtifactIds.length >= condition.v;
    case 'minGoodActs':
      return run.goodActs >= condition.v;
    case 'maxIllActs':
      return run.illActs <= condition.v;
    case 'declinePhase':
      return run.phase === 'decline';
    default: {
      // Exhaustive over every CONTENT-authored `Condition` this codebase
      // knows about — if this stops compiling, a variant was added to the
      // union above with no case here to answer it, which is exactly the
      // bug this line exists to catch at compile time rather than at the
      // Weather Leash's own `if` silently failing closed forever (issue #82
      // review: `declinePhase` was added to the type and to every renderer's
      // own switch, but not here, so it fired never). A genuinely malformed
      // value from untrusted JSON still cannot reach this line typed as
      // `Condition`, so the "fail closed" doc comment above is about a
      // shape TypeScript cannot see, not one this exhaustiveness check
      // would ever suppress.
      const exhaustive: never = condition;
      void exhaustive;
      return false;
    }
  }
}

export function conditionsMet(
  run: RunState,
  conditions: Condition[] | undefined,
  content: ContentBundle,
): boolean {
  if (!conditions || conditions.length === 0) return true;
  for (const condition of conditions) {
    if (!conditionMet(run, condition, content)) return false;
  }
  return true;
}

/**
 * True if a branch grants something back, as opposed to being a pure
 * penalty. `impliedGatesOf` below only gates a branch that clears this —
 * a bet's losing side, or an unconditional cost with nothing returned, is a
 * loss the player already accepted by picking the option, not a purchase
 * that can be shorted by a floor clamp. Greying a branch a broke player
 * cannot fully lose would reduce their agency, the opposite of the point.
 *
 * Deliberately excludes `notoriety` — its sign is genuinely ambiguous in
 * this game, so a notoriety move is never read as "a benefit" here.
 */
function grantsBenefit(effects: readonly Effect[]): boolean {
  return effects.some((e) => {
    switch (e.t) {
      case 'artifact':
      case 'artifactFrom':
        return true;
      case 'standing':
      case 'loyalty':
      case 'lairTier':
        return e.v > 0;
      case 'pactDebt':
      case 'heroThreat':
        return e.v < 0;
      default:
        return false;
    }
  });
}

/**
 * What an option's own effects imply the player must currently have, for its
 * cost not to be shorted by `applyEffects`' floor clamp (CLAUDE.md failure
 * mode 14: `applyEffects` floors followers/apprentices at zero and
 * `loseArtifact` no-ops on an empty vault, so a fixed benefit funded by one
 * of those pays out in full to a player who cannot pay).
 *
 * Restricted to the four STOCK balances that actually clamp — followers,
 * apprentices, a lairTier LOSS, and `loseArtifact` — never notoriety,
 * standing, pactDebt, heroThreat or loyalty, which have no floor to hide
 * behind and so are always real costs, partial or not. That is the same
 * distinction `scripts/validate-content.ts`'s pact-debt-relief check already
 * draws between a bypassed trade and an ordinary partial loss.
 *
 * A branch contributes to the gate only when `grantsBenefit` is true for it
 * — see that function's doc comment. For a `gamble`, each stat's implied
 * need is the MAX across `onSuccess` and `onFailure` separately: a player
 * must be able to cover the worse branch, since a bet is not an exit you can
 * take only if you win it.
 */
export function impliedGatesOf(option: OfferOption): Condition[] {
  const branches: (readonly Effect[])[] =
    option.kind === 'certain' ? [option.effects] : [option.onSuccess, option.onFailure];

  let minFollowers = 0;
  let minApprentices = 0;
  let minLairTier = 0;
  let minArtifacts = 0;

  for (const branch of branches) {
    if (!grantsBenefit(branch)) continue;

    let followers = 0;
    let apprentices = 0;
    let lairTier = 0;
    let artifacts = 0;
    for (const e of branch) {
      if (e.t === 'followers' && e.v < 0) followers += -e.v;
      else if (e.t === 'apprentices' && e.v < 0) apprentices += -e.v;
      else if (e.t === 'lairTier' && e.v < 0) lairTier += -e.v;
      else if (e.t === 'loseArtifact') artifacts += 1;
    }
    minFollowers = Math.max(minFollowers, followers);
    minApprentices = Math.max(minApprentices, apprentices);
    minLairTier = Math.max(minLairTier, lairTier);
    minArtifacts = Math.max(minArtifacts, artifacts);
  }

  const gates: Condition[] = [];
  if (minFollowers > 0) gates.push({ c: 'minFollowers', v: minFollowers });
  if (minApprentices > 0) gates.push({ c: 'minApprentices', v: minApprentices });
  if (minLairTier > 0) gates.push({ c: 'minLairTier', v: minLairTier });
  if (minArtifacts > 0) gates.push({ c: 'minArtifacts', v: minArtifacts });
  return gates;
}
