/**
 * The narration an ending card prints — one resolver for the card AND the
 * share image (issue #121).
 *
 * `EndingScreen` and `shareImage` both used to read `ending.narration`
 * directly. Once a narration depends on the run, two readers that each compose
 * it would eventually tell different deaths (failure mode 3's shape), so both
 * call `narrationFor` and neither composes anything itself.
 *
 * Only `slain_by_chosen_one` is composed. Every other ending returns its
 * authored `narration` untouched.
 */

import { RELIC_WARDS } from '../../engine';
import { heroNameFor } from '../../content/heroes';
import {
  BREACH_LINE,
  DUEL_LINE,
  SLAIN_CLOSING,
  SLAIN_LAIR_LINE,
  SLAIN_NO_RELIC_LINE,
  slainOpening,
  slainRelicLine,
  type SlainRoute,
} from '../../content/slainNarration';
import type { Artifact, Ending, RunState } from '../../types';

export type NarrationContext = {
  /** The artifact catalogue, in catalogue order (the tie-break). */
  artifacts: Artifact[];
};

/** The offer whose losing gamble ends in `slain_by_chosen_one`. */
const DUEL_OFFER_ID = 'scripted_the_chosen_one';
/** The option of that offer whose failure ends the run directly. Pinned to the real offer in `narration.test.ts`. */
export const DUEL_OPTION_LABEL = 'Fight her';

/**
 * How the hero reached the wizard: by losing the gate duel (the last era is
 * that offer, failed), or by outweighing the wards.
 */
export function slainRoute(run: RunState): SlainRoute {
  const last = run.eras[run.eras.length - 1];
  // The offer's OTHER gamble ("Tell her about her father") also fails on this
  // offer id, but only adds threat; the era's chosen option tells them apart.
  return last?.offerId === DUEL_OFFER_ID && last.outcome === 'failure' && last.optionLabel === DUEL_OPTION_LABEL
    ? 'duel'
    : 'breach';
}

/**
 * The most valuable relic still held: highest rarity by `RELIC_WARDS`, ties by
 * catalogue order. `undefined` for a wizard holding none.
 */
export function strongestHeldRelic(
  heldIds: readonly string[],
  artifacts: readonly Artifact[],
): Artifact | undefined {
  let best: Artifact | undefined;
  for (const artifact of artifacts) {
    if (!heldIds.includes(artifact.id)) continue;
    if (!best || RELIC_WARDS[artifact.rarity] > RELIC_WARDS[best.rarity]) best = artifact;
  }
  return best;
}

/** The slots, already chosen — the pure composition, exposed so content checks can sweep it. */
export type SlainSlots = {
  heroName: string;
  route: SlainRoute;
  lairId: string;
  relicName: string | undefined;
};

export function composeSlain(slots: SlainSlots): string {
  const lair = SLAIN_LAIR_LINE[slots.lairId];
  return [
    slainOpening(slots.heroName),
    slots.route === 'duel' ? DUEL_LINE : BREACH_LINE,
    lair,
    slots.relicName === undefined ? SLAIN_NO_RELIC_LINE : slainRelicLine(slots.relicName),
    SLAIN_CLOSING,
  ]
    .filter((s): s is string => Boolean(s))
    .join(' ');
}

export function narrationFor(ending: Ending, run: RunState, ctx: NarrationContext): string {
  if (ending.id !== 'slain_by_chosen_one') return ending.narration;
  return composeSlain({
    heroName: heroNameFor(run.seed),
    route: slainRoute(run),
    lairId: run.lairId,
    relicName: strongestHeldRelic(run.heldArtifactIds, ctx.artifacts)?.name,
  });
}
