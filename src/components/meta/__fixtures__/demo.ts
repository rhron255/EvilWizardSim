/**
 * Demo fixtures for the meta (set-piece) screens.
 *
 * The engine and the real content catalogs do not exist yet, so these exist so
 * the title / creation / prophecy / ending / collection screens can be built
 * and reviewed against realistic shapes. They are typed against `src/types.ts`
 * and nothing else — when `src/content/**` lands, these should be deleted and
 * the screens pointed at the real catalogs without a single prop changing.
 *
 * Not content. Do not ship these strings.
 */

import type {
  Artifact,
  Collection,
  Ending,
  EraRecord,
  Faction,
  FactionId,
  Lair,
  Origin,
  RunState,
} from '../../../types';

// ---------------------------------------------------------------------------
// Factions
// ---------------------------------------------------------------------------

export const demoFactions: Faction[] = [
  {
    id: 'ashen_covenant',
    name: 'The Ashen Covenant',
    blurb: 'A demon-pact cult with excellent record-keeping and no sense of humour about interest.',
    demands: 'Takes apprentices. Grants raw Notoriety.',
    hostileTo: ['pale_academy', 'crownlands'],
    adjective: 'ashen',
  },
  {
    id: 'gilded_hand',
    name: 'The Gilded Hand',
    blurb: 'Relic merchants. They will sell you anything, including things you already own.',
    demands: 'Takes followers. Sells relics.',
    hostileTo: ['worm_below'],
    adjective: 'gilded',
  },
  {
    id: 'pale_academy',
    name: 'The Pale Academy',
    blurb: 'Institutional wizardry. Your alma mater, and still very disappointed.',
    demands: 'Takes reputation. Offers legitimacy and shelter.',
    hostileTo: ['ashen_covenant', 'worm_below'],
    adjective: 'pale',
  },
  {
    id: 'verdant_choir',
    name: 'The Verdant Choir',
    blurb: 'Druids who sing in shifts. Hostile by default, and patient about it.',
    demands: 'Takes territory. Blocks lair upgrades.',
    hostileTo: ['gilded_hand', 'crownlands'],
    adjective: 'verdant',
  },
  {
    id: 'crownlands',
    name: 'The Crownlands',
    blurb: 'A state that manufactures heroes the way other states manufacture rope.',
    demands: 'Takes everything, legally.',
    hostileTo: ['ashen_covenant', 'worm_below', 'verdant_choir'],
    adjective: 'crowned',
  },
  {
    id: 'worm_below',
    name: 'The Worm Below',
    blurb: 'Subterranean, uninterested in your goals, and extremely interested in your spine.',
    demands: 'Takes everything, eventually.',
    hostileTo: ['pale_academy', 'crownlands', 'gilded_hand'],
    adjective: 'wormish',
  },
];

// ---------------------------------------------------------------------------
// Artifacts — 30 slots, 16 common / 10 rare / 4 legendary
// ---------------------------------------------------------------------------

