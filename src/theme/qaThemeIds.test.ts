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
  parseThemeNames,
  parseThemes,
  THEMES_SOURCE,
  themeEndingIds,
  themeIds,
  themeNames,
  themes,
} from '../../qa/theme-ids.mjs';
import { THEMES } from './themes';

describe('qa/theme-ids.mjs', () => {
  it('reads exactly the THEMES ids, in THEMES order', () => {
    expect(themeIds()).toEqual(THEMES.map((t) => t.id));
  });

  it('reads exactly the THEMES names, in THEMES order', () => {
    // `qa/probe-themes.mjs` builds its "no locked theme leaks its name" check
    // from this list. A name it missed is a name that check can no longer see.
    expect(themeNames()).toEqual(THEMES.map((t) => t.name));
  });

  it('reads a name in either quote style, and refuses to guess at an escaped one', () => {
    const source = (line: string) => `export const THEMES: ThemeDef[] = [\n  {\n    id: 'x',\n    ${line}\n  },\n];`;
    expect(parseThemeNames(source("name: 'The Tower',"))).toEqual(['The Tower']);
    expect(parseThemeNames(source('name: "Wizard\'s Den",'))).toEqual(["Wizard's Den"]);
    // An escaped quote is not read at all, so the list comes up one short and
    // the THEMES comparison above fails, rather than a probe misreading it.
    expect(() => parseThemeNames(source("name: 'Wizard\\'s Den',"))).toThrow(/no THEMES entry/);
  });

  it('reads exactly the endings that unlock a theme, in THEMES order', () => {
    expect(themeEndingIds()).toEqual(THEMES.flatMap((t) => (t.endingId === null ? [] : [t.endingId])));
  });

  it('pairs each theme with its own name and ending, the default with none', () => {
    // `qa/probe-themes.mjs` reads which names a one-ending player has unlocked
    // off this pairing; one entry out of step would call a locked name safe.
    expect(themes()).toEqual(THEMES.map(({ id, name, endingId }) => ({ id, name, endingId })));
  });

  it('refuses to pair the lists when an entry is missing a field', () => {
    const entry = (id: string, lines: string) => `  {\n    id: '${id}',\n${lines}  },\n`;
    const whole = entry('a', "    name: 'A',\n    endingId: null,\n") + entry('b', "    name: 'B',\n    endingId: 'b',\n");
    expect(parseThemes(`export const THEMES = [\n${whole}];`)).toEqual([
      { id: 'a', name: 'A', endingId: null },
      { id: 'b', name: 'B', endingId: 'b' },
    ]);
    const noName = entry('a', '    endingId: null,\n') + entry('b', "    name: 'B',\n    endingId: 'b',\n");
    expect(() => parseThemes(`export const THEMES = [\n${noName}];`)).toThrow(/2 ids, 1 names and 2 endingIds/);
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
    expect(() => parseThemeNames('export const THEMES: ThemeDef[] = [\n];')).toThrow(/no THEMES entry/);
    expect(() => parseThemeIds("const OTHER = [\n  {\n    id: 'x',\n  },\n];")).toThrow(/no `export const THEMES`/);
  });
});
