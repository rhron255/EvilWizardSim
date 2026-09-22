/**
 * The compiled build version (issue #67).
 *
 * Bump this — and add a matching key to `src/content/changelog.ts` — on every
 * change the changelog popup should announce. `scripts/check-build-version.ts`
 * (wired as `prebuild`) and `npm run validate:content` both fail rather than
 * ship a build whose version has no changelog entry.
 *
 * Format is "YYYY-MM-DD", the build's ship date — sortable as a plain string,
 * which is what `sortedChangelogVersions` relies on. If this project ever
 * ships two public builds on the same date, extend the format (e.g.
 * "YYYY-MM-DD.N") before that matters; one date has never yet needed two
 * versions.
 */
export const BUILD_VERSION = '2026-09-22';
