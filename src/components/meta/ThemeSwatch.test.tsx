/**
 * The selector's glyph, against every room it can be printed in.
 *
 * A swatch previews one theme on the card of ANOTHER — the room being worn —
 * so its glyph, drawn in the previewed theme's strong line colour, lands on
 * panels it was never chosen for: a dark indigo on a grey card, a slate on the
 * cream one. The stylesheet mixes it toward the current room's ink; this
 * sweeps every (previewed × worn) pair and holds it to 3:1, the floor WCAG 2.1
 * SC 1.4.11 sets for non-text contrast. The glyph is a graphical object — it
 * identifies the room — not text, so 1.4.11 is the criterion rather than the
 * 4.5:1 of 1.4.3.
 *
 * Anchoring (CLAUDE.md failure mode 11): the paint is read OFF DISK from
 * `ThemeSwatch.module.css` — the glyph's mix (how much of the previewed colour,
 * mixed toward which token) and every background a swatch can wear — so the
 * sweep measures the bytes a browser receives rather than a constant the
 * component also uses. The colours behind those tokens come from the theme
 * table, the same source the `[data-theme]` blocks are tested against. Which
 * elements sit between the glyph and the card is read off the rendered
 * component, not listed here.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { contrastRatio } from '../../theme/contrast';
import { over } from '../../theme/oklab';
import { DEFAULT_THEME_ID, THEMES, swatchBands, themeFor, themeVars } from '../../theme/themes';
import { tierColor } from '../../theme/tokens';
import { ThemeSwatch } from './ThemeSwatch';
import styles from './ThemeSwatch.module.css';

/** WCAG 2.1 SC 1.4.11: graphical objects need 3:1 against adjacent colours. */
const NON_TEXT_CONTRAST = 3;

const CSS = readFileSync(resolve(process.cwd(), 'src/components/meta/ThemeSwatch.module.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** Every rule in the module as `[selector, body]`. It has no at-rules to nest. */
const RULES = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => [sel.trim(), body] as const);

/** The properties a rule sets, lower-cased. */
const propsOf = (body: string) =>
  body
    .split(';')
    .map((d) => d.slice(0, d.indexOf(':')).trim().toLowerCase())
    .filter(Boolean);

const isBackground = (prop: string) => prop === 'background' || prop.startsWith('background-');

/** Properties that recolour a box after its own background is resolved: the mix the sweep reads would not be what is drawn. */
const REPAINTS = new Set(['filter', 'opacity', 'mix-blend-mode']);

/**
 * The compound a selector actually styles — the last one, after every
 * combinator — with `:not(...)`/`[...]` contents dropped (they are conditions,
 * not the element's own classes). Whether it is a pseudo-element is kept apart:
 * a `::before` on the glyph is painted INSIDE the glyph's mask, so it counts as
 * the glyph; one on an ancestor is a separate box, and does not.
 */
function subjectOf(selector: string) {
  let bare = selector;
  for (let prev = ''; prev !== bare; ) {
    prev = bare;
    bare = bare.replace(/\([^()]*\)/g, '').replace(/\[[^[\]]*\]/g, '');
  }
  const compound = bare.split(/\s*[\s>+~]\s*/).filter(Boolean).at(-1) ?? '';
  return {
    classes: [...compound.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]),
    pseudoElement: /::|:(?:before|after|first-line|first-letter)\b/.test(compound),
  };
}

/** Every selector in a rule's selector list. This module has none with a comma inside parentheses. */
const selectorsOf = (prelude: string) => prelude.split(',').map((s) => s.trim());

/** Does this selector name `.glyph` anywhere, as a whole class? */
const namesGlyph = (selector: string) => /\.glyph(?![\w-])/.test(selector);

/** The module's own class names on an element, as the stylesheet spells them. */
const LOCAL = new Map(Object.entries(styles as Record<string, string>).map(([name, hashed]) => [hashed, name]));
const localOf = (el: Element) => [...el.classList].flatMap((c) => (LOCAL.has(c) ? [LOCAL.get(c) as string] : []));

/**
 * The classes on the elements between the glyph and the card, the card's own
 * included — read off a rendered, unlocked and worn swatch, not listed by hand.
 */