export const demoArtifacts: Artifact[] = [
  // The Ashen Covenant
  {
    id: 'bone_crown',
    name: 'The Bone Crown',
    factionId: 'ashen_covenant',
    rarity: 'legendary',
    effect: '+6 Notoriety each era. Apprentices desert 20% faster.',
    flavorText: 'Fits everyone. That is the unsettling part.',
    defense: 4,
  },
  {
    id: 'ashen_censer',
    name: 'The Ashen Censer',
    factionId: 'ashen_covenant',
    rarity: 'common',
    effect: '+2 Notoriety each era while pact debt is above zero.',
    flavorText: 'Smells of a barn fire and a bad decision.',
    defense: 1,
  },
  {
    id: 'covenant_brand',
    name: 'The Covenant Brand',
    factionId: 'ashen_covenant',
    rarity: 'common',
    effect: 'Ashen offers surface twice as often.',
    flavorText: 'Applied at a ceremony. Removed at no ceremony whatsoever.',
    defense: 0,
  },
  {
    id: 'tally_of_debts',
    name: 'The Tally of Debts',
    factionId: 'ashen_covenant',
    rarity: 'rare',
    effect: 'Pact debt accrues at half rate.',
    flavorText: 'Every name on it is crossed out. Yours is written in a lighter hand.',
    defense: 2,
  },
  {
    id: 'cinder_heart',
    name: 'The Cinder Heart',
    factionId: 'ashen_covenant',
    rarity: 'rare',
    effect: 'Survive one lethal hero encounter. Consumed on use.',
    flavorText: 'Still warm. It has been still warm for six hundred years.',
    defense: 6,
  },

  // The Gilded Hand
  {
    id: 'gilded_ledger',
    name: 'The Gilded Ledger',
    factionId: 'gilded_hand',
    rarity: 'common',
    effect: '+15 Followers each era.',
    flavorText: 'Balanced to the copper. None of the copper is yours.',
    defense: 0,
  },
  {
    id: 'merchants_thumb',
    name: "The Merchant's Thumb",
    factionId: 'gilded_hand',
    rarity: 'common',
    effect: 'Gilded relic prices fall by a third.',
    flavorText: 'Preserved in oil, still faintly pressing down.',
    defense: 1,
  },
  {
    id: 'coin_of_the_drowned',
    name: 'The Coin of the Drowned',
    factionId: 'gilded_hand',
    rarity: 'common',
    effect: 'Reroll one failed gamble per run.',
    flavorText: 'Two faces. Neither of them is heads.',
    defense: 1,
  },
  {
    id: 'appraisers_lens',
    name: "The Appraiser's Lens",
    factionId: 'gilded_hand',
    rarity: 'common',
    effect: 'Shows one extra offer each era.',
    flavorText: 'Makes everything look slightly more expensive, including you.',
    defense: 0,
  },
  {
    id: 'lesser_hand',
    name: 'The Lesser Hand',
    factionId: 'gilded_hand',
    rarity: 'legendary',
    effect: 'Convert 200 Followers into a relic of your choosing, once.',
    flavorText: 'It was a greater hand once. It made an arrangement.',
    defense: 3,
  },

  // The Pale Academy
  {
    id: 'chalk_of_correction',
    name: 'The Chalk of Correction',
    factionId: 'pale_academy',
    rarity: 'common',
    effect: 'Undo the notoriety loss of one era per run.',
    flavorText: 'Erases the board. Also erases whoever is holding the board.',
    defense: 1,
  },
  {
    id: 'tenure_seal',
    name: 'The Seal of Tenure',
    factionId: 'pale_academy',
    rarity: 'rare',
    effect: 'Pale Academy standing cannot fall below zero.',
    flavorText: 'Unbreakable, unrevokable, and worth precisely nothing outside the building.',
    defense: 3,
  },
  {
    id: 'grimoire_of_footnotes',
    name: 'The Grimoire of Footnotes',
    factionId: 'pale_academy',
    rarity: 'common',
    effect: '+1 Apprentice loyalty each era.',
    flavorText: 'The spells are in the footnotes. The footnotes are in the footnotes.',
    defense: 1,
  },
  {
    id: 'proctors_hourglass',
    name: "The Proctor's Hourglass",
    factionId: 'pale_academy',
    rarity: 'rare',
    effect: 'Delay the prophecy by one era.',
    flavorText: 'Time remaining: always slightly less than you were told.',
    defense: 2,
  },
  {
    id: 'the_unread_thesis',
    name: 'The Unread Thesis',
    factionId: 'pale_academy',
    rarity: 'legendary',
    effect: 'Required for Ascension. Nobody knows what it says.',
    flavorText: 'Four hundred pages. One reader. He is not available for comment.',
    defense: 2,
  },

  // The Verdant Choir
  {
    id: 'antler_circlet',
    name: 'The Antler Circlet',
    factionId: 'verdant_choir',
    rarity: 'common',
    effect: '+10 Followers each era in a wilderness lair.',
    flavorText: 'Grows back if you cut it. Grows back if you do not.',
    defense: 1,
  },
  {
    id: 'mossbound_key',
    name: 'The Mossbound Key',
    factionId: 'verdant_choir',
    rarity: 'common',
    effect: 'Unlocks one blocked lair upgrade.',
    flavorText: 'Opens a door that has not been built yet.',
    defense: 0,
  },
  {
    id: 'choir_reed',
    name: 'The Choir Reed',
    factionId: 'verdant_choir',
    rarity: 'rare',
    effect: 'Verdant hostility spreads at half rate.',
    flavorText: 'One note, held for a century, by shifts.',
    defense: 2,
  },
  {
    id: 'seed_of_the_slow_war',
    name: 'The Seed of the Slow War',
    factionId: 'verdant_choir',
    rarity: 'rare',
    effect: 'Hero threat rises 25% slower.',
    flavorText: 'Plant it and wait. It is already winning.',
    defense: 5,
  },
  {
    id: 'heartwood_stake',
    name: 'The Heartwood Stake',
    factionId: 'verdant_choir',
    rarity: 'common',
    effect: '+3 defense against the Chosen One.',
    flavorText: 'Traditionally used on wizards. Traditions can be redirected.',
    defense: 3,
  },

  // The Crownlands
  {
    id: 'writ_of_attainder',
    name: 'The Writ of Attainder',
    factionId: 'crownlands',
    rarity: 'common',
    effect: '+8 Notoriety once, immediately.',
    flavorText: 'Legally you no longer exist. Practically you are extremely findable.',
    defense: 0,
  },
  {
    id: 'heralds_horn',
    name: "The Herald's Horn",
    factionId: 'crownlands',
    rarity: 'common',
    effect: 'Notoriety decay begins one era later.',
    flavorText: 'Announces your arrival to people who were leaving anyway.',
    defense: 1,
  },
  {
    id: 'crown_assay_weight',
    name: 'The Assay Weight',
    factionId: 'crownlands',
    rarity: 'rare',
    effect: 'Crownlands offers cannot convert to threats.',
    flavorText: 'The standard against which all other things are found wanting.',
    defense: 2,
  },
  {
    id: 'oath_iron',
    name: 'The Oath Iron',
    factionId: 'crownlands',
    rarity: 'rare',
    effect: 'Apprentices cannot betray you.',
    flavorText: 'Cold to everyone who has ever meant it.',
    defense: 4,
  },
  {
    id: 'the_kings_regret',
    name: "The King's Regret",
    factionId: 'crownlands',
    rarity: 'legendary',
    effect: 'The Chosen One arrives one era late, alone, and underfed.',
    flavorText: 'He signed the order at sixteen. He is eighty now and still signing things.',
    defense: 8,
  },

  // The Worm Below
  {
    id: 'worm_tooth',
    name: 'The Worm Tooth',
    factionId: 'worm_below',
    rarity: 'common',
    effect: '+2 Notoriety each era. Followers leave 10% faster.',
    flavorText: 'One of roughly nine thousand. It was not missed.',
    defense: 1,
  },
  {
    id: 'lantern_of_the_deep_shaft',
    name: 'The Lantern of the Deep Shaft',
    factionId: 'worm_below',
    rarity: 'common',
    effect: 'Reveals one hidden offer each era.',
    flavorText: 'Burns downward. The light goes down with it.',
    defense: 0,
  },
  {
    id: 'mantle_of_soil',
    name: 'The Mantle of Soil',
    factionId: 'worm_below',
    rarity: 'common',
    effect: '+2 defense. Pale Academy standing falls each era.',
    flavorText: 'Heavy, warm, and full of things that were recently elsewhere.',
    defense: 2,
  },
  {
    id: 'hollow_reliquary',
    name: 'The Hollow Reliquary',
    factionId: 'worm_below',
    rarity: 'rare',
    effect: 'Keep one relic through Lichdom.',
    flavorText: 'Built to hold a saint. Currently holding a draught.',
    defense: 3,
  },
  {
    id: 'the_long_hunger',
    name: 'The Long Hunger',
    factionId: 'worm_below',
    rarity: 'rare',
    effect: 'Each era, +4 Notoriety and −5 Followers.',
    flavorText: 'It is not the worm that is hungry. The worm is what the hunger uses.',
    defense: 2,
  },
];

