/**
 * The theme constraints, asserted rather than reviewed.
 *
 * Issue #15 knowingly overrides CLAUDE.md rule 3, and the six constraints it
 * traded for that override are only worth anything if they are measured. Each
 * describe block below is one of them.
 *
 * Two anchoring notes, both CLAUDE.md failure mode 11:
 *
 *   - The CSS sweep reads `tokens.css` OFF DISK. The stylesheet is a separate
 *     hand-written artifact that `themes.ts` does not generate, so it is a
 *     real independent anchor — a theme added to the TS and forgotten in the
 *     CSS (or vice versa) fails here rather than rendering half-applied.
 *   - The contrast floor is computed from the DEFAULT palette, not pinned to a
 *     literal. Widening the default's own contrast would move the floor with
 *     it, which is correct; hardcoding 13.8 would let a future edit to the
 *     default silently strand every theme above it. The bare-room floor is
 *     computed the same way, from the default room, and its screen stacks
 *     are read off the stylesheets that paint them.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EndingId } from '../types';
import { endings } from '../content/endings';
import { contrastRatio, parseHex } from './contrast';
import { deltaEOK, JND_OK, over } from './oklab';
import { shapeKind, SHAPE_IDS, type ShapeId } from './ornaments';
import {
  DEFAULT_THEME_ID,
  INK_VARS,
  isThemeId,
  isThemeUnlocked,
  ORNAMENT_VARS,
  SURFACE_VARS,
  THEMES,
  themeFor,
  themeVars,
  unlockedThemeIds,
  swatchBands,
  type ThemeDef,
} from './themes';
import { ink, ornament, surface, tierColor } from './tokens';

/**
 * Read off disk, not imported.
 *
 * Vite would hand back a CSS *module* object, which is exactly the mirror this
 * test exists to distrust — the point is to read the bytes the browser will
 * receive. `vitest` runs from the repo root.
 */
const CSS = readFileSync(resolve(process.cwd(), 'src/theme/tokens.css'), 'utf8');

/**
 * The real endings, read from the content module rather than restated.
 *
 * A hand-written list here would be the implementation grading its own
 * homework in the slowest possible way: it would keep passing on the day
 * someone ADDS an ending, because the list and the theme table would agree
 * with each other while both disagreed with the game. Issue #14 adds eleven
 * endings; when it lands, this is what says so.
 */
const ENDING_IDS: EndingId[] = endings.map((e) => e.id);

/** Pull one `[data-theme='id'] { … }` block's declarations out of the CSS. */
function cssBlockFor(id: string): Record<string, string> | null {
  const start = CSS.indexOf(`[data-theme='${id}']`);
  if (start === -1) return null;
  return declarationsFrom(start);
}

/** The declarations of the first `{ … }` block at or after `start`. */
function declarationsFrom(start: number): Record<string, string> {
  const open = CSS.indexOf('{', start);
  const close = CSS.indexOf('}', open);
  // Comments out first: :root documents its tokens inline, and a `;` in
  // prose would otherwise glue a comment onto the next declaration's name.
  const body = CSS.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, '');
  const out: Record<string, string> = {};
  for (const line of body.split(';')) {
    const [name, ...rest] = line.split(':');
    const prop = name.trim();
    if (!prop.startsWith('--')) continue;
    out[prop] = rest.join(':').trim();
  }
  return out;
}

/**
 * A CSS value as the sync tests compare it: every run of whitespace, newlines
 * included, collapsed to one space, and the case folded.
 *
 * `tokens.css` is hand-written — that is what makes it an anchor — so a long
 * value there may be wrapped across lines, and the CSS is conventionally
 * lowercase where the TS has a few uppercase hexes carried over from
 * `tokens.ts`. Both sides go through this, so only spacing and case are
 * forgiven: a space that appears or vanishes between two tokens, or any other
 * character changed, still fails.
 */
function normalise(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Every value of a `{ '--ew-…': value }` record, normalised. */
function normaliseAll(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, normalise(v)]));
}

/**
 * The channels of an `rgb()`/`rgba()` call, 0–255 and alpha 0–1.
 *
 * Reads the comma and the space-and-slash spellings alike, and percentages in
 * either place, so a light cannot slip past the alpha cap by being written in
 * the other syntax. Alpha defaults to 1, as CSS does: an `rgb()` with no alpha
 * is fully opaque, which is exactly what the cap has to see.
 */
function channels(fn: string): [number, number, number, number] {
  const args = fn
    .slice(fn.indexOf('(') + 1, fn.lastIndexOf(')'))
    .split(/[\s,/]+/)
    .filter(Boolean);
  const read = (arg: string, full: number) => (arg.endsWith('%') ? (parseFloat(arg) / 100) * full : parseFloat(arg));
  const [r, g, b, a = '1'] = args;
  return [read(r, 255), read(g, 255), read(b, 255), read(a, 1)];
}

/** Every `rgb()`/`rgba()` call in a CSS string. */
const rgbCalls = (css: string): string[] => css.match(/\brgba?\([^)]*\)/gi) ?? [];

/**
 * Rough hue of a colour, 0–360, ignoring near-greys. Takes a `#rrggbb` hex or
 * an `rgb()`/`rgba()` call; alpha plays no part in hue.
 */
function hue(colour: string): number | null {
  const [r, g, b] = (
    colour.startsWith('#') ? [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16)) : channels(colour)
  ).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  // Saturation floor: a near-grey has no meaningful hue and pretending it
  // does is how this check would produce nonsense for Settled Account.
  if (d < 0.04) return null;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

/** The widest pair of hues in a set, taking the shorter way round the circle. */
function hueSpread(hues: number[]): number {
  return Math.max(
    0,
    ...hues.flatMap((a) =>
      hues.map((b) => {
        const d = Math.abs(a - b) % 360;
        return d > 180 ? 360 - d : d;
      }),
    ),
  );
}

/**
 * The widest a room's hues may spread and still be one family (constraint 2).
 *
 * The Sword and New Management deliberately carry a red rule against
 * warm-brown surfaces, which is a wider family than the rest — but a theme
 * spanning more than a quadrant has stopped being one hue.
 */
const HUE_FAMILY = 90;

function notNull<T>(value: T | null): value is T {
  return value !== null;
}

