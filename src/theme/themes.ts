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
 *    stylesheet is hand-written and the compiler cannot see it — and sweeps
 *    each theme's `light` and `trim` strings, the two ornament tokens that
 *    hold free CSS.
 * 2. Near-monochrome WITHIN a theme. One hue family each; a theme is a hue and
 *    temperature rotation of the same warm-dark structure, not a colourful
 *    skin.
 * 3. Same tokens, same names. No component learns about themes — a theme is a
 *    token-override block and nothing else. That now includes its ornament:
 *    the key light, wallpaper, corner glyph and card trim are tokens too
 *    (constraint 7), so no stylesheet anywhere needs a `[data-theme='…']`
 *    selector outside `tokens.css`.
 * 4. Layout and information hierarchy never change. Ornament, palette and
 *    typographic treatment only — every ornament is a background layer, a mask
 *    or an absolutely positioned pseudo-element, none of which takes space.
 * 5. Ink contrast floor, set by what the default achieves. On a panel, `ink`
 *    against `panel` at or above the default's 13.80:1. On the bare room —
 *    text with no panel behind it — at or above the Tower's own worst, with
 *    the void, key light, tier vignette and wallpaper all counted at their
 *    brightest. Asserted in `themes.test.ts` with real contrast maths, never
 *    by eye.
 * 6. `--ew-legendary` is pinned in every theme. It is absent from the
 *    overridable surface here, which is how it stays pinned.
 * 7. Ornament never brings a colour of its own, and never costs the ink its
 *    floor. Shapes are colourless masks (`ornaments.ts`) painted in
 *    `--ew-line-strong`, so the wallpaper of a violet room is violet. The key
 *    light and the card trim are free CSS, so they are held to a vocabulary
 *    instead: the room's own surface and ink tokens, plain white or black,
 *    and — for the key light alone — a faint tint in the room's own hue
 *    family. The wallpaper's opacity and the key light's strength are both
 *    capped by constraint 5's bare-room floor, because text sits straight on
 *    the room on several screens.
 * 8. No two rooms look alike. Every pair of themes sits at least 1.5
 *    just-noticeable differences apart in OKLab — see the distinctness block
 *    in `themes.test.ts` for the measure and where its numbers come from.
 *
 * ## Keeping this in step with tokens.css
 *
 * Every theme below has a hand-written `[data-theme='…']` block in
 * `tokens.css`. `themes.test.ts` parses that stylesheet and asserts the two
 * agree token for token — the CSS is a separate artifact the TypeScript does
 * not generate, so it is a real anchor rather than the implementation grading
 * its own homework (CLAUDE.md failure mode 11).
 *
 * ## Where the palettes came from
 *
 * Issue #15 set the hue families; a player then reported that too many rooms
 * looked the same, and measuring bore it out — five themes in one red-brown
 * band, four in one blue-violet band, four greens, thirteen pairs closer than
 * 1.5 just-noticeable differences and the closest (Good Ground and The Eldest
 * Oak) 0.015 apart in OKLab, under one. Every palette except
 * the default and Ordinary Weather was regenerated from an OKLCH spec — a hue,
 * a chroma and a lightness ladder — with the hues spread round the wheel and
 * faction pairs kept in one family, then the ink lifted until it cleared the
 * floor. The hue comments below are OKLCH degrees, not HSV.
 */

import type { EndingId, ThemeId } from '../types';
import { shapeRef, tileSize, type GlyphId, type PatternId, type ShapeRef } from './ornaments';
import { ink, ornament, radius, surface } from './tokens';

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

/**
 * How a room is decorated. Required, and complete, on every theme: a theme
 * that left its wallpaper unset would inherit the default's masonry, which is
 * exactly the "looks like the regular one" report this exists to answer.
 */
export type ThemeOrnament = {
  [K in keyof typeof ornament]: K extends 'motif'
    ? ShapeRef<PatternId>
    : K extends 'pip'
      ? ShapeRef<GlyphId>
      : K extends 'motifOpacity'
        ? number
        : string;
};

/**
 * A theme's wallpaper: the pattern, its natural tile, and how strongly it is
 * drawn. One call so the tile size is always the pattern's own.
 */
function wallpaper(id: PatternId, opacity: number) {
  return { motif: shapeRef(id), motifSize: tileSize(id), motifOpacity: opacity } as const;
}

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
  ornament: ThemeOrnament;
};

// ---------------------------------------------------------------------------
// Shared ornament fragments.
//
// Strings, because they are CSS, so the compiler cannot hold what they are
// coloured with; `themes.test.ts` does instead. A `light` or `trim` may take
// its colour from a surface or ink token through `var()`, from plain white or
// black, or — the key light only — from a faint tint in the room's own hue
// family. Nothing else: no hex, no named colour, no colour function but
// `rgb()` and `color-mix()`, so neither can introduce a hue the room does not
// already have (constraint 7).
// ---------------------------------------------------------------------------

