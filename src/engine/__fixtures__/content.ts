/**
 * SYNTHETIC CONTENT — engine test fixture only.
 *
 * This is NOT the game's content catalog. `src/content/` is authored
 * separately; the engine never imports it, and this bundle exists so the
 * engine, its tests, and `scripts/simulate.ts` are fully decoupled from that
 * work.
 *
 * It is built to be *economically representative* rather than funny: ~70
 * offers spanning both phases, six factions with real hostility edges, 30
 * artifacts at the wiki's 16/10/4 rarity mix, and four legendary prizes gated
 * behind deliberate faction courtship. The balance constants in
 * `constants.ts` are tuned against this bundle, so its magnitudes double as a
 * de-facto spec for what the real catalog's magnitudes should look like:
 *
 *   - a good ascent choice is worth roughly +5 to +14 Notoriety
 *   - courting a faction moves standing +14 to +26 per offer, so the +25
 *     pledge gate takes two deliberate steps and the relic gates take one
 *   - a decline-phase defensive option buys back roughly HALF an era of hero
 *     threat (-8), a successful gamble roughly one and a half (-17). Defense
 *     delays the chosen one; it must never cancel him.
 *   - legendary prizes are gated on FAME (Notoriety 55+) plus a little
 *     standing, not on standing alone — gating them on courtship alone made
 *     Ascension mathematically unreachable, since courting and headline-
 *     chasing compete for the same eras.
 *
 * Everything here is deterministic — no ambient randomness at module load, so
 * two processes always see the identical bundle.
 */

import type {
  Artifact,
  Effect,
  Ending,
  Faction,
  FactionId,
  Lair,
  Offer,
  OfferOption,
  Origin,
  Rarity,
} from '../../types';
import type { ContentBundle, Epithet } from '../content-port';

// ---------------------------------------------------------------------------
// Factions
// ---------------------------------------------------------------------------

export const fixtureFactions: Faction[] = [
  {
    id: 'ashen_covenant',
    name: 'The Ashen Covenant',
    blurb: 'A demon-pact cult with excellent robes and poor boundaries.',
    demands: 'Apprentices. They are never returned.',
    hostileTo: ['pale_academy', 'crownlands'],
    adjective: 'ashen',
  },
  {
    id: 'gilded_hand',
    name: 'The Gilded Hand',
    blurb: 'Relic merchants. Everything has a price and the price is followers.',
    demands: 'Followers, paid up front, non-refundable.',
    hostileTo: ['verdant_choir'],
    adjective: 'gilded',
  },
  {
    id: 'pale_academy',
    name: 'The Pale Academy',
    blurb: 'Institutional wizardry. Your alma mater. They remember the incident.',
    demands: 'Reputation, and a signature on a form.',
    hostileTo: ['ashen_covenant', 'worm_below'],
    adjective: 'pale',
  },
  {
    id: 'verdant_choir',
    name: 'The Verdant Choir',
    blurb: 'Druids who sing at your tower until the mortar loosens.',
    demands: 'Territory. All of it, ideally.',
    hostileTo: ['gilded_hand', 'crownlands'],
    adjective: 'verdant',
  },
  {
    id: 'crownlands',
    name: 'The Crownlands',
    blurb: 'A state with a budget for heroes and a filing system for wizards.',
    demands: 'Taxes, deference, and eventually your head.',
    hostileTo: ['ashen_covenant', 'worm_below', 'verdant_choir'],
    adjective: 'crowned',
  },
  {
    id: 'worm_below',
    name: 'The Worm Below',
    blurb: 'Subterranean, patient, and extremely interested in your skeleton.',
    demands: 'Everything, in instalments.',
    hostileTo: ['pale_academy', 'crownlands'],
    adjective: 'wormish',
  },
];

// ---------------------------------------------------------------------------
// Artifacts — 16 common / 10 rare / 4 legendary, per wiki/02
// ---------------------------------------------------------------------------

const DEFENSE_BY_RARITY: Record<Rarity, number> = { common: 3, rare: 7, legendary: 13 };

/** [factionId, [commonCount, rareCount, legendaryCount]] */
const ARTIFACT_PLAN: Array<[FactionId, [number, number, number]]> = [
  ['ashen_covenant', [3, 1, 1]],
  ['gilded_hand', [3, 1, 1]],
  ['pale_academy', [3, 1, 1]],
  ['verdant_choir', [3, 2, 0]],
  ['crownlands', [2, 3, 0]],
  ['worm_below', [2, 2, 1]],
];

const ARTIFACT_NOUNS = ['Crown', 'Sigil', 'Ledger', 'Lantern', 'Key', 'Tooth', 'Mirror', 'Chain'];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function romanize(n: number): string {
  return ['I', 'II', 'III', 'IV', 'V', 'VI'][n - 1] ?? String(n);
}

function buildArtifacts(): Artifact[] {
  const out: Artifact[] = [];
  for (const [factionId, counts] of ARTIFACT_PLAN) {
    const rarities: Rarity[] = [
      ...Array<Rarity>(counts[0]).fill('common'),
      ...Array<Rarity>(counts[1]).fill('rare'),
      ...Array<Rarity>(counts[2]).fill('legendary'),
    ];
    const faction = fixtureFactions.find((f) => f.id === factionId)!;
    rarities.forEach((rarity, i) => {
      const noun = ARTIFACT_NOUNS[(out.length + i) % ARTIFACT_NOUNS.length];
      out.push({
        id: `${factionId}_${rarity}_${i}`,
        name: `${capitalize(faction.adjective)} ${noun} ${romanize(i + 1)}`,
        factionId,
        rarity,
        effect: `+${DEFENSE_BY_RARITY[rarity]} defense against the chosen one.`,
        flavorText: 'It hums when the wrong people are nearby.',
        defense: DEFENSE_BY_RARITY[rarity],
      });
    });
  }
  return out;
}

export const fixtureArtifacts: Artifact[] = buildArtifacts();

/** The four Ascension gates. */
export const fixtureLegendaryIds: string[] = fixtureArtifacts
  .filter((a) => a.rarity === 'legendary')
  .map((a) => a.id);

// ---------------------------------------------------------------------------
// Lairs — the ladder
// ---------------------------------------------------------------------------