function glyphAncestors(): { card: Set<string>; between: Set<string> } {
  const { container, unmount } = render(<ThemeSwatch theme={THEMES[0]} unlocked selected onSelect={() => {}} />);
  const glyph = container.querySelector('[data-part="glyph"]');
  const button = container.querySelector('button');
  if (!glyph || !button) throw new Error('a worn swatch renders no glyph inside a button');
  const between = new Set<string>();
  for (let el = glyph.parentElement; el && el !== button; el = el.parentElement) localOf(el).forEach((c) => between.add(c));
  const card = new Set(localOf(button));
  unmount();
  return { card, between };
}

/** The value a rule gives a background, the last declaration winning as in the cascade. */
function backgroundOf(selector: string): string {
  const rule = RULES.find(([sel]) => sel === selector);
  if (!rule) throw new Error(`ThemeSwatch.module.css has no \`${selector}\` rule`);
  const values = [...rule[1].matchAll(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/g)].map((m) => m[1].trim());
  if (!values.length) throw new Error(`\`${selector}\` paints no background`);
  return values[values.length - 1];
}

const VAR = /^var\((--[\w-]+)\)$/;
const MIX = /^color-mix\(\s*in srgb\s*,\s*var\((--[\w-]+)\)\s+([\d.]+)%\s*,\s*var\((--[\w-]+)\)\s*\)$/;

/**
 * A background value resolved to a hex, given what each custom property holds.
 * Only the two forms this stylesheet uses; anything else throws, so a new form
 * fails here rather than going unmeasured.
 */
function paint(value: string, vars: Record<string, string>): string {
  const lookup = (name: string) => {
    if (!vars[name]) throw new Error(`nothing sets ${name}`);
    return vars[name];
  };
  const plain = VAR.exec(value);
  if (plain) return lookup(plain[1]);
  const mix = MIX.exec(value);
  // color-mix(in srgb, A p%, B) is A over B at p, interpolated in sRGB.
  if (mix) return over(lookup(mix[3]), lookup(mix[1]), Number(mix[2]) / 100);
  throw new Error(`the sweep cannot resolve \`${value}\` — teach it the new form along with the stylesheet`);
}

const GLYPH = MIX.exec(backgroundOf('.glyph'));

/** The custom property the glyph's previewed colour arrives in, per the stylesheet. */
const STRONG_VAR = GLYPH?.[1] ?? '';

/**
 * The three backgrounds a swatch with a glyph can wear: at rest, under a finger,
 * worn. The first test below holds this list to every rule in the stylesheet
 * that paints the card, so a fourth state cannot go unmeasured.
 */
const STATES = [
  ['card', '.swatch'],
  ['hover', '.unlocked:hover'],
  ['worn', '.selected'],
] as const;

/** Every token a room sets: the default's, with the worn theme's overrides on top. */
function roomVars(worn: (typeof THEMES)[number]): Record<string, string> {
  return { ...themeVars(themeFor(DEFAULT_THEME_ID)), ...themeVars(worn) };
}

