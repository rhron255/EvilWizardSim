/**
 * THE CONTRACT.
 *
 * Every module in this game — engine, UI, content — is written against these
 * shapes. Field names and union members are frozen; changing one is a
 * cross-cutting change, not a local one.
 *
 * Derived from wiki/02_data_models_and_content-1.md, with two deliberate
 * hardenings called for by wiki/04_operational_behaviors-1.md:
 *
 *   1. `Effect` is STRUCTURED DATA, never prose. The offer renderer walks
 *      effects and prints them. An effect that is not in this union cannot be
 *      authored, so an *undisclosed* effect cannot be authored either.
 *
 *   2. `OfferOption` is a discriminated union where the `gamble` variant
 *      REQUIRES `onFailure`. The wiki asks that undisclosed downside be
 *      "impossible to author, not merely discouraged" — this is that, enforced
 *      by the type checker rather than by review.
 */

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/** The fixed recurring cast. Same six every run — that is the whole point. */
export type FactionId =
  | 'ashen_covenant'
  | 'gilded_hand'
  | 'pale_academy'
  | 'verdant_choir'
  | 'crownlands'
  | 'worm_below';

/**
 * Every biography the game can write.
 *
 * The first seven are wiki/01 § 7's original set. The five below them are the
 * FACTION REPRISALS added by issue #14: standing is the most-touched system in
 * the game and reached exactly one ending, so `sealed_in_gem` was generalised —
 * each faction now resolves the matter permanently once you are far enough
 * under it and famous enough to be worth the trouble. `sealed_in_gem` is the
 * Pale Academy's member of that set, not a special case; see
 * `REPRISAL_BY_FACTION` in `src/engine/endings.ts`.
 *
 * The last block is the same generalisation pointing the other way: what a
 * faction does about a wizard who spent a career at the TOP of its standing
 * rather than the bottom. Only five ids are added for six factions, because
 * `lichdom` is the Worm Below's member of that set — the Worm already crowns
 * its devotees, and it does so through a rite the player accepted rather than
 * through a standing total, so the set is six and the additions are five. See
 * `LEADERSHIP_BY_FACTION` in `src/engine/endings.ts`.
 */
export type EndingId =
  | 'slain_by_chosen_one'
  | 'sealed_in_gem'
  | 'betrayed_by_apprentice'
  | 'lichdom'
  | 'retired_to_swamp'
  | 'consumed_by_pact'
  | 'ascension'
  // --- faction reprisals (issue #14) ---------------------------------------
  | 'eternally_repurposed'
  | 'liquidated'
  | 'turned_to_fertilizer'
  | 'exiled_and_overrun'
  | 'consumed'
  // --- faction leadership (issue #14) — plus `lichdom`, the Worm's ---------
  | 'contract_writer'
  | 'grand_arbiter'
  | 'archmage'
  | 'archdruid'
  | 'overthrown_the_kingdom'
  /**
   * The Good Wizard (issue #14 slice 5, issue #23) — an obscure route open to
   * a consistently constructive career, age-limit-only, checked ahead of
   * `lichdom`. An ordinary ending: no `Ending` field marks it out, and the
   * collection's locked-slot redaction hides it exactly like the other
   * twelve until it is reached.
   */
  | 'good_wizard'
  /**
   * Arch-Lich (issue #25) — the ONE age-limit outcome the good-wizard vow and
   * the lich rite can both be true for at once, and the reason neither of the
   * two branches above may simply win outright.
   *
   * Before this existed, `checkEndings` read `goodWizardVowed` first and
   * `isLich` second, so a lich who then took `virtue_resolution_the_quiet_
   * ledger` (decline, `minGoodActs: 3`, `maxIllActs: 1` — neither gate
   * excludes a lich) got plain `good_wizard`: the relics and followers the
   * rite already forfeited stayed forfeited, and the ending said nothing
   * about it, an undisclosed discard of a transformation the player paid a
   * real, mechanical price for. Checked ahead of BOTH `good_wizard` and
   * `lichdom` for exactly that reason: it is not a tiebreak between them, it
   * is the true answer for a wizard who is both, and neither of the plain
   * branches is honest about that career.
   */
  | 'arch_lich';

/**
 * A cosmetic palette the player has unlocked and may select.
 *
 * DERIVED from `EndingId` rather than declared beside it: every ending grants
 * exactly one theme, so the two id spaces are the same id space. A separate
 * union — or a `Collection.unlockedThemes` array — would be a second list to
 * keep in step with `endingsSeen`, which is the shape that drifts.
 *
 * `default` is the shipped warm dark. It is never locked and never earned.
 */
export type ThemeId = 'default' | EndingId;

export type Rarity = 'common' | 'rare' | 'legendary';

export type Phase = 'ascent' | 'decline';

/** Which phase(s) an offer may surface in. */
export type OfferPhase = Phase | 'any';

export type Outcome = 'success' | 'failure' | 'deterministic';

// ---------------------------------------------------------------------------
// Effects — structured, therefore always renderable
// ---------------------------------------------------------------------------

/**
 * A single mechanical consequence.
 *
 * `t` is the discriminant; `v` is a signed magnitude where one applies.
 * Everything the player's numbers can do is in this union. If you find
 * yourself wanting an effect that is not here, add a member — do not smuggle
 * it into prose, because prose is not rendered as a consequence.
 */
