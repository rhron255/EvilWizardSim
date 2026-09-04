/**
 * Content validation.
 *
 * wiki/03 § Content Pipeline asks for this, and asks for it BEFORE catalog
 * authoring rather than after: "A validation script checks at build time:
 * every artifact has a valid faction, every offer has 2-4 options, every
 * probabilistic option has both success and failure effects defined."
 *
 * wiki/00 § P3 goes further — "Enforce odds display structurally: make an
 * undisclosed effect impossible to author, not merely discouraged." Most of
 * that is already the type system's job (`OfferOption`'s `gamble` variant
 * cannot compile without `onFailure`, and `Effect` is structured data rather
 * than prose, so the renderer can always print a consequence). This script
 * covers the rules types cannot express: ranges, cross-references, uniqueness,
 * and reachability.
 *
 *   npm run validate:content
 *
 * Exits non-zero with a readable list. Silence means the catalog is sound.
 */

import type { Artifact, Condition, Effect, OfferOption, Rarity } from '../src/types';
import * as content from '../src/content';
import {
  DEVOTION_STANDING,
  GOOD_WIZARD_ILL_CAP,
  GOOD_WIZARD_REPUTATION_GOOD,
  GOOD_WIZARD_RESOLUTION_GOOD,
  LICH_RELIC_REQUIREMENT,
  PACT_LIMIT,
} from '../src/engine/constants';
import { pactRoleOf } from '../src/engine/content-port';

const problems: string[] = [];
const warnings: string[] = [];

const fail = (where: string, msg: string) => problems.push(`${where}: ${msg}`);
const warn = (where: string, msg: string) => warnings.push(`${where}: ${msg}`);

/**
 * Above this, an outcome line will be ellipsised in the ledger's Deeds cell.
 * A warning, never a failure — the register the shipped lines are written in
 * runs past it on purpose, and the full text is reachable on the resolution
 * card and on hover. This exists so that is a decision, not a surprise.
 */
const DEED_CLIP_WARN = 90;

const { artifacts, factions, lairs, origins, endings, offers, epithets } = content;

const factionIds = new Set(factions.map((f) => f.id));
const artifactIds = new Set(artifacts.map((a) => a.id));

// ---------------------------------------------------------------------------
// Uniqueness
// ---------------------------------------------------------------------------

function assertUniqueIds(label: string, ids: string[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) fail(label, `duplicate id "${id}"`);
    seen.add(id);
  }
}

assertUniqueIds('artifacts', artifacts.map((a) => a.id));
assertUniqueIds('factions', factions.map((f) => f.id));
assertUniqueIds('lairs', lairs.map((l) => l.id));
assertUniqueIds('origins', origins.map((o) => o.id));
assertUniqueIds('endings', endings.map((e) => e.id));
assertUniqueIds('offers', offers.map((o) => o.id));
assertUniqueIds('epithets', epithets.map((e) => e.id));

// ---------------------------------------------------------------------------
// The fixed cast
// ---------------------------------------------------------------------------

for (const artifact of artifacts) {
  const where = `artifact "${artifact.id}"`;
  if (!factionIds.has(artifact.factionId)) fail(where, `unknown factionId "${artifact.factionId}"`);
  if (!artifact.name.trim()) fail(where, 'empty name');
  if (!artifact.flavorText.trim()) fail(where, 'no flavor text — flavor is the art budget');
  if (!Number.isFinite(artifact.defense) || artifact.defense < 0) {
    fail(where, `defense must be a non-negative number, got ${artifact.defense}`);
  }
}

for (const faction of factions) {
  const where = `faction "${faction.id}"`;
  for (const enemy of faction.hostileTo) {
    if (!factionIds.has(enemy)) fail(where, `hostileTo unknown faction "${enemy}"`);
    if (enemy === faction.id) fail(where, 'hostile to itself');
  }
}

// wiki/01 § 7 names the first seven; issue #14 adds the five faction reprisals
// beside `sealed_in_gem`, which was always one of that set. The collection
// screen shows a slot for each.
const REQUIRED_ENDINGS = [
  'slain_by_chosen_one',
  'sealed_in_gem',
  'betrayed_by_apprentice',
  'lichdom',
  'retired_to_swamp',
  'consumed_by_pact',
  'ascension',
  'eternally_repurposed',
  'liquidated',
  'turned_to_fertilizer',
  'exiled_and_overrun',
  'consumed',
  'contract_writer',
  'grand_arbiter',
  'archmage',
  'archdruid',
  'overthrown_the_kingdom',
  'good_wizard',
];
for (const id of REQUIRED_ENDINGS) {
  if (!endings.some((e) => e.id === id)) fail('endings', `missing "${id}"`);
}

