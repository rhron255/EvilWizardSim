/**
 * Run lifecycle — creation and the single era transition.
 *
 * `resolveChoice` is the only function in the codebase that advances a run.
 * It is pure: `(run, offer, optionIndex, content) -> { next, resolution }`,
 * with all randomness derived from `run.seed` and `run.eraIndex`. Nothing
 * mutates the input.
 *
 * wiki/03 § Event Flow is implemented literally:
 *   offer -> option selected -> odds rolled -> effects applied
 *   -> EraRecord appended -> age/phase advanced -> ending check
 */

import type {
  Effect,
  EndingId,
  EraRecord,
  Offer,
  OfferOption,
  Outcome,
  RunState,
} from '../types';
import type { ContentBundle } from './content-port';
import { indexOf } from './content-port';
import { impliedGatesOf } from './conditions';
import type { Resolution, SystemicChange } from './resolution';
import {
  DEFAULT_ERA_COUNT,
  LOYALTY_DRIFT_BASE,
  LOYALTY_DRIFT_MIN_APPRENTICES,
  START_FOLLOWERS,
  START_LOYALTY,
  START_NOTORIETY,
} from './constants';
import type { EffectApplication } from './effects';
import { applyEffects, draftOf, forfeitForLichdom } from './effects';
import type { LifelineOutcome, RelicEvent } from './relics';
import {
  applyChoiceTriggers,
  applyEraEndTriggers,
  applyHeroApproachTriggers,
  applyLifeline,
  effectiveOdds,
  relicRules,
} from './relics';
import { projectedEpithet } from './epithets';
import { deedLineFor } from './deeds';
import { checkEndings, nearestReprisalFaction } from './endings';
import { isOptionPickable, QUIET_ERA_OFFER } from './offers';
import { hashString, randomSeed, streamFor } from './rng';
import {
  ageForEra,
  clamp,
  clampNotoriety,
  clampThreat,
  decayFor,
  defenseOf,
  emptyStanding,
  erasSinceProphecyFor,
  heroBand,
  HERO_BANDS,
  phaseFor,
  promoteLair,
  prophecyEraFor,
  threatGainFor,
  tierCrossing,
} from './systems';

export type CreateRunOptions = {
  wizardName: string;
  originId: string;
  eraCount: number;
  seed?: number;
  /**
   * The epithet picked at creation. wiki/01_core_loop.md: "chosen from 3-4
   * options, or auto-assigned later by deeds" — so this is the starting title,
   * and a matching authored epithet supersedes it once the run earns one.
   */
  epithet?: string;
  /**
   * Relics this player already has in their collection. Random draws prefer
   * anything not on this list (see `NOVELTY_BIAS`). Omit for a first career or
   * for a measurement that wants a blank-slate player.
   */
  knownArtifactIds?: readonly string[];
};

/**
 * The longest name the engine will store.
 *
 * EXPORTED because the creation screen's input has to agree with it. It used
 * to be copied there as a separate `MAX_NAME = 40`, with a comment promising
 * the two matched — the shape CLAUDE.md failure mode 3 is about, and the
 * reason a name was once silently truncated to "Vashter of the Long Arrear".
 * One constant, re-exported, so the two cannot drift.
 */
export const MAX_NAME_LENGTH = 40;

function sanitizeName(raw: string): string {
  const trimmed = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) return 'The Nameless';
  return trimmed.slice(0, MAX_NAME_LENGTH);
}

function sanitizeEraCount(raw: number): number {
  if (!Number.isFinite(raw)) return DEFAULT_ERA_COUNT;
  return clamp(Math.round(raw), 4, 40);
}