describe('ThemeSwatch · the glyph reads in every room', () => {
  it('is painted by a mix the sweep can read, and by nothing it cannot', () => {
    // The sweep below only means something if this IS the colour drawn.
    expect(GLYPH, '.glyph is no longer `color-mix(in srgb, var(--…) N%, var(--…))`').not.toBeNull();
    expect(
      RULES.filter(([sel]) => sel === '.glyph').length,
      'the sweep reads the first `.glyph` rule; a second one would paint over it unread',
    ).toBe(1);

    const { card, between } = glyphAncestors();
    // Guards the guard: an ancestor set this check never saw would pass it.
    expect([...card]).toEqual(expect.arrayContaining(['swatch', 'unlocked', 'selected']));
    expect([...between]).toEqual(expect.arrayContaining(['body', 'name']));

    const problems: string[] = [];
    const cardBackgrounds: string[] = [];
    for (const [prelude, body] of RULES) {
      const props = propsOf(body);
      for (const sel of selectorsOf(prelude)) {
        const { classes, pseudoElement } = subjectOf(sel);
        // A type or universal subject (`.name span`) lands on the glyph and
        // on every box around it.
        const anyElement = classes.length === 0;
        // A locked swatch has no glyph (the component withholds it), so a
        // rule that only reaches locked swatches cannot touch one.
        const locked = /\.locked(?![\w-])/.test(sel);

        // The glyph itself, or a box drawn inside its mask: the `.glyph`
        // rule is the one colour the sweep reads, and nothing else may paint
        // there — a hover or worn state recolouring the glyph is exactly the
        // pair the sweep would then be measuring wrongly.
        if ((namesGlyph(sel) || anyElement) && sel !== '.glyph')
          for (const p of props.filter(isBackground)) problems.push(`${sel} { ${p} } paints the glyph over the mix`);

        // A filter or opacity on the glyph, or on any box it sits in,
        // repaints the mix after it is resolved — the brightness filter this
        // replaced is what pushed grey glyphs into the cream room — and no
        // contrast sum here could see it.
        const onGlyph = namesGlyph(sel) || anyElement;
        const onAncestor =
          !pseudoElement && !locked && (anyElement || classes.some((c) => card.has(c) || between.has(c)));
        if (onGlyph || onAncestor)
          for (const p of props.filter((q) => REPAINTS.has(q))) problems.push(`${sel} { ${p} } repaints the glyph`);

        // Between the glyph and the card, a background would be the backdrop
        // the glyph is actually seen on, and the sweep measures the card's.
        if (!pseudoElement && !locked && classes.some((c) => between.has(c)) && !classes.some((c) => card.has(c)))
          for (const p of props.filter(isBackground)) problems.push(`${sel} { ${p} } puts an unmeasured backdrop behind the glyph`);

        // The card's own backgrounds are the ones the sweep measures — every one of them.
        if (!pseudoElement && !locked && classes.some((c) => card.has(c)) && props.some(isBackground))
          cardBackgrounds.push(sel);
      }
    }
    expect(problems).toEqual([]);
    expect(
      [...new Set(cardBackgrounds)].sort(),
      'a swatch background the sweep does not measure: add it to STATES',
    ).toEqual(STATES.map(([, sel]) => sel).sort());
  });

  it('keeps the previewed colour in the majority of the mix', () => {
    // Mixed mostly toward the current ink, every glyph would turn the colour
    // of the name beside it and stop previewing anything but its shape.
    expect(Number(GLYPH?.[2])).toBeGreaterThan(50);
  });

  it('hands the previewed strong line to the stylesheet rather than painting over it', () => {
    for (const theme of THEMES) {
      const { container, unmount } = render(
        <ThemeSwatch theme={theme} unlocked selected={false} onSelect={() => {}} />,
      );
      const glyph = container.querySelector<HTMLElement>('[data-part="glyph"]');
      expect(glyph, theme.id).not.toBeNull();
      expect(glyph!.style.getPropertyValue(STRONG_VAR).toLowerCase(), theme.id).toBe(
        swatchBands(theme).lineStrong.toLowerCase(),
      );
      // Inline beats the stylesheet: an inline colour or filter here would
      // be drawn instead of the mix that the sweep measures.
      expect(glyph!.style.backgroundColor, theme.id).toBe('');
      expect(glyph!.style.background, theme.id).toBe('');
      expect(glyph!.style.filter, theme.id).toBe('');
      expect(glyph!.style.opacity, theme.id).toBe('');
      unmount();
    }
  });

  it(`clears ${NON_TEXT_CONTRAST}:1 for every theme previewed in every room, at rest, hovered and worn`, () => {
    expect(GLYPH).not.toBeNull();
    const failures: string[] = [];
    let worst = { ratio: Infinity, where: '' };
    for (const worn of THEMES) {
      for (const previewed of THEMES) {
        const vars = { ...roomVars(worn), [STRONG_VAR]: swatchBands(previewed).lineStrong };
        const glyph = paint(backgroundOf('.glyph'), vars);
        for (const [state, selector] of STATES) {
          // The worn swatch mixes in the tier colour, which the selector binds
          // to the collection's best run — so every tier, not one.
          const backs = new Set(
            Object.values(tierColor).map((tier) => paint(backgroundOf(selector), { ...vars, '--ew-tier': tier })),
          );
          for (const back of backs) {
            const ratio = contrastRatio(glyph, back);
            const where = `${previewed.name} in ${worn.name} (${state}, ${back}): ${ratio.toFixed(2)}`;
            if (ratio < worst.ratio) worst = { ratio, where };
            if (ratio < NON_TEXT_CONTRAST) failures.push(where);
          }
        }
      }
    }
    expect(failures, `worst pair: ${worst.where}`).toEqual([]);
  });
});

