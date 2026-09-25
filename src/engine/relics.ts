/**
 * The relic power framework (issue #80, slice 3 of #77).
 *
 * Two design rules from #77 are enforced HERE, not just documented on the
 * type:
 *
 *   1. "A relic never asks a question." Every function below either combines
 *      passive modifiers into plain numbers (`relicRules`) or fires a
 *      `trigger` automatically — there is no path from here into a decision
 *      screen.
 *   2. "Relics respond only to your choices and the passing of time, never to
 *      each other." `applyChoiceTriggers`/`applyEraEndTriggers` walk the held
 *      relics ONCE each and apply each one's own `RelicEffect[]` through
 *      `applyEffects` — they never re-run trigger evaluation over what a
 *      relic itself just produced, so a relic's own effects cannot arm a
 *      second relic's trigger in the same pass.
 *
 * `onChoice` reads "the chosen option's landed effects" two ways, and they are
 * NOT interchangeable: `if` (ordinary `Condition`s) reads the run's AMBIENT
 * state after the option's effects have landed, while `watchesPositive` reads
 * the option's OWN landed effects directly — see the doc comment on
 * `RelicPower`'s `trigger` member in `types.ts` for the bug that distinction
 * closes (an ambient condition can already be true for a reason that has
 * nothing to do with the choice just made, e.g. an origin's own starting
 * grant).
 */

import type { Artifact, Effect, EndingId, OfferOption, RelicPower, RunState } from '../types';
import type { ContentBundle } from './content-port';
import { indexOf } from './content-port';
import { conditionsMet } from './conditions';
import { applyEffects, draftOf, forfeitForLichdom } from './effects';
import type { Rng } from './rng';

// ---------------------------------------------------------------------------
// Passives
// ---------------------------------------------------------------------------

export type RelicRules = {
  /**
   * Multiplies `CONTAGION_GAIN` in `applyStanding` (`effects.ts`) — the rate
   * that spills a LOSS onto a courted faction's enemies, which is what
   * "the standing lost to contagion is halved" actually means. 1 with no
   * relic held — the neutral default that makes "no relics held" reproduce
   * today's behaviour exactly, per #77's own acceptance bar.
   */
  contagionLossMultiplier: number;
};

const NEUTRAL_RULES: RelicRules = { contagionLossMultiplier: 1 };

/**
 * Combine every held relic's `passive` power into one set of rule
 * modifiers. Multiple relics with the same modifier COMBINE (multiplicatively
 * — so two future 50% relics would compound to 25%, not merely tie), which is
 * the "combines the held passives" #80 asks for, even though only one such
 * passive exists in the catalog today.
 */
export function relicRules(run: RunState, content: ContentBundle): RelicRules {
  const index = indexOf(content);
  let contagionLossMultiplier = NEUTRAL_RULES.contagionLossMultiplier;
  for (const id of run.heldArtifactIds) {
    const power = index.artifactById.get(id)?.power;
    if (power?.kind === 'passive' && power.modifier.t === 'contagionLossMultiplier') {
      contagionLossMultiplier *= power.modifier.v;
    }
  }
  return { contagionLossMultiplier };
}

// ---------------------------------------------------------------------------
// Odds seam (for slice 5's Spectacles)
// ---------------------------------------------------------------------------

/**
 * The odds a gamble ACTUALLY carries for this run — a pass-through today,
 * because no relic in this slice touches odds. Bots in `scripts/simulate.ts`
 * score gambles through this rather than reading `option.odds` directly, so a
 * future odds-modifying relic (#77 slice 5's Spectacles) changes one function
 * body instead of every call site that scores a gamble.
 */
export function effectiveOdds(run: RunState, option: OfferOption): number {
  void run;
  return option.kind === 'gamble' ? option.odds : 1;
}

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

/** One relic's own consequences this era, for the "Your relics" resolution section. */
export type RelicEvent = {
  artifactId: string;
  /** What actually landed — same contract as `EffectApplication.applied`. */
  applied: Effect[];
};

type TriggerPower = Extract<RelicPower, { kind: 'trigger' }>;

function heldTriggers(
  run: RunState,
  content: ContentBundle,
  when: TriggerPower['when'],
): { artifact: Artifact; power: TriggerPower }[] {
  const index = indexOf(content);
  const out: { artifact: Artifact; power: TriggerPower }[] = [];
  for (const id of run.heldArtifactIds) {
    const artifact = index.artifactById.get(id);
    const power = artifact?.power;
    if (artifact && power && power.kind === 'trigger' && power.when === when) {
      out.push({ artifact, power });
    }
  }
  return out;
}