// ---------------------------------------------------------------------------
// Lairs
// ---------------------------------------------------------------------------

export const demoLairs: Lair[] = [
  { id: 'culvert', name: 'A Damp Culvert', tier: 0, blurb: 'Rent-free, and worth it.' },
  { id: 'rented_barrow', name: 'The Rented Barrow', tier: 1, blurb: 'Furnished. The furniture objects.' },
  { id: 'gravewick', name: 'Gravewick Hollow', tier: 2, blurb: 'Nine acres, four of them consecrated.' },
  { id: 'thornwick', name: 'Thornwick Tower', tier: 3, blurb: 'Eleven storeys. Two staircases. No agreement between them.' },
  { id: 'quiet_hill', name: 'The Keep of the Quiet Hill', tier: 4, blurb: 'The hill was not always quiet.' },
  { id: 'blackmoat', name: 'Blackmoat Fastness', tier: 5, blurb: 'The moat is not water and has never been water.' },
  { id: 'marrowspire', name: 'The Marrowspire', tier: 6, blurb: 'Visible from three kingdoms, and taxed by two.' },
  { id: 'cloudward', name: 'The Cloudward Citadel', tier: 7, blurb: 'Above the weather. Above the law. Cold.' },
];

// ---------------------------------------------------------------------------
// Origins
// ---------------------------------------------------------------------------

