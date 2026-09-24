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

import type { Artifact, Effect, OfferOption, RelicPower, RunState } from '../types';
import type { ContentBundle } from './content-port';
import { indexOf } from './content-port';
import { conditionsMet } from './conditions';
import { applyEffects, draftOf } from './effects';
import type { Rng } from './rng';

// ---------------------------------------------------------------------------
// Passives
// ---------------------------------------------------------------------------

export type RelicRules = {
  /**
   * Multiplies `CONTAGION_LOSS` in `applyStanding` (`effects.ts`). 1 with no
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
  for (const { artifact, power } of heldTriggers(draft, content, when)) {
    if (power.once && draft.relicState.firedOnce.includes(artifact.id)) continue;
    if (!watchSatisfied(power, choiceEffects)) continue;
    if (!conditionsMet(draft, power.if, content)) continue;
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

/** Never reached: everything `preview` below feeds `applyEffects` is pre-filtered to exclude these. */
const NO_RNG: Rng = () => {
  throw new Error('projectReactions: a relic reaction must not draw from the rng');
};

/**
 * The only two `Effect` cases `applyEffects` ever draws from the rng for
 * (`effects.ts`). A card's authored list is not restricted to `RelicEffect`
 * — most offers are free to grant or lose a relic — so a preview cannot run
 * the option's FULL effects through `applyEffects` the way `resolveChoice`
 * does with its real seeded stream; it would throw the instant a previewed
 * option happened to carry one of these two, which is common in the real
 * catalog. Excluding them is safe for every relic condition this slice
 * authors (none reads `heldArtifactIds`), the same way `projectEffects`
 * already leaves both un-resolved rather than guessing at a draw.
 */
const RNG_EFFECT_TYPES: ReadonlySet<Effect['t']> = new Set(['artifactFrom', 'loseArtifact']);

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
 * reacts to this specific choice.
 */
export function projectReactions(
  run: RunState,
  option: OfferOption,
  content: ContentBundle,
): RelicReactionPreview {
  const preview = (effects: readonly Effect[]): RelicEvent[] => {
    const draft = draftOf(run);
    const deterministic = effects.filter((e) => !RNG_EFFECT_TYPES.has(e.t));
    const application = applyEffects(draft, deterministic, NO_RNG, content);
    return [
      ...applyChoiceTriggers(draft, content, NO_RNG, application.applied),
      ...applyEraEndTriggers(draft, content, NO_RNG),
    ];
  };

  if (option.kind === 'certain') return { kind: 'certain', events: preview(option.effects) };
  return {
    kind: 'gamble',
    onSuccess: preview(option.onSuccess),
    onFailure: preview(option.onFailure),
  };
}
