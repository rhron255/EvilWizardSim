/**
 * The systems that run *between* choices: era arithmetic, notoriety decay,
 * hero escalation, defense, and the tier-crossing check.
 *
 * Nothing here reads content except `defenseOf`, and nothing here is random.
 * Every number comes from `constants.ts`.
 */

import type { ArtifactPower, FactionId, Phase, RunState, Tier } from '../types';
import { TIERS, tierFor } from '../theme/tokens';
import type { ContentBundle } from './content-port';
import { indexOf } from './content-port';
import {
  DECAY_BASE,
  DECAY_RAMP,
  DEF_FLOOR,
  DEF_LAIR,
  DEF_LICH,
  DEF_NOTORIETY,
  HERO_BAND_DANGER,
  HERO_BAND_WARN,
  HERO_FAME_COEF,
  HERO_THREAT_BASE,
  HERO_THREAT_RAMP,
  POWER_FLOOR,
  PROPHECY_FRACTION,
  START_AGE,
  YEARS_PER_ERA,
} from './constants';

export const FACTION_IDS: FactionId[] = [
  'ashen_covenant',
  'gilded_hand',
  'pale_academy',
  'verdant_choir',
  'crownlands',
  'worm_below',
];

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Notoriety is an integer 0-99. The ledger prints it; it never shows decimals. */
export function clampNotoriety(v: number): number {
  return clamp(Math.round(v), 0, 99);
}

/**
 * Hero threat is a non-negative INTEGER, for the same reason notoriety is:
 * a card that prints a fractional delta reads as a rendering bug.
 *
 * It used to carry one decimal, because `threatGainFor` mixes `HERO_FAME_COEF`
 * (0.18) against an integer notoriety. Nothing displayed the stat itself in
 * tenths — `stakes.ts` rounds the wards readout — so the fraction stayed
 * invisible until a card charged more threat than the wizard had. Then the
 * `Math.max(0, …)` floor ate part of the authored cost and the SURVIVING
 * remainder was printed: a player who took a −25 against 18.3 threat was shown
 * `−18.3 Hero Threat`, which is a true number in a unit the game never uses.
 *
 * Rounding at the boundary rather than at the point of display is deliberate:
 * the clamped delta is computed from the stored value, so a display-only round
 * would still have to agree with a fractional store — failure mode 4, one
 * field with two readings.
 */
export function clampThreat(v: number): number {
  return Math.max(0, Math.round(v));
}

export function emptyStanding(): Record<FactionId, number> {
  return {
    ashen_covenant: 0,
    gilded_hand: 0,
    pale_academy: 0,
    verdant_choir: 0,
    crownlands: 0,
    worm_below: 0,
  };
}

/** wiki/01: 5 in-world years per era, starting at 20. */
export function ageForEra(eraIndex: number): number {
  return START_AGE + eraIndex * YEARS_PER_ERA;
}

/** Scripted, never sampled — identical pacing every run of a given length. */
export function prophecyEraFor(eraCount: number): number {
  const era = Math.round(eraCount * PROPHECY_FRACTION);
  // Always leave at least one ascent era and one decline era, however short
  // the run is configured to be.
  return clamp(era, 1, Math.max(1, eraCount - 1));
}

export function phaseFor(eraIndex: number, prophecyEra: number): Phase {
  return eraIndex >= prophecyEra ? 'decline' : 'ascent';
}

export function erasSinceProphecyFor(eraIndex: number, prophecyEra: number): number {
  return Math.max(0, eraIndex - prophecyEra);
}

/**
 * Everything the relics in hand are currently worth, summed once, by power.
 *
 * Every consumer wants a total rather than a list, and four of the six powers
 * are read on a hot path (`defenseOf` runs on the ending check). One pass, one
 * shape, so no caller re-walks `heldArtifactIds` with its own filter — which is
 * how `defenseOf` and `defenseReadout` came to hold two copies of the same sum
 * and needed a test pinning them together.
 *
 * A lich holds nothing: `becomeLich` forfeits the reliquary, so every power
 * here reads zero for one without a special case, which is the correct answer
 * rather than a lucky one.
 */
export type RelicPowers = Record<ArtifactPower['p'], number>;

/** Every term at zero — the honest reading of an empty reliquary. */
export function emptyRelicPowers(): RelicPowers {
  return { wards: 0, vigil: 0, undimmed: 0, discipline: 0, haggle: 0, grace: 0 };
}

export function relicPowers(
  run: Pick<RunState, 'heldArtifactIds'>,
  content: ContentBundle,
): RelicPowers {
  const index = indexOf(content);
  const out = emptyRelicPowers();
  for (const id of run.heldArtifactIds) {
    const power = index.artifactById.get(id)?.power;
    if (power) out[power.p] += power.v;
  }
  return out;
}

