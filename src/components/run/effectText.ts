/**
 * Effect -> readable consequence line.
 *
 * This module is the odds-display guarantee in its most literal form: the
 * `Effect` union is walked exhaustively, so a consequence that exists in the
 * data cannot fail to reach the player's eyes. The `never` check at the bottom
 * of `describeEffect` means adding a member to `Effect` without teaching this
 * function to print it is a type error, not a silently invisible downside.
 *
 * Register, per wiki/02_data_models_and_content-1.md: flavor is comedic, the
 * numbers are straight-faced. Nothing here celebrates.
 *
 * CAPITALIZATION, one rule, applied to every member here and in
 * `components/meta/effectText.ts`:
 *
 *   - A tracked stat is a proper noun and is Title Cased wherever it appears —
 *     `Notoriety`, `Followers`, `Standing`, `Apprentices`, `Loyalty`,
 *     `Pact Debt`, `Hero Threat`, `Lair Tier`.
 *   - Everything else is sentence case: `Gain a rare Gilded Hand relic`,
 *     `Lose a held relic`.
 *   - `·` is the only separator. Never an em dash, never a comma.
 *
 * Without the rule the column reads `+9 Notoriety` next to `−18 standing`,
 * which makes the second one look like a different class of thing.
 */

import { BETRAYAL_MAX_LOYALTY, PACT_LIMIT } from '../../engine';
import type { Artifact, Effect, EndingId, Faction, FactionId, Rarity } from '../../types';
import type { SystemicChange } from './resolution';

/**
 * How a line should be *colored*, which is not the same as its sign.
 * `+1 Pact Debt` is a positive number and a bad day.
 */
export type EffectTone = 'up' | 'down' | 'neutral' | 'grave';

export type EffectLine = {
  /** Signed magnitude, already formatted. Absent for non-numeric effects. */
  num?: string;
  /** The noun phrase that follows the number, or the whole line if there is none. */
  text: string;
  tone: EffectTone;
};

const MINUS = '−'; // U+2212 MINUS SIGN — optically matches the plus, unlike a hyphen.

/**
 * The lichdom price, written once and shared with the meta renderer so the two
 * screens can never disagree about what the player is giving up.
 */
export const LICH_LINE =
  'Become a lich · forfeit every relic and all Followers · Notoriety decay ends';

/** Signed, with a real minus sign. Zero is rare but must not render as "+0". */
export function signed(v: number): string {
  if (v > 0) return `+${v}`;
  if (v < 0) return `${MINUS}${Math.abs(v)}`;
  return '±0';
}

function plural(n: number, one: string, many: string): string {
  return Math.abs(n) === 1 ? one : many;
}

function factionName(id: FactionId, factions: Faction[]): string {
  const f = factions.find((x) => x.id === id);
  if (f) return f.name;
  // Content may not be loaded (fixtures, tests). Degrade to a readable id.
  return titleCase(id);
}

function artifactName(id: string, artifacts: Artifact[]): string {
  const a = artifacts.find((x) => x.id === id);
  return a ? a.name : 'an unnamed relic';
}

