/**
 * What a relic's power says, in words.
 *
 * ONE renderer, and the only one. `Artifact` used to carry an authored
 * `effect: string` alongside the number it described, which is CLAUDE.md
 * failure mode 4 wearing its plainest costume — a field whose truth depends on
 * an author remembering to edit two places. It never showed, because all
 * thirty-two relics said `Defense +N` and the number was the only thing that
 * varied. Powers made that a real risk, so the prose is derived and the field
 * is gone: there is no second place to say it, so there is nothing to disagree
 * with.
 *
 * TWO REGISTERS, ONE SWITCH. The relic card has room for a sentence; the
 * header's Relics caption has room for a clause, and it prints the SUM across
 * everything held rather than one relic's line. Those are different strings
 * for the same idea, and the obvious way to write them — a function each —
 * is two exhaustive switches over one union kept in step by hand, which is
 * exactly the duplication issue #44 records between the two `effectText`
 * files. So one switch returns both, named side by side, and neither can be
 * changed without the other in view.
 *
 * The vocabulary is the header's, deliberately. `stakes.ts` calls defence
 * "Wards" ("he kills you above 71", "Undeath adds 90 Wards") and prints the
 * hero's rate as "his threat +16 an era", so a relic that moves either one
 * says so in the same words the player is already reading them in. A relic
 * that described itself in a private vocabulary would be a second name for a
 * stat the game names once.
 *
 * Exhaustive, with a `never` guard rather than a default branch: a new
 * `ArtifactPower` member must fail to compile here instead of rendering blank
 * on a card (failure mode 2, and the same defect issue #44 records in
 * `isNegative`).
 *
 * Signs come from `signed()` next door rather than being typed here. The minus
 * is U+2212, not a hyphen, because it optically matches the plus — a rule
 * `effectText.ts` states in its own header and owns the constant for. This
 * file hand-typed the glyph in three clauses, which made it a third satellite
 * of the duplication issue #44 is already about.
 */

import type { ArtifactPower } from '../../types';
import type { RelicPowers } from '../../engine';
import { signed } from './effectText';

type Phrasing = {
  /** Full sentence, for the relic's own card. */
  sentence: string;
  /** Compact clause, for the header's summed caption. */
  clause: string;
};

function phrasingFor(p: ArtifactPower['p'], v: number): Phrasing {
  switch (p) {
    case 'wards':
      return { sentence: `Wards ${signed(v)}.`, clause: `${signed(v)} wards` };
    case 'vigil':
      return {
        sentence: `Hero threat rises ${v} slower an era.`,
        clause: `hero ${v} slower an era`,
      };
    case 'undimmed':
      return {
        sentence: `Notoriety decays ${v} slower an era.`,
        clause: `decay ${v} slower an era`,
      };
    case 'discipline':
      return {
        sentence: `Apprentice loyalty falls ${v} slower an era.`,
        clause: `loyalty ${v} slower an era`,
      };
    case 'haggle':
      return {
        sentence: `Every follower cost is ${v} smaller.`,
        clause: `follower costs ${signed(-v)}`,
      };
    case 'grace':
      return {
        sentence: `Every standing loss is ${v} smaller.`,
        clause: `standing losses ${signed(-v)}`,
      };
    default: {
      const exhaustive: never = p;
      throw new Error(`artifactPower: unhandled power ${String(exhaustive)}`);
    }
  }
}

export function artifactPowerText(power: ArtifactPower): string {
  return phrasingFor(power.p, power.v).sentence;
}

/**
 * Everything in hand, as one caption.
 *
 * Ordered by the union's own declaration order rather than by magnitude, so
 * the line reads the same way every era — a caption that reshuffles itself as
 * numbers cross each other is harder to read at a glance than one that is
 * always in the same order, and nothing here is a ranking.
 *
 * Zero terms are dropped. Empty when nothing is held, which is the caller's
 * cue to say what relics are FOR rather than what these ones do.
 */
/**
 * A `Record` rather than an array, so the compiler names a new `ArtifactPower`
 * member here too. As a bare list this was the one enumeration of the six that
 * nothing checked: a power left out of it would be held, applied by the engine,
 * printed on its own relic card — and silently missing from the header's
 * summary, which is the one place a player reads what their whole reliquary is
 * doing. That is failure mode 2 with the compiler standing right there.
 *
 * THE NUMBERS ARE THE ORDER, not the order the keys happen to be written in.
 * `Object.keys` does return insertion order for string keys, so the sort below
 * is currently a no-op — which is the point at which two encodings can quietly
 * disagree. Renumber to reorder; the literal's reading order only mirrors the
 * values for legibility, and the sort is what actually decides.
 */
const POWER_ORDER: Record<ArtifactPower['p'], number> = {
  wards: 0,
  vigil: 1,
  undimmed: 2,
  discipline: 3,
  haggle: 4,
  grace: 5,
};

export function relicPowerSummary(powers: RelicPowers): string {
  return (Object.keys(POWER_ORDER) as ArtifactPower['p'][])
    .sort((a, b) => POWER_ORDER[a] - POWER_ORDER[b])
    .filter((p) => powers[p] > 0)
    .map((p) => phrasingFor(p, powers[p]).clause)
    .join(' · ');
}
