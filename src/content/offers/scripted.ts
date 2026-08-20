import type { Offer } from '../../types';

/**
 * SCRIPTED SET PIECES.
 *
 * Not sampled from the ordinary weighted pool — the engine fires these at the
 * moments it owns. `prophecy` is the phase pivot. The rest are the branches a
 * run can end on, and every one of them is authored as a live decision with a
 * disclosed price: no branch here is a strict upgrade.
 *
 * Note on lichdom: the wiki's cost is that the lich forfeits all artifacts and
 * all followers. The engine applies that forfeiture, but the effect list below
 * still spells it out, because the odds-display rule says the player must see
 * the whole price before committing.
 */
export const scriptedOffers: Offer[] = [
  {
    id: 'prophecy',
    title: 'The Prophecy',
    body: 'A child was born this year in a village you have never troubled. The temples have already agreed the wording, and your name is in it, spelled correctly.',
    phase: 'any',
    factionId: 'crownlands',
    scripted: true,
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Send for the child',
        effects: [
          { t: 'heroThreat', v: 10 },
          { t: 'notoriety', v: 8 },
          { t: 'standing', factionId: 'crownlands', v: -25 },
          { t: 'followers', v: -8 },
        ],
        resultText: 'The village is empty when your riders arrive. It has been empty for a week.',
      },
      {
        kind: 'certain',
        label: 'Prepare the walls',
        effects: [
          { t: 'heroThreat', v: -6 },
          { t: 'followers', v: -15 },
          { t: 'notoriety', v: 2 },
        ],
      },
      {
        kind: 'certain',
        label: 'Do nothing; prophecies are a genre',
        effects: [
          { t: 'notoriety', v: 4 },
          { t: 'heroThreat', v: 4 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Find the temple that wrote it',
        odds: 0.2,
        onSuccess: [
          { t: 'heroThreat', v: -15 },
          { t: 'notoriety', v: 12 },
          { t: 'standing', factionId: 'crownlands', v: -20 },
        ],
        onFailure: [
          { t: 'heroThreat', v: 20 },
          { t: 'notoriety', v: 6 },
          { t: 'standing', factionId: 'crownlands', v: -35 },
        ],
        failureText: 'Eleven temples now claim to have written it. All of them are correct.',
      },
    ],
  },

  {
    id: 'scripted_the_long_arrangement',
    title: 'The Long Arrangement',
    body: 'The Worm Below offers the only thing it has ever offered anyone: an end to endings. It will take the relics, because they were always borrowed, and the followers, because they are alive.',
    phase: 'decline',
    factionId: 'worm_below',
    scripted: true,
    requires: [{ c: 'minStanding', factionId: 'worm_below', v: 20 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Accept. Become the thing under the hill.',
        effects: [
          { t: 'loseArtifact' },
          { t: 'loseArtifact' },
          { t: 'loseArtifact' },
          { t: 'loseArtifact' },
          { t: 'loseArtifact' },
          { t: 'loseArtifact' },
          { t: 'followers', v: -999 },
          { t: 'notoriety', v: 12 },
          { t: 'ending', endingId: 'lichdom' },
        ],
        resultText: 'The vault empties. The household walks out through the front gate in daylight, and nobody stops them.',
      },
      {
        kind: 'certain',
        label: 'Refuse, and say why',
        effects: [
          { t: 'standing', factionId: 'worm_below', v: -30 },
          { t: 'notoriety', v: 5 },
          { t: 'loyalty', v: 10 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Ask for it without the price',
        odds: 0.25,
        onSuccess: [
          { t: 'artifactFrom', factionId: 'worm_below', rarity: 'legendary' },
          { t: 'standing', factionId: 'worm_below', v: 20 },
          { t: 'notoriety', v: 10 },
        ],
        onFailure: [
          { t: 'standing', factionId: 'worm_below', v: -25 },
          { t: 'followers', v: -30 },
          { t: 'pactDebt', v: 2 },
          { t: 'notoriety', v: -6 },
        ],
        failureText: 'It does not take offence. It simply stops offering, which is worse.',
      },
    ],
  },

  {
    id: 'scripted_the_reckoning',
    title: 'The Reckoning',
    body: 'The Covenant ledger has been closed and totalled. Ceremoniarch Yull is not present; what has come in his place brought the ledger and nothing to write with.',
    phase: 'decline',
    factionId: 'ashen_covenant',
    scripted: true,
    requires: [{ c: 'minPactDebt', v: 4 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Pay everything you have',
        effects: [
          { t: 'followers', v: -80 },
          { t: 'loseArtifact' },
          { t: 'loseArtifact' },
          { t: 'pactDebt', v: -6 },
          { t: 'notoriety', v: -10 },
          { t: 'standing', factionId: 'ashen_covenant', v: 20 },
        ],
      },
      {
        kind: 'certain',
        label: 'Refuse to pay',
        effects: [{ t: 'ending', endingId: 'consumed_by_pact' }],
      },
      {
        kind: 'gamble',
        label: 'Contest the total',
        odds: 0.25,
        onSuccess: [
          { t: 'pactDebt', v: -4 },
          { t: 'notoriety', v: 10 },
          { t: 'standing', factionId: 'ashen_covenant', v: 10 },
        ],
        onFailure: [{ t: 'ending', endingId: 'consumed_by_pact' }],
        successText: 'Two of the entries were double-counted. The thing corrects the ledger and leaves without a word.',
      },
    ],
  },

  {
    id: 'scripted_the_chosen_one',
    title: 'The Chosen One',
    body: 'She is at the gate. She is twenty-two, she has the sword, and she has been preparing for this conversation since she was nine years old.',
    phase: 'decline',
    factionId: 'crownlands',
    scripted: true,
    requires: [{ c: 'minNotoriety', v: 45 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Surrender the tower and walk out',
        effects: [
          { t: 'lairTier', v: -2 },
          { t: 'notoriety', v: -25 },
          { t: 'heroThreat', v: -20 },
          { t: 'followers', v: -40 },
        ],
      },
      {
        kind: 'certain',
        label: 'Offer her the apprenticeship',
        effects: [
          { t: 'apprentices', v: 1 },
          { t: 'loyalty', v: -30 },
          { t: 'heroThreat', v: -12 },
          { t: 'notoriety', v: 6 },
        ],
        resultText: 'She accepts. She keeps the sword, and she keeps it where you can see it.',
      },
      {
        kind: 'gamble',
        label: 'Fight her',
        odds: 0.4,
        onSuccess: [
          { t: 'notoriety', v: 25 },
          { t: 'heroThreat', v: -25 },
          { t: 'followers', v: 20 },
          { t: 'artifactFrom', factionId: 'crownlands', rarity: 'legendary' },
        ],
        onFailure: [{ t: 'ending', endingId: 'slain_by_chosen_one' }],
        successText: 'You keep the sword. It is a very good sword, and it does not like you.',
      },
      {
        kind: 'gamble',
        label: 'Tell her about her father',
        odds: 0.15,
        onSuccess: [
          { t: 'heroThreat', v: -30 },
          { t: 'notoriety', v: 14 },
          { t: 'standing', factionId: 'crownlands', v: -25 },
          { t: 'followers', v: 10 },
        ],
        onFailure: [
          { t: 'heroThreat', v: 10 },
          { t: 'notoriety', v: -8 },
          { t: 'followers', v: -20 },
        ],
        failureText: 'She already knew. She has known longer than you have.',
      },
    ],
  },

  {
    id: 'scripted_the_reliquary',
    title: 'The Reliquary',
    body: 'The Pale Academy proposes preservation rather than execution: a gem, a shelf, a climate-controlled room, and a review of your case every hundred years.',
    phase: 'decline',
    factionId: 'pale_academy',
    scripted: true,
    requires: [{ c: 'minStanding', factionId: 'pale_academy', v: 30 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Consent to the gem',
        effects: [{ t: 'ending', endingId: 'sealed_in_gem' }],
      },
      {
        kind: 'certain',
        label: 'Ask for a century to settle affairs',
        effects: [
          { t: 'heroThreat', v: -10 },
          { t: 'notoriety', v: -8 },
          { t: 'standing', factionId: 'pale_academy', v: 15 },
          { t: 'followers', v: -15 },
        ],
      },
      {
        kind: 'gamble',
        label: 'Agree, and substitute a decoy',
        odds: 0.35,
        onSuccess: [
          { t: 'heroThreat', v: -18 },
          { t: 'notoriety', v: 12 },
          { t: 'standing', factionId: 'pale_academy', v: -25 },
          { t: 'followers', v: -10 },
        ],
        onFailure: [{ t: 'ending', endingId: 'sealed_in_gem' }],
        failureText: 'The Academy has catalogued a great many wizards. It has seen the decoy before.',
      },
    ],
  },

  {
    id: 'scripted_the_succession',
    title: 'The Succession',
    body: 'Your apprentices have called a meeting and not invited you. There is an agenda. You know there is an agenda because a copy was left where you would find it.',
    phase: 'decline',
    scripted: true,
    requires: [{ c: 'minApprentices', v: 3 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Dissolve the household tonight',
        effects: [
          { t: 'apprentices', v: -3 },
          { t: 'followers', v: -30 },
          { t: 'loyalty', v: -20 },
          { t: 'notoriety', v: 10 },
          { t: 'heroThreat', v: 4 },
        ],
      },
      {
        kind: 'certain',
        label: 'Attend the meeting',
        effects: [
          { t: 'loyalty', v: 20 },
          { t: 'apprentices', v: -1 },
          { t: 'notoriety', v: -5 },
          { t: 'followers', v: 10 },
        ],
        resultText: 'You take the empty chair. Item four is moved to any other business and never returns to it.',
      },
      {
        kind: 'gamble',
        label: 'Let it proceed and see who speaks',
        odds: 0.45,
        onSuccess: [
          { t: 'apprentices', v: -2 },
          { t: 'loyalty', v: 15 },
          { t: 'notoriety', v: 12 },
          { t: 'followers', v: 8 },
        ],
        onFailure: [{ t: 'ending', endingId: 'betrayed_by_apprentice' }],
      },
    ],
  },
];