export const demoOrigins: Origin[] = [
  {
    id: 'expelled',
    name: 'Expelled from the Pale Academy',
    blurb: 'You were three weeks from a doctorate. The subject of the thesis is still classified.',
    effects: [
      { t: 'notoriety', v: 8 },
      { t: 'standing', factionId: 'pale_academy', v: -30 },
      { t: 'apprentices', v: 1 },
    ],
  },
  {
    id: 'bog',
    name: 'Self-Taught in a Bog',
    blurb: 'No tutor, no library, no supervision. Sixty villagers who owe you a favour.',
    effects: [
      { t: 'followers', v: 60 },
      { t: 'standing', factionId: 'verdant_choir', v: 20 },
      { t: 'notoriety', v: -4 },
    ],
  },
  {
    id: 'inheritance',
    name: 'Inherited a Tower and Its Debts',
    blurb: 'Your great-aunt left you eleven storeys, a moat, and an arrangement she did not describe.',
    effects: [
      { t: 'lairTier', v: 2 },
      { t: 'pactDebt', v: 2 },
      { t: 'standing', factionId: 'gilded_hand', v: 12 },
    ],
  },
];

export const demoEpithets = ['the Unwashed', 'the Patient', 'of the Long Winter', 'the Twice-Buried'];

// ---------------------------------------------------------------------------
// Endings — every one of them is a biography
// ---------------------------------------------------------------------------

