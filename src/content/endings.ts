import type { Ending } from '../types';

/**
 * The endings: the original seven, then the six faction reprisals — of which
 * `sealed_in_gem` was always one and did not know it — then five faction
 * leadership endings. `lichdom`, above, is the Worm Below's sixth; see
 * `LEADERSHIP_BY_FACTION` in `src/engine/endings.ts`.
 *
 * THE RULE: there is no fail state. Every narration below is a biography, not
 * a verdict — see `wiki/06_reference_analysis.md` principle 8. The game does
 * not grade the run, it narrates it. Nothing here may read as "you lost,"
 * least of all the swamp, which is the anticlimax ending and therefore the one
 * that has to work hardest.
 *
 * The five reprisals added by issue #14 all use `codaMode: 'fixed'`, and they
 * are the first content in the game to do so. A reprisal is FACTION-shaped
 * rather than fame-shaped: what the Choir does with the ground reads the same
 * whether three hamlets noticed or four kingdoms did, and five paraphrases of
 * that thought would be filler. The original seven stay `tiered` because how
 * much the world noticed IS their subject. See `EndingCoda` in `types.ts`.
 *
 * The five leadership endings that follow the reprisals below are `fixed` for
 * the identical reason: a crown is faction-shaped, not fame-shaped, and "the
 * Academy made you its Archmage" does not vary with how many hamlets noticed.
 */
