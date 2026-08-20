import type { Origin } from '../types';

/**
 * Four origins. Each is primarily a tone-setter; the modifier is small and
 * deliberately lopsided, so that run one already has a shape the player did
 * not choose on a slider.
 *
 * Asymmetry is the design goal — every origin makes one faction easier and at
 * least one harder, and one of them trades a debt for a head start on the
 * lair ladder.
 */
export const origins: Origin[] = [
  {
    id: 'expelled_pale_academy',
    name: 'Expelled from the Pale Academy',
    blurb:
      'Two years of excellent marks, one incident in the specimen wing, and a letter signed by four people who each believed a different one of them had made the decision. You kept the robes.',
    effects: [
      { t: 'standing', factionId: 'pale_academy', v: -30 },
      { t: 'standing', factionId: 'ashen_covenant', v: 10 },
      { t: 'notoriety', v: 5 },
    ],
  },
  {
    id: 'bog_autodidact',
    name: 'Self-Taught in a Bog',
    blurb:
      'Nobody taught you. You worked it out from a waterlogged primer, three bad winters, and a frog that had previously been somebody. The Choir noticed before anyone else did.',
    effects: [
      { t: 'standing', factionId: 'verdant_choir', v: 15 },
      { t: 'standing', factionId: 'pale_academy', v: -10 },
      { t: 'followers', v: 4 },
      { t: 'notoriety', v: 3 },
    ],
  },
  {
    id: 'inherited_tower_and_debts',
    name: 'Inherited a Tower and Its Debts',
    blurb:
      'Your master died owing money to people who keep excellent records. The tower is yours. So is the correspondence, which continues to arrive.',
    effects: [
      { t: 'lairTier', v: 3 },
      { t: 'pactDebt', v: 2 },
      { t: 'standing', factionId: 'gilded_hand', v: -15 },
      { t: 'notoriety', v: 2 },
    ],
  },
  {
    id: 'sold_masters_estate',
    name: 'Sold Your Master’s Estate',
    blurb:
      'You were the apprentice on duty the week the estate became available, and you handled the liquidation personally, and quickly. The Gilded Hand still refers to it as a clean piece of work.',
    effects: [
      { t: 'standing', factionId: 'gilded_hand', v: 20 },
      { t: 'standing', factionId: 'verdant_choir', v: -15 },
      { t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'common' },
    ],
  },
];
