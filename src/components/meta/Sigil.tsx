/**
 * The wizard's seal.
 *
 * A procedural inline SVG derived deterministically from the wizard's name —
 * same name, same mark, every time, here and on the share canvas. There are no
 * image assets in this game; this is the thing that has to carry the "someone
 * designed this" weight on the title, creation and ending screens.
 *
 * Construction: two outer rings, a ring of ticks, a star polygon {V/K}, nodes at
 * each vertex, an inner ring, an inner regular polygon and a small centre mark.
 * Every count and angle comes out of the name's hash — see `sigilGeometry.ts`.
 */

import { useMemo } from 'react';
import { buildSigilGeometry, SIGIL_FIELD } from './sigilGeometry';
import styles from './Sigil.module.css';

export type SigilProps = {
  /** The string the mark is derived from. */
  name: string;
  /** Rendered pixel size. The geometry is authored on a 200×200 field. */
  size?: number;
  className?: string;
  /** Slow continuous rotation — set pieces only. */
  spin?: boolean;
  /** Drop the tier accent and draw the whole mark in ink. */
  muted?: boolean;
  /** Accessible name. Omit to mark the SVG decorative. */
  title?: string;
};

function path(points: { x: number; y: number }[], close = true): string {
  return (
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') +
    (close ? ' Z' : '')
  );
}

export function Sigil({ name, size = 180, className, spin, muted, title }: SigilProps) {
  const g = useMemo(() => buildSigilGeometry(name), [name]);
  const accent = muted ? 'var(--ew-ink-faint)' : 'var(--ew-tier)';
  const classes = [styles.sigil, spin ? styles.spin : '', className].filter(Boolean).join(' ');

  const arcPaths = useMemo(
    () =>
      g.arcs.map((arc) => {
        const from = { ...arcPoint(arc.radius, arc.start) };
        const to = { ...arcPoint(arc.radius, arc.start + arc.sweep) };
        const large = arc.sweep > 180 ? 1 : 0;
        return `M${from.x.toFixed(2)} ${from.y.toFixed(2)} A${arc.radius} ${arc.radius} 0 ${large} 1 ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
      }),
    [g.arcs],
  );

  const half = SIGIL_FIELD / 2;

  return (
    <svg
      className={classes}
      width={size}
      height={size}
      viewBox={`0 0 ${SIGIL_FIELD} ${SIGIL_FIELD}`}
      fill="none"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {/* Rim */}
      <circle cx={half} cy={half} r={95} stroke="var(--ew-line-strong)" strokeWidth={1} />
      <circle
        cx={half}
        cy={half}
        r={88}
        stroke="var(--ew-line-strong)"
        strokeWidth={1}
        strokeDasharray={g.dashOuter.join(' ')}
        opacity={0.85}
      />
      {arcPaths.map((d, i) => (
        <path key={`arc-${i}`} d={d} stroke={accent} strokeWidth={1.4} opacity={0.55} strokeLinecap="round" />
      ))}

      {/* Ticks */}
      <g stroke="var(--ew-ink-ghost)" strokeWidth={1}>
        {g.ticks.map((t, i) => (
          <line key={`tick-${i}`} x1={t.inner.x} y1={t.inner.y} x2={t.outer.x} y2={t.outer.y} />
        ))}
      </g>

      {/* Field */}
      <circle cx={half} cy={half} r={68} stroke="var(--ew-line)" strokeWidth={1} />
      <circle
        cx={half}
        cy={half}
        r={62}
        stroke="var(--ew-ink-ghost)"
        strokeWidth={1}
        strokeDasharray={g.dashInner.join(' ')}
        opacity={0.8}
      />

      {/* The figure */}
      <g stroke={accent} strokeWidth={1.5} strokeLinejoin="round" opacity={0.92}>
        {g.starEdges.map((e, i) => (
          <line key={`edge-${i}`} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} />
        ))}
      </g>
      <g fill={accent}>
        {g.nodes.map((n, i) => (
          <circle key={`node-${i}`} cx={n.x} cy={n.y} r={n.r} opacity={i % 2 === 0 ? 0.95 : 0.6} />
        ))}
      </g>

      {/* Core */}
      <circle cx={half} cy={half} r={34} stroke="var(--ew-line-strong)" strokeWidth={1} />
      <path d={path(g.innerPolygon)} stroke={accent} strokeWidth={1.2} opacity={0.65} strokeLinejoin="round" />
      <g stroke="var(--ew-ink-dim)" strokeWidth={1.1} strokeLinecap="round" opacity={0.75}>
        {g.centreMarks.map((m, i) => (
          <line key={`mark-${i}`} x1={m.a.x} y1={m.a.y} x2={m.b.x} y2={m.b.y} />
        ))}
      </g>
      <circle cx={half} cy={half} r={3.4} fill={accent} />
    </svg>
  );
}

function arcPoint(radius: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: SIGIL_FIELD / 2 + radius * Math.cos(a), y: SIGIL_FIELD / 2 + radius * Math.sin(a) };
}
