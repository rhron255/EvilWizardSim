/**
 * Terminal-state evaluation — wiki/01 § 7's seven endings and the two faction
 * sets built out of them.
 *
 * wiki/03 § Event Flow: "The ending check runs **after** every era, not only
 * at the age limit — hero threat and pact debt can terminate a run mid-arc."
 *
 * ORDER MATTERS and is deliberate:
 *
 *   1. `ascension`  — the top prize outranks the blade. A wizard who has the
 *      legendaries and the fame transcends before the chosen one lands the
 *      hit. Gated to the decline phase, because ending the run before the
 *      prophecy would amputate the arc the whole design rests on.
 *   2. `slain_by_chosen_one` — the default shape of a life that ran out.
 *   3. A FACTION REPRISAL — one of six, the Academy's gem among them.
 *   4. `betrayed_by_apprentice` — a full tower and an empty well of loyalty.
 *   5. `consumed_by_pact` — the debt comes due.
 *   6. Age limit → `arch_lich` if the wizard both took the rite and vowed;
 *      else `good_wizard` if the wizard vowed it (issue #23); else
 *      `lichdom` if the wizard already paid for it; else a FACTION LEADERSHIP
 *      if one faction stands both high and alone; else `retired_to_swamp`,
 *      which is the catch-all so no state is undefined. A crown — and the
 *      Good Wizard vow — is not a way to die, so this set is reachable here
 *      and nowhere earlier — see `leadershipEnding`.
 *
 * Nothing here reads as "you lost" (wiki/06 principle 8). The engine decides
 * WHICH biography; content decides how it reads.
 */

import type { EndingId, FactionId, RunState } from '../types';
import type { ContentBundle } from './content-port';
import { indexOf } from './content-port';
import {
  ASCENSION_LEGENDARIES,
  ASCENSION_MIN_NOTORIETY,
  BETRAYAL_MAX_LOYALTY,
  BETRAYAL_MIN_APPRENTICES,
  DEVOTION_STANDING,
  PACT_LIMIT,
  PATRON_MARGIN,
  SEAL_FACTION,
  SEAL_MAX_STANDING,
  SEAL_MIN_NOTORIETY,
} from './constants';
import { defenseOf } from './systems';

/**
 * The canonical faction order — the tie-break, and nothing else.
 *
 * It is NOT the content's order: `ContentBundle.factions` is a content pack's
 * to arrange, and a run's outcome may not depend on how a pack happens to sort
 * its cast. Written here so the engine and the header's warning
 * (`src/components/run/allegiances.ts`, which imports it) resolve a tie the
 * same way — a warning pointing at one faction while another fires is the same
 * class of bug as no warning at all.
 */
export const FACTION_ORDER: FactionId[] = [
  'ashen_covenant',
  'gilded_hand',
  'pale_academy',
  'verdant_choir',
  'crownlands',
  'worm_below',
];

/**
 * What each faction does about you, once you are far enough under it.
 *
 * The Academy's gem was the only one of these for the whole of the build,
 * which made faction standing a system with one lethal end and five decorative
 * ones. Each entry is the same condition — standing at or under
 * `SEAL_MAX_STANDING`, notoriety at or over `SEAL_MIN_NOTORIETY` — read
 * against a different faction.
 */
export const REPRISAL_BY_FACTION: Record<FactionId, EndingId> = {
  ashen_covenant: 'eternally_repurposed',
  gilded_hand: 'liquidated',
  pale_academy: 'sealed_in_gem',
  verdant_choir: 'turned_to_fertilizer',
  crownlands: 'exiled_and_overrun',
  worm_below: 'consumed',
};

