import type { Origin } from '../types';

/**
 * Four origins. Each is primarily a tone-setter; the modifier is small and
 * deliberately lopsided, so that run one already has a shape the player did
 * not choose on a slider.
 *
 * Asymmetry is the design goal — every origin makes one faction easier and at
 * least one harder, and one of them trades a debt for a head start on the
 * lair ladder.
 *
 * Each also grants its own named relic (issue #80, slice 3 of #77) — a
 * single `{ t: 'artifact', artifactId }`, never `artifactFrom`, because the
 * whole point is that a wizard of this background starts with THIS relic,
 * not a random one of its faction's commons. `scripts/validate-content.ts`
 * holds two things about the grant: it is exactly one per origin, and the
 * relic it names is a common — an origin relic is a background detail, not a
 * legendary the creation screen would otherwise gate behind a run.
 */
export const origins: Origin[] = [
  {
    id: 'expelled_pale_academy',
    name: 'Expelled from the Pale Academy',
    blurb:
      'One incident in the specimen wing. Four signatures on the letter, no author. You kept the robes.',
    effects: [
      { t: 'standing', factionId: 'pale_academy', v: -30 },
      { t: 'standing', factionId: 'ashen_covenant', v: 10 },
      { t: 'notoriety', v: 5 },
      { t: 'artifact', artifactId: 'footnote_that_bites' },
    ],
  },
  {
    id: 'bog_autodidact',
    name: 'Self-Taught in a Bog',
    blurb:
      'Nobody taught you. A waterlogged primer, three bad winters, and a frog that used to be somebody.',
    effects: [
      { t: 'standing', factionId: 'verdant_choir', v: 15 },
      { t: 'standing', factionId: 'pale_academy', v: -10 },
      { t: 'followers', v: 4 },
      { t: 'notoriety', v: 3 },
      { t: 'artifact', artifactId: 'mantle_of_slow_moss' },
    ],
  },
  {
    id: 'inherited_tower_and_debts',
    name: 'Inherited a Tower and Its Debts',
    blurb:
      'Your master died owing money to people who keep excellent records. The letters still arrive.',
    effects: [
      { t: 'lairTier', v: 3 },
      { t: 'pactDebt', v: 2 },
      { t: 'standing', factionId: 'gilded_hand', v: -15 },
      { t: 'notoriety', v: 2 },
      { t: 'artifact', artifactId: 'ashen_signature' },
    ],
  },
  {
    id: 'sold_masters_estate',
    name: 'Sold Your Master’s Estate',
    blurb:
      'You were on duty the week the estate became available. The Gilded Hand still calls it clean work.',
    effects: [
      { t: 'standing', factionId: 'gilded_hand', v: 20 },
      { t: 'standing', factionId: 'verdant_choir', v: -15 },
      // Was `{ t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'common' }`
      // — replaced (issue #80) with the named grant every origin now makes,
      // rather than stacking a random Hand common on top of it.
      { t: 'artifact', artifactId: 'unpaid_purse' },
    ],
  },
];
