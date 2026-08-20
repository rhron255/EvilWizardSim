/**
 * The engine's public surface.
 *
 * The UI and the sim harness import from here and nowhere deeper. Everything
 * below is a pure function of `(RunState, ContentBundle)` except the four
 * persistence calls, which are the only functions in the engine that touch the
 * outside world.
 */

export type { ContentBundle, ContentIndex, Epithet } from './content-port';
export { indexOf, FALLBACK_EPITHETS } from './content-port';

export type { Resolution } from './resolution';
export type { CreateRunOptions } from './run';

export { createRun, resolveChoice } from './run';
export { nextOffer, buildOfferPool, standingWeight, hasCertainOption, QUIET_ERA_OFFER } from './offers';
export { defenseOf, tierCrossing, peakNotoriety, prophecyEraFor, decayFor, threatGainFor } from './systems';
export { projectedEpithet } from './epithets';
export { checkEndings, ascensionReady, legendariesHeld } from './endings';
export { conditionMet, conditionsMet } from './conditions';

export {
  loadCollection,
  saveCollection,
  recordRun,
  emptyCollection,
  migrateCollection,
  saveInProgressRun,
  loadInProgressRun,
  clearInProgressRun,
} from './persistence';

export { RUN_LENGTHS, DEFAULT_ERA_COUNT, YEARS_PER_ERA, START_AGE } from './constants';

export type { Game } from './useGame';
export { useGame } from './useGame';
