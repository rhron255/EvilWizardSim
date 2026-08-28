import type { Offer } from '../../types';

/**
 * ASCENT-PHASE OFFERS.
 *
 * Acquisition energy: lairs, pacts, apprentices, relics, alliances, reputation.
 * The player is building. Costs are real but recoverable.
 *
 * House style: the body is comedic, the effects are straight-faced. The
 * recurring cast — Vorlag the Unremarkable, Hesper Quill, Provost Rook,
 * Ceremoniarch Yull, Brambleward Oona — appears across phases on purpose.
 */
export const ascentOffers: Offer[] = [
  {
    id: 'ascent_estate_sale',
    title: 'Estate Sale',
    body: 'A hilltop tower is going cheap. The previous owner is still on the premises, in the sense that he is now part of the load-bearing masonry.',
    phase: 'ascent',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Buy it as-is',
        effects: [
          { t: 'lairTier', v: 1 },
          { t: 'followers', v: -6 },
          { t: 'notoriety', v: 3 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Have it surveyed first',
        odds: 0.55,
        onSuccess: [
          { t: 'lairTier', v: 1 },
          { t: 'notoriety', v: 6 },
        ],
        onFailure: [
          { t: 'followers', v: -10 },
          { t: 'notoriety', v: -2 },
        ],
        failureText: "The surveyor's report runs to forty pages. Page one is the word 'no'.",
        successText: 'The survey passes. Nobody mentions the wall.',
      },
      {
        kind: 'certain',
        label: 'Let it go',
        effects: [{ t: 'notoriety', v: -2 }],
        resultText: 'Vorlag the Unremarkable buys it and immediately puts up a sign.',
      },
    ],
  },

  {
    id: 'ascent_open_position',
    title: 'Open Position',
    body: 'You advertised for an apprentice. Three candidates responded: a prodigy with poor references, an enthusiast with no aptitude, and a man who appears to be four goblins in a coat.',
    phase: 'ascent',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Hire the prodigy',
        effects: [
          { t: 'apprentices', v: 1 },
          { t: 'loyalty', v: -8 },
          { t: 'notoriety', v: 3 },
        ],
      },
      {
        kind: 'certain',
        label: 'Hire the enthusiast',
        effects: [
          { t: 'apprentices', v: 1 },
          { t: 'loyalty', v: 12 },
          { t: 'notoriety', v: -1 },
        ],
      },
      {
        kind: 'certain',
        label: 'Hire the coat',
        effects: [
          { t: 'apprentices', v: 1 },
          { t: 'followers', v: 12 },
          { t: 'loyalty', v: 2 },
        ],
        resultText: 'The coat is an excellent worker and an appalling conversationalist.',
      },
      {
        kind: 'certain',
        label: 'Re-advertise',
        effects: [
          { t: 'notoriety', v: -2 },
          { t: 'followers', v: -3 },
        ],
        resultText: 'The same three apply. The coat has updated its references.',
      },
    ],
  },

  {
    id: 'ascent_covenant_intake',
    title: 'Intake Ceremony',
    body: 'The Ashen Covenant will induct you at the next dark of the moon. The paperwork is on flayed vellum and the arbitration clause is in a language with no word for "refund".',
    phase: 'ascent',
    factionId: 'ashen_covenant',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Sign in full',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: 25 },
          { t: 'pactDebt', v: 2 },
          { t: 'notoriety', v: 8 },
        ],
      },
      {
        kind: 'certain',
        label: 'Sign, minus the arbitration clause',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: 8 },
          { t: 'notoriety', v: 3 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Negotiate the whole document',
        odds: 0.35,
        onSuccess: [
          { t: 'standing', factionId: 'ashen_covenant', v: 30 },
          { t: 'notoriety', v: 10 },
          { t: 'artifactFrom', factionId: 'ashen_covenant', rarity: 'common' },
        ],
        onFailure: [
          { t: 'standing', factionId: 'ashen_covenant', v: -15 },
          { t: 'pactDebt', v: 1 },
        ],
        successText: 'Nine clauses struck. The vellum objects.',
        failureText: 'You are talked through the arbitration clause. It gains a word for "refund".',
      },
    ],
  },

  {
    id: 'ascent_gilded_catalogue',
    title: 'The Catalogue',
    body: 'A Gilded Hand factor named Hesper Quill leaves a catalogue on your desk without entering the building. Every price is listed in followers.',
    phase: 'ascent',
    factionId: 'gilded_hand',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Buy something modest',
        effects: [
          { t: 'followers', v: -15 },
          { t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'common' },
          { t: 'standing', factionId: 'gilded_hand', v: 10 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Buy the item on the last page',
        odds: 0.3,
        onSuccess: [
          { t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'rare' },
          { t: 'standing', factionId: 'gilded_hand', v: 15 },
          { t: 'notoriety', v: 8 },
        ],
        onFailure: [
          { t: 'followers', v: -35 },
          { t: 'standing', factionId: 'gilded_hand', v: 5 },
        ],
        failureText: 'It arrives. It is a very fine box. The box is the item.',
        successText: 'The last page was not a misprint. It arrives.',
      },
      {
        kind: 'certain',
        label: 'Return the catalogue',
        effects: [{ t: 'standing', factionId: 'gilded_hand', v: -5 }],
      },
    ],
  },

  {
    id: 'ascent_academy_alumni',
    title: 'Alumni Relations',
    body: 'The Pale Academy would like you to know that giving season has begun, and that your expulsion does not preclude generosity.',
    phase: 'ascent',
    factionId: 'pale_academy',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Donate generously',
        effects: [
          { t: 'artifactFrom', factionId: 'pale_academy' },
          { t: 'followers', v: -12 },
          { t: 'standing', factionId: 'pale_academy', v: 20 },
          { t: 'notoriety', v: -2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Reply with a curse',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: -18 },
          { t: 'notoriety', v: 6 },
        ],
      },
    ],
  },

  {
    id: 'ascent_choir_boundary',
    title: 'Boundary Dispute',
    body: 'The Verdant Choir has determined that your east wall stands on a root system of regional significance. They have brought a map, a surveyor, and eleven hundred badgers.',
    phase: 'ascent',
    factionId: 'verdant_choir',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Move the wall',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: 18 },
          { t: 'followers', v: -8 },
          { t: 'notoriety', v: -3 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Hold the line',
        odds: 0.45,
        onSuccess: [
          { t: 'standing', factionId: 'verdant_choir', v: -12 },
          { t: 'notoriety', v: 9 },
          { t: 'followers', v: 5 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'verdant_choir', v: -20 },
          { t: 'followers', v: -18 },
          { t: 'notoriety', v: 2 },
        ],
        successText: 'The wall stands. The badgers are rehoused.',
        failureText: 'The surveyor was right, the map was right, and there are now more badgers.',
      },
      {
        kind: 'certain',
        label: 'Offer them the west wall instead',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: 6 },
          { t: 'notoriety', v: -1 },
        ],
      },
    ],
  },

  {
    id: 'ascent_worm_letters',
    title: 'Correspondence',
    body: 'Letters have begun arriving from beneath the floor. They are addressed correctly, dated in a calendar you do not recognise, and increasingly familiar in tone.',
    phase: 'ascent',
    factionId: 'worm_below',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Write back',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: 15 },
          { t: 'notoriety', v: 2 },
          { t: 'loyalty', v: -4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Burn them unopened',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: -10 },
          { t: 'followers', v: 3 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Follow them down',
        odds: 0.45,
        onSuccess: [
          { t: 'standing', factionId: 'worm_below', v: 25 },
          { t: 'artifactFrom', factionId: 'worm_below', rarity: 'common' },
          { t: 'notoriety', v: 6 },
        ],
        onFailure: [
          { t: 'followers', v: -12 },
          { t: 'notoriety', v: -3 },
        ],
        successText: 'Further down than advertised, and furnished.',
        failureText: 'You get four floors down and lose your nerve. The next letter mentions it.',
      },
    ],
  },

  {
    id: 'ascent_first_tithe',
    title: 'The First Tithe',
    body: 'The village at the foot of the hill has voted to pay you protection money rather than find out what you are. The vote was not close.',
    phase: 'ascent',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Accept the tithe',
        effects: [
          { t: 'followers', v: 18 },
          { t: 'notoriety', v: 4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Double it',
        effects: [
          { t: 'followers', v: 30 },
          { t: 'notoriety', v: 8 },
          { t: 'heroThreat', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Refuse, ominously',
        effects: [
          { t: 'notoriety', v: 6 },
          { t: 'followers', v: 4 },
        ],
        resultText: 'Refusing frightens them considerably more than accepting would have.',
      },
    ],
  },

  {
    id: 'ascent_rival_vorlag',
    title: 'Vorlag the Unremarkable',
    body: 'A rival wizard has challenged you to a duel at dawn. He chose the epithet himself, which tells you most of what you need to know.',
    phase: 'ascent',
    weight: 3,
    options: [
      {
        kind: 'gamble',
        label: 'Accept the duel',
        odds: 0.75,
        onSuccess: [
          { t: 'notoriety', v: 10 },
          { t: 'followers', v: 8 },
        ],
        onFailure: [
          { t: 'notoriety', v: -6 },
          { t: 'followers', v: -10 },
        ],
        failureText: 'He wins. He is insufferable about it for the next thirty years.',
        successText: 'Vorlag attends at dawn. Not at breakfast.',
      },
      {
        kind: 'certain',
        label: 'Ignore the challenge',
        effects: [{ t: 'notoriety', v: -3 }],
      },
      {
        kind: 'certain',
        label: 'Hire him instead',
        effects: [
          { t: 'apprentices', v: 1 },
          { t: 'loyalty', v: -10 },
          { t: 'followers', v: 6 },
          { t: 'notoriety', v: 2 },
        ],
      },
    ],
  },

  {
    id: 'ascent_crownlands_census',
    title: 'The Census',
    body: 'A Crownlands clerk is at the gate with a clipboard. She needs to know how many souls reside here, in what capacity, and whether any of them are technically deceased.',
    phase: 'ascent',
    factionId: 'crownlands',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Answer honestly',
        effects: [
          { t: 'artifactFrom', factionId: 'crownlands', rarity: 'common' },
          { t: 'standing', factionId: 'crownlands', v: 12 },
          { t: 'notoriety', v: 4 },
          { t: 'heroThreat', v: 3 },
        ],
      },
      {
        kind: 'certain',
        label: 'Undercount dramatically',
        effects: [
          { t: 'standing', factionId: 'crownlands', v: 2 },
          { t: 'notoriety', v: -2 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Add her to the count',
        odds: 0.6,
        onSuccess: [
          { t: 'notoriety', v: 9 },
          { t: 'followers', v: 4 },
          { t: 'standing', factionId: 'crownlands', v: -20 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'crownlands', v: -25 },
          { t: 'heroThreat', v: 6 },
        ],
        failureText: 'She had a second clipboard, and a colleague waiting at the bottom of the hill.',
        successText: 'The census records one further resident: her.',
      },
    ],
  },

  {
    id: 'ascent_ashen_small_ceremony',
    title: 'A Small Ceremony',
    body: 'The Covenant\'s rite requires one apprentice, briefly. Ceremoniarch Yull is at pains to stress the word "briefly" without ever defining it.',
    phase: 'ascent',
    factionId: 'ashen_covenant',
    requires: [{ c: 'minApprentices', v: 1 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Send your least promising',
        effects: [
          { t: 'apprentices', v: -1 },
          { t: 'loyalty', v: -10 },
          { t: 'standing', factionId: 'ashen_covenant', v: 20 },
          { t: 'notoriety', v: 9 },
        ],
      },
      {
        kind: 'certain',
        label: 'Attend it yourself',
        effects: [
          { t: 'notoriety', v: 4 },
          { t: 'pactDebt', v: 1 },
          { t: 'standing', factionId: 'ashen_covenant', v: 8 },
        ],
      },
      {
        kind: 'certain',
        label: 'Decline the rite',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: -15 },
          { t: 'loyalty', v: 8 },
        ],
      },
    ],
  },

  {
    id: 'ascent_gilded_auction',
    title: 'Lot Forty-One',
    body: 'The Gilded Hand is auctioning the estate of a wizard who died owing them money. Lot forty-one is described only as "contents of the study, sold unexamined".',
    phase: 'ascent',
    factionId: 'gilded_hand',
    weight: 2,
    options: [
      {
        kind: 'gamble',
        label: 'Bid on lot forty-one',
        odds: 0.4,
        onSuccess: [
          { t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'rare' },
          { t: 'notoriety', v: 7 },
          { t: 'followers', v: -10 },
        ],
        onFailure: [
          { t: 'followers', v: -20 },
          { t: 'notoriety', v: -2 },
        ],
        failureText: "Contents of the study: one study's worth of damp.",
        successText: 'Contents of the study: rather more than damp.',
      },
      {
        kind: 'certain',
        label: 'Bid on the furniture',
        effects: [
          { t: 'followers', v: -6 },
          { t: 'notoriety', v: 2 },
          { t: 'standing', factionId: 'gilded_hand', v: 8 },
        ],
      },
      {
        kind: 'certain',
        label: 'Attend and bid on nothing',
        effects: [
          { t: 'standing', factionId: 'gilded_hand', v: 3 },
          { t: 'notoriety', v: 1 },
        ],
      },
    ],
  },

  {
    id: 'ascent_academy_lecture',
    title: 'Guest Lecture',
    body: "The Pale Academy invites you to address the third-years on practical thaumaturgy. Provost Rook's letter uses the phrase 'cautionary example' twice.",
    phase: 'ascent',
    factionId: 'pale_academy',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Lecture as invited',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: 15 },
          { t: 'notoriety', v: -3 },
          { t: 'followers', v: 5 },
        ],
      },
      {
        kind: 'certain',
        label: 'Lecture on something else',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: -8 },
          { t: 'notoriety', v: 7 },
          { t: 'apprentices', v: 1 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Recruit from the audience after',
        odds: 0.65,
        onSuccess: [
          { t: 'apprentices', v: 2 },
          { t: 'loyalty', v: 5 },
          { t: 'standing', factionId: 'pale_academy', v: -12 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'pale_academy', v: -20 },
          { t: 'notoriety', v: -4 },
        ],
        successText: 'Two third-years do not return to the Academy.',
        failureText: 'Nobody follows you out. Rook adds a third use of the phrase to the file.',
      },
    ],
  },

  {
    id: 'ascent_choir_sapling',
    title: 'The Sapling',
    body: 'The Verdant Choir has planted a sapling in your courtyard as a gesture of goodwill. It is already eight feet tall and it has opinions about the flagstones.',
    phase: 'ascent',
    factionId: 'verdant_choir',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Let it grow',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: 20 },
          { t: 'followers', v: -4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Cut it down',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: -22 },
          { t: 'notoriety', v: 5 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Graft something of your own onto it',
        odds: 0.45,
        onSuccess: [
          { t: 'standing', factionId: 'verdant_choir', v: 10 },
          { t: 'notoriety', v: 8 },
          { t: 'artifactFrom', factionId: 'verdant_choir', rarity: 'common' },
        ],
        onFailure: [
          { t: 'standing', factionId: 'verdant_choir', v: -25 },
          { t: 'followers', v: -8 },
        ],
        successText: 'The graft takes. The tree keeps its opinions and acquires several of yours.',
        failureText: 'The graft is rejected overnight, and the courtyard flagstones with it.',
      },
    ],
  },

  {
    id: 'ascent_worm_groundwater',
    title: 'Groundwater',
    body: 'Your well has begun producing something that is not water and does not behave like a liquid at rest. The Worm Below sends congratulations.',
    phase: 'ascent',
    factionId: 'worm_below',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Seal the well',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: -12 },
          { t: 'followers', v: 4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Bottle it and sell it',
        effects: [
          { t: 'followers', v: 20 },
          { t: 'notoriety', v: 6 },
          { t: 'standing', factionId: 'worm_below', v: 5 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Drink it',
        odds: 0.55,
        onSuccess: [
          { t: 'notoriety', v: 14 },
          { t: 'standing', factionId: 'worm_below', v: 20 },
        ],
        onFailure: [
          { t: 'notoriety', v: -5 },
          { t: 'followers', v: -10 },
          { t: 'pactDebt', v: 1 },
        ],
        successText: 'It does not behave like a liquid on the way down either. You keep it down.',
        failureText: 'You are ill for a season, and something downstairs starts an account for you.',
      },
    ],
  },

  {
    id: 'ascent_drainage',
    title: 'Drainage',
    body: 'The moat is stagnant and the smell has reached the village. A contractor proposes either a proper sluice system or, for the same money, something that lives in the water and eats trespassers.',
    phase: 'ascent',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Install the sluice',
        effects: [
          { t: 'lairTier', v: 1 },
          { t: 'followers', v: -12 },
          { t: 'notoriety', v: -1 },
        ],
      },
      {
        kind: 'certain',
        label: 'Install the thing',
        effects: [
          { t: 'notoriety', v: 9 },
          { t: 'followers', v: -8 },
          { t: 'heroThreat', v: 2 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Both',
        odds: 0.7,
        onSuccess: [
          { t: 'lairTier', v: 1 },
          { t: 'notoriety', v: 7 },
          { t: 'followers', v: -20 },
        ],
        onFailure: [
          { t: 'followers', v: -25 },
          { t: 'notoriety', v: 2 },
        ],
        successText: 'The moat drains, refills, and eats a trespasser in the same week.',
        failureText: 'The thing eats the sluice.',
      },
    ],
  },

  {
    id: 'ascent_second_cohort',
    title: 'Second Cohort',
    body: 'Word has spread that you take students. Nine applicants are waiting in the hall and two of them are clearly the same person.',
    phase: 'ascent',
    requires: [{ c: 'minApprentices', v: 1 }],
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Take all nine',
        effects: [
          { t: 'apprentices', v: 3 },
          { t: 'loyalty', v: -12 },
          { t: 'followers', v: 10 },
          { t: 'notoriety', v: 3 },
        ],
      },
      {
        kind: 'certain',
        label: 'Take three',
        effects: [
          { t: 'apprentices', v: 1 },
          { t: 'loyalty', v: 6 },
          { t: 'notoriety', v: 1 },
        ],
      },
      {
        kind: 'certain',
        label: 'Take none; charge admission anyway',
        effects: [
          { t: 'followers', v: 14 },
          { t: 'notoriety', v: 4 },
          { t: 'loyalty', v: -5 },
        ],
      },
    ],
  },

  {
    id: 'ascent_unsolicited_application',
    title: 'Unsolicited Application',
    body: 'A bandit company has camped at your gate and would like to be evil for you instead of for themselves. Their captain has prepared a document she keeps calling a proposal.',
    phase: 'ascent',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Hire them',
        effects: [
          { t: 'followers', v: 25 },
          { t: 'notoriety', v: 5 },
          { t: 'heroThreat', v: 3 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Hire them at half the rate',
        odds: 0.7,
        onSuccess: [
          { t: 'followers', v: 25 },
          { t: 'notoriety', v: 5 },
        ],
        onFailure: [
          { t: 'followers', v: -6 },
          { t: 'notoriety', v: -3 },
          { t: 'heroThreat', v: 2 },
        ],
        failureText: 'They take the insult to a competitor.',
        successText: 'Half the rate. The captain calls it a pilot.',
      },
      {
        kind: 'certain',
        label: 'Transmute them instead',
        effects: [
          { t: 'followers', v: 8 },
          { t: 'notoriety', v: 10 },
          { t: 'standing', factionId: 'crownlands', v: -8 },
        ],
      },
    ],
  },

  {
    id: 'ascent_ashen_advance',
    title: 'An Advance',
    body: 'The Covenant offers power now against a debt later. Ceremoniarch Yull describes the interest structure as traditional and then changes the subject.',
    phase: 'ascent',
    factionId: 'ashen_covenant',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Take the advance',
        effects: [
          { t: 'notoriety', v: 12 },
          { t: 'pactDebt', v: 2 },
          { t: 'standing', factionId: 'ashen_covenant', v: 12 },
        ],
      },
      {
        kind: 'certain',
        label: 'Decline',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: -8 },
          { t: 'loyalty', v: 4 },
        ],
      },
    ],
  },

  {
    id: 'ascent_gilded_indemnity',
    title: 'Indemnity',
    body: 'The Gilded Hand now writes coverage against heroic incursion. The policy excludes acts of prophecy, which they assure you is standard.',
    phase: 'ascent',
    factionId: 'gilded_hand',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Take the full policy',
        effects: [
          { t: 'followers', v: -14 },
          { t: 'heroThreat', v: -6 },
          { t: 'standing', factionId: 'gilded_hand', v: 12 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Read the exclusions aloud until the terms improve',
        odds: 0.45,
        onSuccess: [
          { t: 'heroThreat', v: -10 },
          { t: 'standing', factionId: 'gilded_hand', v: 8 },
          { t: 'followers', v: -6 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'gilded_hand', v: -18 },
          { t: 'followers', v: -10 },
        ],
        successText: 'Clause eleven goes at the fourth reading.',
        failureText: 'You reach the eleventh exclusion. The underwriter reaches for a longer policy.',
      },
    ],
  },

  {
    id: 'ascent_academy_peer_review',
    title: 'Peer Review',
    body: "You have submitted a paper on soul-binding to the Academy's quarterly. Reviewer Two objects to your methodology, your citations, and your continued existence.",
    phase: 'ascent',
    factionId: 'pale_academy',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Revise and resubmit',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: 14 },
          { t: 'notoriety', v: 2 },
          { t: 'followers', v: -3 },
        ],
      },
      {
        kind: 'certain',
        label: 'Publish it independently',
        effects: [
          { t: 'notoriety', v: 8 },
          { t: 'standing', factionId: 'pale_academy', v: -12 },
          { t: 'followers', v: 6 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Find Reviewer Two',
        odds: 0.45,
        onSuccess: [
          { t: 'artifactFrom', factionId: 'pale_academy', rarity: 'common' },
          { t: 'notoriety', v: 12 },
          { t: 'standing', factionId: 'pale_academy', v: -10 },
          { t: 'followers', v: 4 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'pale_academy', v: -25 },
          { t: 'notoriety', v: -4 },
        ],
        failureText: 'Reviewer Two is the Provost. He was not hard to find, and he was expecting you.',
        successText: 'Reviewer Two withdraws all three objections.',
      },
    ],
  },

  {
    id: 'ascent_choir_treaty',
    title: 'Terms of the Grove',
    body: 'Brambleward Oona proposes a treaty: you keep the hill, the Choir keeps everything that grows on it, and neither party mentions the badgers again.',
    phase: 'ascent',
    factionId: 'verdant_choir',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Sign it',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: 25 },
          { t: 'notoriety', v: -2 },
          { t: 'followers', v: -5 },
        ],
      },
      {
        kind: 'certain',
        label: 'Sign with amendments',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: 8 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Refuse and fortify',
        odds: 0.55,
        onSuccess: [
          { t: 'notoriety', v: 10 },
          { t: 'standing', factionId: 'verdant_choir', v: -20 },
          { t: 'lairTier', v: 1 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'verdant_choir', v: -25 },
          { t: 'followers', v: -15 },
          { t: 'notoriety', v: -2 },
        ],
        successText: 'The hill is yours, the grove is yours, and the badgers are mentioned daily.',
        failureText: 'The fortifications hold. Everything growing on them belongs to the Choir.',
      },
    ],
  },

  {
    id: 'ascent_worm_hymn',
    title: 'The Hymn',
    body: 'Something under the foundations is singing. Your servants have begun humming along at work, tunelessly, and none of them can say when they started.',
    phase: 'ascent',
    factionId: 'worm_below',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Let them hum',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: 18 },
          { t: 'followers', v: 10 },
          { t: 'loyalty', v: -8 },
        ],
      },
      {
        kind: 'certain',
        label: 'Forbid it',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: -10 },
          { t: 'loyalty', v: 10 },
          { t: 'notoriety', v: -1 },
        ],
      },
      {
        kind: 'certain',
        label: 'Learn the words',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: 25 },
          { t: 'notoriety', v: 7 },
          { t: 'pactDebt', v: 1 },
        ],
      },
    ],
  },

  {
    id: 'ascent_dragon_lease',
    title: 'Short-Term Lease',
    body: 'A dragon requires somewhere to sleep for a century and has heard you have space. She is willing to discuss rent and unwilling to discuss what happens if you are late with it.',
    phase: 'ascent',
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Sign the lease',
        effects: [
          { t: 'notoriety', v: 14 },
          { t: 'followers', v: -10 },
          { t: 'heroThreat', v: 5 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Ask for a share of the hoard',
        odds: 0.2,
        onSuccess: [
          { t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'rare' },
          { t: 'notoriety', v: 10 },
        ],
        onFailure: [
          { t: 'followers', v: -20 },
          { t: 'notoriety', v: -4 },
          { t: 'lairTier', v: -1 },
        ],
        successText: 'She agrees to a share, in the tone of someone who has a great deal of it.',
        failureText: 'She declines to discuss the hoard, at length, and takes the east range with her.',
      },
    ],
  },

  {
    id: 'ascent_blight_season',
    title: 'Blight Season',
    body: 'You could curse the harvest. It would take an afternoon, it would work, and three hamlets would spend the winter learning your name.',
    phase: 'ascent',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Curse the harvest',
        effects: [
          { t: 'notoriety', v: 11 },
          { t: 'followers', v: -6 },
          { t: 'heroThreat', v: 4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Curse only the barley',
        effects: [
          { t: 'notoriety', v: 5 },
          { t: 'heroThreat', v: 1 },
        ],
      },
      {
        kind: 'certain',
        label: 'Bless it instead',
        effects: [
          { t: 'notoriety', v: 3 },
          { t: 'followers', v: 16 },
        ],
        resultText: 'Nobody can work out what you want. They find this considerably worse.',
      },
    ],
  },

  {
    id: 'ascent_ashen_mark',
    title: 'The Mark',
    body: 'Covenant members wear the mark on the throat, where it cannot be hidden by a collar or explained away at a border crossing.',
    phase: 'ascent',
    factionId: 'ashen_covenant',
    requires: [{ c: 'minStanding', factionId: 'ashen_covenant', v: 20 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Take the mark',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: 30 },
          { t: 'standing', factionId: 'pale_academy', v: -12 },
          { t: 'notoriety', v: 10 },
          { t: 'heroThreat', v: 4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Refuse the mark',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: -20 },
          { t: 'notoriety', v: -2 },
        ],
      },
    ],
  },

  {
    id: 'ascent_gilded_licensing',
    title: 'Licensing',
    body: 'The Gilded Hand wants to license your likeness for a line of protective charms. They are protective charms against you, which they describe as the strongest possible endorsement.',
    phase: 'ascent',
    factionId: 'gilded_hand',
    requires: [{ c: 'minNotoriety', v: 45 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Sign the deal',
        effects: [
          { t: 'followers', v: 30 },
          { t: 'notoriety', v: 6 },
          { t: 'standing', factionId: 'gilded_hand', v: 18 },
        ],
      },
      {
        kind: 'certain',
        label: 'Sign, but demand artwork approval',
        effects: [
          { t: 'followers', v: 12 },
          { t: 'notoriety', v: 9 },
          { t: 'standing', factionId: 'gilded_hand', v: 6 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Demand a share of every charm sold',
        odds: 0.6,
        onSuccess: [
          { t: 'followers', v: 45 },
          { t: 'notoriety', v: 8 },
          { t: 'standing', factionId: 'gilded_hand', v: 10 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'gilded_hand', v: -22 },
          { t: 'notoriety', v: -3 },
          { t: 'followers', v: -8 },
        ],
        successText: 'A point per charm. You are now paid whenever somebody is afraid of you.',
        failureText: 'The Hand withdraws the line and licenses a competitor’s likeness instead.',
      },
    ],
  },

  {
    id: 'ascent_academy_chair',
    title: 'A Position',
    body: 'The Pale Academy offers you a chair. It comes with shelter, legitimacy, a stipend, and a committee that meets every fortnight for the rest of your life.',
    phase: 'ascent',
    factionId: 'pale_academy',
    requires: [{ c: 'minStanding', factionId: 'pale_academy', v: 25 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Accept the chair',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: 30 },
          { t: 'heroThreat', v: -8 },
          { t: 'notoriety', v: -10 },
          { t: 'followers', v: 10 },
        ],
      },
      {
        kind: 'certain',
        label: 'Accept, then never attend',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: 10 },
          { t: 'heroThreat', v: -3 },
          { t: 'notoriety', v: -2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Decline, at length, in writing',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: -25 },
          { t: 'notoriety', v: 8 },
        ],
      },
    ],
  },

  {
    id: 'ascent_choir_ivy',
    title: 'Something in the Roots',
    body: 'The Choir has stopped sending letters. Instead the ivy on your south face has grown eleven feet this month, and it is growing inward.',
    phase: 'ascent',
    factionId: 'verdant_choir',
    requires: [{ c: 'maxStanding', factionId: 'verdant_choir', v: -10 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Cut it back weekly',
        effects: [
          { t: 'followers', v: -8 },
          { t: 'standing', factionId: 'verdant_choir', v: -5 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Poison the root system',
        odds: 0.6,
        onSuccess: [
          { t: 'standing', factionId: 'verdant_choir', v: -15 },
          { t: 'notoriety', v: 8 },
          { t: 'followers', v: 4 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'verdant_choir', v: -25 },
          { t: 'followers', v: -14 },
          { t: 'lairTier', v: -1 },
        ],
        successText: 'The ivy dies back to the wall and stops. The Choir resumes writing letters.',
        failureText: 'The ivy was the outer part. The rest of it is already inside the south face.',
      },
      {
        kind: 'certain',
        label: 'Sue for peace',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: 20 },
          { t: 'notoriety', v: -5 },
          { t: 'followers', v: -10 },
        ],
      },
    ],
  },

  {
    id: 'ascent_worm_structural_report',
    title: 'Structural Report',
    body: 'A surveyor reports that the hill beneath your lair is now more tunnel than hill. He resigned in the same sentence.',
    phase: 'ascent',
    factionId: 'worm_below',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Reinforce the foundations',
        effects: [
          { t: 'followers', v: -14 },
          { t: 'standing', factionId: 'worm_below', v: -8 },
          { t: 'notoriety', v: 1 },
        ],
      },
      {
        kind: 'certain',
        label: 'Open the tunnels and see who is home',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: 22 },
          { t: 'notoriety', v: 6 },
          { t: 'followers', v: -6 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Build downward',
        odds: 0.4,
        onSuccess: [
          { t: 'lairTier', v: 1 },
          { t: 'standing', factionId: 'worm_below', v: 15 },
          { t: 'notoriety', v: 9 },
        ],
        onFailure: [
          { t: 'lairTier', v: -1 },
          { t: 'followers', v: -18 },
          { t: 'standing', factionId: 'worm_below', v: 5 },
        ],
        successText: 'More tunnel than hill, and now the tunnels are on the plans as yours.',
        failureText: 'You build downward into something already built. It does not mind. The hill does.',
      },
    ],
  },

  {
    id: 'ascent_labour_shortage',
    title: 'Labour Shortage',
    body: 'The graveyard at Millward holds four hundred people who are no longer using themselves. Your steward observes, delicately, that they also do not require wages.',
    phase: 'ascent',
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Raise all of them',
        effects: [
          { t: 'followers', v: 40 },
          { t: 'notoriety', v: 10 },
          { t: 'heroThreat', v: 5 },
          { t: 'standing', factionId: 'crownlands', v: -15 },
        ],
      },
      {
        kind: 'certain',
        label: 'Raise the ones with useful trades',
        effects: [
          { t: 'followers', v: 18 },
          { t: 'notoriety', v: 5 },
          { t: 'heroThreat', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Leave the dead alone',
        effects: [
          { t: 'notoriety', v: -3 },
          { t: 'loyalty', v: 8 },
        ],
      },
    ],
  },

  {
    id: 'ascent_guest',
    title: 'Guest',
    body: "You have a baron's daughter in the west tower. She has reorganised your library, befriended the gargoyles, and asked when the ransom is expected to clear.",
    phase: 'ascent',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Collect the ransom',
        effects: [
          { t: 'followers', v: 22 },
          { t: 'notoriety', v: 7 },
          { t: 'standing', factionId: 'crownlands', v: -12 },
        ],
      },
      {
        kind: 'certain',
        label: 'Release her, dramatically',
        effects: [
          { t: 'notoriety', v: 4 },
          { t: 'standing', factionId: 'crownlands', v: 12 },
          { t: 'followers', v: -4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Offer her an apprenticeship',
        effects: [
          { t: 'apprentices', v: 1 },
          { t: 'loyalty', v: 14 },
          { t: 'notoriety', v: 5 },
          { t: 'standing', factionId: 'crownlands', v: -18 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Ransom her twice',
        odds: 0.55,
        onSuccess: [
          { t: 'followers', v: 40 },
          { t: 'notoriety', v: 12 },
          { t: 'standing', factionId: 'crownlands', v: -20 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'crownlands', v: -30 },
          { t: 'heroThreat', v: 7 },
          { t: 'followers', v: -10 },
        ],
        successText: 'She helps draft the second demand herself.',
        failureText: 'The second demand arrives while the first is still being counted out.',
      },
    ],
  },

  {
    id: 'ascent_ashen_annual_return',
    title: 'Annual Return',
    body: 'The Covenant requires a headcount of your apprentices and a note of which of them you would miss. The second column is not optional.',
    phase: 'ascent',
    factionId: 'ashen_covenant',
    requires: [{ c: 'minApprentices', v: 2 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'File it honestly',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: 22 },
          { t: 'loyalty', v: -15 },
          { t: 'notoriety', v: 5 },
        ],
      },
      {
        kind: 'certain',
        label: 'File it with one name',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: 10 },
          { t: 'loyalty', v: -6 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Leave the second column blank',
        odds: 0.55,
        onSuccess: [
          { t: 'standing', factionId: 'ashen_covenant', v: 12 },
          { t: 'loyalty', v: 10 },
          { t: 'notoriety', v: 3 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'ashen_covenant', v: -18 },
          { t: 'apprentices', v: -1 },
          { t: 'loyalty', v: -10 },
        ],
        successText: 'The return is accepted blank. Your household never learns it was filed.',
        failureText: 'The Covenant fills it in for you. Their handwriting is very neat.',
      },
    ],
  },

  {
    id: 'ascent_gilded_valuation',
    title: 'Valuation',
    body: 'Hesper Quill would like to appraise your collection. She does this for free, for reasons the Gilded Hand has never adequately explained.',
    phase: 'ascent',
    factionId: 'gilded_hand',
    requires: [{ c: 'holdsAnyArtifact' }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Let her see everything',
        effects: [
          { t: 'standing', factionId: 'gilded_hand', v: 18 },
          { t: 'notoriety', v: 3 },
          { t: 'heroThreat', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Show her one piece',
        effects: [{ t: 'standing', factionId: 'gilded_hand', v: 6 }],
      },
      {
        kind: 'gamble',
        label: 'Trade the appraised piece up',
        odds: 0.35,
        onSuccess: [
          { t: 'loseArtifact' },
          { t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'rare' },
          { t: 'notoriety', v: 6 },
        ],
        onFailure: [
          { t: 'loseArtifact' },
          { t: 'followers', v: -8 },
          { t: 'standing', factionId: 'gilded_hand', v: 5 },
        ],
        successText: 'You trade up. This is the reason the appraisals are free.',
        failureText: 'You trade down, and pay the difference. This is also the reason they are free.',
      },
    ],
  },

  {
    id: 'ascent_choir_defector',
    title: 'Defection',
    body: 'A junior druid has arrived at your gate with a bag, a grievance, and a working knowledge of every ward the Choir has laid in this valley.',
    phase: 'ascent',
    factionId: 'verdant_choir',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Take him in',
        effects: [
          { t: 'apprentices', v: 1 },
          { t: 'loyalty', v: 5 },
          { t: 'standing', factionId: 'verdant_choir', v: -18 },
          { t: 'notoriety', v: 6 },
        ],
      },
      {
        kind: 'certain',
        label: 'Send him back with a note',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: 20 },
          { t: 'notoriety', v: -2 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Debrief him, then send him back',
        odds: 0.6,
        onSuccess: [
          { t: 'standing', factionId: 'verdant_choir', v: 12 },
          { t: 'notoriety', v: 7 },
          { t: 'followers', v: 8 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'verdant_choir', v: -28 },
          { t: 'heroThreat', v: 3 },
        ],
        successText: 'You keep the wards and the goodwill. He keeps the grievance and the bag.',
        failureText: 'He tells the Choir what he told you, and what you asked him first.',
      },
    ],
  },

  {
    id: 'ascent_crownlands_warrant',
    title: 'The Warrant',
    body: 'There is a warrant with your name on it in a drawer in the capital. A clerk has written to explain that drawers can be slow, and that he has a daughter at school.',
    phase: 'ascent',
    factionId: 'crownlands',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Pay the clerk',
        effects: [
          { t: 'followers', v: -12 },
          { t: 'heroThreat', v: -5 },
          { t: 'standing', factionId: 'crownlands', v: 5 },
        ],
      },
      {
        kind: 'certain',
        label: 'Pay him permanently',
        effects: [
          { t: 'followers', v: -25 },
          { t: 'heroThreat', v: -9 },
          { t: 'standing', factionId: 'crownlands', v: 12 },
        ],
      },
      {
        kind: 'certain',
        label: "Write to the daughter's school instead",
        effects: [
          { t: 'notoriety', v: 8 },
          { t: 'heroThreat', v: 4 },
          { t: 'standing', factionId: 'crownlands', v: -15 },
        ],
      },
    ],
  },

  {
    id: 'ascent_lightning_season',
    title: 'The Lightning Season',
    body: 'Storms come to this valley for six weeks a year. With the right ironwork on the roof, you could keep some.',
    phase: 'ascent',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Build the ironwork',
        effects: [
          { t: 'lairTier', v: 1 },
          { t: 'followers', v: -15 },
          { t: 'notoriety', v: 6 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Build it taller than advised',
        odds: 0.45,
        onSuccess: [
          { t: 'lairTier', v: 1 },
          { t: 'notoriety', v: 12 },
          { t: 'followers', v: -10 },
        ],
        onFailure: [
          { t: 'lairTier', v: -1 },
          { t: 'followers', v: -20 },
          { t: 'notoriety', v: 2 },
        ],
        successText: 'Six weeks of storms, all of it kept. The valley can read by your windows.',
        failureText: 'The roof leaves first. The rest of the tower is persuaded to follow.',
      },
    ],
  },

  {
    id: 'ascent_ashen_masque',
    title: 'The Masque',
    body: 'The Covenant holds a masked ball every eleventh year. Attendance is optional; they simply keep a list of who came, and a shorter list of who did not.',
    phase: 'ascent',
    factionId: 'ashen_covenant',
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Attend, masked',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: 15 },
          { t: 'notoriety', v: 5 },
          { t: 'followers', v: 5 },
        ],
      },
      {
        kind: 'certain',
        label: 'Attend unmasked',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: 25 },
          { t: 'standing', factionId: 'crownlands', v: -10 },
          { t: 'notoriety', v: 12 },
          { t: 'heroThreat', v: 4 },
          { t: 'artifactFrom', factionId: 'ashen_covenant', rarity: 'rare' },
        ],
      },
      {
        kind: 'certain',
        label: 'Send an apprentice in your place',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: 5 },
          { t: 'loyalty', v: -10 },
          { t: 'notoriety', v: 1 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Attend as somebody else',
        odds: 0.3,
        onSuccess: [
          { t: 'standing', factionId: 'ashen_covenant', v: 20 },
          { t: 'notoriety', v: 14 },
          { t: 'followers', v: 10 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'ashen_covenant', v: -25 },
          { t: 'notoriety', v: -5 },
        ],
        successText: 'You are on the list twice, under two names, and nobody reconciles them.',
        failureText: 'The person you came as was also in attendance.',
      },
    ],
  },

  {
    id: 'ascent_academy_recruitment',
    title: 'Recruitment Drive',
    body: 'Academy students have begun writing to you. They are bored, gifted, and at exactly the age where a warning reads as an invitation.',
    phase: 'ascent',
    factionId: 'pale_academy',
    requires: [{ c: 'minNotoriety', v: 40 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Take the three best',
        effects: [
          { t: 'apprentices', v: 2 },
          { t: 'loyalty', v: -8 },
          { t: 'standing', factionId: 'pale_academy', v: -20 },
          { t: 'notoriety', v: 7 },
        ],
      },
      {
        kind: 'certain',
        label: 'Reply discouragingly',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: 15 },
          { t: 'notoriety', v: -3 },
          { t: 'loyalty', v: 5 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Take them quietly',
        odds: 0.55,
        onSuccess: [
          { t: 'apprentices', v: 2 },
          { t: 'loyalty', v: 5 },
          { t: 'notoriety', v: 4 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'pale_academy', v: -28 },
          { t: 'heroThreat', v: 4 },
          { t: 'apprentices', v: 1 },
        ],
        successText: 'Two of them are marked absent for a term, and then for good.',
        failureText: 'One of them writes home about it. The Academy reads the letter first.',
      },
    ],
  },

  {
    id: 'ascent_knight_errant',
    title: 'Knight Errant',
    body: 'A knight has arrived to test himself against you. He is nineteen, his armour does not fit, and he has brought a written speech.',
    phase: 'ascent',
    factionId: 'crownlands',
    weight: 3,
    options: [
      {
        kind: 'gamble',
        label: 'Kill him',
        odds: 0.85,
        onSuccess: [
          { t: 'notoriety', v: 10 },
          { t: 'heroThreat', v: 5 },
          { t: 'standing', factionId: 'crownlands', v: -18 },
        ],
        onFailure: [
          { t: 'notoriety', v: -8 },
          { t: 'followers', v: -12 },
          { t: 'heroThreat', v: 8 },
        ],
        failureText: 'The speech was longer than expected and the armour, it turns out, was borrowed from someone competent.',
        successText: 'The speech is read at the funeral. It is long.',
      },
      {
        kind: 'certain',
        label: 'Let him win something small',
        effects: [
          { t: 'notoriety', v: 2 },
          { t: 'heroThreat', v: -3 },
          { t: 'standing', factionId: 'crownlands', v: 8 },
        ],
      },
      {
        kind: 'certain',
        label: 'Give him a job',
        effects: [
          { t: 'apprentices', v: 1 },
          { t: 'loyalty', v: 10 },
          { t: 'standing', factionId: 'crownlands', v: -10 },
          { t: 'notoriety', v: 3 },
        ],
      },
    ],
  },

  {
    id: 'ascent_rumour_from_the_capital',
    title: 'A Rumour From The Capital',
    body: 'Something is being said in the capital temples about a child, a sword, and a date. The date is not soon. It is, however, a date.',
    phase: 'ascent',
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Note it and continue',
        effects: [{ t: 'notoriety', v: 2 }],
      },
      {
        kind: 'certain',
        label: 'Send someone to listen',
        effects: [
          { t: 'followers', v: -6 },
          { t: 'heroThreat', v: -3 },
          { t: 'notoriety', v: 1 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Have the temples silenced',
        odds: 0.35,
        onSuccess: [
          { t: 'heroThreat', v: -8 },
          { t: 'notoriety', v: 9 },
          { t: 'standing', factionId: 'crownlands', v: -20 },
        ],
        onFailure: [
          { t: 'heroThreat', v: 10 },
          { t: 'notoriety', v: 5 },
          { t: 'standing', factionId: 'crownlands', v: -25 },
        ],
        successText: 'The temples stop saying it. Nobody writes down a date that was never said.',
        failureText: 'You have given a vague prophecy a specific enemy.',
      },
    ],
  },

  {
    id: 'ascent_crownlands_appointment',
    title: 'An Appointment',
    body: 'The Crownlands offer you a minor governorship of a province nobody wants. It is a trap, it is transparently a trap, and it also pays.',
    phase: 'ascent',
    factionId: 'crownlands',
    requires: [{ c: 'minNotoriety', v: 35 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Take the post',
        effects: [
          { t: 'standing', factionId: 'crownlands', v: 25 },
          { t: 'followers', v: 25 },
          { t: 'notoriety', v: -6 },
          { t: 'heroThreat', v: -4 },
          { t: 'artifactFrom', factionId: 'crownlands', rarity: 'common' },
        ],
      },
      {
        kind: 'certain',
        label: 'Take it and govern badly',
        effects: [
          { t: 'standing', factionId: 'crownlands', v: -10 },
          { t: 'followers', v: 15 },
          { t: 'notoriety', v: 9 },
          { t: 'heroThreat', v: 3 },
        ],
      },
      {
        kind: 'certain',
        label: 'Return the seal in pieces',
        effects: [
          { t: 'standing', factionId: 'crownlands', v: -22 },
          { t: 'notoriety', v: 7 },
        ],
      },
    ],
  },

  {
    id: 'ascent_succession_planning',
    title: 'Succession Planning',
    body: 'Your steward asks, without looking up from the ledger, what the arrangements are should anything happen to you. You have not made any. He has.',
    phase: 'ascent',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Approve his arrangements',
        effects: [
          { t: 'loyalty', v: 15 },
          { t: 'followers', v: 10 },
          { t: 'notoriety', v: -1 },
        ],
      },
      {
        kind: 'certain',
        label: 'Read them first',
        effects: [
          { t: 'loyalty', v: -8 },
          { t: 'notoriety', v: 3 },
          { t: 'followers', v: 4 },
        ],
        resultText: 'Page eleven concerns the disposal of the body. It is extremely thorough.',
      },
    ],
  },

  {
    id: 'ascent_pale_academy_loan',
    title: 'Interlibrary Loan',
    body: 'The Academy library will lend you anything in the restricted stacks. The loan period is ninety years and the late fees are described only as "escalating".',
    phase: 'ascent',
    factionId: 'pale_academy',
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Borrow within the rules',
        effects: [
          { t: 'artifactFrom', factionId: 'pale_academy', rarity: 'common' },
          { t: 'standing', factionId: 'pale_academy', v: 10 },
          { t: 'notoriety', v: 3 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Borrow and never return it',
        odds: 0.45,
        onSuccess: [
          { t: 'artifactFrom', factionId: 'pale_academy', rarity: 'rare' },
          { t: 'notoriety', v: 9 },
          { t: 'standing', factionId: 'pale_academy', v: -15 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'pale_academy', v: -30 },
          { t: 'heroThreat', v: 5 },
          { t: 'followers', v: -8 },
        ],
        successText: 'Ninety years is a long loan period. You intend to outlast the catalogue.',
        failureText: 'The Academy does not send debt collectors. It sends librarians.',
      },
      {
        kind: 'certain',
        label: 'Read it in the reading room',
        effects: [
          { t: 'standing', factionId: 'pale_academy', v: 6 },
          { t: 'notoriety', v: 1 },
          { t: 'loyalty', v: 3 },
        ],
      },
    ],
  },

  {
    id: 'ascent_ashen_recruiter',
    title: 'The Recruiter',
    body: 'A Covenant recruiter has been working your village for a month. Eleven of your people have joined and they have taken the good boots with them.',
    phase: 'ascent',
    factionId: 'ashen_covenant',
    requires: [{ c: 'minFollowers', v: 25 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Let him work',
        effects: [
          { t: 'followers', v: -18 },
          { t: 'standing', factionId: 'ashen_covenant', v: 22 },
          { t: 'notoriety', v: 4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Run him off',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: -18 },
          { t: 'followers', v: 8 },
          { t: 'notoriety', v: 3 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Recruit the recruiter',
        odds: 0.4,
        onSuccess: [
          { t: 'apprentices', v: 1 },
          { t: 'followers', v: 20 },
          { t: 'standing', factionId: 'ashen_covenant', v: -12 },
          { t: 'notoriety', v: 8 },
        ],
        onFailure: [
          { t: 'followers', v: -25 },
          { t: 'standing', factionId: 'ashen_covenant', v: -10 },
          { t: 'loyalty', v: -8 },
        ],
        successText: 'He changes employers without changing his pitch. The boots come back too.',
        failureText: 'He recruits four more during the conversation, including the man taking notes.',
      },
    ],
  },

  {
    id: 'ascent_verdant_harvest_festival',
    title: 'The Festival',
    body: 'The Verdant Choir holds a harvest festival at the edge of your land every autumn. This year they have sent you an invitation, which the Choir has never done for anyone.',
    phase: 'ascent',
    factionId: 'verdant_choir',
    requires: [{ c: 'minStanding', factionId: 'verdant_choir', v: 20 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Attend',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: 25 },
          { t: 'artifactFrom', factionId: 'verdant_choir', rarity: 'common' },
          { t: 'notoriety', v: -3 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Attend and ask for the deep grove',
        odds: 0.3,
        onSuccess: [
          { t: 'artifactFrom', factionId: 'verdant_choir', rarity: 'rare' },
          { t: 'standing', factionId: 'verdant_choir', v: 15 },
          { t: 'notoriety', v: 7 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'verdant_choir', v: -30 },
          { t: 'followers', v: -12 },
        ],
        successText: 'They take you as far as the second ring, which is further than anyone gets.',
        failureText: 'The invitation was the whole gesture. Asking for more retires the tradition.',
      },
    ],
  },
];
