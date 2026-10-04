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
 *     default silently strand every theme above it.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EndingId } from '../types';
import { endings } from '../content/endings';
import { contrastRatio } from './contrast';
import { deltaEOK, JND_OK, over } from './oklab';
import { shapeKind, SHAPE_IDS, type ShapeId } from './ornaments';
import {
  DEFAULT_THEME_ID,
  isThemeId,
  isThemeUnlocked,
  ORNAMENT_VARS,
  THEMES,
  themeFor,
  themeVars,
  unlockedThemeIds,
  swatchBands,
} from './themes';
import { ink, ornament, surface } from './tokens';

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

describe('themes · constraint 3, the CSS mirrors the TypeScript', () => {
  for (const theme of THEMES) {
    if (theme.id === DEFAULT_THEME_ID) continue;

    it(`${theme.name}'s block agrees with its definition token for token`, () => {
      const block = cssBlockFor(theme.id);
      expect(block, `no [data-theme='${theme.id}'] block in tokens.css`).not.toBeNull();

      const expected = themeVars(theme);
      // Compare case-insensitively: CSS is conventionally lowercase and the TS
      // has a few uppercase hexes carried over from `tokens.ts`.
      const norm = (r: Record<string, string>) =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.toLowerCase()]));

      expect(norm(block!)).toEqual(norm(expected));
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
  /** Rough hue spread of a hex, 0-360, ignoring near-greys. */
  function hue(hex: string): number | null {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
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

  for (const theme of THEMES) {
    it(`${theme.name}'s surfaces sit in one hue family`, () => {
      const hues = Object.values(theme.surface)
        .map((v) => hue(v))
        .filter((h): h is number => h !== null);
      if (hues.length < 2) return;

      // Spread on the hue circle, taking the shorter way round.
      const spread = Math.max(
        ...hues.flatMap((a) =>
          hues.map((b) => {
            const d = Math.abs(a - b) % 360;
            return d > 180 ? 360 - d : d;
          }),
        ),
      );
      // The Sword and New Management deliberately carry a red rule against
      // warm-brown surfaces, which is a wider family than the rest — but a
      // theme spanning more than a quadrant has stopped being one hue.
      expect(spread).toBeLessThanOrEqual(90);
    });
  }
});

describe('themes · constraint 7, ornament brings no colour and costs the ink nothing', () => {
  const FLOOR = contrastRatio(ink.base, surface.panel);

  it('the :root ornament agrees with tokens.ts, as every theme block agrees with its theme', () => {
    // The default has no block of its own (it IS :root), so the sync test
    // above never looks at it. Without this, the default's wallpaper could
    // drift between the two files with nothing failing.
    const root = declarationsFrom(CSS.indexOf(':root {'));
    for (const [key, name] of Object.entries(ORNAMENT_VARS)) {
      expect(root[name], name).toBe(String(ornament[key as keyof typeof ornament]));
    }
  });

  for (const theme of THEMES) {
    it(`${theme.name}'s wallpaper leaves the ink as readable as a panel would`, () => {
      // The wallpaper is `--ew-line-strong` drawn over `--ew-void` at
      // `motifOpacity`, and text sits straight on the void on the run screen
      // and the title. At the pattern's densest pixel the room is that
      // composite, so that is the colour the ink is measured against.
      const { motif, motifOpacity } = theme.ornament;
      const voidc = theme.surface.void ?? surface.void;
      const strong = theme.surface.lineStrong ?? surface.lineStrong;
      const base = theme.ink?.base ?? ink.base;
      if (motif === 'none') return;
      expect(motifOpacity).toBeGreaterThan(0);
      expect(contrastRatio(base, over(voidc, strong, motifOpacity))).toBeGreaterThanOrEqual(FLOOR);
    });

    it(`${theme.name}'s light and trim never reach for the scarce colours`, () => {
      // `light` and `trim` are free CSS, which is the one place a theme could
      // name `--ew-tier` without the type system noticing.
      for (const css of [theme.ornament.light, theme.ornament.trim]) {
        expect(css).not.toMatch(/--ew-tier|--ew-legendary|--ew-danger/);
        expect(css, 'a hex literal is a colour the palette does not own').not.toMatch(/#[0-9a-f]{3,8}\b/i);
      }
    });

    it(`${theme.name}'s card trim colours itself from tokens or plain light and shade`, () => {
      // A trim sits on every card, so it is held tighter than the key light:
      // any rgba() in it must be black or white, never a tint.
      for (const rgba of theme.ornament.trim.match(/rgba?\([^)]*\)/g) ?? []) {
        expect(rgba).toMatch(/^rgba?\(\s*(0,\s*0,\s*0|255,\s*255,\s*255)\s*[,)]/);
      }
    });

    it(`${theme.name}'s key light stays a breath, not a lamp`, () => {
      // 0.07 is the brightest light any theme shipped with before ornament
      // became a token (Wrong Colour's, from outside the frame). White on the
      // one light room is the exception: it RAISES that room's contrast.
      for (const rgba of theme.ornament.light.match(/rgba\([^)]*\)/g) ?? []) {
        const alpha = Number(rgba.slice(rgba.lastIndexOf(',') + 1, -1));
        const isWhite = /^rgba\(255,\s*255,\s*255,/.test(rgba);
        const voidc = theme.surface.void ?? surface.void;
        const lightRoom = contrastRatio(voidc, '#000000') > contrastRatio(voidc, '#ffffff');
        if (isWhite && lightRoom) continue;
        expect(alpha, rgba).toBeLessThanOrEqual(0.07);
      }
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
      const motif = theme.ornament.motif.match(/--ew-shape-([a-z0-9-]+)/)?.[1] as ShapeId | undefined;
      const pip = theme.ornament.pip.match(/--ew-shape-([a-z0-9-]+)/)?.[1] as ShapeId;
      if (motif) expect(shapeKind(motif)).toBe('pattern');
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