export const demoEndings: Ending[] = [
  {
    id: 'slain_by_chosen_one',
    hint: 'for a name the hero can find',
    name: 'Slain by the Chosen One',
    summary: 'A farm boy with a prophecy and a borrowed sword.',
    narration:
      'He came up the stair alone, which was arrogant, and he was right to be. It took four minutes. Afterwards they found your ledgers, and the ledgers were the problem: seventy years of them, itemised, in your own hand. The kingdom read them aloud at the trial of a dead man and could not decide whether to burn them or file them. They filed them. You are, at present, the longest entry in the Crownlands archive, and the boy is a footnote in your paperwork rather than the other way around.',
    rarity: 'common',
  },
  {
    id: 'sealed_in_gem',
    hint: 'for a famous enemy of the Academy',
    name: 'Sealed in a Gem',
    summary: 'Not dead. Filed.',
    narration:
      'The Academy voted on it, which is the most Academy thing that has ever happened to you. Seventeen to four. You are approximately the size of a plum, entirely conscious, and mounted in a display case with a small brass label that misspells your name. The label has been wrong for a hundred and forty years. Someone will notice. When they open the case to correct it, you will be ready, and you have had a very long time to prepare exactly one sentence.',
    rarity: 'rare',
  },
  {
    id: 'betrayed_by_apprentice',
    hint: 'for a large school and a small wage',
    name: 'Betrayed by an Apprentice',
    summary: 'You taught her everything. She took notes.',
    narration:
      'She had been with you nineteen years and she did it on a Tuesday, in the workroom, using a preparation you had shown her yourself and had praised her for improving. That last part is the part that stings. She kept the tower, the moat, and the name — she signs it exactly as you did, down to the flourish, and the kingdom has not yet worked out that anything changed. In every sense that the archives measure, you are still alive and still working. She just does the work now.',
    rarity: 'common',
  },
  {
    id: 'lichdom',
    hint: 'for one who declines to stop',
    name: 'Lichdom',
    summary: 'The decline stopped. So did most other things.',
    narration:
      'You gave up the relics first — all of them, in a single night, into a hole that did not echo. The followers went the next morning without being asked to. What is left does not decay, does not sleep, and does not particularly want anything, which turns out to be the cost nobody warned you about. You are still in the tower. You will be in the tower for a very long time. On clear nights you can see the lights of the town you used to terrorise, and you remember that you enjoyed it, without being able to remember how.',
    rarity: 'rare',
  },
  {
    id: 'retired_to_swamp',
    hint: 'for a long life and a quiet one',
    name: 'Retired to a Swamp',
    summary: 'Nobody came. That was the plan.',
    narration:
      'The prophecy expired. The boy grew up, married a cooper, and never once came looking. You sold the spire, kept the books, and moved into four rooms above a slow green water where the frogs are the loudest thing for nine miles. You are extremely dangerous and no longer of interest to anyone, which is a combination almost no wizard in recorded history has survived long enough to enjoy. You have a garden. It is, by every account, a very good garden.',
    rarity: 'common',
  },
  {
    id: 'consumed_by_pact',
    hint: 'for a debt carried to the end',
    name: 'Consumed by the Pact',
    summary: 'The interest was always going to be the problem.',
    narration:
      'You read the terms. You want that on the record — you read every line, and you signed anyway, because in the year you signed it the terms were extremely good. They remained extremely good for sixty-one years. The Covenant does not gloat and did not send anyone; a clause simply matured, quietly, the way clauses do, and the tower is now empty and legally theirs. Your name is still on the door. They have not taken it down. It is, in its way, a testimonial.',
    rarity: 'rare',
  },
  {
    id: 'ascension',
    hint: 'for the greatest name and a relic to match',
    name: 'Ascension',
    summary: 'Very few. Fewer who deserved it.',
    narration:
      'It did not look like anything. There was no light, no thunder, no witnesses worth the name — just a tower with nobody in it and a door standing open onto a stair that was not there the day before. The Academy has a word for what you did and refuses to use it in print. The Crownlands has closed the file, which they do not do. Somewhere above the ordinary sky there is now one more thing that was once a person, and it remembers being cold, and being expelled, and being twenty.',
    rarity: 'legendary',
  },
];

// ---------------------------------------------------------------------------
// A completed 16-era run
// ---------------------------------------------------------------------------

type EraSeed = {
  lairId: string;
  notoriety: number;
  followers: number;
  artifactsGained?: string[];
  deed: string;
  option: string;
  outcome: EraRecord['outcome'];
};

