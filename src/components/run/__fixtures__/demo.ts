/**
 * Hand-written fixture data for building and reviewing the run-loop UI.
 *
 * This is NOT content. The real catalogs live in `src/content/` and are owned
 * by the content agents; this file exists so the presentational components can
 * be built, screenshotted and typechecked while the engine and catalogs are
 * still being written. It is typed against `src/types.ts` so it fails loudly if
 * the contract ever moves under it.
 *
 * The scenario: a mid-decline run, eleven eras deep, prophecy already fired,
 * Notoriety just over the Kingdom-Level threshold and starting to erode.
 */

import type {
  Artifact,
  EraRecord,
  Faction,
  FactionId,
  Lair,
  Offer,
  RunState,
} from '../../../types';
import type { Resolution } from '../resolution';

// ---------------------------------------------------------------------------
// Factions — the fixed recurring cast
// ---------------------------------------------------------------------------

export const demoFactions: Faction[] = [
  {
    id: 'ashen_covenant',
    name: 'The Ashen Covenant',
    blurb: 'A demon-pact cult with excellent bookkeeping.',
    demands: 'Apprentices, and the occasional lung.',
    hostileTo: ['pale_academy', 'crownlands'],
    adjective: 'ashen',
  },
  {
    id: 'gilded_hand',
    name: 'The Gilded Hand',
    blurb: 'Relic merchants. They do not haggle; they wait.',
    demands: 'Followers, paid up front.',
    hostileTo: ['worm_below'],
    adjective: 'gilded',
  },
  {
    id: 'pale_academy',
    name: 'The Pale Academy',
    blurb: 'Your alma mater. They still have your library card.',
    demands: 'Reputation, and a signed apology.',
    hostileTo: ['ashen_covenant', 'worm_below'],
    adjective: 'academic',
  },
  {
    id: 'verdant_choir',
    name: 'The Verdant Choir',
    blurb: 'Druids who sing at your walls until the walls agree.',
    demands: 'Territory, returned to the moss.',
    hostileTo: ['gilded_hand', 'crownlands'],
    adjective: 'verdant',
  },
  {
    id: 'crownlands',
    name: 'The Crownlands',
    blurb: 'A state that produces heroes the way other states produce grain.',
    demands: 'Your surrender, in triplicate.',
    hostileTo: ['ashen_covenant', 'worm_below'],
    adjective: 'crowned',
  },
  {
    id: 'worm_below',
    name: 'The Worm Below',
    blurb: 'It is under the hill. It has been under the hill a long time.',
    demands: 'Everything, eventually.',
    hostileTo: ['pale_academy', 'gilded_hand'],
    adjective: 'sunken',
  },
];

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export const demoArtifacts: Artifact[] = [
  {
    id: 'bone_crown',
    name: 'the Bone Crown',
    factionId: 'ashen_covenant',
    rarity: 'legendary',
    effect: '+4 defense. Whispers the names of your creditors.',
    flavorText: 'Worn by nine wizards. Buried with seven.',
    defense: 4,
  },
  {
    id: 'ashen_censer',
    name: 'the Ashen Censer',
    factionId: 'ashen_covenant',
    rarity: 'common',
    effect: '+1 defense.',
    flavorText: 'Smells of a funeral you were not invited to.',
    defense: 1,
  },
  {
    id: 'debtors_ledger',
    name: "the Debtor's Ledger",
    factionId: 'gilded_hand',
    rarity: 'rare',
    effect: '+2 defense. Nobody will take it from you; they have read it.',
    flavorText: 'Your name appears on page one, in a hand you do not recognise.',
    defense: 2,
  },
  {
    id: 'coin_of_seven_faces',
    name: 'the Coin of Seven Faces',
    factionId: 'gilded_hand',
    rarity: 'common',
    effect: '+1 defense.',
    flavorText: 'Lands on its edge more often than it should.',
    defense: 1,
  },
  {
    id: 'censors_seal',
    name: "the Censor's Seal",
    factionId: 'pale_academy',
    rarity: 'rare',
    effect: '+2 defense. Certain letters never arrive.',
    flavorText: 'Stamped on the expulsion notice. You kept the stamp.',
    defense: 2,
  },
  {
    id: 'antler_diadem',
    name: 'the Antler Diadem',
    factionId: 'verdant_choir',
    rarity: 'rare',
    effect: '+2 defense. Attracts deer, and their opinions.',
    flavorText: 'The Choir want it back. The Choir want everything back.',
    defense: 2,
  },
  {
    id: 'confiscated_warrant',
    name: 'a Confiscated Warrant',
    factionId: 'crownlands',
    rarity: 'common',
    effect: '+1 defense. Legally, you are a filing error.',
    flavorText: 'It has your description and someone else’s crimes.',
    defense: 1,
  },
  {
    id: 'wormglass_lens',
    name: 'the Wormglass Lens',
    factionId: 'worm_below',
    rarity: 'legendary',
    effect: '+5 defense. Shows the room as it will be.',
    flavorText: 'Do not look through it twice in the same week.',
    defense: 5,
  },
];