// The ladder must be contiguous from 0, because `promoteLair` walks it one rung
// at a time and a gap would silently stall progression.
const tiers = lairs.map((l) => l.tier).sort((a, b) => a - b);
tiers.forEach((tier, i) => {
  if (tier !== i) fail('lairs', `tier ladder is not contiguous from 0 (found ${tier} at rung ${i})`);
});

// An epithet that matches nothing leaves a run nameless.
if (!epithets.some((e) => e.id)) fail('epithets', 'catalog is empty');

// ---------------------------------------------------------------------------
// Offers — the odds rules
// ---------------------------------------------------------------------------

const RARITY_RANK: Record<Rarity, number> = { common: 0, rare: 1, legendary: 2 };
const artifactsByFaction = new Map<string, Artifact[]>();
for (const a of artifacts) {
  const list = artifactsByFaction.get(a.factionId);
  if (list) list.push(a);
  else artifactsByFaction.set(a.factionId, [a]);
}

function checkEffects(where: string, effects: readonly Effect[]) {
  for (const e of effects) {
    switch (e.t) {
      case 'artifact':
        if (!artifactIds.has(e.artifactId)) fail(where, `grants unknown artifact "${e.artifactId}"`);
        break;
      case 'artifactFrom': {
        if (!factionIds.has(e.factionId)) {
          fail(where, `artifactFrom unknown faction "${e.factionId}"`);
          break;
        }
        const pool = artifactsByFaction.get(e.factionId) ?? [];
        if (pool.length === 0) fail(where, `faction "${e.factionId}" has no artifacts to grant`);
        // `rarity`, when present, is an EXACT request. At runtime it degrades one
        // tier DOWN only when the exact tier is exhausted for the player (see
        // `drawArtifact` in src/engine/effects.ts), so the grant is satisfiable
        // as long as anything at or below it exists.
        if (e.rarity) {
          const cap = RARITY_RANK[e.rarity];
          if (!pool.some((a) => RARITY_RANK[a.rarity] <= cap)) {
            fail(where, `no "${e.rarity}"-or-lower artifact exists for "${e.factionId}"`);
          }
          // But a faction that owns NOTHING of the exact rarity can never honour
          // the request — every draw degrades to a lower tier. That is CLAUDE.md
          // failure mode 4 in miniature: an authored "legendary" prize that hands
          // out a common. Flagged so the downgrade is a decision, not a surprise.
          else if (!pool.some((a) => a.rarity === e.rarity)) {
            warn(
              where,
              `requests a "${e.rarity}" ${e.factionId} relic but the faction owns none — ` +
                'every draw will degrade to a lower tier',
            );
          }
        }
        break;
      }
      case 'standing':
        if (!factionIds.has(e.factionId)) fail(where, `standing on unknown faction "${e.factionId}"`);
        break;
      case 'ending':
        if (!REQUIRED_ENDINGS.includes(e.endingId)) fail(where, `unknown ending "${e.endingId}"`);
        break;
      case 'followers':
        // The forfeiture sentinel this replaced: content used -999 to mean
        // "all of them". The engine owns that now via `becomeLich`.
        if (Math.abs(e.v) > 200) {
          fail(where, `followers ${e.v} looks like a sentinel — the engine owns bulk forfeiture`);
        }
        break;
      case 'lairTier':
        if (Math.abs(e.v) > 3) warn(where, `lairTier ${e.v} moves more than three rungs at once`);
        break;
      case 'goodAct':
      case 'illAct':
        // These move a HIDDEN counter (issue #23's rule-1 exception) — a
        // large magnitude on one card would let a single choice leap the
        // whole route, which is the opposite of "consistently constructive
        // across a career."
        if (Math.abs(e.v) > 1) warn(where, `${e.t} ${e.v} moves the hidden counter by more than one`);
        break;
      default:
        break;
    }
  }
}

