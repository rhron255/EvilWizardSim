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
 * | `consumed_by_pact`        | the Ashen Covenant                   |
 * | `betrayed_by_apprentice`  | an apprentice                        |
 * | `lichdom`                 | **nobody**                           |
 * | `retired_to_swamp`        | **nobody**                           |
 * | `ascension`               | **nobody**                           |
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

import type { EndingId, Faction, FactionId } from '../../types';

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

    case 'sealed_in_gem':
      return nameOf(ctx.factions, 'pale_academy');

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