export function createRun(opts: CreateRunOptions, content: ContentBundle): RunState {
  const index = indexOf(content);
  const wizardName = sanitizeName(opts.wizardName);
  const eraCount = sanitizeEraCount(opts.eraCount);
  const seed = opts.seed ?? randomSeed();
  const origin = index.originById.get(opts.originId) ?? content.origins[0];
  const prophecyEra = prophecyEraFor(eraCount);

  const run: RunState = {
    id: `w-${(seed >>> 0).toString(36)}-${hashString(
      `${wizardName}|${origin?.id ?? 'none'}|${eraCount}`,
    ).toString(36)}`,
    seed,
    wizardName,
    epithet: '',
    originId: origin?.id ?? opts.originId,
    age: ageForEra(0),
    eraIndex: 0,
    eraCount,
    phase: phaseFor(0, prophecyEra),
    prophecyEra,
    erasSinceProphecy: erasSinceProphecyFor(0, prophecyEra),
    notoriety: START_NOTORIETY,
    followers: START_FOLLOWERS,
    lairId: index.lairLadder[0]?.id ?? '',
    heldArtifactIds: [],
    startingArtifactIds: [],
    activeGrantedArtifactIds: [],
    knownArtifactIds: Array.from(new Set(opts.knownArtifactIds ?? [])),
    heroBandSeen: 0,
    factionStanding: emptyStanding(),
    apprentices: { count: 0, loyalty: START_LOYALTY },
    pactDebt: 0,
    heroThreat: 0,
    isLich: false,
    goodActs: 0,
    illActs: 0,
    goodWizardVowed: false,
    relicState: { firedOnce: [], spent: [], foresight: false, offerRedrawSalt: 0 },
    eras: [],
    seenOfferIds: [],
  };

  if (origin) {
    // Origins are a tone-setter and a light modifier, applied exactly once.
    // An `ending` effect here would be nonsense, so it is ignored by omission
    // (we never read `endingRequested` from this application).
    const rng = streamFor(seed, 'origin', origin.id);
    const application = applyEffects(run, origin.effects, rng, content);
    // This happens before `run.eras` has a single entry, so it is the ONLY
    // record of a relic the origin granted — see `startingArtifactIds`'s doc
    // comment in `types.ts` for why every "ever held" reconstruction reads it.
    run.startingArtifactIds = application.artifactsGained.map((a) => a.id);
  }

  // A creation-screen pick stands until deeds earn something louder; without
  // one, project from the (barely started) run so a wizard is never nameless.
  run.epithet = opts.epithet?.trim() || projectedEpithet(run, content);
  return run;
}

// ---------------------------------------------------------------------------
// Era resolution
// ---------------------------------------------------------------------------

function inertResolution(run: RunState): Resolution {
  const last = run.eras[run.eras.length - 1];
  return {
    outcome: 'deterministic',
    appliedEffects: [],
    text: '',
    artifactsGained: [],
    newToCollection: [],
    artifactsLost: [],
    notorietyDelta: 0,
    systemic: [],
    relicEvents: [],
    ending: run.ending,
    eraRecord:
      last ??
      ({
        eraIndex: run.eraIndex,
        age: run.age,
        lairId: run.lairId,
        notoriety: run.notoriety,
        notorietyDelta: 0,
        followers: run.followers,
        artifactsGained: [],
        deedSummary: '',
        offerId: '',
        optionLabel: '',
        outcome: 'deterministic',
        phase: run.phase,
      } satisfies EraRecord),
  };
}

/**
 * Lichdom.
 *
 * wiki/01: "Lichdom is an ending, not a prize. It is the branch that cheats
 * the decline phase — the lich's Notoriety does not decay. The cost must be
 * real and mechanical: the lich forfeits all held artifacts and all followers
 * desert."
 *
 * Both halves of that are load-bearing, and together they mean the run must
 * CONTINUE after the rite — there is no decay left to cheat if the run stops.
 * So `{ t: 'ending', endingId: 'lichdom' }` is the one ending effect the
 * engine treats as a transformation rather than an immediate stop: it strips
 * every artifact and every follower, freezes decay, and commits the run to the
 * `lichdom` ending IF it survives to the age limit.
 *
 * That forfeiture is not flavor. Artifacts are most of `defenseOf`, so the
 * lich walks into the steepest part of the hero ramp naked. Trading a
 * ~30-point notoriety slide for a ~30-point defense hole is a genuine
 * decision, which is exactly what the wiki asks for.
 *
 * Every OTHER ending effect terminates the run immediately, as `types.ts`
 * documents.
 */
