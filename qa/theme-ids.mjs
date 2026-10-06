/**
 * The theme ids, read off disk from `src/theme/themes.ts`.
 *
 * The probes run under plain node against a dev server, so they cannot import
 * `THEMES` itself (it is TypeScript, and it pulls in the token modules). Every
 * one of them used to carry a hand-copied list instead, and a hand list drifts:
 * `probe-themes.mjs` still said "all eight themes" against twenty. So the list
 * lives in exactly one place, `THEMES`, and this reads it.
 *
 * It is a parser, and a parser can be wrong quietly, so it is not its own
 * judge: `src/theme/qaThemeIds.test.ts` imports the real `THEMES` and asserts
 * this returns exactly its ids, names and endings, in order (CLAUDE.md failure
 * mode 11). What the parser relies on is the shape `THEMES` is written in (by
 * hand: the repo runs no formatter): one object per theme, opened at two spaces of indent, with its own `id`,
 * `name` and `endingId` as four-space fields. A field nested deeper (an
 * `ornament`, a `surface`) is at six and is never read.
 *
 *   import { themeIds, themeNames, themeEndingIds, themes } from './theme-ids.mjs';
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const THEMES_SOURCE = resolve(dirname(fileURLToPath(import.meta.url)), '../src/theme/themes.ts');

/** The text of the `THEMES` array literal, from its `[` to the `];` that closes it. */
function themesArray(source) {
  const open = source.indexOf('export const THEMES');
  if (open === -1) throw new Error(`theme-ids: no \`export const THEMES\` in ${THEMES_SOURCE}`);
  const close = source.indexOf('\n];', open);
  if (close === -1) throw new Error(`theme-ids: the THEMES array in ${THEMES_SOURCE} never closes with \`];\``);
  return source.slice(open, close);
}

function field(source, pattern, what) {
  // The first group that matched: a pattern may offer two quote styles.
  const found = [...themesArray(source).matchAll(pattern)].map((m) => m.slice(1).find((g) => g !== undefined));
  if (found.length === 0) {
    throw new Error(`theme-ids: found no THEMES entry ${what} in ${THEMES_SOURCE} — has its layout changed?`);
  }
  return found;
}

/** Every theme's `id`, in `THEMES` order. Throws rather than return an empty list. */
export function parseThemeIds(source) {
  return field(source, /^ {4}id: '([^']+)',$/gm, '`id`');
}

/**
 * Every theme's display `name`, in `THEMES` order — the words a locked swatch
 * must never print. A name with an apostrophe in it would be written in double
 * quotes, so both quote styles are read; one written with an escaped quote
 * (`'Wizard\'s Den'`) is not, and `qaThemeIds.test.ts` fails on it.
 */
export function parseThemeNames(source) {
  return field(source, /^ {4}name: (?:'([^']+)'|"([^"]+)"),$/gm, '`name`');
}

/**
 * The ending each earned theme is unlocked by, in `THEMES` order — what a
 * probe seeds `endingsSeen` with to open the whole selector. The default theme
 * (`endingId: null`) has none and is not in it.
 */
export function parseThemeEndingIds(source) {
  return field(source, /^ {4}endingId: '([^']+)',$/gm, '`endingId`');
}

/**
 * Every theme as `{ id, name, endingId }`, in `THEMES` order, with the default
 * theme's `endingId` as `null` — for a probe that has to know WHICH theme an
 * ending unlocks, not just that it unlocks one. The three fields are read as
 * three lists and zipped, so it throws unless every entry has all three: a
 * missing line would otherwise pair every theme after it with its neighbour's
 * name.
 */
export function parseThemes(source) {
  const ids = parseThemeIds(source);
  const names = parseThemeNames(source);
  const endings = [...themesArray(source).matchAll(/^ {4}endingId: (?:'([^']+)'|null),$/gm)].map((m) => m[1] ?? null);
  if (names.length !== ids.length || endings.length !== ids.length) {
    throw new Error(
      `theme-ids: ${ids.length} ids, ${names.length} names and ${endings.length} endingIds in ${THEMES_SOURCE} — every THEMES entry needs one line of each`,
    );
  }
  return ids.map((id, i) => ({ id, name: names[i], endingId: endings[i] }));
}

const read = () => readFileSync(THEMES_SOURCE, 'utf8');

export const themeIds = () => parseThemeIds(read());
export const themeNames = () => parseThemeNames(read());
export const themeEndingIds = () => parseThemeEndingIds(read());
export const themes = () => parseThemes(read());
