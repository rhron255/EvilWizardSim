/**
 * The seam between the engine and `src/content/`.
 *
 * The engine NEVER imports from `src/content/`. It takes a `ContentBundle`
 * parameter instead. That keeps the engine testable against a synthetic
 * fixture (`src/engine/__fixtures__/content.ts`), keeps content authorable in
 * parallel, and means a future "seasonal content pack" is a different argument
 * rather than a different engine.
 */

import type {
  Artifact,
  Ending,
  Faction,
  FactionId,
  Lair,
  Offer,
  Origin,
  RunState,
  TierId,
} from '../types';

/**
 * A run-end title derived from deeds.
 *
 * Evaluated in array order, FIRST MATCH WINS — author most-specific first.
 * `when` must be a pure predicate; the engine calls it every era to keep
 * `run.epithet` current, so it must not be expensive or side-effecting.
 */
export type Epithet = {
  id: string;
  text: string;
  when: (r: RunState) => boolean;
};

export type ContentBundle = {
  factions: Faction[];
  artifacts: Artifact[];
  lairs: Lair[];
  origins: Origin[];
  endings: Ending[];
  offers: Offer[];
  epithets: Epithet[];
};

// ---------------------------------------------------------------------------
// Derived index
// ---------------------------------------------------------------------------

export type ContentIndex = {
  artifactById: Map<string, Artifact>;
  factionById: Map<FactionId, Faction>;
  endingById: Map<string, Ending>;
  offerById: Map<string, Offer>;
  originById: Map<string, Origin>;
  /** Lairs sorted ascending by `tier` — this array IS the ladder. */
  lairLadder: Lair[];
  /** Position of a lair id on the ladder. */
  lairRung: Map<string, number>;
  artifactsByFaction: Map<FactionId, Artifact[]>;
};

const cache = new WeakMap<ContentBundle, ContentIndex>();

/**
 * Build (once per bundle) the lookup tables the hot paths need. Cached in a
 * WeakMap so callers can pass the bundle around freely without paying for it.
 */
export function indexOf(content: ContentBundle): ContentIndex {
  const hit = cache.get(content);
  if (hit) return hit;

  const lairLadder = content.lairs.slice().sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));
  const lairRung = new Map<string, number>();
  lairLadder.forEach((lair, i) => lairRung.set(lair.id, i));

  const artifactsByFaction = new Map<FactionId, Artifact[]>();
  for (const artifact of content.artifacts) {
    const list = artifactsByFaction.get(artifact.factionId);
    if (list) list.push(artifact);
    else artifactsByFaction.set(artifact.factionId, [artifact]);
  }

  const built: ContentIndex = {
    artifactById: new Map(content.artifacts.map((a) => [a.id, a])),
    factionById: new Map(content.factions.map((f) => [f.id, f])),
    endingById: new Map(content.endings.map((e) => [e.id, e])),
    offerById: new Map(content.offers.map((o) => [o.id, o])),
    originById: new Map(content.origins.map((o) => [o.id, o])),
    lairLadder,
    lairRung,
    artifactsByFaction,
  };
  cache.set(content, built);
  return built;
}

/**
 * Last-resort epithets when no authored `when` predicate matches. Deliberately
 * bland — authored epithets should always beat these.
 */
export const FALLBACK_EPITHETS: Record<TierId, string> = {
  unknown: 'the Unremarkable',
  local_menace: 'the Local Nuisance',
  named_threat: 'the Named',
  kingdom: 'the Kingdom-Level Problem',
  legend: 'the Legend',
};
