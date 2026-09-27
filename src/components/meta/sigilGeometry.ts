/**
 * The sigil's geometry, separated from its rendering.
 *
 * Two renderers consume this: the inline SVG `<Sigil>` in the UI, and the
 * canvas painter in `shareImage.ts`. They must agree exactly — a player whose
 * share image carries a different mark from the one on their ending card would
 * notice immediately, and it would read as a bug in the game rather than in the
 * export.
 */

import { hashString, makeRng, pickInt } from './hash';

/** All geometry is authored on a 200×200 field, centred at (100, 100). */
export const SIGIL_FIELD = 200;
const CX = 100;
const CY = 100;

export type Point = { x: number; y: number };

export type SigilGeometry = {
  rotation: number;
  vertices: number;
  step: number;
  starRadius: number;
  ticks: { inner: Point; outer: Point }[];
  nodes: (Point & { r: number })[];
  starEdges: { a: Point; b: Point }[];
  innerPolygon: Point[];
  centreMarks: { a: Point; b: Point }[];
  dashOuter: [number, number];
  dashInner: [number, number];
  arcs: { start: number; sweep: number; radius: number }[];
};

export function sigilPoint(radius: number, angleDeg: number): Point {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
}

export function buildSigilGeometry(name: string): SigilGeometry {
  const seed = hashString(name.trim().toLowerCase() || 'nameless');
  const rng = makeRng(seed);

  const rotation = pickInt(rng, 0, 71) * 5;
  const vertices = pickInt(rng, 5, 11);
  const step = pickInt(rng, 2, Math.max(2, Math.floor(vertices / 2)));
  const tickCount = pickInt(rng, 3, 9) * 4;
  const innerSides = pickInt(rng, 3, 6);

  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const angle = rotation + (360 / tickCount) * i;
    const long = i % Math.max(2, Math.round(tickCount / 8)) === 0;
    return { inner: sigilPoint(long ? 74 : 79, angle), outer: sigilPoint(85, angle) };
  });

  const starRadius = 62;
  // Draw every chord rather than tracing one loop, so non-coprime {v/k} pairs
  // still close into a complete figure instead of a fragment.
  const starEdges = Array.from({ length: vertices }, (_, i) => ({
    a: sigilPoint(starRadius, rotation + (360 / vertices) * i),
    b: sigilPoint(starRadius, rotation + (360 / vertices) * ((i + step) % vertices)),
  }));

  const nodes = Array.from({ length: vertices }, (_, i) => ({
    ...sigilPoint(starRadius, rotation + (360 / vertices) * i),
    r: i % 2 === 0 ? 3.1 : 2.1,
  }));

  const innerPolygon = Array.from({ length: innerSides }, (_, i) =>
    sigilPoint(34, rotation + 180 / innerSides + (360 / innerSides) * i),
  );

  const arcStart = pickInt(rng, 0, 359);
  const sweep = pickInt(rng, 40, 110);
  const arcs = [0, 180].map((offset) => ({ start: arcStart + offset, sweep, radius: 91 }));

  const centreAngle = pickInt(rng, 0, 179);
  const bars = pickInt(rng, 2, 3);
  const centreMarks = Array.from({ length: bars }, (_, i) => {
    const angle = centreAngle + (180 / bars) * i;
    return { a: sigilPoint(15, angle), b: sigilPoint(15, angle + 180) };
  });

  return {
    rotation,
    vertices,
    step,
    starRadius,
    ticks,
    nodes,
    starEdges,
    innerPolygon,
    centreMarks,
    dashOuter: [pickInt(rng, 2, 5), pickInt(rng, 4, 9)],
    dashInner: [pickInt(rng, 10, 26), pickInt(rng, 5, 12)],
    arcs,
  };
}
