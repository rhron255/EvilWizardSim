/** The run-loop UI. Presentational only — props in, JSX out. */

export { EffectList } from './EffectList';
export type { EffectListProps } from './EffectList';

export { OptionCard } from './OptionCard';
export type { OptionCardProps } from './OptionCard';

export { OfferPanel } from './OfferPanel';
export type { OfferPanelProps } from './OfferPanel';

export { NotorietyBadge } from './NotorietyBadge';
export type { NotorietyBadgeProps } from './NotorietyBadge';

export { Masthead } from './Masthead';
export type { MastheadProps } from './Masthead';

export { FactionStandings } from './FactionStandings';
export type { FactionStandingsProps } from './FactionStandings';

export { DecisionPanel } from './DecisionPanel';
export type { DecisionPanelProps } from './DecisionPanel';

export { FirstRunGuide } from './FirstRunGuide';
export type { FirstRunGuideProps } from './FirstRunGuide';

export { ResolutionOverlay } from './ResolutionOverlay';
export type { ResolutionOverlayProps } from './ResolutionOverlay';

export type { Resolution } from './resolution';

/* `App` derives the siege beside the wards readout it is built from, so this
   is the one thing outside `run/` that reaches into `stakes`. Everything else
   there is `DecisionPanel`'s own business and is imported directly. */
export { siegeFor } from './stakes';
export type { Siege } from './stakes';

export { describeEffect, effectKey, endingName, formatOdds, signed } from './effectText';
export type { EffectLine, EffectTone } from './effectText';
