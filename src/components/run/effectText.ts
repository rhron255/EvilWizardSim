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

import { BETRAYAL_MAX_LOYALTY, DEF_LICH } from '../../engine';
import type { Artifact, Effect, EndingId, Faction, FactionId } from '../../types';
import type { SystemicChange } from './resolution';
import { heroApproachLine } from '../../content/heroes';

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
 * The lichdom bill, written once and shared with the meta renderer so the two
 * screens can never disagree about what the player is giving up.
 *
 * The wards clause is new and it was a rule-1 hole: `DEF_LICH` is 60, the
 * single largest defence term in the game — more than the entire ten-rung lair
 * ladder — and the card offering the rite disclosed it NOWHERE. An undisclosed
 * upside is the same defect as an undisclosed downside; the player could not
 * price the trade either way.
 *
 * `DEF_LICH` is interpolated, never written as a literal. Reads as a bill with
 * a rebate: the forfeiture stays adjacent to "Become a lich" and the two gains
 * follow.
 *
 * "Not the end" opens the line (issue #21) because `becomeLich` TRANSFORMS
 * rather than terminates — `checkEndings` still requires reaching the age
 * limit as a lich to land on the `lichdom` ending — and the card's own label
 * used to imply the opposite. A player who reads only this line before
 * committing must still learn the one fact that changes what the choice
 * means.
 */
export const LICH_LINE = `A lich, not the end · forfeit all relics and Followers · Notoriety decay ends · +${DEF_LICH} Wards`;

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
      // A specified rarity prints itself ("a legendary Gilded Hand relic"). An
      // UNspecified one draws rarity-weighted at resolution, so the honest,
      // non-spoiling line names the uncertainty rather than implying a common:
      // "a Gilded Hand relic · random rarity". Resolving the draw here would
      // either spoil the reveal or print a lie (see `PROJECTABLE`).
      return {
        text: effect.rarity
          ? `Gain a ${effect.rarity} ${factionAdjectival(effect.factionId, factions)} relic`
          : `Gain a ${factionAdjectival(effect.factionId, factions)} relic · random rarity`,
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

    /**
     * Dead code by construction (issue #23's rule-1 exception). `goodAct`/
     * `illAct` never reach a renderer: `applyEffects` never pushes either to
     * `EffectApplication.applied`, and `projectEffects` routes them through
     * that same function via `PROJECTABLE` rather than passing them through
     * raw — so neither the resolution card nor the pre-commit offer card
     * ever calls this with one. The case exists only so the exhaustive
     * switch below still compiles. See the doc comment on `Effect` in
     * `types.ts` before assuming this is reachable.
     */
    case 'goodAct':
    case 'illAct':
      return { text: '', tone: 'neutral' };

    case 'vowGoodWizard':
      return {
        text: 'A quiet life, held to the end · the run continues',
        tone: 'up',
      };

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

/**
 * One line for several factions that moved by the SAME amount.
 *
 * `projectEffects` turns one authored `standing` effect into as many as four,
 * because hostility is contagious along `hostileTo`. Printed a row apiece, a
 * single decision to sign with the Choir spent three more rows saying "+5" to
 * three factions the player never named — five rows for one move, on the
 * screen where the phone has the least room.
 *
 * This is a PRESENTATION merge, not a disclosure one: every faction is still
 * named and the number is still printed, so rule 1 is untouched. The reading is
 * the same as the single-faction line it generalises — the number applies to
 * each faction listed, not split between them.
 */
export function describeStandingGroup(
  v: number,
  ids: FactionId[],
  factions: Faction[],
): EffectLine {
  // The article is dead weight in a list — every faction has one, and three
  // of them cost a wrapped line on a 393px screen. `ArtifactCard` drops it for
  // the same reason. The single-faction line keeps its "The": there it is one
  // word, and the name reads as prose rather than as a list.
  const names = ids.map((id) => factionName(id, factions).replace(/^The /, ''));
  return {
    num: signed(v),
    text: `Standing · ${names.join(', ')}`,
    tone: good(v),
  };
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
    case 'heroApproach':
      return {
        num: '',
        // The line IS the payload here, so it goes in `text` where the row's
        // emphasis is. `note` carries the comparison the readout above already
        // shows, so a player who reads only this block still has the numbers.
        text: heroApproachLine(change.band, change.threat * 1000 + change.wards),
        note: `the hero · ${Math.round(change.threat)} against ${Math.round(change.wards)} wards`,
        tone: change.band === 'through' ? 'down' : 'neutral',
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
