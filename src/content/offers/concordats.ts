import type { Condition, FactionId, Offer } from '../../types';

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
 * `stockGate` exists for the same reason `oaths.ts`'s does (CLAUDE.md failure
 * mode 14): followers, apprentices and lair tier all floor or refuse to move
 * past their minimum, so a price naming one of them costs nothing to a wizard
 * who has none to give, while the fixed legendary still pays out in full.
 *
 * Five of the six carry one; the Covenant is repriced instead, for the reason
 * two paragraphs down. This comment used to say the original four priced the
 * relic "in pactDebt, notoriety or hero threat — currencies with no floor to
 * hide behind — and need no gate", and that was simply false of four of them:
 * the Covenant charges an apprentice, the Academy twelve followers, the
 * Crownlands thirty, the Worm twenty, and none of the four was gated (issue
 * #41). A wizard with an empty household collected the legendary for the
 * currencies that DO have no floor and paid nothing for the rest, while
 * `resultText` narrated the payment — "Twenty of your household do not come
 * back up. The ledger calls this interest." — to a household of nobody.
 *
 * That mattered more here than anywhere else it appeared: the concordats are
 * the game's only reliable legendary, and a legendary is what Ascension is
 * gated on. The wizard least able to afford one was buying it cheapest.
 *
 * Gating all six would have closed the door it was meant to make honest.
 * Failure mode 14's two rules only compose while a stock-free route survives:
 * every concordat priced in followers or apprentices now refuses a wizard who
 * has none, so with all six gated, a career that never built a household had
 * no route to a legendary at all and Ascension fell out of its band (measured:
 * 1.15% to 0.65%). The Covenant is repriced instead of gated — it deals in
 * signatures rather than coin, so it charges fame and the hero's attention,
 * neither of which has a floor to hide behind. It is the one concordat a
 * penniless wizard can still walk into, which is what keeps the ascent's top
 * rung reachable from the bottom.
 *
 * It charged pact debt too, at first, and that is worth recording because the
 * fix looked right and measured wrong. Debt is floorless, so it satisfies the
 * rule above — but every sim policy prices debt convexly against `PACT_LIMIT`
 * (see CLAUDE.md failure mode 5 on the ceiling-avoiders), so a legendary sold
 * for debt is one the entire instrument declines to buy. Ascension read
 * 0.85-1.05% with the debt in the price and 1.10-1.25% with the same relic
 * priced in fame and threat instead. A price no measurable player will pay is
 * not a price, it is a closed door with a sign on it.
 *
 * The Academy, Crownlands, Worm and Hand keep a stock price and a gate, but
 * the follower half came down (12/30/20/45 -> 8/12/10/24) with the difference
 * moved onto the floorless currency each faction actually deals in. The old
 * numbers were authored when roughly half of every follower cost was silently
 * never charged; gating made them real, and a price that doubled in practice
 * needed re-sizing rather than leaving to stand.
 */

type Concordat = {
  id: string;
  factionId: FactionId;
  title: string;
  body: string;
  takeLabel: string;
  /** What accepting costs, beyond the relic itself. */
  price: Offer['options'][number];
  /** The stock `price` spends beyond the relic, if any — see the note above. */
  stockGate?: Condition[];
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
        { t: 'notoriety', v: 10 },
        { t: 'heroThreat', v: 10 },
      ],
      resultText: 'You sign where indicated. You are not told which page, and you are not offered a copy.',
    },
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
        { t: 'followers', v: -8 },
      ],
      resultText: 'They give you a key, a shelf, and a form to fill in about the shelf.',
    },
    stockGate: [{ c: 'minFollowers', v: 8 }],
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
        { t: 'heroThreat', v: 12 },
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
        { t: 'pactDebt', v: 3 },
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
        { t: 'followers', v: -24 },
        { t: 'notoriety', v: 6 },
      ],
      resultText:
        'Twenty-four of your household are logged as “liquidated,” a word the Hand spells correctly on purpose.',
    },
    stockGate: [{ c: 'minFollowers', v: 24 }],
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
        { t: 'followers', v: -20 },
        { t: 'notoriety', v: 6 },
      ],
      resultText: 'It is dug out roots and all. What it leaves behind is not level, and never will be again.',
    },
    stockGate: [{ c: 'minLairTier', v: 1 }, { c: 'minFollowers', v: 20 }],
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
