import type { FactionId, Offer } from '../../types';

/**
 * THE CONCORDATS — the reliquary beat, one per faction that owns a legendary.
 *
 * These exist because Ascension was unreachable. The catalog's only legendary
 * grants sat behind three low-odds gambles, so 2000 simulated runs produced
 * exactly zero — and the requirement was two legendaries at the time, in the
 * most mutually hostile corner of the faction web. It is ONE now
 * (`ASCENSION_LEGENDARIES`), which is what made the door openable at all. The empty Ascension slot in
 * the header is supposed to be a near-miss, not a lie.
 *
 * The gate is devotion — standing at or above the level where a faction opens
 * its reliquary. That is deliberate and matches the world bible: the first
 * four legendaries live in the most mutually hostile corner of the faction web
 * (Covenant, Academy, Crownlands, Worm), and hostility is contagious, so
 * holding two means brokering a peace nobody else in the province has managed.
 * The rarity is legible rather than arbitrary — you can see why you missed.
 *
 * The Hand and the Choir joined in #22 and do not sit in that corner — the
 * Hand is hostile to nobody but the Choir, and the Choir to it, so courting
 * either one is comparatively cheap. Measured alone, the two extra routes
 * barely moved the Ascension rate (the notoriety conjunct was the tighter
 * one); `ASCENSION_MIN_NOTORIETY` is what actually restored the 1-4% band —
 * see the comment on that constant.
 *
 * Each is a live decision, never a free relic: the certain branch charges a
 * real price in the currency that faction actually wants.
 *
 * THE PRICES WERE RETUNED WHEN THE STOCK GATES LANDED, and had to be. They
 * were written as flavour numbers — forty-five followers, thirty, twenty —
 * against a median holding of SEVEN at the moment devotion is first met, and
 * they only ever "worked" because `applyEffects` floored the deduction at zero
 * and handed over the legendary anyway (CLAUDE.md failure mode 14). Gating a
 * price nobody can pay just closes the card. Each follower price is now inside
 * what a devoted wizard actually holds, the `resultText` numbers moved with
 * them, and `concordat_covenant` charges pact debt instead so one route into a
 * reliquary survives at zero stock — see its comment.
 */

type Concordat = {
  id: string;
  factionId: FactionId;
  title: string;
  body: string;
  takeLabel: string;
  /** What accepting costs, beyond the relic itself. */
  price: Offer['options'][number];
  /**
   * The stock `price` actually spends — CLAUDE.md failure mode 14.
   *
   * `applyEffects` floors followers, apprentices and the lair tier at zero, so
   * a certain option that trades a countable balance for a FIXED benefit hands
   * the whole benefit to a wizard who cannot pay: the legendary is granted,
   * the deduction clamps to nothing, and `resultText` narrates a household
   * being liquidated out of a household of eight. One legendary plus
   * `ASCENSION_MIN_NOTORIETY` is the whole of `ascensionReady`, so the erased
   * cost was a direct route to the rarest ending in the game.
   *
   * `requires` is an AND and options carry no gates of their own, so a card
   * charging two payments lists both — the shared devotion gate at the bottom
   * of this file is concatenated with these.
   *
   * The `oath_*` cards carry a `stockGate` for exactly this reason
   * (`src/content/offers/oaths.ts`); this is the same field on the same
   * grounds. `scripts/validate-content.ts` asserts every one of these covers
   * the cost its own `price` spends, reading the option's effects rather than
   * this field, so a new concordat cannot quietly ship without one.
   *
   * An EMPTY array is a real answer, not an omission — see
   * `concordat_covenant`, which is deliberately payable at any stock level.
   */
  stockGate: Offer['requires'];
  declineLabel: string;
  declineText: string;
};