// ---------------------------------------------------------------------------
// Lairs — the ladder. Names carry the progression.
// ---------------------------------------------------------------------------

export const demoLairs: Lair[] = [
  { id: 'borrowed_cellar', name: 'A Borrowed Cellar', tier: 0, blurb: 'It is not your cellar.' },
  { id: 'crooked_hovel', name: 'The Crooked Hovel', tier: 1, blurb: 'Leans, but decoratively.' },
  { id: 'drowned_chapel', name: 'The Drowned Chapel', tier: 2, blurb: 'Acoustics are unmatched.' },
  { id: 'blackpine_tower', name: 'Blackpine Tower', tier: 3, blurb: 'Forty-one steps. No banister.' },
  { id: 'ossuary_keep', name: 'The Ossuary Keep', tier: 4, blurb: 'Load-bearing ancestors.' },
  { id: 'cathedral_of_ash', name: 'The Cathedral of Ash', tier: 5, blurb: 'Consecrated the wrong way round.' },
  { id: 'hollow_mountain', name: 'The Hollow Mountain', tier: 6, blurb: 'You did not hollow it. You moved in.' },
];

// ---------------------------------------------------------------------------
// Era history — eleven eras, ascent into decline
// ---------------------------------------------------------------------------

export const demoEras: EraRecord[] = [
  {
    eraIndex: 0,
    age: 20,
    lairId: 'borrowed_cellar',
    notoriety: 9,
    notorietyDelta: 9,
    followers: 2,
    artifactsGained: [],
    deedSummary: 'Cursed a well. The well was already bad.',
    offerId: 'first_curse',
    optionLabel: 'Curse the well',
    outcome: 'deterministic',
    phase: 'ascent',
  },
  {
    eraIndex: 1,
    age: 25,
    lairId: 'crooked_hovel',
    notoriety: 17,
    notorietyDelta: 8,
    followers: 14,
    artifactsGained: ['coin_of_seven_faces'],
    deedSummary: 'Bought a hovel from a man who did not own it.',
    offerId: 'gilded_first_sale',
    optionLabel: 'Pay the Gilded Hand',
    outcome: 'success',
    phase: 'ascent',
  },
  {
    eraIndex: 2,
    age: 30,
    lairId: 'crooked_hovel',
    notoriety: 15,
    notorietyDelta: -2,
    followers: 31,
    artifactsGained: [],
    deedSummary: 'Attended a Pale Academy reunion. Was asked to leave.',
    offerId: 'academy_reunion',
    optionLabel: 'Attend under your own name',
    outcome: 'failure',
    phase: 'ascent',
  },
  {
    eraIndex: 3,
    age: 35,
    lairId: 'drowned_chapel',
    notoriety: 28,
    notorietyDelta: 13,
    followers: 96,
    artifactsGained: ['ashen_censer'],
    deedSummary: 'Flooded a chapel and called it renovation.',
    offerId: 'chapel_claim',
    optionLabel: 'Claim the chapel',
    outcome: 'success',
    phase: 'ascent',
  },
  {
    eraIndex: 4,
    age: 40,
    lairId: 'drowned_chapel',
    notoriety: 36,
    notorietyDelta: 8,
    followers: 140,
    artifactsGained: [],
    deedSummary: 'Took an apprentice. Did not read her references.',
    offerId: 'first_apprentice',
    optionLabel: 'Take the apprentice',
    outcome: 'deterministic',
    phase: 'ascent',
  },
  {
    eraIndex: 5,
    age: 45,
    lairId: 'blackpine_tower',
    notoriety: 51,
    notorietyDelta: 15,
    followers: 302,
    artifactsGained: ['censors_seal'],
    deedSummary: 'Occupied Blackpine Tower. The previous tenant is fine.',
    offerId: 'blackpine_seizure',
    optionLabel: 'Take the tower by night',
    outcome: 'success',
    phase: 'ascent',
  },
  {
    eraIndex: 6,
    age: 50,
    lairId: 'blackpine_tower',
    notoriety: 58,
    notorietyDelta: 7,
    followers: 470,
    artifactsGained: [],
    deedSummary: 'Signed the Covenant’s paperwork without reading clause nine.',
    offerId: 'covenant_pact',
    optionLabel: 'Sign the pact',
    outcome: 'deterministic',
    phase: 'ascent',
  },
  {
    eraIndex: 7,
    age: 55,
    lairId: 'ossuary_keep',
    notoriety: 69,
    notorietyDelta: 11,
    followers: 812,
    artifactsGained: ['bone_crown'],
    deedSummary: 'Crowned yourself in a borrowed crypt. Attendance was poor.',
    offerId: 'crown_yourself',
    optionLabel: 'Wear the Bone Crown',
    outcome: 'success',
    phase: 'ascent',
  },
  {
    eraIndex: 8,
    age: 60,
    lairId: 'ossuary_keep',
    notoriety: 78,
    notorietyDelta: 9,
    followers: 1140,
    artifactsGained: [],
    deedSummary: 'Three hamlets renamed you. None of the names were kind.',
    offerId: 'hamlet_naming',
    optionLabel: 'Let them name you',
    outcome: 'deterministic',
    phase: 'ascent',
  },
  {
    eraIndex: 9,
    age: 65,
    lairId: 'cathedral_of_ash',
    notoriety: 84,
    notorietyDelta: 6,
    followers: 1390,
    artifactsGained: ['antler_diadem'],
    deedSummary: 'A child was born in the Crownlands. Bells rang for a week.',
    offerId: 'prophecy',
    optionLabel: 'Ignore the bells',
    outcome: 'deterministic',
    phase: 'decline',
  },
  {
    eraIndex: 10,
    age: 70,
    lairId: 'cathedral_of_ash',
    notoriety: 81,
    notorietyDelta: -3,
    followers: 1284,
    artifactsGained: [],
    deedSummary: 'Doubled the guard. The guard halved itself in protest.',
    offerId: 'double_the_guard',
    optionLabel: 'Double the guard',
    outcome: 'failure',
    phase: 'decline',
  },
];

