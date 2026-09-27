/**
 * The backendless changelog's pure logic (issue #67).
 *
 * Lives beside the rest of the engine now that `src/content/changelog.ts`
 * holds only the `CHANGELOG` data (PR #68 review: content and the code that
 * interprets it should not share a file). What this file pins is the
 * behaviour every version-comparison rule in the issue depends on: newest
 * first — INCLUDING two entries on the same calendar day, which is why the
 * key carries a time-of-day at all — "missing" and "older" both mean
 * everything up to the build, and an unrecognised or future acknowledgement
 * degrades to nothing pending rather than throwing or rendering content this
 * build does not ship.
 */
import { describe, expect, it } from 'vitest';
import type { Changelog } from '../types';
import { CHANGELOG } from '../content/changelog';
import { changelogHasVersion, pendingChangelogEntries, sortedChangelogVersions } from './changelog';

/**
 * Real, shipped versions. The changelog is append-only history, so these
 * entries never change; later builds only add keys after them. Every test
 * below reads the real `CHANGELOG`, treating one of these as "the build".
 */
const DAY_ONE_MORNING = '2026-09-22T09:15:00Z';
const DAY_ONE_EVENING = '2026-09-22T18:40:00Z';
const DAY_TWO_FIRST = '2026-09-23T07:41:55Z';
const DAY_TWO_SECOND = '2026-09-23T08:13:20Z';
const DAY_TWO_LAST = '2026-09-23T08:30:00Z';

/** Real entries, re-keyed in a deliberately scrambled order. */
const scrambled = (...versions: string[]): Changelog =>
  Object.fromEntries(versions.map((v) => [v, CHANGELOG[v]]));

describe('the real versions these tests pin', () => {
  it('are all still in the shipped changelog', () => {
    for (const v of [DAY_ONE_MORNING, DAY_ONE_EVENING, DAY_TWO_FIRST, DAY_TWO_SECOND, DAY_TWO_LAST]) {
      expect(CHANGELOG[v], v).toBeDefined();
    }
  });
});

describe('sortedChangelogVersions', () => {
  it('orders newest first regardless of authored key order', () => {
    expect(sortedChangelogVersions(scrambled(DAY_TWO_FIRST, DAY_ONE_MORNING, DAY_TWO_LAST))).toEqual([
      DAY_TWO_LAST,
      DAY_TWO_FIRST,
      DAY_ONE_MORNING,
    ]);
  });

  it('orders two builds shipped on the same calendar day by time, not just date', () => {
    // The reason the key carries a time-of-day at all (issue #67: "if the
    // project can produce multiple public builds on one date, extend the
    // version format to distinguish them"). A date-only key would collide
    // outright; this asserts the finer key actually resolves the ordering.
    expect(sortedChangelogVersions(scrambled(DAY_ONE_MORNING, DAY_ONE_EVENING))).toEqual([
      DAY_ONE_EVENING,
      DAY_ONE_MORNING,
    ]);
  });
});

describe('changelogHasVersion', () => {
  it('is true for an authored key and false for anything else', () => {
    expect(changelogHasVersion(CHANGELOG, DAY_TWO_SECOND)).toBe(true);
    expect(changelogHasVersion(CHANGELOG, '2099-01-01T00:00:00Z')).toBe(false);
  });
});

describe('pendingChangelogEntries', () => {
  it('treats a missing acknowledgement as "show everything up to the build"', () => {
    const pending = pendingChangelogEntries(CHANGELOG, DAY_TWO_LAST, null);
    expect(pending.map((p) => p.version)).toEqual([
      DAY_TWO_LAST,
      DAY_TWO_SECOND,
      DAY_TWO_FIRST,
      DAY_ONE_EVENING,
      DAY_ONE_MORNING,
    ]);
  });

  it('shows only what was missed, newest first, for a returning player', () => {
    const pending = pendingChangelogEntries(CHANGELOG, DAY_TWO_LAST, DAY_ONE_EVENING);
    expect(pending.map((p) => p.version)).toEqual([DAY_TWO_LAST, DAY_TWO_SECOND, DAY_TWO_FIRST]);
  });

  it('shows nothing once the current build has been acknowledged', () => {
    expect(pendingChangelogEntries(CHANGELOG, DAY_TWO_LAST, DAY_TWO_LAST)).toEqual([]);
  });

  it('treats a later build on the SAME DAY as still-pending, not already covered', () => {
    // An acknowledgement of the morning release must not swallow an evening
    // release filed under the same date — the exact collision a date-only
    // key could not represent at all.
    const pending = pendingChangelogEntries(CHANGELOG, DAY_ONE_EVENING, DAY_ONE_MORNING);
    expect(pending.map((p) => p.version)).toEqual([DAY_ONE_EVENING]);
  });

  it('never renders content past the compiled build version', () => {
    // A build shipping only day one's entries must not leak the later ones
    // just because they exist later in the same authored file.
    const pending = pendingChangelogEntries(CHANGELOG, DAY_ONE_EVENING, null);
    expect(pending.map((p) => p.version)).toEqual([DAY_ONE_EVENING, DAY_ONE_MORNING]);
  });

  it('handles an unrecognised or future acknowledgement without throwing', () => {
    expect(pendingChangelogEntries(CHANGELOG, DAY_TWO_LAST, '2099-01-01T00:00:00Z')).toEqual([]);
    expect(() => pendingChangelogEntries(CHANGELOG, DAY_TWO_LAST, 'not-a-version')).not.toThrow();
  });

  it('carries the full entry payload, not just the version key', () => {
    const [first] = pendingChangelogEntries(CHANGELOG, DAY_TWO_LAST, DAY_TWO_SECOND);
    expect(first).toEqual({ version: DAY_TWO_LAST, entry: CHANGELOG[DAY_TWO_LAST] });
  });
});