export type Effect =
  | { t: 'notoriety'; v: number }
  | { t: 'followers'; v: number }
  | { t: 'standing'; factionId: FactionId; v: number }
  /** Grant one specific artifact by id. */
  | { t: 'artifact'; artifactId: string }
  /**
   * Grant a random not-yet-held artifact from a faction.
   *
   * `rarity` selects that rarity EXACTLY — `{ rarity: 'legendary' }` grants a
   * legendary. It was briefly a cap, which read the same to an author but meant
   * the draw fell back through a weighted table that returns a common ~97% of
   * the time; legendaries effectively never dropped and Ascension was
   * unreachable in 2000 simulated runs. Omit `rarity` for a weighted draw.
   */
  | { t: 'artifactFrom'; factionId: FactionId; rarity?: Rarity }
  /** Lose a random held artifact. */
  | { t: 'loseArtifact' }
  | { t: 'apprentices'; v: number }
  | { t: 'loyalty'; v: number }
  | { t: 'pactDebt'; v: number }
  | { t: 'heroThreat'; v: number }
  /** Move up or down the authored lair ladder. */
  | { t: 'lairTier'; v: number }
  /**
   * Take the lichdom branch.
   *
   * wiki/01_core_loop.md is ambiguous on its face — lichdom is listed as an
   * ending, yet it is also "the branch that cheats the decline phase" whose
   * "Notoriety does not decay." Those only reconcile if lichdom TRANSFORMS the
   * run rather than terminating it: every artifact is forfeited, every follower
   * deserts, decay stops, and the run continues to whatever end it reaches.
   * Terminating on the spot would make it a quit button, which is neither a
   * cheat of the decline phase nor the "live decision" the wiki asks for.
   *
   * The engine owns the forfeiture, so content must NOT hand-roll it with a
   * pile of `loseArtifact` entries and a negative-followers sentinel.
   */
  | { t: 'becomeLich' }
  /**
   * A constructive or destructive act, counted toward the Good Wizard route
   * (issue #23) — hidden `RunState` counters `goodActs`/`illActs`.
   *
   * THE ONE DELIBERATE EXCEPTION TO THIS FILE'S OWN RULE: the doc comment two
   * lines up says an effect exists so nothing is ever smuggled into prose
   * undisclosed, and `applyEffects` in `src/engine/effects.ts` is written to
   * violate that on purpose for exactly these two variants — they never reach
   * `EffectApplication.applied`, so no card, ledger row or resolution ever
   * prints one. CLAUDE.md records why: this route can only ever ADD an
   * ending, never end a run early, never close a door, never move any other
   * threshold. `conditionMet`'s `minGoodActs`/`maxIllActs` cases are the ONLY
   * other place either counter is read.
   *
   * **If a future change makes these gate anything else — a defense term, an
   * offer weight, any condition besides the two above — this exception is
   * void and the counters must be disclosed like every other stat.** See
   * `src/engine/goodWizard.test.ts`, which is the test that would catch it.
   */
  | { t: 'goodAct'; v: number }
  | { t: 'illAct'; v: number }
  /**
   * The Good Wizard resolution's own commitment (issue #23) — mirrors
   * `becomeLich` exactly: it does NOT terminate the run. It sets
   * `RunState.goodWizardVowed`, which `checkEndings` reads at the age limit,
   * ahead of the lich branch. Unlike `goodAct`/`illAct` above, this one is
   * fully disclosed — by the resolution card, the player is knowingly
   * committing, the same way a lich knowingly takes the rite.
   */
  | { t: 'vowGoodWizard' }
  /** Terminate the run immediately with this ending. */
  | { t: 'ending'; endingId: EndingId };

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

/**
 * One choice card.
 *
 * `certain` resolves deterministically. `gamble` rolls against `odds` and MUST
 * declare both branches — the type system is the guard on the odds-display
 * rule, which wiki/04_operational_behaviors-1.md calls "the single most
 * important rule in the codebase."
 *
 * A gamble must also NARRATE both branches. `successText`/`failureText` were
 * optional, and the 21 gambles that supplied neither had their outcome written
 * by `src/engine/deeds.ts`, which picked a tail from a four-entry pool by hash
 * — so a quarter of unauthored failures resolved to "It does not.", a clause
 * with no main verb, bolted onto a label it had no relation to. That line is
 * the resolution card's pull quote AND the ledger's Deeds column, the only
 * prose in the element wiki/01 calls "the single most important UI element".
 * Prose generated from a hash cannot refer to the offer it belongs to, so
 * these are required and the generator is gone.
 */
export type OfferOption =
  | {
      kind: 'certain';
      label: string;
      effects: Effect[];
      /** Optional one-line flavor shown on resolution. */
      resultText?: string;
    }
  | {
      kind: 'gamble';
      label: string;
      /** 0..1 exclusive. Rendered as a percentage before the player commits. */
      odds: number;
      onSuccess: Effect[];
      onFailure: Effect[];
      /** Required, and non-empty — `validate-content` rejects `''`. */
      successText: string;
      failureText: string;
    };

