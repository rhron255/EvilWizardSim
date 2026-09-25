/**
 * The relic power framework (issue #80, slice 3 of #77), extended by slice 4
 * (issue #81) with a `scaled` trigger (Long Appetite), a per-faction passive
 * scope and a second passive modifier (Old-Growth Charter, Unbroken Line),
 * and the catalog's first actives (Final Ledger, Pale Orrery — see the
 * "Actives" section at the bottom of this file).
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

import type {
  Artifact,
  Effect,
  EndingId,
  FactionId,
  OfferOption,
  Rarity,
  RelicEffect,
  RelicPower,
  RunState,
} from '../types';
import type { ContentBundle } from './content-port';
import { indexOf } from './content-port';
import { conditionsMet } from './conditions';
import { NOVELTY_BIAS } from './constants';
import { applyEffects, draftOf, forfeitForLichdom } from './effects';
import type { Rng } from './rng';
import { streamFor, weightedPick } from './rng';

// ---------------------------------------------------------------------------
// Passives
// ---------------------------------------------------------------------------

export type RelicRules = {
  /**
   * Multiplies `CONTAGION_GAIN` in `applyStanding` (`effects.ts`) for a GIVEN
   * faction's gain — the rate that spills a LOSS onto that faction's
   * enemies. A function rather than a plain number since issue #81's
   * Old-Growth Charter scopes its own zeroing to Verdant Choir alone (see
   * `RelicPassiveModifier`'s doc comment in `types.ts`), so the answer can
   * differ by faction even within one run. 1 for every faction with no
   * relic held — the neutral default that makes "no relics held" reproduce
   * today's behaviour exactly, per #77's own acceptance bar.
   */
  contagionLossMultiplierFor(factionId: FactionId): number;
  /**
   * Multiplies the fame term of `threatGainFor` (`systems.ts`) — Unbroken
   * Line's own scope, see `RelicPassiveModifier`. 1 with no relic held.
   */
  fameThreatMultiplier: number;
};

/**
 * Combine every held relic's `passive` power into one set of rule
 * modifiers. Multiple relics with the same modifier COMBINE (multiplicatively
 * — so two 50% relics would compound to 25%, not merely tie).
 */
export function relicRules(run: RunState, content: ContentBundle): RelicRules {
  const index = indexOf(content);
  let unscopedContagionLossMultiplier = 1;
  const scopedContagionLossMultiplier = new Map<FactionId, number>();
  let fameThreatMultiplier = 1;
  for (const id of run.heldArtifactIds) {
    const power = index.artifactById.get(id)?.power;
    if (power?.kind !== 'passive') continue;
    if (power.modifier.t === 'contagionLossMultiplier') {
      if (power.modifier.factionId) {
        const prior = scopedContagionLossMultiplier.get(power.modifier.factionId) ?? 1;
        scopedContagionLossMultiplier.set(power.modifier.factionId, prior * power.modifier.v);
      } else {
        unscopedContagionLossMultiplier *= power.modifier.v;
      }
    } else if (power.modifier.t === 'fameThreatMultiplier') {
      fameThreatMultiplier *= power.modifier.v;
    }
  }
  return {
    contagionLossMultiplierFor: (factionId) =>
      unscopedContagionLossMultiplier * (scopedContagionLossMultiplier.get(factionId) ?? 1),
    fameThreatMultiplier,
  };
}

// ---------------------------------------------------------------------------
// Odds seam (for slice 5's Spectacles)
// ---------------------------------------------------------------------------

/**
 * The odds a gamble ACTUALLY carries for this run. Bots in
 * `scripts/simulate.ts` score gambles through this rather than reading
 * `option.odds` directly, so the roll a player actually faces, the number the
 * card prints, and what a bot scores a gamble at can never drift apart onto
 * three different odds for the same option.
 *
 * The Pale Orrery (issue #81) is the first relic to actually use this seam:
 * while `run.relicState.foresight` is armed, every gamble reads as certain.
 * `resolveChoice` is what clears the flag once a gamble genuinely resolves —
 * this function only reads it, never mutates.
 */
export function effectiveOdds(run: RunState, option: OfferOption): number {
  if (option.kind !== 'gamble') return 1;
  return run.relicState.foresight ? 1 : option.odds;
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
 * Long Appetite's own mechanism: `power.scaled`, floored into whole units off
 * a NEGATIVE landed instance of `watches` in the choice's own effects (never
 * ambient — same source `watchesPositive` reads), then multiplied by
 * `perUnitEffect`. Summed across every matching landed effect, though today's
 * catalog only ever lands one `followers` effect per choice. Returns `[]` when
 * there is nothing to scale (no matching effect, `eraEnd` timing with no
 * `choiceEffects`, or the magnitude is under one whole unit) — the caller
 * treats an empty result exactly like a `watchesPositive` miss.
 */