export const fixtureLairs: Lair[] = [
  { id: 'lair_bog', name: 'A Damp Bog', tier: 0, blurb: 'Rent-free. Smells like it.' },
  { id: 'lair_shack', name: 'The Crooked Shack', tier: 1, blurb: 'Structurally opinionated.' },
  { id: 'lair_tower', name: 'The Leaning Tower', tier: 2, blurb: 'Nine floors, four of them safe.' },
  { id: 'lair_keep', name: 'Blackmoor Keep', tier: 3, blurb: 'Comes with a moat and a grudge.' },
  { id: 'lair_citadel', name: 'The Obsidian Citadel', tier: 4, blurb: 'Visible from three counties.' },
  { id: 'lair_spire', name: 'The Screaming Spire', tier: 5, blurb: 'It does scream. Constantly.' },
];

// ---------------------------------------------------------------------------
// Origins
// ---------------------------------------------------------------------------

export const fixtureOrigins: Origin[] = [
  {
    id: 'expelled',
    name: 'Expelled from the Pale Academy',
    blurb: 'They kept the tuition. You kept the library key.',
    effects: [
      { t: 'notoriety', v: 4 },
      { t: 'standing', factionId: 'pale_academy', v: -20 },
    ],
  },
  {
    id: 'bog_taught',
    name: 'Self-Taught in a Bog',
    blurb: 'No credentials, no debts, no shoes.',
    effects: [
      { t: 'followers', v: 5 },
      { t: 'standing', factionId: 'verdant_choir', v: 15 },
    ],
  },
  {
    id: 'inherited',
    name: 'Inherited a Tower and Its Debts',
    blurb: 'The tower is nice. The debts are structural.',
    effects: [
      { t: 'lairTier', v: 2 },
      { t: 'pactDebt', v: 1 },
      { t: 'standing', factionId: 'gilded_hand', v: 10 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Endings — all seven
// ---------------------------------------------------------------------------

export const fixtureEndings: Ending[] = [
  {
    id: 'slain_by_chosen_one',
    name: 'Slain by the Chosen One',
    narration:
      'A farmhand with a prophecy and a borrowed sword ended a long career in an afternoon.',
    summary: 'Killed by a teenager with narrative momentum.',
    rarity: 'common',
  },
  {
    id: 'sealed_in_gem',
    name: 'Sealed in a Gem',
    narration: 'The Academy voted. The vote was to put you in a stone and change the subject.',
    summary: 'Filed away by your alma mater.',
    rarity: 'rare',
  },
  {
    id: 'betrayed_by_apprentice',
    name: 'Betrayed by an Apprentice',
    narration: 'You taught them everything. They took notes on the parts about your weaknesses.',
    summary: 'Undone by your own curriculum.',
    rarity: 'rare',
  },
  {
    id: 'lichdom',
    name: 'Lichdom',
    narration: 'You gave up everything you owned and everyone who followed you, and kept going.',
    summary: 'Traded a life for an afterlife.',
    rarity: 'rare',
  },
  {
    id: 'retired_to_swamp',
    name: 'Retired to a Swamp',
    narration: 'You stopped. The swamp is quiet. Nobody writes.',
    summary: 'Made it to the end. Nothing tried to stop you.',
    rarity: 'common',
  },
  {
    id: 'consumed_by_pact',
    name: 'Consumed by the Pact',
    narration: 'The instalments came due all at once, as instalments do.',
    summary: 'The bill arrived.',
    rarity: 'rare',
  },
  {
    id: 'ascension',
    name: 'Ascension',
    narration: 'You stepped out of the story before it could finish you.',
    summary: 'Left the world by the front door.',
    rarity: 'legendary',
  },
];

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

const ALL_FACTION_IDS: FactionId[] = fixtureFactions.map((f) => f.id);

function certain(label: string, effects: Effect[], resultText?: string): OfferOption {
  return { kind: 'certain', label, effects, resultText };
}

const faction = (id: FactionId): Faction => fixtureFactions.find((f) => f.id === id)!;

/** Standing ladder: court -> serve -> pledge. Three deliberate steps to +50. */
function standingOffers(): Offer[] {
  const out: Offer[] = [];
  for (const id of ALL_FACTION_IDS) {
    out.push({
      id: `court_${id}`,
      title: `An Invitation from ${faction(id).name}`,
      body: 'There is a gathering. There is always a gathering.',
      phase: 'ascent',
      factionId: id,
      weight: 1.2,
      options: [
        certain(
          'Attend and behave',
          [
            { t: 'standing', factionId: id, v: 14 },
            { t: 'followers', v: 2 },
          ],
          'You attend. You behave. It is noted.',
        ),
        {
          kind: 'gamble',
          label: 'Attend and perform a favor',
          odds: 0.55,
          onSuccess: [
            { t: 'standing', factionId: id, v: 26 },
            { t: 'notoriety', v: 6 },
          ],
          onFailure: [
            { t: 'standing', factionId: id, v: -6 },
            { t: 'notoriety', v: -2 },
          ],
          successText: 'The favor lands. Doors open.',
          failureText: 'The favor does not land. A door closes.',
        },
        certain('Send a strongly worded letter instead', [{ t: 'notoriety', v: 2 }]),
      ],
    });

    out.push({
      id: `serve_${id}`,
      title: `${faction(id).name} Has a Task`,
      body: 'It is beneath you. It is also, annoyingly, on the way.',
      phase: 'any',
      factionId: id,
      requires: [{ c: 'minStanding', factionId: id, v: 5 }],
      weight: 1.1,
      options: [
        certain(
          'Do the task properly',
          [
            { t: 'standing', factionId: id, v: 18 },
            { t: 'followers', v: -3 },
            { t: 'notoriety', v: 2 },
          ],
          'Done, and done well. They notice both.',
        ),
        certain(
          'Do the task theatrically',
          [
            { t: 'standing', factionId: id, v: 9 },
            { t: 'notoriety', v: 7 },
          ],
          'Done, loudly. Three villages hear about it.',
        ),
        certain('Refuse the task', [{ t: 'standing', factionId: id, v: -6 }]),
      ],
    });

    out.push({
      id: `pledge_${id}`,
      title: `${faction(id).name} Wants It In Writing`,
      body: 'They have brought a document, a witness, and a pen that looks expensive.',
      phase: 'any',
      factionId: id,
      requires: [{ c: 'minStanding', factionId: id, v: 25 }],
      weight: 1.2,
      options: [
        certain(
          'Sign the pledge',
          [
            { t: 'standing', factionId: id, v: 22 },
            { t: 'notoriety', v: 3 },
          ],
          'Signed, witnessed, and filed somewhere you cannot reach.',
        ),
        certain(
          'Sign it and demand tribute',
          [
            { t: 'standing', factionId: id, v: 12 },
            { t: 'followers', v: 5 },
            { t: 'notoriety', v: 5 },
          ],
          'They pay. They also remember being asked.',
        ),
        certain('Refuse to be anyone else on paper', [
          { t: 'standing', factionId: id, v: -12 },
          { t: 'notoriety', v: 6 },
        ]),
      ],
    });
  }
  return out;
}

/** Artifact acquisition — the collection engine. */
function relicOffers(): Offer[] {
  const out: Offer[] = [];
  for (const id of ALL_FACTION_IDS) {
    out.push({
      id: `relic_${id}`,
      title: `${faction(id).name} Opens the Vault`,
      body: 'Their vault is open a hand-width. That is the whole invitation.',
      phase: 'any',
      factionId: id,
      weight: 1.3,
      requires: [{ c: 'minStanding', factionId: id, v: 5 }],
      options: [
        certain(
          'Pay their price',
          [
            { t: 'followers', v: -4 },
            { t: 'artifactFrom', factionId: id, rarity: 'common' },
          ],
          'Four followers walk out with a crate. You keep what is left.',
        ),
        {
          kind: 'gamble',
          label: 'Take more than was offered',
          odds: 0.45,
          onSuccess: [
            { t: 'artifactFrom', factionId: id, rarity: 'rare' },
            { t: 'notoriety', v: 8 },
          ],
          onFailure: [
            { t: 'standing', factionId: id, v: -22 },
            { t: 'heroThreat', v: 5 },
          ],
          successText: 'You leave with the good one.',
          failureText: 'An alarm you did not know about.',
        },
        certain('Close the door politely', [{ t: 'standing', factionId: id, v: 4 }]),
      ],
    });

    out.push({
      id: `hoard_${id}`,
      title: `A ${capitalize(faction(id).adjective)} Reliquary, Unattended`,
      body: 'The caretaker has been dead for some time and nobody has updated the roster.',
      phase: 'any',
      factionId: id,
      requires: [{ c: 'minEraIndex', v: 3 }],
      options: [
        certain(
          'Take one thing and leave',
          [
            { t: 'artifactFrom', factionId: id, rarity: 'common' },
            { t: 'standing', factionId: id, v: -8 },
          ],
          'One item. You are almost proud of the restraint.',
        ),
        {
          kind: 'gamble',
          label: 'Empty the room',
          odds: 0.4,
          onSuccess: [
            { t: 'artifactFrom', factionId: id, rarity: 'rare' },
            { t: 'artifactFrom', factionId: id, rarity: 'common' },
            { t: 'notoriety', v: 9 },
          ],
          onFailure: [
            { t: 'standing', factionId: id, v: -20 },
            { t: 'heroThreat', v: 7 },
            { t: 'notoriety', v: -2 },
          ],
          successText: 'Two crates and a clean exit.',
          failureText: 'The caretaker was less dead than advertised.',
        },
        certain('Report the lapse to them', [{ t: 'standing', factionId: id, v: 14 }]),
      ],
    });
  }
  return out;
}

/** Notoriety at the cost of standing — the raid archetype. */
function raidOffers(): Offer[] {
  return ALL_FACTION_IDS.map((id) => ({
    id: `raid_${id}`,
    title: `An Undefended ${capitalize(faction(id).adjective)} Outpost`,
    body: 'It is undefended in the way that a wasp nest is undefended.',
    phase: 'ascent' as const,
    factionId: id,
    options: [
      certain('Leave it alone', [{ t: 'notoriety', v: 1 }], 'You leave it. Nobody hears about it.'),
      {
        kind: 'gamble' as const,
        label: 'Burn it to the foundations',
        odds: 0.6,
        onSuccess: [
          { t: 'notoriety' as const, v: 13 },
          { t: 'standing' as const, factionId: id, v: -18 },
          { t: 'followers' as const, v: 4 },
        ],
        onFailure: [
          { t: 'notoriety' as const, v: -4 },
          { t: 'heroThreat' as const, v: 7 },
          { t: 'standing' as const, factionId: id, v: -12 },
        ],
        successText: 'It burns for a week. People travel to watch.',
        failureText: 'It does not burn. You are seen not burning it.',
      },
    ],
  }));
}

/** Decline-phase defense. */
function wardOffers(): Offer[] {
  return ALL_FACTION_IDS.map((id) => ({
    id: `wards_${id}`,
    title: 'The Wards Need Work',
    body: 'Something walked through the outer ring last month and did not stop.',
    phase: 'decline' as const,
    factionId: id,
    weight: 1.4,
    options: [
      certain(
        'Reinforce them properly',
        [
          { t: 'heroThreat', v: -8 },
          { t: 'followers', v: -3 },
        ],
        'Three followers and a season of work. The ring holds.',
      ),
      {
        kind: 'gamble' as const,
        label: 'Bind something into the foundations',
        odds: 0.5,
        onSuccess: [
          { t: 'heroThreat' as const, v: -17 },
          { t: 'notoriety' as const, v: 4 },
        ],
        onFailure: [
          { t: 'heroThreat' as const, v: 7 },
          { t: 'notoriety' as const, v: -3 },
          { t: 'standing' as const, factionId: id, v: -10 },
        ],
        successText: 'It is very unhappy down there, and very effective.',
        failureText: 'It gets out. It tells people where you live.',
      },
      certain('Ignore it and read instead', [{ t: 'notoriety', v: 3 }]),
    ],
  }));
}

function offersFor(): Offer[] {
  const out: Offer[] = [
    ...standingOffers(),
    ...relicOffers(),
    ...raidOffers(),
    ...wardOffers(),
  ];

  // --- Apprentices --------------------------------------------------------
  for (const id of [
    'ashen_covenant',
    'pale_academy',
    'worm_below',
    'gilded_hand',
    'crownlands',
  ] as FactionId[]) {
    out.push({
      id: `apprentice_${id}`,
      title: 'A Student Presents Themselves',
      body: 'They have read your work. They have opinions about your work.',
      phase: 'ascent',
      factionId: id,
      options: [
        certain(
          'Take them on',
          [
            { t: 'apprentices', v: 1 },
            { t: 'loyalty', v: -6 },
            { t: 'followers', v: 4 },
            { t: 'notoriety', v: 4 },
            { t: 'standing', factionId: id, v: 8 },
          ],
          'They move in. They rearrange your shelves.',
        ),
        certain('Work alone, as always', [
          { t: 'notoriety', v: 3 },
          { t: 'loyalty', v: 6 },
        ]),
        {
          kind: 'gamble',
          label: 'Take them on and break them in hard',
          odds: 0.5,
          onSuccess: [
            { t: 'apprentices', v: 1 },
            { t: 'loyalty', v: 8 },
            { t: 'notoriety', v: 9 },
          ],
          onFailure: [
            { t: 'apprentices', v: 1 },
            { t: 'loyalty', v: -24 },
          ],
          successText: 'They break correctly.',
          failureText: 'They break incorrectly, and remember it.',
        },
      ],
    });
  }

  // --- Lair ladder --------------------------------------------------------
  for (const id of ['gilded_hand', 'verdant_choir', 'crownlands'] as FactionId[]) {
    out.push({
      id: `lair_${id}`,
      title: 'A Better Address',
      body: 'The previous owner left in a hurry and left the furniture.',
      phase: 'ascent',
      factionId: id,
      weight: 1.2,
      requires: [{ c: 'minFollowers', v: 5 }],
      options: [
        certain(
          'Buy it outright',
          [
            { t: 'lairTier', v: 1 },
            { t: 'followers', v: -5 },
          ],
          'The deed is transferred. Mostly legally.',
        ),
        {
          kind: 'gamble',
          label: 'Take it by force',
          odds: 0.5,
          onSuccess: [
            { t: 'lairTier', v: 1 },
            { t: 'notoriety', v: 8 },
            { t: 'standing', factionId: id, v: -10 },
          ],
          onFailure: [
            { t: 'heroThreat', v: 9 },
            { t: 'notoriety', v: -2 },
            { t: 'standing', factionId: id, v: -14 },
          ],
          successText: 'The furniture stays. The owner does not.',
          failureText: 'The owner had friends.',
        },
        certain('Stay where you are', [{ t: 'followers', v: 2 }]),
      ],
    });
  }

  out.push({
    id: 'gen_excavation',
    title: 'The Cellar Goes Down Further Than Recorded',
    body: 'Considerably further. There are stairs, and the stairs are not yours.',
    phase: 'any',
    requires: [{ c: 'minLairTier', v: 2 }],
    options: [
      certain(
        'Excavate and expand',
        [
          { t: 'lairTier', v: 1 },
          { t: 'followers', v: -4 },
        ],
        'The tower gains a floor by growing downward, which is cheaper.',
      ),
      certain('Brick it up', [{ t: 'heroThreat', v: -4 }], 'Whatever is down there stays down there.'),
    ],
  });

  // --- Pacts: the pactDebt engine ----------------------------------------
  for (const id of ['ashen_covenant', 'worm_below'] as FactionId[]) {
    out.push({
      id: `pact_${id}`,
      title: `${faction(id).name} Offers Terms`,
      body: 'The contract is long. The interesting parts are near the back.',
      phase: 'any',
      factionId: id,
      weight: 1.1,
      options: [
        certain(
          'Decline politely',
          [
            { t: 'standing', factionId: id, v: -8 },
            { t: 'notoriety', v: 1 },
          ],
          'You decline. They write something down.',
        ),
        {
          kind: 'gamble',
          label: 'Sign the whole thing',
          odds: 0.65,
          onSuccess: [
            { t: 'notoriety', v: 16 },
            { t: 'pactDebt', v: 2 },
            { t: 'standing', factionId: id, v: 12 },
          ],
          onFailure: [
            { t: 'notoriety', v: 6 },
            { t: 'pactDebt', v: 3 },
            { t: 'apprentices', v: -1 },
          ],
          successText: 'Power arrives immediately. The bill does not.',
          failureText: 'Power arrives. So does an invoice, and a shortage of apprentices.',
        },
        certain(
          'Pay down what you already owe',
          [
            { t: 'pactDebt', v: -2 },
            { t: 'followers', v: -5 },
          ],
          'You pay. The ledger is briefly shorter.',
        ),
      ],
    });
  }

  out.push({
    id: 'debt_collector',
    title: 'A Collector at the Gate',
    body: 'It is holding a clipboard, which is somehow the worst part.',
    phase: 'any',
    requires: [{ c: 'minPactDebt', v: 2 }],
    weight: 2.2,
    options: [
      certain(
        'Settle in followers',
        [
          { t: 'pactDebt', v: -3 },
          { t: 'followers', v: -8 },
        ],
        'Eight of them go with it. They do not look back.',
      ),
      certain(
        'Settle in artifacts',
        [
          { t: 'pactDebt', v: -3 },
          { t: 'loseArtifact' },
        ],
        'It takes something off your shelf and leaves.',
      ),
      {
        kind: 'gamble',
        label: 'Argue the terms',
        odds: 0.45,
        onSuccess: [{ t: 'pactDebt', v: -4 }],
        onFailure: [
          { t: 'pactDebt', v: 2 },
          { t: 'notoriety', v: -3 },
        ],
        successText: 'There was a clause. You found it.',
        failureText: 'There was a clause. It found you.',
      },
    ],
  });

  out.push({
    id: 'debt_reckoning',
    title: 'The Instalments Are Being Called In',
    body: 'All of them. There is a queue forming and it is not a friendly queue.',
    phase: 'decline',
    requires: [{ c: 'minPactDebt', v: 3 }],
    weight: 2.4,
    options: [
      certain(
        'Liquidate everything to pay',
        [
          { t: 'pactDebt', v: -4 },
          { t: 'followers', v: -10 },
          { t: 'notoriety', v: -4 },
        ],
        'The tower is emptier. The queue disperses.',
      ),
      certain(
        'Hand over an apprentice as collateral',
        [
          { t: 'pactDebt', v: -3 },
          { t: 'apprentices', v: -1 },
          { t: 'loyalty', v: -20 },
        ],
        'One goes. The others watch you decide which.',
      ),
      certain('Take on more debt to service the debt', [
        { t: 'pactDebt', v: 1 },
        { t: 'notoriety', v: 10 },
      ]),
    ],
  });

  // --- Decline: the hero arc ----------------------------------------------
  out.push({
    id: 'the_chosen_one_approaches',
    title: 'A Farmhand Has Been Asking Directions',
    body: 'Specifically, directions to you. By name. Politely.',
    phase: 'decline',
    factionId: 'crownlands',
    weight: 1.6,
    options: [
      certain(
        'Send assassins',
        [
          { t: 'heroThreat', v: -8 },
          { t: 'followers', v: -5 },
          { t: 'standing', factionId: 'crownlands', v: -12 },
        ],
        'Five go out. None come back. Neither does the farmhand, for a while.',
      ),
      certain(
        'Move house',
        [
          { t: 'heroThreat', v: -12 },
          { t: 'lairTier', v: -1 },
        ],
        'You relocate downward. It is quieter down there.',
      ),
      {
        kind: 'gamble',
        label: 'Meet them yourself',
        odds: 0.35,
        onSuccess: [
          { t: 'heroThreat', v: -26 },
          { t: 'notoriety', v: 12 },
        ],
        onFailure: [
          { t: 'heroThreat', v: 12 },
          { t: 'loseArtifact' },
        ],
        successText: 'There is no more farmhand. There is a story about you.',
        failureText: 'They are better than advertised. You leave something behind.',
      },
    ],
  });

  out.push({
    id: 'buy_the_prophecy',
    title: 'The Prophecy Is For Sale',
    body: 'A scribe in the Crownlands archive has an original and a mortgage.',
    phase: 'decline',
    factionId: 'crownlands',
    weight: 1.3,
    requires: [{ c: 'minFollowers', v: 6 }],
    options: [
      certain(
        'Buy it and burn it',
        [
          { t: 'heroThreat', v: -13 },
          { t: 'followers', v: -6 },
          { t: 'standing', factionId: 'crownlands', v: -10 },
        ],
        'It burns like any other paper. Somehow you expected more.',
      ),
      certain(
        'Buy it and read it',
        [
          { t: 'notoriety', v: 7 },
          { t: 'followers', v: -6 },
        ],
        'It is unflattering and extremely specific.',
      ),
    ],
  });

  out.push({
    id: 'name_the_hero',
    title: 'The Chosen One Has a Name Now',
    body: 'It is a good name. Annoyingly good. It scans.',
    phase: 'decline',
    factionId: 'crownlands',
    weight: 1.5,
    requires: [{ c: 'minEraIndex', v: 2 }],
    options: [
      certain(
        'Buy off their village',
        [
          { t: 'heroThreat', v: -9 },
          { t: 'followers', v: -4 },
        ],
        'The village recants publicly and expensively.',
      ),
      certain(
        'Discredit the prophecy in print',
        [
          { t: 'heroThreat', v: -6 },
          { t: 'standing', factionId: 'pale_academy', v: 10 },
        ],
        'The Academy enjoys a good debunking, whatever the source.',
      ),
      {
        kind: 'gamble',
        label: 'Adopt the name yourself',
        odds: 0.4,
        onSuccess: [
          { t: 'notoriety', v: 14 },
          { t: 'heroThreat', v: -7 },
        ],
        onFailure: [
          { t: 'notoriety', v: -5 },
          { t: 'heroThreat', v: 9 },
        ],
        successText: 'Now there are two, and only one of you is real.',
        failureText: 'It does not take. It makes you look nervous.',
      },
    ],
  });

  out.push({
    id: 'last_great_working',
    title: 'One Last Great Working',
    body: 'You have the notes. You have never had the nerve.',
    phase: 'decline',
    weight: 1.2,
    requires: [{ c: 'minNotoriety', v: 40 }],
    options: [
      certain('Do the small safe version', [{ t: 'notoriety', v: 6 }], 'It works. It is small.'),
      {
        kind: 'gamble',
        label: 'Do the whole thing',
        odds: 0.45,
        onSuccess: [
          { t: 'notoriety', v: 21 },
          { t: 'followers', v: 8 },
        ],
        onFailure: [
          { t: 'notoriety', v: -9 },
          { t: 'heroThreat', v: 9 },
          { t: 'followers', v: -5 },
        ],
        successText: 'Three counties see it. Two of them evacuate.',
        failureText: 'It fails loudly, which is the worst way to fail.',
      },
    ],
  });

  out.push({
    id: 'vault_beneath',
    title: 'The Vault Beneath the Spire',
    body: 'It has been down there the whole time. It has been waiting for a bad decade.',
    phase: 'decline',
    factionId: 'worm_below',
    weight: 1.3,
    requires: [{ c: 'minLairTier', v: 3 }],
    options: [
      certain(
        'Seal it and forget it',
        [
          { t: 'heroThreat', v: -6 },
          { t: 'notoriety', v: 2 },
        ],
        'Sealed. You do sleep better.',
      ),
      {
        kind: 'gamble',
        label: 'Open it',
        odds: 0.4,
        onSuccess: [
          { t: 'artifactFrom', factionId: 'worm_below' },
          { t: 'notoriety', v: 10 },
        ],
        onFailure: [
          { t: 'heroThreat', v: 12 },
          { t: 'pactDebt', v: 1 },
        ],
        successText: 'It was worth the decade of waiting.',
        failureText: 'Something is loose in the lower floors now.',
      },
    ],
  });

  // --- Legendary prizes: deliberate courtship, then a real gamble ----------
  for (const artifactId of fixtureLegendaryIds) {
    const factionId = artifactId.replace(/_legendary_\d+$/, '') as FactionId;
    out.push({
      id: `legend_${artifactId}`,
      title: `${faction(factionId).name} Will Part With Something Real`,
      body: 'They bring it out on a cushion. Nobody is making eye contact with it.',
      phase: 'any',
      factionId,
      weight: 4.5,
      requires: [
        { c: 'minStanding', factionId, v: 5 },
        { c: 'minNotoriety', v: 40 },
      ],
      options: [
        certain(
          'Admire it and leave',
          [
            { t: 'standing', factionId, v: 6 },
            { t: 'notoriety', v: 2 },
          ],
          'You admire it. It is put away.',
        ),
        {
          kind: 'gamble',
          label: 'Meet their price in full',
          odds: 0.65,
          onSuccess: [
            { t: 'artifact', artifactId },
            { t: 'notoriety', v: 7 },
          ],
          onFailure: [
            { t: 'followers', v: -8 },
            { t: 'standing', factionId, v: -14 },
          ],
          successText: 'It is yours, and it is heavier than it looks.',
          failureText: 'The price was not what you thought it was.',
        },
        certain(
          'Trade an apprentice for it',
          [
            { t: 'artifact', artifactId },
            { t: 'apprentices', v: -1 },
            { t: 'loyalty', v: -25 },
            { t: 'followers', v: -6 },
          ],
          'They take the apprentice. You take the cushion.',
        ),
      ],
    });
  }

  // --- The Kingdom-Level tier: fame opens the good vaults ------------------
  // Ascension is the AND of two rare things (Legend-tier fame AND two
  // legendaries). If those two are uncorrelated the product is unreachable,
  // so the second legendary path is gated on FAME rather than courtship:
  // once you are a Kingdom-Level problem, the factions bring you the cushion.
  for (const artifactId of fixtureLegendaryIds) {
    const factionId = artifactId.replace(/_legendary_\d+$/, '') as FactionId;
    out.push({
      id: `crown_${artifactId}`,
      title: `${faction(factionId).name} Would Like to Be On Good Terms`,
      body: 'You are, at this point, a fact of the landscape. They have adjusted.',
      phase: 'any',
      factionId,
      weight: 6,
      requires: [{ c: 'minNotoriety', v: 70 }],
      options: [
        certain(
          'Accept the gift, and the obligation',
          [
            { t: 'artifact', artifactId },
            { t: 'followers', v: -10 },
            { t: 'standing', factionId, v: -6 },
          ],
          'It changes hands. So does something less tangible.',
        ),
        {
          kind: 'gamble',
          label: 'Take it and offer nothing',
          odds: 0.5,
          onSuccess: [
            { t: 'artifact', artifactId },
            { t: 'notoriety', v: 8 },
          ],
          onFailure: [
            { t: 'standing', factionId, v: -26 },
            { t: 'heroThreat', v: 11 },
          ],
          successText: 'They let you. That is the frightening part.',
          failureText: 'They did not let you.',
        },
        certain('Decline graciously', [
          { t: 'standing', factionId, v: 12 },
          { t: 'notoriety', v: 2 },
        ]),
      ],
    });
  }

  // --- Lichdom: the live decision -----------------------------------------
  out.push({
    id: 'rite_of_the_worm',
    title: 'The Rite of the Worm',
    body: 'The Worm Below explains the procedure. It is thorough. It is not reassuring.',
    phase: 'decline',
    factionId: 'worm_below',
    weight: 1.8,
    requires: [
      { c: 'minNotoriety', v: 35 },
      { c: 'minStanding', factionId: 'worm_below', v: 0 },
    ],
    options: [
      certain(
        'Refuse the rite',
        [
          { t: 'standing', factionId: 'worm_below', v: -22 },
          { t: 'notoriety', v: 3 },
        ],
        'You refuse. The Worm is patient, and says so.',
      ),
      certain(
        'Undergo the rite',
        [{ t: 'ending', endingId: 'lichdom' }],
        'Everything you own is taken. Everyone who followed you leaves. You do not stop.',
      ),
      certain(
        'Send an apprentice in your place',
        [
          { t: 'apprentices', v: -1 },
          { t: 'loyalty', v: -18 },
          { t: 'notoriety', v: 8 },
          { t: 'standing', factionId: 'worm_below', v: 10 },
        ],
        'They go down the stairs. Something else comes up them.',
      ),
    ],
  });

  // --- Generic, factionless texture ---------------------------------------
  const generic: Offer[] = [
    {
      id: 'gen_villagers_name_you',
      title: 'The Villagers Have Renamed You',
      body: "The new name is 'That Prick From The Hill'. It has caught on.",
      phase: 'any',
      options: [
        certain('Accept it with dignity', [{ t: 'notoriety', v: 4 }], 'It sticks. Names do.'),
        certain(
          'Correct them, individually, at length',
          [
            { t: 'notoriety', v: 8 },
            { t: 'followers', v: -3 },
          ],
          'Several move away. The name spreads faster.',
        ),
      ],
    },
    {
      id: 'gen_tax_collector',
      title: 'A Tax Collector, Undeterred',
      body: 'The third one this decade. The first two are in the garden.',
      phase: 'ascent',
      options: [
        certain(
          'Pay the tax',
          [
            { t: 'followers', v: -3 },
            { t: 'standing', factionId: 'crownlands', v: 14 },
          ],
          'Paid, stamped, filed. Deeply humiliating.',
        ),
        certain(
          'Add them to the garden',
          [
            { t: 'notoriety', v: 9 },
            { t: 'standing', factionId: 'crownlands', v: -18 },
          ],
          'The garden is thriving.',
        ),
      ],
    },
    {
      id: 'gen_rival_wizard',
      title: 'A Rival Publishes First',
      body: 'Your technique. Your notation. Their name on it.',
      phase: 'any',
      options: [
        certain('Publish a rebuttal', [
          { t: 'notoriety', v: 3 },
          { t: 'standing', factionId: 'pale_academy', v: 10 },
        ]),
        {
          kind: 'gamble',
          label: 'Publish them, posthumously',
          odds: 0.6,
          onSuccess: [
            { t: 'notoriety', v: 12 },
            { t: 'followers', v: 3 },
          ],
          onFailure: [
            { t: 'notoriety', v: -3 },
            { t: 'heroThreat', v: 6 },
          ],
          successText: 'The correction is issued. Nobody disputes it.',
          failureText: 'They were better prepared than their footnotes suggested.',
        },
      ],
    },
    {
      id: 'gen_recruitment',
      title: 'A Crowd Has Gathered',
      body: 'Some of them are here for the free soup. Some are not.',
      phase: 'any',
      weight: 1.2,
      options: [
        certain('Give a speech', [{ t: 'followers', v: 7 }], 'It goes on. They stay.'),
        certain(
          'Give a demonstration',
          [
            { t: 'followers', v: 4 },
            { t: 'notoriety', v: 6 },
          ],
          'Two of them faint. Word travels.',
        ),
        certain('Disperse them', [{ t: 'notoriety', v: 2 }]),
      ],
    },
    {
      id: 'gen_harvest',
      title: 'A Very Good Harvest',
      body: 'Not yours. But the surplus has to go somewhere and you have a cellar.',
      phase: 'any',
      options: [
        certain('Buy the surplus', [{ t: 'followers', v: 6 }], 'Full bellies make reliable staff.'),
        certain(
          'Requisition the surplus',
          [
            { t: 'followers', v: 3 },
            { t: 'notoriety', v: 6 },
            { t: 'standing', factionId: 'verdant_choir', v: -12 },
          ],
          'It is taken. The Choir composes something about it.',
        ),
      ],
    },
    {
      id: 'gen_plague',
      title: 'A Plague, Conveniently Timed',
      body: 'You did not cause it. You are, however, extremely well positioned.',
      phase: 'any',
      options: [
        certain(
          'Sell the cure',
          [
            { t: 'followers', v: 8 },
            { t: 'notoriety', v: 4 },
          ],
          'They pay in loyalty, which is cheaper than coin.',
        ),
        certain(
          'Take credit for it',
          [
            { t: 'notoriety', v: 11 },
            { t: 'heroThreat', v: 5 },
            { t: 'standing', factionId: 'crownlands', v: -12 },
          ],
          'You did not do it. Nobody believes that now.',
        ),
      ],
    },
    {
      id: 'gen_library',
      title: 'An Unattended Library',
      body: 'The librarian has stepped out for what is clearly the last time.',
      phase: 'ascent',
      options: [
        certain('Take the practical volumes', [{ t: 'notoriety', v: 5 }], 'Four books. All useful.'),
        {
          kind: 'gamble',
          label: 'Take the sealed section',
          odds: 0.5,
          onSuccess: [{ t: 'artifactFrom', factionId: 'pale_academy', rarity: 'common' }],
          onFailure: [
            { t: 'notoriety', v: -2 },
            { t: 'standing', factionId: 'pale_academy', v: -16 },
          ],
          successText: 'The seal was decorative.',
          failureText: 'The seal was not decorative.',
        },
      ],
    },
    {
      id: 'gen_battlefield',
      title: 'A Battlefield, Three Days Cold',
      body: 'Two armies met. Neither won. The equipment is largely intact.',
      phase: 'any',
      weight: 1.2,
      options: [
        certain(
          'Loot it methodically',
          [
            { t: 'artifactFrom', factionId: 'crownlands', rarity: 'common' },
            { t: 'standing', factionId: 'crownlands', v: -10 },
          ],
          'You take the good sword and two of the better rings.',
        ),
        certain(
          'Raise the dead and take them home',
          [
            { t: 'followers', v: 9 },
            { t: 'notoriety', v: 7 },
            { t: 'standing', factionId: 'pale_academy', v: -14 },
          ],
          'They are quiet, hardworking, and technically deceased.',
        ),
        certain('Leave it. Some things are sacred', [{ t: 'standing', factionId: 'verdant_choir', v: 14 }]),
      ],
    },
    {
      id: 'gen_apprentice_raise',
      title: 'Your Apprentices Have Drafted a Letter',
      body: 'It uses the word "concerns" four times.',
      phase: 'any',
      requires: [{ c: 'minApprentices', v: 1 }],
      weight: 1.8,
      options: [
        certain(
          'Grant the concessions',
          [
            { t: 'loyalty', v: 24 },
            { t: 'followers', v: -3 },
          ],
          'Morale improves. Standards do not.',
        ),
        certain(
          'Read it aloud, mockingly',
          [
            { t: 'loyalty', v: -18 },
            { t: 'notoriety', v: 5 },
          ],
          'They laugh. Two of them do not.',
        ),
        certain('Ignore the letter entirely', [{ t: 'loyalty', v: -8 }]),
      ],
    },
    {
      id: 'gen_apprentice_purge',
      title: 'One of Them Has Been Reading Your Private Notes',
      body: 'The marginalia are in a different hand. It is a confident hand.',
      phase: 'decline',
      requires: [{ c: 'minApprentices', v: 2 }],
      weight: 1.8,
      options: [
        certain(
          'Confront them privately',
          [
            { t: 'loyalty', v: 16 },
            { t: 'notoriety', v: -1 },
          ],
          'It is handled quietly. They stay.',
        ),
        certain(
          'Make an example',
          [
            { t: 'apprentices', v: -1 },
            { t: 'loyalty', v: -14 },
            { t: 'notoriety', v: 7 },
          ],
          'The others take the point. Some of them take notes.',
        ),
        certain(
          'Promote them',
          [
            { t: 'loyalty', v: 10 },
            { t: 'followers', v: 4 },
            { t: 'notoriety', v: 2 },
          ],
          'Ambition, redirected, is just staffing.',
        ),
      ],
    },
    {
      id: 'gen_followers_leave',
      title: 'The Followers Are Restless',
      body: 'Someone has been counting how many of them come back from errands.',
      phase: 'decline',
      options: [
        certain(
          'Address it honestly',
          [
            { t: 'followers', v: -2 },
            { t: 'loyalty', v: 10 },
          ],
          'A few leave. The rest respect it.',
        ),
        certain(
          'Address it with a demonstration',
          [
            { t: 'followers', v: -4 },
            { t: 'notoriety', v: 7 },
          ],
          'Nobody leaves after that.',
        ),
      ],
    },
    {
      id: 'gen_statue',
      title: 'Someone Has Erected a Statue',
      body: 'It is of you. It is not flattering. It is very large.',
      phase: 'decline',
      options: [
        certain('Leave it standing', [{ t: 'notoriety', v: 6 }], 'It stays. It is visible from the road.'),
        certain(
          'Destroy it publicly',
          [
            { t: 'notoriety', v: -2 },
            { t: 'heroThreat', v: -6 },
          ],
          'A quieter decade follows.',
        ),
      ],
    },
    {
      id: 'gen_quiet_decade',
      title: 'Nothing Happens For Five Years',
      body: 'It is the most productive stretch of your life and nobody will ever hear about it.',
      phase: 'any',
      options: [
        certain('Study', [{ t: 'notoriety', v: 4 }], 'You get considerably better at it.'),
        certain('Recruit', [{ t: 'followers', v: 6 }], 'Quiet years make people agreeable.'),
        certain('Fortify', [{ t: 'heroThreat', v: -7 }], 'By spring the walls are thicker.'),
      ],
    },
    {
      id: 'gen_old_debt',
      title: 'An Old Colleague Calls In A Favor',
      body: 'You genuinely do not remember agreeing to this.',
      phase: 'any',
      options: [
        certain('Honor it', [
          { t: 'standing', factionId: 'pale_academy', v: 14 },
          { t: 'followers', v: -2 },
        ]),
        certain('Deny everything', [
          { t: 'notoriety', v: 4 },
          { t: 'standing', factionId: 'pale_academy', v: -10 },
        ]),
      ],
    },
    {
      id: 'gen_bargain_hunt',
      title: 'A Market of Dubious Provenance',
      body: 'Every stall claims its wares are cursed. Most of them are lying.',
      phase: 'any',
      requires: [{ c: 'minFollowers', v: 4 }],
      options: [
        certain(
          'Buy something reputable',
          [
            { t: 'followers', v: -4 },
            { t: 'artifactFrom', factionId: 'gilded_hand', rarity: 'common' },
          ],
          'It is authentic, which is disappointing.',
        ),
        {
          kind: 'gamble',
          label: 'Buy the one nobody will touch',
          odds: 0.45,
          onSuccess: [{ t: 'artifactFrom', factionId: 'worm_below', rarity: 'rare' }],
          onFailure: [
            { t: 'pactDebt', v: 1 },
            { t: 'notoriety', v: 2 },
          ],
          successText: 'It was worth touching.',
          failureText: 'It came with an arrangement.',
        },
        certain('Buy nothing', [{ t: 'followers', v: 1 }]),
      ],
    },
    {
      id: 'gen_heir',
      title: 'A Noble Heir Goes Missing',
      body: 'Nearby. Suspiciously nearby. You had nothing to do with it, this time.',
      phase: 'decline',
      options: [
        certain(
          'Return them, publicly',
          [
            { t: 'standing', factionId: 'crownlands', v: 20 },
            { t: 'heroThreat', v: -5 },
            { t: 'notoriety', v: -4 },
          ],
          'The Crownlands are grateful in writing, which is rare.',
        ),
        certain(
          'Keep them, quietly',
          [
            { t: 'notoriety', v: 10 },
            { t: 'heroThreat', v: 7 },
            { t: 'standing', factionId: 'crownlands', v: -16 },
          ],
          'The negotiations are ongoing and going badly.',
        ),
      ],
    },
    {
      id: 'gen_grove',
      title: 'The Choir Sings at Your Walls',
      body: 'It is beautiful. It has been going on for eleven days.',
      phase: 'any',
      options: [
        certain(
          'Concede the grove',
          [
            { t: 'standing', factionId: 'verdant_choir', v: 18 },
            { t: 'lairTier', v: -1 },
          ],
          'The singing stops. So does one floor of your tower.',
        ),
        certain(
          'Salt the grove',
          [
            { t: 'notoriety', v: 9 },
            { t: 'standing', factionId: 'verdant_choir', v: -24 },
          ],
          'Nothing grows there now. The singing gets worse.',
        ),
        certain('Wait them out', [{ t: 'followers', v: -2 }], 'Eleven days becomes forty.'),
      ],
    },
    {
      id: 'gen_academy_summons',
      title: 'The Academy Requests Your Attendance',
      body: 'It is described as a hearing. The word "hearing" is doing a lot of work.',
      phase: 'any',
      factionId: 'pale_academy',
      options: [
        certain(
          'Attend and grovel',
          [
            { t: 'standing', factionId: 'pale_academy', v: 20 },
            { t: 'notoriety', v: -3 },
          ],
          'You grovel. It is efficient and humiliating.',
        ),
        certain(
          'Attend and refuse to sit down',
          [
            { t: 'standing', factionId: 'pale_academy', v: -18 },
            { t: 'notoriety', v: 9 },
          ],
          'You stand for four hours. It is reported widely.',
        ),
        certain('Do not attend', [
          { t: 'standing', factionId: 'pale_academy', v: -10 },
          { t: 'notoriety', v: 3 },
        ]),
      ],
    },
  ];

  out.push(...generic);
  return out;
}

export const fixtureOffers: Offer[] = offersFor();

// ---------------------------------------------------------------------------
// Epithets — first match wins, so loudest deeds first
// ---------------------------------------------------------------------------

export const fixtureEpithets: Epithet[] = [
  { id: 'lich', text: 'the Undying', when: (r) => r.isLich },
  { id: 'legend', text: 'the Unspeakable', when: (r) => r.notoriety >= 90 },
  { id: 'collector', text: 'the Collector', when: (r) => r.heldArtifactIds.length >= 5 },
  { id: 'indebted', text: 'the Indebted', when: (r) => r.pactDebt >= 3 },
  { id: 'schoolmaster', text: 'the Schoolmaster', when: (r) => r.apprentices.count >= 3 },
  { id: 'crowned_enemy', text: "the Crown's Enemy", when: (r) => r.factionStanding.crownlands <= -40 },
  { id: 'popular', text: 'the Well-Attended', when: (r) => r.followers >= 20 },
  { id: 'kingdom', text: 'the Kingdom-Level Nuisance', when: (r) => r.notoriety >= 75 },
];

// ---------------------------------------------------------------------------

export const fixtureContent: ContentBundle = {
  factions: fixtureFactions,
  artifacts: fixtureArtifacts,
  lairs: fixtureLairs,
  origins: fixtureOrigins,
  endings: fixtureEndings,
  offers: fixtureOffers,
  epithets: fixtureEpithets,
};

export default fixtureContent;
