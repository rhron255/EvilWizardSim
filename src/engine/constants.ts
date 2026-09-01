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

/**
 * A small household, so the early cards can charge for one.
 *
 * PROVENANCE: measurement, not the wiki. wiki/02 § three currencies calls
 * Followers "ledger filler — the quietly accumulating number" and sets no
 * starting value; `origins.ts` already grants one origin +4, so a nonzero
 * start is not against the design, but the number below is mine.
 *
 * Why it moved off 0: `effects.ts` clamps followers at `Math.max(0, …)`, so a
 * card printing "−12 Followers" against an empty household charged nothing.
 * Measured over 800 runs of the real catalog, 49.6% of every follower cost a
 * player accepted was never paid, and in era 1 it was 70% — which made the
 * opening choices dominated rather than difficult ("gain a relic, −12
 * Followers, +8 Standing" is a pure gain if you have no followers).
 *
 * At 10: era 1 falls to 0% unpaid and era 2 to 21%, overall 49.6% → 33.8%.
 * The remainder is a real state — you spent them — and is now DISCLOSED,
 * because `projectEffects` prints the clamped cost the engine will actually
 * charge rather than the authored one.
 *
 * Re-measured across all thirteen sim targets before and after: none moved
 * outside its band, ascension held at 2.20%, `slain_by_chosen_one` at 42.75%.
 */
export const START_FOLLOWERS = 10;
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
 * How close the hero is, as a fraction of what stands in his way.
 *
 * ONE pair of thresholds, read by two things that must never disagree: the
 * header's wards readout (which colours and fills from it) and the era-end
 * beat that narrates his approach. Two independent copies of "close" is the
 * shape of failure mode 4 — a shared number with two readings — and here it
 * would let the fiction say he was at the gate while the bar said he was
 * halfway.
 *
 * These are the values the readout has used since it shipped; naming them is
 * what makes them shareable, not a retune.
 */
export const HERO_BAND_WARN = 0.6;
export const HERO_BAND_DANGER = 0.85;

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
 * only reliable route to the legendary `ASCENSION_LEGENDARIES` asks for.
 *
 * (This said "the two legendaries" until long after the constant became one —
 * the third place that same drift was found, after the sim's ascension
 * diagnostic and a comment in `effects.ts`. Read the constant, never a
 * sentence about it.)
 */
export const DEVOTION_STANDING = 50;

/** Standing multiplier on offer weight: `1 + standing/100 * COEF`, clamped. */
export const STANDING_WEIGHT_COEF = 1.4;
export const STANDING_WEIGHT_MIN = 0.15;
export const STANDING_WEIGHT_MAX = 2.6;

/** A faction-affiliated offer must surface at least this often. */
export const FACTION_OFFER_GAP = 3;

/**
 * Pact debt's multiplier on offer weight — what replaced the interest tick.
 *
 * Debt no longer grows on its own. Instead the POOL leans: the more a wizard
 * owes, the more often the Covenant's cards come up in the draw, both the ones
 * that deepen the hole (`tempts`) and the ones that offer a way out
 * (`relieves`). `1 + pactDebt * COEF`, clamped — the same shape as the standing
 * multiplier above, applied on the same scorer.
 *
 * At `pactDebt === 0` both are exactly 1, so a wizard who never signs anything
 * draws from a pool identical to the one before this system existed.
 *
 * Temptation is weighted harder than relief on purpose: the spiral has to have
 * a pull, or removing the tick just removes the ending. But relief is
 * deliberately NOT trivial — a debt you cannot act against is the tick wearing
 * a different hat.
 *
 * PROVENANCE: these four numbers were fitted, not reasoned. The target they
 * were fitted to — `consumed_by_pact` in 8-18% of runs — was set in the
 * session that built this system and is NOT in the wiki, which gives the
 * ending the note "High-variance play punished" and no rate (wiki/01 § 7).
 * CLAUDE.md failure mode 6 is about exactly this: an invented band chased hard
 * enough to distort a constant. Anyone moving these should re-read
 * `scripts/simulate.ts`'s target comment first and be willing to move the band
 * instead.
 */
export const PACT_TEMPT_COEF = 0.35;
export const PACT_TEMPT_MAX = 3.0;
export const PACT_RELIEF_COEF = 0.22;
export const PACT_RELIEF_MAX = 2.2;

// ---------------------------------------------------------------------------
// Random artifact draws
// ---------------------------------------------------------------------------

/**
 * Rarity weights for `artifactFrom`. Legendaries are the run's top prize and
 * gate Ascension, so an uncapped random draw must almost never produce one —
 * content should grant them by id, deliberately.
 */
export const RARITY_DRAW_WEIGHT = { common: 12, rare: 3, legendary: 0.5 } as const;

/**
 * How much a relic the player has NEVER SEEN outweighs one already in their
 * collection, when both are the same rarity and both are on the table.
 *
 * Measured, not guessed. Before this existed, 80.9% of runs added nothing at
 * all to the 30-slot grid and a player held 11.8 slots after FORTY careers —
 * because draws are faction-bound, so courting the Covenant means re-drawing
 * Covenant commons you already own, forever. wiki/02 says "the visible gap is
 * the point", but a gap that never closes stops being a near-miss and becomes
 * wallpaper.
 *
 * It is applied WITHIN a rarity, never across one: the rarity is drawn first,
 * on the weights above, and only then does novelty choose between that
 * rarity's candidates. So this cannot change how often a legendary drops,
 * which is what gates Ascension. `engine.test.ts` asserts that invariant
 * rather than trusting this comment.
 *
 * Worth knowing before reaching for a bigger number: raising this is NOT how
 * the collection fills. It bought 0.6 slots at forty runs, because the real
 * constraint is how often a run draws at all, not which relic it gets. So the
 * lever actually pulled was more granting offers (a mid-run favor beat and
 * several decline offers), which took draws to ~1.66 relics a run (from ~1.51
 * before them, ~1.16 at first measurement); NOVELTY_BIAS was left where it was.
 */
export const NOVELTY_BIAS = 6;

// ---------------------------------------------------------------------------
// Ending thresholds — wiki/01 § 7
// ---------------------------------------------------------------------------

/**
 * Consumed by the Pact.
 *
 * Debt reaches this ONLY through cards the player accepted. There is no
 * interest tick: an automatic `+1` per decline era used to live in `run.ts`
 * and was responsible for 29.4% of all careers, arriving on a clock rather
 * than on a choice. What replaced it is `pactWeight` in `offers.ts` — the more
 * you owe, the more often the Covenant's cards come up in the draw.
 */
export const PACT_LIMIT = 7;

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

/**
 * A faction reprisal: standing this far under, and famous enough to be worth
 * the trouble. Six outcomes, one condition — `REPRISAL_BY_FACTION` in
 * `endings.ts` maps each faction to what it does about you.
 *
 * The names are historical: this was `sealed_in_gem`'s trigger and nothing
 * else's, so the constants are still called SEAL_*. `SEAL_FACTION` is no
 * longer "the faction that can end a run" — all six can. It is now the one
 * faction whose reprisal is live in EVERY phase, which is what keeps the
 * Academy's rate where it was measured while the five added beside it stay
 * decline-only (`reprisalLiveFor`).
 */
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
export const COLLECTION_VERSION = 3;
/** Bump when `RunState`'s shape changes; stale in-progress runs are dropped. */
export const RUN_SAVE_VERSION = 1;