/** Gate conditions for whether an offer may enter the sampling pool. */
export type Condition =
  | { c: 'minNotoriety'; v: number }
  | { c: 'maxNotoriety'; v: number }
  | { c: 'minStanding'; factionId: FactionId; v: number }
  | { c: 'maxStanding'; factionId: FactionId; v: number }
  | { c: 'minApprentices'; v: number }
  | { c: 'minFollowers'; v: number }
  | { c: 'minPactDebt'; v: number }
  | { c: 'minLairTier'; v: number }
  | { c: 'minEraIndex'; v: number }
  | { c: 'hasArtifact'; artifactId: string }
  | { c: 'holdsAnyArtifact' }
  | { c: 'minArtifacts'; v: number }
  /**
   * The Good Wizard route's gates (issue #23). Reads `RunState.goodActs` /
   * `illActs` — the ONLY conditions permitted to. See the doc comment on
   * `Effect`'s `goodAct`/`illAct` variants for why that restriction matters.
   */
  | { c: 'minGoodActs'; v: number }
  | { c: 'maxIllActs'; v: number }
  /**
   * Unpaid Purse's gate (issue #80, slice 3 of #77): "if under N Followers".
   * The mirror of `minFollowers` that a relic `if` needed and no offer gate
   * ever had a reason to ask for before.
   */
  | { c: 'maxFollowers'; v: number }
  /**
   * The Weather Leash's own gate (issue #82, slice 5 of #77): true only
   * during the decline phase. Nothing needed this before — every existing
   * phase restriction lives on `Offer.phase` itself, which an era-end relic
   * trigger (evaluated against the run, not an offer) has no equivalent of.
   */
  | { c: 'declinePhase' };

export type Offer = {
  id: string;
  title: string;
  /** Flavor. Comedic register. The numbers underneath stay straight-faced. */
  body: string;
  phase: OfferPhase;
  /** Optional faction affiliation — drives standing-weighted surfacing. */
  factionId?: FactionId;
  requires?: Condition[];
  /** 2-4. Enforced by scripts/validate-content.ts. */
  options: OfferOption[];
  /** Higher surfaces more often before standing weighting. Default 1. */
  weight?: number;
  /** Marks the scripted prophecy set piece and other non-sampled offers. */
  scripted?: boolean;
};

// ---------------------------------------------------------------------------
// Content entities
// ---------------------------------------------------------------------------

export type Faction = {
  id: FactionId;
  name: string;
  blurb: string;
  /** What they take, in player-facing terms. */
  demands: string;
  hostileTo: FactionId[];
  /** Short adjective used in ledger deed lines. */
  adjective: string;
  /**
   * One line naming this faction's relic THEME (issue #80's Necrolexicon
   * acceptance item) — e.g. the Covenant: "Its relics pay you for what you
   * owe." Never a rate and never a specific relic; authored for all six at
   * once, since it is faction-level prose rather than something gated on how
   * many of that faction's relics have a power yet. Required, so the
   * compiler names every faction the moment a seventh is ever added — the
   * same reason `Ending.hint` is required rather than optional.
   */
  reliquary: string;
};

/**
 * A relic. Its wards contribution is a flat function of `rarity` alone —
 * `RELIC_WARDS` in `src/engine/constants.ts` — not an authored number on the
 * relic itself. That frees `id`/`name`/`flavorText` to carry the relic's
 * actual identity (its power, in slices 3-5 of issue #77) instead of
 * restating a defense figure in prose (issue #79, CLAUDE.md failure mode 4).
 */
export type Artifact = {
  id: string;
  name: string;
  /** Every artifact belongs to a faction — this is what makes routing legible. */
  factionId: FactionId;
  rarity: Rarity;
  flavorText: string;
  /**
   * What this relic does, once held — issue #77's power framework,
   * completed by slice 5 (issue #82). Non-null: every one of the 32 relics
   * now has a power, and the compiler names any future relic that ships
   * without one — the same reasoning `Ending.hint` was made required for.
   * It was `RelicPower | null` through slices 3-4, while most of the
   * catalog still had nothing authored; see git history for that shape.
   */
  power: RelicPower;
};

// ---------------------------------------------------------------------------
// Relic powers — issue #77's power framework (slice 3: issue #80)
// ---------------------------------------------------------------------------

/**
 * The gate conditions an offer's own `requires` already uses, reused so a
 * relic's `if` never invents a second vocabulary for "is this true right
 * now".
 */
export type RelicTriggerTiming =
  /**
   * Evaluated once per era, against the run AFTER the chosen option's own
   * effects have landed (see `src/engine/relics.ts`) — "reacts to the
   * choice", in #77's own words. Combined with `once`, this is how Ashen
   * Signature finds "the FIRST choice that adds Pact Debt": debt starts at 0
   * and only a choice ever moves it, so `if: [{ c: 'minPactDebt', v: 1 }]`
   * plus `once: true` names exactly that moment without a bespoke
   * "which effect type did this option carry" primitive.
   */
  | 'onChoice'
  /** Evaluated once at the end of every era, independent of what was chosen. */
  | 'eraEnd'
  /**
   * Pocketful of Dark (issue #82, slice 5): fires at the SAME moment
   * `resolveChoice`'s own era-end block narrates the hero's approach for the
   * first time — immediately after `heroBandSeen` advances past `calm`, so
   * "the first time the hero draws close" is the identical event the
   * header's own beat already marks, not a second reading of hero threat
   * invented here (see `src/engine/relics.ts`'s `applyHeroApproachTriggers`).
   * Deliberately absent from the offer card's pre-commit preview
   * (`projectReactions`): whether the band crosses THIS era depends on decay
   * and threat gain, which that preview does not compute — see its own doc
   * comment. That is an accepted silent gap, the same one every other
   * era-end relic reaction already has on the offer card per `RelicPage`'s
   * own doc comment ("an accepted gap").
   */
  | 'heroApproach';