/**
 * Where a card trim may draw. Measured, not guessed
 * (`qa/probe-ornament-spacing.mjs`): the tightest card padding in the game is
 * OptionCard's 8px × 12px at phone width, and nothing decorative may come
 * within `--ew-space-1` (4px) of a card's content. A trim layer is one of two
 * kinds, told apart by how hard it is drawn — the probe's `DRAWN`, a move of
 * 24 levels in some channel over the panel:
 *
 * - A MARK is drawn at least that hard, so it must keep out of the content's
 *   way by geometry. An edge mark keeps to the outer 4px of the card and runs
 *   only BETWEEN the corner glyphs — each 8px, plus the same 4px, so
 *   `CORNER_CLEAR` in from either end (`edgeRule`, `edgeBand`). A corner mark
 *   stays inside the `CORNER_CLEAR` square the glyph itself sits in
 *   (`cornerMark`).
 * - A WASH is a soft tint that may sit behind text, so it is held by strength
 *   instead: no channel moved by `DRAWN` or more, and the ink still clearing
 *   the panel's contrast floor over it at its strongest stop.
 *
 * `themes.test.ts` sorts every layer of every trim into one kind or the other
 * and asserts both.
 */
const CORNER_CLEAR = 12;
const SPAN = `calc(100% - ${CORNER_CLEAR * 2}px)`;

/**
 * Any image as an edge mark: `px` thick, `offset` px in from one edge, laid
 * between the corner glyphs. Top and bottom bands run across the card, left
 * and right bands down it. `offset + px` may not pass 4 — the outer band.
 */
function edgeBand(image: string, edge: 'top' | 'bottom' | 'left' | 'right', offset: number, px: number) {
  return edge === 'top' || edge === 'bottom'
    ? `${image} left ${CORNER_CLEAR}px ${edge} ${offset}px / ${SPAN} ${px}px no-repeat`
    : `${image} ${edge} ${offset}px top ${CORNER_CLEAR}px / ${px}px ${SPAN} no-repeat`;
}

/**
 * A solid rule as an edge mark (`edgeBand`). Colour is a surface token, or a
 * mix of one.
 */
function edgeRule(edge: 'top' | 'bottom' | 'left' | 'right', offset: number, px = 1, colour = 'var(--ew-line-strong)') {
  return edgeBand(`linear-gradient(${colour}, ${colour})`, edge, offset, px);
}

/** Any image as a corner mark, confined to the corner square its glyph sits in. */
function cornerMark(image: string, corner: `${'top' | 'bottom'} ${'left' | 'right'}`) {
  return `${image} ${corner} / ${CORNER_CLEAR}px ${CORNER_CLEAR}px no-repeat`;
}