/**
 * What each faction makes of you, once you have spent a career at the top of
 * its standing and lived to the age limit.
 *
 * The exact mirror of `REPRISAL_BY_FACTION`: same six factions, same system,
 * read from the other end. Standing could end a run six ways and reward it
 * none, so a wizard who committed to one faction for sixteen eras retired to
 * the same swamp as one who committed to nothing.
 *
 * Five ids, six factions. The Worm Below's leadership ending is `lichdom`,
 * which already exists and is already EARNED — by the rite, a card the player
 * accepted, not by a standing total. Giving the Worm a second crown would mean
 * two ways to be its favourite, and the wrong one would win at the age limit
 * (see `checkEndings`, where the lich branch stays first).
 */
export const LEADERSHIP_BY_FACTION: Record<FactionId, EndingId> = {
  ashen_covenant: 'contract_writer',
  gilded_hand: 'grand_arbiter',
  pale_academy: 'archmage',
  verdant_choir: 'archdruid',
  crownlands: 'overthrown_the_kingdom',
  worm_below: 'lichdom',
};

/**
 * The faction whose crown is NOT a standing total.
 *
 * The Worm Below's leadership ending is `lichdom`, and lichdom is bought with
 * the rite — a card the player accepted, at the price the rite charges. Named
 * once, here, so that the two places which have to know it read it from the
 * same line instead of each carrying a copy.
 */
const RITE_EARNED_CROWN: FactionId = 'worm_below';

/**
 * `LEADERSHIP_BY_FACTION` minus the crown a standing total cannot hand out.
 *
 * Two callers need exactly this set and neither may derive it separately.
 * `leadershipEnding` reads it because `patronFaction` sees standing alone, so
 * a wizard who courted the Worm without ever taking the rite would otherwise
 * be crowned Lich for a transformation that never happened. And
 * `src/components/meta/attribution.ts` inverts it for the ending card's
 * caption, because `lichdom` is self-determined — "At the head of The Worm
 * Below" is the wrong label for a wizard who did it alone in a room, and a
 * map built from `LEADERSHIP_BY_FACTION` wholesale carries `lichdom` into the
 * leadership set where it does not belong (it is benign only while every
 * caller checks `attributionFor` first, which is not a property the compiler
 * holds).
 */
export const STANDING_LEADERSHIP: ReadonlyMap<FactionId, EndingId> = new Map(
  (Object.entries(LEADERSHIP_BY_FACTION) as [FactionId, EndingId][]).filter(
    ([factionId]) => factionId !== RITE_EARNED_CROWN,
  ),
);

/**
 * Whether a faction's reprisal is live at all in this phase.
 *
 * The Academy's is available in any phase, exactly as the seal always was. The
 * five added with it are held back until the PROPHECY ERA HAS BEEN PLAYED:
 * an ascent-phase dip under −55 would otherwise end a career three eras in,
 * before the prophecy the whole arc is built around, and the ascent is where
 * contagion does its steepest work.
 *
 * `erasSinceProphecy >= 1`, NOT `phase === 'decline'`, and the difference is a
 * whole era wide. `resolveChoice` advances `phase` before it calls
 * `checkEndings`, so the resolution that carries a wizard across `prophecyEra`
 * arrives here already reading 'decline' — while `useGame` has not yet had a
 * chance to raise the prophecy interstitial and `nextOffer` has not yet pinned
 * the prophecy card. A faction sitting under the line at that moment ended the
 * run in the gap: the central beat of the arc never played, and the header had
 * been suppressing the warning right up to it because the state was still in
 * ascent. `erasSinceProphecy` only reaches 1 once the prophecy era itself has
 * been resolved, which is the state this predicate actually means.
 *
 * Exported because the header's warning has to agree with it — a "lethal" bar
 * for a condition that structurally cannot fire yet is a false alarm, and this
 * is the one predicate that decides.
 */
export function reprisalLiveFor(factionId: FactionId, run: RunState): boolean {
  return factionId === SEAL_FACTION || run.erasSinceProphecy >= 1;
}

