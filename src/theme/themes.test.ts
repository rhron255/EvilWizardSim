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
import { contrastRatio, contrastRatioRgb, luminanceOfRgb, parseHex, type Rgb } from './contrast';
import { deltaEOK, JND_OK, over, overRgb } from './oklab';
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
import { ink, ornament, space, surface, tierColor } from './tokens';

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
 * included, collapsed to one space.
 *
 * `tokens.css` is hand-written — that is what makes it an anchor — so a long
 * value there may be wrapped across lines. Both sides go through this, so only
 * spacing is forgiven: a space that appears or vanishes between two tokens, or
 * any other character changed, still fails. Case is NOT folded: a custom
 * property's name is case-sensitive, so `var(--EW-LINE-STRONG)` names no token
 * the browser has, and a trim or wallpaper written that way would vanish.
 */
function normalise(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * `normalise`, with hex literals' case folded too. Only for `:root` against
 * `tokens.ts`, whose hexes are uppercase where the stylesheet's are lowercase;
 * a theme block is compared with `normalise` alone (tokens.css rule 3).
 */
const normaliseHex = (value: string) => normalise(value).replace(/#[\da-f]+\b/gi, (hex) => hex.toLowerCase());

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
 *
 * "Family" is that and no more: one quadrant of the hue circle. It is wider
 * than near-monochrome, which is what the palettes themselves do (most sit
 * within a few degrees); the bound is there to catch a second hue, not to
 * define the first. The key-light test reuses it for the same reason, and so
 * lets through what a quadrant does: a cyan candle in Kept Vigil's violet
 * room passes, an amber one does not.
 *
 * Below `hue`'s saturation floor — channels spread by under about 10 levels
 * (0.04 of the range) — a colour has no hue and is not counted. A tint that
 * grey, at the key light's 0.07 alpha or less, moves the room's channels
 * apart by under one level: below a visible step, so not a hue to police.
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
 *
 * It is a model, and `qa/probe-room-contrast.mjs` is what it answers to: the
 * same stacks painted by Chromium and scored pixel by pixel.
 */

/** A rule of a stylesheet: its selector, its body, and the at-rule it sits in, if any. */
type CssRule = { selector: string; body: string; atRule: string | null };

/**
 * Every rule in a stylesheet, comments stripped — the rules inside an
 * `@media` (or any other block at-rule) included, tagged with it, so an
 * override hiding in a breakpoint is counted like any other.
 */
function rulesOf(css: string): CssRule[] {
  const out: CssRule[] = [];
  const walk = (text: string, atRule: string | null) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open === -1) break;
      const selector = text.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      for (; j < text.length && depth > 0; j++) {
        if (text[j] === '{') depth++;
        if (text[j] === '}') depth--;
      }
      const body = text.slice(open + 1, j - 1);
      if (selector.startsWith('@')) walk(body, selector);
      else out.push({ selector, body, atRule });
      i = j;
    }
  };
  walk(css.replace(/\/\*[\s\S]*?\*\//g, ''), null);
  return out;
}

/** A stylesheet's rules, read off disk. */
const rulesIn = (path: string) => rulesOf(readFileSync(resolve(process.cwd(), path), 'utf8'));

/** One declaration's value in a rule body, normalised, or null if the body does not set it. */
function declared(body: string, prop: string): string | null {
  const m = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]*)(?:;|$)`));
  return m ? normalise(m[1]) : null;
}

/** Whether any selector in a list paints the `.screen` element itself, rather than a pseudo-element of it. */
function targetsScreen(selectorList: string): boolean {
  return selectorList.split(',').some((selector) => {
    const last = selector.trim().split(/[\s>+~]+/).pop() ?? '';
    return /(?:^|[^\w-])\.screen(?![\w-])/.test(last) && !/::|:(?:before|after)\b/.test(last);
  });
}

/**
 * Every rule in a stylesheet that sets `.screen`'s background, in any
 * spelling and under any at-rule. The model reads the first; the stack-shape
 * test requires there to be exactly one, so a breakpoint cannot repaint the
 * room behind the model's back.
 */
const screenBackgroundRules = (path: string) =>
  rulesIn(path).filter((r) => targetsScreen(r.selector) && /(?:^|;)\s*background(?:-color|-image)?\s*:/.test(r.body));

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
  const rule = screenBackgroundRules(path).find((r) => declared(r.body, 'background') !== null);
  return layersOf(rule ? declared(rule.body, 'background')! : '');
}

/**
 * The wallpaper rule both screens wear — craft's `.screen::before,
 * .wallpaper::before` — read off disk. The model lays `--ew-line-strong` over
 * the room at `motifOpacity`; this is the rule that says the browser does too.
 */
const WALLPAPER_RULES = rulesIn('src/components/meta/craft.module.css').filter((r) =>
  r.selector.split(',').some((s) => ['.screen::before', '.wallpaper::before'].includes(s.trim())),
);

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

/** How many 8-bit levels a room's every channel is moved, by direction. */
type Slack = { lighter: number; darker: number };

/**
 * How far the browser's painted room may stray from the exact composite, in
 * 8-bit levels per channel: `lighter` is toward the ink in a dark room,
 * `darker` toward it in a light one.
 *
 * Chromium does not paint the exact composite. Every gradient is dithered and
 * every layer lands on an 8-bit level, so a flat stretch of room comes out as
 * a speckle of neighbouring levels. `qa/probe-room-contrast.mjs --spread`
 * measures it: every theme but the Sword (whose glint it does not model),
 * every tier, both stacks, 393×852 and 320×568, DPR 1 and 3, in Chromium
 * 1194's headless shell. Over 147,744 channel samples the painted level sat
 * between 3.45 below and 1.56 above the exact one; a first, sparser pass over
 * the rooms before they were retuned to this margin saw up to 1.71 above.
 * Near the void one level is worth 0.1–0.15 of contrast — more than the whole
 * margin six themes passed by when this model rounded each layer like `over`
 * and allowed nothing, and Chromium then put three of them under the Tower
 * (Kept Vigil 12.145, The Crown 12.223, The Final Number 12.234, against its
 * 12.347).
 *
 * So each theme's room is scored with every channel pushed toward its ink
 * past the furthest the browser was seen to stray that way, and the Tower's
 * room, which sets the floor, at its exact value. A room's worst pixel is its
 * own most ink-ward speckle, so the Tower's painted worst sits at or under its
 * exact value (12.316 in Chromium, its mask included, against 12.347 exact),
 * and a theme can pass the model only with its own worst speckle still clear
 * of that.
 */
const PAINT_SLACK: Slack = { lighter: 2, darker: 4 };

/** No slack: the exact composite, which is how the Tower's floor is scored. */
const EXACT: Slack = { lighter: 0, darker: 0 };

/**
 * `backdrop` moved toward `text` in every channel — `slack.lighter` levels
 * lighter behind pale ink, `slack.darker` darker behind dark — which can only
 * lower the contrast between them, and kept inside 0–255.
 */
function towardInk(backdrop: Rgb, text: Rgb, slack: Slack): Rgb {
  const move = luminanceOfRgb(text) > luminanceOfRgb(backdrop) ? slack.lighter : -slack.darker;
  const at = (i: 0 | 1 | 2) => Math.min(255, Math.max(0, backdrop[i] + move));
  return [at(0), at(1), at(2)];
}

/**
 * The ink's worst contrast anywhere on a theme's bare room, with the room's
 * every channel moved toward the ink by `slack` (`PAINT_SLACK` for a theme,
 * `EXACT` for the Tower's floor).
 *
 * The layers are stacked bottom-up on the void, in exact arithmetic — the
 * tier vignette in every tier colour (set-piece screens only), the key light,
 * then the wallpaper, `--ew-line-strong` at `motifOpacity` — each at its peak,
 * as though every peak fell on the same pixel. Text can also sit where any
 * layer has faded to nothing, so every subset of the layers is measured and
 * the worst is kept. Each layer moves the backdrop monotonically as it
 * strengthens, so the extremes are at the subsets. In a dark room the worst
 * is every layer at once; in a light one the worst is whichever subset leaves
 * the backdrop darkest, which is why a white light on cream never counts
 * against it — the unlit room under the wallpaper does.
 *
 * The black vignette at the foot of the set-piece screens is not modelled:
 * that is the settled bare-room model, and the stack-shape test pins the
 * layer's existence so the omission stays deliberate. Behind pale ink on a
 * dark room it only darkens the backdrop, which raises the contrast, so
 * leaving it out is the harder case there. Ordinary Weather is the exception
 * — dark ink on a light void, where that vignette is the darkest layer in the
 * room and goes unmeasured here. Chromium puts its foot at 4.6:1
 * (`qa/probe-room-contrast.mjs`, the `painted` column), against 13.7 for the
 * rest of that room: a known issue that predates the themes' ornament.
 */
function roomContrast(theme: ThemeDef, setPiece: boolean, slack: Slack): number {
  const voidc = parseHex(theme.surface.void ?? surface.void);
  const base = parseHex(theme.ink?.base ?? ink.base);
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
      const backdrop = layers.reduce<Rgb>(
        (colour, layer, i) => (subset & (1 << i) ? overRgb(colour, parseHex(layer.colour), layer.alpha) : colour),
        voidc,
      );
      worst = Math.min(worst, contrastRatioRgb(base, towardInk(backdrop, base, slack)));
    }
  }
  return worst;
}

/** Worst over both stacks: the run screen and the set pieces. */
const roomFloorOf = (theme: ThemeDef, slack: Slack = PAINT_SLACK) =>
  Math.min(roomContrast(theme, false, slack), roomContrast(theme, true, slack));

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

  const TOWER = THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;

  /**
   * The worst the DEFAULT room does for text with no panel behind it, computed
   * from `tokens.ts`, never quoted, and at its exact value (`PAINT_SLACK`,
   * `EXACT`).
   *
   * Lower than the panel floor, and that is the default's own doing: its key
   * light and the tier vignette both lift the void behind pale ink. So the
   * promise for the bare room is "no theme makes text on it harder to read
   * than the Tower does", and the Tower is measured to find out what that is.
   */
  const ROOM_FLOOR = roomFloorOf(TOWER, EXACT);

  /** A copy of a theme with some of its surface, ink and ornament replaced. */
  const variant = (
    theme: ThemeDef,
    change: { surface?: ThemeDef['surface']; ink?: ThemeDef['ink']; ornament?: Partial<ThemeDef['ornament']> },
  ): ThemeDef => ({
    ...theme,
    surface: { ...theme.surface, ...change.surface },
    ink: { ...theme.ink, ...change.ink },
    ornament: { ...theme.ornament, ...change.ornament },
  });

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
    // The layer the model leaves out (the settled bare-room model) must stay
    // black. In a dark room that only darkens the backdrop behind pale ink;
    // in the one light room it is the unmeasured darkest layer — see
    // `roomContrast`.
    const vignette = rgbCalls(SET_PIECE_STACK[2]);
    expect(vignette).toHaveLength(1);
    expect(channels(vignette[0]).slice(0, 3)).toEqual([0, 0, 0]);
  });

  it('reads the one rule that paints each screen, with no breakpoint repainting it', () => {
    // The model reads the first `.screen` background it finds. A second one —
    // most easily an `@media` override — would be a room the browser paints
    // and the model never sees.
    for (const path of ['src/screens/RunScreen.module.css', 'src/components/meta/craft.module.css']) {
      const rules = screenBackgroundRules(path);
      expect(
        rules.map((r) => `${r.atRule ?? ''} ${r.selector}`.trim()),
        `${path}: rules setting .screen's background`,
      ).toEqual(['.screen']);
    }
  });

  it('counts a rule hidden in a breakpoint, and only rules that paint the screen itself', () => {
    // Guards the guard above: a rule walker that skipped at-rules would
    // count one rule where the browser applies two.
    const css = `.screen { background: red; } .screen::before { background: blue; }
      @media (max-width: 420px) { .wallpaper, .screen { background-color: green; } }`;
    const found = rulesOf(css).filter((r) => targetsScreen(r.selector) && /background/.test(r.body));
    expect(found.map((r) => r.atRule)).toEqual([null, '@media (max-width: 420px)']);
  });

  it('lays the wallpaper over the room as the model does: the strong line, at motifOpacity', () => {
    // The model draws `--ew-line-strong` at exactly `motifOpacity`. If the
    // rule that paints it scaled the opacity, or painted another colour, the
    // model would be measuring a wallpaper nobody sees.
    const painting = WALLPAPER_RULES.filter(
      (r) => declared(r.body, 'opacity') !== null || declared(r.body, 'background') !== null,
    );
    expect(painting.map((r) => [r.atRule, normalise(r.selector)])).toEqual([
      [null, '.screen::before, .wallpaper::before'],
    ]);
    expect(declared(painting[0].body, 'opacity')).toBe('var(--ew-motif-opacity, 0)');
    expect(declared(painting[0].body, 'background')).toBe('var(--ew-line-strong)');
    expect(declared(painting[0].body, 'mask-image')).toMatch(/^var\(--ew-motif,/);
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

  it('scores a dark room at its wallpaper, pushed toward the ink, by hand', () => {
    // Black void, white ink, white wallpaper at 0.2 and no light: the worst
    // backdrop is 0.2 × 255 = 51 in every channel, and PAINT_SLACK.lighter levels
    // lighter than that is what the browser may paint. Worked in numbers, not
    // hex: the slack need not be a whole level.
    const room = variant(TOWER, {
      surface: { void: '#000000', lineStrong: '#ffffff' },
      ink: { base: '#ffffff' },
      ornament: { light: 'none', motifOpacity: 0.2 },
    });
    const white: Rgb = [255, 255, 255];
    const level = 51 + PAINT_SLACK.lighter;
    expect(roomContrast(room, false, PAINT_SLACK)).toBeCloseTo(contrastRatioRgb(white, [level, level, level]), 10);
    expect(roomContrast(room, false, EXACT)).toBeCloseTo(contrastRatioRgb(white, [51, 51, 51]), 10);
  });

  it('scores a room where every layer helps the ink at its bare void', () => {
    // A #333333 void, white ink, a black wallpaper at 0.5 and no light. The
    // wallpaper only darkens the backdrop (51 -> 25.5), so the worst place for
    // the ink is where it has faded out: the void alone, the subset with no
    // layer in it.
    const room = variant(TOWER, {
      surface: { void: '#333333', lineStrong: '#000000' },
      ink: { base: '#ffffff' },
      ornament: { light: 'none', motifOpacity: 0.5 },
    });
    const level = 51 + PAINT_SLACK.lighter;
    expect(roomContrast(room, false, PAINT_SLACK)).toBeCloseTo(contrastRatioRgb([255, 255, 255], [level, level, level]), 10);
  });

  it('tries the tier vignette in every tier colour, not only the first', () => {
    // A black void, white ink, no light and no wallpaper: on a set piece the
    // backdrop is the tier vignette alone, each tier colour at the vignette's
    // peak alpha over black. Behind white ink the worst is the brightest of
    // them — Legend's gold, the last in the table, not the first.
    const room = variant(TOWER, {
      surface: { void: '#000000' },
      ink: { base: '#ffffff' },
      ornament: { light: 'none', motifOpacity: 0 },
    });
    const peak = tierVignettePeak();
    const scores = Object.values(tierColor).map((hex) => {
      const lit = parseHex(hex).map((c) => c * peak + PAINT_SLACK.lighter) as unknown as Rgb;
      return contrastRatioRgb([255, 255, 255], lit);
    });
    const worst = Math.min(...scores);
    expect(scores.indexOf(worst), 'the worst tier must not be the first, or this pins nothing').toBeGreaterThan(0);
    expect(roomContrast(room, true, PAINT_SLACK)).toBeCloseTo(worst, 10);
  });

  it('finds a light room at its unlit wallpaper, not its sunlit one', () => {
    // A #f0f0f0 void, black ink, a black wallpaper at 0.1 and a white light
    // at 0.5 centred on screen. The subsets, by hand: bare 240, lit 247.5,
    // wallpaper 216, both 222.75. Behind black ink the darkest is worst, and
    // that is the wallpaper with the light faded out — exactly the room with
    // no light at all.
    const unlit = variant(TOWER, {
      surface: { void: '#f0f0f0', lineStrong: '#000000' },
      ink: { base: '#000000' },
      ornament: { light: 'none', motifOpacity: 0.1 },
    });
    const lit = variant(unlit, {
      ornament: { light: 'radial-gradient(80% 80% at 50% 50%, rgba(255, 255, 255, 0.5), transparent 70%)' },
    });
    const level = 216 - PAINT_SLACK.darker;
    const expected = contrastRatioRgb([0, 0, 0], [level, level, level]);
    expect(roomContrast(lit, false, PAINT_SLACK)).toBeCloseTo(expected, 10);
    expect(roomContrast(lit, false, PAINT_SLACK)).toBe(roomContrast(unlit, false, PAINT_SLACK));
  });

  it('counts every layer it claims to: the wallpaper, the light and the tier vignette', () => {
    // Anchored to numbers the model does not produce. A wallpaper drawn
    // solid hides the whole room behind the strong line, so nothing can read
    // better on it than the ink does on that colour; under a white lamp at
    // full strength the ink reads no better than it does on white; and the
    // set pieces, which add the tier vignette, read worse than the run
    // screen.
    const solid = variant(TOWER, { ornament: { motifOpacity: 1 } });
    expect(roomFloorOf(solid)).toBeLessThanOrEqual(contrastRatio(ink.base, surface.lineStrong));
    expect(roomFloorOf(solid)).toBeLessThan(ROOM_FLOOR);
    const lamp = variant(TOWER, {
      ornament: { light: 'radial-gradient(90% 55% at 50% 50%, rgba(255, 255, 255, 1), transparent 68%)' },
    });
    expect(roomFloorOf(lamp)).toBeLessThanOrEqual(contrastRatio(ink.base, '#ffffff'));
    expect(roomFloorOf(lamp)).toBeLessThan(ROOM_FLOOR);
    expect(roomContrast(TOWER, true, EXACT)).toBeLessThan(roomContrast(TOWER, false, EXACT));
  });

  it('holds a theme to the Tower with a margin the browser cannot eat', () => {
    // The slack must clear the spread `--spread` measured in each direction
    // (1.71 lighter at most, 3.45 darker; see PAINT_SLACK), and it must cost
    // the Tower itself something against its own floor: the Tower scored like
    // a theme would not pass. A slack of zero would.
    expect(PAINT_SLACK.lighter).toBeGreaterThan(1.71);
    expect(PAINT_SLACK.darker).toBeGreaterThan(3.45);
    expect(roomFloorOf(TOWER)).toBeLessThan(ROOM_FLOOR);
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

    // The Tower is the floor, not a room held to it.
    if (theme.id === DEFAULT_THEME_ID) continue;
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
    it(`${theme.name}'s surfaces and ink sit in one hue family`, () => {
      // The ink counts as much as the surfaces: a card trim may be drawn in
      // any ink token, so an ink from outside the room's quadrant would be a
      // hue that ornament brings in. Unset tokens are the default's, as the
      // browser paints them.
      const hues = [...paletteOf(theme).values()].map(hue).filter(notNull);
      expect(hueSpread(hues)).toBeLessThanOrEqual(HUE_FAMILY);
    });
  }
});

describe('themes · the colour readers, against known answers', () => {
  // Each of these readers decides what a test above sees. A reader that
  // returned nothing, or a constant, would turn those tests green for free,
  // so each is pinned to answers worked out by hand.

  it('rejects every way a hue could get into a light or a trim', () => {
    const bad = [
      'red',
      'RED',
      'rebeccapurple',
      'currentColor',
      '#f00',
      'hsl(0 100% 50%)',
      'hwb(0 0% 0%)',
      'lab(50% 80 60)',
      'lch(50% 80 30)',
      'oklab(0.6 0.2 0.1)',
      'oklch(0.6 0.2 30)',
      'color(srgb 1 0 0)',
      'color-mix(in hsl, var(--ew-ink) 50%, transparent)',
      'color-mix(in srgb, var(--ew-ink) 50%, red)',
      'var(--ew-tier)',
      'var(--ew-panel, red)',
      'url(x)',
      'image-set("x.png" 1x)',
      'rgb(from red r g b)',
      'light-dark(white, black)',
    ];
    for (const colour of bad) {
      expect(offVocabulary(colour), colour).not.toEqual([]);
      // And where it would actually sit: a stop inside a gradient.
      expect(offVocabulary(`linear-gradient(180deg, ${colour}, transparent 10px)`), colour).not.toEqual([]);
    }
  });

  it('accepts the vocabulary itself', () => {
    for (const good of [
      'none',
      'linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 14px)',
      'radial-gradient(90% 55% at 50% -10%, rgba(255, 246, 224, 0.045), transparent 68%)',
      'linear-gradient(90deg, transparent, color-mix(in srgb, var(--ew-ink-bright) 55%, transparent) 50%, transparent) left 12px top 0px / calc(100% - 24px) 1px no-repeat',
      'repeating-linear-gradient(90deg, var(--ew-void) 0 2px, transparent 2px 6px) left 12px top 1px / calc(100% - 24px) 2px no-repeat',
    ]) {
      expect(offVocabulary(good), good).toEqual([]);
    }
  });

  it('reads rgb() channels in every spelling, alpha defaulting to opaque', () => {
    expect(channels('rgb(216 198 255)')).toEqual([216, 198, 255, 1]);
    expect(channels('rgb(216 198 255)')[3]).toBe(1);
    expect(channels('rgb(216 198 255 / 50%)')).toEqual([216, 198, 255, 0.5]);
    expect(channels('rgba(100%, 0%, 0%, .07)')).toEqual([255, 0, 0, 0.07]);
    expect(channels('rgba(255, 246, 224, 0.045)')).toEqual([255, 246, 224, 0.045]);
  });

  it('reads hue at the primaries, and none for a grey', () => {
    expect(hue('#ff0000')).toBe(0);
    expect(hue('rgb(0 0 255)')).toBe(240);
    expect(hue('#00ff00')).toBe(120);
    expect(hue('#808080')).toBeNull();
    // Just under the saturation floor: 10 levels apart, no hue.
    expect(hue('#80808a')).toBeNull();
    expect(hueSpread([350, 10])).toBe(20);
  });

  it('is measuring something: rooms have hues, and they spread', () => {
    // Every room but the one deliberately neutral one has hued surfaces, and
    // between them the rooms span the wheel.
    const spreads = THEMES.map((t) => Object.values(t.surface).map(hue).filter(notNull)).filter((h) => h.length > 0);
    expect(spreads.length).toBeGreaterThanOrEqual(THEMES.length - 1);
    expect(Math.max(...spreads.map(hueSpread))).toBeGreaterThan(0);
    expect(hueSpread(spreads.map((h) => h[0]))).toBeGreaterThan(90);
  });
});

describe('themes · constraint 7, ornament brings no colour', () => {
  it(':root agrees with tokens.ts — palette and ornament — as every theme block agrees with its theme', () => {
    // The default has no block of its own (it IS :root), so the sync test
    // above never looks at it. Without this, the default's wallpaper could
    // drift between the two files with nothing failing — and so could its
    // palette, which matters more: every floor in this file is computed from
    // tokens.ts, while the browser paints :root.
    const root = declarationsFrom(CSS.indexOf(':root {'));
    const expected: [string, string][] = [
      ...Object.entries(SURFACE_VARS).map(([k, name]): [string, string] => [name, surface[k as keyof typeof surface]]),
      ...Object.entries(INK_VARS).map(([k, name]): [string, string] => [name, ink[k as keyof typeof ink]]),
      ...Object.entries(ORNAMENT_VARS).map(([k, name]): [string, string] => [
        name,
        String(ornament[k as keyof typeof ornament]),
      ]),
    ];
    expect(expected).toHaveLength(6 + 5 + 6);
    for (const [name, value] of expected) {
      expect(normaliseHex(root[name] ?? ''), name).toBe(normaliseHex(value));
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
      // constraint 2's spread — one quadrant, not near-monochrome (see
      // HUE_FAMILY). So a light cannot bring a hue from across the wheel: an
      // amber lamp in a violet room fails. A neighbouring hue in the same
      // quadrant, a cyan one there, passes; the 0.07 alpha cap above is what
      // keeps such a tint faint.
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
    // Matched in any case, then held to the exact name: a custom property is
    // case-sensitive, so `var(--ew-shape-Swords)` or `var(--EW-SHAPE-swords)`
    // names nothing the browser has and must not slip past as a non-match.
    const named = [...CSS.matchAll(/var\((--ew-shape-[\w-]+)\)/gi)].map((m) => m[1]);
    expect(named.length).toBeGreaterThan(THEMES.length);
    for (const name of named) expect(SHAPE_IDS.map((id) => `--ew-shape-${id}`), name).toContain(name);
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
 * starts counting a pixel as ornament. The probe and this test share exactly
 * two things, both read off disk: that number, and the surfaces a trim is laid
 * over (`TRIM_SURFACES`, read from the stylesheets that lay it — the probe
 * photographs a card at rest, over the raised-to-panel gradient, which is two
 * of them). They do not share a classifier: the probe diffs rendered pixels
 * and this test does arithmetic on the stops, so a trim the browser draws
 * harder than its stops say is the probe's to catch.
 *
 *   - A MARK moves some channel by `DRAWN` or more over SOME surface it is
 *     laid on. The probe can see it, so it has to keep out of the content's
 *     way by geometry: an edge band in the outer 4px between the corner
 *     glyphs, or a corner form that keeps 4px from where content starts.
 *   - A WASH moves none by that much over ANY of them, alone or stacked with
 *     the room's other washes (`sortTrim`). It may sit behind text, so it is
 *     held by strength instead: it never moves a card toward its ink, and
 *     over each surface the ink reads at least as well as the default ink
 *     does on the default's version of that surface — the bare-room promise
 *     (D1) applied to a card. On the panel that is the 13.80 panel floor.
 *
 * Geometry is measured inside the card's border — from the padding box, where
 * a background layer is positioned and where the corner glyphs sit. The
 * numbers are read off disk or written out literally rather than imported
 * from `themes.ts`: the 12px is an 8px corner glyph (`craft.module.css`'s
 * `mask-size`) plus `--ew-space-1`, the 4px is `--ew-space-1` alone, and the
 * corner allowance comes from OptionCard's phone padding. A change to
 * `themes.ts`' helpers that moved a mark has to get past these numbers, not
 * agree with itself (failure mode 11).
 */

/** The probe's `const DRAWN = <n>;`, read off disk. */
const PROBE = readFileSync(resolve(process.cwd(), 'qa/probe-ornament-spacing.mjs'), 'utf8');
const DRAWN = Number(PROBE.match(/^const DRAWN = (\d+);$/m)?.[1]);

/** A `--ew-space-N` step in CSS px, from `tokens.ts` (rem at the 16px root). */
const spacePx = (step: string) => parseFloat(space[step as keyof typeof space]) * 16;

/** How far in from a card's edge the corner glyph and its clearance reach. */
const CORNER_SQUARE = 8 + 4;
/** The outer band of a card an edge mark keeps to: `--ew-space-1`. */
const EDGE_BAND = spacePx('1');

/**
 * OptionCard's padding at phone width — the tightest card a trim is laid on —
 * as `[vertical, horizontal]` px, read from its stylesheet's `max-width: 420px`
 * rule (`padding: var(--ew-space-2) var(--ew-space-3)`, 8px × 12px).
 */
const PHONE_PADDING = (() => {
  const rule = rulesIn('src/components/run/OptionCard.module.css').find(
    (r) => r.atRule === '@media (max-width: 420px)' && r.selector === '.card' && declared(r.body, 'padding') !== null,
  );
  const steps = [...(declared(rule?.body ?? '', 'padding') ?? '').matchAll(/var\(--ew-space-(\d)\)/g)].map((m) => m[1]);
  if (steps.length !== 2) throw new Error("cannot read OptionCard's phone padding as two --ew-space steps");
  return steps.map(spacePx) as [number, number];
})();

/**
 * How far a corner mark may draw from its corner and still keep `EDGE_BAND`
 * from where content starts: every drawn point must lie within `x` of the side
 * or within `y` of the top or bottom edge (8px and 4px).
 */
const CORNER_REACH = { x: PHONE_PADDING[1] - EDGE_BAND, y: PHONE_PADDING[0] - EDGE_BAND };

/**
 * The widest OptionCard's own leading hairline is drawn — its `::before`,
 * 1px at rest and 2px under a finger — read off disk. It runs down the left
 * edge between the corner glyphs, exactly where a left edge mark would.
 */
const HAIRLINE = Math.max(
  ...rulesIn('src/components/run/OptionCard.module.css')
    .filter((r) => r.selector.endsWith('::before') && declared(r.body, 'width') !== null)
    .map((r) => parseFloat(declared(r.body, 'width')!)),
);

/**
 * Every surface a trim is laid over, read from the stylesheets: each
 * `background: var(--ew-trim, none), …` names the surface tokens under it.
 * OptionCard at rest is raised-to-panel and the panel under a press, and
 * `--ew-hover` under a finger; the lair plates are raised-to-panel; the other
 * plates and ending slots the panel.
 *
 * Two ending-slot surfaces are mixes of the panel, and neither is modelled.
 * The current ending's slot is the panel mixed 4% toward the tier colour,
 * which LIGHTENS every dark panel — every tier colour is lighter than every
 * dark room's panel — so its bare surface already reads a little below the
 * panel. A locked slot is the panel at 35% over the room. What keeps a trim
 * from costing the ink anything on either is not where those surfaces sit but
 * what the washes do: no wash moves a card toward its ink (lighter behind
 * pale ink, darker behind dark), which the 'never moves a card toward its
 * ink' test below holds. A wash that broke that would have to model both.
 */
const TRIM_SURFACES: string[] = (() => {
  const found = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.css')) {
        for (const rule of rulesOf(readFileSync(full, 'utf8'))) {
          const bg = declared(rule.body, 'background');
          if (!bg?.startsWith('var(--ew-trim')) continue;
          for (const [, name] of bg.matchAll(/var\((--ew-[\w-]+)\)/g)) {
            if (Object.values(SURFACE_VARS).includes(name)) found.add(name);
          }
        }
      }
    }
  };
  walk(resolve(process.cwd(), 'src'));
  return [...found].sort();
})();

/** A position along a gradient's line: a percentage of it, or px. */
type At = { value: number; unit: '%' | 'px' };

/** A colour stop, resolved: an opaque hex at an alpha, and where it sits (none, one or two positions). */
type Stop = { colour: string; alpha: number; at: At[] };

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
function resolveColour(css: string, theme: ThemeDef): { colour: string; alpha: number } {
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

/** A stop's positions: `0`, `8px`, `60%`, `2px 6px`. Throws on any other unit. */
function positionsOf(text: string): At[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => {
      const m = p.match(/^(-?[\d.]+)(px|%)?$/);
      if (!m || (m[2] === undefined && parseFloat(m[1]) !== 0)) throw new Error(`the trim model cannot read this stop position: ${p}`);
      return { value: parseFloat(m[1]), unit: (m[2] ?? 'px') as At['unit'] };
    });
}

/** One trim layer, parsed. */
type TrimLayer = { image: string; kind: string; prelude: string | null; placement: string; stops: Stop[] };

/**
 * One trim layer split into its gradient and what follows it (position, size
 * and repeat), with the gradient's colour stops resolved and its first
 * argument kept when it is a direction or shape rather than a stop. A layer
 * that is not a gradient throws — a trim may only be painted with one.
 */
function trimLayer(layer: string, theme: ThemeDef): TrimLayer {
  const css = normalise(layer);
  const kind = css.match(/^((?:repeating-)?(?:linear|radial|conic)-gradient)\(/)?.[1];
  if (!kind) throw new Error(`a trim layer must be a gradient: ${layer}`);
  const image = callAt(css, 0);
  const placement = css.slice(image.length).trim();
  const args = layersOf(image.slice(image.indexOf('(') + 1, -1));
  const stops: Stop[] = [];
  let prelude: string | null = null;
  args.forEach((arg, i) => {
    // A colour comes first in a stop; a gradient's direction or shape does
    // not start with one, and is the only other thing a gradient takes.
    const colour = arg.match(/^(?:transparent|(?:var|color-mix|rgba?)\()/)
      ? arg.startsWith('transparent')
        ? 'transparent'
        : callAt(arg, 0)
      : null;
    if (colour) stops.push({ ...resolveColour(colour, theme), at: positionsOf(arg.slice(colour.length)) });
    else if (i === 0) prelude = arg;
    else throw new Error(`a trim stop must start with a colour: ${arg}`);
  });
  return { image, kind, prelude, placement, stops };
}

/** A theme's trim, top layer first. `none` is no layers. */
function trimLayers(theme: ThemeDef) {
  const trim = normalise(theme.ornament.trim);
  return trim === 'none' ? [] : layersOf(trim).map((layer) => trimLayer(layer, theme));
}

/**
 * The strongest alpha a trim layer actually paints anywhere in its box, 0–1.
 *
 * A linear gradient's line runs the length of its box, so every stop on it is
 * reached. A radial one is reached only out to the box's farthest corner, and
 * from its nearest point: the same arithmetic as the key light's
 * `peakFactor`, measured in radii. Its alpha runs linearly between stops,
 * holds the first colour inside the first stop and the last beyond the last,
 * so the peak over a stretch of the ray is at one of its ends or at a stop
 * inside it. Throws on any other form, rather than calling it reached.
 */
function peakAlpha(layer: TrimLayer): number {
  if (layer.kind === 'linear-gradient' || layer.kind === 'repeating-linear-gradient') {
    return Math.max(0, ...layer.stops.filter((s) => s.at.every((p) => p.unit === 'px' || p.value <= 100)).map((s) => s.alpha));
  }
  const shape = layer.prelude?.match(/^([\d.]+)% ([\d.]+)% at (-?[\d.]+)% (-?[\d.]+)%$/);
  if (layer.kind !== 'radial-gradient' || !shape) {
    throw new Error(`the trim model cannot find where this layer paints: ${layer.image}`);
  }
  const [rx, ry, cx, cy] = shape.slice(1).map((n) => parseFloat(n) / 100);
  // Every stop as (position in radii, alpha), CSS's defaults filled in: the
  // first at 0, the last at 1, a position never behind the one before it,
  // and an unplaced run spread evenly between its neighbours.
  const points = layer.stops.flatMap((s): { t: number | null; alpha: number }[] =>
    s.at.length === 0
      ? [{ t: null, alpha: s.alpha }]
      : s.at.map((p) => {
          if (p.unit !== '%') throw new Error(`the trim model reads a radial stop in % only: ${layer.image}`);
          return { t: p.value / 100, alpha: s.alpha };
        }),
  );
  if (points[0].t === null) points[0].t = 0;
  if (points[points.length - 1].t === null) points[points.length - 1].t = 1;
  for (let i = 1; i < points.length; i++) {
    if (points[i].t === null) {
      let j = i;
      while (points[j].t === null) j++;
      const from = points[i - 1].t!;
      const step = (points[j].t! - from) / (j - i + 1);
      for (let k = i; k < j; k++) points[k].t = from + step * (k - i + 1);
    }
    points[i].t = Math.max(points[i].t!, points[i - 1].t!);
  }
  const alphaAt = (t: number) => {
    if (t <= points[0].t!) return points[0].alpha;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      if (t <= b.t!) return b.t! === a.t! ? b.alpha : a.alpha + ((t - a.t!) / (b.t! - a.t!)) * (b.alpha - a.alpha);
    }
    return points[points.length - 1].alpha;
  };
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const near = Math.hypot((clamp(cx) - cx) / rx, (clamp(cy) - cy) / ry);
  const far = Math.max(...[0, 1].flatMap((x) => [0, 1].map((y) => Math.hypot((x - cx) / rx, (y - cy) / ry))));
  const inReach = points.map((p) => p.t!).filter((t) => t >= near && t <= far);
  return Math.max(...[near, far, ...inReach].map(alphaAt));
}

/** The furthest any channel of `backdrop` moves under `stop`, in 0–255 levels, as a browser rounds it. */
function moveOver(backdrop: string, stop: { colour: string; alpha: number }): number {
  const lo = parseHex(backdrop);
  const hi = parseHex(over(backdrop, stop.colour, stop.alpha));
  return Math.max(...lo.map((c, i) => Math.abs(hi[i] - c)));
}

/** The theme's colour for a surface var, falling back to the default's. */
const surfaceOf = (theme: ThemeDef, name: string) => paletteOf(theme).get(name)!;

/** Whether a layer is drawn hard enough, over any of `backdrops`, for the probe to see it. */
const isMark = (backdrops: string[], stops: Stop[]) =>
  backdrops.some((b) => stops.some((stop) => moveOver(b, stop) >= DRAWN));

/**
 * Whether a mark's placement is one it may take, and if not, why.
 *
 *   - horizontal edge band: `left 12px (top|bottom) Apx / calc(100% - 24px) Bpx no-repeat`, A + B ≤ 4
 *   - vertical edge band: `(left|right) Apx top 12px / Bpx calc(100% - 24px) no-repeat`, A + B ≤ 4
 *   - corner: `(top|bottom) (left|right) / Kpx Kpx no-repeat`, every point it
 *     draws within `CORNER_REACH.x` of the side or `.y` of the edge. Two forms
 *     are accepted: any image in a square of side up to the larger reach (8px,
 *     so every point is within 8px of the side), or a triangle across the
 *     corner in a square of up to 12px — a `linear-gradient(Ddeg, …)`, D the
 *     angle pointing away from that corner, whose stops are a run of colours
 *     and then `transparent` at T px, hard-edged or fading out by T. Its legs,
 *     the furthest position on it times √2, reach no further than the two
 *     reaches added (12px: a point with x + y ≤ 12 cannot have both x > 8 and
 *     y > 4).
 *
 * The triangle is read from the layer's PARSED stops, never its text: a `%`
 * position scales with the gradient line, not with the reach, so a colour at
 * `0 100%` fills the whole square however early its transparent stop is
 * written. Every position on a corner triangle must be px. A band or corner
 * of zero size paints nothing, which a mark may not be, so both must be
 * larger than zero.
 *
 * Offsets are measured inside the card's border (the padding box). Zero may be
 * written without a unit, as CSS allows; nothing else may.
 */
function markGeometry(layer: TrimLayer): string | null {
  const { placement } = layer;
  const len = '(0|\\d+px)';
  const px = (s: string) => parseFloat(s);
  const span = `calc\\(100% - ${CORNER_SQUARE * 2}px\\)`;
  const horizontal = placement.match(new RegExp(`^left ${CORNER_SQUARE}px (?:top|bottom) ${len} / ${span} ${len} no-repeat$`));
  const vertical = placement.match(new RegExp(`^(?:left|right) ${len} top ${CORNER_SQUARE}px / ${len} ${span} no-repeat$`));
  const band = horizontal ?? vertical;
  if (band) {
    if (px(band[2]) <= 0) return 'a band 0px thick, which draws nothing';
    const reach = px(band[1]) + px(band[2]);
    return reach <= EDGE_BAND ? null : `reaches ${reach}px in from the edge, past the outer ${EDGE_BAND}px`;
  }
  const corner = placement.match(/^(top|bottom) (left|right) \/ (\d+)px \3px no-repeat$/);
  if (corner) {
    const side = px(corner[3]);
    if (side <= 0) return 'a 0px corner, which draws nothing';
    if (side <= Math.max(CORNER_REACH.x, CORNER_REACH.y)) return null;
    if (side > CORNER_SQUARE) return `a ${side}px corner, past the ${CORNER_SQUARE}px corner square`;
    const away: Record<string, number> = { 'top left': 135, 'top right': 225, 'bottom right': 315, 'bottom left': 45 };
    const pointing = away[`${corner[1]} ${corner[2]}`];
    const deg = layer.prelude?.match(/^(\d+)deg$/)?.[1];
    if (layer.kind !== 'linear-gradient' || deg === undefined) {
      return `a ${side}px corner filled with something other than a triangle across it`;
    }
    if (Number(deg) !== pointing) return `a triangle at ${deg}deg does not start in the ${corner[1]} ${corner[2]} corner`;
    // A run of colours, then transparent from T px on. Everything past T is
    // transparent, so T — or a later position on the run, which CSS would
    // push T out to — is how far along the diagonal it draws.
    const run = layer.stops.slice(0, -1);
    const end = layer.stops[layer.stops.length - 1];
    if (run.length === 0 || end.alpha !== 0 || end.at.length !== 1) {
      return `a ${side}px corner that does not end in transparent at one position`;
    }
    const positions = layer.stops.flatMap((s) => s.at);
    const scaled = positions.find((p) => p.unit !== 'px');
    if (scaled) return `a corner triangle with a stop at ${scaled.value}${scaled.unit}, which scales with the square, not the reach`;
    const leg = Math.max(...positions.map((p) => p.value)) * Math.SQRT2;
    const most = CORNER_REACH.x + CORNER_REACH.y;
    return leg <= most ? null : `a corner triangle with ${leg.toFixed(1)}px legs, past ${most}px`;
  }
  return `"${placement}" is neither an edge band between the corner glyphs nor a corner mark`;
}

/**
 * The worst contrast `text` makes with `backdrop` under a theme's washes.
 *
 * Washes can overlap, and text can sit where any one has faded out, so every
 * combination of one stop (or none) from each wash is composited bottom-up
 * over the backdrop, and the worst is kept.
 */
function worstUnderWashes(backdrop: string, washes: Stop[][], text: string): number {
  let backdrops = [backdrop];
  for (const stops of [...washes].reverse()) {
    backdrops = backdrops.flatMap((b) => [b, ...stops.map((s) => over(b, s.colour, s.alpha))]);
  }
  return Math.min(...backdrops.map((b) => contrastRatio(text, b)));
}

/**
 * The furthest any channel of `backdrop` moves with every wash laid over it at
 * once, each at its own strongest stop there, composited bottom-up as a
 * browser does — as though every peak fell on the same pixel.
 */
function stackedMove(backdrop: string, washes: Stop[][]): number {
  let top = backdrop;
  for (const stops of [...washes].reverse()) {
    if (stops.length === 0) continue;
    const strongest = stops.reduce((a, b) => (moveOver(backdrop, b) > moveOver(backdrop, a) ? b : a));
    top = over(top, strongest.colour, strongest.alpha);
  }
  const lo = parseHex(backdrop);
  const hi = parseHex(top);
  return Math.max(...lo.map((c, i) => Math.abs(hi[i] - c)));
}

/**
 * A theme's trim layers sorted into marks and washes over `backdrops`.
 *
 * Each layer is a mark if it alone is drawn hard enough on some surface. The
 * washes are then judged together too: several, each under `DRAWN`, can stack
 * into a composite the probe sees, and if they do, every one of them is held
 * to a mark's geometry instead of a wash's strength.
 */
function sortTrim(theme: ThemeDef, backdrops: string[]): { marks: TrimLayer[]; washes: TrimLayer[] } {
  const layers = trimLayers(theme);
  const washes = layers.filter((l) => !isMark(backdrops, l.stops));
  const stacked = backdrops.some((b) => stackedMove(b, washes.map((w) => w.stops)) >= DRAWN);
  return stacked ? { marks: layers, washes: [] } : { marks: layers.filter((l) => !washes.includes(l)), washes };
}

/** Whether a layer's `/ W H` size has a zero in it, so that it draws nothing at all. */
function zeroSized(placement: string): boolean {
  const size = placement.split('/')[1];
  if (size === undefined) return false;
  const [w, h] = size.trim().match(/calc\([^)]*\)|\S+/g) ?? [];
  return [w, h].some((d) => d !== undefined && /^-?0*\.?0+(?:px|%)?$/.test(d));
}

describe('themes · card trims are marks or washes', () => {
  /** The panel floor, as the ink contrast block computes it. */
  const FLOOR = contrastRatio(ink.base, surface.panel);
  const byId = (id: string) => THEMES.find((t) => t.id === id)!;
  const TOWER = byId(DEFAULT_THEME_ID);
  const stop = (colour: string, alpha: number, at: At[] = []): Stop => ({ colour, alpha, at });

  /**
   * What a wash must leave `text` reading at over one surface: the default's
   * ink on the default's version of that surface — the panel floor, on the
   * panel. Where a palette's own surface already reads below that, as many
   * hover and raised steps do (a palette shortfall that predates trims and is
   * not a trim's to fix), the wash may cost nothing at all: the floor is then
   * the bare surface. Panels never take that branch; the ink contrast block holds
   * every panel to the floor on its own.
   */
  const washFloor = (text: string, bare: string, name: string) =>
    Math.min(contrastRatio(ink.base, surfaceOf(TOWER, name)), contrastRatio(text, bare));

  it('holds a wash to the default surface, or to the bare one where the palette is already below it', () => {
    // Anchored to tokens.ts, not to the floor function: the default's ink on
    // its own panel, raised step and hover.
    expect(washFloor(ink.base, surface.panel, '--ew-panel')).toBe(contrastRatio(ink.base, surface.panel));
    expect(washFloor('#ffffff', '#000000', '--ew-hover')).toBe(contrastRatio(ink.base, surface.hover));
    // A hover that already reads worse than the default's: the floor is the
    // hover itself, so a lightening wash on it fails and a darkening one passes.
    const dim = '#3a3a3a';
    const floor = washFloor(ink.base, dim, '--ew-hover');
    expect(floor).toBe(contrastRatio(ink.base, dim));
    expect(worstUnderWashes(dim, [[stop('#ffffff', 0.02)]], ink.base)).toBeLessThan(floor);
    expect(worstUnderWashes(dim, [[stop('#000000', 0.2)]], ink.base)).toBeGreaterThanOrEqual(floor);
  });

  it("reads the probe's own DRAWN, and it is a sane threshold", () => {
    // An 8-bit channel moves 0–255. Below a handful of levels the probe would
    // count antialiasing as ornament; past a quarter of the range a 1px rule
    // in a quiet room would slip through as a wash.
    expect(Number.isInteger(DRAWN), 'no `const DRAWN = <n>;` line in the probe').toBe(true);
    expect(DRAWN).toBeGreaterThanOrEqual(8);
    expect(DRAWN).toBeLessThanOrEqual(64);
  });

  it("reads OptionCard's phone padding and the 4px band off disk", () => {
    // 8px × 12px is the padding every corner allowance below is cut from; the
    // corner may reach 8px across or 4px down.
    expect(PHONE_PADDING).toEqual([8, 12]);
    expect(EDGE_BAND).toBe(4);
    expect(CORNER_REACH).toEqual({ x: 8, y: 4 });
    expect(HAIRLINE).toBe(2);
  });

  it('finds every surface a trim is laid over, and only surfaces', () => {
    // OptionCard alone lays its trim over all three. A walker that found
    // nothing would leave every wash measured on no surface at all.
    expect(TRIM_SURFACES).toEqual(['--ew-hover', '--ew-panel', '--ew-raised']);
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
    // Custom property names are case-sensitive: the browser would find no such token.
    expect(() => resolveColour('var(--EW-LINE-STRONG)', sword)).toThrow();
  });

  it('reads every stop of a layer, its positions, and its placement apart from them', () => {
    const [layer] = trimLayers(byId('exiled_and_overrun'));
    expect(layer.stops.map((s) => s.alpha)).toEqual([1, 0, 1]);
    expect(layer.stops.map((s) => s.at)).toEqual([
      [
        { value: 0, unit: 'px' },
        { value: 38, unit: '%' },
      ],
      [
        { value: 38, unit: '%' },
        { value: 62, unit: '%' },
      ],
      [{ value: 62, unit: '%' }],
    ]);
    expect(layer.prelude).toBe('90deg');
    expect(layer.placement).toBe('left 12px top 0px / calc(100% - 24px) 1px no-repeat');
  });

  it('finds where a radial trim paints, by hand', () => {
    const black = (prelude: string, stops: Stop[]): TrimLayer => ({
      image: '',
      kind: 'radial-gradient',
      prelude,
      placement: '',
      stops,
    });
    const shade = [stop('#000000', 0, [{ value: 60, unit: '%' }]), stop('#000000', 0.28)];
    // Good Ground's old trim: centred (50%, 40%) with radii 130% × 140% of the
    // box, so its farthest corner, (0, 1), is hypot(0.5/1.3, 0.6/1.4) = 0.576
    // radii out — short of the 60% where its shade begins. It painted nothing.
    expect(peakAlpha(black('130% 140% at 50% 40%', shade))).toBe(0);
    // Halve the radii and that corner is 1.15 radii out, past the last stop:
    // the full 0.28.
    expect(peakAlpha(black('65% 70% at 50% 40%', shade))).toBeCloseTo(0.28, 10);
    // Radii of 100%, centred: the farthest corner is √0.5 = 0.707 radii out,
    // (0.707 − 0.6) / 0.4 of the way to 0.28.
    expect(peakAlpha(black('100% 100% at 50% 50%', shade))).toBeCloseTo(((Math.SQRT1_2 - 0.6) / 0.4) * 0.28, 10);
    // A light from above the box: its nearest point is 0.5 radii out, past the
    // opaque centre, and it fades to nothing by 0.8.
    const glow = [stop('#ffffff', 1), stop('#ffffff', 0, [{ value: 80, unit: '%' }])];
    expect(peakAlpha(black('100% 100% at 50% -50%', glow))).toBeCloseTo(1 - 0.5 / 0.8, 10);
    // A linear gradient runs its whole box, so every stop on it is reached —
    // and a stop placed past the end of it is not.
    const linear = (stops: Stop[]): TrimLayer => ({ ...black('180deg', stops), kind: 'linear-gradient' });
    expect(peakAlpha(linear([stop('#000000', 0), stop('#000000', 0.25)]))).toBe(0.25);
    expect(peakAlpha(linear([stop('#000000', 0, [{ value: 0, unit: 'px' }, { value: 100, unit: '%' }]), stop('#000000', 0.25, [{ value: 120, unit: '%' }])]))).toBe(0);
  });

  /** `markGeometry` on a layer written as CSS, parsed as a theme's trim is. */
  const geometry = (image: string, placement: string) => markGeometry(trimLayer(`${image} ${placement}`, TOWER));

  it('accepts the edge bands, a small corner square, and a corner triangle up to 12px legs', () => {
    const solid = 'linear-gradient(var(--ew-line-strong), var(--ew-line-strong))';
    const facet = (deg: number, stopPx: number) =>
      `linear-gradient(${deg}deg, var(--ew-line-strong) 0 ${stopPx}px, transparent ${stopPx}px)`;
    expect(geometry(solid, 'left 12px top 0 / calc(100% - 24px) 4px no-repeat')).toBeNull();
    expect(geometry(solid, 'left 12px bottom 3px / calc(100% - 24px) 1px no-repeat')).toBeNull();
    expect(geometry(solid, 'right 3px top 12px / 1px calc(100% - 24px) no-repeat')).toBeNull();
    expect(geometry(solid, 'bottom right / 8px 8px no-repeat')).toBeNull();
    // Amethyst's facets: 8px along the diagonal, legs of 11.3px.
    expect(geometry(facet(135, 8), 'top left / 12px 12px no-repeat')).toBeNull();
    expect(geometry(facet(315, 8), 'bottom right / 12px 12px no-repeat')).toBeNull();
    expect(geometry(facet(225, 8), 'top right / 12px 12px no-repeat')).toBeNull();
    expect(geometry(facet(45, 8), 'bottom left / 12px 12px no-repeat')).toBeNull();
    // Cold Room's rime: the same triangle, fading out rather than hard-edged.
    const rime = 'linear-gradient(135deg, color-mix(in srgb, var(--ew-ink-bright) 25%, transparent), transparent 8px)';
    expect(geometry(rime, 'top left / 12px 12px no-repeat')).toBeNull();
    expect(geometry(rime.replace('8px', '9px'), 'top left / 12px 12px no-repeat')).not.toBeNull();
  });

  it('refuses a mark that comes within 4px of content', () => {
    const solid = 'linear-gradient(var(--ew-line-strong), var(--ew-line-strong))';
    const facet = (deg: number, stopPx: number) =>
      `linear-gradient(${deg}deg, var(--ew-line-strong) 0 ${stopPx}px, transparent ${stopPx}px)`;
    // Content starts 12px across and 8px down: a solid 12px corner reaches
    // (12, 8) itself, and the probe measured it 1px from a keycap at 320.
    expect(geometry(solid, 'top left / 12px 12px no-repeat')).not.toBeNull();
    expect(geometry(solid, 'top left / 9px 9px no-repeat')).not.toBeNull();
    // A triangle whose legs pass 12px (9px × √2 = 12.7), or that starts in the
    // wrong corner and so fills the far one.
    expect(geometry(facet(135, 9), 'top left / 12px 12px no-repeat')).not.toBeNull();
    expect(geometry(facet(315, 8), 'top left / 12px 12px no-repeat')).not.toBeNull();
    expect(geometry(facet(135, 8), 'top left / 16px 16px no-repeat')).not.toBeNull();
    expect(geometry(solid, 'left 12px top 3px / calc(100% - 24px) 2px no-repeat')).not.toBeNull();
    expect(geometry(solid, 'left 6px top 16px / 1px calc(100% - 32px) no-repeat')).not.toBeNull();
    expect(geometry(solid, 'top / 100% 1px no-repeat')).not.toBeNull();
    expect(geometry(solid, '')).not.toBeNull();
    // A % position scales with the 12px square, not with the reach: a colour
    // held to 100% fills the whole corner however early the transparent stop
    // is written (the probe measured this one 0.5px from a keycap), and so
    // does a colour run that starts part-way along it.
    const line = 'var(--ew-line-strong)';
    expect(geometry(`linear-gradient(135deg, ${line} 0 100%, transparent 8px)`, 'top left / 12px 12px no-repeat')).not.toBeNull();
    expect(
      geometry(`linear-gradient(135deg, transparent 0 60%, ${line} 60% 100%, transparent 8px)`, 'top left / 12px 12px no-repeat'),
    ).not.toBeNull();
    // Any % at all, even one too short to reach content: a corner triangle is
    // measured in px, the unit the reach is in, or not at all.
    expect(geometry(`linear-gradient(135deg, ${line} 0 5%, transparent 8px)`, 'top left / 12px 12px no-repeat')).not.toBeNull();
    // A triangle that never turns transparent, or turns at no stated position.
    expect(geometry(`linear-gradient(135deg, ${line} 0 8px, ${line} 8px)`, 'top left / 12px 12px no-repeat')).not.toBeNull();
    expect(geometry(`linear-gradient(135deg, ${line}, transparent)`, 'top left / 12px 12px no-repeat')).not.toBeNull();
  });

  it('refuses a band or corner of zero size, which draws nothing', () => {
    const solid = 'linear-gradient(var(--ew-line-strong), var(--ew-line-strong))';
    expect(geometry(solid, 'left 12px top 0 / calc(100% - 24px) 0 no-repeat')).not.toBeNull();
    expect(geometry(solid, 'right 0px top 12px / 0px calc(100% - 24px) no-repeat')).not.toBeNull();
    expect(geometry(solid, 'top left / 0px 0px no-repeat')).not.toBeNull();
    // And a wash that size, which no geometry is asked of, is caught as
    // painting nothing.
    expect(zeroSized('left 12px top 0 / calc(100% - 24px) 0 no-repeat')).toBe(true);
    expect(zeroSized('top left / 0px 0px no-repeat')).toBe(true);
    expect(zeroSized('left 12px top 0 / calc(100% - 24px) 1px no-repeat')).toBe(false);
    expect(zeroSized('')).toBe(false);
  });

  it('measures the worst a wash does to the ink, by hand', () => {
    // No wash: the ink on the bare panel, which is the floor itself.
    expect(worstUnderWashes(surface.panel, [], ink.base)).toBe(FLOOR);
    // White at 50% over the default panel, (19, 17, 14): (137, 136, 134.5),
    // which rounds to #898887 — and the ink on that is nowhere near the floor.
    const white = [[stop('#ffffff', 0.5)]];
    expect(worstUnderWashes(surface.panel, white, ink.base)).toBeCloseTo(contrastRatio(ink.base, '#898887'), 10);
    expect(worstUnderWashes(surface.panel, white, ink.base)).toBeLessThan(FLOOR);
    // A black wash darkens the backdrop behind pale ink, which only helps: the
    // worst is still where it has faded out.
    expect(worstUnderWashes(surface.panel, [[stop('#000000', 0.5)]], ink.base)).toBe(FLOOR);
    // Two washes stack, each rounded to a level as a browser composites them:
    // #898887, then half-way from that to white, (196, 195.5, 195) -> #c4c4c3.
    const twice = [[stop('#ffffff', 0.5)], [stop('#ffffff', 0.5)]];
    expect(worstUnderWashes(surface.panel, twice, ink.base)).toBeCloseTo(contrastRatio(ink.base, '#c4c4c3'), 10);
  });

  it('finds marks where rules are drawn, and washes where tints are', () => {
    // Guards the classifier: one that called everything a wash would wave
    // every misplaced rule through, and one that called everything a mark
    // would fail every soft tint for its geometry.
    const ruled = byId('contract_writer');
    const ruledOn = TRIM_SURFACES.map((s) => surfaceOf(ruled, s));
    expect(trimLayers(ruled).filter((l) => isMark(ruledOn, l.stops)).length).toBeGreaterThanOrEqual(1);
    const wet = byId('turned_to_fertilizer');
    const wetOn = TRIM_SURFACES.map((s) => surfaceOf(wet, s));
    expect(trimLayers(wet).filter((l) => !isMark(wetOn, l.stops)).length).toBeGreaterThanOrEqual(1);
  });

  it('calls a stack of washes a mark when together they are drawn', () => {
    // Ordinary Weather's sheen moves the hover gold under DRAWN on its own;
    // laid twice it moves it past, and two layers the probe can see are not
    // a wash, however faint each one is.
    const weather = byId('good_wizard');
    const hover = surfaceOf(weather, '--ew-hover');
    const [sheen] = trimLayers(weather);
    expect(stackedMove(hover, [sheen.stops])).toBeLessThan(DRAWN);
    expect(stackedMove(hover, [sheen.stops, sheen.stops])).toBeGreaterThanOrEqual(DRAWN);
    const doubled = { ...weather, ornament: { ...weather.ornament, trim: `${weather.ornament.trim}, ${weather.ornament.trim}` } };
    const on = TRIM_SURFACES.map((s) => surfaceOf(weather, s));
    expect(sortTrim(weather, on).washes).toHaveLength(1);
    expect(sortTrim(doubled, on).marks).toHaveLength(2);
    expect(sortTrim(doubled, on).washes).toEqual([]);
  });

  it('calls a layer a mark when it is drawn hard on any one surface', () => {
    // Requisition's perforation is the void punched through the card: 14
    // levels on its panel, 24 on its raised step and 35 under a finger. A
    // classifier that only looked at the panel would call it a wash.
    const form = byId('eternally_repurposed');
    const [layer] = trimLayers(form);
    expect(isMark([surfaceOf(form, '--ew-panel')], layer.stops)).toBe(false);
    expect(isMark([surfaceOf(form, '--ew-raised')], layer.stops)).toBe(true);
    expect(isMark(TRIM_SURFACES.map((s) => surfaceOf(form, s)), layer.stops)).toBe(true);
  });

  for (const theme of THEMES) {
    const on = TRIM_SURFACES.map((name) => surfaceOf(theme, name));

    it(`${theme.name}'s trim marks keep 4px from content`, () => {
      const misplaced = sortTrim(theme, on)
        .marks.map((l) => [l.image, markGeometry(l)])
        .filter(([, why]) => why !== null);
      expect(misplaced, `${theme.id}: marks outside the edge band and corners`).toEqual([]);
    });

    it(`${theme.name}'s left edge marks stay apart from the card's own hairline`, () => {
      // Flush against it, a 1px rule and the 2px hover hairline merge into
      // one bar: a mark down the left edge starts at least a pixel past it.
      for (const layer of sortTrim(theme, on).marks) {
        const left = layer.placement.match(/^left (0|\d+px) top /);
        if (left) expect(parseFloat(left[1]), layer.image).toBeGreaterThanOrEqual(HAIRLINE + 1);
      }
    });

    it(`${theme.name}'s trim washes never move a card toward its ink`, () => {
      // Two ending-slot surfaces go unmodelled (see TRIM_SURFACES), and this
      // is what makes that safe: a wash that only ever moves the card away
      // from the ink cannot cost the ink anything on any surface.
      for (const layer of sortTrim(theme, on).washes) {
        for (const name of TRIM_SURFACES) {
          const bare = surfaceOf(theme, name);
          const text = theme.ink?.base ?? ink.base;
          const paleInk = luminanceOfRgb(parseHex(text)) > luminanceOfRgb(parseHex(bare));
          for (const s of layer.stops) {
            const washed = luminanceOfRgb(parseHex(over(bare, s.colour, s.alpha)));
            const bareLum = luminanceOfRgb(parseHex(bare));
            expect(paleInk ? washed <= bareLum : washed >= bareLum, `${theme.id}: ${layer.image} on ${name}`).toBe(true);
          }
        }
      }
    });

    it(`${theme.name}'s trim washes leave the ink reading as well as the default's, on every surface`, () => {
      const washes = sortTrim(theme, on).washes.map((l) => l.stops);
      for (const name of TRIM_SURFACES) {
        const bare = surfaceOf(theme, name);
        for (const text of [theme.ink?.base ?? ink.base, theme.ink?.bright ?? ink.bright]) {
          expect(
            worstUnderWashes(bare, washes, text),
            `${theme.id}: ${text} on ${name} under its washes`,
          ).toBeGreaterThanOrEqual(washFloor(text, bare, name));
        }
      }
    });

    it(`${theme.name}'s every trim layer paints something`, () => {
      // A layer that never reaches a visible stop inside its box draws
      // nothing, and an ornament nobody can see is not one.
      for (const layer of trimLayers(theme)) {
        expect(peakAlpha(layer), `${theme.id}: ${layer.image}`).toBeGreaterThan(0);
        expect(zeroSized(layer.placement), `${theme.id}: ${layer.image} ${layer.placement}`).toBe(false);
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
