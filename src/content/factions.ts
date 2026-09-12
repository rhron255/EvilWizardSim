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
 */
export const factions: Faction[] = [
  {
    id: 'ashen_covenant',
    name: 'The Ashen Covenant',
    blurb:
      'A demon-pact cult with a filing system. The Covenant does not tempt, threaten, or haggle; it presents terms, waits while you read them, and is genuinely wounded when you do not. Members burn their own names on joining, which makes the membership roll difficult and has never once impeded a collection.',
    demands:
      'Takes apprentices, one at a time, and never the one you would have offered. Pays in raw Notoriety and in pact debt, both immediately.',
    // Pale Academy only, not Crownlands — the reciprocal rivalry the two
    // grievance cards actually author (`grievances.ts`: the Academy burns the
    // Covenant's reliquary, the Covenant burns the Academy's register). It
    // used to list both, which made courting the Covenant hard to hold to a
    // crown: reaching `DEVOTION_STANDING + PATRON_MARGIN` needs a large net
    // climb, and `applyStanding` spills the FULL contagion rate onto every
    // entry independently, not divided between them — so a courtier_ashen_
    // covenant cohort spilled onto BOTH the Academy and the Crownlands hard
    // enough to seal one of them (`sealed_in_gem`/`exiled_and_overrun`) in
    // 53.5% of a 200-run cohort, before the wizard ever reached the age
    // limit. MEASURED: `contract_writer` read 0.00% across that whole cohort
    // — not rare, structurally unreachable. Trimming the Covenant's own card
    // magnitudes barely moved it (peak mean 42 -> 41), because the total net
    // climb a courtier needs is fixed by the threshold, not by how many cards
    // it takes to get there; the fix had to be directional, per this file's
    // sibling comment in `grievances.ts` on the reprisal side of the same
    // faction. The Crownlands keep their own half of the asymmetry — they
    // still list the Covenant in THEIR `hostileTo` below, the same one-way
    // shape this file already uses for the Choir and the Crownlands.
    hostileTo: ['pale_academy'],
    adjective: 'Covenant',
  },
  {
    id: 'gilded_hand',
    name: 'The Gilded Hand',
    blurb:
      'Relic merchants. The Hand holds no doctrine, worships nothing, and has no objection whatsoever to your plans provided the sum clears. It sells to every faction on this list, including the two currently at war with each other, and describes this as neutrality rather than as a business model.',
    demands:
      'Takes followers in payment — they are counted, not consulted. Sells artifacts at prices that are always fair and never good.',
    hostileTo: ['verdant_choir'],
    adjective: 'Gilded',
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
  },
  {
    id: 'crownlands',
    name: 'The Crownlands',
    blurb:
      'A functioning state, with a tax base, a standing army, and a hereditary program for the production of heroes. It is the only faction here that does paperwork about you rather than with you. Every prophecy in the province is issued from one office, on one form, in triplicate.',
    demands:
      'Takes compliance, in writing, on schedule. Grants tolerance — and sends the hero anyway, in time.',
    hostileTo: ['ashen_covenant', 'worm_below'],
    adjective: 'Crown',
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
  },
];
