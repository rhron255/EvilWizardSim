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

/** One declaration's value in a rule, or undefined. */
const valueOf = (selector: string, prop: string) => {
  const rule = RULES.find(([sel]) => sel === selector);
  const decl = rule?.[1].split(';').find((d) => d.slice(0, d.indexOf(':')).trim().toLowerCase() === prop);
  return decl?.slice(decl.indexOf(':') + 1).trim();
};

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

/**
 * The classes on the elements between the glyph and the card, the card's own
 * included — read off a rendered, unlocked and worn swatch, not listed by hand.
 */
function glyphAncestors(): { card: Set<string>; between: Set<string> } {
  const local = new Map(Object.entries(styles as Record<string, string>).map(([name, hashed]) => [hashed, name]));
  const localOf = (el: Element) => [...el.classList].flatMap((c) => (local.has(c) ? [local.get(c) as string] : []));
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
 * default and New Management, at 320 and 393. This pins what that measurement
 * rests on, so it cannot be undone by tidying.
 */
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

  it('drops a word that will not fit beside the glyph to the line below, and breaks one wider than the card', () => {
    // The row may wrap, so a word too long to sit beside the glyph moves
    // under it instead of running out of the card.
    expect(valueOf('.name', 'flex-wrap')).toBe('wrap');
    // The name never asks for more than the card is wide: the cap is what
    // clamps its automatic minimum, so a word wider than the whole card
    // (Correspondence in Inter at 320) breaks inside it.
    expect(valueOf('.nameText', 'max-width')).toBe('100%');
    // `break-word` breaks only a word that cannot fit on a line of its own.
    // `anywhere` (or `word-break`) also shrinks the longest word to one letter
    // for sizing, so the row never wraps and every long name splits mid-word
    // beside the glyph instead.
    expect(valueOf('.nameText', 'overflow-wrap')).toBe('break-word');
    expect(valueOf('.nameText', 'word-break')).toBeUndefined();
    // Hyphenation fills a line by breaking whichever word crosses its end,
    // so names that break cleanly at a space would start breaking mid-word.
    expect(valueOf('.nameText', 'hyphens') ?? 'manual').toBe('manual');
    expect(valueOf('.name', 'hyphens') ?? 'manual').toBe('manual');
  });
});