/**
 * What a `passive` power changes about a base rule.
 *
 * `contagionLossMultiplier` predates issue #81's `factionId` field (issue
 * #80's Footnote That Bites, unscoped — it multiplies contagion off ANY
 * faction's gain). Old-Growth Charter ("gaining CHOIR standing costs its
 * enemies nothing") needs the narrower reading, so the field is optional and
 * scopes the multiplier to gains in that one faction alone; omitted keeps
 * Footnote's own unscoped behaviour unchanged. `relicRules` combines a held
 * unscoped modifier and a held scoped one multiplicatively for the faction
 * the scoped one names, same as two unscoped ones already combine.
 */
export type RelicPassiveModifier =
  | {
      t: 'contagionLossMultiplier';
      /**
       * Multiplies `CONTAGION_GAIN` alone — the rate that spills a LOSS onto a
       * COURTED faction's enemies (`applyStanding`, `src/engine/effects.ts`).
       * The mirror direction (losing standing with a faction warms its enemies —
       * a gain for them) uses `CONTAGION_LOSS`, untouched by this multiplier: it
       * is not a loss to halve. Issue #80 review: this comment previously said
       * the opposite, which is the same confusion 391b6c6 fixed in the engine
       * itself — the next reader who trusted this comment over `effects.ts`
       * would "fix" the engine back to the bug.
       */
      v: number;
      factionId?: FactionId;
    }
  /**
   * Unbroken Line (issue #81): "your fame feeds the hero's threat at half the
   * rate." Multiplies `HERO_FAME_COEF * notoriety` alone inside
   * `threatGainFor` — the ramp-over-time term (`HERO_THREAT_BASE` +
   * `HERO_THREAT_RAMP`) is untouched, because the relic's own wording names
   * fame, not the clock.
   */
  | { t: 'fameThreatMultiplier'; v: number }
  /** The Gilded Thumb (issue #82): multiplies a POSITIVE `followers` effect alone — never a cost. */
  | { t: 'followersGainMultiplier'; v: number }
  /** The Second Stomach (issue #82): multiplies a NEGATIVE `followers` effect alone — never a gain. */
  | { t: 'followersCostMultiplier'; v: number }
  /**
   * Chalk of the Last Lecture (issue #82): a flat reduction to `decayFor`'s
   * result, floored at 0 there — additive across multiple holders, the same
   * combination rule as every other passive, though only one relic authors
   * this today.
   */
  | { t: 'decayReduction'; v: number }
  /**
   * Spectacles of the Third Reading (issue #82): added directly to a
   * gamble's odds before the roll, the same seam `effectiveOdds` already
   * gives the Pale Orrery's `armsForesight`. Additive across multiple
   * holders; `effectiveOdds` clamps the sum to 1.
   */
  | { t: 'gambleOddsBonus'; v: number }
  /**
   * The Counterfeit Soul (issue #82): a `loseArtifact` effect always names
   * THE HOLDER of this modifier first, while it is held, instead of a random
   * pick — see `relicRules`' `lossPriorityArtifactId` and the `loseArtifact`
   * case in `src/engine/effects.ts`. No `v`: "the first relic a choice would
   * take is this one" names itself, nothing else to parameterise.
   */
  | { t: 'loseArtifactPriority' }
  /**
   * The Patient Lantern (issue #82): excluded from the lich rite's
   * forfeiture — see `forfeitForLichdom` in `src/engine/effects.ts`. The one
   * relic power that changes what `becomeLich` takes, rather than a rate or
   * a threshold.
   */
  | { t: 'survivesLichRite' }
  /**
   * The Tenure Ring (issue #82, double-edged): clamps ONE faction's standing
   * to `[min, max]` for as long as the relic is held — narrower on BOTH
   * ends than the ordinary `[STANDING_MIN, STANDING_MAX]` range, never
   * wider. `applyStanding` (`src/engine/effects.ts`) reads this through
   * `standingBandFor`, the one function both the engine and the header
   * (`src/components/run/allegiances.ts`) read so the clamp and its display
   * never drift apart. `drawArtifact` derives "double-edged" from a
   * narrowed `max` here, never from an authored flag — see `isDoubleEdged`.
   */
  | { t: 'standingBand'; factionId: FactionId; min: number; max: number }
  /**
   * The Writ of Tolerated Existence (issue #82): this faction's reprisal
   * needs standing at or under `v` instead of the ordinary
   * `SEAL_MAX_STANDING`. Read through `reprisalThresholdFor`, the shared
   * function `reprisalEnding` (`src/engine/endings.ts`) and the header
   * (`src/components/run/allegiances.ts`) both consult, so the engine's
   * trigger and the player's warning can never name two different lines.
   */
  | { t: 'reprisalThreshold'; factionId: FactionId; v: number };

/**
 * What a relic's own power may do to the run — deliberately narrower than
 * `Effect`. Excludes five members a relic must never touch: `ending`,
 * `becomeLich` and `vowGoodWizard` are the PLAYER's own irreversible
 * commitments, and `goodAct`/`illAct` are the Good Wizard route's one
 * deliberate disclosure hole (see the doc comment on `Effect` above) — a
 * relic silently moving either would open a SECOND undisclosed route into an
 * ending, which that rule-1 exception was never written to cover.
 */
export type RelicEffect = Exclude<
  Effect,
  { t: 'ending' } | { t: 'becomeLich' } | { t: 'vowGoodWizard' } | { t: 'goodAct' } | { t: 'illAct' }
>;

