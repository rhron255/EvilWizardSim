import type { FactionId, Offer } from '../../types';

/**
 * THE GRIEVANCES — one irrevocable act per faction, the mirror of the
 * concordats.
 *
 * These exist for the reason the concordats do: an ending was not reachable.
 * Issue #14 gave all six factions a reprisal, and the balance harness said
 * plainly that three of them — the Covenant's, the Hand's and the Worm's —
 * could not be reached by a player who spent an entire career trying. A cohort
 * that took the most damaging option available in every era it was offered one
 * drove its target to a mean low of −25, against a threshold of −55.
 *
 * The cause is structural, not a missing card here or there. The catalog lets
 * you COURT a faction deliberately and only lets you offend one by accident:
 * standing falls mostly by contagion, in fours and fives, on cards that name
 * somebody else — and `standingWeight` then surfaces the offended faction's own
 * cards LESS often, so the route down narrows as you walk it. The Crownlands
 * and the Academy were reachable only because half the catalog brushes against
 * them; the Gilded Hand has one enemy on the entire graph.
 *
 * Each is proposed by an ENEMY of the target, and is affiliated with that
 * enemy rather than with the target. That is not flavour: an offer belonging to
 * a faction you have already alienated is one the sampler has stopped showing
 * you, so a grievance filed under its own target would be a route that closes
 * exactly as you begin to need it. `validate-content.ts` pins the direction.
 *
 * ## Why there is exactly ONE card per faction, and why it is gated late
 *
 * The first version was a ladder: a small `any`-phase breach at fame 30, then
 * this. It read better and it cost Ascension two thirds of its rate — 1.65%
 * down to 0.45%, through a wiki-authored 1-4% band. Two measured reasons, both
 * about a card that was cheap and available to everybody:
 *
 *   - it competed with the concordats, which are the game's only reliable
 *     legendary, and the ascendant cohort's "ever held a legendary" fell from
 *     10.2% to 6.2%;
 *   - and every policy took it, because a bot pays nothing for standing with a
 *     faction it was not using. Faction reprisals went from 18% of careers to
 *     over 30%, which is the seal's whole share doubled by content rather than
 *     by the mechanic the issue was about.
 *
 * So: one card, gated on the relationship ALREADY being cold, decline only.
 * A wizard who has not fallen out with anybody never sees it, and a wizard
 * courting the Covenant for its legendary is not offered a chance to burn it.
 * The single card is large enough to span the rest of the distance on its own
 * (−20 to −55), which is what the ladder was for.
 *
 * It pays FAME as well as costing standing, which is the other half of the
 * trigger and was the other half of the measured failure: the cohort that
 * reached −55 was too obscure to be worth acting on in four runs out of five.
 * Nothing here charges a stock that can be clamped to nothing (CLAUDE.md
 * failure mode 14) — the price is a permanent enemy and a hero who has heard
 * about you.
 *
 * ## What this does NOT fix, and where the fix belongs
 *
 * `liquidated` is still the rarest ending in the game: a cohort that spends
 * every era it can antagonising the Gilded Hand reaches it about once in a
 * hundred careers, against three to ten for the others. The card is not the
 * problem — when it is eligible it takes 18% of the draw, the loudest card in
 * the pool. It is rarely ELIGIBLE, because a career arrives at the decline
 * with the Hand still near zero.
 *
 * The obvious explanation is wrong and was written here before it was counted.
 * It is NOT the offer skew issue #14 lists on its watch list: the Ashen
 * Covenant has twice the Hand's cards and is nearly as unreachable (3.5%),
 * while the Choir has the same single hater and about the same card count and
 * is ten times more reachable. `qa/probe-standing-routes.ts` measures what
 * actually differs — the DIRECTION of the authored standing effects:
 *
 *   faction         down     up   up/down   reprisal reached
 *   crownlands       874    315      0.36   46%
 *   verdant_choir    381    288      0.75   10.5%
 *   ashen_covenant   503    602      1.20   3.5%
 *   gilded_hand      269    254      0.94   1.0%
 *
 * The Covenant's cards push its standing UP — the pact economy pays in
 * Covenant goodwill — and the Hand simply has the least standing movement of
 * any faction in the catalog, in either direction. Since −55 is a tail event,
 * a thirty per cent shortfall in available pressure becomes a tenfold
 * difference in rate.
 *
 * That is not fixable from this file: not by a per-faction gate (tried, moved
 * the rate by nothing) and not by a card big enough to be a button. It is
 * fixable by authoring, and the fix is directional rather than numerical —
 * Gilded cards that can cost you the Hand, and Covenant cards that are not
 * another way to earn its goodwill. Slice 2 adds per-faction content and
 * slice 4 gives the Hand a legendary; run the probe again then.
 */

type Rung = {
  label: string;
  /** What it does to the target's standing. Negative, and the point of the card. */
  damage: number;
  notoriety: number;
  heroThreat: number;
  resultText: string;
  declineLabel: string;
  declineText: string;
  title: string;
  body: string;
};

type Grievance = {
  /** The faction this ruins. The offers are NOT affiliated with it. */
  targetId: FactionId;
  /** Whose cards these are: a faction `factions.ts` marks hostile to the target. */
  factionId: FactionId;
  act: Rung;
};

