/**
 * Public surface of the meta (set-piece) component layer.
 *
 * Everything here is presentational: props in, JSX out. Nothing imports the
 * engine, nothing reads app state, nothing writes to localStorage.
 */

export { ArtifactCard } from './ArtifactCard';
export type { ArtifactCardProps } from './ArtifactCard';

export { ArtifactGrid } from './ArtifactGrid';
export type { ArtifactGridEntry, ArtifactGridProps } from './ArtifactGrid';

export { LairGrid } from './LairGrid';
export type { LairGridProps } from './LairGrid';

export { StatBlock } from './StatBlock';
export type { Stat, StatBlockProps } from './StatBlock';

export { EndingSlot } from './EndingSlot';
export type { EndingSlotProps } from './EndingSlot';

export { Sigil } from './Sigil';
export type { SigilProps } from './Sigil';

export { ArtifactGlyph, LairGlyph, FactionGlyph, EndingGlyph, CornerMarks, Flourish } from './glyphs';

export { lairTenures, roman } from './tenure';
export type { LairTenure } from './tenure';

export { formatEffect, formatEffects, isNegative, signed } from './effectText';
export type { EffectContext } from './effectText';

export { attributionFor, attributionLabelFor, ATTRIBUTION_LABEL } from './attribution';
export type { AttributionContext } from './attribution';

export { tierVars, tierOf, peakNotoriety } from './tierVars';
export type { TierVars } from './tierVars';

export { themeAttr } from './themeAttr';
export type { ThemeAttr } from './themeAttr';

export { ThemeSwatch } from './ThemeSwatch';
export type { ThemeSwatchProps } from './ThemeSwatch';

export { buildSigilGeometry, sigilPoint, SIGIL_FIELD } from './sigilGeometry';
export type { SigilGeometry } from './sigilGeometry';

export {
  shareEndingImage,
  renderEndingImage,
  canRenderShareImage,
  preloadShareFonts,
} from './shareImage';
export type { ShareResult, ShareEndingInput } from './shareImage';

export { hashString, makeRng, rngFor, pickInt, pickFrom } from './hash';