/**
 * What a relic does on its own, once held.
 *
 * Declared as the full four-member union now (issue #80, slice 3 of #77),
 * even though this slice authors only `trigger` and `passive` instances —
 * the contract only gets opened once this way rather than being reopened for
 * `active` in slice 4 and for whatever a `lifeline` power turns out to need
 * after it.
 *
 * Every kind obeys the same two rules #77 sets for the whole framework: a
 * relic never asks a question (no new decision screens — `active` is a
 * single tap with no follow-up choice, everything else is automatic), and it
 * responds only to the player's own choices and the passing of eras, never to
 * another relic's effects — `src/engine/relics.ts` is where that second rule
 * is actually enforced, not just documented.
 */
export type RelicPower =
  /**
   * Changes a base rule for as long as the relic is held. No event, no roll,
   * nothing to disclose beyond the relic's own power line, which every
   * surface that shows a relic already prints. Every held passive combines —
   * see `relicRules` in `src/engine/relics.ts` — with neutral defaults, so
   * holding none at all reproduces today's numbers exactly.
   */
  | { kind: 'passive'; modifier: RelicPassiveModifier }
  /**
   * Fires automatically. `if` gates it beyond `when` alone, read against the
   * run's AMBIENT state at `when` — era's end, or after this choice's own
   * effects landed. `once`, when true, fires the power the first time it
   * qualifies and never again this run — `RunState.relicState` remembers
   * that, so it survives even a later era where `if` is no longer true.
   *
   * `watchesPositive`, `onChoice` only: fires only when the CHOSEN OPTION's
   * OWN landed effects included a positive change of this type — never the
   * ambient state `if` reads. The distinction is load-bearing, not
   * cosmetic: `if: [{ c: 'minPactDebt', v: 1 }]` reads true the instant ANY
   * OTHER source (an origin's own starting grant, a different relic) has
   * ever put debt at or above 1, so a relic meant to react to "the first
   * CHOICE that adds debt" would instead fire on the very first era of a
   * run that simply started in debt, whether or not that era's choice
   * touched debt at all. `watchesPositive` reads the option's landed
   * effects directly (see `src/engine/relics.ts`), which is what "the
   * chosen option's landed effects" in #77's own framework description
   * means literally. Typed to `RelicEffect['t']`, not `Effect['t']`, for the
   * same reason `effects` is: a relic must not react to a hidden Good
   * Wizard counter or a run-ending effect either.
   */
  | {
      kind: 'trigger';
      when: RelicTriggerTiming;
      if?: Condition[];
      watchesPositive?: RelicEffect['t'];
      /**
       * Issue #82: the mirror of `watchesPositive` for a relic that reacts
       * to a COST rather than a gain — Bone Crown ("costs you an
       * Apprentice"), Shallow Worm's Tooth ("costs you Followers"). Same
       * source as `watchesPositive` (the CHOSEN option's own landed
       * effects, `onChoice` only) and the same reason it exists: an
       * ambient `if` on the stat's floor would fire on a run that merely
       * STARTED there, not on the choice that actually spent it. Checks
       * `e.v < 0` where `watchesPositive` checks `e.v > 0` — never both on
       * the same power, they read opposite signs of the same effect type.
       */
      watchesNegative?: RelicEffect['t'];
      /**
       * Issue #82: watches for the PRESENCE of an effect type that carries
       * no magnitude to sign — `loseArtifact` chief among them (Appraiser's
       * Monocle, Seed That Remembers: "when a choice costs you a relic").
       * `watchesPositive`/`watchesNegative` both require `'v' in e`, which
       * `loseArtifact` never satisfies; this is the third, magnitude-free
       * reading of "the chosen option's own landed effects."
       */
      watchesEffect?: RelicEffect['t'];
      /**
       * Scopes `watchesPositive`/`watchesNegative` to ONE faction, read off
       * a `standing` effect's own `factionId` — Confiscated Banner ("lowers
       * CROWNLANDS standing", not any faction's contagion spill included).
       * Ignored unless the watched type is `'standing'`.
       */
      watchesFactionId?: FactionId;
      /**
       * Fires only when the era's OFFER itself belonged to this faction —
       * Antler Baton ("when you answer a Choir offer"). Distinct from every
       * watch above: those read the choice's CONSEQUENCES; this reads which
       * CARD it was, so `resolveChoice` threads the offer's own `factionId`
       * in alongside `choiceEffects` rather than deriving it from them.
       */
      watchesOfferFaction?: FactionId;
      /**
       * Fires only when the choice was a GAMBLE that resolved to failure —
       * Censer of Small Regrets ("when you lose a gamble"). The one watch
       * that reads the roll's OUTCOME rather than its effects. `onChoice`
       * only, like every watch above.
       */
      watchesGambleFailure?: boolean;
      once?: boolean;
      effects: RelicEffect[];
      /**
       * Long Appetite (issue #81): "+1 Notoriety per 10 Followers spent" is
       * proportional to the choice's own cost, which a fixed `effects` list
       * cannot express. `watches` reads the same source `watchesPositive`
       * does — the CHOSEN OPTION's own landed effects, `onChoice` only — for
       * a NEGATIVE instance of that type; `perUnit` floors its magnitude into
       * whole units, and `perUnitEffect` is multiplied by that unit count and
       * applied on top of `effects`. Still fully data, still projectable:
       * `relics.ts` runs the identical computation in the preview and for
       * real, the same guarantee `effects` alone already had.
       */
      scaled?: {
        watches: RelicEffect['t'];
        perUnit: number;
        /** Constrained to a numeric-magnitude effect — there is a unit count to multiply it by. */
        perUnitEffect: Extract<RelicEffect, { v: number }>;
      };
    }
  /**
   * A player-initiated Use button (issue #81, slice 4 of #77 — deferred by
   * slice 3 to avoid the "written but never wired" trap, CLAUDE.md failure
   * mode 2). `activateRelic` in `src/engine/relics.ts` applies `cost` (if any,
   * and only if the run can afford it), then `grants`/`armsForesight` (if
   * either is set), then `effects`, and records the relic in
   * `RunState.relicState.spent` so it fires at most once per career.
   *
   * `grants` and `armsForesight` exist because two real actives need
   * something `RelicEffect[]` cannot express, structurally rather than by
   * hard-coding either relic's id in the engine:
   *
   *   - Final Ledger: "a random rare relic from your best-standing faction" —
   *     WHICH faction is decided at the moment of use, not authored.
   *     `grants: { rarity }` names the rarity; `activateRelic` finds the
   *     faction and draws.
   *   - Pale Orrery: "your next gamble succeeds" — a flag on
   *     `RunState.relicState.foresight`, not a stat `applyEffects` knows how
   *     to move. `armsForesight: true` sets it.
   *
   * Both are still structured data `relicPowerText` can derive a line from,
   * same as any `RelicEffect` — see `src/components/meta/relicPower.ts`.
   */
  | {
      kind: 'active';
      cost?: RelicEffect[];
      effects: RelicEffect[];
      grants?: { rarity: Rarity };
      armsForesight?: boolean;
      /**
       * The Key to No Particular Door (issue #82): redraws this era's
       * offer. A pure engine action rather than a `RelicEffect` — nothing on
       * `RunState` a card could disclose moves, only the salt `nextOffer`
       * (`src/engine/offers.ts`) mixes into its own sampling stream, so the
       * SAME era can land on a different, still-seeded card. See
       * `RelicState.offerRedrawSalt`.
       */
      redrawsOffer?: boolean;
    }
  /**
   * An automatic, one-time rescue from a specific ending (issue #82, slice 5
   * of #77 — deferred by slices 3-4 as a bare placeholder). Checked once,
   * right after `checkEndings` finds a terminal state
   * (`src/engine/relics.ts`'s `applyLifeline`, called from `resolveChoice`):
   * if a held, UNSPENT lifeline `covers` that ending, it is spent
   * (`RunState.relicState.firedOnce` — the same one-time ledger an automatic
   * `trigger` uses, since a lifeline is automatic too, never
   * player-initiated), its `recovery` is applied, and the run continues.
   *
   * NEVER changes the THRESHOLD the ending itself checks — `recovery`
   * repositions the STAT, not the ceiling or floor it was measured against,
   * so the very same ending can still be reached again later the ordinary
   * way. That is what "lifeline", not "immunity", means here.
   */
  | { kind: 'lifeline'; covers: EndingId[]; recovery: LifelineRecovery };

