import type { Offer } from '../../types';

/**
 * THE STALLS — shop-style offers (issue #115).
 *
 * Everywhere else in the catalog a card hands you one situation and asks how
 * you react. These hand you a price list and ask what you want: three or four
 * priced goods, paid in a currency the player already holds, so the choice is
 * *what to buy* rather than only *how to take a hit*. Selling was already
 * scattered through other cards ("Sell one piece", "Sell her a relic for what
 * you need"); the Pale Academy's table below makes it a standing option.
 *
 * Design calls (issue #115's open questions, answered conservatively — all
 * reversible, nothing here touches the engine):
 *   - SPENDABLE: followers, standing (above a floor, so a purchase cannot walk
 *     you into a reprisal), and held relics. NEVER pact debt: a debt that can
 *     be bought is a debt the player is invited to run up, and the pacts file
 *     already owns that trade-off.
 *   - FIXED prices. A "price of the day" is a Daily Wizard (#129) concern.
 *   - ONE stall per faction that has something to sell, not one recurring
 *     merchant: each faction's price list reads as its character.
 *   - "Roughly equal-value trades" (the issue's own acceptance line): a common
 *     relic runs about 9-10 followers, a lair rung about 15, a visible chunk
 *     of hero threat about 6-11, and a held relic sells for about 20 — the
 *     same rates as the existing one-off sale cards.
 *
 * Every stall is a decline-phase offer from era index 10: several goods buy
 * hero-threat relief, and threat only starts to grow once the decline begins
 * (`threatGainFor` is 0 in the ascent), so an earlier stall would take the price
 * and deliver nothing (the card would print the truth, but it would be a bad
 * deal to print). Known gaps shared with older cards (`any_contractors`, the
 * favors): a lair rung bought at the top of the ladder, or a relic drawn when
 * the faction's commons are all held, delivers nothing.
 *
 * Rule 1 notes. Every price is a plain `certain` effect list, so the card
 * prints exactly what the engine does. A follower or relic price is gated on
 * its stock by `impliedGatesOf` (failure mode 14); a standing price is gated
 * by the offer's own `requires`, because standing has no floor to hide behind
 * and a price the player cannot afford would otherwise not be a price.
 * `loseArtifact` is always the LAST effect (failure mode 20).
 *
 * Register per wiki/02: the bodies are comedic; the numbers are not.
 */

