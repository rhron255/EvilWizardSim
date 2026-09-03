/**
 * Who ended the run — the agent, not the ending.
 *
 * The summary card has always named the ENDING ("Slain by the Chosen One") and
 * stopped there, which throws away the point of the fixed recurring cast.
 * `wiki/06_reference_analysis.md` § What Does Not Transfer compensates for
 * invented factions with "a fixed recurring cast ... so recognition accrues by
 * run five instead of run one", and `content/heroes.ts` duly draws a named
 * hero deterministically from the run seed — but recognition cannot accrue from
 * a name the summary never prints. The prophecy interstitial says it once,
 * fifteen eras before the payoff, and then it was gone.
 *
 * THE RULE BELOW IS A DESIGN DECISION, NOT A RENDERING CONVENIENCE.
 *
 * | Ending                    | Attributed to                        |
 * |---------------------------|--------------------------------------|
 * | `slain_by_chosen_one`     | the named hero for this run's seed   |
 * | `sealed_in_gem`           | the Pale Academy                     |
 * | `eternally_repurposed`    | the Ashen Covenant                   |
 * | `liquidated`              | the Gilded Hand                      |
 * | `turned_to_fertilizer`    | the Verdant Choir                    |
 * | `exiled_and_overrun`      | the Crownlands                       |
 * | `consumed`                | the Worm Below                       |
 * | `consumed_by_pact`        | the Ashen Covenant                   |
 * | `betrayed_by_apprentice`  | an apprentice                        |
 * | `lichdom`                 | **nobody**                           |
 * | `retired_to_swamp`        | **nobody**                           |
 * | `ascension`               | **nobody**                           |
 *
 * The five faction reprisals are the least ambiguous entries in the table: a
 * reprisal is the faction acting, which is the whole of what it is. They are
 * attributed through `REPRISAL_BY_FACTION` rather than by five more literals,
 * so the card can never credit a faction other than the one the engine used.
 *
 * Those last three are SELF-DETERMINED: they are things the wizard did, not
 * things done to the wizard. Inventing an agent for them would be a lie, and a
 * lie in the direction the game least wants — `wiki/06` principle 8 holds that
 * every ending is a biography rather than a defeat, and an attributed swamp
 * reads as a defeat. `null` is the correct answer here, never a placeholder and
 * never a fallback string.
 *
 * Faction names come from the supplied cast, never from a literal, because the
 * engine takes a `ContentBundle` and a content pack may rename the six. A
 * faction that is absent yields `null` rather than a broken half-sentence.
 */

import { LEADERSHIP_BY_FACTION, REPRISAL_BY_FACTION } from '../../engine';
import type { EndingId, Faction, FactionId } from '../../types';

/**
 * Reprisal ending -> the faction that carried it out.
 *
 * Inverted from the engine's own table so there is exactly one place that
 * decides which faction owns which reprisal. A hand-written second copy here
 * would typecheck perfectly while naming the wrong faction on the card.
 */
const REPRISAL_AGENT = new Map<EndingId, FactionId>(
  (Object.entries(REPRISAL_BY_FACTION) as [FactionId, EndingId][]).map(([factionId, endingId]) => [
    endingId,
    factionId,
  ]),
);

/** The same inversion for the other end of the relationship. */
const LEADERSHIP_AGENT = new Map<EndingId, FactionId>(
  (Object.entries(LEADERSHIP_BY_FACTION) as [FactionId, EndingId][]).map(
    ([factionId, endingId]) => [endingId, factionId],
  ),
);

/** What the screen needs to resolve an attribution. */
export type AttributionContext = {
  /** `heroNameFor(run.seed)` — deterministic, so a seed is a rematch. */
  heroName: string;
  /** The run's faction cast, as handed to the screen. */
  factions: Faction[];
};

/**
 * The apprentice is deliberately unnamed.
 *
 * `betrayed_by_apprentice` is drawn from `run.apprentices`, which is a count
 * and a loyalty percentage — the roster holds no names, so there is no name to
 * print. The ending's own narration leans on exactly that ("Her name sat in
 * your ledger for forty years, misspelled the entire time"), so naming her here
 * would contradict the card three lines below it.
 */
const APPRENTICE = 'An apprentice';

function nameOf(factions: Faction[], id: FactionId): string | null {
  return factions.find((f) => f.id === id)?.name ?? null;
}

/**
 * The agent behind an ending, or `null` when the ending is self-determined.
 *
 * The switch is exhaustive with a `never` guard on purpose: a new `EndingId`
 * must not silently inherit "nobody ended you". The compiler names the case.
 */
export function attributionFor(endingId: EndingId, ctx: AttributionContext): string | null {
  switch (endingId) {
    case 'slain_by_chosen_one':
      // Trim guards the empty-seed case; an empty attribution renders nothing
      // rather than a label with a blank after it.
      return ctx.heroName.trim() || null;

    // --- faction reprisals: the faction IS the ending ------------------------
    case 'sealed_in_gem':
    case 'eternally_repurposed':
    case 'liquidated':
    case 'turned_to_fertilizer':
    case 'exiled_and_overrun':
    case 'consumed': {
      const factionId = REPRISAL_AGENT.get(endingId);
      return factionId ? nameOf(ctx.factions, factionId) : null;
    }

    // --- faction leadership: the faction is who you did it FOR ---------------
    //
    // Patron-determined, not self-determined. A wizard does not become Archmage
    // alone in a room — there is an institution doing the crowning, and it is
    // the same fixed cast the reprisals are drawn from, which is the whole
    // point of a recurring six (wiki/06 § What Does Not Transfer). Leaving
    // these in the `null` branch below would print the biggest name in the
    // career and then decline to say whose name it was.
    case 'contract_writer':
    case 'grand_arbiter':
    case 'archmage':
    case 'archdruid':
    case 'overthrown_the_kingdom': {
      const factionId = LEADERSHIP_AGENT.get(endingId);
      return factionId ? nameOf(ctx.factions, factionId) : null;
    }

    case 'consumed_by_pact':
      return nameOf(ctx.factions, 'ashen_covenant');

    case 'betrayed_by_apprentice':
      return APPRENTICE;

    // --- self-determined: no agent exists, so none is named -----------------
    case 'lichdom':
    case 'retired_to_swamp':
    case 'ascension':
      return null;

    default: {
      const unhandled: never = endingId;
      return unhandled;
    }
  }
}

/**
 * The label that precedes the name on the card.
 *
 * One phrase has to sit in front of a hero, a faction and an apprentice
 * without straining, and has to stay straight-faced while it does — the joke on
 * this card is always in the narration, never in the caption (rule 4).
 */
export const ATTRIBUTION_LABEL = 'At the hands of';

/**
 * ...except when the faction did not do it TO you.
 *
 * "At the hands of The Pale Academy" is the right caption for a wizard filed
 * away in a gem and exactly the wrong one for a wizard who ended the career as
 * its Archmage. Every attributed ending until now was something done to the
 * player, so one phrase carried them all; leadership is the first agent on
 * this card the wizard was working WITH.
 *
 * Derived from `LEADERSHIP_AGENT` — the same map the switch above answers from
 * — rather than written as a second switch over the same ids. A parallel list
 * of "which endings are leadership" is the shape that drifts (failure mode 3:
 * never mirror a fact across a seam), and the drift here would print a crown
 * as an execution.
 */
export function attributionLabelFor(endingId: EndingId): string {
  return LEADERSHIP_AGENT.has(endingId) ? 'At the head of' : ATTRIBUTION_LABEL;
}
