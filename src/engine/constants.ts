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

import type { ArtifactPower } from '../types';

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
 * The least the chosen one can gain in a decline era, however many `vigil`
 * relics are stacked against him.
 *
 * Provenance, because a floor invented to make a number behave is exactly
 * failure mode 6: this one is not a balance target, it is rule 6. `vigil`
 * subtracts from the gain above, and the gain starts at
 * `HERO_THREAT_BASE + HERO_FAME_COEF * notoriety` — which for a quiet wizard
 * early in the decline is around 7. Three `vigil` relics reach that, and
 * without a floor such a run would hold the hero at a standstill forever:
 * `slain_by_chosen_one` would stop being reachable for the builds that most
 * deliberately set out to survive him, and the decline would stop being a
 * decline. One a era is the smallest number that keeps him arriving.
 *
 * It is also the honest reading of the relics themselves. The Orrery sees him
 * coming and the Unbroken Line names his grandmother; neither claims to
 * un-prophesy him.
 */
export const HERO_THREAT_MIN = 1;

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
 * `defenseOf` = floor + notoriety term + relic `wards` + lair term.
 *
 * The floor is high relative to the notoriety term on purpose: relics and the
 * lair ladder are the things you *build*, and they should be what carries a
 * famous wizard through the decline. Notoriety contributes a little (fear
 * deters) but nowhere near enough to pay for the threat it generates.
 *
 * "Relic `wards`" used to say "artifacts" (issue #6): every relic contributed
 * defense and nothing else until relics gained five OTHER powers, which act
 * on the threat side of the comparison rather than on the wards — see
 * `ArtifactPower` in `types.ts`.
 *
 * MOVED 42 -> 48 (issue #42): `slain_by_chosen_one` had drifted to 51.40% on
 * `main`, over its own 45% ceiling, most plausibly because the faction
 * reprisal/crown endings, `good_wizard` and `arch_lich` were all layered on
 * after this floor was last tuned, diluting the population without any
 * matching retune of the base hero-vs-defense math. MEASURED (seeds 1-5,
 * 2000 runs each, on top of #41's offer gating and #43's vow fix, both
 * landed first): `slain_by_chosen_one` went from failing every seed
 * (41.65-51.00% before this change, several seeds over 45%) to passing all
 * five (37.30-44.50%). Ascension stayed inside 1-4% at every seed (1.05-
 * 1.20%); tried 54 first, which pushed Ascension under its floor on two of
 * five seeds (0.45%, 0.95%) by making the game too survivable, so 48 is the
 * larger of the two values that holds both bands rather than a value found by
 * search. `lichdom`'s own reachability, tracked by the same issue, improved
 * on average (this floor also guards pre-rite lich-seekers against the same
 * hero-threat drift) but stayed inside its 2-15% band on only 2 of 5 seeds —
 * see that check's own comment in `scripts/simulate.ts` for why it is read
 * off a noisy 200-run cohort and documented as noisier than its band alone
 * would suggest. Tried raising `DEF_LICH` instead/in addition (80 and 100):
 * both moved `lichdom` no more predictably than seed noise already does, and
 * both destabilized Ascension the same way 54 did here — a sign the failures
 * share a root cause (this floor) rather than needing two separate levers.
 */
export const DEF_FLOOR = 48;
export const DEF_NOTORIETY = 0.3;

/**
 * The lair a wizard's standing in the world entitles them to.
 *
 *   rung = floor(notoriety / LAIR_FAME_DIVISOR
 *                + min(LAIR_RETINUE_CAP, followers / LAIR_RETINUE_DIVISOR))
 *
 * These three lived as bare literals inside `entitledLairRung`, which this
 * file's own header forbids in as many words: "Retune here and nowhere else.
 * If a number appears in a system module, it is a bug." They are named now
 * because the trophy-case target and `DEF_LAIR` pull against each other
 * through them, and a knob you cannot find is a knob you retune by editing
 * the wrong one.
 *
 * Fame dominates, because the fiction is simple: a wizard nobody fears cannot
 * hold a mountain. The retinue term is capped at two rungs — somebody has to
 * carry the furniture, but a crowd is not a castle.
 *
 * MOVED `LAIR_FAME_DIVISOR` 13 -> 14 and `DEF_LAIR` 8 -> 11 (issue #42,
 * second half — `DEF_FLOOR`'s own move above landed first and was not
 * enough on its own). On top of `DEF_FLOOR = 48`, `slain_by_chosen_one` and
 * the trophy case were STILL both failing (seeds 1-2: 46.85-47.75%, over the
 * 45% ceiling; mean lairs held 5.07-5.08, over the 5.0 ceiling) and lichdom
 * reachability was failing harder than before (0.60-1.00%, under the 2%
 * floor) — the higher hero-vs-defense floor made the decline survivable
 * enough that climbing the lair ladder on the OLD, easier terms pushed
 * `mean lairs held` over its own ceiling, which is what let the hero close
 * the gap on the wizards it could still catch.
 *
 * MEASURED (seeds 1-2, `LICH_RELIC_REQUIREMENT` held at 1 throughout — see
 * that constant's own doc comment for why the drop is load-bearing
 * independent of this change): raising `DEF_LAIR` alone (8 -> 10, divisor
 * unchanged) fixed slain (40.40-40.80%) and lichdom (2.20-2.80%) but left
 * the trophy case failing WORSE, not better (5.08-5.10) — a higher lair
 * defense makes climbing more attractive, so wizards sat in high lairs
 * longer. Raising the divisor alone (13 -> 15, `DEF_LAIR` at 10) fixed the
 * trophy case with room to spare (4.48-4.55) but pushed slain back toward
 * its ceiling (44.40-45.05%, failing on one of two seeds) — a slower ladder
 * leaves wizards in low-defense lairs longer, so the hero catches more of
 * them again. The two constants pull against each other through the exact
 * mechanism the comment above names, which is why this was two knobs swept
 * together rather than one found by search.
 *
 * At `DEF_LAIR = 11, LAIR_FAME_DIVISOR = 14`: slain 39.85-40.10% (5 points
 * of headroom under the ceiling), mean lairs held 4.75-4.80 (0.20-0.25
 * under the ceiling), lichdom 2.50-2.70% (comfortable margin over the 2%
 * floor), Ascension 1.15-1.25% (inside 1-4%) — every band this issue tracks
 * passing on both seeds with real margin, not a value sitting on an edge.
 * `DEF_LAIR = 10` with the same divisor (14) also passed everything
 * (slain 42.50%, lairs 4.75-4.79, lich 2.20-2.40, asc 1.10-1.25) with
 * smaller margins on slain and lichdom; 11 was kept over 10 for the wider
 * headroom rather than because 10 failed anything.
 */
export const LAIR_FAME_DIVISOR = 14;
export const LAIR_RETINUE_CAP = 2;
export const LAIR_RETINUE_DIVISOR = 45;

export const DEF_LAIR = 11;

/**
 * A lich is harder to put down.
 *
 * That single number is what makes lichdom a live decision rather than a
 * strict upgrade or a strict trap: a wizard holding a heavy artifact set
 * loses badly by taking the rite, while a fame-chaser holding little to none
 * gains. The right answer depends on the build the player actually assembled,
 * which is the whole point of wiki/01's "This makes it a live decision".
 *
 * MOVED 60 -> 90 for `arch_lich` (issue #25's ending, no wiki line prices
 * it): at 60, a `redeemed`-policy wizard who cleared BOTH the rite's gate and
 * the Good Wizard vow's on the same career (`scripts/simulate.ts`'s dedicated
 * 10,000-run cohort) was overwhelmingly caught by `slain_by_chosen_one` at the
 * literal last era before the age-limit branch was ever reached — the flat
 * post-rite defense was losing the race against a hero threat that keeps
 * ramping every decline era while a lich's stats do not. `arch_lich` read
 * 0.03% of that cohort (an expected wait of ~3,300 careers), the rarest
 * branch in the game by two orders of magnitude and, per the design
 * conversation this was tuned against, rare enough to be practically
 * undiscoverable rather than merely hard.
 *
 * MEASURED (this change, seeds 1-5, `REDEEMED_PROBE_RUNS`-run cohort): the
 * rite-and-vow survival-to-age-limit conversion went from "usually loses to
 * the hero at the finish line" to 46/46, 40/42, 40/45, 32/33, 25/26 —
 * essentially solved — and `arch_lich` landed at 0.19-0.33% across the five
 * seeds (33, 27, 27, 23, 19 per 10,000), an expected wait of roughly 300-500
 * careers rather than 3,300. `lichdom`'s own reachability (the check this
 * constant was ALREADY load-bearing for) moved with it but stayed inside its
 * 2-15% band at every seed checked. Population-wide Ascension, the pact
 * ending, and the decline-erosion check did not move at all — `isLich` runs
 * are ~0.4% of the population, too few to feel it.
 *
 * 90 is a stopping point, not a ceiling found by search: 120 pushed
 * `arch_lich` only to ~0.35-0.39% before plateauing (the remaining ceiling is
 * how often the rite and the vow are cleared on the same career at all, not
 * survival), and kept climbing would mean the rite stops being "NEAR a
 * mid-run artifact set" and becomes a strict upgrade for most builds, which
 * is the exact thing this constant exists to prevent. Reaching the
 * originally-discussed ~1% target would cost more of that tradeoff than the
 * ending is worth; 90 buys most of the survival fix (the acute bug) while
 * `lichdom` visibly stays a real decision.
 */
export const DEF_LICH = 90;

/**
 * How many relics the rite demands — and consumes — before the Worm Below
 * will take you.
 *
 * PROVENANCE: none. No wiki line prices lichdom in relics; this is CLAUDE.md
 * failure mode 6's invented number, arriving labelled rather than chased
 * quietly. The band the design CAN defend: high enough that the rite costs a
 * real collection, not the single legendary a devoted courtier already gets
 * for free from `concordat_worm` at the same `DEVOTION_STANDING` gate; low
 * enough that Lich is not strictly harder to reach than the other five
 * leadership crowns, which ask for standing alone.
 *
 * The requirement and the rite's cost are deliberately the SAME relics — the
 * rite already forfeits every relic held (`becomeLich`) — so this gates the
 * stock it spends rather than promising a fixed benefit an empty vault could
 * still collect (CLAUDE.md failure mode 14). `scripts/validate-content.ts`
 * holds `scripted_the_long_arrangement`'s `minArtifacts` gate to this value
 * the same way it holds `concordat_`/`oath_` gates to `DEVOTION_STANDING`,
 * since content stays a pure data bundle and cannot import this constant.
 *
 * MEASURED (issue #21), `lich` sim policy, `npm run sim -- --seed 1|2`: at 3
 * the rite's own DEVOTION_STANDING gate plus a triple-relic hold together
 * pushed the lich-seeker cohort to 2.31% / 1.08% — the second seed missed the
 * 2-15% reachability band outright. At 2, the same cohort measured 2.31% /
 * 5.38%, both comfortably inside the band, at the SAME `weight: 6` the rite
 * already carried (raising weight instead of lowering this was tried first;
 * it moved seed 1 from 2.31% to only 2.31% again, because the harder gate is
 * a reachability problem the draw weight cannot fix — a seeker who cannot
 * assemble three relics before the age limit is never offered the card at
 * any weight). 2 is also reachable through the SAME `concordat_worm` grant a
 * devoted courtier already collects at this standing, plus just one more
 * relic from anywhere in the run — a real collection, but not a
 * purpose-built vault, which is the "not strictly harder than the other five
 * crowns" half of the band this constant cannot otherwise prove.
 *
 * MOVED 2 -> 1 (issue #42's `DEF_FLOOR`/`DEF_LAIR` retune, above): raising
 * the hero-threat floor a lich-seeker must survive to reach the rite at all
 * pushed this cohort's reachability back under its own floor even at the new
 * `DEF_LAIR = 11, LAIR_FAME_DIVISOR = 14` (1.30%, seed 1) — the same seeker
 * now has to outlast a harder decline before the second relic is even
 * possible. MEASURED (seeds 1-2, `DEF_LAIR = 11, LAIR_FAME_DIVISOR = 14`
 * held constant both ways, so this isolates the relic count alone): at 2,
 * 1.30% / (untested — 1 was already known to fail seed 1, so seed 2 was not
 * run); at 1, 2.50% / 2.70%, both inside the 2-15% band with real margin. A
 * single relic is still a real cost — the rite forfeits it along with every
 * follower — and is still reachable through the same `concordat_worm` grant
 * named above with nothing else required, which keeps Lich from becoming
 * strictly EASIER than the other five crowns rather than merely not harder.
 */
export const LICH_RELIC_REQUIREMENT = 1;

/**
 * The least a follower cost can be haggled down to, and the least a standing
 * loss can be softened to.
 *
 * Same provenance as `HERO_THREAT_MIN` and `LOYALTY_DRIFT_MIN`: not balance
 * targets, but the bound that stops a power becoming an off switch.
 *
 * `haggle` without a floor is a narrower version of failure mode 14 than the
 * one `impliedGatesOf` (`src/engine/conditions.ts`) already closes: the
 * derived gate is computed from the AUTHORED cost, so a wizard still has to
 * hold the full nominal amount to be offered the card at all — but once
 * offered, an uncapped `haggle` can discount what they are actually charged
 * to zero, so the price paid to CLEAR the gate is real and the price the
 * engine then charges is not. The catalog carries 14 points of haggle across
 * the Gilded Hand's four relics, enough on its own to zero a cost in that
 * range. A cost that still costs one follower is a cost.
 *
 * `grace` without a floor is rule 6. `CONTAGION_LOSS` is 0.25, so an ordinary
 * +8 standing gain spills −2 onto each hostile faction; two common grace
 * relics erase that spill entirely, and `applyStanding` drops a zero spill
 * without recording it. Contagion is the route CLAUDE.md names into
 * `sealed_in_gem` — 18.5% of runs — and the five faction reprisals are
 * reachable only through standing going down. A relic may soften that; it may
 * not switch off an ending.
 */
export const SOFTENED_COST_MIN = 1;

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
 * The least a school can drift in a decline era, however much `discipline` is
 * held against it.
 *
 * Same shape and same provenance as `HERO_THREAT_MIN`, for the same reason:
 * `betrayed_by_apprentice` is already the rarest of the original seven, and a
 * relic that stopped the drift dead would close it outright for anyone holding
 * one. Ambition slows; it does not become loyalty.
 */
export const LOYALTY_DRIFT_MIN = 1;

/**
 * A faction reprisal: standing this far under, and famous enough to be worth
 * the trouble. Six outcomes, one condition — `REPRISAL_BY_FACTION` in
 * `endings.ts` maps each faction to what it does about you.
 *
 * The names are historical: this was `sealed_in_gem`'s trigger and nothing
 * else's, so the constants are still called SEAL_*. The condition is now
 * uniform across all six factions and all phases — the five reprisals added
 * beside the Academy's used to be gated `decline-only` (`erasSinceProphecy >
 * 0`), on the reasoning that an ascent-phase dip under the line would end a
 * career before the prophecy the whole arc is built around. That reasoning
 * does not hold up against the Academy's own case, which has fired in every
 * phase since it was the only reprisal in the game: the Academy is not a
 * special case that happened to survive, it is the ORIGINAL rule, and the
 * other five were the ones instrumented with an exception nothing about the
 * mechanic actually justifies. Making every faction the same as the Academy
 * always was is the uniform reading; see `wiki/01_core_loop.md` § 7 for the
 * balance note this reopens.
 */
export const SEAL_MAX_STANDING = -55;
export const SEAL_MIN_NOTORIETY = 55;

/**
 * How far ahead your best faction must be over your second-best before it
 * hands you its leadership at the age limit.
 *
 * PROVENANCE: none. No wiki line authorises this number — wiki/01 § 7 names no
 * leadership endings at all, and the only standing threshold the design states
 * is `DEVOTION_STANDING`. CLAUDE.md failure mode 6 is precisely about a number
 * invented in a task brief and then chased, so this one arrives labelled.
 *
 * What the design CAN defend is the shape, and this constant is the whole of
 * it. Devotion alone is not leadership: `DEVOTION_STANDING` is the reliquary
 * threshold, and a wizard who traded favours widely can sit over it with three
 * factions at once. Being crowned by a faction has to mean you chose ONE and
 * paid for it in the others — the margin is what makes that choice legible in
 * a single number, and it is why the check is a gap rather than a second
 * absolute threshold.
 *
 * The second thing it protects is `retired_to_swamp`. Every age-limit run that
 * clears this becomes a leadership ending instead, so the margin is the only
 * dial standing between "the anticlimactic ending the wiki asks for" and a
 * residue nobody reaches. Its baseline share is 11.65% of runs (233/2000 in
 * `qa/baseline-endings.json`, measured before ANY faction ending existed —
 * reprisal or leadership). That figure is what the value was fitted against.
 *
 * MEASURED (issue #14 slice 2b), not merely asserted: swamp sits at
 * 8.25-8.55% of the population now (seeds 1-2, `npm run sim`), and the number
 * DOES NOT MOVE this constant. It was swept from 5 to 25 and the population
 * share stayed within 0.3 points across the whole range — because the
 * population's eight policies (`POPULATION` in `scripts/simulate.ts`) do not
 * concentrate standing in one faction whether the bar is easy or hard; only a
 * dedicated `courtier_<faction>` does that, and those cohorts are deliberately
 * NOT in the population for the same reason the pariahs are not (see the
 * comment on `POPULATION`). So the gap from 11.65% to ~8.4% is real, but it
 * is downstream of the reprisals and the leadership endings EXISTING at all
 * — six and then five more ways for an age-limit run to avoid the swamp
 * outside of standing-margin play — not of where this margin sits. Chasing it
 * by moving `PATRON_MARGIN` would be CLAUDE.md failure mode 6 in reverse: a
 * target the constant does not actually control.
 *
 * What 20 IS fitted against is the thing it actually governs: whether a
 * player who commits to ONE faction reaches its crown. Every one of the five
 * standing-earned crowns (`courtier_<faction>`, 200-run cohorts) lands
 * between 1.5% and 8.5% at this value, seeds 1-2 — reachable, per faction,
 * without a single cohort reading zero. `npm run sim` is still the
 * instrument for that half of the fit; the value stays 20 because raising it
 * buys nothing on `retired_to_swamp` and only makes the weaker cohorts
 * (`crownlands`, `ashen_covenant`) harder to clear.
 */
export const PATRON_MARGIN = 20;

/**
 * Ascension: the visible unattainable prize.
 *
 * ONE legendary, not two. The original four legendaries sat in the most
 * mutually hostile corner of the faction web, and hostility is contagious, so
 * requiring two meant courting two factions that spend the whole run
 * cancelling each other out — 2000 runs produced 0.05%. That is not a
 * near-miss, it is a closed door, and the empty Ascension slot in the header
 * would have been a promise the game could not keep.
 *
 * One legendary plus Legend-adjacent fame is still the hardest thing in the
 * game, and it stays LEGIBLE: devotion buys the relic, fame buys the threshold,
 * and the two pull against each other. Missing it reads as unfinished business
 * rather than as a bug, which is the whole point of wiki/04 § Near-Miss Tuning.
 *
 * `ASCENSION_MIN_NOTORIETY` moved 84 -> 80 in #22, alongside the Hand and the
 * Choir each gaining a legendary (see `src/content/artifacts.ts`). The two
 * new legendaries barely moved the rate on their own — seeds 1/2/6/7 went
 * 1.25/0.75/0.80/0.70% to 1.40/0.75/0.80/0.75%, still under the 1-4% band —
 * because `ascensionReady`'s notoriety conjunct (~6.5%, seed 2) was tighter
 * than its legendary conjunct (~9.8%, seed 2): most players who reach
 * Legend-adjacent fame never sat on a legendary, wherever it came from.
 * Lowering the notoriety side, not adding a fifth or sixth legendary route,
 * is what widens the intersection. At 80 seeds 1-7 land at 1.15-1.85%, all
 * inside the band with headroom on both sides — see CLAUDE.md failure mode 6
 * before moving this again without a fresh measurement.
 */
export const ASCENSION_MIN_NOTORIETY = 80;
export const ASCENSION_LEGENDARIES = 1;

/**
 * The Good Wizard route (issue #14 slice 5, issue #23).
 *
 * PROVENANCE: none — CLAUDE.md failure mode 6's invented number, arriving
 * labelled rather than chased quietly. No wiki line prices this route; the
 * only thing the design can defend is the SHAPE (a phase-2 reputation gate
 * lower than the phase-3 resolution gate, a small shared `illActs` cap that
 * does not demand perfection) and that it must be reachable by a dedicated
 * `saint` sim policy, per `scripts/simulate.ts`'s cohort probe.
 *
 * `GOOD_WIZARD_ILL_CAP` is shared by both gates rather than tightening
 * further at the resolution: the cap exists so an early lapse cannot
 * permanently close the route (which would break the "can only ever ADD an
 * ending" guarantee the whole exception rests on — see the doc comment on
 * `Effect`'s `goodAct`/`illAct` in `types.ts`), not so the route demands a
 * perfect run.
 *
 * MEASURED (issue #23), `saint` sim policy, `npm run sim -- --seed 1|2`, at
 * these values: `good_wizard` reached in 1.50% of the 200-run cohort at both
 * seeds — comparable to the other cohort-shaped endings' rates (`lichdom`
 * 2.31%, `consumed` ~1%) and reproducible across seeds, which is the bar
 * rule 6 sets.
 *
 * TRIED FIRST AND REVERTED: marking the ungated `virtue_obscure_*` offers
 * `scripted: true` at weight 6 to raise this further. Unlike the gated
 * `virtue_reputation_*`/`virtue_resolution_*` cards, an ungated offer's
 * weight competes in EVERY run's pool, not only a qualifying one —
 * `buildOfferPool` filters on `requires` before the scripted bonus applies,
 * so a gated card's weight is invisible to a run that has not earned it, but
 * an ungated card's is not. At that setting the obscure cards crowded out
 * enough of the shared pool to crash Ascension from 1.25% to 0.10% and push
 * `slain_by_chosen_one` from 47.70% to 63.30% — population-wide, for a
 * mechanic that measures only a 200-run cohort. Reverted to ordinary weight;
 * see the doc comment on `VIRTUE_OBSCURE` in `src/content/offers/virtue.ts`.
 */
export const GOOD_WIZARD_REPUTATION_GOOD = 2;
export const GOOD_WIZARD_RESOLUTION_GOOD = 3;
export const GOOD_WIZARD_ILL_CAP = 1;

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export const COLLECTION_KEY = 'evil-wizard-sim:collection';
export const RUN_KEY = 'evil-wizard-sim:run';
/** Bump when `Collection`'s shape changes, and extend `migrateCollection`. */
export const COLLECTION_VERSION = 5;
/**
 * Bump when `RunState`'s shape changes; stale in-progress runs are dropped.
 *
 * 1 -> 2 (issue #23): added `goodActs`, `illActs`, `goodWizardVowed`.
 */
export const RUN_SAVE_VERSION = 2;

/**
 * What each relic power may NOT reduce its quantity below.
 *
 * The three constants above are deliberately separate values — they are in
 * different units (threat per era, loyalty points per era, followers and
 * standing points) and are independently retunable, so collapsing them would
 * couple retunes that have nothing to do with each other. What was missing is
 * a home for the INVARIANT all of them implement: a relic power softens a
 * quantity, and may not switch it off.
 *
 * That rule was written four times across three files and stated nowhere, and
 * the evidence it needed a name is that it was forgotten twice inside the one
 * sprint that introduced it — `haggle` shipped able to zero a follower cost
 * and `grace` able to erase the contagion spill. A `Record` over the union
 * means a seventh power cannot compile without someone deciding its floor.
 *
 * `wards` is `null` because it is the one power that ADDS to a total rather
 * than reducing one; there is nothing for it to floor. `undimmed` is 0 because
 * its quantity — the decline's notoriety erosion — is the one a relic IS
 * permitted to stop outright, which is a design decision and now reads as one
 * instead of as a bare literal in a system module.
 */
export const POWER_FLOOR: Record<ArtifactPower['p'], number | null> = {
  wards: null,
  vigil: HERO_THREAT_MIN,
  undimmed: 0,
  discipline: LOYALTY_DRIFT_MIN,
  haggle: SOFTENED_COST_MIN,
  grace: SOFTENED_COST_MIN,
};
