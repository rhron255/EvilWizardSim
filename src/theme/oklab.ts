/**
 * OKLab, and the distance between two colours in it.
 *
 * Written for one assertion: that no two themes look alike. WCAG contrast
 * (`contrast.ts`) answers "can I read this?", which is the wrong question for
 * "can I tell these two rooms apart?" — two near-blacks can share a contrast
 * ratio and differ completely in hue. OKLab (Björn Ottosson, 2020) is built so
 * that equal distances look roughly equally different, and CSS Color 4 adopts
 * it for exactly this job: its gamut-mapping algorithm treats a `deltaEOK` of
 * 0.02 as the just-noticeable difference (`JND` in CSS Color 4 §13.2). That
 * constant is the anchor the distinctness test is measured against.
 */

import { parseHex, type Rgb } from './contrast';

/** One sRGB channel, 0-255, to linear light (the sRGB transfer function). */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** `#rrggbb` to OKLab `[L, a, b]`, L from 0 (black) to 1 (white). */
export function oklab(hex: string): [number, number, number] {
  const [r, g, b] = parseHex(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Euclidean distance in OKLab — CSS Color 4's `deltaEOK`. */
export function deltaEOK(a: string, b: string): number {
  const [l1, a1, b1] = oklab(a);
  const [l2, a2, b2] = oklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** The just-noticeable difference CSS Color 4 uses for `deltaEOK`. */
export const JND_OK = 0.02;

/**
 * `top` composited over `bottom` at `alpha`, both opaque — normal blending in
 * sRGB, which is what a browser does with `opacity` on a solid layer.
 */
export function over(bottom: string, top: string, alpha: number): string {
  const lo = parseHex(bottom);
  const hi = parseHex(top);
  return (
    '#' +
    lo
      .map((c, i) =>
        Math.round(c * (1 - alpha) + hi[i] * alpha)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

/**
 * `top` composited over `bottom` at `alpha`, in exact arithmetic: `over`
 * without the rounding to a level. A browser rounds, and dithers its
 * gradients, in ways `over` cannot reproduce, so the bare-room model
 * composites exactly and allows for the browser's spread in one stated
 * margin instead (`themes.test.ts`, `PAINT_SLACK`).
 */
export function overRgb(bottom: Rgb, top: Rgb, alpha: number): Rgb {
  const mix = (i: 0 | 1 | 2) => bottom[i] * (1 - alpha) + top[i] * alpha;
  return [mix(0), mix(1), mix(2)];
}