/**
 * What a lifeline restores, in place of the ending it cancels — narrower
 * than `RelicEffect` because both real lifelines need to SET a stat off a
 * value only known at the moment it fires (the current wards, the
 * triggering faction), which no fixed authored delta can express. Kept a
 * closed, purpose-built union rather than a generic "set stat to value"
 * primitive — the same restraint `active`'s `grants`/`armsForesight` show:
 * open the vocabulary only as far as a REAL lifeline needs it, per issue
 * #82's own two.
 */
export type LifelineRecovery =
  /** Portcullis Tooth: hero threat drops to `fraction` of the CURRENT wards, computed at the moment it fires. */
  | { t: 'threatToWardsFraction'; fraction: number }
  /** Root of the Standing Vote: the reprisal's own triggering faction resets to `v`. */
  | { t: 'standingReset'; v: number };

/**
 * Tracks a run's `once` triggers, so a relic like Ashen Signature fires
 * exactly one time ever rather than once per era its `if` happens to be true.
 */
export type RelicState = {
  /** Artifact ids whose `once` trigger has already fired this run. */
  firedOnce: string[];
  /**
   * Artifact ids whose `active` power has already been used this run (issue
   * #81). Distinct from `firedOnce`, which tracks an AUTOMATIC trigger's own
   * one-time firing — an active is player-initiated, and "at most once per
   * career" is enforced against this list, not that one.
   */
  spent: string[];
  /**
   * True while the Pale Orrery's "your next gamble succeeds" is armed (issue
   * #81). Read by `effectiveOdds` (`src/engine/relics.ts`) and cleared by
   * `resolveChoice` the moment a gamble actually resolves, so it consumes
   * exactly the next gamble the player rolls, not every gamble for the rest
   * of the career.
   */
  foresight: boolean;
  /**
   * Bumped by one each time the Key to No Particular Door's active redraws
   * the era's offer (issue #82). Mixed into `nextOffer`'s own sampling
   * stream (`src/engine/offers.ts`) as an extra salt, so the SAME
   * `(seed, eraIndex)` can land on a different offer without `nextOffer`
   * losing its purity: two runs with identical seeds and identical choices
   * — including whether this was used — still resolve identically.
   */
  offerRedrawSalt: number;
};

export type Lair = {
  id: string;
  name: string;
  /** 0-based rung on the ladder. Names carry the progression. */
  tier: number;
  blurb: string;
};

