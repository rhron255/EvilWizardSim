/**
 * Effect → player-facing prose.
 *
 * The creation screen has to show each origin's starting modifier, and the
 * contract says effects are structured data, never prose. This is the renderer
 * for the meta screens. It is deliberately dumb: one line per effect, signed
 * magnitude first where there is one, so a column of them reads like a receipt.
 *
 * NOTE: `src/components/run/**` has the richer renderer (`describeEffect`,
 * which splits the magnitude off into its own column). This one stays because
 * the meta screens want a flat string, but the two MUST agree on wording and
 * capitalization — see the convention documented in run/effectText.ts:
 * tracked stats are Title Cased proper nouns, everything else is sentence
 * case, and `·` is the only separator. Anything with a single authored
 * phrasing is imported from there rather than retyped.
 */

import type { Artifact, Effect, Faction } from '../../types';
import { LICH_LINE } from '../run/effectText';

export type EffectContext = {
  artifacts?: Artifact[];
  factions?: Faction[];
};

const MINUS = '−';

/** Signed magnitude with a real minus sign, for tabular columns. */
export function signed(v: number): string {
  return v < 0 ? `${MINUS}${Math.abs(v)}` : `+${v}`;
}

function factionName(id: string, ctx: EffectContext): string {
  return ctx.factions?.find((f) => f.id === id)?.name ?? id;
}

function artifactName(id: string, ctx: EffectContext): string {
  return ctx.artifacts?.find((a) => a.id === id)?.name ?? 'a relic';
}

/** "a Gilded Hand relic", not "a The Gilded Hand relic". Mirrors run/effectText. */
function factionAdjectival(id: string, ctx: EffectContext): string {
  return factionName(id, ctx).replace(/^The\s+/i, '');
}

/** True when the effect moves a number the wrong way. Drives tone, not color. */
export function isNegative(e: Effect): boolean {
  switch (e.t) {
    case 'notoriety':
    case 'followers':
    case 'apprentices':
    case 'loyalty':
    case 'lairTier':
      return e.v < 0;
    case 'standing':
      return e.v < 0;
    case 'pactDebt':
    case 'heroThreat':
      return e.v > 0;
    case 'loseArtifact':
      return true;
    /* Lichdom zeroes the relic shelf and the follower count. It buys something
       back, but the *numbers* only move one way, and this flag is about the
       numbers. */
    case 'becomeLich':
      return true;
    default:
      return false;
  }
}

export function formatEffect(e: Effect, ctx: EffectContext = {}): string {
  switch (e.t) {
    case 'notoriety':
      return `${signed(e.v)} Notoriety`;
    case 'followers':
      return `${signed(e.v)} Followers`;
    case 'standing':
      return `${signed(e.v)} Standing · ${factionName(e.factionId, ctx)}`;
    case 'artifact':
      return `Gain ${artifactName(e.artifactId, ctx)}`;
    case 'artifactFrom':
      return e.rarity
        ? `Gain a ${e.rarity} ${factionAdjectival(e.factionId, ctx)} relic`
        : `Gain a ${factionAdjectival(e.factionId, ctx)} relic`;
    case 'loseArtifact':
      return 'Lose a held relic';
    case 'apprentices':
      return `${signed(e.v)} Apprentice${Math.abs(e.v) === 1 ? '' : 's'}`;
    case 'loyalty':
      return `${signed(e.v)} Loyalty`;
    case 'pactDebt':
      return `${signed(e.v)} Pact Debt`;
    case 'heroThreat':
      return `${signed(e.v)} Hero Threat`;
    case 'lairTier':
      return `${signed(e.v)} Lair Tier${Math.abs(e.v) === 1 ? '' : 's'}`;
    case 'becomeLich':
      return LICH_LINE;
    case 'ending':
      return 'Ends the career';
  }
}

export function formatEffects(effects: Effect[], ctx: EffectContext = {}): string[] {
  return effects.map((e) => formatEffect(e, ctx));
}