/**
 * The name beside the glyph. The glyph took ~20px out of a 114px card at 320
 * wide, and the name, bare text in a flex row, could not shrink below its
 * longest word: "Correspondence" ran 15px past the card's padding, and in New
 * Management's Inter it ran past at 393 too. jsdom lays nothing out, so the fix
 * was measured in Chromium with the real webfonts — every name, wearing the
 * default and New Management, at 320 and 393.
 *
 * What that measurement rests on, pinned so tidying cannot undo it: the row
 * may wrap; the name takes the rest of its line but can never be squeezed
 * below its longest word (its automatic minimum), so a word that will not fit
 * beside the glyph drops under it instead of splitting there; the name is
 * capped at the card's width; and nothing on it or around it lets a word
 * break, or a line not break, anywhere else. Where a comment below says what a
 * change did, it was tried in Chromium on a card just wide enough for
 * "Correspondence" on a line of its own.
 *
 * It reads this module only. An inherited `white-space` or `hyphens` from a
 * stylesheet outside it (the selector's grid, the page) is not seen here.
 */

/** One declaration in the module, under the selector list of its rule, in source order. */
type Decl = { selectors: string[]; prop: string; value: string; important: boolean };

const DECLS: Decl[] = RULES.flatMap(([prelude, body]) =>
  body.split(';').flatMap((text) => {
    const colon = text.indexOf(':');
    if (colon < 0) return [];
    const value = text.slice(colon + 1).replace(/\s+/g, ' ').trim();
    const important = /!\s*important$/i.test(value);
    return [
      {
        selectors: selectorsOf(prelude),
        prop: text.slice(0, colon).trim().toLowerCase(),
        value: important ? value.replace(/\s*!\s*important$/i, '') : value,
        important,
      },
    ];
  }),
);

/** CSS-wide keywords: a shorthand given one gives it to every longhand. */
const CSS_WIDE = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);

/** Logical properties, as the physical ones they set in this horizontal writing mode. */
const LOGICAL: Record<string, string> = {
  'min-inline-size': 'min-width',
  'max-inline-size': 'max-width',
  'inline-size': 'width',
  'overflow-inline': 'overflow-x',
  'overflow-block': 'overflow-y',
};

const WRAP_MODE = /^(wrap|nowrap)$/;
const pick = (parts: string[], keyword: RegExp, fallback: string) => parts.find((p) => keyword.test(p)) ?? fallback;

/** `white-space`'s keywords, as the two longhands CSS Text 4 splits it into: collapse, then wrap mode. */
const WHITE_SPACE: Record<string, [string, string]> = {
  normal: ['collapse', 'wrap'],
  nowrap: ['collapse', 'nowrap'],
  pre: ['preserve', 'nowrap'],
  'pre-wrap': ['preserve', 'wrap'],
  'pre-line': ['preserve-breaks', 'wrap'],
  'break-spaces': ['break-spaces', 'wrap'],
};

/**
 * The shorthands that can set something the name rests on, and the longhands
 * each one sets. A part a shorthand leaves out is reset to its initial value,
 * as in CSS: `flex-flow: row` turns wrapping OFF.
 */