const ERA_SEEDS: EraSeed[] = [
  // — Ascent —
  { lairId: 'culvert', notoriety: 6, followers: 62, deed: 'Cursed a millwright over a boundary stone.', option: 'Curse him properly', outcome: 'deterministic' },
  { lairId: 'culvert', notoriety: 11, followers: 88, deed: 'Took in an apprentice with excellent handwriting.', option: 'Accept the applicant', outcome: 'deterministic' },
  { lairId: 'rented_barrow', notoriety: 19, followers: 121, artifactsGained: ['ashen_censer'], deed: 'Signed something at a crossroads at an hour with no name.', option: 'Sign it', outcome: 'success' },
  { lairId: 'rented_barrow', notoriety: 24, followers: 147, deed: 'Three hamlets filed the same complaint independently.', option: 'Do nothing about it', outcome: 'deterministic' },
  { lairId: 'gravewick', notoriety: 33, followers: 210, artifactsGained: ['gilded_ledger'], deed: 'Bought a ledger from a man with no shop.', option: 'Pay in followers', outcome: 'deterministic' },
  { lairId: 'gravewick', notoriety: 41, followers: 268, deed: 'Renamed the hollow after yourself. The maps complied.', option: 'Rename it', outcome: 'success' },
  { lairId: 'thornwick', notoriety: 48, followers: 305, artifactsGained: ['worm_tooth'], deed: 'Went down a shaft. Came back with a tooth.', option: 'Go down', outcome: 'success' },
  { lairId: 'thornwick', notoriety: 57, followers: 361, deed: 'The Academy sent a letter. You had it framed.', option: 'Frame the letter', outcome: 'deterministic' },
  { lairId: 'quiet_hill', notoriety: 66, followers: 428, artifactsGained: ['bone_crown'], deed: 'The Covenant crowned you and took the apprentice as the fee.', option: 'Accept the crown', outcome: 'success' },
  { lairId: 'quiet_hill', notoriety: 74, followers: 466, deed: 'Appeared, by name, in a ledger of dangers.', option: 'Let them write it', outcome: 'deterministic' },

  // — Prophecy fires at era 10 —
  { lairId: 'blackmoat', notoriety: 82, followers: 511, artifactsGained: ['seed_of_the_slow_war'], deed: 'Planted something the Choir said would be ready in a century.', option: 'Plant it anyway', outcome: 'success' },
  { lairId: 'blackmoat', notoriety: 79, followers: 540, deed: 'Doubled the moat. The moat is not water.', option: 'Deepen the moat', outcome: 'deterministic' },
  { lairId: 'marrowspire', notoriety: 77, followers: 588, artifactsGained: ['oath_iron'], deed: 'Bound the household in cold iron and slept badly.', option: 'Bind them', outcome: 'success' },
  { lairId: 'marrowspire', notoriety: 71, followers: 561, deed: 'The boy took the eastern road. Two villages fed him for free.', option: 'Send the ravens', outcome: 'failure' },
  { lairId: 'marrowspire', notoriety: 68, followers: 604, artifactsGained: ['heartwood_stake'], deed: 'Took the stake off a hunter who no longer needed it.', option: 'Take it', outcome: 'success' },
  { lairId: 'cloudward', notoriety: 71, followers: 655, deed: 'Moved above the weather and waited with the door unbarred.', option: 'Leave it open', outcome: 'deterministic' },
];

const PROPHECY_ERA = 10;

const demoEras: EraRecord[] = ERA_SEEDS.map((seed, i) => {
  const prev = i === 0 ? 0 : ERA_SEEDS[i - 1].notoriety;
  return {
    eraIndex: i,
    age: 20 + i * 5,
    lairId: seed.lairId,
    notoriety: seed.notoriety,
    notorietyDelta: seed.notoriety - prev,
    followers: seed.followers,
    artifactsGained: seed.artifactsGained ?? [],
    deedSummary: seed.deed,
    offerId: `demo_offer_${i}`,
    optionLabel: seed.option,
    outcome: seed.outcome,
    phase: i < PROPHECY_ERA ? 'ascent' : 'decline',
  };
});

