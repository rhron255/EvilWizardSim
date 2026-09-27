/**
 * WCAG relative luminance and contrast ratio.
 *
 * Written because themes need a contrast FLOOR that is asserted rather than
 * eyeballed. Every theme rotates the hue and temperature of the same warm-dark
 * structure, and the failure mode that rotation invites is a palette that
 * looks atmospheric in a swatch and is unreadable at body-text size — the kind
 * of defect a screenshot cannot settle (CLAUDE.md failure mode 7) and a
 * designer's eye reliably forgives.
 *
 * The formula is the standard one from WCAG 2.x: sRGB channels linearised,
 * weighted 0.2126 / 0.7152 / 0.0722, and the ratio taken as
 * `(lighter + 0.05) / (darker + 0.05)`.
 */

/** `#rgb` / `#rrggbb`, with or without the hash. */
export function parseHex(hex: string): [number, number, number] {
  const raw = hex.trim().replace(/^#/, '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a hex colour: ${hex}`);
  }
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** One sRGB channel, 0-255, linearised to 0-1. */
function linearise(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/**
 * WCAG contrast ratio between two colours, 1 (identical) to 21 (black/white).
 *
 * Order-independent, and both colours must be opaque — every token this is
 * used on is a solid hex, and a token that becomes translucent would need this
 * to composite against a backdrop first rather than silently return a number
 * about the wrong pair.
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