/**
 * One Necrolexicon entry explaining a rule the player needs during a run.
 *
 * Static reference prose, not run state — unlike a faction or a relic, a
 * mechanic has no discovery gate: `requires` reads "the run screen currently
 * uses this term with no in-place explanation", not "the player has seen
 * this". Keep `blurb` to what a term MEANS, never to the odds of reaching a
 * particular threshold — that is a strategy guide, and the Necrolexicon
 * (issue #66) is explicitly not one.
 */
export type Mechanic = {
  id: string;
  name: string;
  blurb: string;
};

export type Origin = {
  id: string;
  name: string;
  blurb: string;
  /** Applied once at run start. */
  effects: Effect[];
};

export type Ending = {
  id: EndingId;
  name: string;
  /** Long-form narration on the ending card. Still a biography, never a loss. */
  narration: string;
  /** One-line summary for the collection list. */
  summary: string;
  /**
   * One line for the LOCKED slot in the collection, shown where `summary`
   * would be. Names the PRESSURE that leads here, never the outcome — the
   * outcome is what `name` and `summary` are withholding.
   *
   * Required, not optional. The seven slots are visible from run one (rule 6),
   * and an optional field here is the shape that lets a slot silently render
   * nothing — which is what they did: every locked slot's only text was a
   * rarity word, and the word collided with the relic grid's.
   */
  hint: string;
  rarity: Rarity;
} & EndingCoda;

/**
 * The last thing said about the career.
 *
 * `tiered`: one line per Notoriety tier. A Local Menace lich read identically
 * to a Kingdom-Level lich: notoriety is the spine of the whole game and the
 * ending ignored it. Pick this when the world's REACTION scales with fame —
 * the seven original endings all do, because how much the world noticed is
 * exactly the axis notoriety measures.
 *
 * `fixed`: one closing line, no tiers. A faction leadership or reprisal
 * ending is defined by the faction relationship, not by fame — "the Academy
 * sealed you in a gem" reads the same at every tier, and writing five
 * paraphrases of that thought is filler, not authoring. Pick this when the
 * ending's character comes from something OTHER than notoriety.
 *
 * No optional coda field exists on `Ending` — a union member instead, so a
 * missing `codaMode` is a compile error rather than a silently-blank field
 * (`CLAUDE.md` failure mode 3). `tiered` still requires the full
 * `Record<TierId, string>`, so the compiler keeps naming every missing tier —
 * the mechanism that found all fourteen call sites when `hint` was added.
 */
export type EndingCoda =
  | { codaMode: 'tiered'; coda: Record<TierId, string> }
  | { codaMode: 'fixed'; coda: string };

// ---------------------------------------------------------------------------
// Run state
// ---------------------------------------------------------------------------

export type EraRecord = {
  eraIndex: number;
  age: number;
  lairId: string;
  notoriety: number;
  notorietyDelta: number;
  followers: number;
  artifactsGained: string[];
  /** One line, flavor. What shows in the ledger's Deeds column. */
  deedSummary: string;
  offerId: string;
  optionLabel: string;
  outcome: Outcome;
  phase: Phase;
};

export type RunState = {
  id: string;
  seed: number;
  wizardName: string;
  epithet: string;
  originId: string;
  age: number;
  eraIndex: number;
  /** Total eras this run — set by the run-length choice at creation. */
  eraCount: number;
  phase: Phase;
  /** Era index at which the prophecy fires. */
  prophecyEra: number;
  erasSinceProphecy: number;
  /** 0-99. The headline stat and the game's only rationed color signal. */
  notoriety: number;
  followers: number;
  lairId: string;
  heldArtifactIds: string[];
  /**
   * Relics granted by `createRun` itself (an origin's `{ t: 'artifact' }`
   * grant), set once and never touched again. `EraRecord.artifactsGained`
   * only ever gets an entry from `resolveChoice`, so an origin relic lost
   * later — `loseArtifact`, the lich rite — would otherwise vanish from every
   * "ever held" reconstruction: `recordRun`'s discovered-artifact fold,
   * `RelicPage`'s "Lost this run", `EndingScreen`'s relic grid. All three read
   * this alongside `eras[].artifactsGained` and `heldArtifactIds` for exactly
   * that reason (issue #80 — a starting relic that disappears without a trace
   * is the collection-reset regression Codex caught).
   */
  startingArtifactIds: string[];
  /**
   * Relics granted by an `active` power's own `grants` (issue #81 — Final
   * Ledger), the same shape of gap `startingArtifactIds` closes for an
   * origin's grant: `activateRelic` (`src/engine/relics.ts`) fires between
   * eras, at the player's own choosing, so the grant never lands in any
   * `EraRecord.artifactsGained`. Without a record of its own, a Final
   * Ledger relic that was later lost — `loseArtifact`, the lich rite — would
   * vanish from every "ever held" reconstruction exactly the way an origin
   * relic used to. `recordRun`, `RelicPage`'s "Lost this run", and
   * `EndingScreen`'s relic grid all read this alongside `startingArtifactIds`
   * and `eras[].artifactsGained` for that reason.
   */
  activeGrantedArtifactIds: string[];
  /**
   * Relics this PLAYER has discovered in earlier careers, from the persisted
   * collection. Read-only within a run: it never changes, and it exists so a
   * random draw can prefer something new (see `NOVELTY_BIAS`).
   *
   * The engine still knows nothing about storage — the list is handed to
   * `createRun` like everything else.
   */
  knownArtifactIds: string[];
  /**
   * The furthest `HeroBand` this run has reached, as an index into
   * `HERO_BANDS`. A high-water mark, so the approach is narrated ONCE per band
   * rather than every era the player happens to sit inside it.
   *
   * It has to be state rather than something derived at render: `EraRecord`
   * does not persist hero threat, so there is nothing to reconstruct it from.
   */
  heroBandSeen: number;
  factionStanding: Record<FactionId, number>;
  apprentices: { count: number; loyalty: number };
  pactDebt: number;
  heroThreat: number;
  /** True after the lichdom branch — freezes notoriety decay. */
  isLich: boolean;
  /**
   * Hidden counters for the Good Wizard route (issue #23). Never rendered —
   * see the doc comment on `Effect`'s `goodAct`/`illAct` variants for the
   * rule-1 exception this is, and its one condition.
   */
  goodActs: number;
  illActs: number;
  /** True after the Good Wizard resolution's `vowGoodWizard` — see `Effect`. */
  goodWizardVowed: boolean;
  /** Which `once` relic triggers have already fired this run — see `RelicState`. */
  relicState: RelicState;
  /** Append-only. Never removed, never rewritten. */
  eras: EraRecord[];
  seenOfferIds: string[];
  ending?: EndingId;
};