function checkOption(where: string, option: OfferOption) {
  if (!option.label.trim()) fail(where, 'empty label');

  if (option.kind === 'certain') {
    checkEffects(where, option.effects);
    return;
  }

  if (!(option.odds > 0 && option.odds < 1)) {
    fail(where, `odds must be strictly between 0 and 1, got ${option.odds}`);
  }
  // The type system already requires both branches to EXIST. This catches the
  // way around it: declaring an empty array to fake a consequence-free bet.
  if (option.onSuccess.length === 0) fail(where, 'gamble has an empty success branch');
  if (option.onFailure.length === 0) {
    fail(where, 'gamble has an empty failure branch — a bet with no downside is not a decision');
  }

  // The type requires both branches to NARRATE. This catches the way around
  // that: `''` satisfies `string`. A blank one puts the ledger back on the
  // synthesizer, which is what produced "Have her intercepted. It does not."
  if (!option.successText.trim()) fail(where, 'gamble has an empty successText');
  if (!option.failureText.trim()) fail(where, 'gamble has an empty failureText');

  // Not a failure: the resolution card prints these in full and `LedgerRow`
  // keeps the whole line in a `title`, so a long one is legible in both
  // places. It is the Deeds CELL that clips, and the author should know.
  for (const [field, text] of [
    ['successText', option.successText],
    ['failureText', option.failureText],
  ] as const) {
    if (text.trim().length > DEED_CLIP_WARN) {
      warn(where, `${field} is ${text.trim().length} chars — the Deeds column will clip it`);
    }
  }

  checkEffects(`${where} (success)`, option.onSuccess);
  checkEffects(`${where} (failure)`, option.onFailure);
}

function checkCondition(where: string, c: Condition) {
  if ('factionId' in c && !factionIds.has(c.factionId)) {
    fail(where, `condition references unknown faction "${c.factionId}"`);
  }
  if (c.c === 'hasArtifact' && !artifactIds.has(c.artifactId)) {
    fail(where, `condition references unknown artifact "${c.artifactId}"`);
  }
}

for (const offer of offers) {
  const where = `offer "${offer.id}"`;
  if (!offer.title.trim()) fail(where, 'empty title');
  if (!offer.body.trim()) fail(where, 'empty body');
  if (offer.factionId && !factionIds.has(offer.factionId)) {
    fail(where, `unknown factionId "${offer.factionId}"`);
  }

  if (offer.options.length < 2 || offer.options.length > 4) {
    fail(where, `must have 2-4 options, has ${offer.options.length}`);
  }
  // wiki/04: "A player should never be forced into a gamble."
  if (!offer.options.some((o) => o.kind === 'certain')) {
    fail(where, 'no certain option — a player must never be forced to gamble');
  }

  offer.options.forEach((option, i) => checkOption(`${where} option ${i + 1}`, option));
  for (const c of offer.requires ?? []) checkCondition(where, c);
}

// ---------------------------------------------------------------------------
// The concordat gate must track DEVOTION_STANDING
// ---------------------------------------------------------------------------

/**
 * The reliquary offers (`concordat_*`) gate on devotion — the same threshold the
 * engine uses to upgrade a draw (`DEVOTION_STANDING`). Content is pure data and
 * must not import the engine constant (it would couple the pluggable content
 * bundle to the engine), so the two are held in step here rather than by a shared
 * import. A literal copy drifted once already, when DEVOTION_STANDING moved from
 * 55 to 50 and the gate stayed at 55.
 */
for (const offer of offers.filter((o) => o.id.startsWith('concordat_'))) {
  const gate = (offer.requires ?? []).find(
    (c): c is Extract<Condition, { c: 'minStanding' }> =>
      c.c === 'minStanding' && c.factionId === offer.factionId,
  );
  if (!gate) {
    fail(`offer "${offer.id}"`, 'a concordat must gate on minStanding for its own faction');
  } else if (gate.v !== DEVOTION_STANDING) {
    fail(
      `offer "${offer.id}"`,
      `devotion gate is ${gate.v} but DEVOTION_STANDING is ${DEVOTION_STANDING} — ` +
        'the reliquary and the draw upgrade must agree on what "devoted" means',
    );
  }
}

// ---------------------------------------------------------------------------
// The oath gate must track DEVOTION_STANDING
// ---------------------------------------------------------------------------

/**
 * The mirror of the concordat rule above, for the leadership route
 * (`oath_*`, issue #14 slice 2b): "devoted enough to swear an oath" must mean
 * the same standing the reliquary and the draw upgrade already use. A literal
 * copy of `DEVOTION_STANDING` here would drift exactly the way the concordat
 * gate did when the constant moved from 55 to 50.
 */
