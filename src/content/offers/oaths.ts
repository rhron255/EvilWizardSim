import type { Condition, FactionId, Offer } from '../../types';

/**
 * THE OATHS — one per faction, the deliberate route to a crown (issue #14
 * slice 2b, issue #20).
 *
 * `leadershipEnding` reads standing at the age limit: whichever faction sits
 * furthest ahead of its nearest rival, by `PATRON_MARGIN`, gets its wizard.
 * Without a card that spends something REAL to widen that gap on purpose, a
 * crown is something a career arrives at by the accumulated accident of
 * which offers it happened to be shown — the same complaint the concordats
 * and grievances exist to answer for the reliquary and the reprisals. This is
 * their mirror for the fifth ending set: a wizard who wants a particular
 * faction's crown gets one card that says so and pays for it.
 *
 * Same devotion gate the reliquary uses (`DEVOTION_STANDING`), so "devoted
 * enough to swear an oath" means the same thing everywhere in the game. The
 * gate cannot fire before `MIN_OATH_ERA`: reaching 50 standing in the first
 * few eras is already vanishingly rare, but the card is a career-defining
 * commitment and should read as the payoff of a courtship already under way,
 * not a first-era fluke.
 *
 * Each price is a REAL cost, gated on the stock it spends (CLAUDE.md failure
 * mode 14) — a wizard without the stock does not see the option's fixed
 * benefit for free, because the offer itself is unreachable without it.
 *
 * `worm_below` has none. Its crown is `lichdom`, already earned by the rite
 * — a card the player accepted, not a standing total — and an oath that
 * pushed Worm standing past `DEVOTION_STANDING` on its own would let a wizard
 * who never took the rite land on an ending whose narration describes taking
 * it. Five ids, five oaths, matching `LEADERSHIP_BY_FACTION`'s five
 * standing-earned crowns.
 */

const MIN_OATH_ERA = 4;

type Oath = {
  id: string;
  factionId: FactionId;
  title: string;
  body: string;
  takeLabel: string;
  /** What accepting costs, beyond the standing itself. */
  price: Offer['options'][number];
  /**
   * The stock `price` spends, gated so the offer never shows a fixed benefit
   * to a wizard who cannot pay for it (CLAUDE.md failure mode 14) — followers
   * and apprentices both floor at zero, so an ungated cost lands as a free
   * crown-shaped gain for whoever has none to give.
   */
  stockGate: Condition;
  declineLabel: string;
  declineText: string;
};

