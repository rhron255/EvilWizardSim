/**
 * Relic power → player-facing text (issue #80, slice 3 of #77).
 *
 * THE single source: the relic page, the creation screen's origin rows, and
 * the Necrolexicon's relic cards all render a power through this one
 * function, rather than each growing its own phrasing the way
 * `src/components/run/effectText.ts` and `src/components/meta/effectText.ts`
 * were found to have drifted apart for ordinary effects (issue #44). A
 * `RelicPower` is structured data for exactly this reason — see the doc
 * comment on `Effect` in `src/types.ts` — so the text is DERIVED, never
 * separately authored per relic.
 *
 * One line, phone-width length-capped: `RELIC_POWER_TEXT_MAX`,
 * `scripts/validate-content.ts` enforces it against every authored power.
 */

import type { Condition, Faction, FactionId, RelicEffect, RelicPower } from '../../types';
import { formatEffect } from './effectText';

type TriggerPower = Extract<RelicPower, { kind: 'trigger' }>;

/** Title-Cased display name for a stat a `watchesPositive` can name. */
const STAT_LABELS: Partial<Record<RelicEffect['t'], string>> = {
  notoriety: 'Notoriety',
  followers: 'Followers',
  apprentices: 'Apprentices',
  loyalty: 'Loyalty',
  pactDebt: 'Pact Debt',
  heroThreat: 'Hero Threat',
  lairTier: 'Lair Tier',
};

function statLabel(t: RelicEffect['t']): string {
  return STAT_LABELS[t] ?? t;
}

export type RelicPowerContext = { factions?: Faction[] };

/**
 * PROVENANCE: the same order of magnitude as `DEED_CLIP_WARN`
 * (`scripts/validate-content.ts`, 90) — a different field on a different
 * card, so not literally shared — with headroom for the longest faction name
 * a condition clause can interpolate ("The Ashen Covenant").
 */
export const RELIC_POWER_TEXT_MAX = 100;

function factionName(id: FactionId, ctx: RelicPowerContext): string {
  return ctx.factions?.find((f) => f.id === id)?.name ?? id;
}

/** Every faction name is "The X" — appending a bare `'s` after a name already ending in "s" ("The Crownlands's") reads wrong, so this drops the extra `s`. */
function possessive(name: string): string {
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
}

function effectsText(effects: readonly RelicEffect[], ctx: RelicPowerContext): string {
  return effects.map((e) => formatEffect(e, ctx)).join(', ');
}

/** A short clause completing "if …" — reused for a trigger's own `if`. */
function conditionClause(c: Condition, ctx: RelicPowerContext): string {
  switch (c.c) {
    case 'minFollowers':
      return `you have ${c.v}+ Followers`;
    case 'maxFollowers':
      return `you have under ${c.v + 1} Followers`;
    case 'minApprentices':
      return `you have ${c.v}+ Apprentices`;
    case 'minPactDebt':
      return `your Pact Debt reaches ${c.v}`;
    case 'minLairTier':
      return `your Lair is Tier ${c.v}+`;
    case 'minNotoriety':
      return `your Notoriety is ${c.v}+`;
    case 'maxNotoriety':
      return `your Notoriety is under ${c.v + 1}`;
    case 'minStanding':
      return `your standing with ${factionName(c.factionId, ctx)} is ${c.v}+`;
    case 'maxStanding':
      return `your standing with ${factionName(c.factionId, ctx)} is under ${c.v + 1}`;
    case 'minEraIndex':
      return `it is era ${c.v + 1} or later`;
    case 'hasArtifact':
      return 'you hold that relic';
    case 'holdsAnyArtifact':
      return 'you hold any relic';
    case 'minArtifacts':
      return `you hold ${c.v}+ relics`;
    case 'minGoodActs':
      return 'you have acted constructively enough';
    case 'maxIllActs':
      return 'you have not acted destructively too often';
    case 'declinePhase':
      return 'it is the decline phase';
    default: {
      // A sixteenth `Condition` variant a relic `if` can now express, with
      // nothing here taught to phrase it — mirrors the same guard in
      // `src/components/run/effectText.ts`'s `describeGate`.
      const exhaustive: never = c;
      return String(exhaustive);
    }
  }
}