export const endings: Ending[] = [
  {
    id: 'slain_by_chosen_one',
    name: 'Slain by the Chosen One',
    summary: 'A sword, a teenager, and a bounty paid in three instalments.',
    hint: 'for a name the hero can find',
    narration:
      'The Chosen One was nineteen, carried a sword his grandmother had kept oiled for precisely this, and said nothing clever before or after. It was quick, and competent, and there is no version of the account where you get a line. The Crownlands paid the bounty in three instalments and lost the paperwork on the third. Somebody has already set it to music, in a key that makes you taller. You had a long life; the one who ended it gets introduced, for the rest of theirs, as the one who did.',
    codaMode: 'tiered',
    coda: {
      unknown: 'The hero had to explain who you were twice before anyone would fund the trip.',
      local_menace: 'Three hamlets split the cost of the sword and considered it a cheap winter.',
      named_threat: 'Your entry is closed with a tick, which was always the most it was going to do.',
      kingdom: 'The Crownlands had budgeted for you since before the hero could walk.',
      legend: 'The song does not bother with your name. Everyone supplies that part themselves.',
    },
    rarity: 'common',
  },
  {
    id: 'sealed_in_gem',
    name: 'Sealed in a Gem',
    summary: 'Compressed by committee. Currently a flaw in an amethyst, and waiting.',
    hint: 'for a famous enemy of the Academy',
    narration:
      'They could not kill you — noted at the time with some irritation — so they compressed you instead. The rite took eleven practitioners, two days, and a cart. You are presently a flaw in an amethyst the size of a fist: catalogued, insured, and dusted on Thursdays. You are aware of the Thursdays. Sooner or later a curious child, an earth tremor, or a bored archivist will undo what eleven experts spent two days achieving, and you have nothing to do but be right about that.',
    codaMode: 'tiered',
    coda: {
      unknown: 'The cabinet label carries your name, your dates, and a blank where a threat should be.',
      local_menace: 'Three hamlets sent a letter of thanks. It is filed one drawer beneath you.',
      named_threat: 'Your entry was not closed, merely given a shelf number and a dusting schedule.',
      kingdom: 'You are insured for a sum the Crownlands would rather not have put in writing.',
      legend: 'Visitors are never told which cabinet, and every one of them knows which cabinet.',
    },
    rarity: 'rare',
  },
  {
    id: 'betrayed_by_apprentice',
    name: 'Betrayed by an Apprentice',
    summary: 'Undone by the one management problem you never delegated.',
    hint: 'for a large school and a small wage',
    narration:
      'Her name sat in your ledger for forty years, misspelled the entire time. She did not want the tower, the artifacts, or the title; she wanted the moment, and took it on the stairs, thoroughly. The others had voted on it beforehand, which stings more than the knife did. In the end you were undone by the one management problem you never delegated. She has kept your portrait in the hall, which is either respect or a notice to the remaining staff.',
    codaMode: 'tiered',
    coda: {
      unknown: 'She inherited the tower, the debts, and a name nobody outside the valley had learnt.',
      local_menace: 'Three hamlets noticed only that the deliveries carried on under new management.',
      named_threat: 'Your entry was amended in one careful hand, without fuss, to hers.',
      kingdom: 'The Crownlands reopened the file under her name and kept your pages for context.',
      legend: 'She will be introduced as yours for the rest of her life, and has priced that in.',
    },
    rarity: 'rare',
  },
  {
    id: 'lichdom',
    name: 'Lichdom',
    summary: 'You paid everything you were keeping and stopped needing any of it.',
    hint: 'for one who declines to stop',
    narration:
      'The rite is not difficult. The price is everything you had been keeping: the followers left within the week, politely, the way staff leave a business that changed hands; the artifacts went back into the ground they came from. You did it in a cold room, door shut, no one watching. What remains does not sleep, does not decay, and has no use for a name, though it keeps yours out of habit. The forgetting that comes for everybody else turned out, in your case, not to apply.',
    codaMode: 'tiered',
    coda: {
      unknown: 'Nobody is watching the hill. That was never a precaution, it is simply how it went.',
      local_menace: 'Three hamlets moved their grazing off the hill, gave no reason, and never went back.',
      named_threat: 'Clerks pass the undated entry along each year; none will be the one to close it.',
      kingdom: 'The Crownlands maintain the file the way a town maintains a wall it did not build.',
      legend: 'Four kingdoms know precisely what is under the hill, and all four farm elsewhere.',
    },
    rarity: 'rare',
  },
  {
    id: 'retired_to_swamp',
    name: 'Retired to a Swamp',
    summary: 'Two hundred years, a bog, and nobody left to explain yourself to.',
    hint: 'for a long life and a quiet one',
    narration:
      'You did not retire so much as stop being findable. The bog took you in without ceremony, and within a decade the maps agreed you were a feature of the landscape, not a person standing in it. You kept bees that had no business existing, and brokered a heron truce that outlasted anything the Crownlands signed. Three heroes came looking, found an old wizard boiling roots, and left satisfied they had the wrong valley — each was right, because by then you were. You died warm, in a chair you made.',
    codaMode: 'tiered',
    coda: {
      unknown: 'Nobody was ever looking, so the bog was not a hiding place. It was where you lived.',
      local_menace: 'Three hamlets stopped complaining and later could not agree on which year that was.',
      named_threat: 'Sixty years on, a clerk closed the entry with a date arrived at by guesswork.',
      kingdom: 'The file thinned by a decade at a time until it held a name and two wrong valleys.',
      legend: 'The name went on working for a century without you. By then it belonged to the herons.',
    },
    rarity: 'common',
  },
  {
    id: 'consumed_by_pact',
    name: 'Consumed by the Pact',
    summary: 'The Covenant arrived at the agreed hour. The account is settled.',
    hint: 'for a debt carried to the end',
    narration:
      'You had read the clause. Everyone reads the clause; that has never been the difficulty. The Covenant sends no collectors, no warnings, no final notice — it arrives at the agreed hour, in the agreed room, and the agreement is honoured in full and on schedule. Witnesses describe you as calm, which the registrar noted approvingly in the margin. Your account is closed, and in closing it that office has entered the only commendation it is permitted to give: paid.',
    codaMode: 'tiered',
    coda: {
      unknown: 'The Covenant roll is the only place your name was ever written down correctly.',
      local_menace: 'Three hamlets recorded a cold night. The registrar recorded rather more than that.',
      named_threat: 'Two offices hold your name. Only one of them keeps its records up to date.',
      kingdom: 'The Crownlands closed their file on a date the Covenant had set decades earlier.',
      legend: 'Large names default no more often than small ones. The margin notes this approvingly.',
    },
    rarity: 'rare',
  },
  {
    id: 'ascension',
    name: 'Ascension',
    summary: 'You held one of the four, and the room did not survive what you did with it.',
    hint: 'for the greatest name and a relic to match',
    narration:
      'The four were never four things; they were one thing, broken on purpose — any shard works, if the hand holding it is famous enough. Yours was. You did it in a room built for nothing else, and the room did not survive the moment, and in any useful sense neither did you. The Crownlands struck your name from the tax rolls, as near as it comes to conceding the supernatural. You are not dead. On certain nights the old province’s sky is the wrong colour, and nobody under it remarks on it any more.',
    codaMode: 'tiered',
    coda: {
      unknown: 'The province has a sky the wrong colour and no story to attach to it. It was yours.',
      local_menace: 'Three hamlets stand directly beneath it and have adjusted, as hamlets do.',
      named_threat: 'You were catalogued as a danger, the last wholly accurate thing said about you.',
      kingdom: 'Struck from the tax rolls and from nothing else. The rest of the file remains open.',
      legend: 'The name outlived the man, the province, and the office that kept misspelling it.',
    },
    rarity: 'legendary',
  },

  // -------------------------------------------------------------------------
  // Faction reprisals. Same trigger, six different ideas of what to do about
  // you — see `REPRISAL_BY_FACTION` in `src/engine/endings.ts`.
  // -------------------------------------------------------------------------

  {
    id: 'eternally_repurposed',
    name: 'Eternally Repurposed',
    summary: 'The Covenant found a use for you. The use has no end date.',
    hint: 'for a name the Covenant would rather spend than argue with',
    narration:
      'The Ashen Covenant does not execute anyone. It reassigns. You were reviewed, valued, and entered into the inventory under a heading you would have found insulting had anyone thought to consult you. Some part of you is a ward on a door in the west range. Some part is heat. The rest is held in reserve against a need that has not yet arisen, and the Covenant is patient about needs. There is no end date on the arrangement, because nobody drafting it could think of a reason to put one in.',
    codaMode: 'fixed',
    coda: 'The inventory is reviewed each spring. Your line has never once needed amending.',
    rarity: 'rare',
  },
  {
    id: 'liquidated',
    name: 'Liquidated',
    summary: 'Assessed, itemised, and sold in lots. The books balance.',
    hint: 'for an expensive enemy of the Gilded Hand',
    narration:
      'The Gilded Hand did not send anyone to kill you. It sent three clerks, a valuer, and a cart. The tower was assessed, the relics catalogued at prices you would have disputed at length, and your followers offered continued employment on slightly worse terms, which most of them took. You were the final item, and the valuation was the honest part: modest, defensible, and arrived at without any malice whatsoever. The Hand does not keep grudges. It keeps books, and the books balance.',
    codaMode: 'fixed',
    coda: 'Your lot number outlived the tower, the relics, and the man who signed for all three.',
    rarity: 'rare',
  },
  {
    id: 'turned_to_fertilizer',
    name: 'Turned to Fertilizer',
    summary: 'The Choir took the ground back, and the yield that year was remarkable.',
    hint: 'for a famous enemy of the Choir, and good ground',
    narration:
      'The Verdant Choir held no trial, because the Choir does not hold trials. It waited, which it is considerably better at than you were, and then it took the ground back with you still standing on it. The roots came up through the floor of a tower you had reinforced against armies. By every measure the Choir recognises you are doing well: the yield in that valley is remarkable, the orchard came in early two years running, and there is a pear that did not exist before you were under it.',
    codaMode: 'fixed',
    coda: 'The pear is not named after you. It is, however, named.',
    rarity: 'rare',
  },
  {
    id: 'exiled_and_overrun',
    name: 'Exiled and Overrun',
    summary: 'Escorted to the border by a clerk. What was past it did not read the writ.',
    hint: 'for a nuisance the Crownlands stopped negotiating with',
    narration:
      'The Crownlands are not dramatic people. They drew up a writ, had it read at the border by a clerk who mispronounced your name twice, and escorted you across with a party large enough to make the point and small enough to clear the budget. What was on the far side had not read the writ and was not impressed by the seal. The file closes with a note that the sentence was carried out by parties unknown, and a second note, in another hand, that this was foreseeable.',
    codaMode: 'fixed',
    coda: 'The border moved outward twice in the century after. Nobody went looking on the way.',
    rarity: 'rare',
  },
  {
    id: 'consumed',
    name: 'Consumed',
    summary: 'You were always on the schedule. All your work did was move the date.',
    hint: 'for a name moved to the top of a very old list',
    narration:
      'The Worm Below holds no opinions and takes no offence, which is the part everyone gets wrong about it. You were on the schedule from the first day you went down there — everybody is — and all your later work did was move the date up. There was no confrontation and nothing was said. The hill was where the hill had always been, and then the ground under it was somewhere you had been standing. It is not personal. It is simply that the Worm is under everything, and in the end under you.',
    codaMode: 'fixed',
    coda: 'It has never once been late. It has never once been early either.',
    rarity: 'rare',
  },

  // -------------------------------------------------------------------------
  // Faction leadership (issue #14, slice 2). `lichdom` above is the Worm
  // Below's member of this set — see `LEADERSHIP_BY_FACTION` in
  // `src/engine/endings.ts`.
  // -------------------------------------------------------------------------

  {
    id: 'contract_writer',
    name: 'Pact Master',
    summary: 'You stopped signing the Covenant’s contracts and started drafting them.',
    hint: 'for the Covenant’s only client left standing',
    narration:
      'The Ashen Covenant does not promote from within, as a rule; it made an exception, filed under exceptional circumstances, and declined to elaborate further. You do not sign the pacts any longer. You draft them, adjust the clauses, and decide whose name goes where the ash goes afterward. Other clients still call it a contract. You have started calling it correspondence, and nobody has pointed out the difference, which the Covenant considers the surest sign it appointed correctly.',
    codaMode: 'fixed',
    coda: 'The clauses you wrote outlived the hand that wrote them, which was always the intention.',
    rarity: 'rare',
  },
  {
    id: 'grand_arbiter',
    name: 'Grand Arbiter',
    summary: 'The Gilded Hand stopped billing you and started asking your opinion.',
    hint: 'for an account the Hand consults rather than invoices',
    narration:
      'The Gilded Hand settles its disputes by arbitration, and for the back half of your career you were the arbitration. Two merchants present a claim, you name a number, and the number is final, because the alternative is you naming a larger one next time. You have never once ruled against the Hand itself, a fact its accountants have noticed and never once raised with you directly. The seat carries no term limit. Nobody has yet found the nerve to check whether one was intended.',
    codaMode: 'fixed',
    coda: 'The ledger records the seat, not the name in it. Yours is the one still in the ink.',
    rarity: 'rare',
  },
  {
    id: 'archmage',
    name: 'Archmage',
    summary: 'The Pale Academy dropped the disclaimer and gave you the chair instead.',
    hint: 'for a name the Academy stopped footnoting',
    narration:
      'The Pale Academy spent decades citing you as a cautionary appendix, then quietly promoted you to the faculty that writes the appendix. You lecture twice a term, to a full hall every time, and mark essays about wizards not unlike yourself with a rigour the position seems to demand. The disclaimer is gone from your entry, replaced with a title. Three professors who voted against the appointment now open their own lectures by citing you. None of them enjoy it. All of them are correct to.',
    codaMode: 'fixed',
    coda: 'The chair is tenured. So, as far as the Academy can determine, are you.',
    rarity: 'rare',
  },
  {
    id: 'archdruid',
    name: 'Archdruid',
    summary: 'The Verdant Choir stopped treating you as weather and started treating you as root.',
    hint: 'for a wizard the grove stopped weeding out',
    narration:
      'The Verdant Choir does not vote and does not appoint; it simply stops treating you as weather and starts treating you as root. That took eleven years, during which the grove got no smaller and you got no more welcome, until one spring the eldest oak leaned your way and the matter was considered settled. You speak first at the equinox now, which nobody remembers deciding and nobody has since revisited. Every hamlet nearby adjusted its planting calendar to yours, correctly, without asking why.',
    codaMode: 'fixed',
    coda: 'The Choir has never called it a promotion. The grove no longer has anyone above you.',
    rarity: 'rare',
  },
  {
    id: 'overthrown_the_kingdom',
    name: 'King',
    summary: 'The Crownlands did not fall. They changed management, and kept you on top.',
    hint: 'for a throne the Crownlands stopped defending',
    narration:
      'The Crownlands did not fall so much as change management. You did not raze the palace; you kept the staff, the treasury, and most of the paperwork, which turned out to be the actual seat of power all along. The old dynasty survives as a line in the historical record and, twice yearly, a strongly worded letter from an exiled cousin who cannot afford postage for a third. The coronation was small, correct, and legally sound, because you had the clerks draft it that way on purpose.',
    codaMode: 'fixed',
    coda: 'The crown fits. The clerks confirmed it would, on paper, well before it did.',
    rarity: 'rare',
  },
];