for (const offer of offers.filter((o) => o.id.startsWith('oath_'))) {
  const gate = (offer.requires ?? []).find(
    (c): c is Extract<Condition, { c: 'minStanding' }> =>
      c.c === 'minStanding' && c.factionId === offer.factionId,
  );
  if (!gate) {
    fail(`offer "${offer.id}"`, 'an oath must gate on minStanding for its own faction');
  } else if (gate.v !== DEVOTION_STANDING) {
    fail(
      `offer "${offer.id}"`,
      `devotion gate is ${gate.v} but DEVOTION_STANDING is ${DEVOTION_STANDING} — ` +
        'the oath and the reliquary must agree on what "devoted" means',
    );
  }
}

// ---------------------------------------------------------------------------
// The lich rite's gates must track DEVOTION_STANDING and LICH_RELIC_REQUIREMENT
// ---------------------------------------------------------------------------

/**
 * `scripted_the_long_arrangement` is lichdom's rite (issue #21, #14 slice 3):
 * lichdom is the Worm Below's leadership ending, so "devoted enough" has to
 * mean the same standing the reliquary, the oath and the draw upgrade already
 * use, and the relic price has to match the constant it was tuned against —
 * the same drift the concordat and oath rules above already guard against,
 * for the same reason (content is pure data and cannot import the engine
 * constant it must agree with).
 */
{
  const rite = offers.find((o) => o.id === 'scripted_the_long_arrangement');
  if (!rite) {
    fail('offer "scripted_the_long_arrangement"', 'the lich rite is missing from the catalog');
  } else {
    const where = `offer "${rite.id}"`;
    const standingGate = (rite.requires ?? []).find(
      (c): c is Extract<Condition, { c: 'minStanding' }> =>
        c.c === 'minStanding' && c.factionId === 'worm_below',
    );
    if (!standingGate) {
      fail(where, 'the lich rite must gate on minStanding for worm_below');
    } else if (standingGate.v !== DEVOTION_STANDING) {
      fail(
        where,
        `devotion gate is ${standingGate.v} but DEVOTION_STANDING is ${DEVOTION_STANDING} — ` +
          'lichdom is a leadership ending and must require the same devotion the others do',
      );
    }

    const relicGate = (rite.requires ?? []).find(
      (c): c is Extract<Condition, { c: 'minArtifacts' }> => c.c === 'minArtifacts',
    );
    if (!relicGate) {
      fail(where, 'the lich rite must gate on minArtifacts — it consumes every relic it grants access to');
    } else if (relicGate.v !== LICH_RELIC_REQUIREMENT) {
      fail(
        where,
        `relic gate is ${relicGate.v} but LICH_RELIC_REQUIREMENT is ${LICH_RELIC_REQUIREMENT} — ` +
          'the requirement and the rite\'s cost must be the same relics',
      );
    }
  }
}

// ---------------------------------------------------------------------------
// The Good Wizard gates must track GOOD_WIZARD_REPUTATION_GOOD /
// GOOD_WIZARD_RESOLUTION_GOOD / GOOD_WIZARD_ILL_CAP
// ---------------------------------------------------------------------------

/**
 * The mirror of the concordat/oath/lich-rite rules above, for the Good
 * Wizard route (issue #23): content is a pure data bundle and cannot import
 * the engine constants its gates must agree with, so the two are held in
 * step here instead of by a shared import — the same drift the other three
 * rules already guard against.
 */
function checkGoodActsGate(where: string, requires: Condition[] | undefined, expectGood: number) {
  const goodGate = (requires ?? []).find(
    (c): c is Extract<Condition, { c: 'minGoodActs' }> => c.c === 'minGoodActs',
  );
  if (!goodGate) {
    fail(where, 'must gate on minGoodActs');
  } else if (goodGate.v !== expectGood) {
    fail(where, `minGoodActs gate is ${goodGate.v} but the constant is ${expectGood}`);
  }

  const illGate = (requires ?? []).find(
    (c): c is Extract<Condition, { c: 'maxIllActs' }> => c.c === 'maxIllActs',
  );
  if (!illGate) {
    fail(where, 'must gate on maxIllActs');
  } else if (illGate.v !== GOOD_WIZARD_ILL_CAP) {
    fail(where, `maxIllActs gate is ${illGate.v} but GOOD_WIZARD_ILL_CAP is ${GOOD_WIZARD_ILL_CAP}`);
  }
}

