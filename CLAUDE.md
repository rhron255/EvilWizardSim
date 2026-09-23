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
| `src/theme/` | Design tokens (`tokens.ts` for JS, `tokens.css` for `--ew-*`). |
| `src/engine/` | Run state, offer sampling, resolution, endings, persistence. |
| `src/content/` | Factions, 32 artifacts, lairs, origins, endings, epithets, ~155 offers, the changelog. |
| `src/components/run/` | The run loop: ledger, offer panel, notoriety badge. |
| `src/components/meta/` | Set-piece parts: lair grid, artifact grid, sigil. |
| `src/screens/` | Screen composition. |
| `scripts/` | `validate-content.ts`, `simulate.ts` (balance harness), `balance-report.ts` (renders the PR comment). |
| `qa/` | Playwright probes. Screenshots are gitignored. |
| `wiki/` | Design intent and rationale. |

## Commands

```bash
npm run dev              # → http://localhost:5173
npm run build            # typecheck + production build
npm run typecheck        # tsc -b --noEmit
npm run test             # vitest, single pass
npm run lint             # eslint, zero warnings tolerated
npm run validate:content # faction refs, option counts, disclosed effects
npm run sim              # 2000-run balance report; --fixtures for engine-only
```

CI posts the balance numbers on every PR as one comment that updates in place
(`.github/workflows/ci.yml` → `balance`). It runs `simulate.ts --report-json`
over five seeds on the branch and on its merge base, and
`scripts/balance-report.ts` renders the diff. Two things it deliberately does
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
4. **Comedy in the text, never in the numbers.**
   *Corollary, from issue #6.* An `Artifact` carries exactly one structured
   `power`, and the line the player reads is DERIVED from it
   (`src/components/meta/artifactPower.ts`) rather than authored beside it.
   `flavorText` is the only authored prose on a relic, which is the rule
   above made structural: the joke is the only thing an author can write, so
   the joke cannot drift from the number. Before this, all thirty-two relics
   carried a `defense: number` and a hand-written `effect: string` saying
   `Defense +N` — one concept in two fields, which is failure mode 4 waiting
   for the day the two stopped agreeing.
5. **No fail state, and no doom meter.** Every ending is a biography. The decline
   works because a number quietly goes the wrong way. Note this bans *announcing
   a losing phase* — it does not ban explaining what a mechanic does.
6. **Every ending must be reachable.** The collection shows a slot for each of
   the twelve — the original seven plus the five faction reprisals of issue
   #14 — and the header shows an empty Ascension trophy from era one.
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
   `padding-bottom: var(--ew-space-4); border-bottom: 1px solid var(--ew-line);`
   — so the eye can tell where one section ends and the next begins.
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

## Working on this

### Before calling a change done

1. `npm run typecheck && npm run test && npm run lint && npm run validate:content`
   — all four, and read the output.
2. Balance touched? `npm run sim`, and check the target's provenance.
3. UI touched? `node qa/playthrough.mjs --width 393 --height 852` **and read the
   PNGs back**, then repeat at `--width 320 --height 568` for anything with a
   row of controls (failure mode 15). 393px is the target device, not an
   afterthought; 320px is where a row that fit there runs out of room.
4. New focusable control (button, link, anything a player can Tab to)? Tab to
   it and press Enter/Space before calling it done — a screenshot cannot show
   a keypress (failure mode 15).
5. New test? Break the behaviour it pins and watch it go red — and check that
   the assertion is anchored to something the code under test does not also
   supply (failure mode 11).
6. New state that can end a run? Make the screen say so — the threshold, the
   distance, and the rate **if there is one**. If there is not, do not invent
   one; see failure mode 1.
7. New `Effect` variant that is deterministic? Add it to `PROJECTABLE` in
   `src/engine/effects.ts`, or the offer card goes back to printing the
   authored number instead of the real one.
7b. New `ArtifactPower` member? The compiler names every place that has to
   change — the renderer's switch and its ordering record, the engine's
   aggregator, the validator's `POWER_CAP`, and the test that sweeps all six.
   That is deliberate and was not free: two of those were bare `string[]`
   lists at first, and a bare list is the one enumeration of a union that
   nothing checks. Keep them `Record`s. The one thing left to a human is
   authoring a relic that actually carries the new power — the validator fails
   if nothing does, because a power the engine applies and no relic grants is
   failure mode 2.
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
