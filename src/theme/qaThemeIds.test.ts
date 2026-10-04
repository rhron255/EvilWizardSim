/**
 * The QA probes' theme list is the real one.
 *
 * `qa/theme-ids.mjs` reads the theme ids out of `themes.ts` with a regex,
 * because the probes run under plain node and cannot import TypeScript. A
 * regex that silently drops an entry would leave a probe measuring nineteen
 * themes and reporting all clear — so the expectation here comes from the
 * `THEMES` import itself, never from the parser's own reading of the file
 * (CLAUDE.md failure mode 11).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  parseThemeEndingIds,
  parseThemeIds,
  THEMES_SOURCE,
  themeEndingIds,
  themeIds,
} from '../../qa/theme-ids.mjs';
import { THEMES } from './themes';

describe('qa/theme-ids.mjs', () => {
  it('reads exactly the THEMES ids, in THEMES order', () => {
    expect(themeIds()).toEqual(THEMES.map((t) => t.id));
  });

  it('reads exactly the endings that unlock a theme, in THEMES order', () => {
    expect(themeEndingIds()).toEqual(THEMES.flatMap((t) => (t.endingId === null ? [] : [t.endingId])));
  });

  it('reads the file the app builds from', () => {
    // The ids above could match by luck if the reader pointed at a stale copy;
    // this pins it to the module `./themes` resolves to.
    expect(THEMES_SOURCE.replace(/\\/g, '/')).toMatch(/\/src\/theme\/themes\.ts$/);
    expect(readFileSync(THEMES_SOURCE, 'utf8')).toContain('export const THEMES');
  });

  it('throws instead of returning an empty list', () => {
    // An empty list is the dangerous failure: a probe looping over it measures
    // nothing and prints a clean result.
    expect(() => parseThemeIds('export const THEMES: ThemeDef[] = [\n];')).toThrow(/no THEMES entry/);
    expect(() => parseThemeEndingIds('export const THEMES: ThemeDef[] = [\n];')).toThrow(/no THEMES entry/);
    expect(() => parseThemeIds("const OTHER = [\n  {\n    id: 'x',\n  },\n];")).toThrow(/no `export const THEMES`/);
  });
});