for (const offer of offers.filter((o) => o.id.startsWith('virtue_reputation_'))) {
  checkGoodActsGate(`offer "${offer.id}"`, offer.requires, GOOD_WIZARD_REPUTATION_GOOD);
}
for (const offer of offers.filter((o) => o.id.startsWith('virtue_resolution_'))) {
  checkGoodActsGate(`offer "${offer.id}"`, offer.requires, GOOD_WIZARD_RESOLUTION_GOOD);
}

// ---------------------------------------------------------------------------
// The grievance cards must point AWAY from the faction they belong to
// ---------------------------------------------------------------------------

/**
 * The mirror of the concordat rule, guarding the property the grievances exist
 * for rather than a number.
 *
 * A `grievance_*` card is the one deliberate route to a faction reprisal, and
 * it works only because it is affiliated with an ENEMY of its target: an offer
 * belonging to a faction you have already alienated is one `standingWeight`
 * has already stopped showing you, so a grievance filed under its own target
 * would be a route that closes exactly as you start to need it. That is a
 * silent failure — the card still exists, still validates, and simply never
 * appears — so it is asserted here.
 *
 * Three things are pinned: the gate is a single `maxStanding` on one faction
 * at a negative value (a grievance requires an existing grievance), the offer
 * belongs to a faction that `factions.ts` marks hostile to that one, and some
 * option actually does the target real damage. The MAGNITUDES are content's to
 * tune; the direction is not.
 */
const GRIEVANCE_MIN_DAMAGE = 20;

for (const offer of offers.filter((o) => o.id.startsWith('grievance_'))) {
  const where = `offer "${offer.id}"`;

  // The target is read from what the card DOES, not from its id or its gate.
  // The gate moved once already — the first rung stopped gating on standing
  // when that turned out to be a door locked with its own key — and a rule
  // anchored to the gate would have gone quiet at exactly that moment.
  const damages = offer.options.flatMap((option) =>
    (option.kind === 'certain' ? option.effects : option.onSuccess).filter(
      (e): e is Extract<Effect, { t: 'standing' }> =>
        e.t === 'standing' && e.v <= -GRIEVANCE_MIN_DAMAGE,
    ),
  );
  if (damages.length === 0) {
    fail(where, `a grievance must cost some faction at least ${GRIEVANCE_MIN_DAMAGE} standing`);
    continue;
  }
  const target = damages[0].factionId;

  if (target === offer.factionId) {
    fail(where, 'a grievance is filed by an ENEMY of its target, never by the target itself');
  } else if (!factions.find((f) => f.id === offer.factionId)?.hostileTo.includes(target)) {
    fail(
      where,
      `"${offer.factionId}" is not hostile to "${target}", so this card has no reason to exist ` +
        'and no reliable way to surface',
    );
  }

  // If it gates on standing at all, it gates on the faction it ruins, in the
  // direction that makes it a consequence: the second rung is the first one's
  // aftermath, never an independent lottery.
  for (const c of offer.requires ?? []) {
    if (c.c !== 'maxStanding') continue;
    if (c.factionId !== target) {
      fail(where, `gates on "${c.factionId}" standing but ruins "${target}"`);
    } else if (c.v > 0) {
      fail(where, `standing gate is ${c.v} — this rung is meant to follow an existing grievance`);
    }
  }
}

// ---------------------------------------------------------------------------
// Prose must not restate a rule the constants own
// ---------------------------------------------------------------------------

/**
 * Ascension's price lives in `ASCENSION_LEGENDARIES` and
 * `ASCENSION_MIN_NOTORIETY`. It has already changed once — from two
 * legendaries to one, because two was a closed door, not a near-miss — and
 * four user-facing strings went on telling players it took FOUR artifacts
 * reassembled, in every build since. A game stating a rule it does not run is
 * the same class of defect as an undisclosed downside.
 *
 * So content may name Ascension and must not put a COUNT in the same sentence.
 * A number in prose is a copy of a constant, and copies drift.
 *
 * Deliberately not a regex. The first version of this check was one, it
 * matched in a scratch script, silently matched nothing here, and reported the
 * catalog clean while the bad string sat in it — which is CLAUDE.md § 5, the
 * instrument lying, inside the very check meant to stop § 4.
 */
const COUNT_WORDS = new Set([
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
]);

function statesAscensionPrice(text: string): string | null {
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const words = sentence.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    if (!words.includes('ascension')) continue;
    const count = words.find((w) => COUNT_WORDS.has(w));
    if (count) return sentence.trim();
  }
  return null;
}

