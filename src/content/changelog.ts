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
  '2026-09-22T18:40:00Z': {
    summary: 'The Collection door is now the Necrolexicon — factions and mechanics explained, nothing spoiled.',
    details: [
      'The main screen\'s Collection door is now the Necrolexicon: relics and endings are still there, joined by a Factions tab (who they are, what standing with them does) and a Mechanics tab (what notoriety, standing, followers, apprentices, pact debt, hero threat, lairs, relics, offers, and endings actually mean).',
      'Nothing you have not discovered is spoiled — undiscovered relics and endings still redact their names, and the new reference tabs explain rules, never secrets.',
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
