/**
 * Who remembers you, and how.
 *
 * The ending card has always drawn six standing bars and said nothing about
 * them. Reported from play: the factions feel like a nuisance rather than
 * something you built — which is fair, because standing's only visible payoffs
 * during a run are a locked reliquary and a gem, both of them punishments.
 *
 * So the card names your PATRON and your NEMESIS: the faction you courted
 * hardest and the one you alienated worst. Two lines, at most.
 *
 * WHY THIS AXIS AND NOT THE ENDING. Keyed on faction and polarity, the whole
 * set is 6 × 2 = twelve authored lines, shared by all seven endings. Keyed on
 * the ending as well it would have been eighty-four, and the tier coda is
 * already thirty-five — the two passages vary on INDEPENDENT axes on purpose,
 * because that is the difference between a card that reads differently every
 * run and a content job nobody finishes.
 *
 * THRESHOLDS ARE BORROWED, NOT INVENTED. `DEVOTION_STANDING` (55) is where a
 * faction opens its reliquary and `ARTIFACT_LOCKOUT_STANDING` (-50) is where it
 * stops giving you anything at all. Both are existing mechanical lines the
 * player has already felt during the run, so the card is naming a relationship
 * the game was enforcing rather than a number invented for the summary
 * (CLAUDE.md failure mode 6).
 *
 * PATRON is `patronFaction` from the engine, not a second walk of
 * `factionStanding`. It used to be: highest standing, gated on
 * `DEVOTION_STANDING` alone, tie-broken by whatever order `factions` happens
 * to list — a second copy of the rule `leadershipEnding` runs on `RunState`
 * at the age limit, and the two could disagree on which faction to name.
 * They agreed on every run that actually reaches a crown (a crown needs
 * `PATRON_MARGIN` clear of the runner-up, which is also enough margin to win
 * this file's cruder walk), so the drift stayed latent — but a wizard devoted
 * to three factions at once, margin denied, still got a "patron" line here
 * naming one of them, directly contradicting a same-screen ending card that
 * says nobody crowned them. Calling the shared function removes both the
 * missing `PATRON_MARGIN` check and the second tie-break implementation in
 * one move.
 */

import { ARTIFACT_LOCKOUT_STANDING, patronFaction } from '../../engine';
import type { Faction, FactionId, RunState } from '../../types';

export type StandingBond = {
  factionId: FactionId;
  /** The faction's own name, from the supplied cast — never a literal. */
  name: string;
  standing: number;
};

export type StandingPassage = {
  /** The faction `patronFaction` crowns, if any — see that function's doc comment. */
  patron: StandingBond | null;
  /** Lowest standing, at or below `ARTIFACT_LOCKOUT_STANDING`. */
  nemesis: StandingBond | null;
};

function bond(factions: Faction[], id: FactionId, standing: number): StandingBond | null {
  const faction = factions.find((f) => f.id === id);
  // A cast that does not contain the faction yields nothing rather than a
  // half-sentence with an id in it — same rule `attributionFor` follows.
  return faction ? { factionId: id, name: faction.name, standing } : null;
}

/**
 * The two ends of the run's faction ledger.
 *
 * Both may be null: a wizard who courted nobody and offended nobody has no
 * relationships to report, and the passage is simply absent. That is a real
 * career, not an edge case to paper over — `retired_to_swamp` is full of them.
 */
export function standingPassageFor(run: RunState, factions: Faction[]): StandingPassage {
  let worst: { id: FactionId; v: number } | null = null;

  for (const faction of factions) {
    const v = run.factionStanding[faction.id] ?? 0;
    if (worst === null || v < worst.v) worst = { id: faction.id, v };
  }

  const patronId = patronFaction(run);
  const patron = patronId === undefined ? null : bond(factions, patronId, run.factionStanding[patronId] ?? 0);

  return {
    patron,
    nemesis: worst && worst.v <= ARTIFACT_LOCKOUT_STANDING ? bond(factions, worst.id, worst.v) : null,
  };
}
