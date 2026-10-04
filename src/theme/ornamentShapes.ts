/**
 * The ornament shapes, drawn — BUILD-TIME ONLY.
 *
 * Imported by `npm run ornaments` (which writes `ornaments.css`) and by the
 * tests, never by the game: the browser gets these drawings from the CSS, and
 * `ornaments.ts` explains why they are kept out of the JavaScript bundle and
 * why every one of them is a colourless mask.
 *
 * `ornaments.test.ts` regenerates the stylesheet and compares it byte for
 * byte, so editing a shape here and forgetting to rebuild fails the gate
 * rather than shipping the old shape. It also parses every drawing as XML:
 * an SVG that fails to parse is not an error anywhere a player would see —
 * the mask is just empty and the ornament silently is not there.
 *
 * ## Units
 *
 * Patterns are drawn at 1 viewBox unit = 1 CSS pixel on the tile `PATTERNS`
 * gives them, so a 1-unit stroke is a 1px hairline. Glyphs are 24×24 and are
 * drawn at roughly 10px, so their strokes are heavier (1.6–2.4 units) to
 * survive the reduction.
 */

import { PATTERNS, shapeVarName, SHAPE_IDS, type ShapeId } from './ornaments';

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

/** Two decimals is sub-pixel at every size these render at. */
const n = (x: number) => String(Math.round(x * 100) / 100);

