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
 * Wards are derived from `rarity` alone (`RELIC_WARDS` in
 * `src/engine/constants.ts`, issue #79) — no `defense` or `effect` field
 * lives here any more. `flavorText` is the whole of each relic's identity
 * until a power slice of issue #77 gives it one.
 *
 * `power` (issue #80, slice 3 of #77) is `null` for every relic a power
 * slice has not reached yet — required, not optional, so the compiler names
 * every entry the moment a new slice starts filling them in. This slice
 * gives exactly the four origin relics a power: `footnote_that_bites`,
 * `mantle_of_slow_moss`, `ashen_signature`, `unpaid_purse` — see
 * `src/content/origins.ts` for the grant, and CLAUDE.md's rule 1 for why each
 * one's `effects` are plain `RelicEffect`s the offer/resolution cards can
 * always print, never prose restating what the power line already says.
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
    flavorText:
      'It fits everyone, which should tell you something about how it was measured.',
    power: null,
  },
  {
    id: 'ashen_signature',
    name: 'The Ashen Signature',
    factionId: 'ashen_covenant',
    rarity: 'common',
    flavorText:
      'A quill that will not write anything its holder would later deny having said. Popular with the Covenant’s notaries and with nobody else alive.',
    // The Inherited-a-Tower origin's relic (issue #80): a debt still gets
    // signed, but the FIRST time a CHOICE signs one, the quill leaves out a
    // clause. `watchesPositive`, not `if` — this origin's own starting grant
    // already puts the wizard in debt before any choice is ever made, so an
    // ambient "debt >= 1" gate would fire on era one regardless of what era
    // one's choice actually did (see `RelicPower`'s doc comment in
    // `types.ts`). Once only — `RunState.relicState` remembers it fired —
    // because the Signature has one favour in it, not a standing discount.
    power: {
      kind: 'trigger',
      when: 'onChoice',
      once: true,
      watchesPositive: 'pactDebt',
      effects: [{ t: 'pactDebt', v: -1 }],
    },
  },
  {
    id: 'censer_of_small_regrets',
    name: 'Censer of Small Regrets',
    factionId: 'ashen_covenant',
    rarity: 'common',
    flavorText:
      'Burns whatever you are least proud of. An ordinary life fuels it for a week. Yours gets it through a long evening.',
    power: null,
  },
  {
    id: 'ninth_clause_brazier',
    name: 'Brazier of the Ninth Clause',
    factionId: 'ashen_covenant',
    rarity: 'rare',
    flavorText:
      'The first eight clauses concern delivery, scheduling, and the condition of the room. The ninth is why the brazier exists, and is not read aloud in company.',
    power: null,
  },
  {
    id: 'cinder_testament',
    name: 'The Cinder Testament',
    factionId: 'ashen_covenant',
    rarity: 'legendary',
    flavorText:
      'Every pact the Covenant has ever signed, bound in one volume, in the order they were made. Your name is in it. It was in it before you signed.',
    // Issue #81, slice 4 of #77: every choice that adds Pact Debt gets the
    // Testament's own attention, not once but every time — the ledger keeps
    // its own tally regardless of what `ashen_signature` (issue #80) already
    // discounted on the same run. `watchesPositive`, not `if`: reads the
    // CHOICE's own landed effects, so a run that merely starts or sits in
    // debt (an origin's own grant, an earlier era) never arms it on its own.
    // Magnitude is a placeholder; the sim tunes it.
    power: {
      kind: 'trigger',
      when: 'onChoice',
      watchesPositive: 'pactDebt',
      effects: [{ t: 'notoriety', v: 3 }],
    },
  },

  // ---------------------------------------------------------------------
  // The Gilded Hand — value, provenance, terms of sale
  // ---------------------------------------------------------------------
  {
    id: 'appraisers_monocle',
    name: 'The Appraiser’s Monocle',
    factionId: 'gilded_hand',
    rarity: 'common',
    flavorText:
      'Reveals the true worth of any object, expressed as the figure its owner would accept on a sufficiently bad day.',
    power: null,
  },
  {
    id: 'counterfeit_soul',
    name: 'The Counterfeit Soul',
    factionId: 'gilded_hand',
    rarity: 'common',
    flavorText:
      'Not a soul. Indistinguishable from one under examination, which the Hand maintains is the same thing at the point of sale.',
    power: null,
  },
  {
    id: 'unpaid_purse',
    name: 'The Unpaid Purse',
    factionId: 'gilded_hand',
    rarity: 'common',
    flavorText:
      'Contains precisely what you are owed. It is usually empty, and the Hand regards this as an accurate instrument rather than a broken one.',
    // The Sold-Your-Master's-Estate origin's relic (issue #80): the Purse
    // makes good on its own name whenever the household is thin. Every era,
    // not once — a purse this literal pays out for as long as you stay owed.
    power: {
      kind: 'trigger',
      when: 'eraEnd',
      if: [{ c: 'maxFollowers', v: 9 }],
      effects: [{ t: 'followers', v: 10 }],
    },
  },
  {
    id: 'key_to_no_particular_door',
    name: 'The Key to No Particular Door',
    factionId: 'gilded_hand',
    rarity: 'rare',
    flavorText:
      'Opens one door, once, somewhere. Sold honestly, at a fair price, with the limitation stated in advance, and there has never been a complaint the Hand was obliged to hear.',
    power: null,
  },
  {
    id: 'gilded_thumb',
    name: 'The Gilded Thumb',
    factionId: 'gilded_hand',
    rarity: 'rare',
    flavorText:
      'For weighing. It adds exactly as much as is customary, and what is customary has never been written down.',
    power: null,
  },
  {
    id: 'final_ledger',
    name: 'The Final Ledger',
    factionId: 'gilded_hand',
    rarity: 'legendary',
    flavorText:
      'Records every transaction the Hand has ever completed, including several you have not made yet. The Hand insists this is not a threat. It is, however, an invoice.',
    // Issue #81, slice 4 of #77: the catalog's first active. `grants` names
    // the rarity; `activateRelic` (src/engine/relics.ts) decides WHICH
    // faction at the moment of use — your best-standing one, whichever that
    // is then — because a relic power is data about the relic, not a
    // forecast of who a given career will favour. Magnitude (the Followers
    // cost) is a placeholder; the sim tunes it.
    power: { kind: 'active', cost: [{ t: 'followers', v: -25 }], effects: [], grants: { rarity: 'rare' } },
  },

  // ---------------------------------------------------------------------
  // The Pale Academy — instruments, apparatus, citation
  // ---------------------------------------------------------------------
  {
    id: 'chalk_of_the_last_lecture',
    name: 'Chalk of the Last Lecture',
    factionId: 'pale_academy',
    rarity: 'common',
    flavorText:
      'Writes on any surface and cannot be wiped away by the hand that wrote it. Three lecture halls have been abandoned rather than repainted.',
    power: null,
  },
  {
    id: 'tenure_ring',
    name: 'The Tenure Ring',
    factionId: 'pale_academy',
    rarity: 'common',
    flavorText:
      'Cannot be removed by any force, including the wearer’s employer. That is the entire enchantment.',
    power: null,
  },
  {
    id: 'footnote_that_bites',
    name: 'The Footnote That Bites',
    factionId: 'pale_academy',
    rarity: 'common',
    flavorText:
      'Small, at the bottom of the page, and load-bearing. Two scholars have died disagreeing with it, and neither death is in dispute.',
    // The Expelled-from-the-Pale-Academy origin's relic (issue #80): the
    // footnote bites back at whoever comes after you for a courted faction —
    // half as hard. A passive, so the halving is already in the number a
    // card projects, never a separate disclosed line (rule 1).
    power: { kind: 'passive', modifier: { t: 'contagionLossMultiplier', v: 0.5 } },
  },
  {
    id: 'spectacles_of_the_third_reading',
    name: 'Spectacles of the Third Reading',
    factionId: 'pale_academy',
    rarity: 'rare',
    flavorText:
      'Show what a document will mean once it has been argued over for eleven years. Wearing them is exhausting, and the Academy issues them accordingly.',
    power: null,
  },
  {
    id: 'pale_orrery',
    name: 'The Pale Orrery',
    factionId: 'pale_academy',
    rarity: 'legendary',
    flavorText:
      'Models the heavens accurately, including the parts that have not happened yet. It is kept in a room with no door, on the reasoning that a locked door implies somebody, somewhere, has a key.',
    // Issue #81, slice 4 of #77: the catalog's second active. `armsForesight`
    // sets `RunState.relicState.foresight`, which `effectiveOdds`
    // (src/engine/relics.ts) reads to make the very next gamble certain —
    // the card shows 100% because the odds genuinely are, not because the
    // card is lying for once. No cost: the Orrery only ever fires once in a
    // career, which is the whole price.
    power: { kind: 'active', effects: [], armsForesight: true },
  },

  // ---------------------------------------------------------------------
  // The Verdant Choir — growth, weather, standing timber
  // ---------------------------------------------------------------------
  {
    id: 'antler_baton',
    name: 'The Antler Baton',
    factionId: 'verdant_choir',
    rarity: 'common',
    flavorText:
      'Held by whoever is speaking. The Choir’s entire constitutional order is this stick and an agreement about this stick.',
    power: null,
  },
  {
    id: 'seed_that_remembers',
    name: 'The Seed That Remembers',
    factionId: 'verdant_choir',
    rarity: 'common',
    flavorText:
      'Grows into whatever was standing on that spot before. Do not plant it near anything you built.',
    power: null,
  },
  {
    id: 'mantle_of_slow_moss',
    name: 'Mantle of Slow Moss',
    factionId: 'verdant_choir',
    rarity: 'common',
    flavorText:
      'Warm, waterproof, and growing. Around the fourth year it stops being clothing and becomes a position the Choir holds about you.',
    // The Self-Taught-in-a-Bog origin's relic (issue #80): the moss keeps
    // making its case to the Choir on your behalf, every era, with no
    // decision from you — and it spills like any other standing gain, so a
    // wizard hostile to the Choir's enemies sees that cost too (rule 1).
    power: {
      kind: 'trigger',
      when: 'eraEnd',
      effects: [{ t: 'standing', factionId: 'verdant_choir', v: 2 }],
    },
  },
  {
    id: 'weather_leash',
    name: 'The Weather Leash',
    factionId: 'verdant_choir',
    rarity: 'rare',
    flavorText:
      'One storm, kept. It is fed weekly, and it does know the difference between you and everyone else in the room.',
    power: null,
  },
  {
    id: 'root_of_the_standing_vote',
    name: 'The Root of the Standing Vote',
    factionId: 'verdant_choir',
    rarity: 'rare',
    flavorText:
      'An oak stump entitled to speak in Choir assembly. It has never abstained, and its record on questions of masonry is unbroken.',
    power: null,
  },
  {
    id: 'old_growth_charter',
    name: 'The Old-Growth Charter',
    factionId: 'verdant_choir',
    rarity: 'legendary',
    flavorText:
      'A tree old enough to have voted against the Choir’s founding charter, and lost. It has not forgiven this. Neither, structurally, has the charter.',
    // Issue #81, slice 4 of #77: "gaining Choir standing costs its enemies
    // nothing" — scoped to `verdant_choir` alone via `factionId`, unlike
    // `footnote_that_bites`'s own unscoped halving (issue #80). A player
    // holding both zeroes Choir contagion outright and still halves every
    // OTHER faction's, per `relicRules`' own combination rule.
    power: { kind: 'passive', modifier: { t: 'contagionLossMultiplier', v: 0, factionId: 'verdant_choir' } },
  },

  // ---------------------------------------------------------------------
  // The Crownlands — heraldry, law, siege, bloodline
  // ---------------------------------------------------------------------
  {
    id: 'writ_of_tolerated_existence',
    name: 'Writ of Tolerated Existence',
    factionId: 'crownlands',
    rarity: 'common',
    flavorText:
      'Certifies that the Crownlands are aware of you and have elected, for the present, to file rather than to act. Renewable annually. Never renewed on time.',
    power: null,
  },
  {
    id: 'confiscated_banner',
    name: 'The Confiscated Banner',
    factionId: 'crownlands',
    rarity: 'common',
    flavorText:
      'Taken from a rebellion the Crown does not concede occurred. It still smells of the field, which the archivists have stopped raising.',
    power: null,
  },
  {
    id: 'portcullis_tooth',
    name: 'The Portcullis Tooth',
    factionId: 'crownlands',
    rarity: 'rare',
    flavorText:
      'A single iron spike from the gate at Hollow March, which held for nine days against something that does not appear anywhere in the report.',
    power: null,
  },
  {
    id: 'sword_that_was_returned',
    name: 'The Sword That Was Returned',
    factionId: 'crownlands',
    rarity: 'rare',
    flavorText:
      'A hero’s blade, handed back by the hero, in person, with a short statement the Crown has sealed for two hundred years.',
    power: null,
  },
  {
    id: 'unbroken_line',
    name: 'The Unbroken Line',
    factionId: 'crownlands',
    rarity: 'legendary',
    flavorText:
      'The complete genealogy of the hero-bloodline, sealed in one roll. Whoever holds it holds the name of the Chosen One’s grandmother, and every party to the matter understands what that means.',
    // Issue #81, slice 4 of #77: "your fame feeds the hero's threat at half
    // the rate" — halves the `HERO_FAME_COEF * notoriety` term of
    // `threatGainFor` alone (src/engine/systems.ts); the clock term
    // (`HERO_THREAT_BASE`/`HERO_THREAT_RAMP`) still runs at its ordinary
    // pace. Magnitude is a placeholder; the sim tunes it.
    power: { kind: 'passive', modifier: { t: 'fameThreatMultiplier', v: 0.5 } },
  },

  // ---------------------------------------------------------------------
  // The Worm Below — soil, appetite, patience
  // ---------------------------------------------------------------------
  {
    id: 'pocketful_of_dark',
    name: 'A Pocketful of Dark',
    factionId: 'worm_below',
    rarity: 'common',
    flavorText:
      'Genuine subterranean darkness, portable, still cold from the journey. It keeps for about a century. This one is not fresh.',
    power: null,
  },
  {
    id: 'shallow_worms_tooth',
    name: 'The Shallow Worm’s Tooth',
    factionId: 'worm_below',
    rarity: 'common',
    flavorText:
      'From one of the small ones. The Worm Below regards the small ones the way a country regards its coastline: an outer edge, and not the country.',
    power: null,
  },
  {
    id: 'patient_lantern',
    name: 'The Patient Lantern',
    factionId: 'worm_below',
    rarity: 'rare',
    flavorText:
      'It casts no light. It shows you the way regardless, and it does not hurry, and it will go on showing you the way for some time after you have stopped walking.',
    power: null,
  },
  {
    id: 'second_stomach',
    name: 'The Second Stomach',
    factionId: 'worm_below',
    rarity: 'rare',
    flavorText:
      'Yours now. It digests what the first one declined, and it has firm views about the schedule.',
    power: null,
  },
  {
    id: 'long_appetite',
    name: 'The Long Appetite',
    factionId: 'worm_below',
    rarity: 'legendary',
    flavorText:
      'The Worm’s hunger, decanted and worn at the hip. It is not a weapon. It is a share, and shares can be called in.',
    // Issue #81, slice 4 of #77: "+1 Notoriety per 10 Followers spent" —
    // proportional to a choice's own cost, which `scaled` (not a fixed
    // `effects` entry) reads off the SAME source `watchesPositive` does: the
    // chosen option's own landed effects, never the ambient run, so paying
    // down debt with a stash you already had before this choice never fires
    // it on its own. Magnitudes are placeholders; the sim tunes them.
    power: {
      kind: 'trigger',
      when: 'onChoice',
      effects: [],
      scaled: { watches: 'followers', perUnit: 10, perUnitEffect: { t: 'notoriety', v: 1 } },
    },
  },
];