/** `default` first; the rest follow the ending order in `src/content/endings.ts`. */
export const THEMES: ThemeDef[] = [
  {
    id: 'default',
    name: 'The Tower',
    endingId: null,
    blurb: 'Warm dark, one light from above. The room you started in.',
    // The shipped palette. Spelled out rather than left empty so the selector
    // can draw its swatch from the same source as every other theme, and so
    // the contrast floor has something to measure the others against. Its
    // ornament is the tower's own stonework, drawn at the edge of perception.
    surface: { ...surface },
    ink: { ...ink },
    ornament: { ...ornament },
  },

  {
    id: 'slain_by_chosen_one',
    name: 'The Sword',
    endingId: 'slain_by_chosen_one',
    blurb: 'The warm dark, with an edge in it.',
    // Blood red (27°), the most saturated warm room, with the hero's own
    // `--ew-danger` red promoted to the strong rule. Ornament, per issue #15:
    // "one hard steel-white highlight on interactive edges" — a bright
    // hairline along the top of every card — plus blades laid on the walls
    // and a glint crossing the light.
    surface: {
      void: '#1f0705',
      panel: '#300f0c',
      raised: '#3b1714',
      hover: '#48211d',
      line: '#512925',
      lineStrong: '#af3d36',
    },
    ink: {
      bright: '#fdf7f6',
      base: '#f8edec',
      dim: '#b79e9a',
      faint: '#866e6b',
      ghost: '#564644',
    },
    ornament: {
      light:
        'radial-gradient(90% 55% at 50% -10%, rgba(255, 228, 220, 0.05), transparent 68%), linear-gradient(115deg, transparent 42%, rgba(255, 240, 236, 0.025) 50%, transparent 58%)',
      ...wallpaper('swords', 0.14),
      pip: shapeRef('hilt'),
      trim: edgeBand(
        'linear-gradient(90deg, transparent, color-mix(in srgb, var(--ew-ink-bright) 55%, transparent) 50%, transparent)',
        'top',
        0,
        1,
      ),
    },
  },

  {
    id: 'sealed_in_gem',
    name: 'Amethyst',
    endingId: 'sealed_in_gem',
    blurb: 'The Academy’s violet, seen from inside the stone.',
    /**
     * The most saturated room of the twenty (322°), and the most saturated
     * `lineStrong` — every edge is a facet.
     *
     * The issue asked for ink at "slightly lower contrast — read through
     * stone", which collides head-on with constraint 5. The constraint wins,
     * because it is the testable one: the ink stays above the floor and the
     * "seen through stone" reading is carried by the violet cast of the
     * surfaces instead, which is where it belongs anyway.
     *
     * Issue #15's "card corners cut with `clip-path`" would have clipped the
     * border and shadow along with the corner; the trim tints each card's
     * corners as facets instead, and the walls are a triangular lattice.
     */
    surface: {
      void: '#1d0621',
      panel: '#2c0e31',
      raised: '#38173d',
      hover: '#432049',
      line: '#4c2851',
      lineStrong: '#83349a',
    },
    ink: {
      bright: '#fbf7fb',
      base: '#f4edf5',
      dim: '#af9eb1',
      faint: '#7e6e80',
      ghost: '#514652',
    },
    ornament: {
      // Two offset sources, refracted through the stone.
      light:
        'radial-gradient(60% 40% at 28% -8%, rgba(216, 198, 255, 0.055), transparent 66%), radial-gradient(52% 38% at 74% -4%, rgba(178, 156, 224, 0.04), transparent 62%)',
      ...wallpaper('facets', 0.14),
      pip: shapeRef('gem'),
      // Each facet is a right triangle with legs of about 11px, inside the corner
      // square its glyph sits in.
      trim: [
        cornerMark('linear-gradient(135deg, color-mix(in srgb, var(--ew-line-strong) 40%, transparent) 0 8px, transparent 8px)', 'top left'),
        cornerMark('linear-gradient(315deg, color-mix(in srgb, var(--ew-line-strong) 40%, transparent) 0 8px, transparent 8px)', 'bottom right'),
      ].join(', '),
    },
  },

  {
    id: 'betrayed_by_apprentice',
    name: 'New Management',
    endingId: 'betrayed_by_apprentice',
    blurb: 'The same tower, under someone else’s hand.',
    // The same stone walls as the Tower — the masonry is the joke, almost
    // nothing structural has changed — but the apprentice has redecorated in
    // a khaki-grey (100°, low chroma) the Tower never wore, run a rust-red
    // letterhead bar across the top of every card, changed the locks (the
    // glyph is somebody else's key), and dropped the headings from the
    // display serif to the UI sans. The FONT is still what carries it most.
    surface: {
      void: '#14130b',
      panel: '#201e13',
      raised: '#2a281c',
      hover: '#343225',
      line: '#3c3a2d',
      lineStrong: '#77463e',
    },
    ink: {
      bright: '#f9f8f7',
      base: '#f1f0ed',
      dim: '#a6a59d',
      faint: '#76756d',
      ghost: '#4b4a46',
    },
    font: {
      display: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
    ornament: {
      // The Tower's own light, kept the same way as its stonework.
      light: ornament.light,
      ...wallpaper('masonry', 0.16),
      pip: shapeRef('key'),
      trim: edgeRule('top', 0, 2),
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
     * 295°, deliberately between The Chair's blue (262°) and Kept Vigil's
     * lighter violet (300°) and darker than both — those three were one blur
     * before the palettes were spread. The key light goes blue-white as the
     * room cools, and frost has got onto the walls.
     */
    surface: {
      void: '#0e071e',
      panel: '#1a102f',
      raised: '#23193b',
      hover: '#2d2247',
      line: '#352a50',
      lineStrong: '#4c3b77',
    },
    ink: {
      bright: '#f9f8fd',
      base: '#f0eff8',
      dim: '#a6a1b8',
      faint: '#757186',
      ghost: '#4b4856',
    },
    ornament: {
      light: 'radial-gradient(90% 55% at 50% -10%, rgba(214, 224, 255, 0.05), transparent 68%)',
      ...wallpaper('frost', 0.34),
      pip: shapeRef('snowflake'),
      trim: 'linear-gradient(180deg, color-mix(in srgb, var(--ew-ink-bright) 5%, transparent), transparent 10px)',
    },
  },

  {
    id: 'retired_to_swamp',
    name: 'Peat',
    endingId: 'retired_to_swamp',
    blurb: 'Nothing dramatic is happening. That was the point.',
    // The warmest theme (68°, a true brown), and the softest: every radius one
    // step rounder, and no key light at all — a flat wash, because nothing
    // dramatic is happening and the light should not imply otherwise. The
    // wallpaper is bulrushes; the glyph is three bubbles, in no hurry.
    surface: {
      void: '#170a00',
      panel: '#261400',
      raised: '#321c02',
      hover: '#3d2508',
      line: '#462e11',
      lineStrong: '#6f491b',
    },
    ink: {
      bright: '#fbf8f4',
      base: '#f5efe8',
      dim: '#b1a293',
      faint: '#807264',
      ghost: '#52493f',
    },
    radius: {
      sm: '5px',
      md: '8px',
      lg: '12px',
    },
    ornament: {
      light: 'none',
      ...wallpaper('reeds', 0.28),
      pip: shapeRef('bubbles'),
      trim: 'none',
    },
  },

  {
    id: 'consumed_by_pact',
    name: 'Settled Account',
    endingId: 'consumed_by_pact',
    blurb: 'Ash, filed correctly. The account balances.',
    // Covenant ash, but ORDERED: the one truly neutral room, and the lightest
    // dark one the ink floor allows. No mood lighting — a flat, evenly lit
    // filing room — and no flourish anywhere. Its ornament is administrative
    // rather than decorative, which is the joke kept rather than dropped: the
    // walls are graph paper and every card corner carries a printer's
    // registration mark.
    surface: {
      void: '#181818',
      panel: '#232323',
      raised: '#2d2d2d',
      hover: '#373737',
      line: '#404040',
      lineStrong: '#696969',
    },
    ink: {
      bright: '#fafafa',
      base: '#f2f2f2',
      dim: '#a4a4a4',
      faint: '#747474',
      ghost: '#4a4a4a',
    },
    ornament: {
      light: 'none',
      ...wallpaper('grid', 0.13),
      pip: shapeRef('registration'),
      trim: 'none',
    },
  },

  {
    id: 'ascension',
    name: 'Wrong Colour',
    endingId: 'ascension',
    blurb: 'A green that is not on any chart. You are past the frame.',
    // A cyan-teal (196°) pushed to where sRGB has no red left in it at all.
    // The only theme permitted a second light source — its gradient sits
    // ABOVE the frame at high spread, light arriving from outside the room,
    // with a second, fainter one from below. The walls are a sky that is not
    // this one. Still may not touch `--ew-tier`, and does not.
    surface: {
      void: '#001717',
      panel: '#012424',
      raised: '#022e2f',
      hover: '#023a3a',
      line: '#014344',
      lineStrong: '#02736e',
    },
    ink: {
      bright: '#f4fafa',
      base: '#e7f3f3',
      dim: '#8fabab',
      faint: '#607a7a',
      ghost: '#3d4e4e',
    },
    ornament: {
      light:
        'radial-gradient(120% 70% at 50% -22%, rgba(180, 255, 236, 0.055), transparent 74%), radial-gradient(80% 50% at 50% 104%, rgba(120, 220, 200, 0.025), transparent 70%)',
      ...wallpaper('stars', 0.12),
      pip: shapeRef('sparkle'),
      // The light from outside the frame catches the top edge of every card.
      // It was a 16px glow over the card's first line, which cost the ink
      // three points of contrast; drawn as a mark in the edge band instead,
      // it keeps clear of the text rather than dimming it.
      trim: edgeBand(
        'radial-gradient(70% 100% at 50% 0%, color-mix(in srgb, var(--ew-line-strong) 50%, transparent), transparent)',
        'top',
        0,
        3,
      ),
    },
  },

  // ---------------------------------------------------------------------------
  // The five faction reprisals (issue #14 slice 1, recoloured for issue #15
  // track C2), and the five leaderships below them.
  //
  // C2's rule: "faction pairs share a hue family and differ in treatment;
  // leadership is the faction ascendant, reprisal is the faction's process
  // applied to you." Each pair below still shares its family. What changed is
  // the TREATMENT: issue #15 specified an ornament for every one of these
  // (perforated edges, a ghost rule, a broken header rule, a marginal rule…)
  // and none of it had been built, so a pair differed only by a few points of
  // lightness and read as one room twice. The ornament is what tells them
  // apart now, as the brief always intended.
  // ---------------------------------------------------------------------------

  {
    id: 'eternally_repurposed',
    name: 'Requisition',
    endingId: 'eternally_repurposed',
    blurb: 'Cold ash and carbon copies. Stock, correctly filed.',
    // Ashen Covenant, paired with `contract_writer`: the same ash, gone cold —
    // a slate blue-grey (238°, chroma held near neutral) where its partner
    // still glows red. Issue #15's ornament, built: "panel edges perforated —
    // a form to be torn along", the light rising from below ("a requisition
    // form is filled out from the bottom up"), and walls of boxes to tick.
    surface: {
      void: '#0b151c',
      panel: '#14212a',
      raised: '#1d2b34',
      hover: '#26353f',
      line: '#2e3d48',
      lineStrong: '#495b67',
    },
    ink: {
      bright: '#f7f9fa',
      base: '#edf1f3',
      dim: '#9da6ac',
      faint: '#6d767c',
      ghost: '#464b4f',
    },
    ornament: {
      light: 'radial-gradient(90% 55% at 50% 110%, rgba(214, 228, 240, 0.04), transparent 68%)',
      ...wallpaper('form', 0.17),
      pip: shapeRef('checkbox'),
      // Square 2px holes every 6px, top and bottom: at that size a square hole
      // and a round one are the same thing, and a repeating stripe can be
      // bounded between the corners where a tiled dot cannot.
      trim: [1, 1]
        .map((offset, i) => edgeBand('repeating-linear-gradient(90deg, var(--ew-void) 0 2px, transparent 2px 6px)', i ? 'bottom' : 'top', offset, 2))
        .join(', '),
    },
  },

  {
    id: 'liquidated',
    name: 'Assets Realised',
    endingId: 'liquidated',
    blurb: 'The same green-black ledger room, emptied.',
    // Gilded Hand, paired with `grand_arbiter`: the same baize (168°), darker
    // and drained. `raised` is deliberately equal to `panel` ("raised drops a
    // step, so surfaces are literally emptied") and the brass rule reverts to
    // bare grey. Issue #15's ornament, built: "a ghost of the brass rule left
    // where it was, plus a faint diagonal hatch" — here a cancellation hatch
    // across the bottom of every card, and on the walls.
    surface: {
      void: '#020d08',
      panel: '#061912',
      raised: '#061912',
      hover: '#0c231b',
      line: '#1e352c',
      lineStrong: '#424a46',
    },
    ink: {
      bright: '#f6f9f8',
      base: '#ecf2ef',
      dim: '#9ba8a3',
      faint: '#6c7873',
      ghost: '#444d49',
    },
    ornament: {
      light: 'radial-gradient(90% 55% at 50% -10%, rgba(220, 240, 230, 0.025), transparent 68%)',
      ...wallpaper('hatch', 0.22),
      pip: shapeRef('nil'),
      trim: edgeBand(
        'repeating-linear-gradient(-45deg, color-mix(in srgb, var(--ew-line-strong) 45%, transparent) 0 1px, transparent 1px 6px)',
        'bottom',
        0,
        4,
      ),
    },
  },

  {
    id: 'turned_to_fertilizer',
    name: 'Good Ground',
    endingId: 'turned_to_fertilizer',
    blurb: 'Everything in this room is growing. Some of it is you.',
    // Verdant Choir, paired with `archdruid`: "the same green pushed
    // brown-black and wetter" — a dark olive (115°) where the Oak is leaf
    // green. These two were the closest pair in the set before the spread
    // (0.015 apart in OKLab, under one just-noticeable difference). Ornament, per issue #15: "borders soften and blur at the
    // corners" — every card's edges darken softly into the wet — and "a slow
    // dark bloom centred low"; roots on the walls.
    surface: {
      void: '#080900',
      panel: '#121500',
      raised: '#1b1e02',
      hover: '#252808',
      line: '#2c3011',
      lineStrong: '#444d14',
    },
    ink: {
      bright: '#f8f9f5',
      base: '#f0f1ea',
      dim: '#a4a795',
      faint: '#747666',
      ghost: '#4a4c41',
    },
    ornament: {
      light: 'radial-gradient(70% 55% at 50% 78%, rgba(160, 200, 110, 0.045), transparent 72%)',
      ...wallpaper('roots', 0.34),
      pip: shapeRef('sprout'),
      trim: 'radial-gradient(130% 140% at 50% 40%, transparent 60%, rgba(0, 0, 0, 0.28))',
    },
  },

  {
    id: 'exiled_and_overrun',
    name: 'Past the Border',
    endingId: 'exiled_and_overrun',
    blurb: 'The same purple the Crown wears, gone slate and cold.',
    // Crownlands, paired with `overthrown_the_kingdom`: the King's plum gone
    // slate-mauve (325°, a third of the chroma). `raised` flattens to
    // `panel`, and the strong rule breaks from the family hue toward a
    // low-presence danger-red — the brief's "the gold rule becomes
    // `--ew-danger` at low opacity", read as a hue swap rather than a literal
    // alpha channel (every token is an opaque hex; `contrastRatio` assumes
    // it). Ornament, per issue #15: "the header rule is BROKEN — a gap in
    // the middle", on every card; the light comes from outside the frame,
    // offset to one edge; the walls are a map border with you on the wrong
    // side of it.
    surface: {
      void: '#160d16',
      panel: '#231723',
      raised: '#231723',
      hover: '#2d202e',
      line: '#403141',
      lineStrong: '#683834',
    },
    ink: {
      bright: '#faf8fa',
      base: '#f2eff3',
      dim: '#aaa1aa',
      faint: '#7a717a',
      ghost: '#4e484e',
    },
    ornament: {
      light: 'radial-gradient(80% 60% at 92% 6%, rgba(224, 190, 200, 0.045), transparent 70%)',
      ...wallpaper('border', 0.26),
      pip: shapeRef('pennant'),
      trim: edgeBand(
        'linear-gradient(90deg, var(--ew-line-strong) 0 38%, transparent 38% 62%, var(--ew-line-strong) 62%)',
        'top',
        0,
        1,
      ),
    },
  },

  {
    id: 'consumed',
    name: 'Underneath',
    endingId: 'consumed',
    blurb: 'The same violet as the cold room, dropped nearly to black.',
    // Worm Below, paired with `lichdom`: the same violet (290°), dropped to
    // the darkest room in the set. `void` and `panel` sit one step apart
    // instead of two ("almost converge"), and `line` all but disappears into
    // them. The light comes from below, very low — whatever is down there is
    // patient — and every card darkens toward its foot, as if the frame were
    // closing. Issue #15 asked for the column itself to narrow; on a 393px
    // phone that is width the choice cards cannot spare, so the closing-in is
    // painted rather than laid out (constraint 4).
    surface: {
      void: '#080614',
      panel: '#0c091c',
      raised: '#151126',
      hover: '#1e1a31',
      line: '#25223a',
      lineStrong: '#2e2553',
    },
    ink: {
      bright: '#f8f8fc',
      base: '#f0eff6',
      dim: '#a4a3b2',
      faint: '#747381',
      ghost: '#4a4953',
    },
    ornament: {
      light: 'radial-gradient(70% 40% at 50% 118%, rgba(150, 140, 224, 0.035), transparent 66%)',
      ...wallpaper('burrows', 0.6),
      pip: shapeRef('spiral'),
      trim: 'linear-gradient(180deg, transparent 55%, rgba(0, 0, 0, 0.25))',
    },
  },

  {
    id: 'contract_writer',
    name: 'Correspondence',
    endingId: 'contract_writer',
    blurb: 'Ash over banked embers. The ink is still fresh.',
    // Ashen Covenant, paired with `eternally_repurposed`: ash-grey panels with
    // a red undertone (30°) and the brightest ember of any `lineStrong`.
    // Issue #15's ornament, built: "hairlines that read as ruled ledger lines"
    // — writing paper on the walls, a ruled double header on every card —
    // and the embers banked below the frame.
    surface: {
      void: '#120a08',
      panel: '#201412',
      raised: '#2a1d1a',
      hover: '#342624',
      line: '#3d2e2b',
      lineStrong: '#913d26',
    },
    ink: {
      bright: '#faf8f7',
      base: '#f3efee',
      dim: '#aba2a0',
      faint: '#7b7271',
      ghost: '#4f4948',
    },
    ornament: {
      light:
        'radial-gradient(90% 55% at 50% -10%, rgba(255, 240, 230, 0.035), transparent 68%), radial-gradient(80% 45% at 50% 112%, rgba(255, 120, 70, 0.05), transparent 70%)',
      ...wallpaper('ruled', 0.18),
      pip: shapeRef('nib'),
      trim: `${edgeRule('top', 1)}, ${edgeRule('top', 3)}`,
    },
  },

  {
    id: 'grand_arbiter',
    name: 'The Final Number',
    endingId: 'grand_arbiter',
    blurb: 'Green-black ledger surfaces, ruled in brass.',
    // Gilded Hand, paired with `liquidated`: "deep green-black surfaces,
    // lineStrong in brass" — the brief names the base hue and the accent as
    // two different colours on purpose, so `lineStrong` alone breaks toward
    // an olive-gold. The gap is held under the near-monochrome ceiling (spread
    // ~85° of the allowed 90°) rather than reaching for a fully saturated
    // gold, which is what "brass" over "baize" means anyway. Issue #15's
    // ornament, built: "a thin double rule" — the accountant's double
    // underline at the foot of every card — under a lamp, with coin on the
    // walls.
    surface: {
      void: '#011407',
      panel: '#03210f',
      raised: '#0b2b18',
      hover: '#143621',
      line: '#1d3e29',
      lineStrong: '#7d7c2d',
    },
    ink: {
      bright: '#f5faf7',
      base: '#ebf2ed',
      dim: '#98aa9d',
      faint: '#68796d',
      ghost: '#424e45',
    },
    ornament: {
      // The lamp burns the brass rule's own colour. An amber lamp was warmer
      // still, but the brass already spends almost all of the room's hue
      // family, and a tinted light has to stay inside it (constraint 7).
      light: 'radial-gradient(90% 55% at 50% -10%, rgba(240, 246, 176, 0.05), transparent 68%)',
      ...wallpaper('coins', 0.15),
      pip: shapeRef('coin'),
      trim: `${edgeRule('bottom', 3)}, ${edgeRule('bottom', 1)}`,
    },
  },

  {
    id: 'archmage',
    name: 'The Chair',
    endingId: 'archmage',
    blurb: 'A pale, cold blue. The disclaimer used to live here.',
    // Pale Academy, paired with `sealed_in_gem`: navy surfaces (262°) with a
    // chalk-pale `lineStrong`. Issue #15's ornament, built: "a marginal rule
    // down the left of each card — a cited page"; the walls are a blackboard
    // of compass-and-straightedge constructions, and the Academy is watching.
    surface: {
      void: '#050e1f',
      panel: '#0c1930',
      raised: '#14223c',
      hover: '#1d2c48',
      line: '#253451',
      lineStrong: '#6d81a5',
    },
    ink: {
      bright: '#f6f8fd',
      base: '#ecf0f8',
      dim: '#9ba5b6',
      faint: '#6c7585',
      ghost: '#444b56',
    },
    ornament: {
      light: 'radial-gradient(70% 50% at 50% -10%, rgba(220, 232, 255, 0.06), transparent 70%)',
      ...wallpaper('diagram', 0.14),
      pip: shapeRef('eye'),
      trim: edgeRule('left', 2),
    },
  },

  {
    id: 'archdruid',
    name: 'The Eldest Oak',
    endingId: 'archdruid',
    blurb: 'Gold-green, the colour of a grove that voted without meeting.',
    // Verdant Choir, paired with `turned_to_fertilizer`: leaf green (132°),
    // the living half of the pair. Growth, not light — the gradient rises from
    // the bottom edge, and moss grows along the foot of every card; leaves on
    // the wind across the walls.
    surface: {
      void: '#091601',
      panel: '#122202',
      raised: '#1a2d08',
      hover: '#233711',
      line: '#2b3f19',
      lineStrong: '#436b17',
    },
    ink: {
      bright: '#f7f9f5',
      base: '#edf2e9',
      dim: '#9da994',
      faint: '#6d7965',
      ghost: '#464d40',
    },
    ornament: {
      light: 'radial-gradient(85% 60% at 50% 108%, rgba(150, 224, 160, 0.05), transparent 70%)',
      ...wallpaper('leaves', 0.19),
      pip: shapeRef('acorn'),
      // Moss along the foot of every card, in the edge band: a 14px tint
      // under the last line of text cost the ink a point of contrast.
      trim: edgeBand('linear-gradient(0deg, color-mix(in srgb, var(--ew-line-strong) 50%, transparent), transparent)', 'bottom', 0, 4),
    },
  },

  {
    id: 'overthrown_the_kingdom',
    name: 'The Crown',
    endingId: 'overthrown_the_kingdom',
    blurb: 'Royal purple, kept by someone the Crownlands did not choose.',
    // Crownlands, paired with `exiled_and_overrun`: a royal plum (345°), with
    // `lineStrong` bent toward a restrained gold — "a single gold rule" — the
    // same accent-not-family-shift `grand_arbiter` uses, for the same reason:
    // true gold sits outside 90° of the room's hue, so the rule reads warm
    // relative to the room rather than literally gold. Issue #15's ornament,
    // built: "a full-width rule above the header — a banner hem", at the top
    // of every card; fleurs-de-lis on the walls.
    surface: {
      void: '#1d0413',
      panel: '#2d0a20',
      raised: '#39132a',
      hover: '#451c35',
      line: '#4e243d',
      lineStrong: '#98742b',
    },
    ink: {
      bright: '#fcf7f9',
      base: '#f7edf2',
      dim: '#b59da9',
      faint: '#836d79',
      ghost: '#54454d',
    },
    ornament: {
      light: 'radial-gradient(90% 55% at 50% -10%, rgba(255, 226, 180, 0.05), transparent 68%)',
      ...wallpaper('fleur', 0.18),
      pip: shapeRef('crown'),
      trim: `${edgeRule('top', 0, 2)}, ${edgeRule('top', 3, 1, 'color-mix(in srgb, var(--ew-line-strong) 50%, transparent)')}`,
    },
  },

  // ---------------------------------------------------------------------------
  // The Good Wizard (issue #14 slice 5, issue #23).
  //
  // The one deliberate register break in the set: every theme above is a hue
  // rotation of the same warm-DARK structure, and this one is light — cream
  // and gold, daylight rather than tower-at-night. Constraint 2 (near-
  // monochrome within a theme) and constraint 5 (the ink floor) are still
  // measured, not waived: `ink` simply inverts direction here, dark warm
  // brown-black read against a pale cream ramp rather than pale parchment
  // read against a warm black one. Its light is sunlight — white, which on
  // cream raises the contrast rather than lowering it — and there are daisies
  // in the lawn.
  // ---------------------------------------------------------------------------

  {
    id: 'good_wizard',
    name: 'Ordinary Weather',
    endingId: 'good_wizard',
    blurb: 'Cream and gold. The one room in the tower that gets any daylight.',
    surface: {
      void: '#fbf4df',
      panel: '#f3e7c4',
      raised: '#ecdba8',
      hover: '#e4cd8a',
      line: '#d6b667',
      lineStrong: '#b98b2e',
    },
    ink: {
      bright: '#1c1300',
      base: '#241a05',
      dim: '#4a3814',
      faint: '#6b5726',
      ghost: '#8f7b4a',
    },
    ornament: {
      light: 'radial-gradient(100% 60% at 50% -10%, rgba(255, 255, 255, 0.55), transparent 70%)',
      ...wallpaper('daisies', 0.12),
      pip: shapeRef('sun'),
      trim: 'linear-gradient(180deg, rgba(255, 255, 255, 0.35), transparent 14px)',
    },
  },

  // ---------------------------------------------------------------------------
  // Arch-Lich (issue #25).
  //
  // Not a rotation of "Cold Room" — a theme keyed to `arch_lich` earns its own
  // block regardless of how close the two endings sit. Still the SAME violet-
  // undeath family `lichdom` claims, lit from something `lichdom` doesn't
  // have: a shade warmer (300°) and the lightest dark room the ink floor
  // allows, a candle in the cold room rather than the cold room itself.
  // ---------------------------------------------------------------------------

  {
    id: 'arch_lich',
    name: 'Kept Vigil',
    endingId: 'arch_lich',
    blurb: 'The same cold room. Somebody left a candle burning in it anyway.',
    surface: {
      void: '#1b1329',
      panel: '#281d3a',
      raised: '#322746',
      hover: '#3d3053',
      line: '#45395c',
      lineStrong: '#6e519d',
    },
    ink: {
      bright: '#fbf9fe',
      base: '#f3f0f9',
      dim: '#a7a1b5',
      faint: '#777184',
      ghost: '#4c4855',
    },
    ornament: {
      // The candle burns rose, the warm edge of the room's violet. An amber
      // flame sat a third of the wheel from the room, outside the hue family
      // a tinted light must keep to (constraint 7), and read as a second
      // colour rather than a warmer corner of the same one.
      light:
        'radial-gradient(60% 40% at 50% -6%, rgba(255, 222, 236, 0.03), transparent 70%), radial-gradient(90% 55% at 50% -10%, rgba(236, 220, 255, 0.03), transparent 68%)',
      ...wallpaper('candles', 0.11),
      pip: shapeRef('flame'),
      // The candle's glow on the top edge of every card, in the edge band
      // rather than over the text, for the same reason as Wrong Colour's.
      trim: edgeBand(
        'radial-gradient(50% 100% at 50% 0%, color-mix(in srgb, var(--ew-line-strong) 50%, transparent), transparent)',
        'top',
        0,
        3,
      ),
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

export const ORNAMENT_VARS: Record<keyof typeof ornament, string> = {
  light: '--ew-light',
  motif: '--ew-motif',
  motifSize: '--ew-motif-size',
  motifOpacity: '--ew-motif-opacity',
  pip: '--ew-pip',
  trim: '--ew-trim',
};

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
  for (const [key, value] of Object.entries(theme.ornament)) {
    out[ORNAMENT_VARS[key as keyof typeof ornament]] = String(value);
  }
  return out;
}

/**
 * The four bands the selector draws, resolved against the default — plus the
 * strong line colour, which the swatch paints the theme's own wallpaper and
 * glyph in, exactly as the room itself does.
 *
 * A theme that does not override `ink` still needs an ink band, so every
 * lookup falls back to the shipped token rather than rendering a hole.
 */
export function swatchBands(theme: ThemeDef): {
  void: string;
  panel: string;
  line: string;
  ink: string;
  lineStrong: string;
} {
  return {
    void: theme.surface.void ?? surface.void,
    panel: theme.surface.panel ?? surface.panel,
    line: theme.surface.line ?? surface.line,
    ink: theme.ink?.base ?? ink.base,
    lineStrong: theme.surface.lineStrong ?? surface.lineStrong,
  };
}