const OATHS: Oath[] = [
  {
    id: 'oath_ashen_covenant',
    factionId: 'ashen_covenant',
    title: 'The Witnessed Clause',
    body: 'The Covenant has drawn up a final page. It does not replace any earlier contract; it sits above all of them, and it asks for a witness rather than a signature.',
    takeLabel: 'Provide the witness',
    price: {
      kind: 'certain',
      label: 'Provide the witness',
      effects: [
        { t: 'apprentices', v: -1 },
        { t: 'standing', factionId: 'ashen_covenant', v: 18 },
        { t: 'heroThreat', v: 6 },
      ],
      resultText: 'One apprentice steps forward to witness and does not step back. The Covenant files the page as final.',
    },
    stockGate: { c: 'minApprentices', v: 1 },
    declineLabel: 'Decline to provide one',
    declineText: 'The Covenant does not ask twice. It simply notes that nobody was willing.',
  },
  {
    id: 'oath_gilded_hand',
    factionId: 'gilded_hand',
    title: 'The Standing Account',
    body: 'The Hand offers you an account with no ledger entries, no interest, and no end date — provided the opening deposit clears today, in full, from the household.',
    takeLabel: 'Open the account',
    price: {
      kind: 'certain',
      label: 'Open the account',
      effects: [
        { t: 'followers', v: -30 },
        { t: 'standing', factionId: 'gilded_hand', v: 18 },
        { t: 'heroThreat', v: 6 },
      ],
      resultText: 'Thirty of your household take positions with the Hand instead. The account opens exactly on schedule.',
    },
    stockGate: { c: 'minFollowers', v: 30 },
    declineLabel: 'Leave the account unopened',
    declineText: 'The Hand marks the offer expired and moves on to the next client, unbothered.',
  },
  {
    id: 'oath_pale_academy',
    factionId: 'pale_academy',
    title: 'The Endowed Chair',
    body: 'The Academy will endow a chair in your name, on the condition that the endowment is funded before the vote — by you, and by nobody the Academy would have to thank instead.',
    takeLabel: 'Fund the endowment',
    price: {
      kind: 'certain',
      label: 'Fund the endowment',
      effects: [
        { t: 'followers', v: -25 },
        { t: 'standing', factionId: 'pale_academy', v: 18 },
        { t: 'heroThreat', v: 6 },
      ],
      resultText: 'Twenty-five of your household are reassigned to groundskeeping in perpetuity. The chair is funded, and named.',
    },
    stockGate: { c: 'minFollowers', v: 25 },
    declineLabel: 'Let someone else fund it',
    declineText: 'Someone else funds it. The chair is named after them, correctly.',
  },
  {
    id: 'oath_verdant_choir',
    factionId: 'verdant_choir',
    title: 'The Given Ground',
    body: 'The Choir will consider you rooted rather than passing through, if a piece of what you hold is allowed to go back to seed and never be reclaimed.',
    takeLabel: 'Give the ground back',
    price: {
      kind: 'certain',
      label: 'Give the ground back',
      effects: [
        { t: 'lairTier', v: -1 },
        { t: 'standing', factionId: 'verdant_choir', v: 18 },
        { t: 'heroThreat', v: 6 },
      ],
      resultText: 'A wing of your lair goes back to the wood inside a season. The Choir calls this progress.',
    },
    stockGate: { c: 'minLairTier', v: 1 },
    declineLabel: 'Keep the ground',
    declineText: 'The Choir says nothing about it, which from the Choir is not agreement.',
  },
  {
    id: 'oath_crownlands',
    factionId: 'crownlands',
    title: 'The Filed Allegiance',
    body: 'The Crownlands clerk has a form for this, unsurprisingly, and it requires one member of your household to be seconded to the civil service for the duration of your career.',
    takeLabel: 'Second the apprentice',
    price: {
      kind: 'certain',
      label: 'Second the apprentice',
      effects: [
        { t: 'apprentices', v: -1 },
        { t: 'standing', factionId: 'crownlands', v: 18 },
        { t: 'heroThreat', v: 6 },
      ],
      resultText: 'One apprentice reports to a ministry you have never heard of. The filing is, the clerk assures you, permanent.',
    },
    stockGate: { c: 'minApprentices', v: 1 },
    declineLabel: 'Decline the secondment',
    declineText: 'The clerk refiles the form under a different heading and does not raise it again.',
  },
];

export const oathOffers: Offer[] = OATHS.map((o) => ({
  id: o.id,
  title: o.title,
  body: o.body,
  phase: 'any',
  factionId: o.factionId,
  scripted: true,
  // Devotion, same as the reliquary, plus a floor that keeps a lucky opening
  // run from swearing an oath before any courtship has actually happened.
  // The devotion value must equal DEVOTION_STANDING (the same threshold the
  // engine uses to upgrade a draw and the reliquary uses to open) — content
  // cannot import the engine constant without coupling the bundle to the
  // engine, so scripts/validate-content.ts asserts the equality instead.
  requires: [
    { c: 'minStanding', factionId: o.factionId, v: 50 },
    { c: 'minEraIndex', v: MIN_OATH_ERA },
    o.stockGate,
  ],
  weight: 3,
  options: [
    o.price,
    {
      kind: 'certain',
      label: o.declineLabel,
      effects: [{ t: 'standing', factionId: o.factionId, v: -5 }],
      resultText: o.declineText,
    },
  ],
}));
