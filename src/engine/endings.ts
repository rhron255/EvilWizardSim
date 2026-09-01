/**
 * Terminal-state evaluation — all seven endings from wiki/01 § 7.
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
 *   6. Age limit → `lichdom` if the wizard already paid for it, else
 *      `retired_to_swamp`, which is the catch-all so no state is undefined.
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
  PACT_LIMIT,
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
 * Whether a faction's reprisal is live at all in this phase.
 *
 * The Academy's is available in any phase, exactly as the seal always was. The
 * five added with it are DECLINE-ONLY until measurement says otherwise: an
 * ascent-phase dip under −55 would otherwise end a career three eras in, before
 * the prophecy the whole arc is built around, and the ascent is where contagion
 * does its steepest work.
 *
 * Exported because the header's warning has to agree with it — a "lethal" bar
 * for a condition that structurally cannot fire yet is a false alarm, and this
 * is the one predicate that decides.
 */
export function reprisalLiveFor(factionId: FactionId, run: RunState): boolean {
  return factionId === SEAL_FACTION || run.phase === 'decline';
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
export function reprisalEnding(run: RunState): EndingId | undefined {
  if (run.notoriety < SEAL_MIN_NOTORIETY) return undefined;
  const faction = nearestReprisalFaction(run, 'live');
  if (faction === undefined) return undefined;
  if ((run.factionStanding[faction] ?? 0) > SEAL_MAX_STANDING) return undefined;
  return REPRISAL_BY_FACTION[faction];
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

  const reprisal = reprisalEnding(run);
  if (reprisal) return reprisal;

  if (
    run.apprentices.count >= BETRAYAL_MIN_APPRENTICES &&
    run.apprentices.loyalty <= BETRAYAL_MAX_LOYALTY
  ) {
    return 'betrayed_by_apprentice';
  }

  if (run.pactDebt >= PACT_LIMIT) return 'consumed_by_pact';

  if (run.eraIndex >= run.eraCount) {
    return run.isLich ? 'lichdom' : 'retired_to_swamp';
  }

  return undefined;
}