function svg(w: number, h: number, body: string): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`;
}

/**
 * Stroked line work. Round caps unless `extra` asks for others — and never
 * both: an attribute written twice makes the whole SVG unparseable, and an
 * unparseable mask draws nothing without an error anywhere.
 */
const stroked = (width: number, body: string, extra = '') => {
  const cap = extra.includes('stroke-linecap') ? '' : " stroke-linecap='round'";
  return `<g fill='none' stroke='black' stroke-width='${width}'${cap} stroke-linejoin='round'${extra}>${body}</g>`;
};

const filled = (body: string, extra = '') => `<g fill='black'${extra}>${body}</g>`;

const path = (d: string, extra = '') => `<path d='${d}'${extra}/>`;
const circle = (cx: number, cy: number, r: number, extra = '') =>
  `<circle cx='${n(cx)}' cy='${n(cy)}' r='${n(r)}'${extra}/>`;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** A six-armed frost crystal: spokes with a chevron two thirds of the way out. */
function snowflake(cx: number, cy: number, r: number): string {
  let d = '';
  for (let k = 0; k < 6; k++) {
    const a = rad(k * 60 - 90);
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    d += `M${n(cx)} ${n(cy)}L${n(x)} ${n(y)}`;
    const bx = cx + r * 0.58 * Math.cos(a);
    const by = cy + r * 0.58 * Math.sin(a);
    for (const side of [-1, 1]) {
      const b = a + side * rad(42);
      d += `M${n(bx)} ${n(by)}L${n(bx + r * 0.32 * Math.cos(b))} ${n(by + r * 0.32 * Math.sin(b))}`;
    }
  }
  return path(d);
}

/** A four-point sparkle with concave sides, centred on (cx, cy). */
function sparkle(cx: number, cy: number, s: number): string {
  const p = (x: number, y: number) => `${n(x)} ${n(y)}`;
  return path(
    `M${p(cx, cy - s)}Q${p(cx, cy)} ${p(cx + s, cy)}Q${p(cx, cy)} ${p(cx, cy + s)}` +
      `Q${p(cx, cy)} ${p(cx - s, cy)}Q${p(cx, cy)} ${p(cx, cy - s)}Z`,
  );
}

/** An almond leaf with a midrib, `len` from tip to centre, turned `deg`. */
function leaf(cx: number, cy: number, len: number, deg: number): string {
  const k = len * 0.48;
  return (
    `<g transform='translate(${n(cx)} ${n(cy)}) rotate(${deg})'>` +
    path(`M0 ${n(-len)}C${n(k)} ${n(-k)} ${n(k)} ${n(k)} 0 ${n(len)}C${n(-k)} ${n(k)} ${n(-k)} ${n(-k)} 0 ${n(-len)}Z`) +
    path(`M0 ${n(-len * 0.7)}V${n(len * 1.35)}`) +
    `</g>`
  );
}

/** A fleur-de-lis about 16 units tall, centred on the origin. */
const FLEUR =
  'M0 -8C1.8 -6 2.6 -3.5 1.4 -0.5L0 1L-1.4 -0.5C-2.6 -3.5 -1.8 -6 0 -8Z' +
  'M1.4 1C2.5 -1 4 -3.4 6 -3.2C7.4 -3 7.6 -1 6.2 -0.2C6.6 -1.4 5.6 -2 4.6 -1.2C3.6 -0.4 3.2 0.6 3 1.6Z' +
  'M-1.4 1C-2.5 -1 -4 -3.4 -6 -3.2C-7.4 -3 -7.6 -1 -6.2 -0.2C-6.6 -1.4 -5.6 -2 -4.6 -1.2C-3.6 -0.4 -3.2 0.6 -3 1.6Z' +
  'M-4 1.6H4V3H-4Z' +
  'M-1 3H1L0.7 6.4L0 8L-0.7 6.4Z';

const fleur = (cx: number, cy: number, scale: number) =>
  `<g transform='translate(${n(cx)} ${n(cy)}) scale(${scale})'>${path(FLEUR)}</g>`;

/** A sword, blade up, about 30 units long, centred on its crossguard. */
function sword(cx: number, cy: number, deg: number): string {
  return (
    `<g transform='translate(${n(cx)} ${n(cy)}) rotate(${deg})'>` +
    path('M0 -16L1.5 -12.5V5H-1.5V-12.5Z') +
    path('M-5.5 5H5.5V6.6H-5.5Z') +
    path('M-0.8 6.6H0.8V11H-0.8Z') +
    circle(0, 12.6, 1.5) +
    `</g>`
  );
}

/** A daisy silhouette: six petals around a centre, radius `r`. */
function daisy(cx: number, cy: number, r: number): string {
  let out = circle(cx, cy, r * 0.34);
  for (let k = 0; k < 6; k++) {
    const a = rad(k * 60);
    out += `<ellipse cx='${n(cx + r * 0.62 * Math.cos(a))}' cy='${n(cy + r * 0.62 * Math.sin(a))}' rx='${n(r * 0.4)}' ry='${n(r * 0.24)}' transform='rotate(${k * 60} ${n(cx + r * 0.62 * Math.cos(a))} ${n(cy + r * 0.62 * Math.sin(a))})'/>`;
  }
  return out;
}

/** A candle flame and its taper, flame tip at (cx, cy - s). */
function candle(cx: number, cy: number, s: number): string {
  const p = (x: number, y: number) => `${n(cx + x * s)} ${n(cy + y * s)}`;
  return (
    path(`M${p(0, -1)}C${p(0.55, -0.4)} ${p(0.5, 0.2)} ${p(0, 0.45)}C${p(-0.5, 0.2)} ${p(-0.55, -0.4)} ${p(0, -1)}Z`) +
    path(`M${p(-0.22, 0.6)}H${n(cx + 0.22 * s)}V${n(cy + 1.9 * s)}H${n(cx - 0.22 * s)}Z`)
  );
}

/** An Archimedean spiral from the centre out to radius `r` over `turns`. */
function spiral(cx: number, cy: number, r: number, turns: number): string {
  const steps = Math.round(turns * 24);
  let d = `M${n(cx)} ${n(cy)}`;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const a = t * turns * Math.PI * 2;
    d += `L${n(cx + r * t * Math.cos(a))} ${n(cy + r * t * Math.sin(a))}`;
  }
  return path(d);
}

// ---------------------------------------------------------------------------
// The shapes
// ---------------------------------------------------------------------------

/**
 * Every shape a theme may draw with, as SVG markup.
 *
 * Patterns tile behind a whole screen, drawn on their `PATTERNS` tile; glyphs
 * are drawn once, small, at the corners of cards and in the middle of section
 * rules. `satisfies Record<ShapeId, string>` makes a shape named in
 * `ornaments.ts` but never drawn here — or drawn here but never named — a
 * compile error.
 */
export const SHAPES = {
  // --- patterns --------------------------------------------------------------

  /** Ashlar courses, joints staggered so no two rows line up. The Tower. */
  masonry: svg(...PATTERNS.masonry,
    stroked(
      1,
      path(
        'M0 0.5H96M0 12.5H96M0 24.5H96M0 36.5H96' +
          'M0.5 0V12M40.5 0V12M72.5 0V12' +
          'M20.5 12V24M56.5 12V24M84.5 12V24' +
          'M8.5 24V36M44.5 24V36M70.5 24V36' +
          'M28.5 36V48M60.5 36V48M90.5 36V48',
      ),
      " stroke-linecap='butt'",
    ),
  ),
  /** Two blades, laid down at different angles. The Sword. */
  swords: svg(...PATTERNS.swords, filled(sword(32, 36, -38) + sword(92, 92, 52))),
  /** A triangular lattice — every edge a facet. Amethyst. */
  facets: svg(...PATTERNS.facets, stroked(0.9, path('M0 0.5H40M0 35.5H40M0 0L40 70M40 0L0 70'), " stroke-linecap='butt'")),
  /** Scattered frost crystals. Cold Room. */
  frost: svg(...PATTERNS.frost,
    stroked(0.9, snowflake(26, 28, 9) + snowflake(74, 74, 6.5)) +
      filled(circle(72, 22, 0.9) + circle(22, 78, 0.9) + circle(50, 52, 0.7)),
  ),
  /** Bulrushes and the occasional bubble rising. Peat. */
  reeds: svg(...PATTERNS.reeds,
    stroked(
      0.9,
      path('M24 100Q25 70 27 46M22 100Q16 78 10 64M84 100Q83 76 81 58M86 100Q93 82 98 70M27 30V25M81 44V40') +
        circle(58, 30, 1.6) +
        circle(63, 23, 1.1) +
        circle(57, 17, 0.7),
    ) + filled(`<rect x='25.2' y='30' width='3.6' height='15' rx='1.8'/><rect x='79.3' y='44' width='3.4' height='13' rx='1.7'/>`),
  ),
  /** Graph paper: a ruled grid, the fifth line heavier. Settled Account. */
  grid: svg(...PATTERNS.grid,
    stroked(
      0.8,
      path('M0 20.5H100M0 40.5H100M0 60.5H100M0 80.5H100M20.5 0V100M40.5 0V100M60.5 0V100M80.5 0V100'),
      " stroke-opacity='0.45' stroke-linecap='butt'",
    ) + stroked(1, path('M0 0.5H100M0.5 0V100'), " stroke-linecap='butt'"),
  ),
  /** A sky that is not this one. Wrong Colour. */
  stars: svg(...PATTERNS.stars,
    filled(
      circle(12, 18, 0.9) +
        circle(48, 8, 0.8) +
        circle(94, 34, 1) +
        circle(30, 62, 0.8) +
        circle(72, 74, 0.9) +
        circle(100, 96, 0.8) +
        circle(52, 100, 1) +
        circle(8, 92, 0.7) +
        sparkle(78, 14, 5) +
        sparkle(22, 40, 3.5) +
        sparkle(60, 48, 2.5) +
        sparkle(34, 88, 4),
    ),
  ),
  /** Boxes to tick and lines to sign on. Requisition. */
  form: svg(...PATTERNS.form,
    stroked(
      0.9,
      `<rect x='8.5' y='8.5' width='7' height='7'/><rect x='8.5' y='32.5' width='7' height='7'/>` +
        path('M22 15.5H76M22 39.5H100M9.8 33.8L14.2 38.2M14.2 33.8L9.8 38.2'),
      " stroke-linecap='butt'",
    ),
  ),
  /** A cancellation hatch. Assets Realised. */
  hatch: svg(...PATTERNS.hatch, stroked(0.8, path('M-1 15L15 -1M-1 1L1 -1M13 15L15 13'), " stroke-linecap='butt'")),
  /** Roots, finding their way down. Good Ground. */
  roots: svg(...PATTERNS.roots,
    stroked(
      0.9,
      path(
        'M30 0C26 20 36 35 30 50S24 80 30 100' +
          'M30 50C40 55 48 62 52 74M29 22C20 26 14 30 10 38M52 74C55 80 54 86 58 92' +
          'M78 0C82 18 72 40 78 60S84 85 78 100M77 34C86 38 92 44 94 52M79 72C70 76 66 82 64 90',
      ),
    ),
  ),
  /** A border on a map, dash and dot, and an X on the wrong side of it. Past the Border. */
  border: svg(...PATTERNS.border,
    stroked(1, path('M0 16.5H96'), " stroke-dasharray='8 3 2 3' stroke-linecap='butt'") +
      stroked(1, path('M0 48.5H96'), " stroke-dasharray='8 3 2 3' stroke-dashoffset='8' stroke-linecap='butt'") +
      stroked(1, path('M57 29L63 35M63 29L57 35')),
  ),
  /** Burrows, ring inside ring, and the track between them. Underneath. */
  burrows: svg(...PATTERNS.burrows,
    stroked(
      0.9,
      circle(30, 40, 5) +
        circle(30, 40, 10.5, " stroke-opacity='0.7'") +
        circle(30, 40, 16, " stroke-opacity='0.45'") +
        circle(88, 92, 4) +
        circle(88, 92, 9, " stroke-opacity='0.7'") +
        circle(88, 92, 14, " stroke-opacity='0.45'") +
        path('M38 54C46 66 60 66 72 82', " stroke-dasharray='1.5 3'"),
    ),
  ),
  /** Writing paper, ruled. Correspondence. */
  ruled: svg(...PATTERNS.ruled, stroked(0.9, path('M0 25.5H40'), " stroke-linecap='butt'")),
  /** Coin, ring inside ring. The Final Number. */
  coins: svg(...PATTERNS.coins,
    stroked(1, circle(20, 22, 7) + circle(60, 62, 7)) +
      stroked(0.7, circle(20, 22, 4.6) + circle(60, 62, 4.6)),
  ),
  /** Compass-and-straightedge constructions on a blackboard. The Chair. */
  diagram: svg(...PATTERNS.diagram,
    stroked(
      0.9,
      circle(70, 74, 28) +
        path('M70 46L94.25 88L45.75 88Z') +
        circle(70, 74, 2.5) +
        circle(18, 18, 7) +
        path('M10 18H26M18 10V26') +
        path('M118 112L132 126M132 112L118 126', " stroke-opacity='0.6'"),
    ) + stroked(0.8, path('M70 32V116'), " stroke-dasharray='2 3' stroke-opacity='0.7'"),
  ),
  /** Leaves on the wind. The Eldest Oak. */
  leaves: svg(...PATTERNS.leaves,
    stroked(0.9, leaf(26, 30, 9, -30) + leaf(72, 70, 8, 40) + leaf(80, 20, 5.5, 15) + leaf(20, 80, 6, -62)),
  ),
  /** A fleur-de-lis diaper, half-dropped. The Crown. */
  fleur: svg(...PATTERNS.fleur,
    filled(fleur(28, 28, 0.75) + fleur(0, 0, 0.75) + fleur(56, 0, 0.75) + fleur(0, 56, 0.75) + fleur(56, 56, 0.75)),
  ),
  /** Daisies in a lawn. Ordinary Weather. */
  daisies: svg(...PATTERNS.daisies,
    filled(daisy(22, 24, 6) + daisy(68, 64, 5) + circle(70, 18, 0.9) + circle(16, 70, 0.9) + circle(46, 46, 0.7)),
  ),
  /** Candles, a long way apart. Kept Vigil. */
  candles: svg(...PATTERNS.candles, filled(candle(26, 32, 6) + candle(76, 86, 5))),

  // --- glyphs ----------------------------------------------------------------

  /** A four-point star. The Tower. */
  star: svg(24, 24, filled(path('M12 1.5L14.2 9.8L22.5 12L14.2 14.2L12 22.5L9.8 14.2L1.5 12L9.8 9.8Z'))),
  /** A sword, point down. The Sword. */
  hilt: svg(
    24,
    24,
    filled(circle(12, 3, 1.8) + path('M11.2 4.5H12.8V8H11.2Z') + path('M5 8H19V10H5Z') + path('M10.6 10H13.4V18.5L12 22.5L10.6 18.5Z')),
  ),
  /** A cut stone, table and pavilion. Amethyst. */
  gem: svg(24, 24, stroked(1.8, path('M3.5 9.5L8.5 3.5H15.5L20.5 9.5L12 21Z') + path('M3.5 9.5H20.5M8.5 3.5L10.3 9.5L12 21L13.7 9.5L15.5 3.5'))),
  /** Somebody else's key. New Management. */
  key: svg(24, 24, stroked(2.2, circle(7, 12, 4) + path('M11 12H21.5M18 12V16M21.2 12V15'))),
  /** A frost crystal. Cold Room. */
  snowflake: svg(24, 24, stroked(1.8, snowflake(12, 12, 10))),
  /** Three bubbles, unhurried. Peat. */
  bubbles: svg(24, 24, stroked(1.8, circle(9.5, 14.5, 5) + circle(17.5, 7, 3) + circle(18, 18, 2))),
  /** A printer's registration mark. Settled Account. */
  registration: svg(24, 24, stroked(1.6, circle(12, 12, 5.5) + path('M12 1V23M1 12H23'), " stroke-linecap='butt'")),
  /** A sparkle. Wrong Colour. */
  sparkle: svg(24, 24, filled(sparkle(12, 12, 11))),
  /** A box, ticked. Requisition. */
  checkbox: svg(24, 24, stroked(1.8, `<rect x='3.5' y='3.5' width='17' height='17'/>`) + stroked(2.4, path('M7.5 12.5L10.8 15.8L16.8 8.2'))),
  /** Nil, struck through. Assets Realised. */
  nil: svg(24, 24, stroked(1.9, circle(12, 12, 7.5) + path('M4.5 19.5L19.5 4.5'))),
  /** A seedling. Good Ground. */
  sprout: svg(
    24,
    24,
    stroked(2, path('M12 22V11')) +
      filled(path('M12 15C8 15 4.5 12 4.5 7.5C9 7.5 12 10.5 12 15Z') + path('M12 12C15.5 12 19.5 9 19.5 4.5C15 4.5 12 7.5 12 12Z')),
  ),
  /** A pennant, swallow-tailed. Past the Border. */
  pennant: svg(24, 24, stroked(2, path('M6 2.5V21.5')) + filled(path('M7 3.5L20.5 7.5L15.5 10L20.5 12.5L7 16Z'))),
  /** A spiral, going down. Underneath. */
  spiral: svg(24, 24, stroked(1.8, spiral(12, 12, 10, 2.6))),
  /** A pen nib, slit and pierced. Correspondence. */
  nib: svg(
    24,
    24,
    filled(path('M12 22.5L6.5 11L9 2H15L17.5 11ZM12 9.3A1.7 1.7 0 1 0 12 12.7A1.7 1.7 0 1 0 12 9.3ZM11.55 13.5H12.45V21.2H11.55Z'), " fill-rule='evenodd'"),
  ),
  /** A coin. The Final Number. */
  coin: svg(24, 24, stroked(1.7, circle(12, 12, 9)) + stroked(1.2, circle(12, 12, 5.2))),
  /** An open eye. The Chair. */
  eye: svg(24, 24, stroked(1.7, path('M1.5 12C5.5 5.5 18.5 5.5 22.5 12C18.5 18.5 5.5 18.5 1.5 12Z')) + filled(circle(12, 12, 3.3))),
  /** An acorn. The Eldest Oak. */
  acorn: svg(
    24,
    24,
    filled(path('M4 10.5C4 5.5 20 5.5 20 10.5Z') + path('M11.2 2H12.8V6H11.2Z') + path('M6 11.7H18C18 17 14.5 21.5 12 22.5C9.5 21.5 6 17 6 11.7Z')),
  ),
  /** A crown. The Crown. */
  crown: svg(24, 24, filled(path('M3 18L2.5 7L8 11.5L12 4L16 11.5L21.5 7L21 18Z') + path('M3 19.5H21V21.5H3Z'))),
  /** The sun, which is out. Ordinary Weather. */
  sun: svg(
    24,
    24,
    filled(circle(12, 12, 4.2)) +
      stroked(
        1.8,
        path(
          Array.from({ length: 8 }, (_, k) => {
            const a = rad(k * 45);
            return `M${n(12 + 6.6 * Math.cos(a))} ${n(12 + 6.6 * Math.sin(a))}L${n(12 + 10.2 * Math.cos(a))} ${n(12 + 10.2 * Math.sin(a))}`;
          }).join(''),
        ),
      ),
  ),
  /** A flame with a hollow heart. Kept Vigil. */
  flame: svg(
    24,
    24,
    filled(
      path(
        'M12 1.5C16.5 6.5 19 10.5 17.5 15.5C16.5 19.5 14 21.5 12 21.5C10 21.5 7.5 19.5 6.5 15.5C5 10.5 7.5 6.5 12 1.5Z' +
          'M12 10C14 12.5 14.6 15 13.6 17C13 18.4 11 18.4 10.4 17C9.4 15 10 12.5 12 10Z',
      ),
      " fill-rule='evenodd'",
    ),
  ),
} satisfies Record<ShapeId, string>;

/**
 * SVG markup as a CSS `url()`.
 *
 * Percent-encodes only what CSS or the URL parser would trip over (`%`, `#`,
 * `<`, `>`) rather than base64, which is longer and unreadable in a diff.
 */
export function svgDataUri(markup: string): string {
  const encoded = markup
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/"/g, "'");
  return `url("data:image/svg+xml,${encoded}")`;
}

/**
 * The whole of `ornaments.css`, as `npm run ornaments` writes it.
 *
 * Deterministic and dependency-free so the test can call it and compare.
 */
export function renderOrnamentsCss(): string {
  const lines = [
    '/**',
    ' * GENERATED by `npm run ornaments` from src/theme/ornamentShapes.ts — do not',
    ' * edit by hand; `ornaments.test.ts` fails if this file and the source disagree.',
    ' *',
    ' * Colourless mask shapes. A theme points at one by name from its block in',
    ' * tokens.css (`--ew-motif: var(--ew-shape-masonry)`); the colour comes from',
    ' * whatever paints through the mask, which is always a theme surface token.',
    ' */',
    '',
    ':root {',
  ];
  for (const id of SHAPE_IDS) {
    lines.push(`  ${shapeVarName(id)}: ${svgDataUri(SHAPES[id])};`);
  }
  lines.push('}', '');
  return lines.join('\n');
}
