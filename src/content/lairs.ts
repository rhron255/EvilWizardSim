import type { Lair } from '../types';

/**
 * The ladder. Ten rungs, tier 0..9, indexed by position in this array.
 *
 * These render as a grid on the ending card, which per
 * `wiki/06_reference_analysis.md` is the single most-shared element of a run.
 * Each entry therefore has to survive being read on its own, out of context,
 * by somebody who has never played.
 */
export const lairs: Lair[] = [
  {
    id: 'rented_cellar',
    name: 'The Rented Cellar',
    tier: 0,
    blurb:
      'Beneath a cheesemonger, and the smell wins. Your landlady knows you are a wizard and has raised it twice, both times in the context of the stairs.',
  },
  {
    id: 'leaning_cottage',
    name: 'The Leaning Cottage',
    tier: 1,
    blurb:
      'It leans because the hill is moving, slowly, and has been moving since before the cottage. You have decided that this is atmosphere.',
  },
  {
    id: 'repossessed_mill',
    name: 'The Repossessed Mill',
    tier: 2,
    blurb:
      'The Gilded Hand took it from a miller and sold it on to you at a rate described in the paperwork as sympathetic. The wheel still turns. Nothing is being ground.',
  },
  {
    id: 'unfinished_tower',
    name: 'The Unfinished Tower',
    tier: 3,
    blurb:
      'Four floors of a planned nine, roofed in tarpaulin and conviction. Guests are told the scaffolding is deliberate, and roughly half of them accept this.',
  },
  {
    id: 'thornhollow_keep',
    name: 'Thornhollow Keep',
    tier: 4,
    blurb:
      'A real keep, with a real gate, in a valley that traffic has begun to go around. The previous owner’s furniture is still in it and you have kept most of it.',
  },
  {
    id: 'screaming_spire',
    name: 'The Screaming Spire',
    tier: 5,
    blurb:
      'It screams at dusk. Nobody has established why, including you, and after the first year you stopped mentioning it in letters.',
  },
  {
    id: 'citadel_of_nine_winters',
    name: 'Citadel of Nine Winters',
    tier: 6,
    blurb:
      'Nine winters occur here simultaneously, room by room, and the household has learned which corridors to avoid in which month. Cartographers render it as a blank square and a footnote.',
  },
  {
    id: 'sunless_cathedral',
    name: 'The Sunless Cathedral',
    tier: 7,
    blurb:
      'Raised for something that was never named, and buried when it declined to arrive. You have consecrated it to nothing at all. It has been extremely patient about this.',
  },
  {
    id: 'hollow_mountain',
    name: 'The Hollow Mountain',
    tier: 8,
    blurb:
      'You did not build it. You emptied it. Two rivers in the province now run the other way and three villages have relocated without ever being told the reason.',
  },
  {
    id: 'mouth_of_the_world',
    name: 'The Mouth of the World',
    tier: 9,
    blurb:
      'Where the land stops behaving. Nothing here is precisely a room and nothing here is precisely outside. Envoys arrive, deliver, and decline to stay for the meal.',
  },
];