/**
 * Which faction is closest to acting, live or not — LOWEST STANDING WINS, ties
 * broken by `FACTION_ORDER`.
 *
 * Two factions sit under the threshold at once more often than the arithmetic
 * suggests, because standing moves by contagion: courting the Covenant drives
 * the Academy and the Crownlands down together. Iterating a `Record` and
 * taking the first match would be a seed-dependent nondeterminism bug that no
 * single playthrough would show, so the rule is stated, tested, and shared
 * with the UI rather than left to object key order.
 *
 * `only` narrows the scan to factions whose reprisal is live in this phase;
 * the header passes `false` for the bar tone, which wants the nearest threat
 * whether or not it can fire yet.
 */
export function nearestReprisalFaction(
  run: RunState,
  only: 'live' | 'any' = 'live',
): FactionId | undefined {
  let candidate: FactionId | undefined;
  let candidateStanding = Infinity;
  for (const factionId of FACTION_ORDER) {
    if (only === 'live' && !reprisalLiveFor(factionId, run)) continue;
    const standing = run.factionStanding[factionId] ?? 0;
    if (standing < candidateStanding) {
      candidate = factionId;
      candidateStanding = standing;
    }
  }
  return candidate;
}

/**
 * The reprisal that fires this era, if any.
 *
 * Both halves of the trigger are `constants.ts`'s and unchanged from the seal
 * they generalise — this made the mechanic symmetric across six factions, and
 * deliberately did not retune it at the same time.
 */
export function reprisalEnding(run: RunState, content: ContentBundle): EndingId | undefined {
  if (run.notoriety < SEAL_MIN_NOTORIETY) return undefined;
  const faction = nearestReprisalFaction(run, 'live');
  if (faction === undefined) return undefined;
  if ((run.factionStanding[faction] ?? 0) > SEAL_MAX_STANDING) return undefined;
  const ending = REPRISAL_BY_FACTION[faction];
  // The bundle has the last word, for the reason spelled out at length in
  // `leadershipEnding` below: the engine takes a `ContentBundle` and must
  // never hand back an id that bundle does not define, because the ending
  // screen looks the id up for a name, a narration and a glyph and an id with
  // no entry is a blank card at the moment the run pays off
  // (`App.tsx`'s `endings.find(...)` then `if (!run || !ending) break`).
  //
  // Live here, not hypothetical: a pack that ships the Academy's gem and none
  // of the five added with it is a legitimate pack, and its wizards should
  // carry on rather than fall off the end. Falling through to `undefined`
  // returns them to the rest of `checkEndings`, exactly as
  // `leadershipEnding` returns its wizards to `retired_to_swamp`.
  return indexOf(content).endingById.has(ending) ? ending : undefined;
}

/**
 * The faction that would crown this wizard — HIGHEST STANDING WINS, ties broken
 * by `FACTION_ORDER`, and `undefined` unless it is far enough ahead to mean it.
 *
 * The determinism argument is `nearestReprisalFaction`'s, unchanged: contagion
 * moves standing in pairs, so equal totals are common rather than exotic, and
 * "whichever faction the `Record` happens to list first" is a seed-dependent
 * outcome that no single playthrough would reveal. The candidate is therefore
 * replaced only on STRICTLY GREATER standing while walking `FACTION_ORDER`,
 * which makes the tie-break a stated rule the UI can import instead of a
 * property of object key order.
 *
 * Two conditions, and they say different things. `DEVOTION_STANDING` is the
 * absolute bar — the same threshold that opens a faction's reliquary, so
 * leadership is not a new number the player has to learn. `PATRON_MARGIN` is
 * the exclusivity bar, and it is the one doing the work: devotion to three
 * factions at once is reachable by trading favours widely, and a crown handed
 * to a wizard who never chose would say nothing about the career. Read its
 * comment in `constants.ts` before moving it — it is also the only thing
 * keeping `retired_to_swamp` from becoming a residue.
 *
 * Kept separate from the reprisal scan rather than shared with it. A single
 * parameterised walk would need a direction, a phase filter used by one caller
 * only, and a runner-up slot meaningless to the other — three arguments of
 * conditional behaviour to save nine lines, and the reprisal path is the one
 * that would get harder to read.
 *
 * Exported as part of the engine's public surface (`src/engine/index.ts`) and
 * for the tests that pin the tie-break. It is NOT what the ending card's
 * patron line calls: `standingPassageFor`
 * (`src/components/meta/standing.ts`) walks the run's own cast and applies
 * `DEVOTION_STANDING` with no `PATRON_MARGIN`, and that is deliberate — it
 * reports the BOND (the faction you courted hardest, at devotion) where this
 * reports the CROWN (the faction far enough ahead that the career was about
 * it). A wizard devoted to two factions has a patron to name and no crown to
 * award, and the card should still say who remembers them.
 *
 * So the tie-break rule genuinely is duplicated between the two, and stating
 * that plainly is the point of this paragraph — an earlier version of it
 * asserted a shared implementation that does not exist, which is exactly the
 * seam CLAUDE.md failure mode 3 is about. They agree on any run that reaches a
 * crown, because a strict maximum ≥ `PATRON_MARGIN` ahead is the maximum under
 * either walk, so the divergence is latent rather than live. Anything that
 * changes THIS function's ordering has to be carried across by hand, or the
 * card names one faction while the engine crowns another.
 */
