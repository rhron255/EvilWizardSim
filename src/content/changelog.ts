/**
 * The backendless changelog (issue #67).
 *
 * One static file, keyed by build version. No server, no fetch — everything a
 * player can ever see here ships inside the build. `src/version.ts`'s
 * `BUILD_VERSION` must always name a key in here; `scripts/check-build-version.ts`
 * and `validate:content` both fail the build otherwise.
 *
 * Newest entry is added at the top for a human reading the diff, but that is
 * a courtesy — `sortedChangelogVersions` is what actually decides display
 * order, so the object's own key order is never load-bearing.
 */

import type { Changelog, ChangelogEntry } from '../types';

export const CHANGELOG: Changelog = {
  '2026-09-22': {
    summary: 'A changelog, so updates stop arriving as a surprise.',
    details: [
      'Added a changelog. It works with no server, which is more reliability than most pacts offer.',
      "A brief popup names what changed since your last visit; dismiss it, or read the full history from the title screen's Changelog door at any time.",
    ],
  },
};

/**
 * Newest first. Version keys are zero-padded ISO dates, so a plain string
 * sort already puts them in the right order — see the format note on
 * `Changelog` in `src/types.ts`.
 */
export function sortedChangelogVersions(changelog: Changelog): string[] {
  return Object.keys(changelog).sort().reverse();
}

export function changelogHasVersion(changelog: Changelog, version: string): boolean {
  return Object.prototype.hasOwnProperty.call(changelog, version);
}

export type PendingChangelogEntry = { version: string; entry: ChangelogEntry };

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
