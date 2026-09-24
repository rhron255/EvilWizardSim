/**
 * The compiled build version (issue #67).
 *
 * Bump this — and add a matching key to `src/content/changelog.ts` — on every
 * change the changelog popup should announce. `scripts/check-build-version.ts`
 * (wired as `prebuild`) and `npm run validate:content` both fail rather than
 * ship a build whose version has no changelog entry.
 *
 * Format is a full ISO 8601 UTC timestamp, "YYYY-MM-DDTHH:mm:ssZ" — sortable
 * as a plain string (every field is fixed-width and zero-padded), which is
 * what `sortedChangelogVersions` relies on. A DATE alone was tried first and
 * dropped: the issue itself calls out that this project can ship more than
 * one public build in a day, and a bare date collides the moment that
 * happens, silently overwriting one entry's key with another's in the
 * `CHANGELOG` object literal. The time-of-day component is what makes every
 * build's version unique regardless of how many ship on the same date; it is
 * not there to be read precisely by a player, which is why the UI shows only
 * the date part (`formatChangelogVersion` in `src/engine/changelog.ts`).
 */
export const BUILD_VERSION = '2026-09-24T12:00:00Z';
