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
 *   6. Age limit → `arch_lich` if the wizard is BOTH a lich and vowed
 *      (issue #25) — the true answer for that career, not a tiebreak; else
 *      `good_wizard` if the wizard vowed it (issue #23); else `lichdom` if the
 *      wizard already paid for it; else a FACTION LEADERSHIP if one faction
 *      stands both high and alone; else `retired_to_swamp`, which is the
 *      catch-all so no state is undefined. A crown — and the Good Wizard vow
 *      — is not a way to die, so this set is reachable here and nowhere
 *      earlier — see `leadershipEnding`.
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
 * Whether a faction's reprisal is live at all, in this era.
 *
 * The Academy's is available in any phase, exactly as the seal always was. The
 * five added with it are DECLINE-ONLY until measurement says otherwise: an
 * ascent-phase dip under −55 would otherwise end a career three eras in, before
 * the prophecy the whole arc is built around, and the ascent is where contagion
 * does its steepest work.
 *
 * Gated on `erasSinceProphecy > 0`, not `phase === 'decline'` — the two look
 * interchangeable but are not, on the ONE era where it matters. `phase` flips
 * to `'decline'` the instant `eraIndex` reaches `prophecyEra`, and
 * `checkEndings` runs immediately on that same transition, before the player
 * has ever been shown the pinned prophecy card for that era (`nextOffer` only
 * pins it once `eraIndex === prophecyEra`). A reprisal gated on `phase` alone
 * could therefore end the run on the exact transition that was supposed to
 * show the prophecy, skipping the beat the whole arc is built around — an
 * unwarned ending, since the header's tone (below) shares this predicate and
 * would have called it non-lethal one era earlier. `erasSinceProphecy > 0`
 * requires one further era to have actually elapsed, i.e. the prophecy card to
 * have been presented and resolved, before a reprisal can fire.
 *
 * Exported because the header's warning has to agree with it — a "lethal" bar
 * for a condition that structurally cannot fire yet is a false alarm, and this
 * is the one predicate that decides.
 */
export function reprisalLiveFor(factionId: FactionId, run: RunState): boolean {
  return factionId === SEAL_FACTION || run.erasSinceProphecy > 0;
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
 *
 * The bundle has the last word on whether the ending exists, for
 * `leadershipEnding`'s reasons and one of its own. A pack that ships the
 * Academy's gem and none of the five added beside it is legitimate — the seal
 * was the only faction ending for the whole of the build — and its wizards
 * must keep playing rather than land on a card the ending screen cannot
 * render (`App.tsx` looks the id up and breaks out of the render on a miss,
 * which is a blank screen at the moment the run pays off).
 *
 * An id the pack lacks means NO reprisal this era, never the next-nearest
 * faction's: the faction closest to acting is the one the header has been
 * warning about, and quietly promoting the runner-up would end the run in the
 * name of a faction no warning ever pointed at.
 */
export function reprisalEnding(run: RunState, content: ContentBundle): EndingId | undefined {
  if (run.notoriety < SEAL_MIN_NOTORIETY) return undefined;
  const faction = nearestReprisalFaction(run, 'live');
  if (faction === undefined) return undefined;
  if ((run.factionStanding[faction] ?? 0) > SEAL_MAX_STANDING) return undefined;
  const ending = REPRISAL_BY_FACTION[faction];
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
 * Exported for the same reason `nearestReprisalFaction` is: the screen naming
 * your patron (`standingPassageFor` in `src/components/meta/standing.ts`)
 * must resolve a tie the way the engine does, and a second copy of the rule
 * is how the two drift apart — which it did, for one run shape, before that
 * screen called this function instead of re-deriving the same answer.
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
  // that never happened — narrating forfeited relics and frozen decay on a
  // career that kept both. Falling through to `retired_to_swamp` for that
  // wizard is correct: their crown was never a standing total to begin with
  // (`content/standing.ts`'s `PATRON_BY_ENDING` comment on `lichdom` says the
  // same thing from the flavor-text side).
  if (patron === 'worm_below') return undefined;
  const ending = LEADERSHIP_BY_FACTION[patron];

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
    // `arch_lich` stays FIRST of the age-limit checks (issue #25), ahead of
    // BOTH branches below — not a tiebreak between them, the true answer for
    // a wizard both are true for. Nothing gates `virtue_resolution_the_
    // quiet_ledger` on `isLich`, so a lich who then takes the vow reaches
    // this line with `goodWizardVowed && isLich` both true; before this
    // branch existed, `good_wizard` won by running first, and the relics and
    // followers the rite already forfeited stayed forfeited under an ending
    // that never mentioned the rite at all. See the doc comment on
    // `EndingId`'s `arch_lich` member in `types.ts`.
    if (run.goodWizardVowed && run.isLich) return 'arch_lich';
    // `good_wizard` stays SECOND of the age-limit checks (issue #23). It is
    // earned the same way lichdom is below it — by a card the player
    // accepted (`vowGoodWizard`), not by a standing total — and it is the
    // only one of the four PLAIN age-limit outcomes that was chosen this
    // deliberately, across a whole career, rather than arrived at by the
    // accumulated shape of a run. Letting the lich check or the standing
    // comparison run first would let a wizard who vowed the Good Wizard
    // resolution be overridden by a state they no longer control the
    // meaning of.
    if (run.goodWizardVowed) return 'good_wizard';
    // The lich branch stays THIRD and otherwise untouched. `lichdom` is the
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
