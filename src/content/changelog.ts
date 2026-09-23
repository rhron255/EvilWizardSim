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
