/**
 * The backendless changelog's pure logic (issue #67).
 *
 * The catalog data itself (`CHANGELOG`) is exercised only through
 * `BUILD_VERSION` having an entry — checked by `scripts/validate-content.ts`
 * and `scripts/check-build-version.ts`, not here. What this file pins is the
 * behaviour every version-comparison rule in the issue depends on: newest
 * first, "missing" and "older" both mean everything up to the build, and an
 * unrecognised or future acknowledgement degrades to nothing pending rather
 * than throwing or rendering content this build does not ship.
 */
import { describe, expect, it } from 'vitest';
import type { Changelog } from '../types';
import {
  CHANGELOG,
  changelogHasVersion,
  pendingChangelogEntries,
  sortedChangelogVersions,
} from './changelog';
import { BUILD_VERSION } from '../version';

const CATALOG: Changelog = {
  '2026-01-01': { summary: 'First.', details: ['a'] },
  '2026-03-15': { summary: 'Second.', details: ['b'] },
  '2026-06-30': { summary: 'Third.', details: ['c'] },
};

describe('sortedChangelogVersions', () => {
  it('orders newest first regardless of authored key order', () => {
    expect(sortedChangelogVersions(CATALOG)).toEqual(['2026-06-30', '2026-03-15', '2026-01-01']);
  });
});

describe('changelogHasVersion', () => {
  it('is true for an authored key and false for anything else', () => {
    expect(changelogHasVersion(CATALOG, '2026-03-15')).toBe(true);
    expect(changelogHasVersion(CATALOG, '2099-01-01')).toBe(false);
  });
});

describe('pendingChangelogEntries', () => {
  it('treats a missing acknowledgement as "show everything up to the build"', () => {
    const pending = pendingChangelogEntries(CATALOG, '2026-06-30', null);
    expect(pending.map((p) => p.version)).toEqual(['2026-06-30', '2026-03-15', '2026-01-01']);
  });

  it('shows only what was missed, newest first, for a returning player', () => {
    const pending = pendingChangelogEntries(CATALOG, '2026-06-30', '2026-01-01');
    expect(pending.map((p) => p.version)).toEqual(['2026-06-30', '2026-03-15']);
  });

  it('shows nothing once the current build has been acknowledged', () => {
    expect(pendingChangelogEntries(CATALOG, '2026-06-30', '2026-06-30')).toEqual([]);
  });

  it('never renders content past the compiled build version', () => {
    // A build shipping only the first two entries must not leak the third
    // just because it exists later in the same authored file.
    const pending = pendingChangelogEntries(CATALOG, '2026-03-15', null);
    expect(pending.map((p) => p.version)).toEqual(['2026-03-15', '2026-01-01']);
  });

  it('handles an unrecognised or future acknowledgement without throwing', () => {
    expect(pendingChangelogEntries(CATALOG, '2026-06-30', '2099-01-01')).toEqual([]);
    expect(() => pendingChangelogEntries(CATALOG, '2026-06-30', 'not-a-version')).not.toThrow();
  });

  it('carries the full entry payload, not just the version key', () => {
    const [first] = pendingChangelogEntries(CATALOG, '2026-06-30', '2026-03-15');
    expect(first).toEqual({ version: '2026-06-30', entry: CATALOG['2026-06-30'] });
  });
});

describe('the shipped catalog', () => {
  it('has an entry for the compiled BUILD_VERSION', () => {
    // The structural guarantee `validate:content` and the `prebuild` check
    // enforce, pinned here too so a unit-test run alone still catches a
    // build/changelog drift.
    expect(changelogHasVersion(CHANGELOG, BUILD_VERSION)).toBe(true);
  });
});
