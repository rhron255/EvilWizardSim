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
  | { c: 'maxIllActs'; v: number };

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
};

export type Artifact = {
  id: string;
  name: string;
  /** Every artifact belongs to a faction — this is what makes routing legible. */
  factionId: FactionId;
  rarity: Rarity;
  /** Player-facing mechanical summary. */
  effect: string;
  flavorText: string;
  /** Defense contribution toward surviving hero threat. */
  defense: number;
};

export type Lair = {
  id: string;
  name: string;
  /** 0-based rung on the ladder. Names carry the progression. */
  tier: number;
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
  | 'collection'
  | 'themes';