export const shopOffers: Offer[] = [
  {
    id: 'shop_gilded_stall',
    title: 'The Travelling Stall',
    body: 'Hesper Quill has pitched a folding stall in your courtyard, under a banner reading ALL SALES FINAL, FINAL BEING A TERM OF ART. The price list is laminated. The lamination is itself on the price list.',
    phase: 'decline',
    factionId: 'gilded_hand',
    requires: [{ c: 'minEraIndex', v: 10 }, { c: 'minFollowers', v: 6 }],
    weight: 3,
    options: [
      {
        kind: 'certain',
        label: 'Buy a relic off the shelf',
        effects: [
          { t: 'followers', v: -10 },
          { t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'common' },
        ],
        resultText: 'It is wrapped in the stall’s own receipt, which is longer than the relic.',
      },
      {
        kind: 'certain',
        label: 'Buy a new floor of the tower',
        effects: [
          { t: 'followers', v: -15 },
          { t: 'lairTier', v: 1 },
        ],
        resultText: 'The floor arrives flat-packed and assembles itself overnight, grumbling about the instructions.',
      },
      {
        kind: 'certain',
        label: 'Buy a quieter reputation',
        effects: [
          { t: 'followers', v: -6 },
          { t: 'heroThreat', v: -8 },
        ],
        resultText: 'Quill mislays a few of your rumours, at a handling fee, and does not say where she mislaid them.',
      },
      {
        kind: 'certain',
        label: 'Browse and buy nothing',
        effects: [{ t: 'standing', factionId: 'gilded_hand', v: -2 }],
        resultText: 'The stall is folded away with the particular speed of a stall that has seen browsers before.',
      },
    ],
  },
  {
    id: 'shop_academy_appraiser',
    title: 'The Appraiser’s Table',
    body: 'A junior archivist from the Pale Academy has set up a trestle table and a very small brass scale, and is appraising things in the corridor. She has a form for appraising you. She has not decided yet whether to hand you the form.',
    phase: 'decline',
    factionId: 'pale_academy',
    requires: [{ c: 'minEraIndex', v: 10 }, { c: 'minArtifacts', v: 3 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Sell a relic for hands',
        effects: [
          { t: 'followers', v: 20 },
          { t: 'loseArtifact' }, // last: the loss must follow every effect a relic can rescale
        ],
        resultText: 'The Academy pays in graduate students, who arrive with their own chairs and a list of grievances about the scale.',
      },
      {
        kind: 'certain',
        label: 'Sell a relic for a clean record',
        effects: [
          { t: 'heroThreat', v: -11 },
          { t: 'standing', factionId: 'pale_academy', v: 4 },
          { t: 'loseArtifact' }, // last: the loss must follow every effect a relic can rescale
        ],
        resultText: 'The relic is catalogued and you are, in the same sitting, removed from a different catalogue.',
      },
      {
        kind: 'certain',
        label: 'Keep your relics, keep the receipt',
        effects: [{ t: 'standing', factionId: 'pale_academy', v: -2 }],
        resultText: 'She writes down what you declined to sell. It is a long entry.',
      },
    ],
  },
  {
    id: 'shop_choir_seed_market',
    title: 'The Seed Market',
    body: 'Brambleward Oona has laid a market out on the lawn, in rows, though the rows are growing. Nothing has a price tag. Everything has a debt of gratitude, and the Choir is very precise about the exchange rate.',
    phase: 'decline',
    factionId: 'verdant_choir',
    requires: [{ c: 'minEraIndex', v: 10 }, { c: 'minStanding', factionId: 'verdant_choir', v: 20 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Spend goodwill on new hands',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: -6 },
          { t: 'followers', v: 12 },
        ],
        resultText: 'Twelve people are exchanged for a favour, which the Choir records under "planting".',
      },
      {
        kind: 'certain',
        label: 'Spend goodwill on a root cellar’s worth of luck',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: -10 },
          { t: 'artifactFrom', factionId: 'verdant_choir', rarity: 'common' },
        ],
        resultText: 'The relic is lifted out of a flowerbed with a small ceremony and a larger invoice, payable in apologies.',
      },
      {
        kind: 'certain',
        label: 'Spend goodwill on cover',
        effects: [
          { t: 'standing', factionId: 'verdant_choir', v: -8 },
          { t: 'heroThreat', v: -9 },
        ],
        resultText: 'The hedges along the road grow a little taller, in a direction that happens to be the hero’s.',
      },
      {
        kind: 'certain',
        label: 'Admire the produce',
        effects: [{ t: 'notoriety', v: -1 }],
        resultText: 'You admire it at length. Oona accepts the admiration as payment for nothing, which is the Choir’s favourite price.',
      },
    ],
  },
  {
    id: 'shop_crown_auction',
    title: 'The Seizure Auction',
    body: 'The Crown is auctioning the contents of a warehouse it seized from someone who was, it assures you, a wizard in the old sense and not at all like you. The auctioneer’s gavel is also evidence.',
    phase: 'decline',
    factionId: 'crownlands',
    requires: [{ c: 'minEraIndex', v: 10 }, { c: 'minFollowers', v: 8 }],
    weight: 2,
    options: [
      {
        kind: 'certain',
        label: 'Bid on a seized relic',
        effects: [
          { t: 'followers', v: -9 },
          { t: 'artifactFrom', factionId: 'crownlands', rarity: 'common' },
        ],
        resultText: 'Lot 41 is yours. Lot 41 is stamped with the previous owner’s case number, which the Crown asks you to ignore.',
      },
      {
        kind: 'certain',
        label: 'Bid on the Crown’s good word',
        effects: [
          { t: 'followers', v: -8 },
          { t: 'standing', factionId: 'crownlands', v: 10 },
        ],
        resultText: 'A clerk reads your name aloud as a patron of the realm, with the audible effort of a man reading it correctly.',
      },
      {
        kind: 'certain',
        label: 'Bid on a pardon, lot 12',
        effects: [
          { t: 'followers', v: -11 },
          { t: 'heroThreat', v: -12 },
        ],
        resultText: 'The pardon is for a clerical error. Your clerical error. It has been in the file for years.',
      },
      {
        kind: 'certain',
        label: 'Sit on your hands',
        effects: [{ t: 'standing', factionId: 'crownlands', v: -2 }],
        resultText: 'The auctioneer notes that you attended and did not bid, which in the Crown’s ledger is a category of its own.',
      },
    ],
  },
  {
    id: 'shop_worm_cellar_market',
    title: 'The Cellar Market',
    body: 'Something below the third cellar has opened a stall in the dark. It sells things. It takes payment in people, politely, and does not say what it does with them, and the sound of the till is wet.',
    phase: 'decline',
    factionId: 'worm_below',
    requires: [{ c: 'minEraIndex', v: 10 }, { c: 'minFollowers', v: 8 }],
    weight: 1,
    options: [
      {
        kind: 'certain',
        label: 'Pay in people for a deeper cellar',
        effects: [
          { t: 'followers', v: -14 },
          { t: 'lairTier', v: 1 },
          { t: 'standing', factionId: 'worm_below', v: 2 },
        ],
        resultText: 'The floor of the lowest room is not where you left it. The room is better for it, by every measure but the plumbing.',
      },
      {
        kind: 'certain',
        label: 'Pay in people for a relic',
        effects: [
          { t: 'followers', v: -10 },
          { t: 'artifactFrom', factionId: 'worm_below', rarity: 'common' },
        ],
        resultText: 'It is handed up from the dark, still warm, with the particular apology of something that has never owned a hand.',
      },
      {
        kind: 'certain',
        label: 'Pay in people for quiet',
        effects: [
          { t: 'followers', v: -8 },
          { t: 'heroThreat', v: -10 },
        ],
        resultText: 'For a while, everything that was looking for you looks, instead, a little to the left.',
      },
      {
        kind: 'certain',
        label: 'Put your coin away',
        effects: [{ t: 'standing', factionId: 'worm_below', v: -2 }],
        resultText: 'The till closes. In the dark, something is disappointed at a frequency you feel in your teeth.',
      },
    ],
  },
];