function scaledEffectsFor(
  scaled: TriggerPower['scaled'],
  choiceEffects: readonly Effect[] | undefined,
): RelicEffect[] {
  if (!scaled) return [];
  let units = 0;
  for (const e of choiceEffects ?? []) {
    if (e.t !== scaled.watches || !('v' in e) || e.v >= 0) continue;
    units += Math.floor(Math.abs(e.v) / scaled.perUnit);
  }
  if (units <= 0) return [];
  return [{ ...scaled.perUnitEffect, v: scaled.perUnitEffect.v * units }];
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
    const scaledEffects = scaledEffectsFor(power.scaled, choiceEffects);
    // A `scaled` trigger fires on whatever produced a non-empty
    // `scaledEffects` even with no `watchesPositive` set (Long Appetite has
    // neither `watchesPositive` nor fixed `effects`) — the two gates are
    // independent ways of saying "did the thing this relic cares about
    // actually happen", and a trigger authoring only one of them must not be
    // silently gated by the other's default of "true".
    if (!watchSatisfied(power, choiceEffects) && scaledEffects.length === 0) continue;
    if (!conditionsMet(snapshot, power.if, content)) continue;
    const effectsToApply = [...power.effects, ...scaledEffects];
    if (effectsToApply.length === 0) continue;
    const application = applyEffects(draft, effectsToApply, rng, content);
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

// ---------------------------------------------------------------------------
// Actives (issue #81, slice 4 of #77)
// ---------------------------------------------------------------------------
//
// A relic never asks a question, and an active is no exception: the tap
// itself is the only decision, with nothing to configure and no follow-up
// choice. Once per career, enforced against `RunState.relicState.spent`
// rather than `firedOnce` — that list belongs to an AUTOMATIC trigger's own
// one-time firing (Ashen Signature), a different guard for a different
// reason.

/**
 * Whether `artifactId`'s active can be used right now: held, actually an
 * `active` power, not already spent, and its `cost` (if any) affordable.
 * The relic page uses this to decide whether a Use button appears at all,
 * and `activateRelic` re-checks it so a stale click can never spend twice or
 * dip a stat below its floor.
 */
export function canActivateRelic(run: RunState, artifactId: string, content: ContentBundle): boolean {
  const power = indexOf(content).artifactById.get(artifactId)?.power;
  if (!power || power.kind !== 'active') return false;
  if (!run.heldArtifactIds.includes(artifactId)) return false;
  if (run.relicState.spent.includes(artifactId)) return false;
  for (const cost of power.cost ?? []) {
    if (cost.t === 'followers' && cost.v < 0 && run.followers < -cost.v) return false;
  }
  return true;
}

/** Faction standing order breaks ties by `content.factions`' own authored order — deterministic, never a coin flip. */
function bestStandingFactionId(run: RunState, content: ContentBundle): FactionId | undefined {
  let best: FactionId | undefined;
  let bestValue = -Infinity;
  for (const faction of content.factions) {
    const value = run.factionStanding[faction.id] ?? 0;
    if (value > bestValue) {
      bestValue = value;
      best = faction.id;
    }
  }
  return best;
}

/**
 * A `power.grants` draw (Final Ledger's own use today): a relic of `rarity`
 * from the player's best-standing faction, preferring one never held
 * (`NOVELTY_BIAS`, the same weighting `drawArtifact` in `effects.ts` uses for
 * an ordinary `artifactFrom`). Falls to that faction's commons if every relic
 * of `rarity` is already held, and to `undefined` — spending the cost for
 * nothing, same as an ordinary `artifactFrom` against an exhausted or
 * locked-out faction — only when the whole faction's vault is empty of
 * anything not already held.
 */
function drawGrantedRelic(
  draft: RunState,
  content: ContentBundle,
  rng: Rng,
  rarity: Rarity,
): Artifact | undefined {
  const index = indexOf(content);
  const factionId = bestStandingFactionId(draft, content);
  if (!factionId) return undefined;
  const held = new Set(draft.heldArtifactIds);
  const unheld = (index.artifactsByFaction.get(factionId) ?? []).filter((a) => !held.has(a.id));
  const exact = unheld.filter((a) => a.rarity === rarity);
  const candidates = exact.length > 0 ? exact : unheld.filter((a) => a.rarity === 'common');
  if (candidates.length === 0) return undefined;
  const known = new Set(draft.knownArtifactIds);
  return weightedPick(rng, candidates, (a) => (known.has(a.id) ? 1 : NOVELTY_BIAS));
}

export type ActivateRelicResult = {
  next: RunState;
  /** `null` when `canActivateRelic` was false — nothing happened. */
  event: RelicEvent | null;
};

/**
 * Spends an `active` power. Pure: derives its own rng stream from `run.seed`
 * (keyed on the artifact id and the era it was used in) rather than taking
 * one as a parameter, so the caller does not have to thread one through for
 * a player-initiated action the way `resolveChoice`'s own era rng is threaded
 * for an offer.
 */
export function activateRelic(
  run: RunState,
  artifactId: string,
  content: ContentBundle,
): ActivateRelicResult {
  if (!canActivateRelic(run, artifactId, content)) return { next: run, event: null };
  const power = indexOf(content).artifactById.get(artifactId)?.power as Extract<
    RelicPower,
    { kind: 'active' }
  >;

  const draft = draftOf(run);
  const rng = streamFor(run.seed, 'relicActive', artifactId, run.eraIndex);
  const applied: Effect[] = [];

  if (power.cost) {
    const costApplication = applyEffects(draft, power.cost, rng, content);
    applied.push(...costApplication.applied);
  }

  if (power.grants) {
    const relic = drawGrantedRelic(draft, content, rng, power.grants.rarity);
    if (relic) {
      draft.heldArtifactIds.push(relic.id);
      // PR #89 review (Codex): `eras[].artifactsGained` never gets an entry
      // for this — an active fires between eras, at the player's own
      // choosing, not from `resolveChoice` — so without its own record a
      // Final Ledger grant that is later lost (`loseArtifact`, the lich
      // rite) would vanish from every "ever held" reconstruction the same
      // way an origin relic used to before `startingArtifactIds` existed.
      draft.activeGrantedArtifactIds.push(relic.id);
      applied.push({ t: 'artifact', artifactId: relic.id });
    }
  }

  if (power.armsForesight) {
    draft.relicState.foresight = true;
  }

  if (power.effects.length > 0) {
    const application = applyEffects(draft, power.effects, rng, content);
    applied.push(...application.applied);
  }

  draft.relicState.spent = [...draft.relicState.spent, artifactId];
  return { next: draft, event: { artifactId, applied } };
}