export function patronFaction(run: RunState): FactionId | undefined {
  let candidate: FactionId | undefined;
  let best = -Infinity;
  let runnerUp = -Infinity;
  for (const factionId of FACTION_ORDER) {
    const standing = run.factionStanding[factionId] ?? 0;
    if (standing > best) {
      runnerUp = best;
      candidate = factionId;
      best = standing;
    } else if (standing > runnerUp) {
      runnerUp = standing;
    }
  }
  if (candidate === undefined) return undefined;
  if (best < DEVOTION_STANDING) return undefined;
  if (best - runnerUp < PATRON_MARGIN) return undefined;
  return candidate;
}

/**
 * The leadership a career has earned, if any — consulted at the AGE LIMIT only.
 *
 * `reprisalEnding`'s mirror, and deliberately not its equal in reach: a
 * reprisal is something a faction does TO you and can cut a run short, while a
 * crown is what is left to say about a life that ran its full length. Calling
 * this from anywhere earlier would end careers at their high point, which is
 * the same amputation of the arc that keeps `ascension` out of the ascent.
 */
export function leadershipEnding(run: RunState, content: ContentBundle): EndingId | undefined {
  const patron = patronFaction(run);
  if (patron === undefined) return undefined;
  // The Worm Below has no standing-only crown. `checkEndings` already routes a
  // rite-taker to `lichdom` via `run.isLich`, BEFORE this function is ever
  // called (issue #21) — that branch is what the comment on
  // `LEADERSHIP_BY_FACTION` means by "the lich branch stays first". But
  // `patronFaction` reads standing alone, so a wizard who merely devoted to
  // the Worm without ever taking the rite reaches this line with
  // `patron === 'worm_below'` and `run.isLich === false`, and mapping that
  // through `LEADERSHIP_BY_FACTION` would crown them Lich for a transformation
  // that never happened. `STANDING_LEADERSHIP` is that map with the Worm's
  // entry already removed, so the miss below is the whole guard — narrating forfeited relics and frozen decay on a
  // career that kept both. Falling through to `retired_to_swamp` for that
  // wizard is correct: their crown was never a standing total to begin with
  // (`content/standing.ts`'s `PATRON_BY_ENDING` comment on `lichdom` says the
  // same thing from the flavor-text side).
  const ending = STANDING_LEADERSHIP.get(patron);
  if (ending === undefined) return undefined;

  /*
   * The bundle has the last word on whether this ending exists.
   *
   * The engine takes a `ContentBundle` and must never hand back an id that
   * bundle does not define — the ending screen looks the id up to get a name,
   * a narration and a glyph, and an id with no entry is a blank card at the
   * one moment the whole run is paying off. Two live reasons, not one
   * hypothetical:
   *
   *   1. A content pack is a different argument, not a different engine. One
   *      that ships no leadership endings is a legitimate pack, and its
   *      wizards should retire to the swamp rather than crash.
   *   2. THIS repo, right now. The five leadership ids are in the frozen
   *      contract and their prose is not written yet, so without this guard
   *      the very next full playthrough would end on an ending that does not
   *      exist. `checkEndings` falls through to `retired_to_swamp`, which is
   *      exactly what a career with nothing else to say about it should get.
   *
   * When the prose lands this line stops doing anything, and it should stay:
   * it is what makes the branch safe for any bundle rather than for ours.
   */
  return indexOf(content).endingById.has(ending) ? ending : undefined;
}