function checkAscensionPrice(where: string, text: string | undefined) {
  if (!text) return;
  const offending = statesAscensionPrice(text);
  if (offending) {
    fail(
      where,
      `puts a count in the same sentence as Ascension ("${offending}") — its price ` +
        'lives in ASCENSION_LEGENDARIES / ASCENSION_MIN_NOTORIETY and prose will drift from it',
    );
  }
}

for (const a of artifacts) {
  checkAscensionPrice(`artifact "${a.id}"`, a.effect);
  checkAscensionPrice(`artifact "${a.id}"`, a.flavorText);
}
for (const e of endings) {
  checkAscensionPrice(`ending "${e.id}"`, e.summary);
  checkAscensionPrice(`ending "${e.id}"`, e.narration);
  checkAscensionPrice(`ending "${e.id}"`, e.hint);
  if (e.codaMode === 'tiered') {
    for (const [tier, line] of Object.entries(e.coda)) {
      checkAscensionPrice(`ending "${e.id}" coda.${tier}`, line);
    }
  } else {
    checkAscensionPrice(`ending "${e.id}" coda`, e.coda);
  }
}

/**
 * Locked ending slots have to say something, and it must not be the answer.
 *
 * All seven slots are visible from run one (rule 6). Before `Ending.hint`
 * existed, an unseen slot's ONLY text was a rarity word — and the word collided
 * with the relic grid's own rarity vocabulary two sections above it, so seven
 * doors read as a drop table. The hint is what makes the slot a door.
 *
 * It must not leak the ending's name, or the slot spoils the thing it exists
 * to withhold.
 */
/**
 * Every coda fits the card, whichever `codaMode` authored it.
 *
 * A `tiered` coda is a full `Record<TierId, string>` so the compiler already
 * catches a missing KEY. What it cannot catch is an empty string, a duplicate
 * pasted across two tiers, or one that has grown past what the ending card
 * can hold — and the point of the field is that a Local Menace career reads
 * differently from a Kingdom-Level one, which a duplicate silently undoes.
 * A `fixed` coda has no tiers to duplicate across, but the length and
 * non-empty rules bind it exactly as hard — a `fixed` coda escaping the cap
 * is the bug the union exists to prevent.
 *
 * 110 is the authoring budget, not a layout measurement: the coda sits under a
 * ~500-character narration on a 393px phone, and the card is already 3.4
 * screens tall.
 */
const CODA_MAX = 110;

for (const e of endings) {
  if (e.codaMode === 'fixed') {
    if (!e.coda || !e.coda.trim()) {
      fail('endings', `ending "${e.id}" has an empty fixed coda`);
    } else if (e.coda.length > CODA_MAX) {
      fail('endings', `ending "${e.id}" coda is ${e.coda.length} chars, over the ${CODA_MAX} budget`);
    }
    continue;
  }
  const seen = new Map<string, string>();
  for (const [tier, line] of Object.entries(e.coda)) {
    if (!line || !line.trim()) {
      fail('endings', `ending "${e.id}" has an empty coda for tier "${tier}"`);
      continue;
    }
    if (line.length > CODA_MAX) {
      fail(
        'endings',
        `ending "${e.id}" coda.${tier} is ${line.length} chars, over the ${CODA_MAX} budget`,
      );
    }
    const dupe = seen.get(line);
    if (dupe) {
      fail(
        'endings',
        `ending "${e.id}" reuses the same coda for "${dupe}" and "${tier}" — the tier is the point`,
      );
    }
    seen.set(line, tier);
  }
}

/**
 * The narration fits the card too.
 *
 * 500 is measured, not invented: the seven original narrations were tightened
 * for issue #13 (a prerequisite for the eleven-ending expansion) and now run
 * 446–496 characters. 500 is that measured ceiling with a few characters of
 * margin, not a round number chased backward into the prose — see
 * `CLAUDE.md` failure mode 12. Re-measure and move this if the catalog's
 * authored range shifts.
 */
const NARRATION_MAX = 500;

for (const e of endings) {
  if (e.narration.length > NARRATION_MAX) {
    fail(
      'endings',
      `ending "${e.id}" narration is ${e.narration.length} chars, over the ${NARRATION_MAX} budget`,
    );
  }
}

for (const e of endings) {
  if (!e.hint || !e.hint.trim()) {
    fail('endings', `ending "${e.id}" has no hint — its locked slot would render empty`);
    continue;
  }
  if (e.hint.toLowerCase().includes(e.name.toLowerCase())) {
    fail(
      'endings',
      `ending "${e.id}" hint names the ending ("${e.name}") — a locked slot must not spoil itself`,
    );
  }
}

