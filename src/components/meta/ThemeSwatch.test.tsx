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
 * mixed toward which token) and the three backgrounds a swatch can wear — so
 * the sweep measures the bytes a browser receives rather than a constant the
 * component also uses. The colours behind those tokens come from the theme
 * table, the same source the `[data-theme]` blocks are tested against.
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

/** WCAG 2.1 SC 1.4.11: graphical objects need 3:1 against adjacent colours. */
const NON_TEXT_CONTRAST = 3;

const CSS = readFileSync(resolve(process.cwd(), 'src/components/meta/ThemeSwatch.module.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** Every rule in the module as `[selector, body]`. It has no at-rules to nest. */
const RULES = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => [sel.trim(), body] as const);

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

/** The three backgrounds a swatch with a glyph can wear: at rest, under a finger, worn. */
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
    for (const [sel, body] of RULES.filter(([s]) => s.includes('.glyph'))) {
      // A filter or opacity repaints the mix after it is resolved — the
      // brightness filter this replaced is what pushed grey glyphs into the
      // cream room — and no contrast sum here could see it.
      expect(body, `${sel} must not repaint the glyph`).not.toMatch(/(?:^|;)\s*(?:filter|opacity|mix-blend-mode)\s*:/);
    }
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
