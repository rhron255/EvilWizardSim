import type { Artifact } from '../types';

/**
 * Thirty-two artifacts: 16 common, 10 rare, 6 legendary.
 *
 * Five per faction, except the Hand and the Choir, which carry six apiece
 * since #22 gave each a legendary of its own. The thematic binding is the
 * whole point — a player should be able to learn "the Covenant has the
 * bone-and-contract material, the Hand has the money, the Worm has the dark"
 * and turn that into routing.
 *
 * The first four legendaries sat in the most hostile corner of the faction web
 * (Covenant, Academy, Crown, Worm — a knot in which almost everyone is hostile
 * to almost everyone), so reaching any one of them meant committing to a
 * faction hard enough to open its reliquary. The Hand's is the odd one out:
 * the Hand is hostile to nobody but the Choir, and the Choir to it, so buying
 * either legendary is a comparatively cheap route in — see the note on
 * `ASCENSION_MIN_NOTORIETY` in src/engine/constants.ts for how that got priced
 * in. Ascension asks for ONE legendary from any faction plus Kingdom-level
 * fame, and those two pull against each other — see `ASCENSION_LEGENDARIES`
 * for why it is not two.
 *
 * Each carries exactly ONE `power`, and the player-facing line is derived from
 * it rather than authored beside it — see `ArtifactPower` in `src/types.ts`.
 * Before that, all thirty-two did the same thing (`Defense +N`) and differed
 * only in name and flavour, which is issue #6: strip the prose and the grid was
 * one stat in thirty-two costumes.
 *
 * A power is chosen to follow from the relic's OWN flavour, never dealt out to
 * fill a quota — the Orrery models parts of the heavens that have not happened
 * yet, so it sees the hero coming (`vigil`); the Gilded Thumb "adds exactly as
 * much as is customary", so it is the Hand's thumb on every price (`haggle`);
 * the Old-Growth Charter is a tree that lost a vote and has not forgiven it, so
 * it is standing incarnate (`grace`). Each faction's legendary carries that
 * faction's signature power.
 *
 * All the comedy is in `flavorText`. The numbers under it stay straight-faced.
 */