// ---------------------------------------------------------------------------
// Run state
// ---------------------------------------------------------------------------

const standing: Record<FactionId, number> = {
  ashen_covenant: 46,
  gilded_hand: 12,
  pale_academy: -38,
  verdant_choir: -20,
  crownlands: -61,
  worm_below: 4,
};

export const demoRun: RunState = {
  id: 'run_demo_0001',
  seed: 448271,
  wizardName: 'Malvorn Ashgrave',
  epithet: 'the Unpaid Debt',
  originId: 'expelled_pale_academy',
  age: 75,
  eraIndex: 11,
  eraCount: 18,
  phase: 'decline',
  prophecyEra: 9,
  erasSinceProphecy: 2,
  notoriety: 81,
  followers: 1284,
  lairId: 'cathedral_of_ash',
  // Two of the five held relics are already in this player's collection, so
  // the fixtures can show both states of the "never seen before" mark.
  knownArtifactIds: ['coin_of_seven_faces', 'ashen_censer'],
  heldArtifactIds: [
    'coin_of_seven_faces',
    'ashen_censer',
    'censors_seal',
    'bone_crown',
    'antler_diadem',
  ],
  heroBandSeen: 0,
  factionStanding: standing,
  apprentices: { count: 3, loyalty: 41 },
  pactDebt: 2,
  heroThreat: 34,
  isLich: false,
  eras: demoEras,
  seenOfferIds: demoEras.map((e) => e.offerId),
};

