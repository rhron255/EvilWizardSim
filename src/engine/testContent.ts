/**
 * The real content catalog, assembled into a `ContentBundle`, for engine
 * tests to play against.
 *
 * This is NOT fixture data — it re-exports `src/content/` as-is, shaped for
 * the engine's frozen contract. The engine itself never imports `src/content/`
 * (see the doc comment on `content-port.ts`); this file exists only so every
 * engine test builds the same real bundle the same way instead of hand-
 * duplicating the shape in each test file.
 */
import type { ContentBundle } from './content-port';
import * as C from '../content';

export const REAL_CONTENT: ContentBundle = {
  factions: C.factions,
  artifacts: C.artifacts,
  lairs: C.lairs,
  origins: C.origins,
  endings: C.endings,
  offers: C.offers,
  epithets: C.epithets,
};
