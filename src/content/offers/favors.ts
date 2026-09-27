import type { Offer } from '../../types';

/**
 * THE FAVORS — the mid-run reward for courting a faction, below the reliquary.
 *
 * Reported from play and confirmed in the sim: during a run, standing's only
 * VISIBLE consequences were punishments — the seal threshold and a locked
 * reliquary — so a faction you were building read as pure downside until the
 * concordat opened at `DEVOTION_STANDING`, which most runs never reach. That made
 * deliberate faction routing — the behaviour meant to produce hundred-run players
 * (wiki/06) — feel like all stick and no carrot.
 *
 * Each favor gates at +30 standing: enough to prove you have courted them, well
 * short of the reliquary at 50, so the carrot arrives while there is still a run
 * to spend it on. Each pays in that faction's characteristic currency for a real
 * price, and each keeps a walk-away — a favour with no cost is a bribe, and a
 * bribe is not a decision.
 *
 * The prices are also the identities. The Gilded Hand sells you a relic at a
 * loyalty discount; the Ashen Covenant lends you infamy against your soul's
 * overdraft; the Pale Academy grants shelter that dulls your menace (a positive
 * reason to court the alma mater, which was otherwise only a faction to avoid
 * offending into the gem); the Verdant Choir lets the land provide.
 *
 * Register per wiki/02: the body is comedic, the effects are straight-faced.
 */

export const favorOffers: Offer[] = [
  {
    id: 'favor_gilded_terms',
    title: 'Preferred Terms',
    body: 'Hesper Quill returns the catalogue, this time with a second column of prices, lower than the first and printed in a red the Gilded Hand keeps for people it has decided to keep.',
    phase: 'any',
    factionId: 'gilded_hand',
    requires: [{ c: 'minStanding', factionId: 'gilded_hand', v: 30 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Buy at the preferred price',
        effects: [
          { t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'common' },
          { t: 'followers', v: -6 },
        ],
        resultText: 'The relic arrives in a crate marked with your account number and nothing else.',
      },
      {
        kind: 'gamble',
        label: 'Ask to see the good shelf',
        odds: 0.8,
        onSuccess: [
          { t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'rare' },
          { t: 'followers', v: -6 },
        ],
        onFailure: [
          { t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'common' },
          { t: 'followers', v: -14 },
        ],
        successText: 'Quill unlocks a cabinet you were not meant to know about and pretends you asked nicely.',
        failureText: 'The good shelf is being inventoried. You buy the near shelf at the good shelf’s price.',
      },
      {
        kind: 'certain',
        label: 'Not this quarter',
        effects: [{ t: 'standing', factionId: 'gilded_hand', v: -3 }],
        resultText: 'The catalogue is collected before you have finished declining it.',
      },
    ],
  },
  {
    id: 'favor_covenant_short_list',
    title: 'The Short List',
    body: 'Ceremoniarch Yull mentions, without being asked, that the Covenant maintains a short list of names it says aloud in the dark, and that there is, as it happens, a vacancy.',
    phase: 'any',
    factionId: 'ashen_covenant',
    requires: [{ c: 'minStanding', factionId: 'ashen_covenant', v: 30 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Take the vacancy',
        effects: [
          { t: 'notoriety', v: 9 },
          { t: 'pactDebt', v: 1 },
        ],
        resultText: 'Your name is now said in three cellars nightly. You feel each mention as a small draught.',
      },
      {
        kind: 'gamble',
        label: 'Ask them to say it louder',
        odds: 0.85,
        onSuccess: [
          { t: 'notoriety', v: 14 },
          { t: 'standing', factionId: 'ashen_covenant', v: 5 },
          { t: 'pactDebt', v: 1 },
        ],
        onFailure: [
          { t: 'notoriety', v: 9 },
          { t: 'pactDebt', v: 2 },
        ],
        successText: 'They say it louder. Somewhere, a hero’s mother has a bad dream and blames the cheese.',
        failureText: 'Volume, it turns out, is billed separately, and the invoice is in the usual currency.',
      },
      {
        kind: 'certain',
        label: 'Stay off the list',
        effects: [
          { t: 'standing', factionId: 'ashen_covenant', v: -3 },
          { t: 'notoriety', v: 2 },
        ],
        resultText: 'Yull crosses one name off a list you never saw and does not tell you whose.',
      },
    ],
  },
  {
    id: 'favor_academy_quiet_word',
    title: 'A Quiet Word',
    body: 'Provost Rook writes to say the Academy could, discreetly, extend you certain protections. The word "alumnus" appears once, in a sentence that also contains the word "regrettably".',
    phase: 'any',
    factionId: 'pale_academy',
    requires: [{ c: 'minStanding', factionId: 'pale_academy', v: 30 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Accept the protection',
        effects: [
          { t: 'heroThreat', v: -10 },
          { t: 'notoriety', v: -6 },
        ],
        resultText: 'You are added to a register of people the Academy would rather were not killed on the record.',
      },
      {
        kind: 'certain',
        label: 'Stay out in the weather',
        effects: [{ t: 'standing', factionId: 'pale_academy', v: -3 }],
        resultText: 'Rook notes your independence in the file, in the tone the file is famous for.',
      },
    ],
  },
  {
    id: 'favor_choir_seasons_turn',
    title: 'The Season’s Turn',
    body: 'Brambleward Oona sends word that the ground around your tower is willing to be generous this year, and that generosity, in the Choir’s dialect, is a thing you are expected to be grateful to and not merely for.',
    phase: 'any',
    factionId: 'verdant_choir',
    requires: [{ c: 'minStanding', factionId: 'verdant_choir', v: 30 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Let the land provide',
        effects: [
          { t: 'followers', v: 12 },
          { t: 'standing', factionId: 'verdant_choir', v: 4 },
          { t: 'notoriety', v: -3 },
        ],
        resultText: 'Twelve people arrive to tend the new growth and stay because the growth is tending them back.',
      },
      {
        kind: 'certain',
        label: 'Keep your walls bare',
        effects: [{ t: 'standing', factionId: 'verdant_choir', v: -3 }],
        resultText: 'The ivy withdraws to a polite distance and waits, which is what the Choir does best.',
      },
    ],
  },
];