const CONCORDATS: Concordat[] = [
  {
    id: 'concordat_covenant',
    factionId: 'ashen_covenant',
    title: 'The Cinder Testament',
    body: 'The Covenant has decided you are owed the book. They say this as though it were good news, and they say it in the room where they keep the book.',
    takeLabel: 'Take the Testament',
    price: {
      kind: 'certain',
      label: 'Take the Testament',
      effects: [
        { t: 'artifactFrom', factionId: 'ashen_covenant', rarity: 'legendary' },
        { t: 'pactDebt', v: 3 },
        { t: 'notoriety', v: 8 },
      ],
      resultText: 'You sign where indicated. You are not told which page, and it is not the last one.',
    },
    // THE STOCK-FREE EXIT, and the one concordat that has to have one.
    //
    // This card used to charge an apprentice, which is the price the Covenant
    // would ask for — but an apprentice is a countable balance, and gating it
    // (as every card spending one now must) closes the reliquary to a wizard
    // holding none. MEASURED: at the moment devotion is first met a wizard
    // holds a median of 0 apprentices and 7 followers, and the apprentice gate
    // alone took Ascension from 1.20% to 0.90% against a wiki-authored 1-4%
    // band. Six of six reliquaries gated on countable stock leaves a devoted
    // wizard with nothing left to sell no route to a legendary at all — the
    // same ladder-walk failure `validate-content.ts` already checks for on the
    // pact ascent, which is why CLAUDE.md's failure mode 14 says the two rules
    // "only compose while a stock-free exit survives at every level".
    //
    // Pact debt is the fix rather than a smaller number, because it is the one
    // currency in the game with no floor to clamp against: it only goes up,
    // `PACT_LIMIT` is disclosed, and the header carries the distance. The
    // exchange is therefore honest at every stock level and needs no gate to
    // make it so. It is also the more Covenant-shaped of the two prices —
    // they deal in what you owe, not in who works for you.
    stockGate: [],
    declineLabel: 'Leave it on the shelf',
    declineText: 'The Covenant does not argue. It writes the date down.',
  },
  {
    id: 'concordat_academy',
    factionId: 'pale_academy',
    title: 'Emeritus',
    body: 'The Academy that expelled you has voted to restore your reading privileges. The vote was not close, which is somehow worse than if it had been.',
    takeLabel: 'Accept the honour',
    price: {
      kind: 'certain',
      label: 'Accept the honour',
      effects: [
        { t: 'artifactFrom', factionId: 'pale_academy', rarity: 'legendary' },
        { t: 'notoriety', v: -10 },
        { t: 'standing', factionId: 'crownlands', v: 10 },
        { t: 'followers', v: -6 },
      ],
      resultText: 'They give you a key, a shelf, and a form to fill in about the shelf.',
    },
    stockGate: [{ c: 'minFollowers', v: 6 }],
    declineLabel: 'Decline, in writing, at length',
    declineText: 'Your letter is filed. It will be quoted at your memorial.',
  },
  {
    id: 'concordat_crownlands',
    factionId: 'crownlands',
    title: 'The Unbroken Line',
    body: 'A Crownlands clerk offers you the genealogy — the whole roll, every branch of the hero-bloodline. He is not defecting. He has simply run the numbers on his pension.',
    takeLabel: 'Buy the roll',
    price: {
      kind: 'certain',
      label: 'Buy the roll',
      effects: [
        { t: 'artifactFrom', factionId: 'crownlands', rarity: 'legendary' },
        { t: 'followers', v: -12 },
        { t: 'heroThreat', v: 6 },
        { t: 'notoriety', v: 6 },
      ],
      resultText: 'You now know the name of the Chosen One’s grandmother. So does she.',
    },
    stockGate: [{ c: 'minFollowers', v: 12 }],
    declineLabel: 'Let him keep it',
    declineText: 'He looks relieved, which tells you what it would have cost you.',
  },
  {
    id: 'concordat_worm',
    factionId: 'worm_below',
    title: 'The Deep Shelf',
    body: 'The Worm Below has something it is willing to lend indefinitely. Indefinitely is its word. It uses the word carefully.',
    takeLabel: 'Accept the loan',
    price: {
      kind: 'certain',
      label: 'Accept the loan',
      effects: [
        { t: 'artifactFrom', factionId: 'worm_below', rarity: 'legendary' },
        { t: 'followers', v: -10 },
        { t: 'pactDebt', v: 2 },
        { t: 'notoriety', v: 10 },
      ],
      resultText: 'Ten of your household do not come back up. The ledger calls this interest.',
    },
    stockGate: [{ c: 'minFollowers', v: 10 }],
    declineLabel: 'Refuse the loan',
    declineText: 'It withdraws without comment. The shelf stays where you can think about it.',
  },
  {
    id: 'concordat_hand',
    factionId: 'gilded_hand',
    title: 'The Whole Estate',
    body: 'The Hand offers you the one item it swore, in writing, it would never sell. The price is not negotiable. It was never going to be negotiable — that was the tell.',
    takeLabel: 'Buy the Estate',
    price: {
      kind: 'certain',
      label: 'Buy the Estate',
      effects: [
        { t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'legendary' },
        { t: 'followers', v: -18 },
        { t: 'notoriety', v: 6 },
      ],
      resultText:
        'Eighteen of your household are logged as “liquidated,” a word the Hand spells correctly on purpose.',
    },
    stockGate: [{ c: 'minFollowers', v: 18 }],
    declineLabel: 'Let it stay unsold',
    declineText: 'The Hand records the refusal without visible reaction. It does not take refusals personally, which is somehow worse.',
  },
  {
    id: 'concordat_choir',
    factionId: 'verdant_choir',
    title: 'The Standing Grove',
    body: 'The Choir has voted, at length, to let you take the charter-tree. The vote records no dissent, which the Choir considers a formality rather than a fact.',
    takeLabel: 'Take the charter-tree',
    price: {
      kind: 'certain',
      label: 'Take the charter-tree',
      effects: [
        { t: 'artifactFrom', factionId: 'verdant_choir', rarity: 'legendary' },
        { t: 'lairTier', v: -1 },
        { t: 'followers', v: -10 },
        { t: 'notoriety', v: 6 },
      ],
      resultText: 'It is dug out roots and all. What it leaves behind is not level, and never will be again.',
    },
    stockGate: [{ c: 'minFollowers', v: 10 }, { c: 'minLairTier', v: 1 }],
    declineLabel: 'Leave the grove standing',
    declineText: 'The Choir says nothing. It has already begun growing around the space you would have made.',
  },
];

export const concordatOffers: Offer[] = CONCORDATS.map((c) => ({
  id: c.id,
  title: c.title,
  body: c.body,
  phase: 'any',
  factionId: c.factionId,
  scripted: true,
  // Devotion only: a faction that merely tolerates you does not open its
  // reliquary. This value must equal DEVOTION_STANDING in the engine (the same
  // threshold that upgrades a draw), so the two legendary routes agree on what
  // "devoted" means. Content cannot import the engine constant without breaking
  // the content/engine separation, so `scripts/validate-content.ts` asserts the
  // equality instead — a literal copy here would silently drift, as it did when
  // DEVOTION_STANDING moved from 55 to 50.
  // Devotion, AND whatever stock this particular card spends. `requires` is an
  // AND and options carry no gates of their own, so the two concatenate here.
  requires: [{ c: 'minStanding', factionId: c.factionId, v: 50 }, ...(c.stockGate ?? [])],
  weight: 3,
  options: [
    c.price,
    {
      kind: 'certain',
      label: c.declineLabel,
      effects: [{ t: 'standing', factionId: c.factionId, v: -5 }],
      resultText: c.declineText,
    },
  ],
}));
