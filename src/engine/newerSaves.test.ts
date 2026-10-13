/**
 * A save written by a NEWER build is read-only to this one (issue #102).
 *
 * Reachable through a short HTTP cache or two tabs left open across a deploy:
 * an older build must play in memory and never erase what a newer build wrote.
 * The fixtures are literal strings with literal future versions — nothing the
 * loader supplies — so removing the guard turns these red (failure mode 11).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { REAL_CONTENT as content } from '../testing/realContent';
import { COLLECTION_KEY, COLLECTION_VERSION, RUN_KEY, RUN_SAVE_VERSION } from './constants';
import { createRun } from './index';
import {
  clearInProgressRun,
  loadCollection,
  loadInProgressRun,
  saveCollection,
  saveInProgressRun,
  emptyCollection,
} from './persistence';

const NEWER_COLLECTION = '{"version":7,"endingsSeen":["slain"],"hexes":{"future":true}}';
const NEWER_RUN = '{"version":4,"run":{"id":"from-the-future","shape":"unknown"}}';

beforeEach(() => localStorage.clear());

describe('newer saves are read-only', () => {
  it('fixtures really are newer than this build', () => {
    expect(7).toBeGreaterThan(COLLECTION_VERSION);
    expect(4).toBeGreaterThan(RUN_SAVE_VERSION);
  });

  it('leaves a newer collection untouched through load and save', () => {
    localStorage.setItem(COLLECTION_KEY, NEWER_COLLECTION);
    const loaded = loadCollection();
    expect(loaded.endingsSeen).toEqual([]);
    saveCollection({ ...loaded, runsCompleted: 5 });
    expect(localStorage.getItem(COLLECTION_KEY)).toBe(NEWER_COLLECTION);
  });

  it('leaves a newer saved run untouched through load, save and clear', () => {
    localStorage.setItem(RUN_KEY, NEWER_RUN);
    expect(loadInProgressRun()).toBeNull();
    expect(localStorage.getItem(RUN_KEY)).toBe(NEWER_RUN);
    saveInProgressRun(createRun({ wizardName: 'Old Build', originId: content.origins[0].id, eraCount: 8, seed: 1, knownArtifactIds: [] }, content));
    expect(localStorage.getItem(RUN_KEY)).toBe(NEWER_RUN);
    clearInProgressRun();
    expect(localStorage.getItem(RUN_KEY)).toBe(NEWER_RUN);
  });

  it('still writes normally over a current-version or absent save', () => {
    saveCollection(emptyCollection());
    expect(JSON.parse(localStorage.getItem(COLLECTION_KEY)!).version).toBe(COLLECTION_VERSION);
    localStorage.setItem(RUN_KEY, '{"version":1,"run":{}}');
    expect(loadInProgressRun()).toBeNull();
    expect(localStorage.getItem(RUN_KEY)).toBeNull();
  });
});