for (const o of offers) {
  checkAscensionPrice(`offer "${o.id}"`, o.title);
  checkAscensionPrice(`offer "${o.id}"`, o.body);
  for (const opt of o.options) {
    checkAscensionPrice(`offer "${o.id}"`, opt.label);
    if (opt.kind === 'certain') checkAscensionPrice(`offer "${o.id}"`, opt.resultText);
    else {
      checkAscensionPrice(`offer "${o.id}"`, opt.successText);
      checkAscensionPrice(`offer "${o.id}"`, opt.failureText);
    }
  }
}

// ---------------------------------------------------------------------------
// The pact ladder
//
// Pact debt used to grow on its own; now it moves only on cards the player
// accepted, which makes the CATALOG solely responsible for whether the ending
// is reachable and whether it is escapable. Nothing below is expressible in
// the type system, and none of it was checked at all before this system
// existed — `checkEffects` fell through to `default: break` for `pactDebt`, so
// a card granting an instant-death 7 passed silently.
//
// NOTE the placement: above the report block, never below it. A rule appended
// after the report ran once pushed a real failure and still exited 0.
// ---------------------------------------------------------------------------

for (const o of offers) {
  for (const opt of o.options) {
    const branches = opt.kind === 'certain' ? [opt.effects] : [opt.onSuccess, opt.onFailure];
    for (const branch of branches) {
      for (const e of branch) {
        if (e.t !== 'pactDebt') continue;
        // A single card that can hand you the ceiling outright. The ending is
        // meant to be the end of a sequence the player walked, not a trapdoor.
        if (e.v >= PACT_LIMIT) {
          fail(`offer "${o.id}"`, `a single pactDebt effect of +${e.v} reaches PACT_LIMIT (${PACT_LIMIT}) on its own`);
        }
      }
    }
  }

  for (const c of o.requires ?? []) {
    if (c.c === 'minPactDebt' && c.v >= PACT_LIMIT) {
      fail(`offer "${o.id}"`, `requires minPactDebt ${c.v}, but the run ends at ${PACT_LIMIT} — unreachable`);
    }
  }

  // The pact analogue of the no-forced-gamble guarantee. Every card that can
  // deepen a debt must leave a way to walk past it without deepening one.
  if (pactRoleOf(o) === 'tempts') {
    const hasCleanOption = o.options.some((opt) => {
      const branches = opt.kind === 'certain' ? [opt.effects] : [opt.onSuccess, opt.onFailure];
      return branches.every((b) => b.every((e) => e.t !== 'pactDebt' || e.v <= 0));
    });
    if (!hasCleanOption) {
      fail(`offer "${o.id}"`, 'every option can add pact debt — a forced pact is a forced gamble');
    }
  }
}

/**
 * A payment the engine can clamp to nothing is not a payment.
 *
 * `applyEffects` floors followers and apprentices at zero, and `loseArtifact`
 * is a no-op on an empty reliquary. So an option that trades STOCK for debt
 * relief hands a wizard who has none the full relief for whatever they happen
 * to hold — ten followers where the card said forty, an apprentice who does
 * not exist, a relic carried out of a room containing no relics — while its
 * `resultText` narrates a payment that did not occur.
 *
 * The offer card stays honest either way: `projectEffects` prints the clamped
 * number, which is what that projection is for. What breaks is the EXCHANGE —
 * a fixed benefit bought with a cost the engine erased — and the prose that
 * describes it. Three cards shipped this way in one file, and a fourth had
 * been in the catalog since before the pact ladder existed.
 *
 * Scoped to branches that reduce pact debt on purpose. A partial follower loss
 * elsewhere is a partial loss, not a bypassed trade: nothing fixed is being
 * bought with it.
 *
 * The fix is always the same — gate the offer on the stock its option spends.
 * Options carry no gates of their own, so a card offering two different
 * payments has to require both.
 */