const SHORTHANDS: Record<string, { longhands: string[]; expand(parts: string[]): string[] }> = {
  'flex-flow': {
    longhands: ['flex-direction', 'flex-wrap'],
    expand: (parts) => [pick(parts, /^(row|column)(-reverse)?$/, 'row'), pick(parts, /^(nowrap|wrap|wrap-reverse)$/, 'nowrap')],
  },
  // CSS Flexbox §7.1: `none` is `0 0 auto` and `auto` is `1 1 auto`; an
  // omitted grow or shrink is 1, an omitted basis 0%, a third number the basis.
  flex: {
    longhands: ['flex-grow', 'flex-shrink', 'flex-basis'],
    expand: (parts) => {
      if (parts.join(' ') === 'none') return ['0', '0', 'auto'];
      if (parts.join(' ') === 'auto') return ['1', '1', 'auto'];
      const numbers = parts.filter((p) => /^[\d.]+$/.test(p));
      return [numbers[0] ?? '1', numbers[1] ?? '1', parts.find((p) => !/^[\d.]+$/.test(p)) ?? numbers[2] ?? '0%'];
    },
  },
  // CSS Text 4: `white-space` is now a shorthand, and `text-wrap` reaches the same switch.
  'white-space': {
    longhands: ['white-space-collapse', 'text-wrap-mode'],
    expand: (parts) =>
      WHITE_SPACE[parts.join(' ')] ?? [parts.find((p) => !WRAP_MODE.test(p)) ?? 'collapse', pick(parts, WRAP_MODE, 'wrap')],
  },
  'text-wrap': {
    longhands: ['text-wrap-mode', 'text-wrap-style'],
    expand: (parts) => [pick(parts, WRAP_MODE, 'wrap'), parts.find((p) => !WRAP_MODE.test(p)) ?? 'auto'],
  },
  overflow: {
    longhands: ['overflow-x', 'overflow-y'],
    expand: (parts) => [parts[0], parts[1] ?? parts[0]],
  },
};

/** The longhands a declaration sets, each with the value it gets. */
function longhandsOf({ prop, value }: Decl): Array<[string, string]> {
  const name = LOGICAL[prop] ?? prop;
  const shorthand = SHORTHANDS[name];
  if (!shorthand) return [[name, value]];
  const values = CSS_WIDE.has(value) ? shorthand.longhands.map(() => value) : shorthand.expand(value.split(' '));
  return shorthand.longhands.map((longhand, i) => [longhand, values[i]]);
}

/**
 * What a longhand settles to on the element `selector` names, across every
 * rule written for exactly that selector: shorthands expanded, `!important`
 * over normal, and then the LAST declaration, as in the cascade. A rule that
 * reaches the element any other way (`.selected .nameText`) is not read here;
 * the last test below refuses those.
 */
function valueIn(decls: Decl[], selector: string, longhand: string): string | undefined {
  const winner: { normal?: string; important?: string } = {};
  for (const decl of decls)
    if (decl.selectors.includes(selector))
      for (const [name, value] of longhandsOf(decl)) if (name === longhand) winner[decl.important ? 'important' : 'normal'] = value;
  return winner.important ?? winner.normal;
}

/** `valueIn` over this module. */
const valueOf = (selector: string, longhand: string) => valueIn(DECLS, selector, longhand);

/**
 * The layout each box's own rule pins, by longhand: what the tests below read
 * with `valueOf`, so no other selector may set it out of their sight.
 */
const LAYOUT: Record<string, string[]> = {
  name: ['display', 'flex-wrap'],
  nameText: ['flex-grow', 'flex-basis', 'max-width', 'overflow-wrap', 'min-width', 'width', 'overflow-x', 'overflow-y'],
};

/**
 * Inherited properties that decide where a word may break, and what each may
 * be set to anywhere on the name or around it. All of them pass from the card
 * down to the name, so a rule on any box in between counts.
 */
const WHOLE_WORDS: Record<string, RegExp> = {
  // `nowrap` carried "New Management" whole onto the line under the glyph,
  // where its first word fit beside it. The rest of `white-space` keeps the
  // spaces that the measurement had collapsed.
  'white-space-collapse': /^collapse$/,
  'text-wrap-mode': /^wrap$/,
  // Hyphenation fills a line by breaking whichever word crosses its end, so
  // names that break cleanly at a space would start breaking mid-word. Safari
  // reads the prefixed one.
  hyphens: /^(manual|none)$/,
  '-webkit-hyphens': /^(manual|none)$/,
  // Both size the longest word as one letter for the row, as `anywhere` does:
  // "Correspondence" split beside the glyph instead of dropping under it.
  'word-break': /^normal$/,
  'line-break': /^(auto|loose|normal|strict)$/,
};