/**
 * True unless `power.watchesPositive` is set and the CHOICE's own landed
 * effects (`choiceEffects` — `undefined` for the `eraEnd` timing, which has
 * no single choice to read) contain no positive instance of that type.
 */
function watchSatisfied(power: TriggerPower, choiceEffects: readonly Effect[] | undefined): boolean {
  if (!power.watchesPositive) return true;
  return (choiceEffects ?? []).some(
    (e) => e.t === power.watchesPositive && 'v' in e && e.v > 0,
  );
}

/**
 * Fire every held trigger of one timing against `draft`, mutating it in
 * place, and return an event per relic that actually applied something.
 *
 * `if` is read off `draft` AS IT STANDS when this is called — for `onChoice`
 * that means after the option's own effects landed, for `eraEnd` that means
 * at the point `resolveChoice` runs its era-end block. `watchesPositive`
 * (onChoice only) is read off `choiceEffects` instead — the option's own
 * landed effects, never the ambient run. `once` triggers consult and update
 * `draft.relicState.firedOnce` so they fire exactly one time ever, not once
 * per era the condition happens to hold.
 */
function fireTriggers(
  draft: RunState,
  content: ContentBundle,
  rng: Rng,
  when: TriggerPower['when'],
  choiceEffects?: readonly Effect[],
): RelicEvent[] {
  const events: RelicEvent[] = [];
  // Frozen once, before any relic in this pass fires. `heldTriggers` below
  // already captures WHO fires this way (it returns a plain array, so the
  // `for...of` iterates a fixed list even if an earlier relic's effects add
  // or remove a relic from `draft.heldArtifactIds` mid-pass) — but until now
  // nothing did the same for WHETHER each one's `if` is met, so a relic
  // earlier in `heldArtifactIds` order could change draft state that a LATER
  // relic's `if` then read live, arming it within the same pass. That
  // contradicts this file's own header ("relics respond only to your choices
  // and the passing of time, never to each other") and made the ordering of
  // an unordered array (`heldArtifactIds`) a hidden gameplay input. Every
  // `if` this pass evaluates now reads the run as it stood walking INTO the
  // pass, matching what `heldTriggers` already guarantees for `heldArtifactIds`.
  const snapshot = draftOf(draft);
  for (const { artifact, power } of heldTriggers(draft, content, when)) {
    if (power.once && draft.relicState.firedOnce.includes(artifact.id)) continue;
    if (!watchSatisfied(power, choiceEffects)) continue;
    if (!conditionsMet(snapshot, power.if, content)) continue;
    const application = applyEffects(draft, power.effects, rng, content);
    if (power.once) draft.relicState.firedOnce.push(artifact.id);
    if (application.applied.length > 0) {
      events.push({ artifactId: artifact.id, applied: application.applied });
    }
  }
  return events;
}

/**
 * Called from `resolveChoice` immediately after the chosen option's own
 * effects land. `choiceEffects` is that option's landed effects
 * (`EffectApplication.applied`) — what `watchesPositive` reads.
 */
export function applyChoiceTriggers(
  draft: RunState,
  content: ContentBundle,
  rng: Rng,
  choiceEffects: readonly Effect[],
): RelicEvent[] {
  return fireTriggers(draft, content, rng, 'onChoice', choiceEffects);
}

/** Called from `resolveChoice`'s era-end block — skipped, like decay, when the era ended the run. */
export function applyEraEndTriggers(draft: RunState, content: ContentBundle, rng: Rng): RelicEvent[] {
  return fireTriggers(draft, content, rng, 'eraEnd');
}

// ---------------------------------------------------------------------------
// Projection — what the card should print, before the commit (rule 1)
// ---------------------------------------------------------------------------

/** Reached only for a deterministic `loseArtifact` — see `DETERMINISTIC_LOSS_RNG`. */
const NO_RNG: Rng = () => {
  throw new Error('projectReactions: a relic reaction must not draw from the rng');
};

/**
 * Safe ONLY when `draft.heldArtifactIds.length` is 0 or 1 at the point
 * `loseArtifact` is reached: `effects.ts`'s case computes
 * `Math.floor(rng() * length)`, which is 0 regardless of what this returns
 * when `length` is 0 or 1, so it introduces no randomness — it exists only to
 * satisfy the `Rng` type at a call site already proven deterministic below.
 */
const DETERMINISTIC_LOSS_RNG: Rng = () => 0;

export type RelicReactionPreview =
  | { kind: 'certain'; events: RelicEvent[] }
  | { kind: 'gamble'; onSuccess: RelicEvent[]; onFailure: RelicEvent[] };

