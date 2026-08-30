/**
 * Visual themes — one per ending, plus the default.
 *
 * ## Why this exists at all, given rule 3
 *
 * CLAUDE.md rule 3 used to read "the Notoriety tier badge is the only
 * chromatic reward". It now distinguishes two kinds of reward, and this file
 * is the reason: the tier colour is the only reward earned INSIDE a run, and
 * themes are earned ACROSS runs and chosen by the player rather than imposed.
 * That distinction is what keeps eighteen palettes from being a repudiation of
 * the pillar — see wiki/index-1.md §5 and wiki/06_reference_analysis.md
 * principle 6, amended in the same commit as this file landed.
 *
 * ## The constraints, and which ones the compiler holds
 *
 * 1. NO THEME MAY TOUCH `--ew-tier` / `--ew-tier-glow`. Held structurally:
 *    `surface` and `ink` below are keyed off the token objects in `tokens.ts`,
 *    neither of which has a tier key, so a theme reaching for the scarce
 *    colour does not compile. `themes.test.ts` sweeps the CSS too, because the
 *    stylesheet is hand-written and the compiler cannot see it.
 * 2. Near-monochrome WITHIN a theme. One hue family each; a theme is a hue and
 *    temperature rotation of the same warm-dark structure, not a colourful
 *    skin.
 * 3. Same tokens, same names. No component learns about themes — a theme is a
 *    token-override block and nothing else.
 * 4. Layout and information hierarchy never change. Ornament, palette and
 *    typographic treatment only.
 * 5. Ink contrast floor: `ink` against `panel` at or above what the default
 *    palette achieves (13.80:1). Asserted in `themes.test.ts` with real
 *    contrast maths, never by eye.
 * 6. `--ew-legendary` is pinned in every theme. It is absent from the
 *    overridable surface here, which is how it stays pinned.
 *
 * ## Keeping this in step with tokens.css
 *
 * Every theme below has a hand-written `[data-theme='…']` block in
 * `tokens.css`. `themes.test.ts` parses that stylesheet and asserts the two
 * agree token for token — the CSS is a separate artifact the TypeScript does
 * not generate, so it is a real anchor rather than the implementation grading
 * its own homework (CLAUDE.md failure mode 11).
 */

import type { EndingId, ThemeId } from '../types';
import { ink, radius, surface } from './tokens';

/**
 * The overridable slice of the design tokens.
 *
 * Keyed off the token objects rather than restated as a free
 * `Record<string, string>`: that is what makes "a theme cannot define
 * `--ew-tier`" a compile error instead of a code review. The value type is
 * widened back to `string` because `tokens.ts` declares its palettes `as
 * const`, which would otherwise pin every theme to the DEFAULT hex — the keys
 * are the constraint here, not the values.
 */
export type SurfaceOverrides = { [K in keyof typeof surface]?: string };
export type InkOverrides = { [K in keyof typeof ink]?: string };
export type RadiusOverrides = { [K in keyof typeof radius]?: string };

export type ThemeDef = {
  id: ThemeId;
  /** Player-facing, shown in the selector and the unlock banner. */
  name: string;
  /**
   * The ending that grants it. `null` for `default`, which is never earned.
   *
   * This is the ONLY unlock record. What a player has unlocked is derived by
   * asking whether `endingsSeen` contains this id — there is deliberately no
   * `Collection.unlockedThemes` to fall out of step with it.
   */
  endingId: EndingId | null;
  /** One line in the selector, under the name. Flavour, never a rule. */
  blurb: string;
  surface: SurfaceOverrides;
  ink?: InkOverrides;
  radius?: RadiusOverrides;
  /**
   * Font family overrides. Only `New Management` uses this — swapping the
   * display serif for the UI sans is a token override, so it costs no
   * component change (constraint 3).
   */
  font?: { display?: string; ui?: string };
};