function becomeLich(draft: RunState, application: EffectApplication, content: ContentBundle): void {
  const index = indexOf(content);
  // The Patient Lantern (issue #82): "survives the lich rite, so you keep it
  // and its wards." Excluded from both the report below and the forfeiture
  // itself (`forfeitForLichdom`) — see `RelicRules.survivesLichRite`.
  const survives = relicRules(draft, content).survivesLichRite;

  for (const id of draft.heldArtifactIds) {
    if (survives(id)) continue;
    const artifact = index.artifactById.get(id);
    if (artifact) application.artifactsLost.push(artifact);
    application.applied.push({ t: 'loseArtifact' });
  }

  if (draft.followers !== 0) {
    application.applied.push({ t: 'followers', v: -draft.followers });
  }

  forfeitForLichdom(draft, content);
  draft.isLich = true;
}

export function resolveChoice(
  run: RunState,
  offer: Offer,
  optionIndex: number,
  content: ContentBundle,
): { next: RunState; resolution: Resolution } {
  // A finished run is immutable. Returning inertly beats throwing at a UI that
  // double-fired a click.
  if (run.ending) return { next: run, resolution: inertResolution(run) };

  const eraIndex = run.eraIndex;
  const startNotoriety = run.notoriety;
  const startLairId = run.lairId;
  const rng = streamFor(run.seed, 'era', eraIndex);

  const options: OfferOption[] = offer.options.length > 0 ? offer.options : QUIET_ERA_OFFER.options;
  const safeIndex = Number.isFinite(optionIndex)
    ? clamp(Math.trunc(optionIndex), 0, options.length - 1)
    : 0;
  const option = options[safeIndex];

  // The engine is authoritative over affordability, not just the UI that
  // greys the option out. A stale click or a UI bug that lets an unpickable
  // index through must not spend stock the player does not have — same
  // shape as the finished-run guard above, and the same reason it exists:
  // a rule enforced in only one layer is CLAUDE.md failure mode 2/3's shape.
  if (!isOptionPickable(run, option, content)) return { next: run, resolution: inertResolution(run) };

  // ---- roll (if any) --------------------------------------------------
  let outcome: Outcome;
  let effects: readonly Effect[];
  // Kept so the overlay can show the roll landing against the odds the player
  // was shown BEFORE committing. wiki/06 principle 4 calls printed odds the
  // load-bearing agency mechanism, and the proof is the visible roll — the UI
  // has always rendered it, but the engine never supplied these two numbers, so
  // the rail silently never appeared.
  let roll: number | undefined;
  let odds: number | undefined;

  if (option.kind === 'certain') {
    outcome = 'deterministic';
    effects = option.effects;
  } else {
    // `effectiveOdds`, not `option.odds` directly — the seam a future
    // odds-changing relic (#77 slice 5's Spectacles) hooks, so the roll a
    // player actually faces, the number the card prints, and what a bot in
    // `scripts/simulate.ts` scores a gamble at can never drift apart onto
    // three different odds for the same option.
    odds = clamp(effectiveOdds(run, option, content), 0, 1);
    roll = rng();
    const succeeded = roll < odds;
    outcome = succeeded ? 'success' : 'failure';
    effects = succeeded ? option.onSuccess : option.onFailure;
  }

  // Authored text wins; otherwise the line is synthesized from the choice the
  // player actually made. The three constants this replaced produced a ledger
  // whose rows all read `It is done.` — 61% of consecutive rows were identical
  // across 2000 runs, in the one column of the one element wiki/01 calls "the
  // single most important UI element".
  const text = deedLineFor(offer, option, outcome);

  // ---- apply -----------------------------------------------------------
  const draft = draftOf(run);

  // Pale Orrery (issue #81): consumed by the NEXT gamble that actually
  // resolves, whether it wins or loses — `effectiveOdds` already made this
  // one certain, so the flag's job is done the moment the roll above ran.
  if (option.kind === 'gamble' && run.relicState.foresight) {
    draft.relicState.foresight = false;
  }

  const application = applyEffects(draft, effects, rng, content);

  // Relics react to what was just chosen — read against the run AFTER the
  // option's own effects landed, per `RelicTriggerTiming`'s doc comment in
  // `types.ts` — before anything else (the lich rite, era-end) can change
  // what "the chosen option's landed effects" means. `offer.factionId` and
  // `outcome` are the other two things "the choice you made" can mean (issue
  // #82) — which CARD it was, and how a gamble on it resolved.
  const relicEvents: RelicEvent[] = applyChoiceTriggers(
    draft,
    content,
    rng,
    application.applied,
    offer.factionId,
    outcome,
  );

  let endingFromEffect: EndingId | undefined = application.endingRequested;

  // The rite may arrive either as the explicit `becomeLich` effect or, for
  // older cards, as an `ending: 'lichdom'` the engine reinterprets. Both mean
  // transform-and-continue, never stop here — see the note on `becomeLich` in
  // `types.ts` for why that is the only reading that fits the wiki.
  const riteTaken = application.lichRequested || endingFromEffect === 'lichdom';
  if (riteTaken && !run.isLich) {
    becomeLich(draft, application, content);
    // Only a run with eras left can spend them as a lich; taken on the last
    // era, the cost is still paid and the biography ends as one.
    if (endingFromEffect === 'lichdom' && run.eraIndex + 1 < run.eraCount) {
      endingFromEffect = undefined;
    }
  }

  // ---- era-end systems -------------------------------------------------
  // Skipped when the option itself terminated the run: the biography stops at
  // the deed, not after another five years of quiet erosion.
  //
  // Two of these ticks can END the run on an era whose card never mentioned
  // them, so they are collected and handed to the UI. See `SystemicChange` for
  // why decay and hero threat are not among them.
  const systemic: SystemicChange[] = [];
  if (!endingFromEffect) {
    // Era-end relics (the Mantle, the Purse) fire alongside decay and threat
    // gain — same guard, same reasoning: an era that never happens (the
    // option just ended the run) has no "end of it" for a relic to fire at.
    relicEvents.push(...applyEraEndTriggers(draft, content, rng));

    // Chalk of the Last Lecture (issue #82): a flat, floored-at-0 reduction
    // to the decay `decayFor` would otherwise apply.
    const decay = decayFor(draft, relicRules(draft, content).decayReduction);
    if (decay !== 0) draft.notoriety = clampNotoriety(draft.notoriety - decay);

    const threatGain = threatGainFor(draft, relicRules(draft, content).fameThreatMultiplier);
    if (threatGain !== 0) {
      draft.heroThreat = clampThreat(draft.heroThreat + threatGain);
    }

    /**
     * The approach, narrated — once per band, not once per era.
     *
     * Hero threat used to close in as a number and nothing else, while the
     * content that dramatised the chosen one was sampled at random and so had
     * no connection to whether the player was actually about to die. This fires
     * off `heroBand`, the SAME function the header's rail reads, so the fiction
     * and the bar are one fact told twice.
     *
     * `heroBandSeen` is a high-water mark: crossing back down (a new relic, a
     * better lair) does not re-arm a beat the player has already had. Three
     * lines a run, maximum.
     *
     * Not a doom meter. wiki/04 bans announcing the DECLINE — the notoriety
     * erosion above stays unnarrated, deliberately. This is the disclosure a
     * run-ending counter is owed (04:82-86), paid in fiction rather than digits.
     */
    const wards = defenseOf(draft, content);
    const band = heroBand(draft.heroThreat, wards);
    const rank = HERO_BANDS.indexOf(band);
    if (rank > draft.heroBandSeen) {
      draft.heroBandSeen = rank;
      if (band !== 'calm') {
        // Pocketful of Dark (issue #82): fires at the exact same crossing
        // this narrated beat marks — see `'heroApproach'` on
        // `RelicTriggerTiming` in `types.ts`.
        relicEvents.push(...applyHeroApproachTriggers(draft, content, rng));
        systemic.push({
          t: 'heroApproach',
          band,
          threat: draft.heroThreat,
          wards,
        });
      }
    }

    if (draft.phase === 'decline') {
      // Pact debt used to compound here, +1 an era. It does not any more: debt
      // moves ONLY when the player picks a card that moves it, and the pressure
      // that used to come from this clock now comes from the offer pool — see
      // `pactWeight` in `offers.ts`. Nothing is added to `systemic` for debt.
      //
      // Ambition grows as the master visibly weakens, and faster in a crowd.
      if (draft.apprentices.count >= LOYALTY_DRIFT_MIN_APPRENTICES) {
        const drift = -(LOYALTY_DRIFT_BASE + draft.apprentices.count);
        const before = draft.apprentices.loyalty;
        const after = clamp(before + drift, 0, 100);
        draft.apprentices = { ...draft.apprentices, loyalty: after };
        // Already at zero, nothing moved and there is nothing to report.
        if (after !== before) {
          systemic.push({ t: 'loyaltyDrift', v: after - before, loyalty: after });
        }
      }
    }
  }

  // ---- ledger row ------------------------------------------------------
  const eraRecord: EraRecord = {
    eraIndex,
    age: ageForEra(eraIndex),
    lairId: draft.lairId,
    notoriety: draft.notoriety,
    notorietyDelta: draft.notoriety - startNotoriety,
    followers: draft.followers,
    artifactsGained: application.artifactsGained.map((a) => a.id),
    deedSummary: text,
    offerId: offer.id,
    optionLabel: option.label,
    outcome,
    phase: run.phase,
  };

  draft.eras = [...run.eras, eraRecord];

  // Only mark the offer seen when the choice made was a genuine one, not a
  // forced decline of an option the player could not afford. Issue #61: an
  // offer can carry an "interesting" option — one `impliedGatesOf` derives a
  // real cost gate for — that was not pickable at draw time, alongside a
  // gate-free option the player was left with no choice but to take. Burning
  // `seenOfferIds` on that pick treats "I couldn't afford it" the same as "I
  // don't want it", so the card — and the route it was the only way to,
  // `concordat_worm` among them (issue #41) — is gone for the rest of the
  // run the moment it becomes affordable. Evaluated against `run`, the state
  // BEFORE this choice, since that is what the player actually saw the offer
  // pool with.
  const hadUnaffordableInterestingOption = offer.options.some(
    (o) => o !== option && impliedGatesOf(o).length > 0 && !isOptionPickable(run, o, content),
  );
  const choiceWasForced = impliedGatesOf(option).length === 0 && hadUnaffordableInterestingOption;
  // Move the offer to the end of the seen list so recency ordering stays
  // meaningful when the pool has to recycle.
  draft.seenOfferIds = choiceWasForced
    ? run.seenOfferIds
    : [...run.seenOfferIds.filter((id) => id !== offer.id), offer.id];

  // ---- advance ---------------------------------------------------------
  const nextEraIndex = eraIndex + 1;
  draft.eraIndex = nextEraIndex;
  draft.age = ageForEra(nextEraIndex);
  draft.phase = phaseFor(nextEraIndex, run.prophecyEra);
  draft.erasSinceProphecy = erasSinceProphecyFor(nextEraIndex, run.prophecyEra);

  // The world reassigns your address before it decides your fate — a wizard
  // promoted this era should die in the better lair, and the ledger row above
  // already recorded the old one.
  //
  // Skipped when THIS era's own effects just demoted the lair on purpose
  // (`oath_verdant_choir`, `concordat_choir`, `scripted_the_chosen_one`'s
  // surrender): entitlement is read from notoriety and followers alone, so a
  // wizard famous enough to have earned the rung they just gave up would
  // otherwise be promoted straight back into it in the SAME resolution —
  // refunding the authored cost before the resolution card finishes
  // rendering it as paid. The demotion is left to stand for this era; a
  // wizard who stays that famous re-earns the rung the ordinary way, one rung
  // at a time, starting next era.
  const lairDemotedThisEra = application.applied.some((e) => e.t === 'lairTier' && e.v < 0);
  draft.lairId = lairDemotedThisEra ? draft.lairId : promoteLair(draft, content);

  // ---- ending check, after EVERY era -----------------------------------
  draft.ending = endingFromEffect ?? checkEndings(draft, content);

  // Lifelines (issue #82): checked once, immediately after an ending is
  // found — never before, and never re-run afterward. Spends the FIRST
  // unspent lifeline that covers this ending, applies its recovery, and
  // clears `draft.ending` so the run continues. `nearestReprisalFaction` is
  // only meaningful for a reprisal ending, but it is cheap and
  // `applyLifeline` ignores it for every other kind — see `standingReset`'s
  // own doc comment in `relics.ts`.
  let lifeline: LifelineOutcome | undefined;
  if (draft.ending) {
    lifeline = applyLifeline(draft, content, draft.ending, nearestReprisalFaction(draft, content));
    if (lifeline) draft.ending = undefined;
  }

  draft.epithet = projectedEpithet(draft, content);

  // Relics this player has never held in ANY career. The collection is the
  // long game and the grid is mostly silhouettes, so the run that finally
  // fills a slot should say so out loud rather than leaving the player to
  // notice it two screens later.
  const newToCollection = application.artifactsGained.filter(
    (a) => !run.knownArtifactIds.includes(a.id),
  );

  const resolution: Resolution = {
    outcome,
    // The option's consequences only. Decay and hero escalation are systemic
    // and deliberately NOT listed here — wiki/04: "the decline works because
    // it is a number quietly going the wrong way, not because it is
    // announced." `notorietyDelta` below carries the net truth.
    appliedEffects: application.applied,
    // What the world did while the wizard was busy. Kept separate from
    // `appliedEffects` on purpose: attributing the Covenant's interest to the
    // option the player just picked would be a different lie from the one this
    // fixes.
    systemic,
    text,
    artifactsGained: application.artifactsGained,
    newToCollection,
    // Always present, empty by default — the `systemic` pattern. Named
    // relics lost this era (a `loseArtifact` a relic itself never causes yet,
    // and the lich rite's own forfeiture) rather than the unnamed generic
    // `loseArtifact` line `appliedEffects` already carries.
    artifactsLost: application.artifactsLost,
    relicEvents,
    notorietyDelta: draft.notoriety - startNotoriety,
    eraRecord,
    ...(roll !== undefined && odds !== undefined ? { roll, odds } : {}),
    ...(lifeline ? { lifeline } : {}),
  };

  const crossed = tierCrossing(startNotoriety, draft.notoriety);
  if (crossed) resolution.tierCrossed = crossed;

  // A move this era — from an authored `lairTier` effect or from the systemic
  // promotion above. Either way it is the most visible thing a player builds,
  // and it happened silently until now.
  if (draft.lairId !== startLairId) {
    const index = indexOf(content);
    const fromRung = index.lairRung.get(startLairId);
    const toRung = index.lairRung.get(draft.lairId);
    const fromLair = fromRung === undefined ? undefined : index.lairLadder[fromRung];
    const toLair = toRung === undefined ? undefined : index.lairLadder[toRung];
    if (fromLair && toLair) {
      resolution.lairMoved = { from: fromLair, to: toLair, up: (toRung ?? 0) > (fromRung ?? 0) };
    }
  }
  if (draft.ending) resolution.ending = draft.ending;

  return { next: draft, resolution };
}
