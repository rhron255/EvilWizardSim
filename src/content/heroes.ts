/**
 * The hero bloodlines and the prophecy set piece.
 *
 * wiki/06_reference_analysis.md § What Does Not Transfer: invented factions
 * carry no weight on run one, and the compensation adopted here is "a fixed
 * recurring cast ... the same named rival wizards and hero bloodlines in every
 * run, so recognition accrues by run five instead of run one." These names are
 * that cast. They must stay small and stable — a randomly generated name every
 * run would defeat the entire point.
 *
 * The chosen one is picked deterministically from the run seed, so a given run
 * always faces the same hero, and a player replaying a seed sees a rematch.
 */

const BLOODLINES = [
  { given: 'Aurel', house: 'of the Thornwatch' },
  { given: 'Sella', house: 'Marchbright' },
  { given: 'Idris', house: 'of the Kept Flame' },
  { given: 'Wren', house: 'Ambermoor' },
  { given: 'Calder', house: 'of the Ninth Field' },
  { given: 'Ysolde', house: 'Vantry' },
  { given: 'Perrin', house: 'of the Late Harvest' },
  { given: 'Halloran', house: 'Greyleigh' },
] as const;

/** Deterministic: the same seed always produces the same chosen one. */
export function heroNameFor(seed: number): string {
  const b = BLOODLINES[Math.abs(seed | 0) % BLOODLINES.length];
  return `${b.given} ${b.house}`;
}

/**
 * The interstitial's body copy.
 *
 * Deliberately does NOT announce a decline, a doom meter, or that the player is
 * now losing — wiki/01_core_loop.md is explicit that the decline works because
 * it is a number quietly going the wrong way. This is an announcement of a
 * birth, not of a defeat. The dread is the player's to supply.
 */
export function prophecyTextFor(heroName: string, wizardName: string): string {
  return (
    `A child was born this year in a village that has never once troubled you. ` +
    `The temples have already agreed on the wording, and they have agreed on it ` +
    `in the present tense.\n\n` +
    `The child's name is ${heroName}. Yours appears four lines further down, ` +
    `spelled correctly, which is the part that should worry you. ` +
    `Nobody has ever bothered to spell ${wizardName} correctly before.`
  );
}
