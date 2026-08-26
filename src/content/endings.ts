import type { Ending } from '../types';

/**
 * The seven endings.
 *
 * THE RULE: there is no fail state. Every narration below is a biography, not
 * a verdict — see `wiki/06_reference_analysis.md` principle 8. The game does
 * not grade the run, it narrates it. Nothing here may read as "you lost,"
 * least of all the swamp, which is the anticlimax ending and therefore the one
 * that has to work hardest.
 */
export const endings: Ending[] = [
  {
    id: 'slain_by_chosen_one',
    name: 'Slain by the Chosen One',
    summary: 'A sword, a teenager, and a bounty paid in three instalments.',
    hint: 'for a name the hero can find',
    narration:
      'The Chosen One was nineteen, carried a sword a grandmother had kept oiled for precisely this, and said nothing clever before or afterward. It was quick and it was competent, and there is no version of the account in which you were given room to speak. The Crownlands paid out the bounty in three instalments and mislaid the paperwork on the third. Somebody has already set the whole thing to music, in a key that makes you taller. You had a long and frightening life, and the person who ended it will be introduced at every table for the rest of theirs as the one who killed you.',
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
      'They could not kill you — a fact noted at the time with some irritation — so they compressed you instead. The rite took eleven practitioners, two days, and a cart. You are presently a flaw in an amethyst the size of a fist: catalogued, insured, and displayed in a cabinet that is dusted on Thursdays. You are aware of the Thursdays. Sooner or later a curious child, an earth tremor, or a bored junior archivist will undo what eleven experts spent two days achieving, and you have nothing whatsoever to do but be right about that.',
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
      'Her name sat in your ledger for forty years, misspelled the entire time. She did not want the tower, or the artifacts, or the title; she wanted the moment, and she took it on the stairs, and she was thorough about it. The others had voted on it beforehand, which stings considerably more than the knife did. In the end you were undone by the one management problem you never delegated. She has kept your portrait up in the hall, which is either respect or a notice to the remaining staff.',
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
      'The rite is not difficult. The difficulty is the price, which is everything you had been keeping: the followers left over the following week, politely, the way people leave a business that has changed hands, and the artifacts went back into the ground they were taken out of. You did it in a cold room with the door shut and no one watching, and no part of it was ceremonial. What remains does not sleep, does not decay, and has no use for a name, though it keeps yours out of habit through several further centuries of quiet and uninterruptible work. The slow forgetting that comes for everybody else turned out, in your case, not to apply.',
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
      'You did not retire so much as stop being findable. The bog took you in without ceremony, the way bogs do, and within a decade the maps had quietly agreed that you were a feature of the landscape rather than a person standing in it. You kept bees that had no business existing, and you brokered a border settlement between two heron colonies that held for sixty years — longer than anything the Crownlands signed in the same period. Three heroes came looking over the years, found an old wizard boiling roots, and left satisfied they had the wrong valley; each of them was correct, because by then you were. You died warm, in a chair you had made yourself, having outlasted every institution that ever held an opinion about you.',
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
      'You had read the clause. Everyone reads the clause; that has never been the difficulty. The Covenant does not send collectors, or warnings, or a final notice — it arrives at the agreed hour, in the agreed room, and the agreement is honoured in full and on schedule. Witnesses describe you as calm, which the registrar recorded approvingly in the margin. Your account is closed, and in closing it that office has entered the only commendation it is permitted to give: paid.',
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
      'The four were never four things; they were one thing, broken on purpose, by people who understood precisely what it would do if it were ever not — and any shard of it will do, provided the hand holding it is famous enough to matter. Yours was. You did it in a room built for that and for nothing else, and the room did not survive the moment, and in any useful sense neither did you. The Crownlands struck your name from the tax rolls, which is as near as that office comes to conceding the supernatural. You are not dead. On certain nights the sky above the old province is the wrong colour, and the people living under it stopped remarking on this a long time ago.',
    coda: {
      unknown: 'The province has a sky the wrong colour and no story to attach to it. It was yours.',
      local_menace: 'Three hamlets stand directly beneath it and have adjusted, as hamlets do.',
      named_threat: 'You were catalogued as a danger, the last wholly accurate thing said about you.',
      kingdom: 'Struck from the tax rolls and from nothing else. The rest of the file remains open.',
      legend: 'The name outlived the man, the province, and the office that kept misspelling it.',
    },
    rarity: 'legendary',
  },
];