export const demoRun: RunState = {
  id: 'run_demo_0001',
  seed: 741_853_902,
  wizardName: 'Mordrach Vane',
  epithet: 'of the Long Winter',
  originId: 'expelled',
  age: 95,
  eraIndex: 15,
  eraCount: 16,
  phase: 'decline',
  prophecyEra: PROPHECY_ERA,
  erasSinceProphecy: 5,
  notoriety: 71,
  followers: 655,
  lairId: 'cloudward',
  // The Bone Crown and the Censer went into the hole. Everything else was kept.
  knownArtifactIds: [],
  heroBandSeen: 0,
  heldArtifactIds: ['gilded_ledger', 'worm_tooth', 'seed_of_the_slow_war', 'oath_iron', 'heartwood_stake'],
  factionStanding: {
    ashen_covenant: 62,
    gilded_hand: 18,
    pale_academy: -48,
    verdant_choir: 34,
    crownlands: -76,
    worm_below: 9,
  },
  apprentices: { count: 3, loyalty: 41 },
  pactDebt: 4,
  heroThreat: 63,
  isLich: false,
  eras: demoEras,
  seenOfferIds: demoEras.map((e) => e.offerId),
  ending: 'slain_by_chosen_one',
};

/** A mid-run state, taken at the moment the prophecy fires. */
export const demoRunAtProphecy: RunState = {
  ...demoRun,
  age: 20 + PROPHECY_ERA * 5,
  eraIndex: PROPHECY_ERA,
  phase: 'decline',
  erasSinceProphecy: 0,
  notoriety: 74,
  followers: 466,
  lairId: 'quiet_hill',
  heldArtifactIds: ['ashen_censer', 'gilded_ledger', 'worm_tooth', 'bone_crown'],
  heroThreat: 4,
  eras: demoEras.slice(0, PROPHECY_ERA),
  ending: undefined,
};

/** The anticlimax run — low notoriety, small lair ladder, long life. */
export const demoQuietRun: RunState = {
  ...demoRun,
  id: 'run_demo_0002',
  wizardName: 'Bettany Grull',
  epithet: 'the Patient',
  originId: 'bog',
  notoriety: 34,
  followers: 212,
  lairId: 'gravewick',
  heldArtifactIds: ['antler_circlet', 'mossbound_key'],
  apprentices: { count: 0, loyalty: 0 },
  heroThreat: 12,
  ending: 'retired_to_swamp',
  eras: demoEras.slice(0, 12).map((e, i) => ({
    ...e,
    notoriety: Math.max(8, Math.round(e.notoriety * 0.48)),
    followers: Math.round(e.followers * 0.42),
    lairId: ['culvert', 'culvert', 'rented_barrow', 'rented_barrow', 'gravewick', 'gravewick'][
      Math.min(5, Math.floor(i / 2))
    ],
  })),
  eraCount: 12,
  eraIndex: 11,
  age: 75,
};

// ---------------------------------------------------------------------------
// Collection — partial discovery, which is the whole point of the grid
// ---------------------------------------------------------------------------

export const demoCollection: Collection = {
  version: 1,
  discoveredArtifactIds: [
    'bone_crown',
    'ashen_censer',
    'covenant_brand',
    'gilded_ledger',
    'merchants_thumb',
    'coin_of_the_drowned',
    'chalk_of_correction',
    'grimoire_of_footnotes',
    'antler_circlet',
    'mossbound_key',
    'heartwood_stake',
    'writ_of_attainder',
    'worm_tooth',
    'mantle_of_soil',
    'seed_of_the_slow_war',
    'oath_iron',
  ],
  endingsSeen: ['slain_by_chosen_one', 'retired_to_swamp', 'betrayed_by_apprentice'],
  runsCompleted: 23,
  tutorialSeen: true,
  lastWizardName: 'Malvorn Ashgrave',
  bestNotoriety: 88,
};

/** Run one: nothing found yet. The gap is the point. */
export const demoEmptyCollection: Collection = {
  version: 1,
  discoveredArtifactIds: [],
  endingsSeen: [],
  runsCompleted: 0,
  tutorialSeen: false,
  lastWizardName: '',
  bestNotoriety: 0,
};

export const demoProphecyText =
  'A child was born tonight in a village with one road, to parents who will not understand what they have done. ' +
  'He is eleven hours old. He has been promised your death by four separate authorities, and the promise has been written down.';

export const demoHeroName = 'Aldric of Fennow';

export const DEMO_FACTION_ORDER: FactionId[] = [
  'ashen_covenant',
  'gilded_hand',
  'pale_academy',
  'verdant_choir',
  'crownlands',
  'worm_below',
];