/**
 * wiki/04: `decayPerEra = base * (1 + erasSinceProphecy * 0.15)`, zero during
 * ascent, zero for a lich. Rounded, because the ledger shows whole numbers and
 * a fractional slide would read as a rendering bug.
 *
 * `undimmed` relics subtract from the slide, down to `POWER_FLOOR.undimmed` —
 * zero, and the only power whose floor IS zero. Not negative: a negative decay
 * is notoriety ARRIVING every era from nowhere, which is a gain the player was
 * never shown on a card. The relic can stop the erosion; it cannot quietly
 * reverse it.
 */
export function decayFor(
  run: Pick<RunState, 'phase' | 'erasSinceProphecy' | 'isLich' | 'heldArtifactIds'>,
  content: ContentBundle,
): number {
  if (run.phase !== 'decline') return 0;
  if (run.isLich) return 0;
  const base = DECAY_BASE * (1 + run.erasSinceProphecy * DECAY_RAMP);
  return Math.max(POWER_FLOOR.undimmed ?? 0, Math.round(base - relicPowers(run, content).undimmed));
}

/**
 * Threat added at the end of a decline era. Ramps on time and on fame: the
 * more famous the wizard, the better the hero the Crownlands can afford.
 *
 * Whole numbers, per `clampThreat`. `HERO_FAME_COEF` stays fractional — it is
 * the per-point weight of fame, not a quantity the run ever stores.
 */
export function threatGainFor(
  run: Pick<RunState, 'phase' | 'erasSinceProphecy' | 'notoriety' | 'heldArtifactIds'>,
  content: ContentBundle,
): number {
  if (run.phase !== 'decline') return 0;
  const gain =
    HERO_THREAT_BASE + HERO_THREAT_RAMP * run.erasSinceProphecy + HERO_FAME_COEF * run.notoriety;
  // `vigil` relics slow him; `POWER_FLOOR.vigil` is why they cannot stop him.
  // Rule 6: every ending has to stay reachable, this one included.
  return Math.max(POWER_FLOOR.vigil ?? 0, Math.round(gain - relicPowers(run, content).vigil));
}

/**
 * What stands between the wizard and the chosen one.
 *
 * wiki/04: "derived from Notoriety, the `wards` relics held, and lair tier".
 * Followers deliberately contribute nothing — they are ledger filler by design
 * (wiki/02 § three currencies), and giving them defense would collapse two
 * currencies into one.
 *
 * That wiki line said "artifacts held" until issue #6, and the distinction is
 * the whole of that change: every relic used to contribute defense and nothing
 * else, and a relic whose power is `vigil` or `grace` now contributes nothing
 * HERE, doing its work on the other side of the comparison — against the
 * threat rather than for the wards.
 */
export function defenseOf(run: RunState, content: ContentBundle): number {
  const index = indexOf(content);

  const artifactDefense = relicPowers(run, content).wards;

  const rung = index.lairRung.get(run.lairId);
  const lairTier = rung === undefined ? 0 : (index.lairLadder[rung]?.tier ?? 0);

  const total =
    DEF_FLOOR +
    run.notoriety * DEF_NOTORIETY +
    artifactDefense +
    lairTier * DEF_LAIR +
    (run.isLich ? DEF_LICH : 0);
  return Math.round(total * 10) / 10;
}

/**
 * How close the chosen one is, in bands.
 *
 * `calm` → `warn` → `danger` → `through`, where `through` means threat has
 * passed defence and `checkEndings` will return `slain_by_chosen_one`.
 *
 * Lives in the engine rather than beside the readout because BOTH consumers
 * need it: the header fills a rail from it, and the era-end systems fire a
 * narrative beat when a band is crossed for the first time. The approach used
 * to be two numbers that only ever changed colour, and the fiction that
 * dramatised it — a sighting, a squire — was sampled at random, unconnected to
 * whether the player was actually about to die.
 */
export type HeroBand = 'calm' | 'warn' | 'danger' | 'through';

/** Rank order, so a run can remember the furthest band it has reached. */
export const HERO_BANDS: HeroBand[] = ['calm', 'warn', 'danger', 'through'];

export function heroBand(threat: number, defense: number): HeroBand {
  if (defense <= 0) return threat > 0 ? 'through' : 'calm';
  if (threat > defense) return 'through';
  const ratio = threat / defense;
  if (ratio >= HERO_BAND_DANGER) return 'danger';
  if (ratio >= HERO_BAND_WARN) return 'warn';
  return 'calm';
}

/** One named term of `defenseOf`, for a UI that has to say where wards come from. */
export type DefenseTerm = {
  label: string;
  value: number;
  /**
   * Something the wizard BUILT, as opposed to the floor everybody starts with.
   *
   * The readout names the largest term as the thing currently keeping the
   * player alive, and `Standing ground` is the one term that is a constant —
   * naming it would be advice nobody can act on. A flag rather than a string
   * comparison on the label: a shared field with two readings is failure
   * mode 4, and the label is display text that a content pack may translate.
   */
  earned: boolean;
};

