/**
 * Bind a theme to a screen subtree.
 *
 * The sibling of `tierVars` and the same shape of thing: the meta screens are
 * presentational and must not reach for app state, so each one is handed the
 * id it should wear and puts the switch on its own root. The token overrides
 * themselves live in `tokens.css` under `[data-theme='…']`, so the attribute
 * is the whole mechanism — no component knows what a theme contains
 * (constraint 3).
 *
 * The DEFAULT theme returns no attribute at all, deliberately. `default` is
 * `:root`, so there is nothing to override back to where it started, and an
 * empty `data-theme=""` in the DOM would be a switch that looks thrown and is
 * not. `data-lich` used `undefined` for its off state for the same reason.
 */

import type { ThemeId } from '../../types';
import { DEFAULT_THEME_ID } from '../../theme/themes';

export type ThemeAttr = { 'data-theme'?: string };

export function themeAttr(id: ThemeId): ThemeAttr {
  return id === DEFAULT_THEME_ID ? {} : { 'data-theme': id };
}