/**
 * Where the card becomes available: the relationship is already cold.
 *
 * −20 is the value `allegiances.ts` starts calling a relationship cold at, so
 * the card arrives exactly when the player can already see that bar has turned.
 * It is also what keeps this out of an ordinary career — you have to have
 * fallen out with somebody first — and out of the way of a wizard courting that
 * same faction for its reliquary.
 *
 * A content literal on purpose: no engine constant owns it, and inventing one
 * to import would be a threshold with no provenance (CLAUDE.md failure mode 6).
 * `validate-content.ts` pins the SHAPE — an enemy's card, real damage, and any
 * standing gate pointed at the faction being ruined — and leaves the magnitude
 * to measurement.
 */
const FEUD_GATE = -20;

const GRIEVANCES: Grievance[] = [
  {
    targetId: 'ashen_covenant',
    factionId: 'pale_academy',
    act: {
      title: 'The Unattended Brazier',
      body: 'The Academy would like the Covenant’s western reliquary to have an accident. They have brought a diagram, a schedule, and no signatures whatsoever.',
      label: 'Attend to the brazier',
      damage: -35,
      notoriety: 10,
      heroThreat: 6,
      resultText: 'The Covenant loses four rooms and one clerk, and opens a file with your name at the top.',
      declineLabel: 'Leave the diagram unread',
      declineText: 'They take the diagram back. It was, you notice on the way out, a copy.',
    },
  },
  {
    targetId: 'gilded_hand',
    factionId: 'verdant_choir',
    act: {
      title: 'The Called Quarter',
      body: 'Every note the Hand holds in the province passes through one strongroom on one night of the quarter. The Choir has the night. You have the province’s attention.',
      label: 'Call the whole quarter in',
      damage: -35,
      notoriety: 10,
      heroThreat: 6,
      resultText: 'Three houses fail before morning. The Hand reprices everything, beginning with you.',
      declineLabel: 'Let the quarter close quietly',
      declineText: 'The Choir goes back to waiting, which it does considerably better than you do.',
    },
  },
  {
    targetId: 'pale_academy',
    factionId: 'ashen_covenant',
    act: {
      title: 'The Burned Register',
      body: 'The Covenant offers you the Academy’s register of living alumni, and a fire that the season can be blamed for.',
      label: 'Burn the register',
      damage: -35,
      notoriety: 10,
      heroThreat: 6,
      resultText: 'Two centuries of names go in a night. They rebuild it from memory, beginning with yours.',
      declineLabel: 'Return the register',
      declineText: 'The Covenant returns it to the Academy itself, with a short note about you.',
    },
  },
  {
    targetId: 'verdant_choir',
    factionId: 'gilded_hand',
    act: {
      title: 'The Salted Valley',
      body: 'The Hand will fund a season of salt and lime across the whole valley floor, and asks only that the work be done thoroughly.',
      label: 'Salt the valley',
      damage: -35,
      notoriety: 10,
      heroThreat: 6,
      resultText: 'Nothing grows there for eleven years. The Choir counts every single one of them.',
      declineLabel: 'Leave the valley alone',
      declineText: 'The Hand notes the shortfall. The valley never learns how close it came.',
    },
  },
  {
    targetId: 'crownlands',
    factionId: 'verdant_choir',
    act: {
      title: 'The Broken Assize',
      body: 'The Choir will hold the road while the circuit judge is on it. What becomes of the assize afterwards is a matter for you.',
      label: 'Send the judge home on foot',
      damage: -35,
      notoriety: 10,
      heroThreat: 6,
      resultText: 'He walks eighty miles and files the whole circuit from memory, including you.',
      declineLabel: 'Let the circuit pass',
      declineText: 'The assize sits, fines four villages for the state of their road, and moves on.',
    },
  },
  {
    targetId: 'worm_below',
    factionId: 'crownlands',
    act: {
      title: 'The Poured Foundation',
      body: 'The Crownlands will pay to stop the deep galleries with rubble, and want a wizard on site to certify that it can be done safely.',
      label: 'Certify the works',
      damage: -35,
      notoriety: 10,
      heroThreat: 6,
      resultText: 'Six miles of gallery are stopped. Something on the far side of it begins keeping time.',
      declineLabel: 'Certify nothing of the sort',
      declineText: 'The engineer writes "inconclusive", and the galleries stay exactly as open as they were.',
    },
  },
];

function offerFor(g: Grievance): Offer {
  const rung = g.act;
  return {
    id: `grievance_${g.targetId}`,
    title: rung.title,
    body: rung.body,
    // Decline only. This is the card that finishes a relationship, and it is
    // the phase five of the six reprisals can fire in at all.
    phase: 'decline',
    factionId: g.factionId,
    // A set piece, and weighted like one: by the time the gate opens a career
    // has few eras left, and a set piece that loses the draw to a texture card
    // is a set piece nobody sees. Measured, like the lich rite's weight before
    // it — at 1 the cohort that wanted this saw it in a fifth of its runs.
    scripted: true,
    requires: [{ c: 'maxStanding', factionId: g.targetId, v: FEUD_GATE }],
    weight: 4,
    options: [
      {
        kind: 'certain',
        label: rung.label,
        effects: [
          { t: 'standing', factionId: g.targetId, v: rung.damage },
          { t: 'notoriety', v: rung.notoriety },
          // A permanent enemy is a famous act, and famous acts fund heroes.
          { t: 'heroThreat', v: rung.heroThreat },
        ],
        resultText: rung.resultText,
      },
      {
        kind: 'certain',
        label: rung.declineLabel,
        effects: [
          { t: 'standing', factionId: g.targetId, v: 4 },
          { t: 'standing', factionId: g.factionId, v: -4 },
        ],
        resultText: rung.declineText,
      },
    ],
  };
}

export const grievanceOffers: Offer[] = GRIEVANCES.map(offerFor);
