import type { Offer } from '../../types';

/**
 * EVERGREEN OFFERS.
 *
 * Texture. These read equally well at thirty and at ninety, and they exist so
 * that the pool never starves and so a run has some weather in it between the
 * pacts and the sieges.
 */
export const anyOffers: Offer[] = [
  {
    id: 'any_works',
    title: 'Works',
    body: 'The tower water is coming through brown and singing faintly. The plumber says it is either the pipes or something living in the pipes, and quotes differently for each.',
    phase: 'any',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Pay for the pipes',
        effects: [
          { t: 'followers', v: -8 },
          { t: 'notoriety', v: -1 },
        ],
      },
      {
        kind: 'certain',
        label: 'Pay for the other thing',
        effects: [
          { t: 'followers', v: -14 },
          { t: 'notoriety', v: 5 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Drink it and find out',
        odds: 0.6,
        onSuccess: [
          { t: 'notoriety', v: 8 },
          { t: 'followers', v: 4 },
        ],
        onFailure: [
          { t: 'notoriety', v: -4 },
          { t: 'followers', v: -10 },
        ],
        successText: 'It was the pipes. You now sing faintly too.',
      },
    ],
  },

  {
    id: 'any_the_post',
    title: 'The Post',
    body: 'Nine letters have arrived. Four are threats, three are invoices, one is a marriage proposal, and one has been screaming quietly since Tuesday.',
    phase: 'any',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Answer the threats',
        effects: [
          { t: 'notoriety', v: 5 },
          { t: 'heroThreat', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Answer the invoices',
        effects: [
          { t: 'followers', v: -10 },
          { t: 'standing', factionId: 'gilded_hand', v: 10 },
        ],
      },
      {
        kind: 'certain',
        label: 'Answer the proposal',
        effects: [
          { t: 'followers', v: 12 },
          { t: 'loyalty', v: 5 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Open the screaming one',
        effects: [
          { t: 'notoriety', v: 7 },
          { t: 'standing', factionId: 'worm_below', v: 12 },
          { t: 'followers', v: -4 },
        ],
      },
    ],
  },

  {
    id: 'any_delivery',
    title: 'Delivery',
    body: 'A Gilded Hand courier has arrived with a parcel you did not order, an invoice, and a form declining all responsibility for what is inside it.',
    phase: 'any',
    factionId: 'gilded_hand',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Sign for it',
        effects: [
          { t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'common' },
          { t: 'followers', v: -12 },
          { t: 'standing', factionId: 'gilded_hand', v: 8 },
        ],
      },
      {
        kind: 'certain',
        label: 'Refuse delivery',
        effects: [
          { t: 'standing', factionId: 'gilded_hand', v: -8 },
          { t: 'notoriety', v: -1 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Open it on the doorstep and decide after',
        odds: 0.55,
        onSuccess: [
          { t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'common' },
          { t: 'standing', factionId: 'gilded_hand', v: 5 },
          { t: 'notoriety', v: 4 },
        ],
        onFailure: [
          { t: 'followers', v: -12 },
          { t: 'standing', factionId: 'gilded_hand', v: -12 },
          { t: 'notoriety', v: 2 },
        ],
        successText: 'You sign after opening. The courier waits.',
      },
    ],
  },

  {
    id: 'any_the_ballad',
    title: 'The Ballad',
    body: 'A bard has written a song about you. It is catchy, unflattering, and already being sung in three languages.',
    phase: 'any',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Pay him to stop',
        effects: [
          { t: 'followers', v: -12 },
          { t: 'notoriety', v: -5 },
        ],
      },
      {
        kind: 'certain',
        label: 'Pay him to continue',
        effects: [
          { t: 'followers', v: -8 },
          { t: 'notoriety', v: 10 },
          { t: 'heroThreat', v: 3 },
        ],
      },
      {
        kind: 'certain',
        label: 'Correct the second verse',
        effects: [
          { t: 'notoriety', v: 4 },
          { t: 'followers', v: 5 },
        ],
      },
    ],
  },

  {
    id: 'any_nightly',
    title: 'Nightly',
    body: 'Something addresses you by name each night at the same hour. It has never asked for anything, which has begun to be the part that concerns you.',
    phase: 'any',
    factionId: 'worm_below',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Answer it',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: 18 },
          { t: 'notoriety', v: 4 },
          { t: 'loyalty', v: -5 },
        ],
      },
      {
        kind: 'certain',
        label: 'Ignore it',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: -8 },
          { t: 'notoriety', v: 1 },
        ],
      },
      {
        kind: 'certain',
        label: 'Have the room bricked up',
        effects: [
          { t: 'followers', v: -8 },
          { t: 'standing', factionId: 'worm_below', v: -15 },
          { t: 'heroThreat', v: -2 },
        ],
      },
    ],
  },

  {
    id: 'any_annual_review',
    title: 'Annual Review',
    body: "It is time for apprentice appraisals. The form asks you to rate each of them on initiative, discretion, and 'likelihood of eventual regicide'.",
    phase: 'any',
    requires: [{ c: 'minApprentices', v: 1 }],
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Mark them generously',
        effects: [
          { t: 'loyalty', v: 15 },
          { t: 'notoriety', v: -2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Mark them honestly',
        effects: [
          { t: 'loyalty', v: -10 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Mark one of them very low, in front of the others',
        effects: [
          { t: 'loyalty', v: -18 },
          { t: 'followers', v: 6 },
          { t: 'notoriety', v: 5 },
        ],
      },
    ],
  },

  {
    id: 'any_the_survey',
    title: 'The Survey',
    body: "The Pale Academy is conducting a survey of practising alumni. Question eleven asks how many people you have killed and provides a box marked 'approximately'.",
    phase: 'any',
    factionId: 'pale_academy',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Complete it fully',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: 15 },
          { t: 'heroThreat', v: 3 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Complete it creatively',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: 5 },
          { t: 'notoriety', v: 5 },
        ],
      },
    ],
  },

  {
    id: 'any_the_bees',
    title: 'The Bees',
    body: 'The Verdant Choir has relocated a swarm into your orchard without notice. The bees are enormous, entirely peaceful, and taking notes.',
    phase: 'any',
    factionId: 'verdant_choir',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Leave them be',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: 14 },
          { t: 'notoriety', v: -2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Take the honey',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: -12 },
          { t: 'notoriety', v: 5 },
          { t: 'followers', v: 8 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Talk to them',
        odds: 0.55,
        onSuccess: [
          { t: 'standing', factionId: 'verdant_choir', v: 20 },
          { t: 'artifactFrom', factionId: 'verdant_choir', rarity: 'common' },
        ],
        onFailure: [
          { t: 'standing', factionId: 'verdant_choir', v: -18 },
          { t: 'followers', v: -6 },
          { t: 'notoriety', v: -2 },
        ],
      },
    ],
  },

  {
    id: 'any_contractors',
    title: 'Contractors',
    body: 'The goblin work gang has finished the crypt extension nine months early and thirty per cent over budget, and will not explain either figure.',
    phase: 'any',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Pay the overage',
        effects: [
          { t: 'followers', v: -15 },
          { t: 'lairTier', v: 1 },
        ],
      },
      {
        kind: 'certain',
        label: 'Pay half and argue',
        effects: [
          { t: 'followers', v: -8 },
          { t: 'notoriety', v: 3 },
          { t: 'loyalty', v: -5 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Inspect the work first',
        odds: 0.8,
        onSuccess: [
          { t: 'lairTier', v: 1 },
          { t: 'followers', v: -8 },
          { t: 'notoriety', v: 4 },
        ],
        onFailure: [
          { t: 'followers', v: -18 },
          { t: 'notoriety', v: -4 },
        ],
        failureText: 'The extension is excellent. It is also nine feet to the left of where it was commissioned.',
      },
    ],
  },

  {
    id: 'any_the_mirror',
    title: 'The Mirror',
    body: 'The scrying mirror has begun showing you the same room from a slightly different angle each time. You have not yet identified the room.',
    phase: 'any',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Cover it',
        effects: [
          { t: 'notoriety', v: -2 },
          { t: 'followers', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Keep watching',
        effects: [
          { t: 'notoriety', v: 6 },
          { t: 'standing', factionId: 'worm_below', v: 10 },
          { t: 'loyalty', v: -5 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Step through',
        odds: 0.4,
        onSuccess: [
          { t: 'notoriety', v: 12 },
          { t: 'artifactFrom', factionId: 'worm_below', rarity: 'rare' },
        ],
        onFailure: [
          { t: 'notoriety', v: -6 },
          { t: 'followers', v: -12 },
          { t: 'heroThreat', v: 4 },
        ],
      },
    ],
  },

  {
    id: 'any_nomenclature',
    title: 'Nomenclature',
    body: 'The villagers have renamed you. The new name is shorter, cruder, and has already replaced the old one in two neighbouring provinces.',
    phase: 'any',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Insist on the original',
        effects: [
          { t: 'notoriety', v: -4 },
          { t: 'followers', v: -3 },
        ],
      },
      {
        kind: 'certain',
        label: 'Adopt the new one',
        effects: [
          { t: 'notoriety', v: 9 },
          { t: 'followers', v: 6 },
        ],
      },
      {
        kind: 'certain',
        label: 'Adopt something worse, first',
        effects: [
          { t: 'notoriety', v: 12 },
          { t: 'followers', v: -8 },
          { t: 'heroThreat', v: 2 },
        ],
      },
    ],
  },

  {
    id: 'any_inventory',
    title: 'Inventory',
    body: 'Your steward has completed the annual count of the relic vault. One item is unaccounted for, and one item is not on any previous list.',
    phase: 'any',
    requires: [{ c: 'holdsAnyArtifact' }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Chase the missing item',
        effects: [
          { t: 'followers', v: -8 },
          { t: 'loyalty', v: -6 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Examine the new one',
        effects: [
          { t: 'notoriety', v: 6 },
          { t: 'standing', factionId: 'worm_below', v: 8 },
          { t: 'followers', v: -4 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Do nothing and see which returns',
        odds: 0.6,
        onSuccess: [
          { t: 'notoriety', v: 7 },
          { t: 'artifactFrom', factionId: 'worm_below', rarity: 'common' },
        ],
        onFailure: [
          { t: 'loseArtifact' },
          { t: 'notoriety', v: -3 },
        ],
      },
    ],
  },

  {
    id: 'any_the_cat',
    title: 'The Cat',
    body: 'A cat has moved into the observatory. It is unremarkable in every measurable respect, and three separate divinations have failed to say anything about it at all.',
    phase: 'any',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Let it stay',
        effects: [
          { t: 'loyalty', v: 8 },
          { t: 'followers', v: 3 },
        ],
      },
      {
        kind: 'certain',
        label: 'Have it removed',
        effects: [
          { t: 'loyalty', v: -6 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Investigate it properly',
        odds: 0.4,
        onSuccess: [
          { t: 'notoriety', v: 8 },
          { t: 'artifactFrom', factionId: 'pale_academy', rarity: 'common' },
        ],
        onFailure: [
          { t: 'followers', v: -8 },
          { t: 'loyalty', v: -10 },
          { t: 'notoriety', v: -3 },
        ],
        failureText: 'Four divinations now. The fourth diviner has asked not to be contacted again.',
      },
    ],
  },

  {
    id: 'any_dinner',
    title: 'Dinner',
    body: 'You have been invited to dine with the neighbouring lord. He knows exactly what you are and has seated you next to his sister anyway.',
    phase: 'any',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Go, and behave',
        effects: [
          { t: 'standing', factionId: 'crownlands', v: 12 },
          { t: 'followers', v: 8 },
          { t: 'notoriety', v: -3 },
        ],
      },
      {
        kind: 'certain',
        label: "Go, and don't",
        effects: [
          { t: 'notoriety', v: 10 },
          { t: 'standing', factionId: 'crownlands', v: -15 },
          { t: 'heroThreat', v: 3 },
        ],
      },
      {
        kind: 'certain',
        label: 'Send regrets',
        effects: [
          { t: 'notoriety', v: 1 },
          { t: 'standing', factionId: 'crownlands', v: -4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Send an apprentice in your place',
        effects: [
          { t: 'loyalty', v: 10 },
          { t: 'standing', factionId: 'crownlands', v: 4 },
          { t: 'notoriety', v: -1 },
        ],
        resultText: 'They get on well. Alarmingly well. There is talk of a second dinner.',
      },
    ],
  },

  {
    id: 'any_the_apprentice_question',
    title: 'A Question After Dinner',
    body: 'An apprentice asks, without any apparent agenda, whether what you do is wrong. You have had eighty years to prepare an answer and did not use them.',
    phase: 'any',
    requires: [{ c: 'minApprentices', v: 1 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Say yes',
        effects: [
          { t: 'loyalty', v: 18 },
          { t: 'notoriety', v: -4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Say no, at length',
        effects: [
          { t: 'loyalty', v: -8 },
          { t: 'notoriety', v: 5 },
          { t: 'followers', v: 4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Change the subject',
        effects: [
          { t: 'loyalty', v: -3 },
          { t: 'notoriety', v: 1 },
        ],
      },
    ],
  },
];
