/**
 * The authored slots of the slain card (issue #121).
 *
 * `slain_by_chosen_one` closes the most careers of any ending, so its one fixed
 * paragraph was the same death four runs in ten. The card is now composed from
 * slots a human wrote — never from generated grammar, because a template breaks
 * on a relic called "A Pocketful of Dark". `src/components/meta/narration.ts`
 * picks the slots; this file only holds the words.
 *
 * Every slot is a whole sentence. Register is the ending's own: a biography,
 * not a verdict (rule 5) — the inventory line is an estate being counted, not a
 * wizard being blamed — and no numbers in the prose (rule 4).
 */

/** How the hero got to you. */
export type SlainRoute = 'duel' | 'breach';

/** Lost the "Fight her" gamble at the gate. */
export const DUEL_LINE = 'You took the duel, and it lasted as long as the introductions.';

/** Walked in through wards that no longer outweighed her. */
export const BREACH_LINE = 'Your wards held until she reached them, which was the whole of their career.';

/** Where it happened: one line per lair, keyed by `Lair.id`. */
export const SLAIN_LAIR_LINE: Record<string, string> = {
  rented_cellar: 'It happened on the cellar stairs, above the cheese.',
  leaning_cottage: 'The cottage leaned in to watch, as it does for everything.',
  repossessed_mill: 'The mill, repossessed once already, was not consulted.',
  unfinished_tower: 'She found the one floor of the tower that was finished.',
  thornhollow_keep: 'Thornhollow Keep let her in by the kitchen, out of habit.',
  screaming_spire: 'The Spire screamed, as specified, and no one was surprised.',
  citadel_of_nine_winters: 'The Citadel had seen nine winters and treated this as a tenth.',
  sunless_cathedral: 'The Cathedral, raised for nothing, received her with great patience.',
  hollow_mountain: 'The mountain echoed it back, a little late, a little kinder.',
  mouth_of_the_world: 'The Mouth of the World stayed open for it, and said nothing.',
};

/** The relic frame. The name sits in quotes so a title reads as a title. */
export const slainRelicLine = (relicName: string): string =>
  `The estate inventory opens with “${relicName}.”`;

/** For a wizard holding nothing. */
export const SLAIN_NO_RELIC_LINE = 'The estate inventory was one line long, and the clerk was kind about it.';

/** The close. "Did" answers the route line's duel or breach. */
export const SLAIN_CLOSING =
  'She will be introduced, for the rest of her life, as the one who did it. Somebody has already set it to music, in a key that makes you taller.';

/** Sentence one. The hero is named here so the share image's cut keeps her. */
export const slainOpening = (heroName: string): string =>
  `${heroName} was nineteen and carried a sword her grandmother had kept oiled for precisely this.`;
