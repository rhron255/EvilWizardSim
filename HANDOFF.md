# Handoff

Point a fresh session at this file plus `CLAUDE.md`. `CLAUDE.md` carries the
rules and the failure modes this build has already produced — read it before
touching anything; every one of those patterns cost a real bug. The full
write-ups are in `wiki/07_failure_modes.md`.

*Rewritten 2026-09-29, after issue #77 (the relic rework) merged. The previous
version described a build of 21 commits and 259 tests and carried a "needs a
decision" section the current numbers no longer support; the lessons from it are
kept at the bottom.*

## State

**Built, playable, and past its first polish pass.** All four gates green:

```bash
npm run typecheck && npm run test && npm run lint && npm run validate:content
npm run dev        # → localhost:5173
npm run sim        # 2000-run balance report — see Balance
```

817 tests across 48 files. The catalogue is **155 offers** (49 ascent, 60
decline, 46 either), **32 relics** (16 common / 10 rare / 6 legendary, every one
with a power: 14 triggers, 11 passives, 5 actives, 2 lifelines), 6 factions, 10
lairs, 4 origins, **19 endings**, 20 themes.

**Mobile is the target audience.** 393×852 (iPhone 14/15) is the reference
device. 320px is the stress width, not the only small one — see Layout.

## Balance (`npm run sim`, seed 1, 2000 runs)

18 of 19 targets pass. Ascension 1.10% (band 1–4%), age-limit survival 30.4%
(band 8–35%), `slain_by_chosen_one` 42.45% (ceiling 45%), every ending reachable
(19/19 across the cohort probes), every relic power fires at least once.

**The one FAIL** is `arch_lich < good_wizard < every other dedicated-cohort
ending`: good_wizard 2.40% against overthrown_the_kingdom 1.00%. It is a
rarity-ordering claim between cohorts, not a reachability failure, and it should
be resolved by deciding which ending is meant to be rarer — not by loosening the
check. (The previous handoff's two red targets, `slain` and `lichdom`, are
green: later work moved `DEF_FLOOR` and the lich cohort.)

Things the numbers say that are worth a designer's eye:

- 42% of *simulated* careers end `slain_by_chosen_one`. The bots are not people;
  nobody has measured whether a human reads that as variety or as the same death
  four runs in ten.
- 74.6% of steady-state careers add nothing new to the relic collection, and the
  median run-count to fill the whole grid is over 60 (full completion of every
  ending and relic: median 548). That is intended — "the visible gap is the
  point" — but it is the number to watch if retention is ever the problem.
- Several relics almost never trigger (Pale Orrery 0.10% of runs, Seed That
  Remembers 0.05%, Final Ledger 0.20%). Legendary rarity explains most of it;
  it is still worth asking whether a relic a player will meet once in a thousand
  careers is the best use of an authored power.

## Layout — what was measured, and what was fixed

Every number here came from `qa/sweep-layout.mjs`, which plays seeded careers and
audits every state (decision, resolution, relic page, prophecy, ending) rather
than one lucky run. It found, after the relic rework:

- **Fixed: the whole run screen scrolled sideways ~5px** at every width (the
  notoriety badge's glow box overhangs the right edge).
- **Fixed: the crown lairs' names were ellipsised** in the masthead ("Citadel of
  Nine Winters", "The Mouth of the World" — the names a career spent fifteen eras
  earning). They wrap now.
- **Fixed: at 320px** the creation screen's run-length rows ran 16px off the
  right edge, and two ending-card labels were cut.
- **Fixed: every era after the first opened scrolled down the page** (98px at
  393, 275–372px at 320) whenever the player had scrolled to reach a lower card.
  `App` now resets the scroll on every screen change and `RunScreen` on every
  dismissed resolution. `qa/probe-era-scroll.mjs` is the regression check.
- **Fixed: Continue was 38px tall** — the most-pressed control in the game. 48px
  on phones.

**The honest numbers.** With the scroll reset the sweep can see where the first
card really sits. Same three seeded careers per width, before and after the
run-screen trim (the "Patron: None yet" line hidden until there is a patron, the
age moved onto the epithet line — header 125px → 100px):

| Viewport | Card 1 fully visible | 2+ cards visible | Median first-card top |
|---|---|---|---|
| 393×852 (reference) | 100% → 100% | 74% → 88% | 526 → 489px |
| 375×667 (iPhone SE 2/3) | 59% → 76% | 5% → 7% | 544 → 488px |
| 360×800 | 95% → 100% | 42% → 73% | 561 → 506px |
| 320×568 (stress) | 0% → 7% | 0% → 0% | 584 → 507px |

Nothing is clipped or off the edge at any of the four widths; the only findings
left are the small tap targets (the stat buttons 32px, the faction toggle and
Relics button 27px), which are above WCAG 2.2's 24px minimum and deliberately not
enlarged on the screen with the least height to spare.

