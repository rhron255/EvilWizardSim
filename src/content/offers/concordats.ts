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
 * its reliquary. That is deliberate and matches the world bible: the four
 * legendaries live in the most mutually hostile corner of the faction web
 * (Covenant, Academy, Crownlands, Worm), and hostility is contagious, so
 * holding two means brokering a peace nobody else in the province has managed.
 * The rarity is legible rather than arbitrary — you can see why you missed.
 *
 * Each is a live decision, never a free relic: the certain branch charges a
 * real price in the currency that faction actually wants.
 */

type Concordat = {
  id: string;
  factionId: FactionId;
  title: string;
  body: string;
  takeLabel: string;
  /** What accepting costs, beyond the relic itself. */
  price: Offer['options'][number];
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
        { t: 'apprentices', v: -1 },
        { t: 'pactDebt', v: 1 },
        { t: 'notoriety', v: 8 },
      ],
      resultText: 'One apprentice signs where indicated. You are not told which page.',
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
        { t: 'followers', v: -12 },
      ],
      resultText: 'They give you a key, a shelf, and a form to fill in about the shelf.',
    },
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
        { t: 'followers', v: -30 },
        { t: 'heroThreat', v: 6 },
        { t: 'notoriety', v: 6 },
      ],
      resultText: 'You now know the name of the Chosen One’s grandmother. So does she.',
    },
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
        { t: 'followers', v: -20 },
        { t: 'pactDebt', v: 2 },
        { t: 'notoriety', v: 10 },
      ],
      resultText: 'Twenty of your household do not come back up. The ledger calls this interest.',
    },
    declineLabel: 'Refuse the loan',
    declineText: 'It withdraws without comment. The shelf stays where you can think about it.',
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
  requires: [{ c: 'minStanding', factionId: c.factionId, v: 50 }],
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