export const artifacts: Artifact[] = [
  // ---------------------------------------------------------------------
  // The Ashen Covenant — bone, ash, signatures, terms
  // ---------------------------------------------------------------------
  {
    id: 'bone_crown',
    name: 'The Bone Crown',
    factionId: 'ashen_covenant',
    rarity: 'common',
    power: { p: 'wards', v: 2 },
    flavorText:
      'It fits everyone, which should tell you something about how it was measured.',
  },
  {
    id: 'ashen_signature',
    name: 'The Ashen Signature',
    factionId: 'ashen_covenant',
    rarity: 'common',
    power: { p: 'grace', v: 1 },
    flavorText:
      'A quill that will not write anything its holder would later deny having said. Popular with the Covenant’s notaries and with nobody else alive.',
  },
  {
    id: 'censer_of_small_regrets',
    name: 'Censer of Small Regrets',
    factionId: 'ashen_covenant',
    rarity: 'common',
    power: { p: 'undimmed', v: 1 },
    flavorText:
      'Burns whatever you are least proud of. An ordinary life fuels it for a week. Yours gets it through a long evening.',
  },
  {
    id: 'ninth_clause_brazier',
    name: 'Brazier of the Ninth Clause',
    factionId: 'ashen_covenant',
    rarity: 'rare',
    power: { p: 'grace', v: 2 },
    flavorText:
      'The first eight clauses concern delivery, scheduling, and the condition of the room. The ninth is why the brazier exists, and is not read aloud in company.',
  },
  {
    id: 'cinder_testament',
    name: 'The Cinder Testament',
    factionId: 'ashen_covenant',
    rarity: 'legendary',
    power: { p: 'undimmed', v: 3 },
    flavorText:
      'Every pact the Covenant has ever signed, bound in one volume, in the order they were made. Your name is in it. It was in it before you signed.',
  },

  // ---------------------------------------------------------------------
  // The Gilded Hand — value, provenance, terms of sale
  // ---------------------------------------------------------------------
  {
    id: 'appraisers_monocle',
    name: 'The Appraiser’s Monocle',
    factionId: 'gilded_hand',
    rarity: 'common',
    power: { p: 'haggle', v: 2 },
    flavorText:
      'Reveals the true worth of any object, expressed as the figure its owner would accept on a sufficiently bad day.',
  },
  {
    id: 'counterfeit_soul',
    name: 'The Counterfeit Soul',
    factionId: 'gilded_hand',
    rarity: 'common',
    power: { p: 'wards', v: 1 },
    flavorText:
      'Not a soul. Indistinguishable from one under examination, which the Hand maintains is the same thing at the point of sale.',
  },
  {
    id: 'unpaid_purse',
    name: 'The Unpaid Purse',
    factionId: 'gilded_hand',
    rarity: 'common',
    power: { p: 'haggle', v: 3 },
    flavorText:
      'Contains precisely what you are owed. It is usually empty, and the Hand regards this as an accurate instrument rather than a broken one.',
  },
  {
    id: 'key_to_no_particular_door',
    name: 'The Key to No Particular Door',
    factionId: 'gilded_hand',
    rarity: 'rare',
    power: { p: 'wards', v: 4 },
    flavorText:
      'Opens one door, once, somewhere. Sold honestly, at a fair price, with the limitation stated in advance, and there has never been a complaint the Hand was obliged to hear.',
  },
  {
    id: 'gilded_thumb',
    name: 'The Gilded Thumb',
    factionId: 'gilded_hand',
    rarity: 'rare',
    power: { p: 'haggle', v: 4 },
    flavorText:
      'For weighing. It adds exactly as much as is customary, and what is customary has never been written down.',
  },
  {
    id: 'final_ledger',
    name: 'The Final Ledger',
    factionId: 'gilded_hand',
    rarity: 'legendary',
    power: { p: 'haggle', v: 5 },
    flavorText:
      'Records every transaction the Hand has ever completed, including several you have not made yet. The Hand insists this is not a threat. It is, however, an invoice.',
  },

  // ---------------------------------------------------------------------
  // The Pale Academy — instruments, apparatus, citation
  // ---------------------------------------------------------------------
  {
    id: 'chalk_of_the_last_lecture',
    name: 'Chalk of the Last Lecture',
    factionId: 'pale_academy',
    rarity: 'common',
    power: { p: 'discipline', v: 1 },
    flavorText:
      'Writes on any surface and cannot be wiped away by the hand that wrote it. Three lecture halls have been abandoned rather than repainted.',
  },
  {
    id: 'tenure_ring',
    name: 'The Tenure Ring',
    factionId: 'pale_academy',
    rarity: 'common',
    power: { p: 'wards', v: 2 },
    flavorText:
      'Cannot be removed by any force, including the wearer’s employer. That is the entire enchantment.',
  },
  {
    id: 'footnote_that_bites',
    name: 'The Footnote That Bites',
    factionId: 'pale_academy',
    rarity: 'common',
    power: { p: 'vigil', v: 1 },
    flavorText:
      'Small, at the bottom of the page, and load-bearing. Two scholars have died disagreeing with it, and neither death is in dispute.',
  },
  {
    id: 'spectacles_of_the_third_reading',
    name: 'Spectacles of the Third Reading',
    factionId: 'pale_academy',
    rarity: 'rare',
    power: { p: 'discipline', v: 2 },
    flavorText:
      'Show what a document will mean once it has been argued over for eleven years. Wearing them is exhausting, and the Academy issues them accordingly.',
  },
  {
    id: 'pale_orrery',
    name: 'The Pale Orrery',
    factionId: 'pale_academy',
    rarity: 'legendary',
    power: { p: 'vigil', v: 2 },
    flavorText:
      'Models the heavens accurately, including the parts that have not happened yet. It is kept in a room with no door, on the reasoning that a locked door implies somebody, somewhere, has a key.',
  },

  // ---------------------------------------------------------------------
  // The Verdant Choir — growth, weather, standing timber
  // ---------------------------------------------------------------------
  {
    id: 'antler_baton',
    name: 'The Antler Baton',
    factionId: 'verdant_choir',
    rarity: 'common',
    power: { p: 'discipline', v: 1 },
    flavorText:
      'Held by whoever is speaking. The Choir’s entire constitutional order is this stick and an agreement about this stick.',
  },
  {
    id: 'seed_that_remembers',
    name: 'The Seed That Remembers',
    factionId: 'verdant_choir',
    rarity: 'common',
    power: { p: 'undimmed', v: 1 },
    flavorText:
      'Grows into whatever was standing on that spot before. Do not plant it near anything you built.',
  },
  {
    id: 'mantle_of_slow_moss',
    name: 'Mantle of Slow Moss',
    factionId: 'verdant_choir',
    rarity: 'common',
    power: { p: 'wards', v: 2 },
    flavorText:
      'Warm, waterproof, and growing. Around the fourth year it stops being clothing and becomes a position the Choir holds about you.',
  },
  {
    id: 'weather_leash',
    name: 'The Weather Leash',
    factionId: 'verdant_choir',
    rarity: 'rare',
    power: { p: 'wards', v: 5 },
    flavorText:
      'One storm, kept. It is fed weekly, and it does know the difference between you and everyone else in the room.',
  },
  {
    id: 'root_of_the_standing_vote',
    name: 'The Root of the Standing Vote',
    factionId: 'verdant_choir',
    rarity: 'rare',
    power: { p: 'grace', v: 2 },
    flavorText:
      'An oak stump entitled to speak in Choir assembly. It has never abstained, and its record on questions of masonry is unbroken.',
  },
  {
    id: 'old_growth_charter',
    name: 'The Old-Growth Charter',
    factionId: 'verdant_choir',
    rarity: 'legendary',
    power: { p: 'grace', v: 3 },
    flavorText:
      'A tree old enough to have voted against the Choir’s founding charter, and lost. It has not forgiven this. Neither, structurally, has the charter.',
  },

  // ---------------------------------------------------------------------
  // The Crownlands — heraldry, law, siege, bloodline
  // ---------------------------------------------------------------------
  {
    id: 'writ_of_tolerated_existence',
    name: 'Writ of Tolerated Existence',
    factionId: 'crownlands',
    rarity: 'common',
    power: { p: 'vigil', v: 1 },
    flavorText:
      'Certifies that the Crownlands are aware of you and have elected, for the present, to file rather than to act. Renewable annually. Never renewed on time.',
  },
  {
    id: 'confiscated_banner',
    name: 'The Confiscated Banner',
    factionId: 'crownlands',
    rarity: 'common',
    power: { p: 'wards', v: 1 },
    flavorText:
      'Taken from a rebellion the Crown does not concede occurred. It still smells of the field, which the archivists have stopped raising.',
  },
  {
    id: 'portcullis_tooth',
    name: 'The Portcullis Tooth',
    factionId: 'crownlands',
    rarity: 'rare',
    power: { p: 'wards', v: 5 },
    flavorText:
      'A single iron spike from the gate at Hollow March, which held for nine days against something that does not appear anywhere in the report.',
  },
  {
    id: 'sword_that_was_returned',
    name: 'The Sword That Was Returned',
    factionId: 'crownlands',
    rarity: 'rare',
    power: { p: 'vigil', v: 2 },
    flavorText:
      'A hero’s blade, handed back by the hero, in person, with a short statement the Crown has sealed for two hundred years.',
  },
  {
    id: 'unbroken_line',
    name: 'The Unbroken Line',
    factionId: 'crownlands',
    rarity: 'legendary',
    power: { p: 'vigil', v: 3 },
    flavorText:
      'The complete genealogy of the hero-bloodline, sealed in one roll. Whoever holds it holds the name of the Chosen One’s grandmother, and every party to the matter understands what that means.',
  },

  // ---------------------------------------------------------------------
  // The Worm Below — soil, appetite, patience
  // ---------------------------------------------------------------------
  {
    id: 'pocketful_of_dark',
    name: 'A Pocketful of Dark',
    factionId: 'worm_below',
    rarity: 'common',
    power: { p: 'undimmed', v: 1 },
    flavorText:
      'Genuine subterranean darkness, portable, still cold from the journey. It keeps for about a century. This one is not fresh.',
  },
  {
    id: 'shallow_worms_tooth',
    name: 'The Shallow Worm’s Tooth',
    factionId: 'worm_below',
    rarity: 'common',
    power: { p: 'vigil', v: 1 },
    flavorText:
      'From one of the small ones. The Worm Below regards the small ones the way a country regards its coastline: an outer edge, and not the country.',
  },
  {
    id: 'patient_lantern',
    name: 'The Patient Lantern',
    factionId: 'worm_below',
    rarity: 'rare',
    power: { p: 'undimmed', v: 2 },
    flavorText:
      'It casts no light. It shows you the way regardless, and it does not hurry, and it will go on showing you the way for some time after you have stopped walking.',
  },
  {
    id: 'second_stomach',
    name: 'The Second Stomach',
    factionId: 'worm_below',
    rarity: 'rare',
    power: { p: 'wards', v: 6 },
    flavorText:
      'Yours now. It digests what the first one declined, and it has firm views about the schedule.',
  },
  {
    id: 'long_appetite',
    name: 'The Long Appetite',
    factionId: 'worm_below',
    rarity: 'legendary',
    power: { p: 'wards', v: 10 },
    flavorText:
      'The Worm’s hunger, decanted and worn at the hip. It is not a weapon. It is a share, and shares can be called in.',
  },
];