/** Same run, one era in — proves the ledger is elegant when nearly empty too. */
export const demoEarlyRun: RunState = {
  ...demoRun,
  age: 25,
  eraIndex: 1,
  phase: 'ascent',
  notoriety: 9,
  followers: 2,
  lairId: 'borrowed_cellar',
  heldArtifactIds: [],
  heroBandSeen: 0,
  apprentices: { count: 0, loyalty: 0 },
  pactDebt: 0,
  heroThreat: 0,
  erasSinceProphecy: 0,
  eras: demoEras.slice(0, 1),
};

/** Twenty rows, to check the ledger stays composed at length. */
export const demoLongRun: RunState = {
  ...demoRun,
  eraIndex: 20,
  age: 120,
  notoriety: 93,
  eras: [
    ...demoEras,
    ...demoEras.slice(1).map((era, i) => ({
      ...era,
      eraIndex: 11 + i,
      age: 75 + i * 5,
      notoriety: Math.min(99, 78 + i),
      notorietyDelta: i % 3 === 0 ? -4 : 2,
      followers: 1284 + i * 63,
      lairId: i > 4 ? 'hollow_mountain' : 'cathedral_of_ash',
    })),
  ].slice(0, 20),
};

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export const demoOffer: Offer = {
  id: 'covenant_courier',
  title: 'The Covenant Sends a Courier',
  body:
    'He has walked four days to hand you an envelope, and he would like you to know that. ' +
    'Inside: an offer, a wax seal shaped like a molar, and an itemised invoice for the walking.',
  phase: 'decline',
  factionId: 'ashen_covenant',
  options: [
    {
      kind: 'gamble',
      label: "Accept the Covenant's offer",
      odds: 0.35,
      onSuccess: [
        { t: 'notoriety', v: 12 },
        { t: 'artifact', artifactId: 'bone_crown' },
      ],
      onFailure: [
        { t: 'apprentices', v: -1 },
        { t: 'pactDebt', v: 1 },
      ],
      successText: 'The molar seal opens for you. Something on the other side signs its half.',
      failureText: 'Your least favourite apprentice is now the Covenant’s least favourite apprentice.',
    },
    {
      kind: 'certain',
      label: 'Pay the courier and burn the envelope',
      effects: [
        { t: 'followers', v: -60 },
        { t: 'standing', factionId: 'ashen_covenant', v: -8 },
        { t: 'heroThreat', v: -3 },
      ],
      resultText: 'The envelope burns green, which the courier says is normal.',
    },
    {
      kind: 'gamble',
      label: 'Read clause nine aloud, in the courier’s hearing',
      odds: 0.72,
      onSuccess: [
        { t: 'pactDebt', v: -1 },
        { t: 'standing', factionId: 'ashen_covenant', v: 6 },
      ],
      onFailure: [
        { t: 'notoriety', v: -5 },
        { t: 'loyalty', v: -10 },
      ],
      successText: 'Clause nine, read aloud, turns out to be void. The courier is furious about it.',
      failureText: 'Clause nine, read aloud, turns out to be about you.',
    },
  ],
  weight: 2,
};

