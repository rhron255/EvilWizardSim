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
    // A red-brown room with the hero's own `--ew-danger` promoted, unmuted,
    // to the strong rule. That colour was always in the palette; this theme
    // just lets it draw the borders.
    surface: {
      void: '#1a0f0d',
      panel: '#2b1915',
      raised: '#38211c',
      hover: '#462823',
      line: '#55312a',
      lineStrong: '#b4453c',
    },
    ink: {
      bright: '#f8f7f7',
      base: '#efece9',
      dim: '#a6988c',
      faint: '#786a5e',
      ghost: '#4f4740',
    },
  },

  {
    id: 'sealed_in_gem',
    name: 'Amethyst',
    endingId: 'sealed_in_gem',
    blurb: 'The Academy’s violet, seen from inside the stone.',
    /**
     * The most saturated `lineStrong` of any theme — every edge is a facet.
     *
     * The issue asked for ink at "slightly lower contrast — read through
     * stone", which collides head-on with constraint 5. The constraint wins,
     * because it is the testable one: the ink stays above the floor and the
     * "seen through stone" reading is carried by the violet cast of the
     * surfaces instead, which is where it belongs anyway.
     */
    surface: {
      void: '#170c1a',
      panel: '#26142c',
      raised: '#321a3a',
      hover: '#3e2048',
      line: '#4c2858',
      lineStrong: '#78338f',
    },
    ink: {
      bright: '#f8f7f8',
      base: '#eeebf0',
      dim: '#9f8ca6',
      faint: '#715e78',
      ghost: '#4b404f',
    },
  },

  {
    id: 'betrayed_by_apprentice',
    name: 'New Management',
    endingId: 'betrayed_by_apprentice',
    blurb: 'The same tower, under someone else’s hand.',
    // The joke is that almost nothing has changed: the same warm neutral
    // room, a desaturated `danger` at the strong rule, and the headings
    // dropped from the display serif to the UI sans. The FONT is what carries
    // this theme — it is the one whose identity is not a hue, which is why it
    // is the least saturated of the seven and allowed to be.
    surface: {
      void: '#17120f',
      panel: '#261e1a',
      raised: '#322822',
      hover: '#3f312a',
      line: '#4d3c33',
      lineStrong: '#8a4f45',
    },
    ink: {
      bright: '#f8f7f7',
      base: '#f0edeb',
      dim: '#a69b8c',
      faint: '#786d5e',
      ghost: '#4f4840',
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
     * NOT the shipped `data-lich` values. That block was authored as a tint
     * you were meant to notice only subliminally, mid-run, on a screen you
     * were already looking at. As a THEME it has a second job — being picked
     * out of a grid of eight swatches — and at its original near-black it
     * failed that badly enough to be reported: the themes were "hard to tell
     * apart from the regular one". So the whole ramp is lifted and saturated,
     * roughly 1.5x the old panel luminance.
     *
     * The ink moved with it, and had to: at the default ink the shipped panel
     * sat EXACTLY on the contrast floor, so there was no headroom to brighten
     * a surface without brightening what sits on it. See `themes.test.ts`.
     */
    surface: {
      void: '#0f0b1b',
      panel: '#18132d',
      raised: '#20193b',
      hover: '#281f49',
      line: '#302659',
      lineStrong: '#3f3078',
    },
    ink: {
      bright: '#f7f7f8',
      base: '#eae9ef',
      dim: '#908ca6',
      faint: '#635e78',
      ghost: '#42404f',
    },
  },

  {
    id: 'retired_to_swamp',
    name: 'Peat',
    endingId: 'retired_to_swamp',
    blurb: 'Nothing dramatic is happening. That was the point.',
    // The warmest theme, and the softest. Deep brown surfaces and every radius
    // one step rounder. Its ornament is an absence: no background gradient at
    // all, just a flat wash — see `RunScreen.module.css`.
    surface: {
      void: '#160e08',
      panel: '#25180e',
      raised: '#322013',
      hover: '#3f2917',
      line: '#4e321d',
      lineStrong: '#6f4520',
    },
    ink: {
      bright: '#f7f6f5',
      base: '#eceae6',
      dim: '#a69a8c',
      faint: '#786c5e',
      ghost: '#4f4840',
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
      void: '#151513',
      panel: '#242321',
      raised: '#302f2c',
      hover: '#3c3a37',
      line: '#484641',
      lineStrong: '#6c6860',
    },
    ink: {
      bright: '#f8f8f7',
      base: '#f5f4f2',
      dim: '#a69d8c',
      faint: '#786f5e',
      ghost: '#4f4a40',
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
      void: '#081614',
      panel: '#0e2521',
      raised: '#13322d',
      hover: '#183f38',
      line: '#1d4e46',
      lineStrong: '#22705f',
    },
    ink: {
      bright: '#f7f8f8',
      base: '#eef2f1',
      dim: '#8ca6a1',
      faint: '#5e7873',
      ghost: '#404f4c',
    },
  },

  // ---------------------------------------------------------------------------
  // The five faction reprisals (issue #14 slice 1, recoloured for issue #15
  // track C2).
  //
  // These five shipped as a SIDE EFFECT of #14: `themes.test.ts` fails the
  // moment an ending has no theme, so each reprisal got a generated palette —
  // one hue per theme, no relation to the faction it belonged to — the day its
  // ending landed, months before C2 was scheduled to give them one on purpose.
  // That palette is what #15 C2 actually specifies: "faction pairs share a hue
  // family and differ in treatment; leadership is the faction ascendant,
  // reprisal is the faction's process applied to you." Four of these five
  // hues did not agree with their pair (`turned_to_fertilizer` already landed
  // in the Verdant Choir's own green and needed no change; the family
  // reassignment below is what C2 is actually for).
  //
  // Same generation recipe as before — one hue per theme at a fixed
  // lightness/saturation ladder, the panel and ink nudged until the default
  // palette's 13.80:1 clears on `base`, `bright`, and against `void` — with
  // the hue itself now chosen to MATCH the leadership half of the pair below,
  // not merely to look distinct from its neighbours.
  // ---------------------------------------------------------------------------

  {
    id: 'eternally_repurposed',
    name: 'Requisition',
    endingId: 'eternally_repurposed',
    blurb: 'Ash and old brass. Stock, correctly filed.',
    // Ashen Covenant, paired with `contract_writer` below: the same
    // near-black ember hue, gone cold. Saturation drops from Pact Master's
    // ~22% toward ~12% — "desaturated toward neutral grey" — and `base` sits
    // two steps closer to `faint` than the usual ink recipe, per the brief.
    surface: {
      void: '#0f0d0c',
      panel: '#1d1917',
      raised: '#292320',
      hover: '#352d29',
      line: '#403632',
      lineStrong: '#4c423e',
    },
    ink: {
      bright: '#f8f8f8',
      base: '#eae7e6',
      dim: '#998780',
      faint: '#71615b',
      ghost: '#4b423f',
    },
  },

  {
    id: 'liquidated',
    name: 'Assets Realised',
    endingId: 'liquidated',
    blurb: 'The same green-black ledger room, emptied.',
    // Gilded Hand, paired with `grand_arbiter` below. Previously a
    // counting-house BLUE with no relation to its partner's gold-on-green —
    // the brief's own "same green-black" was not optional. `raised` is
    // deliberately equal to `panel` ("raised drops a step, so surfaces are
    // literally emptied") and `line`/`lineStrong` desaturate toward grey
    // rather than carrying the brass forward.
    surface: {
      void: '#0c1309',
      panel: '#172410',
      raised: '#172410',
      hover: '#223319',
      line: '#2e372a',
      lineStrong: '#3b4536',
    },
    ink: {
      bright: '#f8f8f8',
      base: '#edefec',
      dim: '#8b9b83',
      faint: '#5d6c56',
      ghost: '#3e463a',
    },
  },

  {
    id: 'turned_to_fertilizer',
    name: 'Good Ground',
    endingId: 'turned_to_fertilizer',
    blurb: 'Everything in this room is growing. Some of it is you.',
    // The darkest panel of the twelve: green sits high in the luminance
    // formula, so the same lightness step that reads as a room in blue reads
    // as a lawn here, and the ink loses its floor. Verdant Choir, paired with
    // `archdruid` — this one already shared the family when it shipped under
    // #14, so C2 leaves it untouched.
    surface: {
      void: '#091208',
      panel: '#132410',
      raised: '#1a3216',
      hover: '#21401d',
      line: '#294e23',
      lineStrong: '#2e6a25',
    },
    ink: {
      bright: '#f8f8f8',
      base: '#ecefec',
      dim: '#91a48e',
      faint: '#62775f',
      ghost: '#434e41',
    },
  },

  {
    id: 'exiled_and_overrun',
    name: 'Past the Border',
    endingId: 'exiled_and_overrun',
    blurb: 'The same purple the Crown wears, gone slate and cold.',
    // Crownlands, paired with `overthrown_the_kingdom` below. Previously a
    // warm rose unrelated to the King's palette; now the same indigo-violet
    // family, desaturated and cooled ("gone slate and colder"). `raised`
    // flattens to `panel`'s own step, matching Liquidated's move, and
    // `lineStrong` breaks from the family hue toward a low-presence
    // danger-red rather than carrying the King's gold rule forward — the
    // brief's "the gold rule becomes `--ew-danger` at low opacity", read as a
    // hue swap rather than a literal alpha channel (every token here is an
    // opaque hex; `contrastRatio` assumes it).
    surface: {
      void: '#130c13',
      panel: '#221622',
      raised: '#221622',
      hover: '#2f202f',
      line: '#3b293b',
      lineStrong: '#56342e',
    },
    ink: {
      bright: '#f8f8f8',
      base: '#efecef',
      dim: '#998099',
      faint: '#6c566c',
      ghost: '#463a46',
    },
  },

  {
    id: 'consumed',
    name: 'Underneath',
    endingId: 'consumed',
    blurb: 'The same violet as the cold room, dropped nearly to black.',
    // Worm Below, paired with `lichdom` ("Cold Room") above — same ~253°
    // blue-violet hue `lichdom` claims, not the unrelated teal this shipped
    // with under #14. `void` and `panel` sit one lightness step apart instead
    // of the usual two ("almost converge"), and `line` desaturates hard
    // relative to its neighbours ("barely visible") while `lineStrong` stays
    // saturated enough to clear its own reason for existing.
    surface: {
      void: '#0b0814',
      panel: '#0e0b19',
      raised: '#151125',
      hover: '#1b162f',
      line: '#231f30',
      lineStrong: '#2b224f',
    },
    ink: {
      bright: '#f8f8f8',
      base: '#e4e3e8',
      dim: '#88839b',
      faint: '#5b566c',
      ghost: '#3c3a46',
    },
  },

  // ---------------------------------------------------------------------------
  // The five faction leadership endings (issue #14, slice 2), recoloured for
  // issue #15 track C2. `lichdom` above is the Worm Below's sixth and already
  // has its theme, "Cold Room".
  //
  // Same generation recipe as the reprisals above: one hue per theme, held at
  // a fixed lightness ladder, panel and ink nudged until the default
  // palette's 13.80:1 clears on `base`, `bright`, and against `void`.
  //
  // `contract_writer` shipped under #14 in the SAME olive `archdruid` and
  // `turned_to_fertilizer` already occupy — a generated hue with no relation
  // to "Ashen Covenant", chosen before C2 existed to give it one. It moves to
  // the ember-red family it shares with `eternally_repurposed` above; that
  // frees the olive/gold-green band for the Verdant Choir pair alone, so
  // `grand_arbiter` no longer needs the crowded, over-saturated compromise
  // its comment used to describe. It now reads as what the brief actually
  // asks for — green-black "baize" surfaces with a `lineStrong` bent toward
  // brass — shared with `liquidated` above, and the two are the pair the
  // rest of the ramp keeps in lockstep with (`liquidated`'s `raised` is
  // literally `grand_arbiter`'s `panel` value).
  // ---------------------------------------------------------------------------

  {
    id: 'contract_writer',
    name: 'Correspondence',
    endingId: 'contract_writer',
    blurb: 'Ash over banked embers. The ink is still fresh.',
    // Ashen Covenant, paired with `eternally_repurposed` above: the same
    // near-black ember hue at roughly double its saturation — "ash-grey
    // panels" with a red undertone the reprisal has already lost.
    surface: {
      void: '#100b0a',
      panel: '#1f1714',
      raised: '#2c201c',
      hover: '#392a24',
      line: '#46322b',
      lineStrong: '#703c29',
    },
    ink: {
      bright: '#f8f8f8',
      base: '#efedec',
      dim: '#a4948e',
      faint: '#77665f',
      ghost: '#4e4441',
    },
  },

  {
    id: 'grand_arbiter',
    name: 'The Final Number',
    endingId: 'grand_arbiter',
    blurb: 'Green-black ledger surfaces, ruled in brass.',
    // Gilded Hand, paired with `liquidated` above: "deep green-black
    // surfaces, lineStrong in brass" — the brief names the base hue and the
    // accent as two different colours on purpose, so `lineStrong` alone
    // breaks toward gold (hue ~48° against the ramp's ~100°). The gap is
    // held under the near-monochrome ceiling (spread ~53° of the allowed
    // 90°) rather than reaching for a fully saturated gold, which is what
    // "brass" over "baize" means anyway — a warm accent on a green room, not
    // a second hue family.
    surface: {
      void: '#0c1309',
      panel: '#172410',
      raised: '#203317',
      hover: '#29411d',
      line: '#325022',
      lineStrong: '#73621f',
    },
    ink: {
      bright: '#f8f8f8',
      base: '#edefec',
      dim: '#95a48e',
      faint: '#67775f',
      ghost: '#454e41',
    },
  },

  {
    id: 'archmage',
    name: 'The Chair',
    endingId: 'archmage',
    blurb: 'A pale, cold blue. The disclaimer used to live here.',
    surface: {
      void: '#090c15',
      panel: '#111527',
      raised: '#171d36',
      hover: '#1d2544',
      line: '#232d52',
      lineStrong: '#25346f',
    },
    ink: {
      bright: '#f8f8f8',
      base: '#ececef',
      dim: '#8e92a4',
      faint: '#5f6477',
      ghost: '#41444e',
    },
  },

  {
    id: 'archdruid',
    name: 'The Eldest Oak',
    endingId: 'archdruid',
    blurb: 'Gold-green, the colour of a grove that voted without meeting.',
    surface: {
      void: '#07100a',
      panel: '#0f2215',
      raised: '#15301d',
      hover: '#1b3e26',
      line: '#214d2f',
      lineStrong: '#236939',
    },
    ink: {
      bright: '#f8f8f8',
      base: '#ecefed',
      dim: '#8ea495',
      faint: '#5f7767',
      ghost: '#414e45',
    },
  },

  {
    id: 'overthrown_the_kingdom',
    name: 'The Crown',
    endingId: 'overthrown_the_kingdom',
    blurb: 'Royal purple, kept by someone the Crownlands did not choose.',
    // Crownlands, paired with `exiled_and_overrun` above: the same
    // indigo-violet family, with `lineStrong` bent toward a restrained gold —
    // "a single gold rule" — the same accent-not-family-shift `grand_arbiter`
    // uses above, for the same reason: true spectral gold (~45°) sits well
    // outside 90° of true indigo (~250°), so the rule reads warm relative to
    // the room rather than literally gold. The constraint wins, because it is
    // the testable one (`sealed_in_gem`'s comment above gives the general
    // case).
    surface: {
      void: '#150911',
      panel: '#27111f',
      raised: '#35182a',
      hover: '#431e35',
      line: '#512440',
      lineStrong: '#705629',
    },
    ink: {
      bright: '#f8f8f8',
      base: '#efecee',
      dim: '#a48e9c',
      faint: '#775f6e',
      ghost: '#4e4149',
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
  // read against a warm black one. Neither token object has a tier key, so
  // constraint 1 holds the same way it does for every other theme.
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
  },

  // ---------------------------------------------------------------------------
  // Arch-Lich (issue #25).
  //
  // Not a rotation of "Cold Room" — a theme keyed to `arch_lich` earns its own
  // block regardless of how close the two endings sit, the same way `good_
  // wizard` above earns one distinct from every dark theme it sits beside.
  // Still the SAME violet-undeath family `lichdom` claims (constraint 2 is
  // measured per theme, not against a sibling, so there is no rule forcing
  // distance from it) — this one is simply lit from something `lichdom`
  // doesn't have: a shade warmer and several steps brighter, a candle in the
  // cold room rather than the cold room itself. Dark, unlike `good_wizard`;
  // near-monochrome within itself, unlike nothing — every theme is.
  // ---------------------------------------------------------------------------

  {
    id: 'arch_lich',
    name: 'Kept Vigil',
    endingId: 'arch_lich',
    blurb: 'The same cold room. Somebody left a candle burning in it anyway.',
    surface: {
      void: '#130e1a',
      panel: '#20142e',
      raised: '#2b1c3d',
      hover: '#35234a',
      line: '#432c5e',
      lineStrong: '#573a76',
    },
    ink: {
      bright: '#fbf5ff',
      base: '#f1e7f8',
      dim: '#b39dc5',
      faint: '#8472a1',
      ghost: '#5d5077',
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
