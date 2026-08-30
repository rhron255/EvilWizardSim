/**
 * The contrast maths, checked against values that do not come from it.
 *
 * CLAUDE.md failure mode 11: an assertion anchored to the thing under test
 * grades its own homework. Every expected number below is either a published
 * WCAG figure (black on white is exactly 21:1, a colour against itself is
 * exactly 1:1) or a hand-computable identity — never a value this module
 * produced and was then pinned to.
 */

import { describe, expect, it } from 'vitest';
import { contrastRatio, parseHex, relativeLuminance } from './contrast';

describe('parseHex', () => {
  it('reads six-digit hex with and without the hash', () => {
    expect(parseHex('#ffffff')).toEqual([255, 255, 255]);
    expect(parseHex('000000')).toEqual([0, 0, 0]);
    expect(parseHex('#B4453C')).toEqual([180, 69, 60]);
  });

  it('expands three-digit shorthand the way CSS does', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('#08f')).toEqual([0, 136, 255]);
  });

  it('throws rather than returning a plausible wrong colour', () => {
    expect(() => parseHex('rebeccapurple')).toThrow();
    expect(() => parseHex('#12345')).toThrow();
    expect(() => parseHex('#gggggg')).toThrow();
  });
});

describe('relativeLuminance', () => {
  // The two fixed points of the WCAG definition.
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 10);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 10);
  });

  // The channel weights are the definition, so a pure channel returns its
  // coefficient exactly. Green is the heaviest and blue the lightest — which
  // is why a blue-shifted theme loses more contrast than it looks like it should.
  it('returns the channel coefficients for pure primaries', () => {
    expect(relativeLuminance('#ff0000')).toBeCloseTo(0.2126, 10);
    expect(relativeLuminance('#00ff00')).toBeCloseTo(0.7152, 10);
    expect(relativeLuminance('#0000ff')).toBeCloseTo(0.0722, 10);
  });

  it('uses the linear segment below the 0.03928 knee', () => {
    // #030303 is 3/255 ≈ 0.01176, under the knee, so it is a plain divide by
    // 12.92 with no exponent involved.
    expect(relativeLuminance('#030303')).toBeCloseTo(3 / 255 / 12.92, 10);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white, the published maximum', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 6);
  });

  it('is 1:1 for a colour against itself', () => {
    expect(contrastRatio('#13110E', '#13110E')).toBeCloseTo(1, 10);
  });

  it('does not care which colour is named first', () => {
    expect(contrastRatio('#E4DCC9', '#13110E')).toBeCloseTo(
      contrastRatio('#13110E', '#E4DCC9'),
      10,
    );
  });

  it('agrees with the published 4.5:1 boundary case', () => {
    // #767676 on white is the canonical "exactly passes AA for body text"
    // grey — it appears in the WCAG techniques as 4.54:1.
    expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThan(4.5);
    expect(contrastRatio('#767676', '#ffffff')).toBeLessThan(4.6);
    // One step lighter fails, which is what makes the boundary a boundary.
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.5);
  });
});
