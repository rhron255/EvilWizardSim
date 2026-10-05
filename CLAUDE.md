# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Evil Wizard Simulator** — a short-session browser game. One run is a 2–4 minute
career: you name a wizard, make roughly fifteen choices, and get a shareable
biography. It is built and playable.

**Mobile is the target audience.** 393×852 (iPhone 14/15) is the reference
device, not a breakpoint to degrade toward — if a change looks right at 1440px
and cramped on a phone, it is wrong. Screen budget is the scarce resource there:
the run screen is a masthead, the six faction standings, and the decision
content, one continuous screen with no tabs (issue #36 removed the brief
Decision | Career split issue #18 introduced, and the ledger along with it) —
so anything added above the choice cards pushes the actual interaction
further down the page.

*Amended for the relic page (issue #78, slice 1 of #77).* The Relics stat in
the decision content is a navigation button that swaps the decision content —
not the masthead, not the faction standings — for a page listing what you
hold, what you lost, and the wards figure. This is not a second SCREEN and
not a reopened tab split: there is no persistent nav, nothing above the choice
cards grew, the view is local, throwaway `useState` (a reload always lands
back on the decision), and a player who never taps it sees no difference at
all. Read it as "no tabs" surviving with one optional, one-tap-away exception
carved out for it, not as the pillar being relaxed.

The reward structure is modelled on **ליגיונר** (legionnaire.xyz). `wiki/` holds
the design rationale; `wiki/06_reference_analysis.md` explains *why* the
constraints below exist, and is the thing to read before relaxing any of them.

> The wiki still describes itself as pre-implementation in places. It is the
> design record, not API documentation — where it and the code disagree about
> what exists, the code is right. Where they disagree about **intent**, stop and
> reconcile deliberately rather than assuming either one.

## Repository layout

| Path | Owns |
|---|---|
| `src/types.ts` | **The frozen contract.** Every module is written against it. |
| `src/version.ts` | `BUILD_VERSION` — bump it and add a `src/content/changelog.ts` entry on every player-visible change (issue #67). |
| `src/theme/` | Design tokens (`tokens.ts` for JS, `tokens.css` for `--ew-*`), the theme catalog (`themes.ts`), and the ornament shapes (`ornaments.ts`, generated into `ornaments.css` by `npm run ornaments`). |
| `src/engine/` | Run state, offer sampling, resolution, endings, persistence. |
| `src/content/` | Factions, artifacts, lairs, origins, endings, epithets, 155 offers, the changelog. |
| `src/components/run/` | The run loop: masthead, faction standings, decision and offer panels, resolution overlay, relic page, notoriety badge. |
| `src/components/meta/` | Set-piece parts: lair grid, artifact grid, sigil. |
| `src/screens/` | Screen composition. |
| `scripts/` | `validate-content.ts`, `simulate.ts` (balance harness), `balance-report.ts` (renders the PR comment), `build-static-assets.ts` (`npm run assets`), `build-ornaments.ts` (`npm run ornaments`). |
| `public/` | Favicon, touch/install icons, manifest and the link-preview image — generated from the game's own sigil by `npm run assets` and committed. |
| `qa/` | Playwright probes. `sweep-layout.mjs` plays many careers and audits every state; `probe-late-game.mjs` and `probe-era-scroll.mjs` cover the worst-case header and the scroll reset; `probe-keyboard.mjs` plays a whole career with no mouse; `probe-themes.mjs` measures the themes, `probe-ornament-spacing.mjs` measures how close every theme's ornament sits to content, `probe-room-contrast.mjs` paints every theme's bare room and scores its text against the default's, and `shoot-themes.mjs` photographs all twenty side by side. Every probe that lists themes reads them from `THEMES` through `qa/theme-ids.mjs`. Screenshots are gitignored. |
| `wiki/` | Design intent and rationale. |

## Commands

```bash
npm run dev              # → http://localhost:5173
npm run build            # typecheck + production build
npm run typecheck        # tsc -b --noEmit
npm run test             # vitest, single pass
npm run lint             # eslint, zero warnings tolerated
npm run validate:content # faction refs, option counts, disclosed effects
npm run sim              # 2000-run balance report, always against real content
```

CI posts the balance numbers on every PR as one comment that updates in place
(`.github/workflows/ci.yml` → `balance`). It runs `simulate.ts --report-json`
over five seeds on the branch (side by side, one process per seed, via
`scripts/measure-seeds.sh` — the numbers are identical to a sequential run) and
compares against the base commit's numbers,
and `scripts/balance-report.ts` renders the diff. The base's numbers are not
re-measured every time: the sim is deterministic per seed, so they are cached
by commit (`scripts/balance-cache-key.ts` builds the key), seeded by the
`balance-baseline` job on every push to main, and measured for real only on a
miss (a PR opened before its base finished seeding, or a stacked PR whose base
is another PR branch). The step summary says which happened. Two things it deliberately does
NOT do: gate the merge (the sim has disclosed standing FAILs, so blocking on it
would invite someone to relax a band to get green), and report a movement
smaller than the spread the seeds themselves show (a two-career swing on a
200-run cohort is not a signal — it reads `±noise`).

**The gate is all four of `typecheck`, `test`, `lint`, `validate:content`.**
Balance changes additionally need `npm run sim`. Visual changes need a real
browser — see below.

## The rules that are load-bearing

These come from a game that worked at scale. They look arbitrary in isolation.

1. **Odds are printed before the commit, and there is no undisclosed downside.**
   Enforced by types, not convention: `Effect` is structured data (never prose,
   so the renderer can always print it) and `OfferOption`'s `gamble` variant
   cannot compile without `onFailure`. `validate:content` catches the ways
   around it, like an empty failure branch.
   *Two corollaries are easy to miss.* First, disclosure does not stop at the
   choice: a stat that silently counts toward an ending is an undisclosed
   consequence too, which is why every header stat names its threshold.
   Second — **the card prints what the ENGINE will do, not what the author
   typed.** Authored effects pass through `projectEffects` before they are
   rendered, because two things came between the list and the outcome: standing
   spills onto `hostileTo` (so `+8 Gilded Hand` also moved the Choir, unnamed),
   and floor clamps ate costs whole (49.6% of accepted follower costs deducted
   nothing). Anything deterministic is projected; anything random —
   `artifactFrom`, `loseArtifact` — stays as authored, because resolving a draw
   early would either spoil the reveal or print a lie. If you add a
   deterministic `Effect` variant, add it to `PROJECTABLE` or the card starts
   lying again.
   *Amended for the Good Wizard route (issue #23; widened by issue #25's
   Arch-Lich).* `goodActs`/`illActs` are hidden `RunState` counters — the one
   deliberate exception to this rule, and a narrower one than theme's
   exception to rule 3: these two counters are never disclosed anywhere, not
   on the card and not after it. Defensible on exactly one ground, and only
   this one: the route they gate can only ever ADD an ending (`good_wizard`,
   or `arch_lich` for a wizard who is also a lich — decided by `isLich`, an
   already-disclosed state, never by the counters themselves), never end a
   run early, never close a door, never move any other threshold.
   `applyEffects` in `src/engine/effects.ts` never pushes either variant to
   `EffectApplication.applied` — the array every renderer walks — so the
   silence is structural, not a UI-layer filter someone could forget to add
   to a new screen. Enforced, not merely asserted: `src/engine/
   goodWizard.test.ts` sweeps both counters against every other engine
   outcome (`defenseOf`, `threatGainFor`, `decayFor`, every `checkEndings`
   branch but its own two, every `Condition` but its own two) and asserts
   nothing moves; `src/components/run/stakes.test.ts` sweeps the header for
   any mention of them. **If a future change makes either counter gate
   anything else, this exception is void and both must be disclosed like every other
   stat** — see the doc comment on `Effect`'s `goodAct`/`illAct` variants in
   `src/types.ts`.
2. **The ledger appends and never resets.** The accumulating table is what makes
   abandoning a run expensive. Its Deeds column is the only prose in it — if
   rows start reading alike, the ledger has stopped saying anything.
   *Amended for issue #36.* The ledger is no longer rendered anywhere in the
   run UI — the tab it lived on (Career) is gone, and there is no second
   screen for it to move to instead. The underlying data survives: every era
   still writes a `deedSummary` onto `RunState.eras` (`src/engine/deeds.ts`),
   because `scripts/simulate.ts` still measures deed-line repetition as a
   balance signal even with no UI reading it. What is gone is only the
   always-visible, append-only TABLE this rule was written to protect. If a
   future change resurfaces a visible history of a run, the "rows must not
   read alike" bar still applies to it.
3. **One scarce colour, earned inside the run.** Near-monochrome warm dark; the
   Notoriety tier badge is the only chromatic reward *the game hands you during
   a career*. Adding a second accent to that vocabulary breaks the pillar.
   *Amended for themes (issue #15).* Unlocking an ending grants a cosmetic
   theme, and the player may wear one. That is not a second accent, because it
   is not a reward the run pays out: it is chosen between runs, applies to the
   whole room rather than to one object, and cannot make the badge less
   special because **no theme may define `--ew-tier` or `--ew-tier-glow`** —
   held by the type system in `src/theme/themes.ts` and swept in
   `themes.test.ts`. A theme is a hue rotation of the same warm-dark
   structure, near-monochrome within itself, and it clears the default
   palette's ink-on-panel contrast. The distinction to keep: **the game
   colours what you did; the player colours the room.**
   *Ornament follows the same rule.* A theme also decorates its room — a key
   light, a wallpaper, a corner glyph, a card trim — and all four are tokens
   in its `tokens.css` block, never a `[data-theme]` selector in a component
   stylesheet. The shapes are colourless masks (`src/theme/ornaments.ts`)
   painted in the theme's own `--ew-line-strong`; the key light and card trim
   are coloured only from the room's own surface and ink tokens or plain
   white or black, except that the key light alone may carry a faint tint
   (alpha 0.07 at most) within the room's hue family — the same 90° quadrant
   as its surfaces and ink, which is looser than near-monochrome. So
   ornament brings no hue from outside the room's quadrant, and only the key
   light brings one the palette does not already have. The wallpaper and key light are capped
   so text on the bare room reads at least as well as in the default room;
   and every pair of themes must sit at least 1.5 just-noticeable differences
   apart (all measured in `themes.test.ts`). The room floor holds in the
   browser's own pixels too: after touching a theme's key light, wallpaper
   opacity, void or ink, run `node qa/probe-room-contrast.mjs`, which paints
   every room in Chromium and fails if any reads worse than the default
   (`--themes a,b` checks one retune; the full set takes about five minutes).
4. **Comedy in the text, never in the numbers.**
5. **No fail state, and no doom meter.** Every ending is a biography. The decline
   works because a number quietly goes the wrong way. Note this bans *announcing
   a losing phase* — it does not ban explaining what a mechanic does.
6. **Every ending must be reachable.** The collection shows a slot for each of
   the nineteen — the original seven, the five faction reprisals of issue #14,
   the five faction leaderships of its second slice, the Good Wizard (#23) and
   the Arch-Lich (#25) — and the header shows an empty Ascension trophy from
   era one.
   `npm run sim` checks this; three endings were once unreachable and the run
   felt hollow, and three of the reprisals arrived unreachable for exactly the
   same reason (the catalog let you court a faction on purpose and only offend
   one by accident — see `src/content/offers/grievances.ts`).
   *Reachable by whom is part of the check.* Five of the six reprisals are
   cohort-shaped, so the harness plays a dedicated 200-run probe per faction
   rather than reading ~40 runs out of the population, where one career moves
   a rate by two and a half points.

## Styling conventions

Concrete CSS/markup patterns worth reusing, as distinct from the load-bearing
design pillars above — these are "how", not "why". Established while building
the run screen's section layout (issue #36) and the faction-standings collapse
that followed it.

1. **Adjacent sections get a border, not just a gap.** A flex `gap` alone reads
   as one undifferentiated block once a screen has more than one section
   stacked on it. Close a section the way `Masthead`'s `.header` does —
   `padding-bottom: var(--ew-space-4)` and `composes: sectionRule` from
   `craft.module.css` (a 1px bottom border as far as layout goes, with the
   rule painted into it and the theme's glyph set in its middle; the element
   must be `position: relative`) — so the eye can tell where one section ends
   and the next begins.
   `FactionStandings.module.css`'s `.section` follows the same rule for
   exactly this reason: it sits between the masthead and the decision content
   and needs to read as its own thing, not a continuation of either.
2. **A control the player must find at a glance needs visual weight of its
   own.** `--ew-ink-faint` is the tone reserved for captions and labels — text
   nobody is required to act on. A tappable control rendered in that same tone
   reads as one more caption, not as an affordance, and gets missed. Give it a
   border, a pill radius, and the brighter `--ew-ink` (with `--ew-ink-bright`
   on hover/focus) instead of `--ew-ink-faint` — see `FactionStandings`'s
   expand/collapse toggle for the pattern.
3. **Don't restate a disclosure that's already on screen.** Rule 1 above
   requires a threshold be shown *somewhere*; it does not require it printed
   twice in the same view. If two elements on one screen state the same
   standing/threshold/consequence, drop whichever copy is not the ambient
   line for it — repetition where the player is already looking reads as
   noise, not as extra safety. (`FactionStandings`'s collapsed rows drop their
   own note text because `DecisionPanel`'s next-threat line already states it
   for whichever faction is actually closest; the note comes back once
   expanded, where reading all six is the point and nothing above is deputizing
   for it any more.)

4. **Feel is a garnish, never a channel.** The game has haptics and no audio, on
   purpose: its voice is text and its one earned colour is the tier badge, so a
   sound would be a second, louder voice. A haptic beat rides a visual event that
   is already on screen (the verdict word's own `animationstart`, never a
   `setTimeout` that could drift from the stylesheet), carries nothing the card
   does not already print, is silent for a certain choice, and is inert under
   reduced motion and on platforms without `navigator.vibrate`. It needs no
   setting and no disclosure *because* it carries no information — the moment a
   beat means something a player could miss, it is a disclosure and rule 1
   applies. See `src/components/meta/haptics.ts`.
5. **A card wears the room's ornament through two tokens, not a theme
   selector.** `composes: pips` from `craft.module.css` puts the theme's glyph
   at its corners (it spends the card's `::after`), and `var(--ew-trim, none)`
   goes first in its `background` list — in the hover and active states too,
   or the trim vanishes under a finger. The `none` fallback matters: an
   undefined custom property invalidates the whole `background` declaration
   and the card renders transparent. See `OptionCard.module.css`.
   **Ornament keeps `--ew-space-1` (4px) from content.** Corner glyphs sit in
   the card's corner itself. Every offset is measured inside the card's
   border — from the padding box, where background layers are positioned —
   and the numbers come from the tightest card in the game, OptionCard at
   phone width, 8px × 12px of padding, whose height the fold budget will not
   let grow: content starts 12px across and 8px down from each corner. A trim
   is laid over more than the panel — OptionCard is raised-to-panel at rest
   and `--ew-hover` under a finger — and each layer is one of two kinds, split
   by the probe's `DRAWN` (some channel moved 24 levels) on the strongest of
   those surfaces. A *mark* — a rule, a hem, a facet — is drawn that hard on
   at least one, so it is held by geometry: an edge band in the outer 4px
   running only between the corner glyphs, 12px in (`edgeBand` in
   `themes.ts`), or a corner mark (`cornerMark`) every point of which lies
   within 8px of the side or 4px of the edge — a square of at most 8px, or a
   triangle across the corner with legs of at most 12px, every stop in px. A
   *wash* — a soft tint — stays under `DRAWN` on every surface, alone and
   stacked with the room's other washes, and may sit behind text, so
   over each surface the ink must read at least as well as the default ink on
   the default's version of it (the panel floor, on the panel; on any surface
   where a palette already reads lower than the default's — several hovers
   and raised steps do — the wash may cost nothing), and no wash may move a
   card toward its ink. `themes.test.ts` sorts every layer over every surface the stylesheets lay a
   trim on and asserts both.
   `node qa/probe-ornament-spacing.mjs` measures every theme's glyphs and
   marks against every keycap, rail and line of text, at 393, 320 and 1280
   wide; run it after touching a trim, a glyph, or a card's padding.

## Failure modes this repo has actually produced

Every one of these shipped, typechecked cleanly, and was found by a player or by
measurement rather than by review. Full write-ups — what shipped, why the check
exists, and the incident that paid for it — live in
`wiki/07_failure_modes.md`; use the table below to recognize which one applies,
then open the file for the story and the exact check.

| # | Pattern | Check |
|---|---|---|
| 1 | Disclosure decays after the choice | Every `RunState` field that can end or change a run shows its threshold, distance, and rate — and nothing is left over once a rate is deleted. |
| 2 | Written but never wired | `rg` for the call site after adding a module or union member; a file that exists is not a file that runs. |
| 3 | Optional fields hide drift at a seam | Never hand-mirror a type across a seam — re-export it. |
| 4 | One field, two readings | Document a shared field's semantics in a doc comment and assert them in `validate-content.ts`. |
| 5 | The instrument lies | Suspect the harness before the game when a metric looks impossible; sanity-check any policy independently. |
| 6 | Invented targets get chased | Every balance target needs a provenance you can cite. |
| 7 | Screenshots lie | Probe the DOM, not `fullPage`; confirm a PNG is from THIS run before trusting it. |
| 8 | Responsive layouts diverge from their markup | Audit every `colSpan` whenever a breakpoint hides a column. |
| 9 | Gates that were only ever claimed | Run the gate and read the output — "it passes" is not evidence. |
| 10 | Fixing the symptom and reporting the cause fixed | Verify the thing you actually claimed to fix, not a proxy for it. |
| 11 | The check that graded its own homework | Anchor assertions to something the implementation doesn't also supply; mutation-test them. |
| 12 | Acceptance criteria are targets too | State a threshold's provenance before optimising toward it. |
| 13 | A derived visual that saturates early | Assert a bar/meter/scale's mapping at the EXTREMES, not a typical value. |
| 14 | A cost the engine clamps to nothing | Ask what happens at zero whenever an effect spends a countable balance for a fixed benefit. |
| 15 | Verified at one width, with no hand on the keyboard | Shoot the 393px reference AND 320px; tab to and activate every new focusable control. |
| 16 | An engine's own name for itself leaks onto the card | `rg` the shipped string for any internal identifier (a mechanic's own name, a constant, a field) before calling player-facing text done. |
| 17 | A fallback strings a name together while the real one sits unused | `rg` a "display fallback only" helper's call sites; confirm each one actually lacks the real content, or has simply never been given it. |
| 18 | State that outlives the screen that set it | Anything shared across screens (scroll, focus, storage) needs an owner that resets it on the transition. Drive the game the way a thumb does — scroll to the last card, tap, continue, read `scrollY` (`qa/probe-era-scroll.mjs`). |
| 19 | Probes that rotted while the game was fine | Every probe enters through `openApp` (`qa/first-run.mjs`); assert structure not counts; when something every player meets first changes, run every probe once. |
| 20 | The card is exact until a random draw lands mid-list | A `loseArtifact` before an effect a relic can rescale lets the roll strip the passive after the card printed it. `disclosure.property.test.ts` fuzzes 2,500 careers; `validate:content` refuses the ordering. Re-run the property test whenever a mechanic starts rescaling printed numbers. |

## Working on this

### Before calling a change done

1. `npm run typecheck && npm run test && npm run lint && npm run validate:content`
   — all four, and read the output.
2. Balance touched? `npm run sim`, and check the target's provenance.
3. UI touched? `node qa/playthrough.mjs --width 393 --height 852` **and read the
   PNGs back**, then repeat at `--width 320 --height 568` for anything with a
   row of controls (failure mode 15). 393px is the target device, not an
   afterthought; 320px is where a row that fit there runs out of room.
   A layout change also gets `node qa/sweep-layout.mjs` at both widths — a
   random playthrough almost never reaches the longest lair name or the
   tallest card, and the sweep does.
   **Opening or updating a PR for a visual change always attaches the
   screenshot(s) that prove it** — the same PNGs this step already produces,
   not a fresh round taken just for the PR. A reviewer approving a UI change
   from the diff alone is reading `<div>`s, not the screen a player sees; the
   picture is part of the review, not decoration on it. This applies to every
   visual change, however small — a copy tweak on an existing screen still
   gets the screenshot that shows the new copy in place.
4. New focusable control (button, link, anything a player can Tab to)? Tab to
   it and press Enter/Space before calling it done — a screenshot cannot show
   a keypress (failure mode 15). `node qa/probe-keyboard.mjs` plays a whole career
   with no mouse and reports where focus lands at every transition.
5. New test? Break the behaviour it pins and watch it go red — and check that
   the assertion is anchored to something the code under test does not also
   supply (failure mode 11).
6. New state that can end a run? Make the screen say so — the threshold, the
   distance, and the rate **if there is one**. If there is not, do not invent
   one; see failure mode 1.
7. New `Effect` variant that is deterministic? Add it to `PROJECTABLE` in
   `src/engine/effects.ts`, or the offer card goes back to printing the
   authored number instead of the real one.
   Changed how a relic, passive or clamp rescales a number a card prints, or
   added an `Effect` that can land after a random one? `npm run test` includes
   `src/engine/disclosure.property.test.ts` (2,500 seeded careers: nothing changes
   that the resolution did not report, and the card equals the outcome) — read a
   failure as a rule-1 defect, not a flaky test. `resume.property.test.ts` and
   `gameReducer.property.test.ts` do the same for a saved career and the state
   machine.
8. New content field the UI reads? Make it **required** on the type and let the
   compiler name every fixture. `Ending.hint` found all fourteen call sites
   that way; an optional field would have rendered blank in two of them.
9. Shipping a player-visible change (a new mechanic, a balance retune, a UI
   fix worth announcing)? Bump `BUILD_VERSION` in `src/version.ts` to the
   current UTC timestamp ("YYYY-MM-DDTHH:mm:ssZ" — a bare date collides the
   moment two builds ship the same day, which is why the key is a full
   timestamp and not just a date) and add a matching entry to `CHANGELOG` in
   `src/content/changelog.ts` (issue #67) — a one-line `summary` for the
   launch popup, plus the fuller `details` for the Changelog screen. This is
   not optional busywork: the build itself enforces it. `npm run prebuild`
   (which `npm run build` runs automatically) and `npm run validate:content`
   both fail if `BUILD_VERSION` has no matching key, so a change that skips
   this step does not ship, it just fails later with a less informative
   error. A change with nothing worth telling a player about (an internal
   refactor, a test-only fix) does not need a bump — do not invent filler
   entries to satisfy the check.
   Keep both `summary` and each `details` line to one short sentence — a
   player reads these, not a commit message. Name what changed and, if it
   fits in the same breath, why a player would care; leave out the
   mechanism (which files, which constant, which cohort rate moved). "Fixed
   a bug where X" is fine; a paragraph tracing the balance investigation
   that found X belongs in the commit message and the issue, not here.

### Measure before you tune

`npm run sim` plays 2000 runs across seven player policies against explicit
targets. Do not adjust a constant because a run felt wrong — get the number,
change it, get the number again. Balance constants live in
`src/engine/constants.ts` and nowhere else.

### Content and engine are separated on purpose

The engine never imports `src/content/`; it takes a `ContentBundle`. Keep it that
way — it is what lets the balance harness hold content constant, and what makes a
content pack a different argument rather than a different engine.

### Prose moves with behaviour

Changing what a mechanic does means changing everything describing it in the same
commit: the KDoc, the wiki page, `README.md`, and any UI caption that states a
threshold. `rg` the old wording before calling it done.

### The engine's vocabulary is not the player's

`src/engine/` and `src/types.ts` name things for the people maintaining them:
"contagion", `hostileTo`, `clamp`, `CONTAGION_GAIN`. None of those words are
ever taught to a player — not in the tutorial, not on any card. Player-facing
text (a relic power's description, an offer's body or `resultText`, an ending
hint, a changelog entry) describes the effect a player can observe, in terms
the rest of the UI already uses (a stat, a faction, a threshold), never the
mechanism's own internal name. See failure mode 16 (`wiki/07_failure_modes.md`)
for the shipped example — `relicPower.ts` printed "standing lost to contagion"
straight from the code comment describing the mechanic. Before calling
player-facing text done, `rg` the shipped string for any internal
identifier and rewrite around it if one shows up.
