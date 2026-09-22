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
import { changelogHasVersion, pendingChangelogEntries, sortedChangelogVersions } from './changelog';

const CATALOG: Changelog = {
  '2026-01-01T00:00:00Z': { summary: 'First.', details: ['a'] },
  '2026-03-15T00:00:00Z': { summary: 'Second.', details: ['b'] },
  '2026-06-30T00:00:00Z': { summary: 'Third.', details: ['c'] },
};

describe('sortedChangelogVersions', () => {
  it('orders newest first regardless of authored key order', () => {
    expect(sortedChangelogVersions(CATALOG)).toEqual([
      '2026-06-30T00:00:00Z',
      '2026-03-15T00:00:00Z',
      '2026-01-01T00:00:00Z',
    ]);
  });

  it('orders two builds shipped on the same calendar day by time, not just date', () => {
    // The reason the key carries a time-of-day at all (issue #67: "if the
    // project can produce multiple public builds on one date, extend the
    // version format to distinguish them"). A date-only key would collide
    // outright; this asserts the finer key actually resolves the ordering.
    const sameDay: Changelog = {
      '2026-09-22T09:15:00Z': { summary: 'Morning patch.', details: [] },
      '2026-09-22T18:40:00Z': { summary: 'Evening patch.', details: [] },
    };
    expect(sortedChangelogVersions(sameDay)).toEqual([
      '2026-09-22T18:40:00Z',
      '2026-09-22T09:15:00Z',
    ]);
  });
});

describe('changelogHasVersion', () => {
  it('is true for an authored key and false for anything else', () => {
    expect(changelogHasVersion(CATALOG, '2026-03-15T00:00:00Z')).toBe(true);
    expect(changelogHasVersion(CATALOG, '2099-01-01T00:00:00Z')).toBe(false);
  });
});

describe('pendingChangelogEntries', () => {
  it('treats a missing acknowledgement as "show everything up to the build"', () => {
    const pending = pendingChangelogEntries(CATALOG, '2026-06-30T00:00:00Z', null);
    expect(pending.map((p) => p.version)).toEqual([
      '2026-06-30T00:00:00Z',
      '2026-03-15T00:00:00Z',
      '2026-01-01T00:00:00Z',
    ]);
  });

  it('shows only what was missed, newest first, for a returning player', () => {
    const pending = pendingChangelogEntries(CATALOG, '2026-06-30T00:00:00Z', '2026-01-01T00:00:00Z');
    expect(pending.map((p) => p.version)).toEqual(['2026-06-30T00:00:00Z', '2026-03-15T00:00:00Z']);
  });

  it('shows nothing once the current build has been acknowledged', () => {
    expect(pendingChangelogEntries(CATALOG, '2026-06-30T00:00:00Z', '2026-06-30T00:00:00Z')).toEqual([]);
  });

  it('treats a later build on the SAME DAY as still-pending, not already covered', () => {
    // An acknowledgement of the morning release must not swallow an evening
    // release filed under the same date — the exact collision a date-only
    // key could not represent at all.
    const sameDay: Changelog = {
      '2026-09-22T09:15:00Z': { summary: 'Morning patch.', details: [] },
      '2026-09-22T18:40:00Z': { summary: 'Evening patch.', details: [] },
    };
    const pending = pendingChangelogEntries(sameDay, '2026-09-22T18:40:00Z', '2026-09-22T09:15:00Z');
    expect(pending.map((p) => p.version)).toEqual(['2026-09-22T18:40:00Z']);
  });

  it('never renders content past the compiled build version', () => {
    // A build shipping only the first two entries must not leak the third
    // just because it exists later in the same authored file.
    const pending = pendingChangelogEntries(CATALOG, '2026-03-15T00:00:00Z', null);
    expect(pending.map((p) => p.version)).toEqual(['2026-03-15T00:00:00Z', '2026-01-01T00:00:00Z']);
  });

  it('handles an unrecognised or future acknowledgement without throwing', () => {
    expect(pendingChangelogEntries(CATALOG, '2026-06-30T00:00:00Z', '2099-01-01T00:00:00Z')).toEqual([]);
    expect(() => pendingChangelogEntries(CATALOG, '2026-06-30T00:00:00Z', 'not-a-version')).not.toThrow();
  });

  it('carries the full entry payload, not just the version key', () => {
    const [first] = pendingChangelogEntries(CATALOG, '2026-06-30T00:00:00Z', '2026-03-15T00:00:00Z');
    expect(first).toEqual({ version: '2026-06-30T00:00:00Z', entry: CATALOG['2026-06-30T00:00:00Z'] });
  });
});
