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
      'A career runs in eras, five years apiece. Each one offers a single card — sometimes two things move on their own between the offer and the next card, and the resolution says so when they do. A run has an ascent, where you build, and a decline that follows the prophecy.',
  },
  {
    id: 'notoriety',
    name: 'Notoriety',
    blurb:
      'How famous — or infamous — you are. It is the one number the game colours, banded into tiers from unknown to legend. It rises through the ascent and, after the prophecy, quietly erodes on its own each era; the header always shows your current tier and how the erosion is trending.',
  },
  {
    id: 'standing',
    name: 'Faction standing',
    blurb:
      'Each of the six factions keeps a private opinion of you, from courted to condemned. Standing does not move in isolation: factions carry old grudges, so moving one can drag its rivals down for free. Devoted standing opens a faction\'s reliquary to better relics; standing sunk far enough, once your name is big enough to be worth the trouble, ends the career permanently and in that faction\'s own fashion.',
  },
  {
    id: 'followers',
    name: 'Followers',
    blurb:
      'The household you have gathered — hired hands, cultists, whatever a given faction calls them. Mostly ledger filler, but some cards ask you to spend them, and a household too small to pay a cost simply cannot.',
  },
  {
    id: 'apprentices',
    name: 'Apprentices & loyalty',
    blurb:
      'Apprentices are students you have taken on; loyalty tracks how likely they are to stay that way. Loyalty drifts on its own between eras, and an apprenticeship that curdles far enough does not end quietly.',
  },
  {
    id: 'pact_debt',
    name: 'Pact debt',
    blurb:
      'What you owe the powers you have borrowed from. It only ever moves on a card you knowingly accepted — never on its own — but it has a ceiling, and a wizard who reaches it is not asked again.',
  },
  {
    id: 'hero_threat',
    name: 'Hero threat',
    blurb:
      'Once the prophecy fires, a hero is coming for you, and this is how close. It climbs through the whole decline, faster the more famous you are, and is opposed by your defense — built from your relics and your lair. The header names the ward you are leaning on and how near the hero has gotten.',
  },
  {
    id: 'lair',
    name: 'Lair',
    blurb:
      'Your seat of power, one rung on an authored ladder from hovel to stronghold. A grander lair contributes more to your defense against the hero, and some cards ask for a rung as their price or their prize.',
  },
  {
    id: 'relics',
    name: 'Relics',
    blurb:
      'Artifacts you have picked up along the way, each tied to one faction and graded common, rare, or legendary. A relic adds to your defense and, once held, is yours for the rest of the career — unless a card specifically asks you to give one up.',
  },
  {
    id: 'offers',
    name: 'Offers & gambles',
    blurb:
      'Every card either resolves for certain or asks you to gamble. A gamble always prints its odds and always narrates both what you get and what it costs you if it goes wrong, before you commit — nothing a card can do to you is ever kept off the card.',
  },
  {
    id: 'endings',
    name: 'Endings',
    blurb:
      'Every career ends in a biography, never a loss — how you are remembered depends on what you built, who you courted, and who you crossed. The collection below keeps every ending you have reached; the ones you have not are shown as a door, not an absence.',
  },
];