export function legendariesHeld(run: RunState, content: ContentBundle): number {
  const index = indexOf(content);
  let n = 0;
  for (const id of run.heldArtifactIds) {
    if (index.artifactById.get(id)?.rarity === 'legendary') n++;
  }
  return n;
}

export function ascensionReady(run: RunState, content: ContentBundle): boolean {
  if (run.isLich) return false;
  if (run.phase !== 'decline') return false;
  if (run.notoriety < ASCENSION_MIN_NOTORIETY) return false;
  return legendariesHeld(run, content) >= ASCENSION_LEGENDARIES;
}

/**
 * Evaluate every terminal condition against a run that has just finished an
 * era and advanced. Returns `undefined` when the biography continues.
 */
export function checkEndings(run: RunState, content: ContentBundle): EndingId | undefined {
  if (run.ending) return run.ending;

  if (ascensionReady(run, content)) return 'ascension';

  if (run.heroThreat > defenseOf(run, content)) return 'slain_by_chosen_one';

  const reprisal = reprisalEnding(run, content);
  if (reprisal) return reprisal;

  if (
    run.apprentices.count >= BETRAYAL_MIN_APPRENTICES &&
    run.apprentices.loyalty <= BETRAYAL_MAX_LOYALTY
  ) {
    return 'betrayed_by_apprentice';
  }

  if (run.pactDebt >= PACT_LIMIT) return 'consumed_by_pact';

  if (run.eraIndex >= run.eraCount) {
    // `good_wizard` stays FIRST of the age-limit checks (issue #23). It is
    // earned the same way lichdom is below it — by a card the player
    // accepted (`vowGoodWizard`), not by a standing total — and it is the
    // only one of the four age-limit outcomes that was chosen this
    // deliberately, across a whole career, rather than arrived at by the
    // accumulated shape of a run. Letting the lich check or the standing
    // comparison run first would let a wizard who vowed the Good Wizard
    // resolution be overridden by a state they no longer control the
    // meaning of.
    //
    // A lich who ALSO vowed takes the combined route (`arch_lich`), not
    // either half. Both flags are bought — one with the rite's forfeiture of
    // every relic and follower, one with the vow — and before this branch
    // existed `good_wizard` simply won and the paid-for lichdom vanished with
    // nothing on any card to say it would. That is the undisclosed
    // consequence rule 1 bans, arriving one card late. Neither flag is
    // discarded now, so both disclosures stay true: `LICH_LINE`'s "a lich,
    // not the end" and the vow's "the run continues" describe exactly what
    // happened.
    if (run.goodWizardVowed) return run.isLich ? 'arch_lich' : 'good_wizard';
    // The lich branch stays SECOND and otherwise untouched. `lichdom` is the
    // Worm Below's leadership ending, and it was already earned — by the
    // rite the player accepted, at the price the rite charges. Letting the
    // standing comparison below run first would let a Covenant devotee who
    // took the rite die a Pact Master, second-guessing a decision the game
    // already resolved.
    if (run.isLich) return 'lichdom';
    return leadershipEnding(run, content) ?? 'retired_to_swamp';
  }

  return undefined;
}
