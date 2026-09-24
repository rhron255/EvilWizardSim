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
export const BUILD_VERSION = '2026-09-24T15:30:00Z';

/**
 * The relic-collection reset marker (issue #80, slice 3 of #77).
 *
 * Compared, as a plain sortable string — the same trick `BUILD_VERSION`
 * itself relies on — against a player's persisted `Collection.relicsResetAt`
 * in `migrateCollection` (`src/engine/persistence.ts`): a stored value older
 * than this, or absent, clears `discoveredArtifactIds` on load and re-stamps
 * it to this constant. Endings, themes, the tutorial flag and the last name
 * are untouched — this wipes only the relic grid.
 *
 * Bumped here because origin relics change what a "discovered" relic even
 * means (every new career now starts with one, fully powered, rather than
 * ever being found), so a returning player's existing grid would otherwise
 * read as already-familiar content it never actually saw. `#77`'s own slice 5
 * bumps it again for the same reason, once the legendary powers land.
 */
export const RELICS_RESET_AT_BUILD = '2026-09-24T15:30:00Z';