function ifPhrase(conditions: Condition[] | undefined, ctx: RelicPowerContext): string {
  if (!conditions || conditions.length === 0) return '';
  return conditions.map((c) => conditionClause(c, ctx)).join(' and ');
}

/**
 * Every clause a trigger's own watch fields can contribute (issue #82
 * generalises this beyond the original `watchesPositive` alone — see the
 * doc comment on `RelicPower`'s `trigger` member in `types.ts`). Order
 * matches the type's own field order; a power authoring more than one is
 * rare but not disallowed, so all that are set are stated, joined by the
 * caller the same way `if`'s own conditions already are.
 */
function watchPhrasesFor(power: TriggerPower, ctx: RelicPowerContext): string[] {
  const phrases: string[] = [];
  if (power.watchesOfferFaction) {
    phrases.push(`you answer an offer from ${factionName(power.watchesOfferFaction, ctx)}`);
  }
  if (power.watchesGambleFailure) {
    phrases.push('you lose a gamble');
  }
  if (power.watchesPositive) {
    phrases.push(`the choice raises your ${statLabel(power.watchesPositive)}`);
  }
  if (power.watchesNegative) {
    phrases.push(
      power.watchesNegative === 'standing' && power.watchesFactionId
        ? `the choice lowers your standing with ${factionName(power.watchesFactionId, ctx)}`
        : `the choice costs you ${statLabel(power.watchesNegative)}`,
    );
  }
  if (power.watchesEffect) {
    phrases.push(
      power.watchesEffect === 'loseArtifact'
        ? 'the choice costs you a relic'
        : `the choice touches your ${statLabel(power.watchesEffect)}`,
    );
  }
  return phrases;
}