/** Persisted across runs. The long-term retention mechanism. */
export type Collection = {
  /** Bumped when the shape changes; migration is the one loss players resent. */
  version: number;
  discoveredArtifactIds: string[];
  endingsSeen: EndingId[];
  runsCompleted: number;
  bestNotoriety: number;
  /**
   * The three-card guide shown before the very first era has been dismissed.
   *
   * Lives here rather than in `RunState` because it is a property of the
   * PLAYER, not of a career — a second run must not re-explain the ledger.
   */
  tutorialSeen: boolean;
  /**
   * The last name the player typed, carried into the next creation screen.
   *
   * The name is the only typing in the game and the anchor the whole run hangs
   * off (reference principle 1). Asking for it again from scratch every run
   * taxes the one input-heavy moment, and most players are continuing the same
   * wizard's story anyway. Empty string until a first career is named.
   */
  lastWizardName: string;
  /**
   * The cosmetic theme the player is currently wearing.
   *
   * The only genuinely new field themes needed. What is UNLOCKED is derived
   * from `endingsSeen` — see `ThemeId` — so this is a pointer into that
   * derivation, not a parallel record of it. An id here that is not unlocked
   * (a hand-edited save, or a theme whose ending was never reached) falls back
   * to `default` at the migration boundary rather than rendering an unthemed
   * page.
   */
  selectedThemeId: ThemeId;
  /**
   * The build timestamp this player's relic collection was last reset at
   * (issue #80's relic-collection reset). Compared, as a plain string, against
   * `RELICS_RESET_AT_BUILD` in `src/version.ts` — the same
   * sortable-ISO-8601-string trick `BUILD_VERSION` already relies on. Older
   * (or absent, from a pre-reset save) clears `discoveredArtifactIds` on load
   * and stamps this to the current constant; a current or newer value leaves
   * the collection untouched.
   */
  relicsResetAt: string;
};

// ---------------------------------------------------------------------------
// Notoriety tiers — the one scarce color
// ---------------------------------------------------------------------------

export type TierId = 'unknown' | 'local_menace' | 'named_threat' | 'kingdom' | 'legend';

export type Tier = {
  id: TierId;
  name: string;
  min: number;
  max: number;
  /** Player-facing line shown under the badge. */
  line: string;
  /** Only `kingdom` and `legend` crossings animate. Everything else is quiet. */
  celebrate: boolean;
};

// ---------------------------------------------------------------------------
// Screen routing
// ---------------------------------------------------------------------------

export type Screen =
  | 'title'
  | 'creation'
  | 'run'
  | 'prophecy'
  | 'ending'
  | 'necrolexicon'
  | 'themes'
  | 'changelog'
  | 'tutorial';

// ---------------------------------------------------------------------------
// Changelog (issue #67)
// ---------------------------------------------------------------------------

/**
 * One shipped update, keyed by its build version in `src/content/changelog.ts`.
 *
 * `summary` is the single line the launch popup shows for this version;
 * `details` is the fuller list the Changelog screen prints. Both are static,
 * authored prose — there is no server, so nothing here is ever fetched.
 */
export type ChangelogEntry = {
  summary: string;
  details: string[];
};

/**
 * Keyed by build version, a full ISO 8601 UTC timestamp
 * ("YYYY-MM-DDTHH:mm:ssZ") rather than a bare date — this project can ship
 * more than one public build in a day, and a date-only key collides the
 * moment that happens (two entries silently fighting over one object key).
 * Versions sort newest-first as PLAIN STRINGS because every field in the
 * format is fixed-width and zero-padded, which `sortedChangelogVersions`
 * relies on — do not change the format without checking it. The time
 * component exists to keep keys unique, not to be read by a player; the UI
 * shows only the date part, via `formatChangelogVersion` in
 * `src/engine/changelog.ts`.
 */
export type Changelog = Record<string, ChangelogEntry>;

/**
 * One version's entry, paired with the key it was filed under — the shape
 * `pendingChangelogEntries` (`src/engine/changelog.ts`) returns. Lives on the
 * contract rather than in either the data file or the logic file so
 * `ChangelogPopup` (presentational, imports neither `src/content/` nor
 * `src/engine/`) can still name the shape it renders.
 */
export type PendingChangelogEntry = { version: string; entry: ChangelogEntry };