export const demoOfferB: Offer = {
  id: 'worm_invitation',
  title: 'An Invitation From Under the Hill',
  body:
    'The hill has developed a door. The door has developed manners: it knocks from the inside, ' +
    'politely, at a reasonable hour, and only on days you have already had a difficult morning.',
  phase: 'decline',
  factionId: 'worm_below',
  options: [
    {
      kind: 'certain',
      label: 'Board up the door and say nothing about it',
      effects: [
        { t: 'notoriety', v: -2 },
        { t: 'heroThreat', v: 4 },
      ],
    },
    {
      kind: 'gamble',
      label: 'Send an apprentice through first',
      odds: 0.58,
      onSuccess: [
        { t: 'artifactFrom', factionId: 'worm_below', rarity: 'rare' },
        { t: 'notoriety', v: 7 },
      ],
      onFailure: [
        { t: 'apprentices', v: -1 },
        { t: 'loyalty', v: -18 },
        { t: 'followers', v: -140 },
      ],
      successText: 'She comes back up carrying something, and does not mention the stairs.',
      failureText: 'The door knocks again that evening, politely, at a reasonable hour.',
    },
    {
      kind: 'gamble',
      label: 'Go through yourself, wearing the crown',
      odds: 0.21,
      onSuccess: [
        { t: 'notoriety', v: 15 },
        { t: 'artifact', artifactId: 'wormglass_lens' },
        { t: 'lairTier', v: 1 },
      ],
      onFailure: [{ t: 'ending', endingId: 'consumed_by_pact' }],
      successText: 'The crown was the correct choice of hat. You are expected, and seated.',
      failureText: 'The manners were for the door’s benefit, not yours.',
    },
    {
      kind: 'certain',
      label: 'Move the tower. Leave the hill its door.',
      effects: [
        { t: 'lairTier', v: -1 },
        { t: 'followers', v: -220 },
        { t: 'heroThreat', v: -9 },
        { t: 'loseArtifact' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Resolutions
// ---------------------------------------------------------------------------

export const demoResolutionSuccess: Resolution = {
  outcome: 'success',
  odds: 0.35,
  roll: 0.19,
  appliedEffects: [
    { t: 'notoriety', v: 12 },
    { t: 'artifact', artifactId: 'bone_crown' },
  ],
  text: 'The molar seal opens for you. Something on the other side signs its half.',
  artifactsGained: [demoArtifacts[0]],
  newToCollection: [demoArtifacts[0]],
  notorietyDelta: 12,
  systemic: [],
  eraRecord: {
    eraIndex: 11,
    age: 75,
    lairId: 'cathedral_of_ash',
    notoriety: 93,
    notorietyDelta: 12,
    followers: 1284,
    artifactsGained: ['bone_crown'],
    deedSummary: 'Signed the Covenant’s second envelope. Kept the crown.',
    offerId: 'covenant_courier',
    optionLabel: "Accept the Covenant's offer",
    outcome: 'success',
    phase: 'decline',
  },
};

export const demoResolutionFailure: Resolution = {
  outcome: 'failure',
  odds: 0.35,
  roll: 0.61,
  appliedEffects: [
    { t: 'apprentices', v: -1 },
    { t: 'pactDebt', v: 1 },
  ],
  text: 'Your least favourite apprentice is now the Covenant’s least favourite apprentice.',
  artifactsGained: [],
  newToCollection: [],
  notorietyDelta: 0,
  // The era-end ticks that arrive whatever the card said. A decline era with a
  // school always has one; the demo shows the shape. Pact debt is NOT among
  // them any more — it moves only on a card the player picked.
  systemic: [
    { t: 'loyaltyDrift', v: -5, loyalty: 22 },
    { t: 'heroApproach', band: 'danger', threat: 40, wards: 44 },
  ],
  eraRecord: {
    ...demoResolutionSuccess.eraRecord,
    notoriety: 81,
    notorietyDelta: 0,
    artifactsGained: [],
    deedSummary: 'Traded an apprentice for a debt. The paperwork was immaculate.',
    outcome: 'failure',
  },
};

/** The celebrated crossing — Kingdom-Level at 75. Should read as an event. */
export const demoResolutionTierCross: Resolution = {
  ...demoResolutionSuccess,
  tierCrossed: {
    id: 'legend',
    name: 'Legend',
    min: 90,
    max: 99,
    line: 'Mothers use your name to end arguments.',
    celebrate: true,
  },
};

export const demoResolutionDeterministic: Resolution = {
  outcome: 'deterministic',
  appliedEffects: [
    { t: 'followers', v: -60 },
    { t: 'standing', factionId: 'ashen_covenant', v: -8 },
    { t: 'heroThreat', v: -3 },
  ],
  text: 'The envelope burns green, which the courier says is normal.',
  artifactsGained: [],
  newToCollection: [],
  systemic: [],
  notorietyDelta: 0,
  eraRecord: {
    ...demoResolutionFailure.eraRecord,
    deedSummary: 'Burned a Covenant envelope. Paid for the walking anyway.',
    outcome: 'deterministic',
  },
};
