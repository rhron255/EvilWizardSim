import type { Mechanic, RelicPower } from '../types';

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
      'A career unfolds in eras, five years apiece. Each brings an offer. A prophecy splits the run in two: The Ascent is your rise to power, and The Decline is your struggle to hold on to it while facing your enemies.',
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
      'Each of the six factions keeps a private opinion of you, from courted to condemned. Standing does not move in isolation: factions carry old grudges, so moving one can affect another. The more a faction likes you, the more benefits you gain; anger one enough, and you will suffer its wrath.',
  },
  {
    id: 'followers',
    name: 'Followers',
    blurb:
      "The household you have gathered — hired hands, cultists, undead servants or unlucky townsfolk. They're a workforce to be used and bartered.",
  },
  {
    id: 'apprentices',
    name: 'Apprentices & loyalty',
    blurb:
      "Apprentices are the right-hand wizards you have taken on. Loyalty tracks how likely they are to stay that way — the lower it falls, the more likely they are to replace you.",
  },
  {
    id: 'pact_debt',
    name: 'Pact debt',
    blurb:
      "Everything comes at a price. Pact debt's price is rather terminal. Take on too much and it will be collected. Wizard lives only; no cheques, credit, or cash.",
  },
  {
    id: 'hero_threat',
    name: 'Hero threat',
    blurb:
      "Hero threat represents the hero's strength. Once the hero's destiny is prophesied, they will kill you if they can. Try to outsmart them; you are an evil wizard, after all.",
  },
  {
    id: 'lair',
    name: 'Lair',
    blurb:
      'A wizard is only as powerful as their lair is cool. It is your seat of power, from hovel to stronghold. A grander lair contributes more to your defence against the hero. Sometimes you have to move because of annoying ghosts or insistent vines.',
  },
  {
    id: 'relics',
    name: 'Relics',
    blurb:
      "Relics you have picked up along the way, each tied to one faction and graded common, rare, or legendary. A relic's wards come from its rarity, and once held, it is yours for the rest of the career. Tap Relics during a career to see what you carry.",
  },
  {
    id: 'relic_powers',
    name: 'Relic powers',
    blurb:
      'Some relics do something beyond adding to your wards. A power acts on its own — it never asks you a question. It answers to your choices and to the eras passing, and to nothing else a relic might be doing at the same time.',
  },
  {
    id: 'relic_actives',
    name: 'Relic actives',
    blurb:
      "A few relics carry a Use button on the relic page instead of acting on their own. Press it once, whenever you like — never in the middle of a decision — and it is spent for the rest of the career. Some hand you something outright; others trade one stat for another, or swap the very offer in front of you.",
  },
  {
    id: 'relic_lifelines',
    name: 'Lifelines',
    blurb:
      'A few relics keep a one-time rescue in reserve. The first time it would apply, it spends itself instead of you: the ending it covers does not happen, and your career carries on.',
  },
  {
    id: 'double_edged_relics',
    name: 'Double-edged relics',
    blurb:
      'A few relics cut both ways. You will never find one by chance — they are always offered by name, and the card shows what it costs you before you accept it.',
  },
  {
    id: 'origins',
    name: 'Origins',
    blurb:
      'How a career began. Every background comes with its own relic already in hand, on top of whatever else it grants or costs — nobody starts from nothing.',
  },
  {
    id: 'offers',
    name: 'Offers & gambles',
    blurb:
      'The choices you encounter. Offers either resolve with certainty or ask you to gamble. Read the small print before signing anything.',
  },
  {
    id: 'endings',
    name: 'Endings',
    blurb:
      'Just as every good wizard comes to an end — usually by your hand — so will your life eventually. Many endings, many choices, many rewards. Most are easier to find than your moral compass; the cool ones might take some time.',
  },
];

/**
 * Which Necrolexicon entry explains a given kind of relic power (issue #80's
 * acceptance item, extended by #81 and #82). `passive` and `trigger` map to
 * the one `relic_powers` entry above — a relic that acts on its own needs
 * only one mechanic explaining the whole automatic framework — but `active`
 * and `lifeline` each get their own, for the same reason: an active is the
 * one kind that is NOT automatic (`relic_actives`), and a lifeline is a
 * ONE-TIME rescue rather than an ongoing rule change, distinct enough from
 * an era-to-era `trigger` to earn its own explanation (`relic_lifelines`).
 * The `Record` stays exhaustive over `RelicPower['kind']` so a future fifth
 * kind cannot silently go unmapped: `scripts/validate-content.ts` looks up
 * every AUTHORED power's kind here and fails if the mechanic it names does
 * not exist, which only means anything because this object cannot omit one.
 */
export const MECHANIC_FOR_POWER_KIND: Record<RelicPower['kind'], string> = {
  passive: 'relic_powers',
  trigger: 'relic_powers',
  // Its own entry, not `relic_powers` (issue #81 acceptance item): an active
  // is the one kind that is NOT automatic — it is the whole reason a Use
  // button exists at all, which the generic "acts on its own" blurb above
  // would directly contradict.
  active: 'relic_actives',
  // Its own entry too (issue #82): "acts on its own" fits a lifeline no
  // better than it fits an active — it fires once, ever, and only at the
  // one moment it is needed, never a rate or a rule the run lives under.
  lifeline: 'relic_lifelines',
};
