/**
 * The engine's public surface.
 *
 * The UI and the sim harness import from here and nowhere deeper. Everything
 * below is a pure function of `(RunState, ContentBundle)` except the four
 * persistence calls, which are the only functions in the engine that touch the
 * outside world.
 */

export type { ContentBundle, ContentIndex, Epithet, PactRole } from './content-port';
export { indexOf, pactRoleOf, FALLBACK_EPITHETS } from './content-port';

export type { Resolution, SystemicChange } from './resolution';
export type { CreateRunOptions } from './run';

export { createRun, resolveChoice, MAX_NAME_LENGTH } from './run';
export {
  nextOffer,
  buildOfferPool,
  standingWeight,
  pactWeight,
  hasCertainOption,
  QUIET_ERA_OFFER,
} from './offers';
export {
  defenseOf,
  defenseReadout,
  heroBand,
  HERO_BANDS,
  tierCrossing,
  peakNotoriety,
  prophecyEraFor,
  decayFor,
  threatGainFor,
} from './systems';
export type { DefenseReadout, DefenseTerm, HeroBand } from './systems';
export { projectedEpithet } from './epithets';
export {
  checkEndings,
  ascensionReady,
  legendariesHeld,
  FACTION_ORDER,
  REPRISAL_BY_FACTION,
  nearestReprisalFaction,
  reprisalEnding,
  reprisalLiveFor,
} from './endings';
export { conditionMet, conditionsMet } from './conditions';
export { projectEffects } from './effects';

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

/**
 * Thresholds the UI must be able to name.
 *
 * wiki/04's odds rule says a player may never be surprised by an unlisted
 * consequence. A stat that silently counts toward a terminal state is exactly
 * that surprise, so the numbers the endings turn on are public.
 */
export {
  DEF_LAIR,
  DEF_LICH,
  HERO_BAND_DANGER,
  HERO_BAND_WARN,
  PACT_LIMIT,
  PACT_TEMPT_COEF,
  PACT_TEMPT_MAX,
  PACT_RELIEF_COEF,
  PACT_RELIEF_MAX,
  BETRAYAL_MAX_LOYALTY,
  BETRAYAL_MIN_APPRENTICES,
  SEAL_MAX_STANDING,
  SEAL_MIN_NOTORIETY,
  SEAL_FACTION,
  ARTIFACT_LOCKOUT_STANDING,
  DEVOTION_STANDING,
  ASCENSION_LEGENDARIES,
  ASCENSION_MIN_NOTORIETY,
} from './constants';

export type { Game } from './useGame';
export { useGame } from './useGame';
