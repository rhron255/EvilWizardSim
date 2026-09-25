/**
 * The backendless changelog's DATA (issue #67).
 *
 * One static file, keyed by build version, and nothing else — no functions
 * live here on purpose (PR #68 review: "the actual changelogs should sit in
 * a different file, so changing functionality can't alter the content").
 * The logic that reads this — ordering, filtering to what a player has not
 * acknowledged — is `src/engine/changelog.ts`, which takes a `Changelog` as
 * a plain argument the same way every other engine function takes content.
 *
 * No server, no fetch — everything a player can ever see here ships inside
 * the build. `src/version.ts`'s `BUILD_VERSION` must always name a key in
 * here; `scripts/check-build-version.ts` and `validate:content` both fail
 * the build otherwise.
 *
 * Newest entry is added at the top for a human reading the diff, but that is
 * a courtesy — `sortedChangelogVersions` is what actually decides display
 * order, so the object's own key order is never load-bearing.
 */

import type { Changelog } from '../types';

export const CHANGELOG: Changelog = {
  '2026-09-24T15:30:00Z': {
    summary: 'Every background now starts with its own relic, fully powered.',
    details: [
      'Each of the four origins grants a named relic with a power of its own, shown on the creation screen and on the relic page.',
      'Your relic collection has been reset once for this update, since starting relics change what counts as familiar.',
      'Signing a pact now caps one point sooner, since a background relic can already shave a point off it for you.',
      'A career already in progress when this update lands will need to start over, since how a run saves has changed too.',
    ],
  },
  '2026-09-24T14:00:00Z': {
    summary: "A relic's wards now come from its rarity, not a number written on the relic.",
    details: [
      'Every relic still adds to your wards — common, rare, and legendary now each carry a fixed amount rather than their own individual number.',
    ],
  },
  '2026-09-24T13:15:00Z': {
    summary: 'A card you truly cannot afford now looks and acts like it.',
    details: [
      'Fixed a bug where a greyed-out card could still print a price matching exactly what you had, and could still be pressed — tapping it silently did nothing.',
      'An unaffordable card now shows its real price, cannot be tapped or picked, and carries a lock mark so it reads as locked at a glance.',
    ],
  },
  '2026-09-24T12:00:00Z': {
    summary: 'You can now see which relics you actually hold mid-run.',
    details: [
      'Tap the Relics stat during a career to open a page listing every relic you hold, what each one does, and how much they add to your wards.',
      'Relics you picked up and later lost this run are now named in a Lost this run section instead of just vanishing from the count.',
    ],
  },
  '2026-09-23T08:30:00Z': {
    summary: 'A card you cannot yet afford now stays around instead of vanishing for the run.',
    details: [
      'A card offering something interesting but currently too expensive can now show up — with the unaffordable option greyed out — instead of being silently kept out of the pool.',
      'Declining because you could not pay no longer costs you the card for the rest of the run: it comes back around once you can.',
    ],
  },
  '2026-09-23T08:13:20Z': {
    summary: 'The Crown pays better for loyalty than it used to.',
    details: [
      'Balancing fixes for the Crownlands — added more positive standing offers and made them more accessible.',
    ],
  },
  '2026-09-23T07:41:55Z': {
    summary: 'The tutorial can go back, and can be replayed any time from the title screen.',
    details: [
      'Added a Back button (and the left arrow key) to the tutorial.',
      'Added a Tutorial button.',
    ],
  },
  '2026-09-22T18:40:00Z': {
    summary: 'Added the Necrolexicon — the one stop shop for all manner of evil explanations.',
    details: [
      'Replaced the main screen\'s Collection with the Necrolexicon: relics, endings and mechanics are explained there (what notoriety, standing, followers, apprentices, pact debt, hero threat, lairs, relics, offers, and endings actually mean).',
    ],
  },
  '2026-09-22T09:15:00Z': {
    summary: 'A changelog, so updates stop arriving as a surprise.',
    details: [
      'Added a changelog. It works with no server, which is more reliability than most pacts offer.',
      "A brief popup names what changed since your last visit; dismiss it, or read the full history from the title screen's Changelog door at any time.",
    ],
  },
};
