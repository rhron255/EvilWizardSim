import type { Faction } from '../types';

/**
 * The fixed recurring cast. The same six every run — see
 * `wiki/06_reference_analysis.md`: recognition has to accrue by run five,
 * because invented factions carry none of it on run one.
 *
 * `hostileTo` is deliberately ASYMMETRIC. The Verdant Choir considers the
 * Crownlands an enemy; the Crownlands consider the Choir a weather pattern.
 * Asymmetry is what turns standing into a committed path instead of a
 * shopping trip.
 *
 * ## This list is a balance surface, not just flavour
 *
 * `applyStanding` spends the FULL contagion rate on EVERY entry independently
 * — two enemies means two full doses, not half each — so an edge here is
 * worth more than most content. Each faction sits between two pressures, and
 * they pull opposite ways:
 *
 *   - **Who a faction HATES** decides the collateral its own courtier
 *     inflicts. A wizard climbing to `DEVOTION_STANDING + PATRON_MARGIN`
 *     drags every name on that faction's list down with them, and is also
 *     paid by `spiteOf`'s mirror to drag them down ON PURPOSE, because
 *     lowering a hater spills goodwill back. Point that at a fragile faction
 *     and the courtier is sealed by somebody else's reprisal before the age
 *     limit — their own crown is then unreachable, not merely rare.
 *   - **Who hates a faction** decides the routes DOWN to `SEAL_MAX_STANDING`,
 *     which is what its own reprisal needs. Too few, and the faction hovers
 *     near zero for a whole career and its reprisal is dead content.
 *
 * So a faction needs enough haters to be KILLABLE, and its own list has to
 * avoid the fragile ones to stay COURTABLE. Fragility is measured, not
 * guessed, and the number that measures it is the POPULATION reprisal share
 * in `npm run sim` — how often an ordinary career already ends on that
 * faction, with nobody trying. The Academy (~18%) and the Crownlands (~10%)
 * are where careers end by default; the Choir is ~5%, and the Hand (~1%),
 * the Covenant (~0.2%) and the Worm (~0%) are the resilient corner. Point a
 * courtier's collateral at the first group and you have taken their crown
 * away. `qa/probe-standing-routes.ts` explains WHY a faction sits where it
 * does, but it is the upstream diagnosis, not the fragility measure itself.
 *
 * Two endings were unreachable in this graph, and each was fixed by moving a
 * single edge. Both were measured with dedicated 200-run cohorts on four
 * seeds before and after — `npm run sim`, the FACTION REPRISALS and FACTION
 * LEADERSHIP tables:
 *
 *   - `contract_writer` (Covenant crown) read 0.50-1.00% because the
 *     Covenant's two haters were the Crownlands and the Academy — the two
 *     most fragile — so roughly HALF of a `courtier_ashen_covenant` cohort
 *     ended on `exiled_and_overrun` or `sealed_in_gem` before the age limit.
 *     Dropping the Covenant from the Crownlands' list took it to 2.5-4.5%.
 *     Note the tell, because it is the whole diagnosis in one number: the
 *     cohort's PEAK Covenant standing FELL (42 -> 31-34) while the crown
 *     rate rose sixfold. That peak had been bought by tanking the Crown, and
 *     it was paid for with the career.
 *   - `liquidated` (Hand reprisal) read 1.00-2.00% because the Hand had one
 *     hater and the least standing movement in the catalog — a cohort trying
 *     its hardest got the Hand to a mean low of −15, against a −55 threshold,
 *     so `grievance_gilded_hand` (gated at −20, and worth −35 on its own)
 *     almost never became eligible. Adding the Hand to the COVENANT'S list
 *     gave it a second hater with the largest up-volume in the game to spill:
 *     mean low −15 -> −26, the grievance's eligibility roughly doubled, and
 *     the ending reads 2.5-5.0%. The Hand's up/down went 0.95 -> 0.70, into
 *     the band the Choir already converts from.
 *
 * ## Why that second rivalry is one-way, which is not a flavour decision
 *
 * The obvious next edge is the reciprocal — the Hand resenting the Covenant
 * back. It was tried, and it is measurably wrong. It lifts all three faction
 * endings further (`liquidated` to 4-5%), and it drops ASCENSION to 0.95%,
 * under the wiki-authored 1-4% floor. The route is `DEVOTION_STANDING`: at
 * +50 a faction's reliquary yields its LEGENDARY, which is the only reliable
 * source of the one `ASCENSION_LEGENDARIES` asks for, and the Covenant's
 * up-biased economy is what carries most careers to +50. A second hater
 * drains that ratchet, and Ascension is downstream of it.
 *
 * So the Covenant's up/down stays at 1.13 rather than being flattened to
 * ~0.99. `grievances.ts` asks for the opposite ("Covenant cards that are not
 * another way to earn its goodwill") and it is half right: the ratchet is
 * what made the Covenant's own reprisal hard, but it is also load-bearing for
 * Ascension, so it cannot simply be removed. The Covenant's reprisal was
 * fixed on the OTHER conjunct instead — fame, in `offers/pacts.ts` — which is
 * why that ending now converts at 1.0-4.5% on an up-biased economy.
 */
