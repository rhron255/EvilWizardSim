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
import type { Resolution } from './resolution';
import {
  DEFAULT_ERA_COUNT,
  LOYALTY_DRIFT_BASE,
  LOYALTY_DRIFT_MIN_APPRENTICES,
  PACT_INTEREST,
  PACT_INTEREST_MIN_DEBT,
  START_FOLLOWERS,
  START_LOYALTY,
  START_NOTORIETY,
} from './constants';
import type { EffectApplication } from './effects';
import { applyEffects, draftOf } from './effects';
import { projectedEpithet } from './epithets';
import { deedLineFor } from './deeds';
import { checkEndings } from './endings';
import { QUIET_ERA_OFFER } from './offers';
import { hashString, randomSeed, streamFor } from './rng';
import {
  ageForEra,
  clamp,
  clampNotoriety,
  decayFor,
  emptyStanding,
  erasSinceProphecyFor,
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
};

const MAX_NAME_LENGTH = 40;

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
    factionStanding: emptyStanding(),
    apprentices: { count: 0, loyalty: START_LOYALTY },
    pactDebt: 0,
    heroThreat: 0,
    isLich: false,
    eras: [],
    seenOfferIds: [],
  };

  if (origin) {
    // Origins are a tone-setter and a light modifier, applied exactly once.
    // An `ending` effect here would be nonsense, so it is ignored by omission
    // (we never read `endingRequested` from this application).
    const rng = streamFor(seed, 'origin', origin.id);
    applyEffects(run, origin.effects, rng, content);
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
    notorietyDelta: 0,
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

  for (const id of draft.heldArtifactIds) {
    const artifact = index.artifactById.get(id);
    if (artifact) application.artifactsLost.push(artifact);
    application.applied.push({ t: 'loseArtifact' });
  }
  draft.heldArtifactIds = [];

  if (draft.followers !== 0) {
    application.applied.push({ t: 'followers', v: -draft.followers });
    draft.followers = 0;
  }

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
  const rng = streamFor(run.seed, 'era', eraIndex);

  const options: OfferOption[] = offer.options.length > 0 ? offer.options : QUIET_ERA_OFFER.options;
  const safeIndex = Number.isFinite(optionIndex)
    ? clamp(Math.trunc(optionIndex), 0, options.length - 1)
    : 0;
  const option = options[safeIndex];

  // ---- roll (if any) --------------------------------------------------
  let outcome: Outcome;
  let effects: readonly Effect[];
  let text: string;

  if (option.kind === 'certain') {
    outcome = 'deterministic';
    effects = option.effects;
  } else {
    const odds = clamp(option.odds, 0, 1);
    const succeeded = rng() < odds;
    outcome = succeeded ? 'success' : 'failure';
    effects = succeeded ? option.onSuccess : option.onFailure;
  }

  // Authored text wins; otherwise the line is synthesized from the choice the
  // player actually made. The three constants this replaced produced a ledger
  // whose rows all read `It is done.` — 61% of consecutive rows were identical
  // across 2000 runs, in the one column of the one element wiki/01 calls "the
  // single most important UI element".
  text = deedLineFor(offer, option, outcome);

  // ---- apply -----------------------------------------------------------
  const draft = draftOf(run);
  const application = applyEffects(draft, effects, rng, content);

  let endingFromEffect: EndingId | undefined = application.endingRequested;
  if (endingFromEffect === 'lichdom' && !run.isLich && run.eraIndex + 1 < run.eraCount) {
    becomeLich(draft, application, content);
    endingFromEffect = undefined;
  } else if (endingFromEffect === 'lichdom' && !run.isLich) {
    // Taken on the final era: pay the cost anyway, then end as a lich.
    becomeLich(draft, application, content);
  }

  // ---- era-end systems -------------------------------------------------
  // Skipped when the option itself terminated the run: the biography stops at
  // the deed, not after another five years of quiet erosion.
  if (!endingFromEffect) {
    const decay = decayFor(draft);
    if (decay !== 0) draft.notoriety = clampNotoriety(draft.notoriety - decay);

    const threatGain = threatGainFor(draft);
    if (threatGain !== 0) {
      draft.heroThreat = Math.round((draft.heroThreat + threatGain) * 10) / 10;
    }

    if (draft.phase === 'decline') {
      // Unpaid debt compounds. wiki/01: "Consumed by the Pact | Demon-pact
      // debt unpaid | High-variance play punished."
      if (draft.pactDebt >= PACT_INTEREST_MIN_DEBT) draft.pactDebt += PACT_INTEREST;

      // Ambition grows as the master visibly weakens, and faster in a crowd.
      if (draft.apprentices.count >= LOYALTY_DRIFT_MIN_APPRENTICES) {
        const drift = -(LOYALTY_DRIFT_BASE + draft.apprentices.count);
        draft.apprentices = {
          ...draft.apprentices,
          loyalty: clamp(draft.apprentices.loyalty + drift, 0, 100),
        };
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
  // Move the offer to the end of the seen list so recency ordering stays
  // meaningful when the pool has to recycle.
  draft.seenOfferIds = [...run.seenOfferIds.filter((id) => id !== offer.id), offer.id];

  // ---- advance ---------------------------------------------------------
  const nextEraIndex = eraIndex + 1;
  draft.eraIndex = nextEraIndex;
  draft.age = ageForEra(nextEraIndex);
  draft.phase = phaseFor(nextEraIndex, run.prophecyEra);
  draft.erasSinceProphecy = erasSinceProphecyFor(nextEraIndex, run.prophecyEra);

  // The world reassigns your address before it decides your fate — a wizard
  // promoted this era should die in the better lair, and the ledger row above
  // already recorded the old one.
  draft.lairId = promoteLair(draft, content);

  // ---- ending check, after EVERY era -----------------------------------
  draft.ending = endingFromEffect ?? checkEndings(draft, content);

  draft.epithet = projectedEpithet(draft, content);

  const resolution: Resolution = {
    outcome,
    // The option's consequences only. Decay and hero escalation are systemic
    // and deliberately NOT listed here — wiki/04: "the decline works because
    // it is a number quietly going the wrong way, not because it is
    // announced." `notorietyDelta` below carries the net truth.
    appliedEffects: application.applied,
    text,
    artifactsGained: application.artifactsGained,
    notorietyDelta: draft.notoriety - startNotoriety,
    eraRecord,
  };

  const crossed = tierCrossing(startNotoriety, draft.notoriety);
  if (crossed) resolution.tierCrossed = crossed;
  if (draft.ending) resolution.ending = draft.ending;

  return { next: draft, resolution };
}
