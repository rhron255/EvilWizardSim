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

/**
 * The approach, narrated.
 *
 * Hero threat used to close in as a number and nothing else. The content that
 * dramatised the chosen one — `decline_sighting`, `decline_the_squire` — was
 * sampled at random, so a player could read about a sighting while perfectly
 * safe and then die three eras later with no warning in the fiction at all.
 *
 * These fire off `heroBand` in the engine, once per band per run, so the prose
 * and the rail are the same fact told twice. Each band has a small pool picked
 * by a stable hash, the same way `deeds.ts` picks its tails: a given moment in
 * a given run always narrates the same way.
 *
 * Note the register. This is not a doom meter — wiki/04's ban is on announcing
 * the DECLINE, and the notoriety erosion stays unnarrated. This says only what
 * a lethal counter is required to say (04:82-86), in fiction rather than in
 * digits, and it never states a threshold or a rate; the readout above it does
 * that.
 */
const APPROACH: Record<'warn' | 'danger' | 'through', readonly string[]> = {
  warn: [
    'A rider was seen on the north road. She did not stop at the village.',
    'Someone has been asking, in the sensible towns, what your gate is made of.',
    'A horse was bought three provinces away, and paid for by a temple.',
  ],
  danger: [
    'She crossed the river at dusk and did not use the bridge.',
    'The last village between you sent no tithe this year. They fed her instead.',
    'Your outer wards were tested in the night. Politely, and only once.',
  ],
  through: [
    'She is inside the wards. There is nothing further between you.',
    'The gate held until it did not. She is not hurrying now.',
    'Your wards are behind her. She has been walking a long time.',
  ],
};

/**
 * A line for a crossing. `key` is any stable per-run number — the engine passes
 * the run seed — so the same run always tells it the same way.
 */
export function heroApproachLine(band: 'warn' | 'danger' | 'through', key: number): string {
  const pool = APPROACH[band];
  return pool[Math.abs(key | 0) % pool.length];
}