export function relicPowerText(power: RelicPower, ctx: RelicPowerContext = {}): string {
  switch (power.kind) {
    case 'passive': {
      const modifier = power.modifier;
      switch (modifier.t) {
        case 'contagionLossMultiplier': {
          // "Contagion" is the engine's own internal name for this mechanic
          // (CLAUDE.md: "the engine's vocabulary is not the player's",
          // failure mode 16) — every branch here describes the OBSERVABLE
          // effect instead, in the same words regardless of whether the
          // relic scopes it to one faction (Old-Growth Charter) or not
          // (Footnote That Bites).
          const pct = Math.round((1 - modifier.v) * 100);
          if (modifier.factionId) {
            const scope = pct >= 100 ? 'nothing' : `${pct}% less standing than usual`;
            return `Passive: favoring ${factionName(modifier.factionId, ctx)} costs its rivals ${scope}.`;
          }
          return `Passive: favoring a faction costs its rivals ${pct}% less standing than usual.`;
        }
        case 'fameThreatMultiplier': {
          const pct = Math.round(modifier.v * 100);
          return `Passive: your fame feeds the hero's threat at ${pct}% the rate.`;
        }
        case 'followersGainMultiplier': {
          const pct = Math.round((modifier.v - 1) * 100);
          return `Passive: Followers you gain are increased by ${pct}%.`;
        }
        case 'followersCostMultiplier': {
          const pct = Math.round((1 - modifier.v) * 100);
          return `Passive: choices cost ${pct}% fewer Followers.`;
        }
        case 'decayReduction':
          return `Passive: Notoriety decay is ${modifier.v} less an era.`;
        case 'gambleOddsBonus': {
          const pct = Math.round(modifier.v * 100);
          return `Passive: +${pct}% odds on every gamble.`;
        }
        case 'loseArtifactPriority':
          return 'Passive: the first relic a choice would take is this one.';
        case 'survivesLichRite':
          return 'Passive: survives the lich rite, so you keep it and its wards.';
        case 'standingBand': {
          const faction = possessive(factionName(modifier.factionId, ctx));
          return `Passive: ${faction} standing is held between ${modifier.min} and ${modifier.max}.`;
        }
        case 'reprisalThreshold': {
          const faction = possessive(factionName(modifier.factionId, ctx));
          return `Passive: ${faction} reprisal needs ${modifier.v} standing, not the usual line.`;
        }
        default: {
          const exhaustive: never = modifier;
          return String(exhaustive);
        }
      }
    }

    case 'trigger': {
      // Pocketful of Dark (issue #82) is the one relic on this timing, and
      // its own name for the moment — "the first time the hero draws
      // close" — does not fold cleanly into the generic "At <timing>, if
      // <gate>" template below (every other trigger's timing is a place in
      // the turn sequence; this one is an event with no separate gate to
      // state). Handled as its own sentence rather than bent to fit.
      if (power.when === 'heroApproach') {
        return `The first time the hero draws close: ${effectsText(power.effects, ctx)}.`;
      }
      const timing = power.when === 'eraEnd' ? "every era's end" : 'the choice you make';
      const watchPhrases = watchPhrasesFor(power, ctx);
      const ifClause = ifPhrase(power.if, ctx);
      const gate = [...watchPhrases, ifClause].filter(Boolean).join(' and ');
      // Ashen Signature's own case (issue #80): `once` with `watchesPositive`
      // as the SOLE gate and no `if` reads more naturally as "the first
      // choice that raises your X" than the generic "the first time X" — kept
      // as its own branch rather than folded into the generic phrasing below.
      const soleWatchIsPositive = Boolean(power.watchesPositive) && watchPhrases.length === 1 && !ifClause;
      const lead = power.once
        ? soleWatchIsPositive
          ? `Once, the first choice that raises your ${statLabel(power.watchesPositive!)}`
          : gate
            ? `Once, the first time ${gate}`
            : `Once, at ${timing}`
        : gate
          ? `At ${timing}, if ${gate}`
          : `At ${timing}`;
      // Long Appetite (issue #81): magnitude proportional to the choice's own
      // cost, so it earns its own clause rather than folding into
      // `effectsText`, which only knows fixed magnitudes.
      const scaledPhrase = power.scaled
        ? `${effectsText([power.scaled.perUnitEffect], ctx)} per ${power.scaled.perUnit} ${statLabel(power.scaled.watches)} spent`
        : '';
      const body = [effectsText(power.effects, ctx), scaledPhrase].filter(Boolean).join(', ');
      return `${lead}: ${body}.`;
    }

    case 'active': {
      // PR #89 review (rhron255): a header line plus one line each for the
      // cost and the effect reads better than one long run-on sentence,
      // especially for Final Ledger's grant, which is already the longest
      // clause `effectsText` produces. `ArtifactCard`'s `.power` rule is the
      // one that turns this `\n` into an actual line break (`white-space:
      // pre-line`) — every other `kind` here returns none, so it is a no-op
      // for them.
      const lines = ['Single-use effect. Activate for:'];
      if (power.cost && power.cost.length > 0) lines.push(effectsText(power.cost, ctx));
      const grantText = power.grants
        ? `a ${power.grants.rarity} relic from your best-standing faction`
        : '';
      const foresightText = power.armsForesight ? 'your next gamble succeeds' : '';
      // The Key to No Particular Door (issue #82): the one active with
      // nothing in `RelicEffect` to print — the redraw itself is the effect.
      const redrawText = power.redrawsOffer ? "this era's offer is redrawn" : '';
      const effectsPart = power.effects.length > 0 ? effectsText(power.effects, ctx) : '';
      const body = [grantText, foresightText, redrawText, effectsPart].filter(Boolean).join(', ');
      lines.push(`${body}.`);
      return lines.join('\n');
    }

    // Issue #82: a lifeline's own recovery is never a fixed `RelicEffect` —
    // see `LifelineRecovery` in `types.ts` for why. Phrased from `recovery`
    // directly rather than through `effectsText`, and held short: both real
    // lifelines are near `RELIC_POWER_TEXT_MAX` on their own.
    case 'lifeline': {
      const recovery = power.recovery;
      switch (recovery.t) {
        case 'threatToWardsFraction': {
          const pct = Math.round(recovery.fraction * 100);
          return `Lifeline: the first killing blow instead drops your threat to ${pct}% of your wards.`;
        }
        case 'standingReset': {
          return `Lifeline: the first faction reprisal is cancelled; standing resets to ${recovery.v}.`;
        }
        default: {
          const exhaustive: never = recovery;
          return String(exhaustive);
        }
      }
    }

    default: {
      const exhaustive: never = power;
      return String(exhaustive);
    }
  }
}
