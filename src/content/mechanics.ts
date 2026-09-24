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
      'A career runs in eras, five years apiece. Each one has an offer come. A run is split in two; before and after a prophecy is made. The first part, The Ascent, is your rise to power. The second part, The Decline, is your struggle to maintain power in the face of enemies.',
  },
  {
    id: 'notoriety',
    name: 'Notoriety',
    blurb:
      'How infamous you are. It slowly erodes on its own each era during the decline, and has an impact on which events come to pass.',
  },
  {
    id: 'standing',
    name: 'Faction standing',
    blurb:
      'Each of the six factions keeps a private opinion of you, from courted to condemned. Standing does not move in isolation: factions carry old grudges, so moving one can affect another. The more a faction likes you, the more benefits you gain. The same is true the other way around - anger a faction enough, and you will suffer their wrath...',
  },
  {
    id: 'followers',
    name: 'Followers',
    blurb:
      "The household you have gathered — hired hands, cultists, undead servants or unlucky townsfolk. They're a work force to be used and bartered.",
  },
  {
    id: 'apprentices',
    name: 'Apprentices & loyalty',
    blurb:
      "Apprentices are your right hand wizards you have taken on; loyalty tracks how likely they are to stay that way - the lower it is, the higher the chance they'll replace you.",
  },
  {
    id: 'pact_debt',
    name: 'Pact debt',
    blurb:
      'Everything comes at a price. This price is rather terminal however. If you go into too much debt, it will be collected. Wizard lives accepted only; no cheques, credit, or cash.',
  },
  {
    id: 'hero_threat',
    name: 'Hero threat',
    blurb:
      "Represents the hero's strength. They will kill you if they can, once the hero's destiny is prophesied. Try to be smarter than them, you are an evil wizard after all.",
  },
  {
    id: 'lair',
    name: 'Lair',
    blurb:
      'A wizard is only as powerful as their lair is cool. Your seat of power, from hovel to stronghold. A grander lair contributes more to your defense against the hero. Sometimes you have to move because of annoying ghosts or insistent vines.',
  },
  {
    id: 'relics',
    name: 'Relics',
    blurb:
      "Artifacts you have picked up along the way, each tied to one faction and graded common, rare, or legendary. A relic's wards come from its rarity, and, once held, it is yours for the rest of the career. Tap Relics during a career to see what you carry.",
  },
  {
    id: 'offers',
    name: 'Offers & gambles',
    blurb:
      'The choices you encounter - offers, either resolve for certain or ask you to gamble. Read the small letters before signing anything.',
  },
  {
    id: 'endings',
    name: 'Endings',
    blurb:
      'As every good wizard comes to an end - usually by your hand, so does your life end at some point. Many endings, many choices, many rewards. Most are easier to find than your moral compass, the cool ones might take some time.',
  },
];