export const factions: Faction[] = [
  {
    id: 'ashen_covenant',
    name: 'The Ashen Covenant',
    blurb:
      'A demon-pact cult with a filing system. The Covenant does not tempt, threaten, or haggle; it presents terms, waits while you read them, and is genuinely wounded when you do not. Members burn their own names on joining, which makes the membership roll difficult and has never once impeded a collection.',
    demands:
      'Takes apprentices, one at a time, and never the one you would have offered. Pays in raw Notoriety and in pact debt, both immediately.',
    // The Academy, whose register it burns and who burns its reliquary back
    // (`grievances.ts` authors both halves). And the Hand: two ledgers after
    // the same debtors, and the Covenant's whole pitch is a debt you cannot
    // buy your way out of. Deliberately NOT the Crownlands — see the header.
    hostileTo: ['pale_academy', 'gilded_hand'],
    adjective: 'Covenant',
    reliquary: 'Its relics pay you for what you owe.',
  },
  {
    id: 'gilded_hand',
    name: 'The Gilded Hand',
    blurb:
      'Relic merchants. The Hand holds no doctrine, worships nothing, and has no objection whatsoever to your plans provided the sum clears. It sells to every faction on this list, including the two currently at war with each other, and describes this as neutrality rather than as a business model.',
    demands:
      'Takes followers in payment — they are counted, not consulted. Sells artifacts at prices that are always fair and never good.',
    // The Choir, who object to what it does to a valley — and nobody else.
    // The Covenant's grudge against the Hand above is deliberately NOT
    // returned: the Hand is a business and does not hold opinions it cannot
    // bill for. That asymmetry is also load-bearing (see the header: the
    // reciprocal edge costs Ascension its floor).
    hostileTo: ['verdant_choir'],
    adjective: 'Gilded',
    reliquary: 'Its relics make good on the difference, whenever there is one.',
  },
  {
    id: 'pale_academy',
    name: 'The Pale Academy',
    blurb:
      'Institutional wizardry, and in all likelihood your alma mater. The Academy holds that evil is a methodological failure rather than a moral one, and that most of it could have been avoided with better sourcing. It will shelter you, fund you, and cite you. The citation is the part that costs.',
    demands:
      'Takes reputation — specifically, your standing with everyone it disapproves of. Grants legitimacy, shelter, and a great deal of reading.',
    hostileTo: ['ashen_covenant', 'worm_below'],
    adjective: 'Academy',
    reliquary: 'Its relics have the last word, and it costs whoever argues next.',
  },
  {
    id: 'verdant_choir',
    name: 'The Verdant Choir',
    blurb:
      'Druids, in the sense that a landslide is a form of civil engineering. The Choir holds that every structure is a temporary misunderstanding and that its own role is to be patient about it. All decisions are taken by consensus, which is why they take eleven years and are never appealed.',
    demands:
      'Takes territory, and vetoes expansion of your lair. Grants only what grows back.',
    hostileTo: ['gilded_hand', 'pale_academy', 'crownlands'],
    adjective: 'Verdant',
    reliquary: 'Its relics keep making your case to it, long after you stop asking.',
  },
  {
    id: 'crownlands',
    name: 'The Crownlands',
    blurb:
      'A functioning state, with a tax base, a standing army, and a hereditary program for the production of heroes. It is the only faction here that does paperwork about you rather than with you. Every prophecy in the province is issued from one office, on one form, in triplicate.',
    demands:
      'Takes compliance, in writing, on schedule. Grants tolerance — and sends the hero anyway, in time.',
    // The Worm, which is a subsidence problem with opinions. The Covenant
    // used to be on this list; it came off so the Covenant's own crown could
    // exist at all (see the header). The state still does not approve of the
    // cult — it simply files about it rather than moving against it, which is
    // the most Crownlands possible way to hold a grudge.
    hostileTo: ['worm_below'],
    adjective: 'Crown',
    reliquary: 'Its relics are paperwork with teeth, filed on your behalf.',
  },
  {
    id: 'worm_below',
    name: 'The Worm Below',
    blurb:
      'Something enormous underneath the province, and the people who bring it things. The Worm keeps no enemies and holds no grudges; it regards every faction on this list as scheduled rather than opposed. Its single recorded complaint is with the Pale Academy, for writing it down.',
    demands:
      'Takes everything, in an order of its own choosing. Grants depth, and the only road to lichdom.',
    hostileTo: ['pale_academy'],
    adjective: 'Worm',
    reliquary: 'Its relics are patient, and do not need you to notice them working.',
  },
];