/** `defenseOf`, itemised, plus the same total. */
export type DefenseReadout = { total: number; terms: DefenseTerm[] };

/**
 * The same arithmetic as `defenseOf`, with its terms named.
 *
 * Measured: lair tier supplies 36.1% of the mean defence, and removing the
 * term entirely takes `slain_by_chosen_one` from 43.85% of careers to 69.75%
 * — one run in four flips from surviving the hero to being killed by him on
 * that term alone — yet the
 * only place the UI ever said a lair defends you was a `title` tooltip, which
 * a phone cannot show. A stat that decides one run in six and is disclosed
 * nowhere is the header's oldest bug wearing a new hat.
 *
 * This deliberately re-derives rather than instrumenting `defenseOf`: that
 * function is on the ending check's hot path and its signature is depended on
 * by `endings.ts`. The pair is pinned together by a test asserting the terms
 * sum to `defenseOf` — the seam this repo has been bitten at before.
 */
export function defenseReadout(run: RunState, content: ContentBundle): DefenseReadout {
  const index = indexOf(content);

  const artifactDefense = relicPowers(run, content).wards;

  const rung = index.lairRung.get(run.lairId);
  const lairTier = rung === undefined ? 0 : (index.lairLadder[rung]?.tier ?? 0);

  const round = (n: number) => Math.round(n * 10) / 10;
  const terms: DefenseTerm[] = [
    { label: 'Lair', value: round(lairTier * DEF_LAIR), earned: true },
    { label: 'Relics', value: round(artifactDefense), earned: true },
    { label: 'Fame', value: round(run.notoriety * DEF_NOTORIETY), earned: true },
    { label: 'Standing ground', value: round(DEF_FLOOR), earned: false },
  ];
  // The largest single term in the game — bigger than the whole lair ladder —
  // and until now it was computed here and named nowhere on screen.
  if (run.isLich) terms.push({ label: 'Undeath', value: round(DEF_LICH), earned: true });

  return { total: defenseOf(run, content), terms };
}

/**
 * The one celebrated moment in the UI. Returns a tier ONLY for an upward
 * crossing into a `celebrate: true` band — sliding back down 75 during the
 * decline must never fire confetti.
 */
/**
 * The lair rung a wizard's standing in the world entitles them to.
 *
 * Lairs were previously moved only by authored `lairTier` effects, and those
 * are rare enough that 59.75% of simulated runs ended holding exactly ONE
 * lair. The ending card's lair grid is specified as its centerpiece and the
 * single most-shared element (wiki/01 § 8), so a one-card trophy case is a
 * direct failure of the payoff — and the most common reason a finished run
 * reads as unaccomplished.
 *
 * Notoriety drives it because the fiction is simple: a wizard nobody fears
 * cannot hold a mountain, and one the Crownlands have opened a file on does
 * not stay in a rented cellar. Followers contribute a little — somebody has to
 * carry the furniture.
 */
export function entitledLairRung(run: RunState, ladderLength: number): number {
  if (ladderLength <= 1) return 0;
  const fromFame = run.notoriety / 13;
  const fromRetinue = Math.min(2, run.followers / 45);
  return clamp(Math.floor(fromFame + fromRetinue), 0, ladderLength - 1);
}

/**
 * Promotion only — never demotion.
 *
 * Losing a lair should be something an authored card DOES to the player, with
 * its consequence printed, not something the numbers quietly take back. An
 * automatic demotion would also make the ledger's Lair column flicker up and
 * down as notoriety oscillates, which reads as a bug rather than a life.
 */
export function promoteLair(run: RunState, content: ContentBundle): string {
  const index = indexOf(content);
  const ladder = index.lairLadder;
  if (ladder.length === 0) return run.lairId;
  const current = index.lairRung.get(run.lairId) ?? 0;
  const target = entitledLairRung(run, ladder.length);
  if (target <= current) return run.lairId;
  // One rung per era at most: the ladder is the progression, and skipping
  // rungs would waste authored lair names the player never sees.
  return ladder[current + 1].id;
}

export function tierCrossing(before: number, after: number): Tier | undefined {
  const from = tierFor(before);
  const to = tierFor(after);
  if (from.id === to.id) return undefined;
  if (!to.celebrate) return undefined;
  if (to.min <= from.min) return undefined;
  return to;
}

export function peakNotoriety(run: RunState): number {
  let peak = run.notoriety;
  for (const era of run.eras) peak = Math.max(peak, era.notoriety);
  return peak;
}

/** Exported for tests that assert the tier table is the shared one. */
export { TIERS, tierFor };