The remaining lever for 375×667 is the run-ending counters (Loyalty, Pact Debt,
Apprentices, Followers), disclosed by `CLAUDE.md` rule 1 — any change to how they
are presented needs the owner to look at it first.

## Release readiness

`npm run assets` generates the favicon, touch and install icons, the manifest and
`public/og.png` from the game's own sigil; `index.html` links them and now
declares an absolute `og:image` (a large Twitter card with no image renders as a
blank box). The share *image* (the 1080×1350 canvas a player shares) has only
ever been rendered in desktop Chromium.

## Outstanding, in priority order

1. **Decided 2026-09-29** (the owner's call; `wiki/index-1.md` § Decisions):
   name screening is a deliberate non-goal, audio stays out and a few subtle
   haptics are in (`src/components/meta/haptics.ts`), and the small-phone budget
   is trimmed of lines that carry no information. Monetization is still open.
2. **Small-phone screen budget** — the trim above is the cheap half. The masthead,
   standings and stat rows still cost ~490px before a card at every width (see the
   table), so 375×667 shows card 1 in three decisions of four. What is left is
   the disclosed run-ending counters — an owner's look, not a unilateral edit.
3. **Verify the share image on real mobile Safari and Android Chrome.**
4. **The rarity-ordering FAIL** — see Balance.
5. **Measure the ending distribution on real players**, not policies.
6. Vocabulary drift still open from the old editorial pass: `Faction.adjective`
   is authored for all six factions and read by nothing, and content is en-GB
   except ~34 strings (the 30 artifact `Defense +N.` lines against
   `stakes.ts`'s `defence`).

## Two traps this build actually fell into

1. **`git checkout --` to undo a mutation destroys uncommitted work.** It
   silently reverted two files to HEAD mid-experiment, and the follow-up run
   then "passed" while measuring code that no longer existed. Back up with `cp`
   first when mutation-testing anything not yet committed.
2. **A validator rule that matched nothing.** The first version of the
   Ascension check was a regex; it matched in a scratch script, matched nothing
   inside the validator, and reported the catalog clean while the bad string sat
   in it. Run the check against the string it exists to catch, and watch it go
   red, before believing it.

And two from the polish pass (now failure modes 18 and 19 in `CLAUDE.md`):

3. **Editing the source while a browser probe is running reloads the page under
   it.** Vite hot-reloads the app; a sweep mid-career then times out clicking a
   card that is no longer there. It looks like a stall in the game. Don't touch
   `src/`, `public/` or `index.html` while a probe is in flight.
4. **Editing a CSS module that others `composes` from leaves them stale until the
   dev server restarts.** Vite re-hashes every class in `craft.module.css` when
   its content changes, but a dependent module (`TitleScreen.module.css`) stays
   cached against the OLD names — so the button carries `_btnPrimary_ndkm9_…`
   while the stylesheet now defines `_btnPrimary_1r1nk_…`, and a correct fix
   appears to do nothing. Production builds are unaffected. If a real-browser
   probe says a CSS change did not land, compare the element's class hash with
   the served rule's before doubting the change — and restart `npm run dev`.
5. **Seven of eleven QA probes had rotted** behind the changelog popup and nobody
   noticed, because nobody ran them. Every probe now enters through `openApp`.

## Architecture in one paragraph

`src/types.ts` is the frozen contract. `src/engine/` owns all run state in one
pure reducer and never imports `src/content/` — it takes a `ContentBundle`,
which is what lets `npm run sim` hold content constant. Anything the engine
needs to know about the *player* (their collection, for novelty bias) is passed
into `createRun`, never read from storage. `src/components/` is presentational;
`useGame` is the only stateful thing, and `App` only routes. Balance constants
live in `src/engine/constants.ts` and nowhere else. `qa/*.mjs` are Playwright
probes — `playthrough.mjs` plays a real run and fails on console errors,
`sweep-layout.mjs` audits every state across many careers, `probe-late-game.mjs`
judges the header where the longest lair name meets the decline readout,
`probe-era-scroll.mjs` plays like a thumb, and `first-run.mjs` is the shared
entry (`openApp`) that knows the launch popup and the tutorial are modal.

## The one habit that mattered

Measure, then look. Every significant finding in this project came from running
the thing and reading the numbers: the collection curve, the 19px the seal
warning cost the first choice card, the render-phase dispatch the browser caught
and jsdom did not, seven endings truncated mid-sentence on the card the game
exists to produce — and, in the polish pass, a page that scrolled sideways on
every screen for weeks and a scroll position that leaked across eras, both
invisible to 812 passing tests and to every screenshot. Several times the
*instrument* was the thing that was broken, and it confidently reported a
healthy game.
