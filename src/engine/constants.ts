/**
 * Every balance knob in the game, in one file.
 *
 * These are tuned against `scripts/simulate.ts` (2000 runs, mixed player
 * policies) using the fixture bundle. Targets from the wiki:
 *
 *   - Ascension 1-4% of runs                (04 § Near-Miss Tuning)
 *   - Age-limit survival uncommon           (04 § Hero Escalation)
 *   - Decline reads as erosion, not a cliff (04 § Notoriety Decay)
 *
 * Retune here and nowhere else. If a number appears in a system module, it is
 * a bug.
 */

// ---------------------------------------------------------------------------
// Era structure
// ---------------------------------------------------------------------------

/** wiki/01 § 2: "5 in-world years per era, starting age 20". */
export const YEARS_PER_ERA = 5;
export const START_AGE = 20;

/** Brief / Standard / Long. Controls length, never difficulty. */
export const RUN_LENGTHS = [12, 16, 20] as const;
export const DEFAULT_ERA_COUNT = 16;

/**
 * The prophecy is SCRIPTED, not sampled — it fires at a fixed fraction of the
 * run so pacing is identical every time. 0.57 puts it at era 7/9/11 for the
 * three run lengths, inside the wiki's "roughly the first 55-60%".
 */
export const PROPHECY_FRACTION = 0.57;

// ---------------------------------------------------------------------------
// Starting state
// ---------------------------------------------------------------------------

export const START_NOTORIETY = 6;
export const START_FOLLOWERS = 0;
export const START_LOYALTY = 60;

// ---------------------------------------------------------------------------
// Notoriety decay — wiki/04 § Notoriety Decay
// ---------------------------------------------------------------------------

/** `decayPerEra = DECAY_BASE * (1 + erasSinceProphecy * DECAY_RAMP)` */
export const DECAY_BASE = 3;
export const DECAY_RAMP = 0.15;

// ---------------------------------------------------------------------------
// Hero escalation — wiki/04 § Hero Escalation
// ---------------------------------------------------------------------------

/**
 * Threat gained per decline era:
 *   HERO_THREAT_BASE + HERO_THREAT_RAMP * erasSinceProphecy
 *                    + HERO_FAME_COEF * notoriety
 *
 * FAME DOMINATES THE RAMP, deliberately. The Crownlands do not send their best
 * after a hermit — they send them after a name. A quiet wizard accumulates
 * roughly 55 threat across a standard decline; a Kingdom-Level one accumulates
 * roughly 110. That is what makes `retired_to_swamp` the LOW-notoriety ending
 * the wiki describes, rather than a lottery: staying small is a real, legible
 * survival strategy with an anticlimactic payoff.
 *
 * The time ramp is kept small for the same reason — a large flat ramp makes
 * every build die at the same era and turns the decline into a countdown.
 */
export const HERO_THREAT_BASE = 4;
export const HERO_THREAT_RAMP = 2;
export const HERO_FAME_COEF = 0.18;

/**
 * `defenseOf` = floor + notoriety term + artifact defenses + lair term.
 *
 * The floor is high relative to the notoriety term on purpose: artifacts and
 * the lair ladder are the things you *build*, and they should be what carries
 * a famous wizard through the decline. Notoriety contributes a little (fear
 * deters) but nowhere near enough to pay for the threat it generates.
 */
export const DEF_FLOOR = 42;
export const DEF_NOTORIETY = 0.3;
export const DEF_LAIR = 8;

/**
 * A lich is harder to put down — but this is deliberately set NEAR the value
 * of a mid-run artifact set, not above it.
 *
 * That single number is what makes lichdom a live decision rather than a
 * strict upgrade or a strict trap: a wizard holding four artifacts (~26
 * defense) loses badly by taking the rite, while a fame-chaser holding none
 * gains. The right answer depends on the build the player actually assembled,
 * which is the whole point of wiki/01's "This makes it a live decision".
 */
export const DEF_LICH = 60;

// ---------------------------------------------------------------------------
// Faction standing — wiki/04 § Faction Standing
// ---------------------------------------------------------------------------

export const STANDING_MIN = -100;
export const STANDING_MAX = 100;

/**
 * Hostility is contagious along `hostileTo`. Courting a faction costs its
 * enemies a FRACTION of the gain — full symmetry would make every path
 * unwalkable, and no cost at all would make routing meaningless.
 */
