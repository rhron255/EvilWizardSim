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
  '2026-10-04T11:59:44Z': {
    summary: 'Every theme now decorates its room, and no two themes look alike any more.',
    details: [
      'Each theme now decorates its room with a wallpaper and its own emblem on cards and dividers, and most edge their cards in their own way.',
      'Themes that were nearly the same colour have been pulled apart.',
      'The theme picker previews each room’s wallpaper and emblem, not just its colours.',
      'Fixed the ending card not showing your Notoriety glow.',
      'The prophecy screen and the foot of the title and ending screens now read properly in Ordinary Weather.',
      'Text on a card under your finger is easier to read in several themes.',
      'Several buttons, labels and frames now look the way they were designed, including the prophecy’s button and the ending card on phones.',
      'High-contrast mode now shows the faction bars and no longer clips the Notoriety label.',
      'Opening the Necrolexicon from an ending now takes you to that ending, marked as just reached.',
      'Shortened choice lines no longer trail off on words like “the”.',
      'On the smallest phones the title screen’s buttons fit, long theme names stay whole, and the Necrolexicon tabs start inside the margin.',
      'The Relics button, the epithet choices for a new wizard, and the Necrolexicon’s tabs, filters and theme link are easier to tap.',
    ],
  },
  '2026-09-29T13:06:47Z': {
    summary: 'Closing the update popup now returns keyboard focus to Begin a Career.',
    details: [
      'Fixed a bug where dismissing this popup with the keyboard dropped focus to the top of the page instead of back onto Begin a Career.',
    ],
  },
  '2026-09-29T12:41:25Z': {
    summary: 'Cards that cost you a relic now print the Followers and Standing you actually get.',
    details: [
      'Fixed a bug where a card that made you sell or lose a relic could show a better Followers or Standing figure than you got, if the relic you lost was the one changing it.',
      'Eight choices were affected, including Settle in relics, Sell one piece and Sell her a relic for what you need.',
    ],
  },
  '2026-09-29T09:56:29Z': {
    summary: 'Each era now opens at the top of the screen, with small-phone fixes and a little haptic feedback.',
    details: [
      'Fixed a bug where the next era could open scrolled partway down the page after you tapped a card near the bottom.',
      'Long lair names like Citadel of Nine Winters now show in full instead of trailing off, and the run screen no longer sways sideways.',
      'The Patron line only appears once you have a patron, and your age sits beside your name, so more of the first card shows on small phones.',
      'Fixed the run-length options, a few ending-card labels and the Never seen before badge running off the edge of small phones.',
      'The Continue and Back buttons are taller and easier to tap, and Begin a Career is easier to read on a fresh profile.',
      'Phones that support it now buzz gently when a gamble lands, when you cross into a new tier, and when the prophecy arrives.',
      'Added a tab icon, a home-screen icon, and a proper preview image when a link to the game is shared.',
    ],
  },
  '2026-09-28T19:05:46Z': {
    summary: 'The Relics page now says when each relic takes effect, and long result cards display properly on phones.',
    details: [
      "The Relics page summary now names each relic's condition (\"When you lose a gamble: +3 Notoriety\"), so a conditional relic no longer looks like a bonus paid every era.",
      "Fixed a bug where a long result card's coloured outline stopped partway down when you scrolled, leaving a stray edge above Continue.",
    ],
  },
  '2026-09-25T16:00:00Z': {
    summary: 'Every relic in the game does something now, and careers hold more of them.',
    details: [
      'The last 22 relics all have powers of their own, some good, some double-edged — the Tenure Ring and the Weather Leash are only ever offered by name, never found at random.',
      'The Brazier of the Ninth Clause, the Key to No Particular Door, and the Sword That Was Returned each carry a one-time Use button on the relic page.',
      'The Root of the Standing Vote and the Portcullis Tooth can each save a career from an ending once, automatically — the resolution card says so when it happens.',
      'Careers now tend to hold a few more relics than before.',
      'Your relic collection has been reset once more for this update, since every relic you already found was a powerless find when you saw it.',
    ],
  },
  '2026-09-25T13:00:00Z': {
    summary: 'The six legendary relics do something now, and two of them you can trigger yourself.',
    details: [
      'The Cinder Testament, Final Ledger, Pale Orrery, Old-Growth Charter, Unbroken Line, and Long Appetite all have powers of their own.',
      'The Final Ledger and the Pale Orrery each carry a one-time Use button on the relic page.',
      'Your relic collection has been reset once more for this update, since the legendaries you already found were powerless finds when you saw them.',
    ],
  },
  '2026-09-25T10:00:00Z': {
    summary: 'The Relics page now opens with what every relic you hold actually does.',
    details: [
      'A relic that does something every era no matter what you pick used to repeat that line under every single offer.',
      'The Relics page now opens with your total wards and a plain summary of every held relic and its effect, with the full cards below.',
    ],
  },
  '2026-09-25T09:00:00Z': {
    summary: 'The Footnote That Bites now describes its power in plain terms.',
    details: [
      "Fixed a bug where this relic's passive described itself using a term the game never explains anywhere else.",
      'It now reads: favouring a faction costs its rivals less standing than usual.',
    ],
  },
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