/**
 * What holding a relic will do if `option` is picked, mirroring the SAME
 * evaluation `resolveChoice` runs for real: apply the option's own
 * deterministic effects to a throwaway draft, then run both timings'
 * triggers against it exactly as `resolveChoice` will. Nothing here can
 * drift from the engine because it IS the engine, the same guarantee
 * `projectEffects` gives the option's own numbers.
 *
 * Includes `eraEnd` triggers too, not only `onChoice` ones: picking ANY
 * option is followed by the era-end block, so a relic that fires there (the
 * Mantle, the Purse) is just as much "what the engine will do" as one that
 * reacts to this specific choice — UNLESS the choice's own effects request an
 * ending that `resolveChoice` treats as terminal, in which case there is no
 * "end of the era" for a relic to fire at and the preview must say nothing,
 * on pain of showing a reaction a terminal pick will never actually produce.
 * `resolveChoice`'s one carve-out from "an ending effect is terminal" is the
 * lichdom rite taken with eras still left to spend — it transforms and
 * CONTINUES, so era-end triggers fire for real there too, but only against
 * whatever survives the rite's OWN forfeiture: `resolveChoice` runs
 * `becomeLich` (which strips every held relic) before its era-end block, so a
 * relic the rite is about to take can never be the one whose era-end reaction
 * fires in the same era. All three pieces are reproduced here, not just
 * asserted, for the same reason the rest of this function exists: the preview
 * cannot drift from `resolveChoice` because it runs the identical steps in
 * the identical order.
 */
export function projectReactions(
  run: RunState,
  option: OfferOption,
  content: ContentBundle,
): RelicReactionPreview {
  const preview = (effects: readonly Effect[]): RelicEvent[] => {
    const draft = draftOf(run);

    // Walked one effect at a time, in order — not handed to `applyEffects` as
    // one list — so `draft.heldArtifactIds` is correct BEFORE each effect
    // runs, the same way `resolveChoice`'s single real call naturally is. A
    // `artifactFrom` draw is always skipped: which relic arrives is
    // unknowable ahead of the roll, the same reason `projectEffects` leaves
    // it un-resolved. `loseArtifact` is skipped too, but ONLY when 2+ relics
    // are held — with at most one held, there is no suspense about which one
    // is lost, so it runs for real (see `DETERMINISTIC_LOSS_RNG`). Skipping
    // either means the trigger evaluation below runs against a draft that
    // still holds a relic the option is about to take, or doesn't yet hold
    // one it's about to grant — an accepted gap in the same place
    // `projectEffects` accepts it, not a new one.
    const appliedEffects: Effect[] = [];
    let endingRequested: EndingId | undefined;
    let lichRequested = false;
    for (const effect of effects) {
      if (effect.t === 'artifactFrom') continue;
      if (effect.t === 'loseArtifact' && draft.heldArtifactIds.length >= 2) continue;
      const rng = effect.t === 'loseArtifact' ? DETERMINISTIC_LOSS_RNG : NO_RNG;
      const application = applyEffects(draft, [effect], rng, content);
      appliedEffects.push(...application.applied);
      if (!endingRequested) endingRequested = application.endingRequested;
      if (application.lichRequested) lichRequested = true;
    }
    const choiceEvents = applyChoiceTriggers(draft, content, NO_RNG, appliedEffects);

    const riteTaken = lichRequested || endingRequested === 'lichdom';
    if (riteTaken && !run.isLich) {
      forfeitForLichdom(draft);
      if (endingRequested === 'lichdom' && run.eraIndex + 1 < run.eraCount) {
        endingRequested = undefined;
      }
    }
    if (endingRequested) return choiceEvents;

    return [...choiceEvents, ...applyEraEndTriggers(draft, content, NO_RNG)];
  };

  if (option.kind === 'certain') return { kind: 'certain', events: preview(option.effects) };
  return {
    kind: 'gamble',
    onSuccess: preview(option.onSuccess),
    onFailure: preview(option.onFailure),
  };
}

/**
 * What a held relic will do at this era's end, read straight off `run` as it
 * stands right now — no offer, no choice. For the Relics page: a plain "what
 * your relics passively do" summary, not a per-choice disclosure surface.
 * Unlike `projectReactions`, this never applies a choice's own effects
 * first, so an era-end trigger whose `if` depends on something only a
 * choice can change may read differently here than what actually lands once
 * the player commits. Accepted deliberately: the offer card no longer
 * carries this preview at all (it used to, once per offer, under a
 * "Whatever you choose" line — dropped for repeating identically every
 * era), and the resolution screen's own "Your relics" section (`RelicEvent`,
 * applied for real) still states the true numbers after the fact — this
 * page is a between-choices summary, not rule 1's pre-commit guarantee.
 */
export function projectPassiveReactions(run: RunState, content: ContentBundle): RelicEvent[] {
  return applyEraEndTriggers(draftOf(run), content, NO_RNG);
}
