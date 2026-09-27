/**
 * The backendless changelog's pure logic (issue #67).
 *
 * Split out of `src/content/changelog.ts` — which now holds only the
 * `CHANGELOG` data — per PR #68 review: content and the code that interprets
 * it should not share a file, so editing one can never silently reshape the
 * other. Every function here takes a `Changelog` as a plain argument, the
 * same way the rest of the engine takes a `ContentBundle`; nothing here
 * imports `src/content/`.
 */

import type { Changelog, PendingChangelogEntry } from '../types';

/**
 * Newest first. Version keys are zero-padded ISO 8601 UTC timestamps, so a
 * plain string sort already puts them in the right order — see the format
 * note on `Changelog` in `src/types.ts`.
 */
export function sortedChangelogVersions(changelog: Changelog): string[] {
  return Object.keys(changelog).sort().reverse();
}

export function changelogHasVersion(changelog: Changelog, version: string): boolean {
  return Object.prototype.hasOwnProperty.call(changelog, version);
}

/**
 * Every entry the player has not yet acknowledged, newest first.
 *
 * Capped at `buildVersion` so an acknowledged-version cookie naming something
 * unrecognised or from the future — the issue's own phrase — never renders
 * content this build does not ship; it degrades to "nothing pending" for any
 * version this build cannot place in order, rather than guessing.
 *
 * `acknowledged === null` means "first-ever launch" (or storage that failed
 * to read at all, which persistence.ts already folds into the same value):
 * everything up to the build version is pending, same as a returning player
 * who missed every update since day one.
 */
export function pendingChangelogEntries(
  changelog: Changelog,
  buildVersion: string,
  acknowledged: string | null,
): PendingChangelogEntry[] {
  return sortedChangelogVersions(changelog)
    .filter((v) => v <= buildVersion)
    .filter((v) => acknowledged === null || v > acknowledged)
    .map((version) => ({ version, entry: changelog[version] }));
}
