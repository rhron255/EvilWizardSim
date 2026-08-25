/**
 * The headline stat, and the entire chromatic budget of this screen.
 *
 * Notoriety is the game's ONE rationed color (wiki/06_reference_analysis.md,
 * principle 6). Everything else on the run screen is warm monochrome so that
 * this number carries meaning by itself. Only the Kingdom-Level and Legend
 * crossings animate — `celebrate` comes from `Tier.celebrate`, and every other
 * change is a quiet tick of the digits.
 */

import { useEffect, useState } from 'react';
import { tierColor, tierFor, tierGlow } from '../../theme/tokens';
import styles from './NotorietyBadge.module.css';

export type NotorietyBadgeProps = {
  value: number;
  /** When supplied and different, the digits count up from here. */
  animateFrom?: number;
  /** True only for the two celebrated crossings. */
  celebrate?: boolean;
  /**
   * `lg` stacks label over value over tier — the reward presentation, used on
   * the resolution card and the ending screen.
   *
   * `row` is the same information on one line under 560px, and identical to
   * `lg` above it. The run header needs it because the stacked badge spends
   * ~125px of a 852px phone on a single number, directly above the choice
   * cards it pushes off the fold; the ending card, where the badge IS the
   * moment, keeps `lg`.
   */
  size?: 'sm' | 'row' | 'lg';
};

const COUNT_MS = 680;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function NotorietyBadge({
  value,
  animateFrom,
  celebrate = false,
  size = 'lg',
}: NotorietyBadgeProps) {
  const [display, setDisplay] = useState(() => animateFrom ?? value);

  useEffect(() => {
    if (animateFrom === undefined || animateFrom === value || prefersReducedMotion()) {
      setDisplay(value);
      return;
    }

    const from = animateFrom;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now: number) {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [animateFrom, value]);

  const tier = tierFor(display);
  const style = {
    '--tier': tierColor[tier.id],
    '--tier-glow': tierGlow[tier.id],
  } as React.CSSProperties;

  return (
    <div
      className={styles.badge}
      data-size={size}
      data-celebrate={celebrate ? 'true' : undefined}
      style={style}
    >
      <span className={styles.glow} aria-hidden="true" />
      <span className={styles.label}>Notoriety</span>
      <span className={`${styles.value} ew-num`} aria-label={`Notoriety ${display}`}>
        {display}
      </span>
      <span className={styles.tier} title={tier.line}>
        {tier.name}
      </span>
    </div>
  );
}
