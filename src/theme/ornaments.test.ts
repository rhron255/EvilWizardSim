/**
 * The ornament shapes: fresh, colourless, and actually drawable.
 *
 * Anchoring note (CLAUDE.md failure mode 11): the freshness check compares the
 * COMMITTED `ornaments.css`, read off disk, against what the source would
 * generate now. The two can only agree if someone ran `npm run ornaments`
 * after the last edit — which is the thing being checked, not something the
 * check supplies for itself.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderOrnamentsCss, SHAPES, svgDataUri } from './ornamentShapes';
import { GLYPHS, PATTERNS, SHAPE_IDS, shapeVarName, tileSize, type PatternId } from './ornaments';

const COMMITTED = readFileSync(resolve(process.cwd(), 'src/theme/ornaments.css'), 'utf8');
const ids = SHAPE_IDS;

describe('ornaments.css', () => {
  it('is what `npm run ornaments` would write today', () => {
    expect(COMMITTED, 'ornaments.css is stale — run `npm run ornaments`').toBe(renderOrnamentsCss());
  });

  it('publishes every shape exactly once', () => {
    for (const id of ids) {
      expect(COMMITTED.split(`${shapeVarName(id)}:`).length - 1, id).toBe(1);
    }
  });

  it('defines nothing but shapes — no tokens, no tier, no colour', () => {
    // The file is generated, but it is also a stylesheet the browser loads
    // ahead of tokens.css; if it ever set a real token it would be overriding
    // the palette from outside the theme system.
    const names = [...COMMITTED.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]);
    expect(names).toHaveLength(ids.length);
    for (const name of names) expect(name).toMatch(/^--ew-shape-/);
  });
});

describe('shapes are colourless masks', () => {
  for (const id of ids) {
    const svg = SHAPES[id];

    it(`${id} paints only in black, so the colour comes from the theme`, () => {
      // A mask reads alpha, not hue, so any colour here would be invisible —
      // but a shape that named one would be a shape someone expected to see
      // in that colour, i.e. an accent trying to get in. Black or nothing.
      const paints = [...svg.matchAll(/(?:fill|stroke)='([^']*)'/g)].map((m) => m[1]);
      expect(paints.length).toBeGreaterThan(0);
      for (const paint of paints) expect(['black', 'none']).toContain(paint);
      expect(svg).not.toMatch(/#[0-9a-f]{3,8}|rgb|hsl|currentColor/i);
    });

    it(`${id} is well-formed XML, so the browser draws it at all`, () => {
      // An image that fails to parse is not an error anywhere a player or a
      // console would see it: the mask is simply empty and the wallpaper or
      // glyph silently is not there. A duplicated attribute did exactly that
      // to eight shapes before this check existed.
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
      expect(doc.documentElement.nodeName).toBe('svg');
      for (const el of Array.from(doc.getElementsByTagName('*'))) {
        const names = el.getAttributeNames();
        expect(new Set(names).size, `${el.nodeName} repeats an attribute`).toBe(names.length);
      }
      expect(svg.match(/<[a-z]+ [^>]*?(\b[\w-]+)='[^']*'[^>]*?\s\1='/), 'duplicate attribute').toBeNull();
    });

    it(`${id} is a self-contained SVG the URL encoder can carry`, () => {
      expect(svg.startsWith("<svg xmlns='http://www.w3.org/2000/svg'")).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      // Double quotes would end the CSS url("…") early.
      expect(svg).not.toContain('"');
      // No NaN or Infinity from a helper's arithmetic — the shape would
      // silently draw nothing.
      expect(svg).not.toMatch(/NaN|Infinity|undefined/);
      const uri = svgDataUri(svg);
      expect(uri).toMatch(/^url\("data:image\/svg\+xml,%3Csvg /);
      expect(uri.slice(5, -2)).not.toMatch(/[<>#"]/);
    });
  }

  it('draws every pattern on exactly the tile a theme will declare for it', () => {
    // `tileSize` (what the theme puts in --ew-motif-size) and the drawing's own
    // viewBox both come from PATTERNS; this is the check that the drawing
    // really used it, so a tile can never stretch its pattern.
    for (const id of Object.keys(PATTERNS) as PatternId[]) {
      const [w, h] = PATTERNS[id];
      expect(SHAPES[id], id).toContain(`width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'`);
      expect(tileSize(id)).toBe(`${w}px ${h}px`);
    }
  });

  it('draws every glyph on the same 24-unit square', () => {
    // The card corners and section rules size a glyph by a fixed box; a glyph
    // drawn on any other grid would come out a different size from the rest.
    for (const id of GLYPHS) expect(SHAPES[id], id).toContain("viewBox='0 0 24 24'");
  });
});
