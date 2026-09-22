/**
 * The date a player should read, from a changelog version key that also
 * carries a time-of-day for uniqueness — see `Changelog`'s doc comment in
 * `src/types.ts`: a bare date collides the moment two builds ship in one
 * day, so the key is a full ISO 8601 timestamp, and only ever DISPLAYED as
 * its date part. Nobody needs to know an update shipped at 09:15 UTC
 * specifically; they need to know it shipped on the 22nd.
 *
 * A presentational helper, not engine logic — `ChangelogPopup` (this
 * directory) must not import `src/engine/`, and `ChangelogScreen` uses this
 * over `src/engine/changelog.ts`'s ordering/filtering functions for the same
 * reason both screens should read one formatting rule, not two.
 *
 * Falls back to the raw string for anything that is not a "date`T`rest"
 * shape, rather than throwing on a malformed key — this is display-only,
 * never load-bearing for sorting or comparison.
 */
export function formatChangelogVersion(version: string): string {
  const [date] = version.split('T');
  return date || version;
}
