/**
 * `localStorage` persistence.
 *
 * Two rules govern this file:
 *
 *   1. EVERY access is wrapped. Private-mode Safari throws on `setItem`, some
 *      embedded webviews throw on merely *reading* `window.localStorage`, and
 *      a quota error must never be the thing that eats a fifteen-era ledger.
 *      Storage failures degrade to in-memory play, silently.
 *   2. There is a `version` key from day one (wiki/03: "Migrating a collection
 *      is the one data loss players will actually be angry about"). Unknown
 *      *older* versions are migrated field-by-field; unknown *newer* versions
 *      are discarded rather than misread, because a newer build's collection
 *      being partially eaten is worse than it being reset.
 */

import type { Collection, EndingId, RunState } from '../types';
import type { ContentBundle } from './content-port';
import { indexOf } from './content-port';
import { COLLECTION_KEY, COLLECTION_VERSION, RUN_KEY, RUN_SAVE_VERSION } from './constants';
import { peakNotoriety } from './systems';

// ---------------------------------------------------------------------------
// Storage access, defensively
// ---------------------------------------------------------------------------

function storage(): Storage | null {
  try {
    if (typeof globalThis === 'undefined') return null;
    const store = (globalThis as { localStorage?: Storage }).localStorage;
    if (!store) return null;
    return store;
  } catch {
    return null;
  }
}

function readRaw(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): boolean {
  try {
    const store = storage();
    if (!store) return false;
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeRaw(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    /* nothing to do — the record is already unreachable */
  }
}

function parse(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

export function emptyCollection(): Collection {
  return {
    version: COLLECTION_VERSION,
    discoveredArtifactIds: [],
    endingsSeen: [],
    runsCompleted: 0,
    bestNotoriety: 0,
    tutorialSeen: false,
    lastWizardName: '',
  };
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && item.length > 0 && !out.includes(item)) out.push(item);
  }
  return out;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Coerce whatever is on disk into a valid `Collection`.
 *
 * Returns a fresh collection for anything unreadable or from the future.
 * Older versions are salvaged: nothing has ever been removed, so a v0 blob (a
 * pre-versioning save) just gets its fields lifted out and stamped.
 *
 * v1 -> v2 added `tutorialSeen`. A returning player who has already finished a
 * career is not a first-time player, so their save migrates to `true` — the
 * guide explains the ledger they have already filled in once.
 */
export function migrateCollection(raw: unknown): Collection {
  if (!raw || typeof raw !== 'object') return emptyCollection();
  const data = raw as Record<string, unknown>;
  const version = finiteNumber(data.version, 0);

  // From the future: a newer build wrote this. Do not guess at its shape.
  if (version > COLLECTION_VERSION) return emptyCollection();

  const endings = stringArray(data.endingsSeen) as EndingId[];
  const runsCompleted = Math.max(0, Math.round(finiteNumber(data.runsCompleted, 0)));

  return {
    version: COLLECTION_VERSION,
    discoveredArtifactIds: stringArray(data.discoveredArtifactIds),
    endingsSeen: endings,
    runsCompleted,
    bestNotoriety: Math.max(0, Math.min(99, Math.round(finiteNumber(data.bestNotoriety, 0)))),
    tutorialSeen:
      typeof data.tutorialSeen === 'boolean' ? data.tutorialSeen : runsCompleted > 0,
    // Added alongside `tutorialSeen` in the same unreleased v2, so no save in
    // the wild has ever been without it; absence just means "never named one".
    lastWizardName: typeof data.lastWizardName === 'string' ? data.lastWizardName.slice(0, 40) : '',
  };
}

export function loadCollection(): Collection {
  return migrateCollection(parse(readRaw(COLLECTION_KEY)));
}

export function saveCollection(c: Collection): void {
  writeRaw(COLLECTION_KEY, JSON.stringify({ ...c, version: COLLECTION_VERSION }));
}

/**
 * Fold a finished run into the collection. Pure — safe to call from a reducer,
 * and idempotent for `discoveredArtifactIds` / `endingsSeen` / `bestNotoriety`.
 *
 * Artifacts count as DISCOVERED even if the run no longer holds them: a lich
 * forfeits everything, and a player who found the Bone Crown and then paid it
 * to the Worm has still seen the Bone Crown. Anything else would make lichdom
 * feel like a bug.
 */
export function recordRun(c: Collection, run: RunState, content: ContentBundle): Collection {
  const index = indexOf(content);

  const discovered = new Set(c.discoveredArtifactIds);
  const consider = (id: string) => {
    if (index.artifactById.has(id)) discovered.add(id);
  };
  run.heldArtifactIds.forEach(consider);
  for (const era of run.eras) era.artifactsGained.forEach(consider);

  const endingsSeen = c.endingsSeen.slice();
  if (run.ending && !endingsSeen.includes(run.ending)) endingsSeen.push(run.ending);

  return {
    version: COLLECTION_VERSION,
    discoveredArtifactIds: Array.from(discovered),
    endingsSeen,
    // Only a finished biography counts as a completed run.
    runsCompleted: c.runsCompleted + (run.ending ? 1 : 0),
    bestNotoriety: Math.max(c.bestNotoriety, peakNotoriety(run)),
    tutorialSeen: c.tutorialSeen,
    // A finished career re-confirms the name, so the next creation screen
    // opens on the wizard the player actually played.
    lastWizardName: run.wizardName || c.lastWizardName,
  };
}

// ---------------------------------------------------------------------------
// In-progress run
// ---------------------------------------------------------------------------

/**
 * wiki/03: "losing an accumulated ledger to a browser refresh directly attacks
 * the sunk-cost mechanism the design depends on." Saved every era.
 */
export function saveInProgressRun(run: RunState): void {
  if (run.ending) {
    clearInProgressRun();
    return;
  }
  writeRaw(RUN_KEY, JSON.stringify({ version: RUN_SAVE_VERSION, run }));
}

function looksLikeRun(value: unknown): value is RunState {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<RunState>;
  return (
    typeof r.id === 'string' &&
    typeof r.seed === 'number' &&
    Number.isFinite(r.seed) &&
    typeof r.wizardName === 'string' &&
    typeof r.eraIndex === 'number' &&
    typeof r.eraCount === 'number' &&
    typeof r.prophecyEra === 'number' &&
    typeof r.notoriety === 'number' &&
    typeof r.lairId === 'string' &&
    Array.isArray(r.eras) &&
    Array.isArray(r.seenOfferIds) &&
    Array.isArray(r.heldArtifactIds) &&
    !!r.factionStanding &&
    typeof r.factionStanding === 'object' &&
    !!r.apprentices &&
    typeof r.apprentices === 'object'
  );
}

/**
 * Returns null for anything unreadable, shape-wrong, from a different save
 * version, or already finished. A finished run is not resumable — it belongs
 * on the ending card, not back in the offer loop.
 */
export function loadInProgressRun(): RunState | null {
  const raw = parse(readRaw(RUN_KEY));
  if (!raw || typeof raw !== 'object') return null;
  const wrapper = raw as { version?: unknown; run?: unknown };
  if (finiteNumber(wrapper.version, -1) !== RUN_SAVE_VERSION) {
    clearInProgressRun();
    return null;
  }
  if (!looksLikeRun(wrapper.run)) {
    clearInProgressRun();
    return null;
  }
  const run = wrapper.run;
  if (run.ending) {
    clearInProgressRun();
    return null;
  }
  if (run.eraIndex >= run.eraCount) {
    clearInProgressRun();
    return null;
  }
  return run;
}

export function clearInProgressRun(): void {
  removeRaw(RUN_KEY);
}