/** `default` first; the rest follow the ending order in `src/content/endings.ts`. */
export const THEMES: ThemeDef[] = [
  {
    id: 'default',
    name: 'The Tower',
    endingId: null,
    blurb: 'Warm dark, one light from above. The room you started in.',
    // The shipped palette. Spelled out rather than left empty so the selector
    // can draw its swatch from the same source as every other theme, and so
    // the contrast floor has something to measure the others against.
    surface: { ...surface },
    ink: { ...ink },
  },

  {
    id: 'slain_by_chosen_one',
    name: 'The Sword',
    endingId: 'slain_by_chosen_one',
    blurb: 'The warm dark, with an edge in it.',
    // Default warm dark untouched except at the strong rule, where `danger`
    // is promoted wholesale. The hero's colour was always in the palette; this
    // theme just lets it draw the borders.
    surface: {
      ...surface,
      lineStrong: '#B4453C',
    },
  },

  {
    id: 'sealed_in_gem',
    name: 'Amethyst',
    endingId: 'sealed_in_gem',
    blurb: 'The Academy’s violet, seen from inside the stone.',
    /**
     * The highest `lineStrong` contrast of any theme — every edge is a facet.
     *
     * The issue asked for ink "slightly lower contrast — read through stone",
     * which collides head-on with constraint 5. The constraint wins, because
     * it is the testable one and it is what keeps the palette readable: this
     * ink sits AT the floor rather than below it, so Amethyst is the
     * lowest-contrast theme in the set without being an unreadable one.
     */
    surface: {
      void: '#0c0912',
      panel: '#17121f',
      raised: '#201829',
      hover: '#291f34',
      line: '#322540',
      lineStrong: '#6b5486',
    },
    ink: {
      bright: '#efebf7',
      base: '#e6e1f0',
      dim: '#9d95ad',
      faint: '#6e6880',
      ghost: '#4a4459',
    },
  },

  {
    id: 'betrayed_by_apprentice',
    name: 'New Management',
    endingId: 'betrayed_by_apprentice',
    blurb: 'The same tower, under someone else’s hand.',
    // Two changes and no more, which is the joke: a desaturated `danger` at
    // the strong rule, and the headings drop the display serif for the UI
    // sans. Nothing else moves, because nothing else had to.
    surface: {
      ...surface,
      lineStrong: '#6e4440',
    },
    font: {
      display: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
  },

  {
    id: 'lichdom',
    name: 'Cold Room',
    endingId: 'lichdom',
    blurb: 'You have stopped being warm. So has the room.',
    /**
     * Undeath, as a temperature. Promoted from `.screen[data-lich]`, where it
     * lived (three times over) in `RunScreen.module.css`.
     *
     * The palette is a WARM dark — every default surface has R > G > B. A lich
     * has stopped being warm, so blue lifts above green in every surface token
     * and red is left alone. The result is a violet cast you feel before you
     * read anything. It is NOT the Kingdom-Level tier violet (#9B6BE8): that
     * hue means a rank, and undeath is not a rank.
     *
     * `panel` is the one value that is not the shipped lich block verbatim.
     * The original #12111c missed the contrast floor by 0.75% — it predates
     * the floor — so green drops 17 → 15 with red and blue untouched. The cast
     * is unchanged at near-black; the measurement is not.
     */
    surface: {
      void: '#0a0910',
      panel: '#120f1c',
      raised: '#191725',
      hover: '#211e30',
      line: '#272235',
      lineStrong: '#3a344d',
    },
  },

  {
    id: 'retired_to_swamp',
    name: 'Peat',
    endingId: 'retired_to_swamp',
    blurb: 'Nothing dramatic is happening. That was the point.',
    // The warmest theme, and the softest. Brown-black surfaces, ink left at
    // `base` rather than lifted to `bright`, and every radius one step rounder.
    // Its ornament is an absence: no background gradient at all, just a flat
    // wash — see `RunScreen.module.css` / `EndingScreen.module.css`.
    surface: {
      void: '#0d0a07',
      panel: '#160f08',
      raised: '#1f170e',
      hover: '#271d13',
      line: '#2d2317',
      lineStrong: '#453722',
    },
    ink: {
      bright: '#e4dcc9',
      base: '#e4dcc9',
      dim: '#9a8f7c',
      faint: '#6a6153',
      ghost: '#453f35',
    },
    radius: {
      sm: '5px',
      md: '8px',
      lg: '12px',
    },
  },

  {
    id: 'consumed_by_pact',
    name: 'Settled Account',
    endingId: 'consumed_by_pact',
    blurb: 'Ash, filed correctly. The account balances.',
    // Covenant ash, but ORDERED. The one theme that raises contrast rather
    // than lowering it: every rule at full strength, ink at `bright`
    // throughout, and no ornament whatsoever — the absence is the joke.
    surface: {
      void: '#0a0a09',
      panel: '#141413',
      raised: '#1c1c1a',
      hover: '#242422',
      line: '#35342f',
      lineStrong: '#5a5850',
    },
    ink: {
      bright: '#f4f3ee',
      base: '#f0efea',
      dim: '#a6a49b',
      faint: '#75736b',
      ghost: '#4d4b45',
    },
  },

  {
    id: 'ascension',
    name: 'Wrong Colour',
    endingId: 'ascension',
    blurb: 'A green that is not on any chart. You are past the frame.',
    // The void goes deep wrong-green/teal and the ink near-white. The only
    // theme permitted a second light source — its gradient sits ABOVE the
    // frame at high spread, light arriving from outside the room. Still may
    // not touch `--ew-tier`, and does not.
    surface: {
      void: '#04100e',
      panel: '#0a1a17',
      raised: '#10231f',
      hover: '#162c27',
      line: '#1c3630',
      lineStrong: '#2f5a50',
    },
    ink: {
      bright: '#f4fbf9',
      base: '#eef7f4',
      dim: '#8fa8a2',
      faint: '#647a75',
      ghost: '#42534f',
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'default';

const BY_ID = new Map(THEMES.map((t) => [t.id, t]));

/** The theme for an id, or the default for anything unrecognised. */
export function themeFor(id: string | null | undefined): ThemeDef {
  return (id && BY_ID.get(id as ThemeId)) || BY_ID.get(DEFAULT_THEME_ID)!;
}

/** True for a `ThemeId` this build actually defines. */
export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && BY_ID.has(value as ThemeId);
}

/**
 * Which themes a collection has earned.
 *
 * DERIVED, never stored. `default` is always in the set; everything else is
 * present exactly when its ending is in `endingsSeen`.
 */
export function unlockedThemeIds(endingsSeen: readonly EndingId[]): ThemeId[] {
  const seen = new Set(endingsSeen);
  return THEMES.filter((t) => t.endingId === null || seen.has(t.endingId)).map((t) => t.id);
}

/** True if this collection may wear this theme. */
export function isThemeUnlocked(id: ThemeId, endingsSeen: readonly EndingId[]): boolean {
  const theme = BY_ID.get(id);
  if (!theme) return false;
  return theme.endingId === null || endingsSeen.includes(theme.endingId);
}

// ---------------------------------------------------------------------------
// The CSS variable names, for the sync test and the swatch preview
// ---------------------------------------------------------------------------

/**
 * Token key -> custom property name.
 *
 * `themes.test.ts` uses these to rebuild each theme's expected CSS block from
 * the definitions above and diff it against what `tokens.css` actually says,
 * which is how the two halves are kept from drifting.
 *
 * Note `base` maps to `--ew-ink`, not `--ew-ink-base` — that asymmetry is in
 * `tokens.css` already and is why this map is written out rather than derived
 * from the key names.
 */
export const SURFACE_VARS: Record<keyof typeof surface, string> = {
  void: '--ew-void',
  panel: '--ew-panel',
  raised: '--ew-raised',
  hover: '--ew-hover',
  line: '--ew-line',
  lineStrong: '--ew-line-strong',
};

export const INK_VARS: Record<keyof typeof ink, string> = {
  bright: '--ew-ink-bright',
  base: '--ew-ink',
  dim: '--ew-ink-dim',
  faint: '--ew-ink-faint',
  ghost: '--ew-ink-ghost',
};

export const RADIUS_VARS: Record<keyof typeof radius, string> = {
  sm: '--ew-radius-sm',
  md: '--ew-radius-md',
  lg: '--ew-radius-lg',
  pill: '--ew-radius-pill',
};

export const FONT_VARS = {
  display: '--ew-font-display',
  ui: '--ew-font-ui',
} as const;

/**
 * Every custom property a theme sets, as `{ '--ew-…': value }`.
 *
 * Used by the selector to preview a palette without applying it, and by the
 * sync test to compare against `tokens.css`.
 */
export function themeVars(theme: ThemeDef): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme.surface)) {
    if (value) out[SURFACE_VARS[key as keyof typeof surface]] = value;
  }
  for (const [key, value] of Object.entries(theme.ink ?? {})) {
    if (value) out[INK_VARS[key as keyof typeof ink]] = value;
  }
  for (const [key, value] of Object.entries(theme.radius ?? {})) {
    if (value) out[RADIUS_VARS[key as keyof typeof radius]] = value;
  }
  for (const [key, value] of Object.entries(theme.font ?? {})) {
    if (value) out[FONT_VARS[key as keyof typeof FONT_VARS]] = value;
  }
  return out;
}

/**
 * The four bands the selector draws, resolved against the default.
 *
 * A theme that does not override `ink` still needs an ink band, so every
 * lookup falls back to the shipped token rather than rendering a hole.
 */
export function swatchBands(theme: ThemeDef): {
  void: string;
  panel: string;
  line: string;
  ink: string;
} {
  return {
    void: theme.surface.void ?? surface.void,
    panel: theme.surface.panel ?? surface.panel,
    line: theme.surface.line ?? surface.line,
    ink: theme.ink?.base ?? ink.base,
  };
}
