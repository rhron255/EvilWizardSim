import type { FactionId, RunState } from '../types';
import type { Feat } from '../engine/content-port';
import { lairs } from './lairs';

export type { Feat } from '../engine/content-port';

/**
 * Mirrors of engine constants. Content never imports the engine, so these are
 * copies, and `scripts/validate-content.ts` fails if any drifts from its source.
 */
export const FEAT_THRESHOLDS = {
  /** `PACT_LIMIT - 1`: one point short of consumption. */
  pactDebtJustUnder: 5,
  /** `DEVOTION_STANDING`. */
  devotion: 50,
  /** The first tier boundary above Unknown (`Local Menace` begins here). */
  localMenaceFloor: 40,
  /** `HERO_BANDS.indexOf('danger')`: the hero within 15% of the wards, or past them. */
  heroDangerBand: 2,
} as const;

const TIER_BY_LAIR = new Map(lairs.map((l) => [l.id, l.tier]));

const FACTIONS: FactionId[] = [
  'ashen_covenant',
  'gilded_hand',
  'pale_academy',
  'verdant_choir',
  'crownlands',
  'worm_below',
];

/** Longest run of consecutive GAMBLES won; eras with a certain choice neither extend nor break it. */
function longestGambleWinStreak(r: RunState): number {
  let best = 0;
  let cur = 0;
  for (const e of r.eras) {
    if (e.outcome === 'deterministic') continue;
    cur = e.outcome === 'success' ? cur + 1 : 0;
    if (cur > best) best = cur;
  }
  return best;
}

const atAgeLimit = (r: RunState): boolean => r.eraIndex >= r.eraCount;

const peakNotoriety = (r: RunState): number =>
  r.eras.reduce((hi, e) => Math.max(hi, e.notoriety), r.notoriety);

/** Order is display order: the commonest first, the rarest last. */
export const feats: Feat[] = [
  {
    id: 'six_addresses',
    name: 'Six Addresses',
    condition: 'Live in six different lairs in one career.',
    when: (r) => new Set([...r.eras.map((e) => e.lairId), r.lairId]).size >= 6,
  },
  {
    id: 'took_no_chances',
    name: 'Took No Chances',
    condition: 'Live eight eras or more without taking a single gamble.',
    when: (r) => r.eras.length >= 8 && r.eras.every((e) => e.outcome === 'deterministic'),
  },
  {
    id: 'saw_it_coming',
    name: 'Saw It Coming',
    condition: 'Let the hero get to your door, and end some other way.',
    when: (r) =>
      r.heroBandSeen >= FEAT_THRESHOLDS.heroDangerBand && r.ending !== 'slain_by_chosen_one',
  },
  {
    id: 'took_it_with_them',
    name: 'Took It With Them',
    condition: 'Be slain while holding five relics.',
    hiddenUntilEnding: 'slain_by_chosen_one',
    hiddenCondition: 'Earned by one ending you have not seen yet.',
    when: (r) => r.ending === 'slain_by_chosen_one' && r.heldArtifactIds.length >= 5,
  },
  {
    id: 'nobody_has_heard_of_them',
    name: 'Nobody Has Heard of Them',
    condition: 'Reach the age limit without ever being a Local Menace.',
    when: (r) => atAgeLimit(r) && peakNotoriety(r) < FEAT_THRESHOLDS.localMenaceFloor,
  },
  {
    id: 'downsized',
    name: 'Downsized',
    condition: 'Move down the lair ladder.',
    when: (r) => {
      const ids = [...r.eras.map((e) => e.lairId), r.lairId];
      for (let i = 1; i < ids.length; i++) {
        if ((TIER_BY_LAIR.get(ids[i]) ?? 0) < (TIER_BY_LAIR.get(ids[i - 1]) ?? 0)) return true;
      }
      return false;
    },
  },
  {
    id: 'broke_the_glass',
    name: 'Broke the Glass',
    condition: "Use a relic's one-time power yourself.",
    when: (r) => r.relicState.spent.length > 0,
  },
  {
    id: 'did_not_see_sixty',
    name: 'Did Not See Sixty',
    condition: 'End the career before turning sixty.',
    when: (r) => r.ending !== undefined && r.age < 60,
  },
  {
    id: 'one_signature_short',
    name: 'One Signature Short',
    condition: 'End with one point of pact debt under the limit.',
    when: (r) =>
      r.ending !== 'consumed_by_pact' && r.pactDebt === FEAT_THRESHOLDS.pactDebtJustUnder,
  },
  {
    id: 'three_throws_running',
    name: 'Three Throws Running',
    condition: 'Win three gambles in a row.',
    when: (r) => longestGambleWinStreak(r) >= 3,
  },
  {
    id: 'courted_by_two',
    name: 'Courted by Two',
    condition: 'Be devoted to two factions at once.',
    when: (r) =>
      FACTIONS.filter((f) => r.factionStanding[f] >= FEAT_THRESHOLDS.devotion).length >= 2,
  },
  {
    id: 'nobody_to_carry_the_luggage',
    name: 'Nobody to Carry the Luggage',
    condition: 'Retire to the swamp with no followers.',
    hiddenUntilEnding: 'retired_to_swamp',
    hiddenCondition: 'Earned by one ending you have not seen yet.',
    when: (r) => r.ending === 'retired_to_swamp' && r.followers <= 0,
  },
];
