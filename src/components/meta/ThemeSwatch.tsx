/**
 * One theme in the selector.
 *
 * Same rule as the relic grid and the ending slots: every theme is visible
 * from run one, and the ones you have not earned withhold their name. A locked
 * swatch shows the HINT of the ending that grants it — the same line the
 * collection's locked slot shows — so the selector doubles as a second view of
 * the near-miss rather than as a wall of grey boxes.
 *
 * The swatch draws its own palette from resolved token values rather than by
 * applying `data-theme` to itself, because a `[data-theme]` element inside a
 * themed page would override the tokens for its whole subtree — the preview
 * would work and the card around it would change colour with it.
 */

import type { ThemeId } from '../../types';
import type { ThemeDef } from '../../theme/themes';
import { swatchBands } from '../../theme/themes';
import styles from './ThemeSwatch.module.css';

export type ThemeSwatchProps = {
  theme: ThemeDef;
  /** Has the granting ending been reached? `default` is always true. */
  unlocked: boolean;
  /** Is this the theme currently worn? */
  selected: boolean;
  /**
   * The locked line: what pressure leads to the ending that grants this.
   * Absent for `default`, which is never locked.
   */
  hint?: string;
  onSelect(id: ThemeId): void;
};

export function ThemeSwatch({ theme, unlocked, selected, hint, onSelect }: ThemeSwatchProps) {
  const bands = swatchBands(theme);

  const classes = [
    styles.swatch,
    unlocked ? styles.unlocked : styles.locked,
    selected ? styles.selected : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      // A locked theme is not a control. Disabling it rather than hiding it
      // keeps the slot visible — the gap is the point — without offering a tap
      // that would do nothing.
      disabled={!unlocked}
      aria-pressed={unlocked ? selected : undefined}
      aria-label={
        unlocked
          ? `${theme.name}${selected ? ', currently worn' : ''}`
          : `A theme you have not unlocked — ${hint ?? 'reach its ending to earn it'}`
      }
      onClick={() => onSelect(theme.id)}
    >
      {/* The palette itself, as four stacked bands. Inline styles because
          these are DATA — eight themes' worth of colours cannot live in a
          stylesheet without restating every palette a second time. */}
      <span className={styles.bands} aria-hidden>
        <span className={styles.band} style={{ background: bands.void }} />
        <span className={styles.band} style={{ background: bands.panel }} />
        <span className={styles.band} style={{ background: bands.line }} />
        <span className={styles.band} style={{ background: bands.ink }} />
      </span>

      <span className={styles.body}>
        {unlocked ? (
          <span className={styles.name}>{theme.name}</span>
        ) : (
          <span className={styles.redaction} aria-hidden />
        )}
        <span className={styles.blurb} data-hint={unlocked ? undefined : 'true'}>
          {unlocked ? theme.blurb : hint}
        </span>
      </span>

      {selected && unlocked ? <span className={styles.worn}>Worn</span> : null}
    </button>
  );
}
