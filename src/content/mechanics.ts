import type { Mechanic } from '../types';

/**
 * The Necrolexicon's "what does this mean?" entries (issue #66).
 *
 * These explain concepts, not numbers. A run screen stat already prints its
 * own threshold and distance where one exists (CLAUDE.md failure mode 1) —
 * restating that figure here would drift the moment a constant in
 * `src/engine/constants.ts` is retuned, which is exactly the trap failure
 * mode 1's own postscript warns about ("the inverse is a lie too"). So an
 * entry says what raises or lowers a number and what crossing an extreme
 * does in kind, and leaves the exact figure to the screen that is already
 * showing it live.
 */
export const mechanics: Mechanic[] = [
  {
    id: 'eras',
    name: 'Eras',
    blurb:
      'A career runs in eras, five years apiece. Each one offers a single card — sometimes two things move on their own between the offer and the next card, and the resolution says so when they do. A run is split in two by a prophecy: the first part, the Ascent, is your rise to power; the second, the Decline, is your struggle to hold onto it against the enemies it has made you.',
  },
  {
    id: 'notoriety',
    name: 'Notoriety',
    blurb:
      'How infamous you are. It is the one number the game colours, banded into tiers from unknown to legend. It slowly erodes on its own each era during the Decline — unless you have become a lich, whose undeath holds that decay off entirely — and has a hand in which events come to pass.',
  },
  {
    id: 'standing',
    name: 'Faction standing',
    blurb:
      'Each of the six factions keeps a private opinion of you, from courted to condemned. Standing does not move in isolation: factions carry old grudges, so moving one can affect another. The more a faction likes you, the more it will do for you; the same is true the other way around — anger one enough, and you will suffer its wrath.',
  },
  {
    id: 'followers',
    name: 'Followers',
    blurb:
      'The household you have gathered — hired hands, cultists, undead servants, or unlucky townsfolk. A workforce to be used and bartered: mostly ledger filler, but some cards ask you to spend them, and a household too small to pay a cost simply cannot.',
  },
  {
    id: 'apprentices',
    name: 'Apprentices & loyalty',
    blurb:
      'Apprentices are the students you have taken on; loyalty tracks how likely they are to stay that way — the lower it sinks, the greater the chance one of them decides to replace you instead.',
  },
  {
    id: 'pact_debt',
    name: 'Pact debt',
    blurb:
      'Everything comes at a price, and this one is rather terminal. It only ever moves on a card you knowingly accepted — never on its own — but go too far into debt and it will be collected. Evil wizard lives accepted only; no cheques, credit, or cash.',
  },
  {
    id: 'hero_threat',
    name: 'Hero threat',
    blurb:
      'Represents the hero closing in on you, once their destiny is prophesied. It climbs through the whole Decline, faster the more famous you are, and is opposed by your defense — built from your relics and your lair. Try to be smarter than them; you are an evil wizard, after all.',
  },
  {
    id: 'lair',
    name: 'Lair',
    blurb:
      'A wizard is only as powerful as their lair is cool. Your seat of power, one rung on an authored ladder from hovel to stronghold. A grander lair contributes more to your defense against the hero — and sometimes you have to move on, on account of the ghosts, or the vines.',
  },
  {
    id: 'relics',
    name: 'Relics',
    blurb:
      'Artifacts you have picked up along the way, each tied to one faction and graded common, rare, or legendary. A relic adds to your defense and, once held, is yours for the rest of the career — unless you decide something is worth giving it up for.',
  },
  {
    id: 'offers',
    name: 'Offers & gambles',
    blurb:
      'The choices you encounter. Every offer either resolves for certain or asks you to gamble — and a gamble always prints its odds and what happens on both outcomes before you commit. Read the small print before signing anything.',
  },
  {
    id: 'endings',
    name: 'Endings',
    blurb:
      'Every good wizard\'s career comes to an end eventually — usually by your own hand. Many endings, many choices, many rewards: most are easier to find than your moral compass, but the cool ones might take some time. The collection below keeps every ending you have reached; the ones you have not are shown as a door, not an absence.',
  },
];