/** The classes on the name's own box and on every box around it, the card's included, read off a rendered worn swatch. */
function nameLineage(): Set<string> {
  const { container, unmount } = render(<ThemeSwatch theme={THEMES[0]} unlocked selected onSelect={() => {}} />);
  const text = [...container.querySelectorAll('span')].find((el) => el.classList.contains(styles.nameText));
  const button = container.querySelector('button');
  if (!text || !button) throw new Error('a worn swatch renders no name inside a button');
  const lineage = new Set<string>();
  for (let el: Element | null = text; el && el !== button.parentElement; el = el.parentElement)
    localOf(el).forEach((c) => lineage.add(c));
  unmount();
  return lineage;
}

describe('ThemeSwatch · a long name stays inside its card', () => {
  it('puts the name in a box of its own, beside the glyph', () => {
    // Bare text in a flex row is an anonymous item: no rule can let it shrink.
    for (const theme of THEMES) {
      const { container, unmount } = render(
        <ThemeSwatch theme={theme} unlocked selected={false} onSelect={() => {}} />,
      );
      const glyph = container.querySelector('[data-part="glyph"]');
      const row = glyph?.parentElement;
      expect(row, theme.id).not.toBeNull();
      const bare = [...row!.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
      expect(bare, `${theme.id}: the name is bare text in the row`).toEqual([]);
      const text = glyph!.nextElementSibling;
      expect(text?.className, theme.id).toBe(styles.nameText);
      expect(text?.textContent, theme.id).toBe(theme.name);
      unmount();
    }
  });

  it('reads the stylesheet the way the cascade does', () => {
    // Guards the reader the tests below rest on, on declarations of its own,
    // with the answers CSS gives: the last declaration wins, `!important`
    // beats a later one, and a shorthand resets what it leaves out.
    const at = (prop: string, value: string, important = false): Decl => ({ selectors: ['.x'], prop, value, important });
    const settled = (longhand: string, ...decls: Decl[]) => valueIn(decls, '.x', longhand);
    expect(settled('flex-wrap', at('flex-wrap', 'wrap'), at('flex-wrap', 'nowrap'))).toBe('nowrap');
    expect(settled('flex-wrap', at('flex-wrap', 'wrap'), at('flex-flow', 'row nowrap'))).toBe('nowrap');
    expect(settled('flex-wrap', at('flex-wrap', 'wrap'), at('flex-flow', 'row'))).toBe('nowrap');
    expect(settled('flex-wrap', at('flex-flow', 'column'), at('flex-wrap', 'wrap'))).toBe('wrap');
    expect(settled('flex-wrap', at('flex-wrap', 'nowrap', true), at('flex-wrap', 'wrap'))).toBe('nowrap');
    expect(settled('flex-basis', at('flex', '1 1 0%'), at('flex-basis', 'auto'))).toBe('auto');
    expect(settled('flex-basis', at('flex', '1'))).toBe('0%');
    expect(settled('flex-basis', at('flex', 'auto'))).toBe('auto');
    expect(settled('flex-basis', at('flex', '2 0 0'))).toBe('0');
    expect(settled('flex-grow', at('flex', 'none'))).toBe('0');
    expect(settled('min-width', at('min-width', 'auto'), at('min-inline-size', '0'))).toBe('0');
    expect(settled('overflow-y', at('overflow', 'visible hidden'))).toBe('hidden');
    expect(settled('text-wrap-mode', at('white-space', 'pre'))).toBe('nowrap');
    expect(settled('text-wrap-mode', at('text-wrap', 'nowrap'))).toBe('nowrap');
    expect(settled('flex-wrap', at('flex-flow', 'inherit'))).toBe('inherit');
    expect(settled('flex-wrap', { ...at('flex-wrap', 'wrap'), selectors: ['.y'] })).toBeUndefined();
  });

  it('drops a word that will not fit beside the glyph to the line below, and breaks one wider than the card', () => {
    // The row may wrap, so a word too long to sit beside the glyph moves
    // under it instead of running out of the card. `flex-flow: row`, which
    // leaves the wrap out and so resets it, ran "Correspondence" 14px out.
    expect(valueOf('.name', 'display')).toBe('flex');
    expect(valueOf('.name', 'flex-wrap')).toBe('wrap');
    // A zero basis: the name asks for none of the line up front, so only its
    // automatic minimum (the next test) decides whether it fits beside the
    // glyph. A basis of `auto` asks for the whole name on one line, and
    // carried "New Management" under the glyph where its first word fit.
    expect(valueOf('.nameText', 'flex-basis')).toMatch(/^0(%|px)?$/);
    // It then grows to fill the line. Not growing, it stays as narrow as its
    // longest word, and "New Management" took two lines where it fit on one.
    // (Shrink never comes into play from a zero basis, so it is not pinned.)
    expect(Number(valueOf('.nameText', 'flex-grow'))).toBeGreaterThan(0);
    // The name never asks for more than the card is wide: the cap is what
    // clamps its automatic minimum, so a word wider than the whole card
    // (Correspondence in Inter at 320) breaks inside it. Uncapped, it ran 20px out.
    expect(valueOf('.nameText', 'max-width')).toBe('100%');
    // `break-word` breaks only a word that cannot fit on a line of its own.
    // `anywhere` also sizes the longest word as one letter, so the row never
    // wraps and every long name splits mid-word beside the glyph instead.
    expect(valueOf('.nameText', 'overflow-wrap')).toBe('break-word');
  });

  it('never lets the name be squeezed below its longest word', () => {
    // Its automatic minimum is the longest word, and that is what makes the
    // row wrap. Each of these took it away, and "Correspondence" split
    // mid-word beside the glyph: a `min-width` of its own; a `width`, which
    // caps the automatic minimum; and any `overflow` but `visible` or `clip`,
    // since a box that scrolls has no automatic minimum at all.
    expect(valueOf('.nameText', 'min-width') ?? 'auto').toBe('auto');
    expect(valueOf('.nameText', 'width') ?? 'auto').toBe('auto');
    expect(valueOf('.nameText', 'overflow-x') ?? 'visible').toMatch(/^(visible|clip)$/);
    expect(valueOf('.nameText', 'overflow-y') ?? 'visible').toMatch(/^(visible|clip)$/);
  });

  it('breaks the name only at a space, on it and on every box around it', () => {
    const lineage = nameLineage();
    // Guards the guard: a box this check never saw would pass it.
    expect([...lineage]).toEqual(expect.arrayContaining(['nameText', 'name', 'body', 'swatch', 'unlocked', 'selected']));
    const problems: string[] = [];
    for (const decl of DECLS)
      for (const sel of decl.selectors) {
        const { classes, pseudoElement } = subjectOf(sel);
        // A locked swatch has no name; a pseudo-element is a box of its own.
        if (pseudoElement || /\.locked(?![\w-])/.test(sel)) continue;
        if (classes.length > 0 && !classes.some((c) => lineage.has(c))) continue;
        // Every declaration, not only the one that wins: none is set today.
        for (const [longhand, value] of longhandsOf(decl))
          if (WHOLE_WORDS[longhand] && !WHOLE_WORDS[longhand].test(value))
            problems.push(`${sel} { ${decl.prop}: ${decl.value} } sets ${longhand} to ${value}`);
      }
    expect(problems).toEqual([]);
  });

  it('sets the layout of the name in its own two rules, where the tests above read it', () => {
    // `valueOf` reads `.name` and `.nameText` as written. A state or a
    // descendant selector that set the same thing (`.selected .nameText`)
    // would win where it applies, unread.
    const problems: string[] = [];
    for (const decl of DECLS)
      for (const sel of decl.selectors) {
        const { classes, pseudoElement } = subjectOf(sel);
        if (pseudoElement) continue;
        for (const [own, pinned] of Object.entries(LAYOUT)) {
          if (sel === `.${own}` || (classes.length > 0 && !classes.includes(own))) continue;
          for (const [longhand] of longhandsOf(decl))
            if (pinned.includes(longhand)) problems.push(`${sel} { ${decl.prop} } sets .${own}'s ${longhand} past the rule read for it`);
        }
      }
    expect(problems).toEqual([]);
  });
});
