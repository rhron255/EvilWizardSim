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
    summary: 'A sword, a teenager, and a bounty paid in three installments.',
    narration:
      'The Chosen One was nineteen, carried a sword a grandmother had kept oiled for precisely this, and said nothing clever before or afterward. It was quick and it was competent, and there is no version of the account in which you were given room to speak. The Crownlands paid out the bounty in three installments and mislaid the paperwork on the third. Somebody has already set the whole thing to music, in a key that makes you taller. You had a long and frightening life, and the person who ended it will be introduced at every table for the rest of theirs as the one who killed you.',
    rarity: 'common',
  },
  {
    id: 'sealed_in_gem',
    name: 'Sealed in a Gem',
    summary: 'Compressed by committee. Currently a flaw in an amethyst, and waiting.',
    narration:
      'They could not kill you — a fact noted at the time with some irritation — so they compressed you instead. The rite took eleven practitioners, two days, and a cart. You are presently a flaw in an amethyst the size of a fist: catalogued, insured, and displayed in a cabinet that is dusted on Thursdays. You are aware of the Thursdays. Sooner or later a curious child, an earth tremor, or a bored junior archivist will undo what eleven experts spent two days achieving, and you have nothing whatsoever to do but be right about that.',
    rarity: 'rare',
  },
  {
    id: 'betrayed_by_apprentice',
    name: 'Betrayed by an Apprentice',
    summary: 'Undone by the one management problem you never delegated.',
    narration:
      'Her name sat in your ledger for forty years, misspelled the entire time. She did not want the tower, or the artifacts, or the title; she wanted the moment, and she took it on the stairs, and she was thorough about it. The others had voted on it beforehand, which stings considerably more than the knife did. In the end you were undone by the one management problem you never delegated. She has kept your portrait up in the hall, which is either respect or a notice to the remaining staff.',
    rarity: 'rare',
  },
  {
    id: 'lichdom',
    name: 'Lichdom',
    summary: 'You paid everything you were keeping and stopped needing any of it.',
    narration:
      'The rite is not difficult. The difficulty is the price, which is everything you had been keeping: the followers left over the following week, politely, the way people leave a business that has changed hands, and the artifacts went back into the ground they were taken out of. You did it in a cold room with the door shut and no one watching, and no part of it was ceremonial. What remains does not sleep, does not decay, and has no use for a name, though it keeps yours out of habit through several further centuries of quiet and uninterruptible work. The slow forgetting that comes for everybody else turned out, in your case, not to apply.',
    rarity: 'rare',
  },
  {
    id: 'retired_to_swamp',
    name: 'Retired to a Swamp',
    summary: 'Two hundred years, a bog, and nobody left to explain yourself to.',
    narration:
      'You did not retire so much as stop being findable. The bog took you in without ceremony, the way bogs do, and within a decade the maps had quietly agreed that you were a feature of the landscape rather than a person standing in it. You kept bees that had no business existing, and you brokered a border settlement between two heron colonies that held for sixty years — longer than anything the Crownlands signed in the same period. Three heroes came looking over the years, found an old wizard boiling roots, and left satisfied they had the wrong valley; each of them was correct, because by then you were. You died warm, in a chair you had made yourself, having outlasted every institution that ever held an opinion about you.',
    rarity: 'common',
  },
  {
    id: 'consumed_by_pact',
    name: 'Consumed by the Pact',
    summary: 'The Covenant arrived at the agreed hour. The account is settled.',
    narration:
      'You had read the clause. Everyone reads the clause; that has never been the difficulty. The Covenant does not send collectors, or warnings, or a final notice — it arrives at the agreed hour, in the agreed room, and the agreement is honored in full and on schedule. Witnesses describe you as calm, which the registrar recorded approvingly in the margin. Your account is closed, and in closing it that office has entered the only commendation it is permitted to give: paid.',
    rarity: 'rare',
  },
  {
    id: 'ascension',
    name: 'Ascension',
    summary: 'You put the four back together, and the room did not survive it.',
    narration:
      'The four were never four things; they were one thing, broken on purpose, by people who understood precisely what it would do if it were ever not. You reassembled it in a room built for that and for nothing else, and the room did not survive the moment, and in any useful sense neither did you. The Crownlands struck your name from the tax rolls, which is as near as that office comes to conceding the supernatural. You are not dead. On certain nights the sky above the old province is the wrong color, and the people living under it stopped remarking on this a long time ago.',
    rarity: 'legendary',
  },
];