export function titleCase(id: string): string {
  return id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Joining words stay lowercase: "Slain by the Chosen One", not "Slain By The". */
const MINOR_WORDS = new Set(['by', 'the', 'in', 'a', 'to', 'of']);

/**
 * Display fallback only. The authored `Ending.name` from the content catalog
 * should win wherever one is available — this exists so an id never leaks to
 * the player as a raw identifier.
 */
export function endingName(id: EndingId): string {
  return id
    .split('_')
    .map((w, i) => (i > 0 && MINOR_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/**
 * Faction name used adjectivally: "a Gilded Hand relic", not "a The Gilded
 * Hand relic". Matches the phrasing in wiki/04_operational_behaviors-1.md.
 */
function factionAdjectival(id: FactionId, factions: Faction[]): string {
  return factionName(id, factions).replace(/^The\s+/i, '');
}

function rarityWord(r: Rarity | undefined): string {
  return r ? `${r} ` : '';
}

/** Directional tone for a stat where "more" is good. */
function good(v: number): EffectTone {
  return v > 0 ? 'up' : v < 0 ? 'down' : 'neutral';
}

/** Directional tone for a stat where "more" is bad — debt, threat. */
function bad(v: number): EffectTone {
  return v > 0 ? 'down' : v < 0 ? 'up' : 'neutral';
}

export function describeEffect(
  effect: Effect,
  artifacts: Artifact[],
  factions: Faction[],
): EffectLine {
  switch (effect.t) {
    case 'notoriety':
      return { num: signed(effect.v), text: 'Notoriety', tone: good(effect.v) };

    case 'followers':
      return {
        num: signed(effect.v),
        text: plural(effect.v, 'Follower', 'Followers'),
        tone: good(effect.v),
      };

    case 'standing':
      return {
        num: signed(effect.v),
        text: `Standing · ${factionName(effect.factionId, factions)}`,
        tone: good(effect.v),
      };

    case 'artifact':
      return { text: `Gain ${artifactName(effect.artifactId, artifacts)}`, tone: 'up' };

    case 'artifactFrom':
      return {
        text: `Gain a ${rarityWord(effect.rarity)}${factionAdjectival(effect.factionId, factions)} relic`,
        tone: 'up',
      };

    case 'loseArtifact':
      return { text: 'Lose a held relic', tone: 'down' };

    case 'apprentices':
      return {
        num: signed(effect.v),
        text: plural(effect.v, 'Apprentice', 'Apprentices'),
        tone: good(effect.v),
      };

    case 'loyalty':
      return { num: signed(effect.v), text: 'Loyalty', tone: good(effect.v) };

    case 'pactDebt':
      return { num: signed(effect.v), text: 'Pact Debt', tone: bad(effect.v) };

    case 'heroThreat':
      return { num: signed(effect.v), text: 'Hero Threat', tone: bad(effect.v) };

    case 'lairTier':
      return {
        num: signed(effect.v),
        text: plural(effect.v, 'Lair Tier', 'Lair Tiers'),
        tone: good(effect.v),
      };

    /**
     * Lichdom is a transformation, not an ending (see the doc comment on
     * `Effect` in src/types.ts), and its price is paid entirely in things the
     * player already owns. Printing only "Become a lich" would be the exact
     * undisclosed downside the whole effect union exists to prevent, so all
     * three consequences are on the line: relics forfeited, followers gone,
     * decay stopped.
     */
    case 'becomeLich':
      return { text: LICH_LINE, tone: 'grave' };

    case 'ending':
      return { text: `The run ends · ${endingName(effect.endingId)}`, tone: 'grave' };

    default: {
      // If this line stops compiling, a member was added to `Effect` and an
      // undisclosed consequence just became authorable. Print it, don't cast it.
      const exhaustive: never = effect;
      return { text: String(exhaustive), tone: 'neutral' };
    }
  }
}

/** Stable React key for an effect at a given position. */
export function effectKey(effect: Effect, index: number): string {
  switch (effect.t) {
    case 'standing':
    case 'artifactFrom':
      return `${index}-${effect.t}-${effect.factionId}`;
    case 'artifact':
      return `${index}-${effect.t}-${effect.artifactId}`;
    case 'ending':
      return `${index}-${effect.t}-${effect.endingId}`;
    default:
      return `${index}-${effect.t}`;
  }
}

// ---------------------------------------------------------------------------
// Era-end systemic changes
// ---------------------------------------------------------------------------

/**
 * A systemic line: the same signed magnitude an effect gets, plus the sentence
 * that says WHO did it and how close it puts the wizard to the threshold.
 *
 * The note is the whole point. A bare `+1 Pact Debt` under the option's own
 * consequences is what produced "the last action I took had nothing to do with
 * pacts" — the number was never the missing piece, the attribution was.
 */
export type SystemicLine = EffectLine & { note: string };

export function describeSystemic(change: SystemicChange): SystemicLine {
  switch (change.t) {
    case 'pactInterest':
      return {
        num: signed(change.v),
        text: 'Pact Debt',
        note:
          change.debt >= PACT_LIMIT
            ? `the Covenant’s interest · ${change.debt} / ${PACT_LIMIT} · the debt is called in`
            : `the Covenant’s interest · ${change.debt} / ${PACT_LIMIT}`,
        tone: 'down',
      };

    case 'loyaltyDrift':
      return {
        num: signed(change.v),
        text: 'Loyalty',
        note:
          change.loyalty <= BETRAYAL_MAX_LOYALTY
            ? `the school has been watching you weaken · at or under ${BETRAYAL_MAX_LOYALTY}% they move`
            : `the school has been watching you weaken · they turn at ${BETRAYAL_MAX_LOYALTY}%`,
        tone: 'down',
      };

    default: {
      // Same guard as `describeEffect`: a new systemic tick that can end a run
      // must be printed, not quietly dropped into the gap this type exists to
      // close.
      const exhaustive: never = change;
      return { num: '', text: String(exhaustive), note: '', tone: 'neutral' };
    }
  }
}

/** Stable React key for a systemic change at a given position. */
export function systemicKey(change: SystemicChange, index: number): string {
  return `${index}-${change.t}`;
}

/** Percentage as the player sees it. Never rounded to 0% or 100%. */
export function formatOdds(odds: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, odds)) * 100);
  return `${Math.min(99, Math.max(1, pct))}%`;
}
