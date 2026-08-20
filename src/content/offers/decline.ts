import type { Offer } from '../../types';

/**
 * DECLINE-PHASE OFFERS.
 *
 * Protection energy. These are not punishments and must never read as "you are
 * losing" — they are simply harder problems with tighter margins. The player is
 * defending something they built, and a few of these are genuine reversals for
 * anyone willing to bet the estate on one.
 */
export const declineOffers: Offer[] = [
  {
    id: 'decline_sighting',
    title: 'Sighting',
    body: 'A traveller describes a young woman on the north road carrying a sword too old for her. Three separate people have now told you this story unprompted.',
    phase: 'decline',
    factionId: 'crownlands',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Send riders to the north road',
        effects: [
          { t: 'followers', v: -10 },
          { t: 'heroThreat', v: -6 },
        ],
      },
      {
        kind: 'certain',
        label: 'Watch the roads and wait',
        effects: [
          { t: 'heroThreat', v: 3 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Have her intercepted',
        odds: 0.45,
        onSuccess: [
          { t: 'heroThreat', v: -12 },
          { t: 'notoriety', v: 6 },
          { t: 'standing', factionId: 'crownlands', v: -15 },
        ],
        onFailure: [
          { t: 'heroThreat', v: 10 },
          { t: 'followers', v: -12 },
          { t: 'standing', factionId: 'crownlands', v: -20 },
        ],
      },
    ],
  },

  {
    id: 'decline_initiative',
    title: 'Initiative',
    body: 'One of your apprentices has started signing letters with your seal. She is doing it competently, which is the part that concerns you.',
    phase: 'decline',
    requires: [{ c: 'minApprentices', v: 2 }],
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Promote her',
        effects: [
          { t: 'loyalty', v: 18 },
          { t: 'followers', v: 8 },
          { t: 'notoriety', v: 3 },
        ],
      },
      {
        kind: 'certain',
        label: 'Demote her publicly',
        effects: [
          { t: 'loyalty', v: -20 },
          { t: 'notoriety', v: 5 },
          { t: 'followers', v: 4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Remove her',
        effects: [
          { t: 'apprentices', v: -1 },
          { t: 'loyalty', v: -12 },
          { t: 'notoriety', v: 6 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Give her something real to do, far away',
        odds: 0.6,
        onSuccess: [
          { t: 'loyalty', v: 10 },
          { t: 'notoriety', v: 7 },
          { t: 'followers', v: 12 },
        ],
        onFailure: [
          { t: 'apprentices', v: -1 },
          { t: 'loyalty', v: -18 },
          { t: 'notoriety', v: -4 },
        ],
        failureText: 'She does it beautifully, and then keeps the province.',
      },
    ],
  },

  {
    id: 'decline_account_review',
    title: 'Account Review',
    body: "The Gilded Hand has reviewed your account in light of recent developments. Hesper Quill's letter uses the word 'exposure' four times and never once about you.",
    phase: 'decline',
    factionId: 'gilded_hand',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Settle in full',
        effects: [
          { t: 'followers', v: -30 },
          { t: 'standing', factionId: 'gilded_hand', v: 20 },
        ],
      },
      {
        kind: 'certain',
        label: 'Settle in relics',
        effects: [
          { t: 'loseArtifact' },
          { t: 'standing', factionId: 'gilded_hand', v: 15 },
          { t: 'notoriety', v: -2 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Dispute the valuation',
        odds: 0.45,
        onSuccess: [
          { t: 'standing', factionId: 'gilded_hand', v: 10 },
          { t: 'followers', v: -8 },
        ],
        onFailure: [
          { t: 'loseArtifact' },
          { t: 'standing', factionId: 'gilded_hand', v: -25 },
          { t: 'followers', v: -15 },
        ],
      },
    ],
  },

  {
    id: 'decline_careful_letter',
    title: 'A Careful Letter',
    body: 'The Pale Academy writes to clarify that you were expelled, that this has always been their position, and that the plaque was removed for unrelated maintenance reasons.',
    phase: 'decline',
    factionId: 'pale_academy',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Accept the clarification',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: 10 },
          { t: 'notoriety', v: -4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Publish the correspondence',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: -20 },
          { t: 'notoriety', v: 8 },
          { t: 'followers', v: 6 },
        ],
      },
      {
        kind: 'certain',
        label: 'Ask for shelter anyway',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: 18 },
          { t: 'heroThreat', v: -7 },
          { t: 'notoriety', v: -8 },
          { t: 'followers', v: -10 },
        ],
      },
    ],
  },

  {
    id: 'decline_reclamation',
    title: 'Reclamation',
    body: 'The Verdant Choir has filed to have your hill returned to its prior condition. Its prior condition was a marsh, and they have the paperwork to prove it.',
    phase: 'decline',
    factionId: 'verdant_choir',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Concede the lower terraces',
        effects: [
          { t: 'lairTier', v: -1 },
          { t: 'standing', factionId: 'verdant_choir', v: 25 },
          { t: 'followers', v: -5 },
        ],
      },
      {
        kind: 'certain',
        label: 'Fight the filing',
        effects: [
          { t: 'followers', v: -18 },
          { t: 'standing', factionId: 'verdant_choir', v: -20 },
          { t: 'notoriety', v: 4 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Counter-file for the whole valley',
        odds: 0.35,
        onSuccess: [
          { t: 'standing', factionId: 'verdant_choir', v: -15 },
          { t: 'lairTier', v: 1 },
          { t: 'notoriety', v: 10 },
        ],
        onFailure: [
          { t: 'lairTier', v: -1 },
          { t: 'standing', factionId: 'verdant_choir', v: -30 },
          { t: 'followers', v: -20 },
        ],
      },
    ],
  },

  {
    id: 'decline_an_arrangement',
    title: 'An Arrangement',
    body: 'The Worm Below observes that time is a problem for you and not for it. It proposes an arrangement and waits with the patience of a thing that has never once been in a hurry.',
    phase: 'decline',
    factionId: 'worm_below',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Hear the terms',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: 25 },
          { t: 'notoriety', v: 4 },
          { t: 'pactDebt', v: 1 },
        ],
      },
      {
        kind: 'certain',
        label: 'Decline',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: -15 },
          { t: 'loyalty', v: 8 },
          { t: 'notoriety', v: -2 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Propose your own',
        odds: 0.4,
        onSuccess: [
          { t: 'standing', factionId: 'worm_below', v: 30 },
          { t: 'artifactFrom', factionId: 'worm_below', rarity: 'rare' },
          { t: 'notoriety', v: 8 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'worm_below', v: -20 },
          { t: 'followers', v: -15 },
          { t: 'pactDebt', v: 2 },
        ],
      },
    ],
  },

  {
    id: 'decline_collections',
    title: 'Collections',
    body: 'Something has arrived to discuss your outstanding balance. It is polite, it is patient, and it has brought a chair for you but not for itself.',
    phase: 'decline',
    factionId: 'ashen_covenant',
    requires: [{ c: 'minPactDebt', v: 2 }],
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Pay in followers',
        effects: [
          { t: 'followers', v: -35 },
          { t: 'pactDebt', v: -2 },
          { t: 'standing', factionId: 'ashen_covenant', v: 10 },
        ],
      },
      {
        kind: 'certain',
        label: 'Pay in apprentices',
        effects: [
          { t: 'apprentices', v: -1 },
          { t: 'pactDebt', v: -2 },
          { t: 'loyalty', v: -18 },
          { t: 'standing', factionId: 'ashen_covenant', v: 12 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Ask for an extension',
        odds: 0.35,
        onSuccess: [
          { t: 'pactDebt', v: -1 },
          { t: 'standing', factionId: 'ashen_covenant', v: 8 },
        ],
        onFailure: [
          { t: 'pactDebt', v: 2 },
          { t: 'followers', v: -20 },
          { t: 'notoriety', v: -5 },
        ],
      },
    ],
  },

  {
    id: 'decline_the_notice',
    title: 'The Notice',
    body: 'Your bounty has been raised again. It is now high enough that you have begun appearing in career advice given to young people.',
    phase: 'decline',
    factionId: 'crownlands',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Pay it down through intermediaries',
        effects: [
          { t: 'followers', v: -22 },
          { t: 'heroThreat', v: -8 },
          { t: 'notoriety', v: -5 },
        ],
      },
      {
        kind: 'certain',
        label: "Fund a bounty on the Crown's assessor",
        effects: [
          { t: 'notoriety', v: 9 },
          { t: 'heroThreat', v: 6 },
          { t: 'standing', factionId: 'crownlands', v: -22 },
        ],
      },
      {
        kind: 'certain',
        label: 'Have the notices posted more widely',
        effects: [
          { t: 'notoriety', v: 12 },
          { t: 'heroThreat', v: 7 },
          { t: 'followers', v: 10 },
        ],
      },
    ],
  },

  {
    id: 'decline_attrition',
    title: 'Attrition',
    body: 'Fourteen of your people left this month without notice. Your steward has stopped writing down the numbers and started writing down the reasons.',
    phase: 'decline',
    requires: [{ c: 'minFollowers', v: 30 }],
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Improve the terms',
        effects: [
          { t: 'followers', v: 12 },
          { t: 'loyalty', v: 10 },
          { t: 'notoriety', v: -2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Make an example of one',
        effects: [
          { t: 'followers', v: -6 },
          { t: 'loyalty', v: -15 },
          { t: 'notoriety', v: 6 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Find out who is recruiting them',
        odds: 0.55,
        onSuccess: [
          { t: 'followers', v: 18 },
          { t: 'notoriety', v: 5 },
          { t: 'heroThreat', v: -3 },
        ],
        onFailure: [
          { t: 'followers', v: -20 },
          { t: 'loyalty', v: -10 },
        ],
        failureText: 'Nobody is recruiting them. They simply looked at the arithmetic.',
      },
    ],
  },

  {
    id: 'decline_deferred_maintenance',
    title: 'Deferred Maintenance',
    body: 'The east wing has developed a smell, a draught, and a rumour. Your steward presents three quotes and one resignation letter, undated.',
    phase: 'decline',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Approve the full repair',
        effects: [
          { t: 'followers', v: -20 },
          { t: 'heroThreat', v: -4 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Seal the east wing and never speak of it',
        odds: 0.6,
        onSuccess: [
          { t: 'notoriety', v: 7 },
          { t: 'followers', v: 4 },
        ],
        onFailure: [
          { t: 'lairTier', v: -1 },
          { t: 'followers', v: -12 },
          { t: 'notoriety', v: -3 },
        ],
      },
    ],
  },

  {
    id: 'decline_vorlag_again',
    title: 'Vorlag, Again',
    body: 'Vorlag the Unremarkable has spent forty years becoming slightly less unremarkable and has arrived to say so. He has brought a retinue and a prepared statement.',
    phase: 'decline',
    weight: 2,
    options: [
      {
        kind: 'gamble',
        label: 'Duel him properly this time',
        odds: 0.6,
        onSuccess: [
          { t: 'notoriety', v: 12 },
          { t: 'followers', v: 15 },
        ],
        onFailure: [
          { t: 'notoriety', v: -10 },
          { t: 'followers', v: -18 },
          { t: 'heroThreat', v: 5 },
        ],
      },
      {
        kind: 'certain',
        label: 'Ally with him',
        effects: [
          { t: 'followers', v: 20 },
          { t: 'notoriety', v: 3 },
          { t: 'heroThreat', v: -4 },
          { t: 'loyalty', v: -6 },
        ],
      },
      {
        kind: 'certain',
        label: 'Give him the north tower to be rid of him',
        effects: [
          { t: 'lairTier', v: -1 },
          { t: 'heroThreat', v: -6 },
          { t: 'followers', v: 5 },
          { t: 'notoriety', v: -3 },
        ],
      },
    ],
  },

  {
    id: 'decline_the_levy',
    title: 'The Levy',
    body: 'The Crownlands have raised a levy against you. It is not an army yet; it is a budget line, which is how armies begin.',
    phase: 'decline',
    factionId: 'crownlands',
    requires: [{ c: 'minNotoriety', v: 55 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Fortify and wait',
        effects: [
          { t: 'followers', v: -20 },
          { t: 'heroThreat', v: -8 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Strike the muster point first',
        effects: [
          { t: 'notoriety', v: 12 },
          { t: 'heroThreat', v: 8 },
          { t: 'standing', factionId: 'crownlands', v: -25 },
          { t: 'followers', v: -10 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Buy the quartermaster',
        odds: 0.35,
        onSuccess: [
          { t: 'heroThreat', v: -14 },
          { t: 'followers', v: -15 },
          { t: 'standing', factionId: 'crownlands', v: 5 },
        ],
        onFailure: [
          { t: 'followers', v: -25 },
          { t: 'heroThreat', v: 8 },
          { t: 'standing', factionId: 'crownlands', v: -20 },
        ],
      },
    ],
  },

  {
    id: 'decline_something_in_the_wine',
    title: 'Something in the Wine',
    body: "The wine tasted wrong tonight. You are old, careful and still alive, which means somebody's plan failed at the first attempt — and that there will be a second.",
    phase: 'decline',
    requires: [{ c: 'minApprentices', v: 1 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Interrogate the household',
        effects: [
          { t: 'apprentices', v: -1 },
          { t: 'loyalty', v: -15 },
          { t: 'followers', v: -8 },
          { t: 'notoriety', v: 4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Say nothing; change your habits',
        effects: [
          { t: 'loyalty', v: -5 },
          { t: 'heroThreat', v: 2 },
          { t: 'notoriety', v: 1 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Poison the wine yourself, better',
        odds: 0.5,
        onSuccess: [
          { t: 'apprentices', v: -1 },
          { t: 'loyalty', v: 12 },
          { t: 'notoriety', v: 8 },
        ],
        onFailure: [
          { t: 'apprentices', v: -1 },
          { t: 'loyalty', v: -25 },
          { t: 'followers', v: -10 },
          { t: 'notoriety', v: -3 },
        ],
      },
    ],
  },

  {
    id: 'decline_the_dreams',
    title: 'The Dreams',
    body: 'You have dreamed of the same corridor for nine years. Last night there was a door at the end of it, and it was ajar.',
    phase: 'decline',
    factionId: 'worm_below',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Walk to the door',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: 22 },
          { t: 'notoriety', v: 6 },
          { t: 'pactDebt', v: 1 },
        ],
      },
      {
        kind: 'certain',
        label: 'Stop sleeping',
        effects: [
          { t: 'notoriety', v: 3 },
          { t: 'followers', v: -6 },
          { t: 'loyalty', v: -5 },
          { t: 'standing', factionId: 'worm_below', v: -8 },
        ],
      },
    ],
  },

  {
    id: 'decline_liquidation',
    title: 'Liquidation',
    body: 'The Gilded Hand is quietly selling anything associated with you, at a discount, in bulk. Hesper Quill calls it rebalancing the portfolio and does not make eye contact.',
    phase: 'decline',
    factionId: 'gilded_hand',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Buy your own reputation back',
        effects: [
          { t: 'followers', v: -25 },
          { t: 'notoriety', v: 8 },
          { t: 'standing', factionId: 'gilded_hand', v: 10 },
        ],
      },
      {
        kind: 'certain',
        label: 'Let them',
        effects: [
          { t: 'notoriety', v: -8 },
          { t: 'followers', v: 8 },
          { t: 'standing', factionId: 'gilded_hand', v: -10 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Ruin them first',
        odds: 0.4,
        onSuccess: [
          { t: 'notoriety', v: 14 },
          { t: 'standing', factionId: 'gilded_hand', v: -30 },
          { t: 'followers', v: 10 },
        ],
        onFailure: [
          { t: 'followers', v: -30 },
          { t: 'notoriety', v: -6 },
          { t: 'standing', factionId: 'gilded_hand', v: -35 },
        ],
      },
    ],
  },

  {
    id: 'decline_the_hearing',
    title: 'The Hearing',
    body: 'The Pale Academy has convened a hearing on whether your degree should be posthumously revoked. You are not dead. This was raised, and noted, and the hearing is proceeding.',
    phase: 'decline',
    factionId: 'pale_academy',
    requires: [{ c: 'minNotoriety', v: 50 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Attend and defend yourself',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: 18 },
          { t: 'notoriety', v: -6 },
          { t: 'heroThreat', v: -4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Send a lawyer',
        effects: [
          { t: 'followers', v: -12 },
          { t: 'standing', factionId: 'pale_academy', v: 8 },
          { t: 'notoriety', v: -1 },
        ],
      },
      {
        kind: 'certain',
        label: 'Attend and do something memorable',
        effects: [
          { t: 'notoriety', v: 14 },
          { t: 'standing', factionId: 'pale_academy', v: -30 },
          { t: 'heroThreat', v: 8 },
        ],
      },
    ],
  },

  {
    id: 'decline_amnesty',
    title: 'Amnesty',
    body: 'The Crown offers amnesty to wizards over a certain age who surrender their instruments and retire to a supervised address. Six of your contemporaries have already accepted.',
    phase: 'decline',
    factionId: 'crownlands',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Accept the amnesty',
        effects: [
          { t: 'heroThreat', v: -18 },
          { t: 'notoriety', v: -20 },
          { t: 'followers', v: -25 },
          { t: 'standing', factionId: 'crownlands', v: 30 },
        ],
      },
      {
        kind: 'certain',
        label: 'Refuse publicly',
        effects: [
          { t: 'notoriety', v: 10 },
          { t: 'heroThreat', v: 6 },
          { t: 'standing', factionId: 'crownlands', v: -20 },
        ],
      },
      {
        kind: 'certain',
        label: 'Refuse quietly',
        effects: [
          { t: 'notoriety', v: 2 },
          { t: 'heroThreat', v: 2 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Accept, then disappear en route',
        odds: 0.4,
        onSuccess: [
          { t: 'heroThreat', v: -12 },
          { t: 'notoriety', v: 8 },
          { t: 'standing', factionId: 'crownlands', v: -25 },
        ],
        onFailure: [
          { t: 'heroThreat', v: 14 },
          { t: 'followers', v: -20 },
          { t: 'standing', factionId: 'crownlands', v: -30 },
        ],
      },
    ],
  },

  {
    id: 'decline_the_squire',
    title: 'The Squire',
    body: 'The chosen one has a squire. The squire is homesick, underpaid, and drinking in a town you own.',
    phase: 'decline',
    factionId: 'crownlands',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Buy him a drink and a future',
        effects: [
          { t: 'heroThreat', v: -7 },
          { t: 'followers', v: 6 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Kill him',
        effects: [
          { t: 'heroThreat', v: 9 },
          { t: 'notoriety', v: 7 },
          { t: 'standing', factionId: 'crownlands', v: -20 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Turn him',
        odds: 0.65,
        onSuccess: [
          { t: 'heroThreat', v: -12 },
          { t: 'apprentices', v: 1 },
          { t: 'notoriety', v: 5 },
          { t: 'artifactFrom', factionId: 'crownlands', rarity: 'common' },
        ],
        onFailure: [
          { t: 'heroThreat', v: 12 },
          { t: 'notoriety', v: -4 },
          { t: 'followers', v: -8 },
        ],
        failureText: 'He was homesick. He was not, as it turns out, for sale.',
      },
    ],
  },

  {
    id: 'decline_the_last_rite',
    title: 'The Last Rite',
    body: 'The Covenant offers the rite it reserves for members in their final century. Ceremoniarch Yull is very old now and performs it seated, which he insists is unrelated.',
    phase: 'decline',
    factionId: 'ashen_covenant',
    requires: [{ c: 'minStanding', factionId: 'ashen_covenant', v: 30 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Undergo the rite',
        effects: [
          { t: 'notoriety', v: 18 },
          { t: 'apprentices', v: -2 },
          { t: 'loyalty', v: -20 },
          { t: 'standing', factionId: 'ashen_covenant', v: 20 },
          { t: 'pactDebt', v: 1 },
        ],
      },
      {
        kind: 'certain',
        label: 'Undergo the lesser form',
        effects: [
          { t: 'notoriety', v: 7 },
          { t: 'apprentices', v: -1 },
          { t: 'standing', factionId: 'ashen_covenant', v: 10 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Perform it on Yull instead',
        odds: 0.3,
        onSuccess: [
          { t: 'notoriety', v: 22 },
          { t: 'artifactFrom', factionId: 'ashen_covenant', rarity: 'legendary' },
          { t: 'standing', factionId: 'ashen_covenant', v: -30 },
        ],
        onFailure: [
          { t: 'pactDebt', v: 3 },
          { t: 'notoriety', v: -10 },
          { t: 'followers', v: -20 },
          { t: 'standing', factionId: 'ashen_covenant', v: -40 },
        ],
      },
    ],
  },

  {
    id: 'decline_subsidence',
    title: 'Subsidence',
    body: 'The floor of the great hall is two feet lower than it was. Nothing has broken; the stone simply agreed to go.',
    phase: 'decline',
    factionId: 'worm_below',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Feed it and hope it stops',
        effects: [
          { t: 'followers', v: -20 },
          { t: 'standing', factionId: 'worm_below', v: 18 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Move the household upstairs',
        effects: [
          { t: 'lairTier', v: -1 },
          { t: 'standing', factionId: 'worm_below', v: -5 },
          { t: 'followers', v: -5 },
        ],
      },
      {
        kind: 'certain',
        label: 'Go down and negotiate',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: 25 },
          { t: 'notoriety', v: 8 },
          { t: 'pactDebt', v: 1 },
          { t: 'heroThreat', v: -4 },
        ],
      },
    ],
  },

  {
    id: 'decline_grievances',
    title: 'Grievances',
    body: "Your followers have elected a representative. She has a list, the list is numbered, and item one is 'the screaming'.",
    phase: 'decline',
    requires: [{ c: 'minFollowers', v: 50 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Meet the list',
        effects: [
          { t: 'followers', v: 18 },
          { t: 'loyalty', v: 12 },
          { t: 'notoriety', v: -6 },
        ],
      },
      {
        kind: 'certain',
        label: 'Meet items two through nine',
        effects: [
          { t: 'followers', v: 8 },
          { t: 'loyalty', v: 5 },
          { t: 'notoriety', v: -2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Disband the committee',
        effects: [
          { t: 'followers', v: -20 },
          { t: 'loyalty', v: -12 },
          { t: 'notoriety', v: 7 },
        ],
      },
    ],
  },

  {
    id: 'decline_deaccession',
    title: 'Deaccession',
    body: 'The Gilded Hand will buy any relic, immediately, in cash, no questions. Hesper Quill mentions that late-career acquisitions are their most profitable line and lets the sentence sit.',
    phase: 'decline',
    factionId: 'gilded_hand',
    requires: [{ c: 'holdsAnyArtifact' }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Sell one piece',
        effects: [
          { t: 'loseArtifact' },
          { t: 'followers', v: 30 },
          { t: 'standing', factionId: 'gilded_hand', v: 12 },
          { t: 'notoriety', v: -4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Sell nothing',
        effects: [
          { t: 'standing', factionId: 'gilded_hand', v: -6 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Sell a forgery instead',
        odds: 0.4,
        onSuccess: [
          { t: 'followers', v: 35 },
          { t: 'notoriety', v: 9 },
          { t: 'standing', factionId: 'gilded_hand', v: 5 },
        ],
        onFailure: [
          { t: 'loseArtifact' },
          { t: 'standing', factionId: 'gilded_hand', v: -30 },
          { t: 'followers', v: -15 },
          { t: 'heroThreat', v: 4 },
        ],
      },
    ],
  },

  {
    id: 'decline_sanctuary',
    title: 'Sanctuary',
    body: 'The Pale Academy will hide you. The terms are a cell, a name that is not yours, and a standing agreement never to be interesting again.',
    phase: 'decline',
    factionId: 'pale_academy',
    requires: [{ c: 'minStanding', factionId: 'pale_academy', v: 20 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Take sanctuary',
        effects: [
          { t: 'heroThreat', v: -20 },
          { t: 'notoriety', v: -18 },
          { t: 'followers', v: -30 },
          { t: 'standing', factionId: 'pale_academy', v: 25 },
        ],
      },
      {
        kind: 'certain',
        label: 'Take it for a decade only',
        effects: [
          { t: 'heroThreat', v: -9 },
          { t: 'notoriety', v: -7 },
          { t: 'followers', v: -10 },
          { t: 'standing', factionId: 'pale_academy', v: 12 },
        ],
      },
      {
        kind: 'certain',
        label: 'Refuse',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: -15 },
          { t: 'notoriety', v: 4 },
        ],
      },
    ],
  },

  {
    id: 'decline_final_terms',
    title: 'Final Terms',
    body: 'Brambleward Oona sends terms rather than a threat, which from the Choir is the same document with better manners.',
    phase: 'decline',
    factionId: 'verdant_choir',
    requires: [{ c: 'maxStanding', factionId: 'verdant_choir', v: -20 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Accept the terms',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: 35 },
          { t: 'lairTier', v: -1 },
          { t: 'notoriety', v: -8 },
          { t: 'heroThreat', v: -6 },
        ],
      },
      {
        kind: 'certain',
        label: 'Reject them',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: -20 },
          { t: 'heroThreat', v: 6 },
          { t: 'notoriety', v: 5 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Accept, and break them in ten years',
        odds: 0.4,
        onSuccess: [
          { t: 'standing', factionId: 'verdant_choir', v: 20 },
          { t: 'notoriety', v: 10 },
          { t: 'followers', v: 10 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'verdant_choir', v: -40 },
          { t: 'lairTier', v: -1 },
          { t: 'followers', v: -25 },
          { t: 'heroThreat', v: 8 },
        ],
      },
    ],
  },

  {
    id: 'decline_the_herald',
    title: 'The Herald',
    body: 'A herald reads your crimes aloud at your own gate. It takes most of the morning, and by the end a small crowd has gathered for the good bits.',
    phase: 'decline',
    factionId: 'crownlands',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Let him finish',
        effects: [
          { t: 'notoriety', v: 9 },
          { t: 'heroThreat', v: 4 },
          { t: 'followers', v: 6 },
        ],
      },
      {
        kind: 'certain',
        label: 'Silence him mid-list',
        effects: [
          { t: 'notoriety', v: 5 },
          { t: 'standing', factionId: 'crownlands', v: -18 },
          { t: 'heroThreat', v: 7 },
        ],
      },
      {
        kind: 'certain',
        label: 'Correct three of the charges',
        effects: [
          { t: 'notoriety', v: 4 },
          { t: 'standing', factionId: 'crownlands', v: 6 },
          { t: 'followers', v: 4 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Supply him with a longer list',
        odds: 0.55,
        onSuccess: [
          { t: 'notoriety', v: 15 },
          { t: 'followers', v: 12 },
          { t: 'heroThreat', v: 5 },
        ],
        onFailure: [
          { t: 'notoriety', v: -6 },
          { t: 'heroThreat', v: 9 },
          { t: 'standing', factionId: 'crownlands', v: -20 },
        ],
      },
    ],
  },

  {
    id: 'decline_the_understudy',
    title: 'The Understudy',
    body: 'A man in the next province has been impersonating you for eleven years. He is not very good at it, and yet the Crown lists him as a credible sighting.',
    phase: 'decline',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Fund him properly',
        effects: [
          { t: 'followers', v: -12 },
          { t: 'heroThreat', v: -10 },
          { t: 'notoriety', v: -3 },
        ],
      },
      {
        kind: 'certain',
        label: 'Kill him',
        effects: [
          { t: 'notoriety', v: 6 },
          { t: 'heroThreat', v: 5 },
          { t: 'followers', v: 4 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Let him take the fall entirely',
        odds: 0.6,
        onSuccess: [
          { t: 'heroThreat', v: -16 },
          { t: 'notoriety', v: -8 },
        ],
        onFailure: [
          { t: 'heroThreat', v: 8 },
          { t: 'notoriety', v: -4 },
          { t: 'followers', v: -10 },
        ],
      },
    ],
  },

  {
    id: 'decline_the_last_one',
    title: 'The Last One',
    body: 'The others have gone. The one who stayed brings your meals, keeps your books, and has never once asked what happens to the tower afterward.',
    phase: 'decline',
    requires: [{ c: 'minApprentices', v: 1 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Name them your heir',
        effects: [
          { t: 'loyalty', v: 25 },
          { t: 'followers', v: 10 },
          { t: 'notoriety', v: -2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Tell them nothing',
        effects: [
          { t: 'loyalty', v: -10 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Send them away while there is time',
        effects: [
          { t: 'apprentices', v: -1 },
          { t: 'loyalty', v: 10 },
          { t: 'heroThreat', v: -3 },
          { t: 'notoriety', v: -3 },
        ],
      },
    ],
  },

  {
    id: 'decline_the_petition',
    title: 'The Petition',
    body: 'The village has petitioned for your removal. They have also, in a separate document, asked whether you would consider staying until the mill is fixed.',
    phase: 'decline',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Fix the mill',
        effects: [
          { t: 'notoriety', v: -6 },
          { t: 'followers', v: 20 },
          { t: 'heroThreat', v: -5 },
        ],
      },
      {
        kind: 'certain',
        label: 'Fix the mill badly',
        effects: [
          { t: 'notoriety', v: 4 },
          { t: 'followers', v: 6 },
        ],
      },
      {
        kind: 'certain',
        label: 'Take the mill',
        effects: [
          { t: 'notoriety', v: 8 },
          { t: 'followers', v: 10 },
          { t: 'heroThreat', v: 5 },
        ],
      },
      {
        kind: 'certain',
        label: 'Grant the petition and go',
        effects: [
          { t: 'lairTier', v: -1 },
          { t: 'notoriety', v: -10 },
          { t: 'heroThreat', v: -12 },
          { t: 'followers', v: -10 },
        ],
      },
    ],
  },

  {
    id: 'decline_one_last_working',
    title: 'One Last Working',
    body: 'You have one working left in you of the old size. It will cost most of what you have, and everyone from here to the sea will feel it in their teeth.',
    phase: 'decline',
    requires: [{ c: 'minNotoriety', v: 45 }],
    weight: 2,
    options: [
      {
        kind: 'gamble',
        label: 'Attempt it',
        odds: 0.25,
        onSuccess: [
          { t: 'notoriety', v: 30 },
          { t: 'followers', v: -30 },
          { t: 'heroThreat', v: 10 },
        ],
        onFailure: [
          { t: 'notoriety', v: -12 },
          { t: 'followers', v: -40 },
          { t: 'lairTier', v: -1 },
          { t: 'heroThreat', v: 6 },
        ],
      },
      {
        kind: 'certain',
        label: 'Attempt something smaller',
        effects: [
          { t: 'notoriety', v: 8 },
          { t: 'followers', v: -12 },
          { t: 'heroThreat', v: 3 },
        ],
      },
      {
        kind: 'certain',
        label: 'Keep it in reserve',
        effects: [
          { t: 'heroThreat', v: -5 },
          { t: 'notoriety', v: -2 },
        ],
      },
    ],
  },

  {
    id: 'decline_the_fens',
    title: 'The Fens',
    body: 'An agent has found you a property in the marshes. It is damp, remote, and entirely without prospects, and she lists these as its three best features.',
    phase: 'decline',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Buy it and keep the keys',
        effects: [
          { t: 'followers', v: -10 },
          { t: 'heroThreat', v: -8 },
          { t: 'notoriety', v: -6 },
        ],
      },
      {
        kind: 'certain',
        label: 'Tell her you have no intention of retiring',
        effects: [
          { t: 'notoriety', v: 6 },
          { t: 'heroThreat', v: 3 },
        ],
      },
    ],
  },

  {
    id: 'decline_the_archive',
    title: 'The Archive',
    body: 'Everything you have ever done is written down somewhere in this building. Some of it is evidence. Some of it is the only proof you were ever here.',
    phase: 'decline',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Burn all of it',
        effects: [
          { t: 'heroThreat', v: -10 },
          { t: 'notoriety', v: -12 },
          { t: 'followers', v: -5 },
        ],
      },
      {
        kind: 'certain',
        label: 'Have it copied and distributed',
        effects: [
          { t: 'notoriety', v: 14 },
          { t: 'heroThreat', v: 8 },
          { t: 'followers', v: 8 },
        ],
      },
    ],
  },

  {
    id: 'decline_the_defection',
    title: 'Resignation',
    body: 'Your senior apprentice has handed in written notice. It is properly formatted, gives the customary term, and thanks you for the opportunity.',
    phase: 'decline',
    requires: [{ c: 'minApprentices', v: 1 }],
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Accept the notice',
        effects: [
          { t: 'apprentices', v: -1 },
          { t: 'loyalty', v: 5 },
          { t: 'notoriety', v: -3 },
        ],
      },
      {
        kind: 'certain',
        label: 'Counter-offer',
        effects: [
          { t: 'followers', v: -15 },
          { t: 'loyalty', v: 15 },
          { t: 'notoriety', v: -1 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Refuse to accept it',
        odds: 0.45,
        onSuccess: [
          { t: 'loyalty', v: -10 },
          { t: 'notoriety', v: 6 },
          { t: 'followers', v: 5 },
        ],
        onFailure: [
          { t: 'apprentices', v: -2 },
          { t: 'loyalty', v: -25 },
          { t: 'followers', v: -15 },
        ],
        failureText: 'She leaves anyway, and takes the two who were undecided.',
      },
    ],
  },

  {
    id: 'decline_worm_patience',
    title: 'Patience',
    body: 'The Worm Below has stopped writing. Nothing sings under the floor now, and the well runs clear. It is waiting for you to want something.',
    phase: 'decline',
    factionId: 'worm_below',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Want something',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: 20 },
          { t: 'notoriety', v: 9 },
          { t: 'pactDebt', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Outwait it',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: -10 },
          { t: 'notoriety', v: -3 },
          { t: 'loyalty', v: 6 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Make it want something instead',
        odds: 0.25,
        onSuccess: [
          { t: 'artifactFrom', factionId: 'worm_below', rarity: 'legendary' },
          { t: 'standing', factionId: 'worm_below', v: 20 },
          { t: 'notoriety', v: 15 },
        ],
        onFailure: [
          { t: 'followers', v: -25 },
          { t: 'pactDebt', v: 2 },
          { t: 'notoriety', v: -8 },
        ],
      },
    ],
  },

  {
    id: 'decline_crownlands_treaty_offer',
    title: 'A Quiet Approach',
    body: 'Margrave Delvin Aske writes privately. The Crown does not want a siege in an election decade, and he is authorised to be reasonable about the border.',
    phase: 'decline',
    factionId: 'crownlands',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Take the border deal',
        effects: [
          { t: 'standing', factionId: 'crownlands', v: 25 },
          { t: 'heroThreat', v: -10 },
          { t: 'lairTier', v: -1 },
          { t: 'notoriety', v: -5 },
          { t: 'artifactFrom', factionId: 'crownlands', rarity: 'rare' },
        ],
      },
      {
        kind: 'certain',
        label: 'Take it and keep the border',
        effects: [
          { t: 'standing', factionId: 'crownlands', v: 8 },
          { t: 'heroThreat', v: -4 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Publish his letter',
        odds: 0.5,
        onSuccess: [
          { t: 'notoriety', v: 14 },
          { t: 'standing', factionId: 'crownlands', v: -25 },
          { t: 'heroThreat', v: -6 },
        ],
        onFailure: [
          { t: 'notoriety', v: -5 },
          { t: 'standing', factionId: 'crownlands', v: -30 },
          { t: 'heroThreat', v: 12 },
        ],
        failureText: 'The Crown denies the letter, disowns Aske, and doubles the levy on principle.',
      },
    ],
  },

  {
    id: 'decline_the_biographer',
    title: 'The Biographer',
    body: 'A Pale Academy historian has taken lodgings in the village to write your life. She has already interviewed everyone who hates you, which was efficient of her.',
    phase: 'decline',
    factionId: 'pale_academy',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Grant her access',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: 20 },
          { t: 'notoriety', v: 6 },
          { t: 'heroThreat', v: 4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Have her escorted from the valley',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: -15 },
          { t: 'notoriety', v: -4 },
          { t: 'heroThreat', v: -2 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Dictate it to her yourself',
        odds: 0.7,
        onSuccess: [
          { t: 'notoriety', v: 11 },
          { t: 'standing', factionId: 'pale_academy', v: 10 },
          { t: 'followers', v: 8 },
        ],
        onFailure: [
          { t: 'notoriety', v: -7 },
          { t: 'standing', factionId: 'pale_academy', v: -12 },
        ],
        failureText: 'She publishes your account in full, with footnotes correcting it.',
      },
    ],
  },

  {
    id: 'decline_the_verdant_offer',
    title: 'Root and Branch',
    body: 'The Choir offers to take you in. Not as a member — as a feature. Brambleward Oona is quite clear that the arrangement is permanent and mostly horizontal.',
    phase: 'decline',
    factionId: 'verdant_choir',
    requires: [{ c: 'minStanding', factionId: 'verdant_choir', v: 25 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Decline, warmly',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: 5 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Ask what it would buy you',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: 20 },
          { t: 'heroThreat', v: -12 },
          { t: 'notoriety', v: -8 },
          { t: 'followers', v: -15 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Ask for the deep grove instead',
        odds: 0.35,
        onSuccess: [
          { t: 'artifactFrom', factionId: 'verdant_choir', rarity: 'legendary' },
          { t: 'notoriety', v: 12 },
          { t: 'standing', factionId: 'verdant_choir', v: 10 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'verdant_choir', v: -35 },
          { t: 'heroThreat', v: 8 },
          { t: 'followers', v: -10 },
        ],
      },
    ],
  },

  {
    id: 'decline_ashen_severance',
    title: 'Severance',
    body: 'The Covenant is restructuring. Ceremoniarch Yull explains that your region is being consolidated and that this is not a reflection on your performance.',
    phase: 'decline',
    factionId: 'ashen_covenant',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Accept the settlement',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: -10 },
          { t: 'pactDebt', v: -1 },
          { t: 'followers', v: 15 },
          { t: 'notoriety', v: -5 },
        ],
      },
      {
        kind: 'certain',
        label: 'Refuse to be consolidated',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: 15 },
          { t: 'pactDebt', v: 1 },
          { t: 'notoriety', v: 6 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Consolidate the region yourself',
        odds: 0.3,
        onSuccess: [
          { t: 'standing', factionId: 'ashen_covenant', v: 30 },
          { t: 'notoriety', v: 16 },
          { t: 'followers', v: 25 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'ashen_covenant', v: -30 },
          { t: 'pactDebt', v: 2 },
          { t: 'followers', v: -20 },
        ],
      },
    ],
  },

  {
    id: 'decline_the_boy_at_the_gate',
    title: 'The Boy at the Gate',
    body: 'A child has been left at your gate with a note. The note says he has the gift, that his family cannot keep him, and that they are sorry — to him, not to you.',
    phase: 'decline',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Take him in',
        effects: [
          { t: 'apprentices', v: 1 },
          { t: 'loyalty', v: 20 },
          { t: 'notoriety', v: -2 },
          { t: 'followers', v: 6 },
        ],
      },
      {
        kind: 'certain',
        label: 'Send him to the Academy',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: 15 },
          { t: 'notoriety', v: -4 },
          { t: 'heroThreat', v: 3 },
        ],
      },
      {
        kind: 'certain',
        label: 'Send him back',
        effects: [
          { t: 'notoriety', v: 3 },
          { t: 'loyalty', v: -8 },
        ],
      },
    ],
  },

  {
    id: 'decline_the_long_winter',
    title: 'The Long Winter',
    body: 'The stores will not last until spring. They will last until spring for about half of the household, which your steward presents as an option rather than a problem.',
    phase: 'decline',
    requires: [{ c: 'minFollowers', v: 25 }],
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Halve the household',
        effects: [
          { t: 'followers', v: -25 },
          { t: 'loyalty', v: -15 },
          { t: 'notoriety', v: 5 },
        ],
      },
      {
        kind: 'certain',
        label: 'Buy grain at winter prices',
        effects: [
          { t: 'followers', v: -8 },
          { t: 'standing', factionId: 'gilded_hand', v: 10 },
          { t: 'loyalty', v: 10 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Take the neighbouring barony',
        odds: 0.5,
        onSuccess: [
          { t: 'followers', v: 25 },
          { t: 'notoriety', v: 10 },
          { t: 'standing', factionId: 'crownlands', v: -20 },
        ],
        onFailure: [
          { t: 'followers', v: -30 },
          { t: 'heroThreat', v: 10 },
          { t: 'standing', factionId: 'crownlands', v: -25 },
        ],
      },
    ],
  },
];
