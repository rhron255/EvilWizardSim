/**
 * Design tokens — JS side.
 *
 * The single source of truth for every design value the code needs to reason
 * about. `tokens.css` mirrors the surface/text values as `--ew-*` custom
 * properties for stylesheets. Never hardcode a scattered hex in a component;
 * add or reference a token.
 *
 * Governing pillar (wiki/index-1.md #5, wiki/06_reference_analysis.md #6):
 * ONE SCARCE COLOR. The palette is a near-monochrome warm dark. The only real
 * chromatic reward in the entire UI is the Notoriety tier color. Nothing else
 * may compete with it — that is what makes crossing 75 feel like an event.
 */

import type { Tier, TierId } from '../types';

// ---------------------------------------------------------------------------
// Surfaces & ink — deliberately desaturated. Warm black, not blue black.
// ---------------------------------------------------------------------------

export const surface = {
  /** Page backdrop. */
  void: '#0B0A09',
  /** Raised panel. */
  panel: '#13110E',
  /** Panel, one step up (cards, ledger header). */
  raised: '#1A1712',
  /** Interactive hover. */
  hover: '#221E17',
  /** Hairline rules and card borders. */
  line: '#282219',
  /** Stronger border on focus/active. */
  lineStrong: '#3C3427',
} as const;

export const ink = {
  /** Primary reading text. Warm parchment, never pure white. */
  bright: '#F2ECDD',
  base: '#E4DCC9',
  /** Secondary text, ledger body. */
  dim: '#9A8F7C',
  /** Tertiary — column headers, aged ledger rows. */
  faint: '#6A6153',
  /** Barely there — disabled, silhouettes. */
  ghost: '#453F35',
} as const;

/**
 * The one non-tier accent, used only for hero threat and decline-phase
 * pressure. Desaturated on purpose so it never reads brighter than gold.
 */
export const danger = '#B4453C';

/** Positive/negative deltas in the ledger. Muted; the numbers are not a party. */
export const delta = {
  up: '#7C9A6B',
  down: '#B4453C',
  none: '#6A6153',
} as const;

// ---------------------------------------------------------------------------
// The scarce color — Notoriety tiers
// ---------------------------------------------------------------------------

export const tierColor: Record<TierId, string> = {
  unknown: '#7A7365',
  local_menace: '#8494A6',
  named_threat: '#C08040',
  kingdom: '#9B6BE8',
  legend: '#E8B93F',
};

/**
 * Legendary relics — the CSS side is `--ew-legendary` in tokens.css.
 *
 * Deliberately the SAME value as `tierColor.legend`: the Legend tier and a
 * legendary relic share a name, so they share a colour. It is pinned rather
 * than read from `--ew-tier`, which is set per-tier at runtime — a legendary
 * won at low Notoriety would otherwise have drawn its edge in the Unknown
 * tier's muted grey, i.e. no signal at the exact moment it was won.
 *
 * If `tierColor.legend` ever moves, move this and `--ew-legendary` with it.
 */
export const legendaryColor = tierColor.legend;

/** Glow color used for the two celebrated crossings only. */
export const tierGlow: Record<TierId, string> = {
  unknown: 'rgba(122, 115, 101, 0.0)',
  local_menace: 'rgba(132, 148, 166, 0.0)',
  named_threat: 'rgba(192, 128, 64, 0.18)',
  kingdom: 'rgba(155, 107, 232, 0.34)',
  legend: 'rgba(232, 185, 63, 0.40)',
};

/**
 * Thresholds are starting guesses per the wiki, tuned against simulated runs.
 * Only `kingdom` and `legend` celebrate — see wiki/02_data_models_and_content-1.md.
 */
export const TIERS: Tier[] = [
  {
    id: 'unknown',
    name: 'Unknown',
    min: 0,
    max: 39,
    line: 'The villagers do not know your name.',
    celebrate: false,
  },
  {
    id: 'local_menace',
    name: 'Local Menace',
    min: 40,
    max: 59,
    line: 'Three hamlets have complained.',
    celebrate: false,
  },
  {
    id: 'named_threat',
    name: 'Named Threat',
    min: 60,
    max: 74,
    line: 'You appear in a ledger of dangers.',
    celebrate: false,
  },
  {
    id: 'kingdom',
    name: 'Kingdom-Level',
    min: 75,
    max: 89,
    line: 'The Crownlands have opened a file on you.',
    celebrate: true,
  },
  {
    id: 'legend',
    name: 'Legend',
    min: 90,
    max: 99,
    line: 'Mothers use your name to end arguments.',
    celebrate: true,
  },
];

export function tierFor(notoriety: number): Tier {
  const n = Math.max(0, Math.min(99, Math.round(notoriety)));
  // Walk from the top so the highest matching band wins.
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (n >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const font = {
  /** Big moments only: wizard name, prophecy, ending card, section titles. */
  display: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  /** Everything else. Loaded with tabular figures for the ledger. */
  ui: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

/** Modular scale, 1.25 ratio, rem. */
export const size = {
  xs: '0.6875rem',
  sm: '0.8125rem',
  base: '0.9375rem',
  md: '1.0625rem',
  lg: '1.375rem',
  xl: '1.875rem',
  xxl: '2.75rem',
  display: '4rem',
} as const;

// ---------------------------------------------------------------------------
// Space, radius, elevation, motion
// ---------------------------------------------------------------------------

/** 4px base. */
export const space = {
  '0': '0',
  '1': '0.25rem',
  '2': '0.5rem',
  '3': '0.75rem',
  '4': '1rem',
  '5': '1.5rem',
  '6': '2rem',
  '7': '3rem',
  '8': '4rem',
} as const;

export const radius = {
  sm: '3px',
  md: '5px',
  lg: '8px',
  pill: '999px',
} as const;

export const shadow = {
  card: '0 1px 2px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.25)',
  raised: '0 2px 4px rgba(0,0,0,0.5), 0 12px 40px rgba(0,0,0,0.4)',
  overlay: '0 24px 80px rgba(0,0,0,0.7)',
  /** Inset top highlight that makes panels read as lit from above. */
  lip: 'inset 0 1px 0 rgba(255, 246, 224, 0.045)',
} as const;

export const motion = {
  /** Snappy UI feedback. */
  fast: '120ms',
  base: '220ms',
  /** Ledger row append, badge changes. */
  slow: '420ms',
  /** Set pieces only: prophecy, ending reveal. */
  setpiece: '900ms',
  ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const layout = {
  /** The run view is a single centered column. */
  maxWidth: '760px',
  wideMaxWidth: '960px',
} as const;