for (const o of offers) {
  // The one exemption, and it is structural rather than a name on a list.
  //
  // A card whose SIBLING option ends the run outright is not trading stock for
  // relief; it is pricing the whole career. `scripted_the_reckoning` offers
  // "pay everything you have" against "refuse to pay", which is
  // `consumed_by_pact` on the spot. A wizard with nothing to hand over gives
  // nothing and is spared, and that is the card working: the alternative was
  // never a cheaper exit, it was the ending. Gating the reckoning on eighty
  // followers and a full reliquary would put the pact's own set piece out of
  // reach of exactly the careers it was written for.
  const terminal = o.options.some(
    (opt) =>
      opt.kind === 'certain'
        ? opt.effects.some((e) => e.t === 'ending')
        : [...opt.onSuccess, ...opt.onFailure].some((e) => e.t === 'ending'),
  );
  if (terminal) continue;

  const gates = o.requires ?? [];
  const stocked = (c: 'minFollowers' | 'minApprentices', need: number) =>
    gates.some((g) => g.c === c && g.v >= need);
  const stockedRelic = gates.some((g) => g.c === 'holdsAnyArtifact' || g.c === 'hasArtifact');

  for (const opt of o.options) {
    const branches = opt.kind === 'certain' ? [opt.effects] : [opt.onSuccess, opt.onFailure];
    for (const branch of branches) {
      if (!branch.some((e) => e.t === 'pactDebt' && e.v < 0)) continue;
      const where = `offer "${o.id}" option "${opt.label}"`;
      for (const e of branch) {
        if (e.t === 'followers' && e.v < 0 && !stocked('minFollowers', -e.v)) {
          fail(where, `buys debt relief for ${-e.v} followers with no minFollowers gate — a poorer wizard clears the same debt for less`);
        }
        if (e.t === 'apprentices' && e.v < 0 && !stocked('minApprentices', -e.v)) {
          fail(where, `buys debt relief for ${-e.v} apprentice(s) with no minApprentices gate — a wizard with none clears the debt for free`);
        }
        if (e.t === 'loseArtifact' && !stockedRelic) {
          fail(where, 'buys debt relief with a relic but the offer never requires one — an empty reliquary pays nothing');
        }
      }
    }
  }
}

/**
 * A CERTAIN way out, at every balance that can be in trouble, in both phases.
 *
 * Two-way gambles classify as `relieves` because they can clear debt, and they
 * are weighted up as the balance climbs — but a bet is not an exit you can
 * rely on. Without this rule a content edit could leave a wizard at 5/7 with
 * nothing but coin flips.
 *
 * Walked level by level and phase by phase rather than counted. A count passes
 * happily while every relief card sits behind `minPactDebt: 4`, and it misses
 * the real gap this found: `decline_collections` is decline-only, so before
 * `pact_settle_accounts` (phase `any`, gate 2) an indebted wizard in the
 * ASCENT had no way to pay anything down at all.
 *
 * Levels start at 2: at 1 the wizard is six points from the ceiling and in no
 * danger, and demanding an exit there would be a rule with no defect behind it.
 */
for (const phase of ['ascent', 'decline'] as const) {
  for (let debt = 2; debt < PACT_LIMIT; debt++) {
    const exits = offers.filter((o) => {
      if (o.phase !== 'any' && o.phase !== phase) return false;
      // Only gates this run could actually satisfy at this balance — and the
      // run this guarantee exists FOR is the one with nothing left to sell.
      // Any gate on stock is a gate that wizard cannot pass, and the rule
      // above guarantees that an offer they CAN reach spends none of it. So
      // the two rules compose: gating a card to make its payment real is only
      // safe while a stock-free exit survives at the same balance.
      for (const c of o.requires ?? []) {
        if (c.c === 'minPactDebt' && c.v > debt) return false;
        if (c.c === 'minFollowers' || c.c === 'minApprentices') return false;
        if (c.c === 'holdsAnyArtifact' || c.c === 'hasArtifact') return false;
      }
      return o.options.some(
        (opt) => opt.kind === 'certain' && opt.effects.some((e) => e.t === 'pactDebt' && e.v < 0),
      );
    });
    if (exits.length === 0) {
      fail(
        `pact ladder (${phase}, debt ${debt})`,
        'no offer with a CERTAIN debt-reducing option is reachable — the only ways out are gambles',
      );
    }
  }
}

// The ways out must not be authorable away wholesale.
const relieving = offers.filter((o) => pactRoleOf(o) === 'relieves');
if (relieving.length < 3) {
  fail('pact ladder', `only ${relieving.length} offer(s) can reduce pact debt; at least 3 are required`);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const counts = [
  `${offers.length} offers`,
  `${artifacts.length} artifacts`,
  `${factions.length} factions`,
  `${lairs.length} lairs`,
  `${endings.length} endings`,
  `${origins.length} origins`,
  `${epithets.length} epithets`,
].join(' · ');

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ~ ${w}`);
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s) in the content catalog:\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error('');
  process.exit(1);
}

console.log(`content OK — ${counts}`);
