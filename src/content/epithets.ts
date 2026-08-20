import type { FactionId, RunState } from '../types';
import { artifacts } from './artifacts';
import { lairs } from './lairs';

export type Epithet = {
  id: string;
  text: string;
  when: (r: RunState) => boolean;
};

const LEGENDARY_IDS = new Set(
  artifacts.filter((a) => a.rarity === 'legendary').map((a) => a.id),
);

const TIER_BY_LAIR = new Map(lairs.map((l) => [l.id, l.tier]));

const legendaries = (r: RunState): number =>
  r.heldArtifactIds.filter((id) => LEGENDARY_IDS.has(id)).length;

const tier = (r: RunState): number => TIER_BY_LAIR.get(r.lairId) ?? 0;

const standing = (r: RunState, f: FactionId): number => r.factionStanding[f];

const ALL_FACTIONS: FactionId[] = [
  'ashen_covenant',
  'gilded_hand',
  'pale_academy',
  'verdant_choir',
  'crownlands',
  'worm_below',
];

/**
 * Awarded from the highest-magnitude deed of a run. The engine takes the FIRST
 * predicate that matches, so ORDER IS THE PRIORITY LIST: most specific and
 * most impressive at the top, guaranteed catch-all at the bottom.
 *
 * An epithet is a title, not a score. It is printed beside a name the player
 * typed, so it has to survive being read aloud.
 */
export const epithets: Epithet[] = [
  {
    id: 'ended_the_argument',
    text: 'Who Ended the Argument',
    when: (r) => legendaries(r) >= 4 && r.notoriety >= 90,
  },
  {
    id: 'holder_of_impossible_things',
    text: 'Holder of Impossible Things',
    when: (r) => legendaries(r) >= 4,
  },
  {
    id: 'does_not_require_sleep',
    text: 'Who Does Not Require Sleep',
    when: (r) => r.isLich && r.notoriety >= 85,
  },
  {
    id: 'second_draft',
    text: 'the Second Draft',
    when: (r) => r.isLich,
  },
  {
    id: 'universally_regretted',
    text: 'the Universally Regretted',
    when: (r) => ALL_FACTIONS.every((f) => standing(r, f) <= -25),
  },
  {
    id: 'overdrawn',
    text: 'the Overdrawn',
    when: (r) => r.pactDebt >= 8,
  },
  {
    id: 'would_not_give_it_back',
    text: 'Who Would Not Give It Back',
    when: (r) => r.heldArtifactIds.length >= 12,
  },
  {
    id: 'twice_crowned',
    text: 'the Twice-Crowned',
    when: (r) => legendaries(r) >= 2,
  },
  {
    id: 'of_the_mouth',
    text: 'of the Mouth of the World',
    when: (r) => r.lairId === 'mouth_of_the_world',
  },
  {
    id: 'the_tenant',
    text: 'the Tenant',
    when: (r) => r.age >= 140 && tier(r) <= 1,
  },
  {
    id: 'poorly_advised',
    text: 'the Poorly Advised',
    when: (r) => r.apprentices.count >= 5 && r.apprentices.loyalty <= 25,
  },
  {
    id: 'overstaffed',
    text: 'the Overstaffed',
    when: (r) => r.apprentices.count >= 5,
  },
  {
    id: 'well_served',
    text: 'the Well-Served',
    when: (r) => r.apprentices.count >= 3 && r.apprentices.loyalty >= 75,
  },
  {
    id: 'signed_without_reading',
    text: 'Who Signed Without Reading',
    when: (r) => r.pactDebt >= 4,
  },
  {
    id: 'whose_congregation_sang',
    text: 'Whose Congregation Sang Poorly',
    when: (r) => r.followers >= 120,
  },
  {
    id: 'the_ashen',
    text: 'the Ashen',
    when: (r) => standing(r, 'ashen_covenant') >= 70,
  },
  {
    id: 'expected_below',
    text: 'Who Is Expected Below',
    when: (r) => standing(r, 'worm_below') >= 70,
  },
  {
    id: 'the_tenured',
    text: 'the Tenured',
    when: (r) => standing(r, 'pale_academy') >= 70,
  },
  {
    id: 'the_licensed',
    text: 'the Licensed',
    when: (r) => standing(r, 'crownlands') >= 70,
  },
  {
    id: 'the_solvent',
    text: 'the Solvent',
    when: (r) => standing(r, 'gilded_hand') >= 70,
  },
  {
    id: 'the_well_rooted',
    text: 'the Well-Rooted',
    when: (r) => standing(r, 'verdant_choir') >= 70,
  },
  {
    id: 'of_the_sunless_places',
    text: 'of the Sunless Places',
    when: (r) => tier(r) >= 7,
  },
  {
    id: 'whom_the_sword_missed',
    text: 'Whom the Sword Missed',
    when: (r) => r.heroThreat >= 40,
  },
  {
    id: 'the_kingdoms_concern',
    text: 'the Kingdom’s Concern',
    when: (r) => r.notoriety >= 75,
  },
  {
    id: 'in_the_ledger_of_dangers',
    text: 'of the Ledger of Dangers',
    when: (r) => r.notoriety >= 60,
  },
  {
    id: 'the_well_attended',
    text: 'the Well-Attended',
    when: (r) => r.followers >= 60,
  },
  {
    id: 'quietly_persistent',
    text: 'the Quietly Persistent',
    when: (r) => r.age >= 150,
  },
  {
    id: 'locally_disliked',
    text: 'the Locally Disliked',
    when: () => true,
  },
];

/**
 * Offered at character creation, before any deed exists to name the player
 * after. Deliberately unearned — the point is that the run will replace them.
 */
export const CREATION_EPITHETS: string[] = [
  'the Unpleasant',
  'the Inevitable',
  'of the Low Places',
  'the Presumed Dead',
];