export const CONTAGION_GAIN = 0.5;
/** The enemy of my enemy warms to me, but only a little. */
export const CONTAGION_LOSS = 0.25;

/** At or below this standing, a faction's artifacts lock out entirely. */
export const ARTIFACT_LOCKOUT_STANDING = -50;

/**
 * At or above this standing, a faction opens its reliquary: a `rare` grant
 * from them yields their legendary instead. A run-defining commitment, and the
 * only reliable route to the two legendaries Ascension requires.
 */
export const DEVOTION_STANDING = 55;

/** Standing multiplier on offer weight: `1 + standing/100 * COEF`, clamped. */
export const STANDING_WEIGHT_COEF = 1.4;
export const STANDING_WEIGHT_MIN = 0.15;
export const STANDING_WEIGHT_MAX = 2.6;

/** A faction-affiliated offer must surface at least this often. */
export const FACTION_OFFER_GAP = 3;

// ---------------------------------------------------------------------------
// Random artifact draws
// ---------------------------------------------------------------------------

/**
 * Rarity weights for `artifactFrom`. Legendaries are the run's top prize and
 * gate Ascension, so an uncapped random draw must almost never produce one —
 * content should grant them by id, deliberately.
 */
export const RARITY_DRAW_WEIGHT = { common: 12, rare: 3, legendary: 0.5 } as const;

// ---------------------------------------------------------------------------
// Ending thresholds — wiki/01 § 7
// ---------------------------------------------------------------------------

/** Consumed by the Pact. */
export const PACT_LIMIT = 7;
/**
 * Unpaid debt compounds once the prophecy has landed — but only real debt.
 * A single point of inherited debt is a tone-setter, not a death sentence, so
 * interest does not start until the second point. Without this floor, the
 * "inherited a tower and its debts" origin was a hidden 100%-lethal trap.
 */
export const PACT_INTEREST = 1;
export const PACT_INTEREST_MIN_DEBT = 2;

/** Betrayed by an Apprentice: many apprentices, little loyalty. */
export const BETRAYAL_MIN_APPRENTICES = 2;
export const BETRAYAL_MAX_LOYALTY = 15;

/**
 * Ambition grows as the master visibly weakens — decline phase only, and it
 * SCALES WITH HEADCOUNT: `-(LOYALTY_DRIFT_BASE + count)` per era.
 *
 * A flat drift made the betrayal ending unreachable, because two apprentices
 * and seven decline eras could not close the gap from a 60 starting loyalty.
 * Scaling makes a large, badly-treated school a genuine liability, which is
 * the failure mode the ending is named after.
 */
export const LOYALTY_DRIFT_BASE = 2;
export const LOYALTY_DRIFT_MIN_APPRENTICES = 2;

/** Sealed in a Gem: the Pale Academy files dangerous alumni away. */
export const SEAL_FACTION = 'pale_academy' as const;
export const SEAL_MAX_STANDING = -55;
export const SEAL_MIN_NOTORIETY = 55;

/**
 * Ascension: the visible unattainable prize.
 *
 * ONE legendary, not two. The four legendaries sit in the most mutually
 * hostile corner of the faction web, and hostility is contagious, so requiring
 * two meant courting two factions that spend the whole run cancelling each
 * other out — 2000 runs produced 0.05%. That is not a near-miss, it is a
 * closed door, and the empty Ascension slot in the header would have been a
 * promise the game could not keep.
 *
 * One legendary plus Legend-adjacent fame is still the hardest thing in the
 * game, and it stays LEGIBLE: devotion buys the relic, fame buys the threshold,
 * and the two pull against each other. Missing it reads as unfinished business
 * rather than as a bug, which is the whole point of wiki/04 § Near-Miss Tuning.
 */
export const ASCENSION_MIN_NOTORIETY = 84;
export const ASCENSION_LEGENDARIES = 1;

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export const COLLECTION_KEY = 'evil-wizard-sim:collection';
export const RUN_KEY = 'evil-wizard-sim:run';
/** Bump when `Collection`'s shape changes, and extend `migrateCollection`. */
export const COLLECTION_VERSION = 2;
/** Bump when `RunState`'s shape changes; stale in-progress runs are dropped. */
export const RUN_SAVE_VERSION = 1;
