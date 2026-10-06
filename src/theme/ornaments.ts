/**
 * Ornament shapes — the names, kinds and tile sizes themes draw with.
 *
 * ## Why shapes are colourless
 *
 * Every shape is a MASK: black on transparent, used through CSS `mask-image`,
 * never through `background-image`. The colour a player sees is whatever the
 * element painting through the mask sets — always one of the theme's own
 * surface tokens (`--ew-line-strong`, in practice). That is what keeps
 * ornament inside the pillar rather than beside it: a shape cannot carry a
 * hue, so a theme cannot smuggle a second accent in through its wallpaper.
 *
 * ## Two files, on purpose
 *
 * This one is what the running game imports: names, kinds and tile sizes, a
 * few hundred bytes. The drawings themselves live in `ornamentShapes.ts`,
 * which only the build script and the tests import — `npm run ornaments`
 * writes them into `ornaments.css` as one `--ew-shape-<id>` custom property
 * each, and the CSS is the only place a browser ever needs them. Shipping the
 * SVG markup in the JavaScript as well would have cost every phone ~15 kB for
 * strings no code reads.
 *
 * A theme points at a shape by name (`--ew-motif: var(--ew-shape-masonry)`),
 * which keeps the theme blocks in `tokens.css` short enough to diff by eye.
 */

/**
 * Wallpaper patterns and their natural tile, in CSS pixels. The drawing is
 * made on exactly this grid (`ornamentShapes.ts` reads it from here), so the
 * tile a theme declares cannot disagree with the drawing and stretch it.
 */
export const PATTERNS = {
  masonry: [96, 48],
  swords: [120, 120],
  facets: [40, 70],
  frost: [100, 100],
  reeds: [120, 100],
  grid: [100, 100],
  stars: [110, 110],
  form: [120, 48],
  hatch: [14, 14],
  roots: [100, 100],
  border: [96, 64],
  burrows: [120, 120],
  ruled: [40, 26],
  coins: [80, 80],
  diagram: [140, 140],
  leaves: [100, 100],
  fleur: [56, 56],
  daisies: [90, 90],
  candles: [100, 110],
} as const satisfies Record<string, readonly [number, number]>;

/** Corner glyphs, each drawn on a 24×24 square and shown at about 8–12px. */
export const GLYPHS = [
  'star',
  'hilt',
  'gem',
  'key',
  'snowflake',
  'bubbles',
  'registration',
  'sparkle',
  'checkbox',
  'nil',
  'sprout',
  'pennant',
  'spiral',
  'nib',
  'coin',
  'eye',
  'acorn',
  'crown',
  'sun',
  'flame',
] as const;

export type PatternId = keyof typeof PATTERNS;
export type GlyphId = (typeof GLYPHS)[number];
export type ShapeId = PatternId | GlyphId;

/** Every shape id, patterns first. */
export const SHAPE_IDS: readonly ShapeId[] = [...(Object.keys(PATTERNS) as PatternId[]), ...GLYPHS];

/**
 * Which kind a shape is. A theme's `motif` must name a pattern and its `pip`
 * a glyph — held by the types in `themes.ts`, so a 24px glyph can never be
 * tiled as wallpaper by mistake.
 */
export function shapeKind(id: ShapeId): 'pattern' | 'glyph' {
  return id in PATTERNS ? 'pattern' : 'glyph';
}

/** A pattern's natural tile, as a `background-size`. */
export function tileSize(id: PatternId): string {
  const [w, h] = PATTERNS[id];
  return `${w}px ${h}px`;
}

/** The custom property a shape is published under. */
export const shapeVarName = (id: ShapeId) => `--ew-shape-${id}`;

/**
 * A reference to a shape, as a theme writes it into a token.
 *
 * Template-literal typed, so a theme naming a shape that does not exist is a
 * compile error rather than a transparent mask on a live page.
 */
export type ShapeRef<Id extends ShapeId = ShapeId> = `var(--ew-shape-${Id})`;
export const shapeRef = <Id extends ShapeId>(id: Id): ShapeRef<Id> => `var(--ew-shape-${id})`;
