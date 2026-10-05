/**
 * Ways an ornament's stylesheet loses what it draws without anything failing
 * to compile. The first two lost a card its trim; both shipped, and both were
 * found by looking, not by a check:
 *
 *   1. The Necrolexicon's faction plate composed craft's old `plate` (which
 *      set `background: var(--ew-panel)`) and then set its own trimmed
 *      `background` at the same specificity. Which one wins is decided by the
 *      order the two modules land in the bundle, not by either file — and in
 *      the production build `craft.module.css` lands LATER, so the plate wore
 *      no trim under any theme while the source read as if it did.
 *   2. An ending slot leads its `background` with `var(--ew-trim, none)`, and
 *      its `.current` and `.unseen` states replaced the whole `background`
 *      without it. The slot just reached, and every slot not yet reached, kept
 *      their corner glyphs and lost their trim (CLAUDE.md styling rule 5).
 *
 * The third is forced colours: the section rule is drawn as a gradient over a
 * transparent border, which a forced palette drops, so the rule has to name a
 * real border colour for that case itself; and each ornament is a mask filled
 * with a background colour, which a forced palette turns into a hole in
 * whatever it overlaps, so each one steps aside.
 *
 * What the bundle-order check does NOT cover: it reads `background` and
 * nothing else, because that is where both shipped losses were. Every other
 * property a class sets over one it composes from another file is decided by
 * bundle order in exactly the same way — more than eighty such pairs when this
 * was written, the Prophecy continue button's height and padding among them.
 * Those are a known open issue; a green run here says nothing about them.
 *
 * Everything here is read off disk — the stylesheets and the components that
 * apply their classes — so the rules are checked against what ships, not
 * against anything this file supplies.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SRC = resolve(process.cwd(), 'src');

// --- reading the files ---------------------------------------------------

const walk = (dir: string, keep: (name: string) => boolean): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) return walk(full, keep);
    return keep(entry.name) ? [full] : [];
  });

type Decl = { prop: string; value: string };
type Rule = { selectors: string[]; decls: Decl[]; atRules: string[] };

/** Split on `sep` wherever it is outside parentheses, brackets and quotes. */
function splitTop(text: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (depth === 0 && ch === sep) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

/**
 * Every style rule in a stylesheet, with the at-rules it sits inside. Enough
 * CSS for these files: comments, quoted strings (the grain's data URI),
 * nested `@media`/`@supports`; `@keyframes` bodies are not style rules.
 */
function parseCss(source: string): Rule[] {
  const rules: Rule[] = [];
  const block = (src: string, atRules: string[]) => {
    let i = 0;
    while (i < src.length) {
      const start = i;
      let quote: string | null = null;
      let paren = 0;
      for (; i < src.length; i++) {
        const ch = src[i];
        if (quote) {
          if (ch === '\\') i++;
          else if (ch === quote) quote = null;
        } else if (ch === '"' || ch === "'") quote = ch;
        else if (ch === '(') paren++;
        else if (ch === ')') paren--;
        else if (paren === 0 && (ch === '{' || ch === ';')) break;
      }
      const prelude = squash(src.slice(start, i));
      if (i >= src.length) break;
      if (src[i] === ';') {
        i++;
        continue;
      }
      const bodyStart = ++i;
      let depth = 1;
      quote = null;
      for (; i < src.length && depth > 0; i++) {
        const ch = src[i];
        if (quote) {
          if (ch === '\\') i++;
          else if (ch === quote) quote = null;
        } else if (ch === '"' || ch === "'") quote = ch;
        else if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      const body = src.slice(bodyStart, i - 1);
      if (prelude.startsWith('@')) {
        if (/^@(media|supports|container|layer)\b/.test(prelude)) block(body, [...atRules, prelude]);
        continue;
      }
      const decls = splitTop(body, ';').flatMap((d) => {
        const colon = d.indexOf(':');
        if (colon < 0) return [];
        return [{ prop: d.slice(0, colon).trim().toLowerCase(), value: squash(d.slice(colon + 1)) }];
      });
      rules.push({ selectors: splitTop(prelude, ','), decls, atRules });
    }
  };
  block(source.replace(/\/\*[\s\S]*?\*\//g, ''), []);
  return rules;
}

const MODULES = new Map(
  walk(SRC, (name) => name.endsWith('.module.css')).map((file) => [file, parseCss(readFileSync(file, 'utf8'))]),
);
const rel = (file: string) => file.slice(SRC.length + 1);

// --- selectors -------------------------------------------------------------

/** Drop what sits inside (...) and [...]: `:not(.x)` and `[data-x]` are not the element's own classes. */
const stripGroups = (selector: string) => {
  let out = selector;
  for (let prev = ''; prev !== out; ) {
    prev = out;
    out = out.replace(/\([^()]*\)/g, '').replace(/\[[^[\]]*\]/g, '');
  }
  return out;
};

/** The compound the rule actually styles: the last one, after every combinator. */
const subject = (selector: string) => stripGroups(selector).split(/\s*[\s>+~]\s*/).filter(Boolean).at(-1) ?? '';
const classesOf = (compound: string) => [...compound.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
const isPseudoElement = (compound: string) => /::|:(before|after|first-line|first-letter)\b/.test(compound);

/**
 * Does this rule apply under forced colours, and only there? It must sit in
 * `@media (forced-colors: active)` exactly, once whitespace is squashed, and
 * in no other condition: `not (forced-colors: active)` applies it everywhere
 * else, and `(forced-colors: active) and (max-width: 0px)`, or an outer
 * `@media` around it, can leave it applying nowhere. `@layer` orders rules
 * without conditioning them, so it is let through.
 */
const isForcedOnly = (rule: Rule) => {
  const conditions = rule.atRules.filter((a) => !/^@layer\b/.test(a));
  return (
    conditions.length > 0 &&
    conditions.every((a) => a.replace(/\s*([():])\s*/g, '$1').toLowerCase() === '@media(forced-colors:active)')
  );
};

/** Rules in `file` whose selector list includes exactly `.name`, in any at-rule. */
const rulesFor = (file: string, name: string) =>
  (MODULES.get(file) ?? []).filter((r) => r.selectors.includes(`.${name}`));

// --- composition -----------------------------------------------------------

type Composed = { file: string; name: string };

/** What a `composes:` declaration pulls in, resolved to the file it lives in. */
function composesOf(file: string, decls: Decl[]): Composed[] {
  return decls
    .filter((d) => d.prop === 'composes')
    .flatMap((d) => {
      const m = d.value.match(/^(.*?)(?:\s+from\s+(['"])(.+)\2)?$/);
      if (!m) return [];
      const from = m[3] ? resolve(dirname(file), m[3]) : file;
      return m[1].split(/\s+/).filter(Boolean).map((name) => ({ file: from, name }));
    });
}

/** A class and everything it composes, transitively. */
function closure(start: Composed): Composed[] {
  const seen = new Map<string, Composed>();
  const visit = (c: Composed) => {
    const key = `${c.file}#${c.name}`;
    if (seen.has(key)) return;
    seen.set(key, c);
    for (const rule of rulesFor(c.file, c.name)) for (const next of composesOf(c.file, rule.decls)) visit(next);
  };
  visit(start);
  return [...seen.values()];
}

const isBackground = (prop: string) => prop === 'background' || prop.startsWith('background-');
/** Two declarations fight over the same longhand: a shorthand fights every longhand. */
const overlaps = (a: string, b: string) => a === b || a === 'background' || b === 'background';

// --- the trim --------------------------------------------------------------

const TRIM_LEAD = /^var\(\s*--ew-trim\s*,\s*none\s*\)/;
const paintsImage = (prop: string) => prop === 'background' || prop === 'background-image';

/**
 * Classes whose base rule leads its background with the trim — or that compose
 * one that does, from another file (the faction plate takes its trim from
 * craft's `trimmedPlate`, and its states are bound to keep it just the same).
 */
function trimmedClasses(): Composed[] {
  const leads = (c: Composed) =>
    rulesFor(c.file, c.name).some(
      (r) => r.atRules.length === 0 && r.decls.some((d) => paintsImage(d.prop) && TRIM_LEAD.test(d.value)),
    );
  const out: Composed[] = [];
  for (const [file, rules] of MODULES) {
    for (const name of new Set(rules.flatMap((r) => r.selectors).filter((s) => /^\.[\w-]+$/.test(s)))) {
      const own = { file, name: name.slice(1) };
      if (closure(own).some(leads)) out.push(own);
    }
  }
  return out;
}

/**
 * Classes a component applies to the same element as another — `.current` and
 * `.unseen` beside `.slot`, `.last` beside a lair `.card`. The stylesheet
 * cannot say this (`.current` is a bare selector), so it is read from the
 * components: every `styles.x` inside one `className` attribute, or one
 * declaration that builds a class string, is applied together.
 */
function coApplied(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const files = walk(SRC, (name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name));
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    if (!text.includes('.module.css')) continue;
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const imports = new Map<string, string>();
    for (const stmt of source.statements) {
      if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
      const spec = stmt.moduleSpecifier.text;
      const local = stmt.importClause?.name?.text;
      if (spec.endsWith('.module.css') && local) imports.set(local, resolve(dirname(file), spec));
    }
    if (imports.size === 0) continue;

    const groups = new Map<ts.Node, Composed[]>();
    const isBoundary = (n: ts.Node) =>
      ts.isJsxAttribute(n) || ts.isVariableDeclaration(n) || ts.isPropertyAssignment(n);
    const isOutside = (n: ts.Node) =>
      ts.isJsxElement(n) ||
      ts.isJsxSelfClosingElement(n) ||
      ts.isJsxFragment(n) ||
      ts.isBlock(n) ||
      ts.isSourceFile(n) ||
      ts.isFunctionLike(n);
    const visit = (node: ts.Node) => {
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        imports.has(node.expression.text)
      ) {
        let root: ts.Node = node;
        while (root.parent && !isBoundary(root) && !isOutside(root.parent)) root = root.parent;
        const css = imports.get(node.expression.text) as string;
        groups.set(root, [...(groups.get(root) ?? []), { file: css, name: node.name.text }]);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);

    for (const group of groups.values()) {
      for (const a of group) {
        const key = `${a.file}#${a.name}`;
        const set = out.get(key) ?? new Set<string>();
        for (const b of group) if (b.file === a.file && b.name !== a.name) set.add(b.name);
        out.set(key, set);
      }
    }
  }
  return out;
}

// --- the checks ------------------------------------------------------------

// Background only: see the header for what this leaves open.
describe('CSS modules · a composed background is never fought over', () => {
  /** Every cross-file composition that pulls in a background, and every clash over one. */
  const scan = () => {
    const clashes: string[] = [];
    const pulled: string[] = [];
    for (const [file, rules] of MODULES) {
      for (const rule of rules) {
        const imported = composesOf(file, rule.decls).filter((c) => c.file !== file);
        if (imported.length === 0) continue;
        // `composes` is only legal on a lone class selector.
        const own = rule.selectors[0].slice(1);
        const mine = rulesFor(file, own).flatMap((r) => r.decls.filter((d) => isBackground(d.prop)));
        for (const start of imported) {
          for (const c of closure(start)) {
            const theirs = rulesFor(c.file, c.name).flatMap((r) => r.decls.filter((d) => isBackground(d.prop)));
            if (theirs.length > 0) pulled.push(`${rel(file)} .${own} <- ${rel(c.file)} .${c.name}`);
            for (const t of theirs)
              for (const m of mine)
                if (overlaps(t.prop, m.prop))
                  clashes.push(`${rel(file)} .${own} sets ${m.prop}, and composes .${c.name} from ${rel(c.file)}, which sets ${t.prop}`);
          }
        }
      }
    }
    return { clashes: [...new Set(clashes)], pulled };
  };

  /**
   * Found by this test, and left for the change that owns the file. In the
   * production build the Prophecy's continue button loses EVERY override it
   * sets to `.btn`, not just the fill this line names: its 52px height,
   * padding, colour, border colour and panel fill all go to `.btn`'s, and its
   * `:hover` loses to `.btn:hover:not(:disabled)` on specificity in any bundle
   * order. (The fill is also the default room's panel as a fixed rgba.) Only
   * the background is listed because only the background is checked. Listed,
   * not ignored: fixing it without deleting the line here fails the test just
   * as a new clash does.
   */
  const PENDING = [
    'screens/ProphecyInterstitial.module.css .continue sets background, and composes .btn from components/meta/craft.module.css, which sets background',
  ];

  it('is checking something: it sees the compositions that pull in a background', () => {
    // Guards the guard: a parser that missed every `composes:` would pass the
    // test below having checked nothing. Anchored to compositions no fix here
    // touches — every set piece takes its shell, void and key light from
    // craft's `.screen`, and the plain buttons take their fill from `.btn`.
    const { pulled } = scan();
    expect(pulled).toContain('screens/TitleScreen.module.css .screen <- components/meta/craft.module.css .screen');
    expect(pulled).toContain('screens/EndingScreen.module.css .screen <- components/meta/craft.module.css .screen');
    expect(pulled).toContain('screens/ChangelogScreen.module.css .bottomBack <- components/meta/craft.module.css .btn');
  });

  it('never sets a background on a class that composes one from another file', () => {
    // Which of two equal-specificity rules wins is decided by the order the
    // two modules land in the bundle — not by either file, and not the same
    // order in dev as in the build. A class that needs a background of its own
    // composes a FRAME (`plateFrame`, `plateDoubleFrame` in craft.module.css)
    // or a class that already carries that background (`trimmedPlate`).
    // Every other property has the same hazard and is not checked here.
    expect(scan().clashes).toEqual(PENDING);
  });
});

describe('CSS modules · a trimmed card keeps its trim in every state', () => {
  const trimmed = trimmedClasses();
  const together = coApplied();

  it('is checking something: it finds the trimmed cards, and the slot states beside them', () => {
    // Guards the guard, anchored to the two cards this check was written for.
    const names = trimmed.map((c) => `${rel(c.file)} .${c.name}`);
    expect(names).toContain('components/run/OptionCard.module.css .card');
    expect(names).toContain('components/meta/EndingSlot.module.css .slot');
    expect(names).toContain('screens/NecrolexiconScreen.module.css .factionEntry');
    const slot = together.get(`${resolve(SRC, 'components/meta/EndingSlot.module.css')}#slot`);
    expect([...(slot ?? [])]).toEqual(expect.arrayContaining(['current', 'unseen']));
  });

  it('puts the corner glyphs on every card it trims', () => {
    // Styling rule 5: a card wears the room through two tokens, its trim and
    // the glyphs at its corners (craft's `pips`). Losing the corners fails
    // nothing else here — a trim with no `pips` still leads every background
    // — so it is checked on its own. A modifier (`.current`, `.unseen`) takes
    // its corners from the card class applied beside it.
    const pips = `${resolve(SRC, 'components/meta/craft.module.css')}#pips`;
    const wears = (c: Composed) => closure(c).some((x) => `${x.file}#${x.name}` === pips);
    // Anchored to the plate that takes both from one class: dropping `pips`
    // from `trimmedPlate`'s `composes` stripped the faction plate's corners
    // with every other check here still green.
    expect(wears({ file: resolve(SRC, 'screens/NecrolexiconScreen.module.css'), name: 'factionEntry' })).toBe(true);
    const bare = trimmed.filter((card) => {
      const beside = [...(together.get(`${card.file}#${card.name}`) ?? [])].map((name) => ({ file: card.file, name }));
      return ![card, ...beside].some(wears);
    });
    expect(bare.map((c) => `${rel(c.file)} .${c.name}`)).toEqual([]);
  });

  it('leads every background on the same element with var(--ew-trim, none)', () => {
    // Styling rule 5: the trim goes first in hover and active too, "or the
    // trim vanishes under a finger" — and in every modifier that repaints the
    // card, or it vanishes on the one card the player is looking at. A rule on
    // a pseudo-element or a descendant styles another box, and is left alone.
    const offenders = new Set<string>();
    for (const card of trimmed) {
      const same = new Set([card.name, ...(together.get(`${card.file}#${card.name}`) ?? [])]);
      for (const rule of MODULES.get(card.file) ?? []) {
        const hits = rule.selectors.filter((s) => {
          const compound = subject(s);
          return !isPseudoElement(compound) && classesOf(compound).some((c) => same.has(c));
        });
        if (hits.length === 0) continue;
        for (const d of rule.decls)
          if (paintsImage(d.prop) && !TRIM_LEAD.test(d.value))
            offenders.add(`${rel(card.file)} ${hits.join(', ')} { ${d.prop}: ${d.value} }`);
      }
    }
    expect([...offenders]).toEqual([]);
  });
});

describe('CSS modules · a painted rule survives forced colours', () => {
  /** A declaration that sets a border's colour: the shorthands, or a `-color` longhand. */
  const bordersColour = (d: Decl) => /^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?$/.test(d.prop);
  /** `transparent` as a colour of its own, not as one end of a `color-mix()`. */
  const hidesBorder = (d: Decl) => bordersColour(d) && /(^|\s)transparent(\s|$)/.test(stripGroups(d.value));
  const gradient = (d: Decl) => paintsImage(d.prop) && /gradient\(/.test(d.value);

  /** Rules that hide their border and draw the line as a gradient in its place. */
  const painted = () =>
    [...MODULES].flatMap(([file, rules]) =>
      rules
        .filter((r) => r.atRules.length === 0 && r.decls.some(hidesBorder) && r.decls.some(gradient))
        .map((rule) => ({ file, rule })),
    );

  it('is checking something: the section rule is a painted one', () => {
    const found = painted().map(({ file, rule }) => `${rel(file)} ${rule.selectors.join(', ')}`);
    expect(found).toContain('components/meta/craft.module.css .sectionRule');
  });

  it('names a real border colour for every painted rule under forced colours', () => {
    // A forced palette drops gradient backgrounds, so the painted line is
    // gone, and whether the transparent border beneath it is repainted is the
    // engine's choice. Each one names its border in a system colour instead.
    const missing: string[] = [];
    for (const { file, rule } of painted()) {
      const restored = (MODULES.get(file) ?? []).some(
        (r) =>
          isForcedOnly(r) &&
          r.selectors.some((s) => rule.selectors.includes(s)) &&
          r.decls.some((d) => bordersColour(d) && !hidesBorder(d)),
      );
      if (!restored) missing.push(`${rel(file)} ${rule.selectors.join(', ')}`);
    }
    expect(missing).toEqual([]);
  });
});

describe('CSS modules · ornament steps aside under forced colours', () => {
  /** A mask declaration that cuts a theme ornament's shape (`--ew-pip`, `--ew-motif`). */
  const ornamentMask = (d: Decl) => /^(-webkit-)?mask(-image)?$/.test(d.prop) && /var\(\s*--ew-(pip|motif)\b/.test(d.value);

  /**
   * Every selector that paints an ornament: a fill seen through the ornament's
   * mask. Under a forced palette the fill becomes a system colour and the shape
   * a hole in whatever it overlaps — the section glyph cut a notch out of the
   * very rule it sits on.
   */
  const masked = () =>
    [...MODULES].flatMap(([file, rules]) =>
      rules
        .filter((r) => !isForcedOnly(r) && r.decls.some(ornamentMask))
        .flatMap((r) => r.selectors.map((selector) => ({ file, selector }))),
    );

  it('is checking something: the section glyph and the corner glyphs are masked ornaments', () => {
    const found = masked().map(({ file, selector }) => `${rel(file)} ${selector}`);
    expect(found).toContain('components/meta/craft.module.css .sectionRule::after');
    expect(found).toContain('components/meta/craft.module.css .pips::after');
  });

  it('hides every masked ornament under forced colours', () => {
    const shown = masked().filter(
      ({ file, selector }) =>
        !(MODULES.get(file) ?? []).some(
          (r) =>
            isForcedOnly(r) &&
            r.selectors.includes(selector) &&
            r.decls.some((d) => d.prop === 'display' && d.value === 'none'),
        ),
    );
    expect(shown.map(({ file, selector }) => `${rel(file)} ${selector}`)).toEqual([]);
  });
});