/*
 * The bare room, modelled (constraints 5 and 7).
 *
 * Text that sits straight on a screen — the title's epigraph, the run screen's
 * quiet line — has no panel behind it. It sits on `--ew-void` with every
 * screen-wide layer painted over that: the key light, the tier vignette on
 * the set-piece screens, and the wallpaper. The model below rebuilds that
 * stack from the stylesheets themselves, each layer at the strongest it is
 * ever drawn on screen, and measures the ink against it.
 */

/** A CSS value split on its top-level commas: one entry per background layer. */
function layersOf(css: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of css) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(current.trim());
      current = '';
    } else current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/**
 * The layers of a stylesheet's `.screen { background: … }`, top first, read
 * off disk: the model is checked against the stacks the browser actually
 * paints, not against a copy of them kept here.
 */
function screenLayers(path: string): string[] {
  const css = readFileSync(resolve(process.cwd(), path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = css.slice(css.indexOf('.screen {'));
  const body = rule.slice(rule.indexOf('{') + 1, rule.indexOf('}'));
  const background = body.match(/(?:^|;)\s*background:([^;]*);/)?.[1] ?? '';
  return layersOf(normalise(background));
}

/**
 * A radial gradient's ellipse and transparent stop, all as fractions of the
 * box: radii `rx` of its width and `ry` of its height, centre (`cx`, `cy`),
 * and the stop as a fraction of the radius.
 */
type Ellipse = { rx: number; ry: number; cx: number; cy: number; stop: number };

/**
 * How much of a radial gradient's alpha reaches the screen at its brightest
 * point, 0–1.
 *
 * The alpha falls linearly from the centre to the transparent stop. A centre
 * inside the box is on screen, so the peak is full strength. A centre outside
 * it — a light from above the frame — peaks at the nearest point of the box,
 * at `1 − d / stop`, where `d` is that point's distance from the centre in
 * radii. Measured in radii the ellipse is a circle and the box is still an
 * axis-aligned box, so the nearest point is the centre clamped into it.
 */
function peakFactor({ rx, ry, cx, cy, stop }: Ellipse): number {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const d = Math.hypot((clamp(cx) - cx) / rx, (clamp(cy) - cy) / ry);
  return Math.max(0, 1 - d / stop);
}

/** A flat colour laid over the room at `alpha`, `factor` of its authored strength. */
type RoomLayer = { colour: string; alpha: number; factor: number };

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');

/** `radial-gradient(RX% RY% at X% Y%, rgba(…), transparent STOP%)` — every radial key light's shape. */
const RADIAL_LIGHT =
  /^radial-gradient\(\s*([\d.]+)%\s+([\d.]+)%\s+at\s+(-?[\d.]+)%\s+(-?[\d.]+)%\s*,\s*rgba?\([^)]*\)\s*,\s*transparent\s+([\d.]+)%\s*\)$/i;

/**
 * A key light as the layers it paints, BOTTOM first, each at its peak.
 *
 * Throws on any layer it cannot model rather than skipping it: a light this
 * cannot read is a light the floor below is not measuring.
 */
function keyLight(light: string): RoomLayer[] {
  if (normalise(light) === 'none') return [];
  return layersOf(light)
    .map((layer) => {
      const calls = rgbCalls(layer);
      if (calls.length !== 1 || /var\(|color-mix\(/i.test(layer)) {
        throw new Error(`the room model cannot read this key-light layer: ${layer}`);
      }
      const [r, g, b, a] = channels(calls[0]);
      let factor: number;
      if (/^linear-gradient\(/i.test(layer)) {
        // Every stop of a linear gradient lands somewhere on screen.
        factor = 1;
      } else {
        const m = layer.match(RADIAL_LIGHT);
        if (!m) throw new Error(`the room model cannot read this key-light layer: ${layer}`);
        const [rx, ry, cx, cy, stop] = m.slice(1).map((n) => parseFloat(n) / 100);
        factor = peakFactor({ rx, ry, cx, cy, stop });
      }
      return { colour: toHex(r, g, b), alpha: a * factor, factor };
    })
    .reverse();
}

/** The run screen: the key light over the void, and nothing else. */
const RUN_STACK = screenLayers('src/screens/RunScreen.module.css');

/**
 * The set-piece screens (title, ending, theme selector, changelog…): the key
 * light over a vignette tinted with the tier colour, over a black vignette at
 * the foot, over the void.
 */
const SET_PIECE_STACK = screenLayers('src/components/meta/craft.module.css');

/** `radial-gradient(… , color-mix(in srgb, var(--ew-tier) N%, transparent), transparent STOP%)`. */
const TIER_VIGNETTE =
  /^radial-gradient\(([\d.]+)% ([\d.]+)% at (-?[\d.]+)% (-?[\d.]+)%, color-mix\(in srgb, var\(--ew-tier\) ([\d.]+)%, transparent\), transparent ([\d.]+)%\)$/;

/** The tier vignette's alpha at its peak, read from the set-piece stack. */
function tierVignettePeak(): number {
  const m = SET_PIECE_STACK[1]?.match(TIER_VIGNETTE);
  if (!m) throw new Error(`the set-piece stack's second layer is not the tier vignette: ${SET_PIECE_STACK[1]}`);
  const [rx, ry, cx, cy, mix, stop] = m.slice(1).map((n) => parseFloat(n) / 100);
  // color-mix() with `transparent` keeps the tier's hue at `mix` alpha.
  return mix * peakFactor({ rx, ry, cx, cy, stop });
}

/**
 * The ink's worst contrast anywhere on a theme's bare room.
 *
 * The layers are stacked bottom-up on the void — the tier vignette in every
 * tier colour (set-piece screens only), the key light, then the wallpaper,
 * `--ew-line-strong` at `motifOpacity` — each at its peak, as though every
 * peak fell on the same pixel. Text can also sit where any layer has faded to
 * nothing, so every subset of the layers is measured and the worst is kept.
 * That is the whole range: each layer moves the backdrop monotonically as it
 * strengthens, so the extremes are at the subsets. It also covers the one
 * light room, where the key light is white and RAISES the contrast — its
 * worst is the unlit room under the wallpaper.
 *
 * The black vignette at the foot of the set-piece screens is left out. In
 * every dark room it darkens the backdrop behind pale ink, which raises the
 * contrast, so leaving it out is the harder case.
 */
function roomContrast(theme: ThemeDef, setPiece: boolean): number {
  const voidc = theme.surface.void ?? surface.void;
  const base = theme.ink?.base ?? ink.base;
  const wallpaper = {
    colour: theme.surface.lineStrong ?? surface.lineStrong,
    alpha: theme.ornament.motifOpacity,
    factor: 1,
  };
  const tierAlpha = tierVignettePeak();
  const tints: (string | null)[] = setPiece ? Object.values(tierColor) : [null];
  let worst = Infinity;
  for (const tint of tints) {
    const layers: RoomLayer[] = [
      ...(tint ? [{ colour: tint, alpha: tierAlpha, factor: 1 }] : []),
      ...keyLight(theme.ornament.light),
      wallpaper,
    ];
    for (let subset = 0; subset < 1 << layers.length; subset++) {
      const backdrop = layers.reduce(
        (colour, layer, i) => (subset & (1 << i) ? over(colour, layer.colour, layer.alpha) : colour),
        voidc,
      );
      worst = Math.min(worst, contrastRatio(base, backdrop));
    }
  }
  return worst;
}

/** Worst over both stacks: the run screen and the set pieces. */
const roomFloorOf = (theme: ThemeDef) => Math.min(roomContrast(theme, false), roomContrast(theme, true));

/*
 * The vocabulary a key light or card trim may be written in (constraint 7).
 *
 * An allowlist, because the denylist this replaced — no hex literal, no tier
 * var — let `red`, `currentColor`, `hsl()`, `oklch()`, `color()` and `lab()`
 * straight through. A colour can only enter these strings as one of the
 * room's own surface or ink tokens, or as an `rgb()` of plain numbers (which
 * the tests below then hold to white, black or the room's own hue); every
 * other word or function is an offence, and the failure names it.
 */

/** The room's own palette. Not the tier pair, `--ew-legendary`, `--ew-danger` or the deltas. */
const PALETTE_VARS = new Set<string>([...Object.values(SURFACE_VARS), ...Object.values(INK_VARS)]);

const ORNAMENT_FUNCTIONS = new Set([
  'linear-gradient',
  'radial-gradient',
  'conic-gradient',
  'repeating-linear-gradient',
  'repeating-radial-gradient',
  'repeating-conic-gradient',
  'color-mix',
  'rgb',
  'rgba',
  'calc',
]);

/** Background position, size, repeat and gradient-shape keywords, plus the two non-colours. */
const ORNAMENT_WORDS = new Set([
  'transparent',
  'none',
  'top',
  'bottom',
  'left',
  'right',
  'center',
  'at',
  'to',
  'circle',
  'ellipse',
  'closest-side',
  'closest-corner',
  'farthest-side',
  'farthest-corner',
  'no-repeat',
  'repeat',
  'repeat-x',
  'repeat-y',
  'space',
  'round',
]);

const ORNAMENT_UNITS = new Set(['', 'px', '%', 'deg', 'turn']);

/** Every piece of `css` outside the ornament vocabulary; empty when it is all inside. */
function offVocabulary(css: string): string[] {
  const offences: string[] = [];

  // rgb() takes plain numbers only. Checked before the var()s are stripped,
  // so `rgba(var(--ew-panel), 0.5)` and `rgb(from red r g b)` are both caught.
  for (const fn of rgbCalls(css)) {
    if (!/^rgba?\([\d.\s,/%]*\)$/i.test(fn)) offences.push(fn);
  }

  // A var() may name the room's own surfaces and ink, with no fallback — a
  // fallback is a second value nothing here would check.
  let rest = css.replace(/var\(\s*(--[\w-]+)\s*\)/g, (ref: string, name: string) => {
    if (!PALETTE_VARS.has(name)) offences.push(ref);
    return ' ';
  });

  // color-mix() interpolates in sRGB or OKLab. The space is consumed here so
  // `in` and `srgb` are not read as stray words below; any other space is.
  rest = rest.replace(/color-mix\(\s*in\s+(?:srgb|oklab)\s*,/gi, 'color-mix(');

  // What is left, token by token: separators, numbers with a unit, words
  // (a word followed by `(` is a function), and anything else at all.
  const TOKEN = /(\s+|[(),/*+])|(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)|(-{0,2}[a-z_][\w-]*)(\()?|(#[\da-f]+|-|.)/gi;
  for (const [token, separator, number, unit, word, call, other] of rest.matchAll(TOKEN)) {
    if (separator !== undefined) continue;
    if (number !== undefined) {
      if (!ORNAMENT_UNITS.has(unit.toLowerCase())) offences.push(token);
    } else if (word !== undefined) {
      const known = call !== undefined ? ORNAMENT_FUNCTIONS : ORNAMENT_WORDS;
      if (!known.has(word.toLowerCase())) offences.push(token);
    } else if (other !== '-') {
      // A lone `-` is calc()'s minus; everything else here — a hex, a quote,
      // a semicolon — has no business in a background layer.
      offences.push(token);
    }
  }
  return offences;
}

describe('themes · every ending grants exactly one', () => {
  it('covers every ending the game actually ships, and invents none', () => {
    const granted = THEMES.map((t) => t.endingId).filter((id): id is EndingId => id !== null);
    const missing = ENDING_IDS.filter((id) => !granted.includes(id));
    const orphaned = granted.filter((id) => !ENDING_IDS.includes(id));

    // Named separately so the failure says which direction broke: an ending
    // with no theme is content owed a cosmetic; a theme with no ending is a
    // cosmetic nothing can unlock.
    expect(missing, 'endings with no theme — these need one adding to THEMES').toEqual([]);
    expect(orphaned, 'themes whose ending does not exist — unreachable').toEqual([]);
    expect(granted).toHaveLength(ENDING_IDS.length);
  });

  it('reads a real, non-empty ending catalog', () => {
    // Guards the guard: if the import ever resolved to an empty array the two
    // assertions above would pass vacuously.
    expect(ENDING_IDS.length).toBeGreaterThanOrEqual(7);
  });

  it('has exactly one default, and it is the only unearned theme', () => {
    const unearned = THEMES.filter((t) => t.endingId === null);
    expect(unearned).toHaveLength(1);
    expect(unearned[0].id).toBe(DEFAULT_THEME_ID);
  });

  it('gives every theme the id of the ending that grants it', () => {
    // The two id spaces being the same id space is the thing that stops a
    // parallel unlock list from drifting. If these ever diverge, that
    // guarantee is gone and `unlockedThemeIds` is lying.
    for (const theme of THEMES) {
      if (theme.endingId !== null) expect(theme.id).toBe(theme.endingId);
    }
  });

  it('has unique ids and unique player-facing names', () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    expect(new Set(THEMES.map((t) => t.name)).size).toBe(THEMES.length);
  });

  it('gives every theme a name and a blurb', () => {
    for (const theme of THEMES) {
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.blurb.length).toBeGreaterThan(0);
    }
  });
});

describe('themes · constraint 1, the scarce colour is untouchable', () => {
  // The compiler already prevents this in `themes.ts` — neither token object
  // has a tier key. The CSS has no compiler, so it gets swept.
  it('never names --ew-tier or --ew-tier-glow in any theme block', () => {
    for (const theme of THEMES) {
      if (theme.id === DEFAULT_THEME_ID) continue;
      const block = cssBlockFor(theme.id);
      expect(block, `no CSS block for ${theme.id}`).not.toBeNull();
      expect(Object.keys(block!)).not.toContain('--ew-tier');
      expect(Object.keys(block!)).not.toContain('--ew-tier-glow');
    }
  });

  it('declares the tier pair exactly once in the file, on :root', () => {
    // If a theme block ever reintroduced it, this count would climb — this is
    // the version of the check that survives someone adding a block the loop
    // above does not know to look at.
    expect(CSS.match(/--ew-tier:/g)).toHaveLength(1);
    expect(CSS.match(/--ew-tier-glow:/g)).toHaveLength(1);
  });
});

describe('themes · constraint 6, --ew-legendary stays pinned', () => {
  it('is never redefined by a theme', () => {
    for (const theme of THEMES) {
      if (theme.id === DEFAULT_THEME_ID) continue;
      const block = cssBlockFor(theme.id);
      expect(Object.keys(block!)).not.toContain('--ew-legendary');
    }
    expect(CSS.match(/--ew-legendary:/g)).toHaveLength(1);
  });
});

describe('themes · constraint 5, the ink contrast floor', () => {
  /**
   * What the shipped palette achieves, computed not quoted.
   *
   * Every theme must read at least this well. The default is far above WCAG
   * AAA already, so this is a "no theme is worse than the game is" floor
   * rather than an accessibility minimum — which is the point: a hue rotation
   * that looks atmospheric in a swatch is exactly how a palette gets quietly
   * harder to read.
   */
  const FLOOR = contrastRatio(ink.base, surface.panel);

  it('is measured against a default that itself clears WCAG AAA', () => {
    expect(FLOOR).toBeGreaterThanOrEqual(7);
  });

  for (const theme of THEMES) {
    it(`${theme.name} reads at least as well as the default`, () => {
      const bands = swatchBands(theme);
      expect(contrastRatio(bands.ink, bands.panel)).toBeGreaterThanOrEqual(FLOOR);
    });

    it(`${theme.name} keeps its bright ink above the floor too`, () => {
      // `bright` is what headings and the ending card's narration use. A theme
      // that fixed `base` and left `bright` behind would pass the constraint
      // as literally worded and still ship an unreadable heading.
      const panel = theme.surface.panel ?? surface.panel;
      const bright = theme.ink?.bright ?? ink.bright;
      expect(contrastRatio(bright, panel)).toBeGreaterThanOrEqual(FLOOR);
    });

    it(`${theme.name} keeps its ink readable on the void as well as the panel`, () => {
      // Several screens set their background from `--ew-void` and put text
      // straight onto it with no panel behind — the title screen's epigraph,
      // the run screen's quiet line. The constraint names `panel`; the void is
      // the same promise one surface further down.
      const voidc = theme.surface.void ?? surface.void;
      const base = theme.ink?.base ?? ink.base;
      expect(contrastRatio(base, voidc)).toBeGreaterThanOrEqual(FLOOR);
    });
  }
});

describe('themes · constraints 5 and 7, the bare room reads as well as the Tower', () => {
  /**
   * The panel floor, for the two guards below.
   */
  const FLOOR = contrastRatio(ink.base, surface.panel);

  /**
   * The worst the DEFAULT room does for text with no panel behind it, computed
   * from `tokens.ts`, never quoted.
   *
   * Lower than the panel floor, and that is the default's own doing: its key
   * light and the tier vignette both lift the void behind pale ink. So the
   * promise for the bare room is "no theme makes text on it harder to read
   * than the Tower does", and the Tower is measured to find out what that is.
   */
  const ROOM_FLOOR = roomFloorOf(THEMES.find((t) => t.id === DEFAULT_THEME_ID)!);

  it('is measured against a default room that itself clears WCAG AAA, and no higher than a panel', () => {
    expect(ROOM_FLOOR).toBeGreaterThanOrEqual(7);
    expect(ROOM_FLOOR).toBeLessThanOrEqual(FLOOR);
  });

  it('models the stacks the screens actually paint', () => {
    // If a screen gains or loses a layer, the model has to learn about it
    // before this floor means anything again.
    expect(RUN_STACK).toEqual(['var(--ew-light, none)', 'var(--ew-void)']);
    expect(SET_PIECE_STACK).toHaveLength(4);
    expect(SET_PIECE_STACK[0]).toBe('var(--ew-light, none)');
    expect(SET_PIECE_STACK[1]).toMatch(TIER_VIGNETTE);
    expect(SET_PIECE_STACK[3]).toBe('var(--ew-void)');
    // The layer the model leaves out must stay black, which only darkens.
    const vignette = rgbCalls(SET_PIECE_STACK[2]);
    expect(vignette).toHaveLength(1);
    expect(channels(vignette[0]).slice(0, 3)).toEqual([0, 0, 0]);
  });

  it('attenuates a light from above the frame by its distance to the top edge', () => {
    // Worked by hand: the Tower's light is centred 10% above a box whose
    // vertical radius is 55% of it, so the top edge is 10/55 of a radius out,
    // and the colour runs out at 68% of a radius.
    const tower = 'radial-gradient(90% 55% at 50% -10%, rgba(255, 246, 224, 0.045), transparent 68%)';
    const expected = 1 - 10 / 55 / 0.68;
    const [layer] = keyLight(tower);
    expect(layer.factor).toBeCloseTo(expected, 10);
    expect(layer.alpha).toBeCloseTo(0.045 * expected, 10);
    expect(layer.colour).toBe('#fff6e0');
  });

  it('leaves a light centred on screen, or a linear one, at full strength', () => {
    const side = keyLight('radial-gradient(80% 60% at 92% 6%, rgba(224, 190, 200, 0.045), transparent 70%)');
    const glint = keyLight('linear-gradient(115deg, transparent 42%, rgba(255, 240, 236, 0.025) 50%, transparent 58%)');
    expect(side[0].factor).toBe(1);
    expect(glint[0].alpha).toBe(0.025);
    expect(keyLight('none')).toEqual([]);
  });

  for (const theme of THEMES) {
    it(`${theme.name}'s key light is read in full, and reaches the screen`, () => {
      // Guards the model: a light it parsed to nothing would pass the floor
      // for free.
      const layers = keyLight(theme.ornament.light);
      if (normalise(theme.ornament.light) !== 'none') expect(layers.length).toBeGreaterThan(0);
      for (const { factor } of layers) {
        expect(factor).toBeGreaterThan(0);
        expect(factor).toBeLessThanOrEqual(1);
      }
    });

    it(`${theme.name}'s bare room carries the ink at least as well as the Tower's`, () => {
      expect(theme.ornament.motifOpacity).toBeGreaterThan(0);
      expect(roomFloorOf(theme)).toBeGreaterThanOrEqual(ROOM_FLOOR);
    });
  }
});

describe('themes · constraint 3, the CSS mirrors the TypeScript', () => {
  for (const theme of THEMES) {
    if (theme.id === DEFAULT_THEME_ID) continue;

    it(`${theme.name}'s block agrees with its definition token for token`, () => {
      const block = cssBlockFor(theme.id);
      expect(block, `no [data-theme='${theme.id}'] block in tokens.css`).not.toBeNull();

      expect(normaliseAll(block!)).toEqual(normaliseAll(themeVars(theme)));
    });
  }

  it('has no theme block in the CSS that themes.ts does not know about', () => {
    const inCss = [...CSS.matchAll(/\[data-theme='([^']+)'\]/g)].map((m) => m[1]);
    const known = new Set(THEMES.map((t) => t.id));
    for (const id of inCss) expect(known.has(id as never)).toBe(true);
  });

  it('gives the default no block of its own — it is :root', () => {
    expect(cssBlockFor(DEFAULT_THEME_ID)).toBeNull();
  });
});

describe('themes · constraint 2, near-monochrome within a theme', () => {
  for (const theme of THEMES) {
    it(`${theme.name}'s surfaces sit in one hue family`, () => {
      const hues = Object.values(theme.surface).map(hue).filter(notNull);
      expect(hueSpread(hues)).toBeLessThanOrEqual(HUE_FAMILY);
    });
  }
});

describe('themes · constraint 7, ornament brings no colour', () => {
  it('the :root ornament agrees with tokens.ts, as every theme block agrees with its theme', () => {
    // The default has no block of its own (it IS :root), so the sync test
    // above never looks at it. Without this, the default's wallpaper could
    // drift between the two files with nothing failing.
    const root = declarationsFrom(CSS.indexOf(':root {'));
    for (const [key, name] of Object.entries(ORNAMENT_VARS)) {
      expect(normalise(root[name] ?? ''), name).toBe(normalise(String(ornament[key as keyof typeof ornament])));
    }
  });

  for (const theme of THEMES) {
    it(`${theme.name}'s light and trim are written only in the room's own palette`, () => {
      // `light` and `trim` are free CSS, which is the one place a theme could
      // name `--ew-tier`, or a colour of its own, without the type system
      // noticing. Each offence is listed by name.
      for (const key of ['light', 'trim'] as const) {
        expect(offVocabulary(theme.ornament[key]), `--ew-${key} reaches outside the room's palette`).toEqual([]);
      }
    });

    it(`${theme.name}'s card trim colours itself from tokens or plain light and shade`, () => {
      // A trim sits on every card, so it is held tighter than the key light:
      // any rgb() in it must be black or white, never a tint.
      for (const fn of rgbCalls(theme.ornament.trim)) {
        const [r, g, b] = channels(fn);
        expect((r === 0 || r === 255) && g === r && b === r, `${fn} is a tint, not black or white`).toBe(true);
      }
    });

    it(`${theme.name}'s key light stays a breath, not a lamp`, () => {
      // 0.07 is the brightest light any theme shipped with before ornament
      // became a token (Wrong Colour's, from outside the frame). White on the
      // one light room is the exception: it RAISES that room's contrast.
      for (const fn of rgbCalls(theme.ornament.light)) {
        const [r, g, b, alpha] = channels(fn);
        const isWhite = r === 255 && g === 255 && b === 255;
        const voidc = theme.surface.void ?? surface.void;
        const lightRoom = contrastRatio(voidc, '#000000') > contrastRatio(voidc, '#ffffff');
        if (isWhite && lightRoom) continue;
        expect(alpha, fn).toBeLessThanOrEqual(0.07);
      }
    });

    it(`${theme.name}'s key light, where it is tinted, is tinted in the room's own hue`, () => {
      // The one colour ornament may bring rather than borrow: a key light's
      // faint tint. It joins the room's surfaces and the whole set is held to
      // constraint 2's spread, so a light can warm or cool a room within its
      // family but cannot light a violet room amber.
      const room = Object.values(theme.surface).map(hue).filter(notNull);
      const tints = rgbCalls(theme.ornament.light).map(hue).filter(notNull);
      expect(hueSpread([...room, ...tints]), `light tints ${tints.map(Math.round).join(', ')}°`).toBeLessThanOrEqual(
        HUE_FAMILY,
      );
    });
  }

  it('names only shapes that exist, and of the right kind', () => {
    // The compiler holds this for themes.ts (`ShapeRef<PatternId>`); the CSS
    // has no compiler, and a shape named there but never generated would
    // paint a transparent mask — no wallpaper, and nothing failing.
    const named = [...CSS.matchAll(/var\(--ew-shape-([a-z0-9-]+)\)/g)].map((m) => m[1]);
    expect(named.length).toBeGreaterThan(THEMES.length);
    for (const id of named) expect(SHAPE_IDS, id).toContain(id);
    for (const theme of THEMES) {
      // Every room has a wallpaper: `mask-image: none` means "no mask", which
      // would paint `--ew-line-strong` over the whole screen.
      const motif = theme.ornament.motif.match(/^var\(--ew-shape-([a-z0-9-]+)\)$/)?.[1] as ShapeId;
      const pip = theme.ornament.pip.match(/^var\(--ew-shape-([a-z0-9-]+)\)$/)?.[1] as ShapeId;
      expect(motif, `${theme.id}'s motif is not a shape`).toBeDefined();
      expect(shapeKind(motif)).toBe('pattern');
      expect(shapeKind(pip)).toBe('glyph');
    }
  });

  it('gives every room a glyph of its own', () => {
    const pips = THEMES.map((t) => t.ornament.pip);
    expect(new Set(pips).size).toBe(THEMES.length);
  });

  it('gives every room its own wallpaper, but for the one shared on purpose', () => {
    // New Management keeps the Tower's stonework — the joke is that almost
    // nothing structural changed. That is the only pair allowed to share.
    const byMotif = new Map<string, string[]>();
    for (const t of THEMES) byMotif.set(t.ornament.motif, [...(byMotif.get(t.ornament.motif) ?? []), t.id]);
    const shared = [...byMotif.values()].filter((ids) => ids.length > 1);
    expect(shared).toEqual([['default', 'betrayed_by_apprentice']]);
  });

  it('keeps theme selectors out of every stylesheet but tokens.css', () => {
    // Constraint 3, now that ornament is a token: the last per-theme rules
    // (the key lights in RunScreen.module.css) are gone, and a new one
    // appearing anywhere means a component has started to know about themes.
    const root = resolve(process.cwd(), 'src');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.css') && entry.name !== 'tokens.css') {
          const code = readFileSync(full, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
          if (/\[data-theme/.test(code)) offenders.push(full);
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});

/*
 * Card trims: marks and washes (CLAUDE.md styling rule 5).
 *
 * A trim layer is one of two kinds, and which kind is decided by how hard it
 * is drawn, not by what its author meant. The line is the ornament probe's own
 * `DRAWN` — the move in some channel at which `qa/probe-ornament-spacing.mjs`
 * starts counting a pixel as ornament — read off disk, so the probe and this
 * test cannot drift apart.
 *
 *   - A MARK moves some channel by `DRAWN` or more over the panel. The probe
 *     sees it, so it has to keep out of the content's way by geometry: an edge
 *     band in the outer 4px between the corner glyphs, or the corner square a
 *     glyph sits in.
 *   - A WASH moves none by that much. The probe does not see it and it may sit
 *     behind text, so it is held by strength instead: the ink still clears the
 *     panel floor over it.
 *
 * The geometry is written out literally below rather than imported from
 * `themes.ts`: the 12px is an 8px corner glyph (`craft.module.css`'s
 * `mask-size`) plus `--ew-space-1`, and the 4px is `--ew-space-1` alone. A
 * change to `themes.ts`' helpers that moved a mark has to get past these
 * numbers, not agree with itself (failure mode 11).
 */

/** The probe's `const DRAWN = <n>;`, read off disk. */
const PROBE = readFileSync(resolve(process.cwd(), 'qa/probe-ornament-spacing.mjs'), 'utf8');
const DRAWN = Number(PROBE.match(/^const DRAWN = (\d+);$/m)?.[1]);

/** How far in from a card's edge the corner glyph and its clearance reach. */
const CORNER_SQUARE = 8 + 4;
/** The outer band of a card an edge mark keeps to: `--ew-space-1`. */
const EDGE_BAND = 4;

/** A colour stop, resolved: an opaque hex at an alpha. */
type Stop = { colour: string; alpha: number };

/** Custom property name -> the theme's value for it, falling back to the default's. */
function paletteOf(theme: ThemeDef): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, name] of Object.entries(SURFACE_VARS)) {
    const k = key as keyof typeof surface;
    out.set(name, theme.surface[k] ?? surface[k]);
  }
  for (const [key, name] of Object.entries(INK_VARS)) {
    const k = key as keyof typeof ink;
    out.set(name, theme.ink?.[k] ?? ink[k]);
  }
  return out;
}

/**
 * One colour as a trim writes it: `transparent`, a `var()` of the room's
 * palette, `color-mix(in srgb, X N%, transparent)` (X at N% alpha — the only
 * mix a trim uses), or an `rgb()`/`rgba()` of plain numbers. Throws on
 * anything else: a colour this cannot read is a stop nothing is measuring.
 */
function resolveColour(css: string, theme: ThemeDef): Stop {
  const value = normalise(css);
  if (value === 'transparent') return { colour: '#000000', alpha: 0 };
  const ref = value.match(/^var\((--[\w-]+)\)$/);
  if (ref) {
    const colour = paletteOf(theme).get(ref[1]);
    if (!colour) throw new Error(`a trim names a colour outside the room's palette: ${css}`);
    return { colour, alpha: 1 };
  }
  const mix = value.match(/^color-mix\(in srgb, (.+) ([\d.]+)%, transparent\)$/);
  if (mix) {
    const inner = resolveColour(mix[1], theme);
    return { colour: inner.colour, alpha: inner.alpha * (parseFloat(mix[2]) / 100) };
  }
  if (/^rgba?\([\d.\s,/%]*\)$/.test(value)) {
    const [r, g, b, a] = channels(value);
    return { colour: toHex(r, g, b), alpha: a };
  }
  throw new Error(`the trim model cannot read this colour: ${css}`);
}

/** The text of a call starting at `from` (an identifier then `(`), parentheses balanced. */
function callAt(css: string, from: number): string {
  let depth = 0;
  for (let i = css.indexOf('(', from); i < css.length; i++) {
    if (css[i] === '(') depth++;
    if (css[i] === ')' && --depth === 0) return css.slice(from, i + 1);
  }
  throw new Error(`unbalanced parentheses in ${css}`);
}

/**
 * One trim layer split into its gradient and what follows it (position, size
 * and repeat), with the gradient's colour stops resolved. A layer that is not
 * a gradient throws — a trim may only be painted with one.
 */
function trimLayer(layer: string, theme: ThemeDef): { image: string; placement: string; stops: Stop[] } {
  const css = normalise(layer);
  if (!/^(repeating-)?(linear|radial|conic)-gradient\(/.test(css)) {
    throw new Error(`a trim layer must be a gradient: ${layer}`);
  }
  const image = callAt(css, 0);
  const placement = css.slice(image.length).trim();
  const args = layersOf(image.slice(image.indexOf('(') + 1, -1));
  const stops: Stop[] = [];
  for (const arg of args) {
    // A colour comes first in a stop; a gradient's direction or shape does
    // not start with one, and is the only other thing a gradient takes.
    const colour = arg.match(/^(?:transparent|(?:var|color-mix|rgba?)\()/)
      ? arg.startsWith('transparent')
        ? 'transparent'
        : callAt(arg, 0)
      : null;
    if (colour) stops.push(resolveColour(colour, theme));
  }
  return { image, placement, stops };
}

/** A theme's trim, top layer first. `none` is no layers. */
function trimLayers(theme: ThemeDef) {
  const trim = normalise(theme.ornament.trim);
  return trim === 'none' ? [] : layersOf(trim).map((layer) => trimLayer(layer, theme));
}

/** The furthest any channel of `panel` moves under `stop`, in 0–255 levels, as a browser rounds it. */
function moveOver(panel: string, stop: Stop): number {
  const lo = parseHex(panel);
  const hi = parseHex(over(panel, stop.colour, stop.alpha));
  return Math.max(...lo.map((c, i) => Math.abs(hi[i] - c)));
}

const isMark = (panel: string, stops: Stop[]) => stops.some((stop) => moveOver(panel, stop) >= DRAWN);

/**
 * Whether a mark's placement is one of the three it may take, and if not, why.
 *
 *   - horizontal edge band: `left 12px (top|bottom) Apx / calc(100% - 24px) Bpx no-repeat`, A + B ≤ 4
 *   - vertical edge band: `(left|right) Apx top 12px / Bpx calc(100% - 24px) no-repeat`, A + B ≤ 4
 *   - corner square: `(top|bottom) (left|right) / Kpx Kpx no-repeat`, K ≤ 12
 *
 * Zero may be written without a unit, as CSS allows; nothing else may.
 */
function markGeometry(placement: string): string | null {
  const len = '(0|\\d+px)';
  const px = (s: string) => parseFloat(s);
  const span = `calc\\(100% - ${CORNER_SQUARE * 2}px\\)`;
  const horizontal = placement.match(new RegExp(`^left ${CORNER_SQUARE}px (?:top|bottom) ${len} / ${span} ${len} no-repeat$`));
  const vertical = placement.match(new RegExp(`^(?:left|right) ${len} top ${CORNER_SQUARE}px / ${len} ${span} no-repeat$`));
  const band = horizontal ?? vertical;
  if (band) {
    const reach = px(band[1]) + px(band[2]);
    return reach <= EDGE_BAND ? null : `reaches ${reach}px in from the edge, past the outer ${EDGE_BAND}px`;
  }
  const corner = placement.match(/^(?:top|bottom) (?:left|right) \/ (\d+)px \1px no-repeat$/);
  if (corner) {
    return px(corner[1]) <= CORNER_SQUARE ? null : `a ${corner[1]}px corner, past the ${CORNER_SQUARE}px corner square`;
  }
  return `"${placement}" is neither an edge band between the corner glyphs nor a corner square`;
}

/**
 * The worst contrast `text` makes with the panel under a theme's washes.
 *
 * Washes can overlap, and text can sit where any one has faded out, so every
 * combination of one stop (or none) from each wash is composited bottom-up
 * over the panel, and the worst is kept.
 */
function worstUnderWashes(panel: string, washes: Stop[][], text: string): number {
  let backdrops = [panel];
  for (const stops of [...washes].reverse()) {
    backdrops = backdrops.flatMap((b) => [b, ...stops.map((s) => over(b, s.colour, s.alpha))]);
  }
  return Math.min(...backdrops.map((b) => contrastRatio(text, b)));
}

describe('themes · card trims are marks or washes', () => {
  /** The panel floor, as the ink contrast block computes it. */
  const FLOOR = contrastRatio(ink.base, surface.panel);
  const byId = (id: string) => THEMES.find((t) => t.id === id)!;

  it("reads the probe's own DRAWN, and it is a sane threshold", () => {
    // An 8-bit channel moves 0–255. Below a handful of levels the probe would
    // count antialiasing as ornament; past a quarter of the range a 1px rule
    // in a quiet room would slip through as a wash.
    expect(Number.isInteger(DRAWN), 'no `const DRAWN = <n>;` line in the probe').toBe(true);
    expect(DRAWN).toBeGreaterThanOrEqual(8);
    expect(DRAWN).toBeLessThanOrEqual(64);
  });

  it('splits a trim on its top-level commas only', () => {
    expect(layersOf('linear-gradient(a, b) top / 1px 2px, radial-gradient(c, rgba(0, 0, 0, 0.5)) left')).toEqual([
      'linear-gradient(a, b) top / 1px 2px',
      'radial-gradient(c, rgba(0, 0, 0, 0.5)) left',
    ]);
    expect(layersOf('none')).toEqual(['none']);
  });

  it('resolves every colour spelling a trim uses, from the theme or the default', () => {
    const sword = byId('slain_by_chosen_one');
    expect(resolveColour('transparent', sword).alpha).toBe(0);
    expect(resolveColour('var(--ew-line-strong)', sword)).toEqual({ colour: '#af3d36', alpha: 1 });
    const mix = resolveColour('color-mix(in srgb, var(--ew-ink-bright) 55%, transparent)', sword);
    expect(mix.colour).toBe('#fdf7f6');
    expect(mix.alpha).toBeCloseTo(0.55, 10);
    expect(resolveColour('rgba(255, 255, 255, 0.35)', sword)).toEqual({ colour: '#ffffff', alpha: 0.35 });
    // A theme that leaves a token unset reads the default's.
    const bare = { ...sword, surface: {}, ink: undefined };
    expect(resolveColour('var(--ew-panel)', bare).colour).toBe(surface.panel);
    expect(resolveColour('var(--ew-ink)', bare).colour).toBe(ink.base);
    expect(() => resolveColour('red', sword)).toThrow();
    expect(() => resolveColour('var(--ew-tier)', sword)).toThrow();
  });

  it('reads every stop of a layer, and its placement apart from them', () => {
    const [layer] = trimLayers(byId('exiled_and_overrun'));
    expect(layer.stops.map((s) => s.alpha)).toEqual([1, 0, 1]);
    expect(layer.placement).toBe('left 12px top 0px / calc(100% - 24px) 1px no-repeat');
  });

  it('accepts exactly the three mark geometries', () => {
    expect(markGeometry('left 12px top 0 / calc(100% - 24px) 4px no-repeat')).toBeNull();
    expect(markGeometry('left 12px bottom 3px / calc(100% - 24px) 1px no-repeat')).toBeNull();
    expect(markGeometry('right 3px top 12px / 1px calc(100% - 24px) no-repeat')).toBeNull();
    expect(markGeometry('bottom right / 12px 12px no-repeat')).toBeNull();
    expect(markGeometry('left 12px top 3px / calc(100% - 24px) 2px no-repeat')).not.toBeNull();
    expect(markGeometry('left 6px top 16px / 1px calc(100% - 32px) no-repeat')).not.toBeNull();
    expect(markGeometry('top left / 18px 18px no-repeat')).not.toBeNull();
    expect(markGeometry('top / 100% 1px no-repeat')).not.toBeNull();
    expect(markGeometry('')).not.toBeNull();
  });

  it('finds marks where rules are drawn, and washes where tints are', () => {
    // Guards the classifier: one that called everything a wash would wave
    // every misplaced rule through, and one that called everything a mark
    // would fail every soft tint for its geometry.
    const ruled = byId('contract_writer');
    const ruledPanel = ruled.surface.panel ?? surface.panel;
    expect(trimLayers(ruled).filter((l) => isMark(ruledPanel, l.stops)).length).toBeGreaterThanOrEqual(1);
    const cold = byId('lichdom');
    const coldPanel = cold.surface.panel ?? surface.panel;
    expect(trimLayers(cold).filter((l) => !isMark(coldPanel, l.stops)).length).toBeGreaterThanOrEqual(1);
  });

  for (const theme of THEMES) {
    const panel = theme.surface.panel ?? surface.panel;

    it(`${theme.name}'s trim marks keep to the card's edge band and corners`, () => {
      const misplaced = trimLayers(theme)
        .filter((l) => isMark(panel, l.stops))
        .map((l) => [l.image, markGeometry(l.placement)])
        .filter(([, why]) => why !== null);
      expect(misplaced, `${theme.id}: marks outside the edge band and corner squares`).toEqual([]);
    });

    it(`${theme.name}'s trim washes leave the ink above the panel floor`, () => {
      const washes = trimLayers(theme)
        .filter((l) => !isMark(panel, l.stops))
        .map((l) => l.stops);
      for (const text of [theme.ink?.base ?? ink.base, theme.ink?.bright ?? ink.bright]) {
        expect(worstUnderWashes(panel, washes, text), `${theme.id}: ${text} under its washes`).toBeGreaterThanOrEqual(
          FLOOR,
        );
      }
    });
  }
});

describe('themes · constraint 8, no two rooms look alike', () => {
  /**
   * How different two rooms look, as one number.
   *
   * The mean OKLab distance across the four colours that cover the most
   * screen, weighted by how much of it they cover: the void and the panel are
   * most of every screen, the raised step and the strong rule are the edges.
   */
  const WEIGHTS = { void: 0.35, panel: 0.35, raised: 0.15, lineStrong: 0.15 } as const;
  const distance = (a: (typeof THEMES)[number], b: (typeof THEMES)[number]) =>
    (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).reduce(
      (sum, k) => sum + WEIGHTS[k] * deltaEOK(a.surface[k] ?? surface[k], b.surface[k] ?? surface[k]),
      0,
    );

  /**
   * One and a half just-noticeable differences.
   *
   * Provenance: CSS Color 4 fixes the OKLab JND at 0.02. A player reported
   * the themes as hard to tell apart, and by this measure thirteen pairs sat
   * under 0.030 before the palettes were regenerated — Good Ground and The
   * Eldest Oak closest, at 0.015, under a single JND. The floor is set just
   * above the pairs that were reported, not at a number that looked round;
   * the regenerated set clears it with its closest pair at 0.035.
   */
  const FLOOR = 1.5 * JND_OK;

  it('is measuring something: the default and the one light room are far apart', () => {
    // Guards the guard. A distance function that returned 0 would fail every
    // pair; one that returned a constant above the floor would pass them all.
    const def = THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
    const light = THEMES.find((t) => t.id === 'good_wizard')!;
    expect(distance(def, light)).toBeGreaterThan(0.5);
    expect(distance(def, def)).toBe(0);
  });

  for (let i = 0; i < THEMES.length; i++) {
    for (let j = i + 1; j < THEMES.length; j++) {
      const a = THEMES[i];
      const b = THEMES[j];
      it(`${a.name} and ${b.name} are told apart at a glance`, () => {
        expect(distance(a, b)).toBeGreaterThanOrEqual(FLOOR);
      });
    }
  }
});

describe('unlocks · derived from endingsSeen, never stored', () => {
  it('gives a brand-new player exactly the default', () => {
    expect(unlockedThemeIds([])).toEqual([DEFAULT_THEME_ID]);
  });

  it('unlocks a theme the moment its ending is seen, and no others', () => {
    expect(unlockedThemeIds(['lichdom'])).toEqual([DEFAULT_THEME_ID, 'lichdom']);
    expect(isThemeUnlocked('lichdom', ['lichdom'])).toBe(true);
    expect(isThemeUnlocked('ascension', ['lichdom'])).toBe(false);
  });

  it('never locks the default, whatever the collection says', () => {
    expect(isThemeUnlocked(DEFAULT_THEME_ID, [])).toBe(true);
    expect(isThemeUnlocked(DEFAULT_THEME_ID, ENDING_IDS)).toBe(true);
  });

  it('unlocks everything for a completed collection', () => {
    expect(unlockedThemeIds(ENDING_IDS).sort()).toEqual(THEMES.map((t) => t.id).sort());
  });
});

describe('themeFor / isThemeId · unrecognised ids fall back', () => {
  it('resolves a known id to its theme', () => {
    expect(themeFor('lichdom').name).toBe('Cold Room');
  });

  it('falls back to the default rather than returning undefined', () => {
    // The screens spread `themeFor(...)` straight onto a style object. A
    // fallback of `undefined` here would render an unthemed page, which is the
    // failure the migration arm exists to prevent.
    for (const junk of ['', 'nope', 'DEFAULT', null, undefined]) {
      expect(themeFor(junk).id).toBe(DEFAULT_THEME_ID);
    }
  });

  it('recognises exactly the defined ids', () => {
    for (const theme of THEMES) expect(isThemeId(theme.id)).toBe(true);
    for (const junk of ['nope', '', 42, null, undefined, {}]) {
      expect(isThemeId(junk)).toBe(false);
    }
  });
});
