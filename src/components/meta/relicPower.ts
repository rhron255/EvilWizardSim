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
        default: {
          const exhaustive: never = modifier;
          return String(exhaustive);
        }
      }
    }

    case 'trigger': {
      const timing = power.when === 'eraEnd' ? "every era's end" : 'the choice you make';
      // `watchesPositive` reads the CHOICE's own effects, not the ambient
      // run (see the doc comment on `RelicPower` in `types.ts`) — phrased
      // distinctly from `if` so the text does not imply the wrong one. The
      // two are not mutually exclusive on the type, though: a trigger can
      // watch the choice AND still gate on ambient state (e.g. a notoriety
      // floor), and dropping `if` whenever `watchesPositive` happened to be
      // set was a real disclosure gap — the gate silently vanished from
      // every surface that renders a power (issue #80 review).
      const watchPhrase = power.watchesPositive
        ? `the choice raises your ${statLabel(power.watchesPositive)}`
        : '';
      const ifClause = ifPhrase(power.if, ctx);
      const gate = [watchPhrase, ifClause].filter(Boolean).join(' and ');
      const lead =
        power.once && power.watchesPositive
          ? ifClause
            ? `Once, the first time ${gate}`
            : `Once, the first choice that raises your ${statLabel(power.watchesPositive)}`
          : power.once
            ? gate
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
      const costText = power.cost && power.cost.length > 0 ? `${effectsText(power.cost, ctx)} → ` : '';
      const grantText = power.grants
        ? `a ${power.grants.rarity} relic from your best-standing faction`
        : '';
      const foresightText = power.armsForesight ? 'your next gamble succeeds' : '';
      const effectsPart = power.effects.length > 0 ? effectsText(power.effects, ctx) : '';
      const body = [grantText, foresightText, effectsPart].filter(Boolean).join(', ');
      return `Active, once: ${costText}${body}.`;
    }

    // Not authored yet (deferred to slice 5 of #77) — a generic, honest
    // placeholder rather than a blank line, so a future relic that ships one
    // is never the first thing to render it.
    case 'lifeline':
      return 'Lifeline: saves you once, automatically.';

    default: {
      const exhaustive: never = power;
      return String(exhaustive);
    }
  }
}
