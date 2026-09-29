`/**
` * The game is written in en-GB, and it is easy to lose.
` *
` * Every offer, ending and relic line was authored in British English ("armour",
` * "grey", "honour"), and the docs say so ("Content is en-GB throughout"). But the
` * relic rework wrote "favoring", a Necrolexicon entry says "defense" and a virtue
` * card says "rumor" (title, option and result) — each a small thing, none caught by a type, a test or
` * a review, and together the kind of inconsistency a reader feels without being
` * able to name. Comedy in this game lives in the register; a stray American
` * spelling is a wrong note.
` *
` * This walks every string VALUE in the content catalogue (never identifiers,
` * comments or CSS, which legitimately say \`color\` and \`center\`) and fails on a
` * known American spelling, naming where it is. The list is short on purpose: a
` * long one would start rejecting real words. Add to it when one slips through.
` *
` * Strings a component COMPOSES (`relicPower.ts`'s "Passive: favouring a faction…")
` * are outside this walk; their own tests pin the wording, and did catch the one
` * that carried "favoring".
` */
`import { describe, expect, it } from 'vitest';
`import { CHANGELOG } from './changelog';
`import * as content from './index';
`
`/** [American spelling, what to write instead]. Matched as whole words, any suffix listed. */
`const AMERICAN: readonly [RegExp, string][] = [
`  [/\bfavor(s|ed|ing|able)?\b/i, 'favour'],
`  [/\bhonor(s|ed|ing|able)?\b/i, 'honour'],
`  [/\bcolor(s|ed|ing|ful)?\b/i, 'colour'],
`  [/\bdefense(s|less)?\b/i, 'defence'],
`  [/\bcenter(s|ed|ing)?\b/i, 'centre'],
`  [/\brumor(s|ed)?\b/i, 'rumour'],
`  [/\bneighbor(s|ed|ing|hood|hoods)?\b/i, 'neighbour'],
`  [/\bbehavior(s|al)?\b/i, 'behaviour'],
`  [/\bflavor(s|ed|ing)?\b/i, 'flavour'],
`  [/\bgray\b/i, 'grey'],
`  [/\barmor(s|ed)?\b/i, 'armour'],
`  [/\blabor(s|ed|ing)?\b/i, 'labour'],
`  [/\bharbor(s|ed)?\b/i, 'harbour'],
`  [/\b(recogni|reali|organi|apologi|criticiz|memori|summari|specializ|authori)z(e|es|ed|ing|ation)\b/i, 'the -ise spelling'],
`];
`
`function* strings(value: unknown, path: string): Generator<[string, string]> {
`  if (typeof value === 'string') yield [path, value];
`  else if (Array.isArray(value)) for (const [i, v] of value.entries()) yield* strings(v, `${path}[${i}]`);
`  else if (value && typeof value === 'object')
`    for (const [k, v] of Object.entries(value)) yield* strings(v, path ? `${path}.${k}` : k);
`}
`
`describe('content · spelling', () => {
`  it('is en-GB throughout: no known American spelling in any string a player can read', () => {
`    const found: string[] = [];
`    const sources: [string, unknown][] = [
`      ['factions', content.factions],
`      ['artifacts', content.artifacts],
`      ['lairs', content.lairs],
`      ['origins', content.origins],
`      ['endings', content.endings],
`      ['mechanics', content.mechanics],
`      ['epithets', content.epithets],
`      ['offers', content.offers],
`      ['changelog', CHANGELOG],
`    ];
`    let scanned = 0;
`    for (const [name, value] of sources) {
`      for (const [path, text] of strings(value, name)) {
`        scanned++;
`        for (const [pattern, instead] of AMERICAN) {
`          const m = text.match(pattern);
`          if (m) found.push(`${path}: "${m[0]}" — write "${instead}"`);
`        }
`      }
`    }
`    // A scan that read nothing would pass vacuously.
`    expect(scanned).toBeGreaterThan(2000);
`    expect(found).toEqual([]);
`  });
`
`  it('actually catches a slip (the pattern list is not silently matching nothing)', () => {
`    // A validator rule that matched nothing once reported a dirty catalogue clean
`    // (HANDOFF, "two traps"). Prove each pattern fires on its own word.
`    const samples = ['favoring', 'honored', 'colors', 'defense', 'center', 'rumor', 'neighbors', 'behavior', 'flavor', 'gray', 'armor', 'labor', 'harbor', 'recognized', 'organizes'];
`    for (const word of samples) {
`      expect(AMERICAN.some(([pattern]) => pattern.test(word)), word).toBe(true);
`    }
`    expect(AMERICAN.some(([pattern]) => pattern.test('favourite defence grey licence'))).toBe(false);
`  });
`});
