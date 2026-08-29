# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Evil Wizard Simulator** — a short-session browser game. One run is a 2–4 minute
career: you name a wizard, make roughly fifteen choices, and get a shareable
biography. It is built and playable.

**Mobile is the target audience.** 393×852 (iPhone 14/15) is the reference
device, not a breakpoint to degrade toward — if a change looks right at 1440px
and cramped on a phone, it is wrong. Screen budget is the scarce resource there:
the header and ledger sit above the choice cards by design (see rule 2), so
anything added to them pushes the actual interaction further down the page.

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
| `src/theme/` | Design tokens (`tokens.ts` for JS, `tokens.css` for `--ew-*`). |
| `src/engine/` | Run state, offer sampling, resolution, endings, persistence. |
| `src/content/` | Factions, artifacts, lairs, origins, endings, epithets, ~130 offers. |
| `src/components/run/` | The run loop: ledger, offer panel, notoriety badge. |
| `src/components/meta/` | Set-piece parts: lair grid, artifact grid, sigil. |
| `src/screens/` | Screen composition. |
| `scripts/` | `validate-content.ts`, `simulate.ts` (balance harness). |
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
2. **The ledger appends and never resets.** The accumulating table is what makes
   abandoning a run expensive. Its Deeds column is the only prose in it — if
   rows start reading alike, the ledger has stopped saying anything.
3. **One scarce colour.** Near-monochrome warm dark; the Notoriety tier badge is
   the only chromatic reward. Adding a second accent breaks the pillar.
4. **Comedy in the text, never in the numbers.**
5. **No fail state, and no doom meter.** Every ending is a biography. The decline
   works because a number quietly goes the wrong way. Note this bans *announcing
   a losing phase* — it does not ban explaining what a mechanic does.
6. **Every ending must be reachable.** The collection shows seven slots and the
   header shows an empty Ascension trophy from era one. `npm run sim` checks
   this; three endings were once unreachable and the run felt hollow.

## Failure modes this repo has actually produced

Every one of these shipped, typechecked cleanly, and was found by a player or by
measurement rather than by review. They are listed as *patterns* because each
recurred, and because the check is cheaper than the bug.

### 1. Disclosure decays after the choice

The odds rule is satisfied on the card and then quietly abandoned. Four times:

| What shipped | How it presented |
|---|---|
| Pact debt showed its ceiling but not that it accrues `+1` per decline era † | Player died at 6/7 having been shown one era of headroom that did not exist |
| Faction standing was not on the run screen at all | `sealed_in_gem` is **18.5% of runs** and arrived with no warning, twice |
| Stats were bare numbers | "the implications of followers, pact debt, loyalty… are not clear" |
| The pact interest tick fired in the era-end systems, which the resolution card omits by design † | "I died being consumed by the pact, even though the last action I took had nothing to do with pacts" |

† **The pact interest tick no longer exists.** Both of these were patched by
disclosing it better; it was eventually deleted instead, and pact debt now moves
only on a card the player accepted. The bugs are kept here because they are what
the checks below were bought with — and because the second one still describes
apprentice loyalty drift, which does still tick. The mechanic went; the lesson
did not.

Standing made it worse: it moves by **contagion** along `hostileTo`, so courting
the Covenant drives the Academy toward the seal through cards that never name the
Academy — an undisclosed downside reached by an invisible route.

**Check:** for every field on `RunState`, ask *can this end or change a run, and
does the screen say so?* If it counts toward a threshold, show the threshold, the
distance, **and the rate of change**. A ceiling without its clock is a lie.

*And the inverse is a lie too.* Pact debt has no clock any more — it moves only
on cards the player accepted — so its caption states the ceiling and nothing
else. A rate clause left behind after the rate is deleted misleads exactly as
badly as a missing one, pointing the other way. `stakes.test.ts` sweeps every
balance in both phases for the words that would reintroduce it, asserted against
the rendered caption rather than a constant, because a deleted constant cannot
fail a test.

And ask it again of the *resolution*: if an era-end system can end the run, the
card reporting that era must say the tick fired, in a section of its own
(`SystemicChange`, rendered as *While you were elsewhere*). Folding it into
`appliedEffects` swaps one lie for another — it blames the option the player
just picked. The line against wiki/04's doom-meter ban is drawn in that file
now: the erosion stays quiet, the lethal counters do not.

### 2. Written but never wired

Code that exists and is never called. Five times:

- `deeds.ts` — complete, never imported. Every ledger row read `It is done.`
- `becomeLich` — handled only via the legacy `ending: 'lichdom'` path, so moving
  content to the new effect would have silently done nothing.
- Five `scripted` offers — excluded from sampling with only `prophecy` placed, so
  the lichdom branch and the Chosen One were unreachable content.
- The engine never set `roll`/`odds`, so the resolution's roll rail — principle
  4's visual proof a gamble was fair — **never rendered once, the entire build**.
- `planShareTail` — a complete, well-argued, unit-testable fix for the share
  card's footer overlap, sitting in the file above a renderer that still ran
  `.slice(0, 8)` and drew the footer at a fixed offset. The bug it fixed was
  still fully live.

**Check:** after adding a module or a union member, `rg` for its call site. A file
that exists is not a file that runs. Prefer an exhaustive `switch` with a `never`
guard so the compiler names the unwired case.

*The last one has a specific cause worth naming:* work that stops partway —
an interrupted session, a subagent that hits a limit mid-task — lands as a
plausible, well-commented, uncalled function, and it reads like a finished
change. Before believing any handed-over work, `rg` for the call site and run
the thing it claims to fix.

### 3. Optional fields hide drift at a seam

The roll bug survived because the UI kept a *hand-written mirror* of the engine's
`Resolution` and declared `roll`/`odds` optional. Optionality made "engine never
supplies this" and "engine supplies this" typecheck identically.

**Check:** never mirror a type across a seam — re-export it
(`src/components/run/resolution.ts` is now a single `export type` line and the
comment explaining why). When a field must be optional, add a test that the
producer actually produces it.

### 4. One field, two readings

`artifactFrom.rarity` meant "exact" to the content author and "cap" to the
engine, which then weighted the draw `common:12 / legendary:0.5`. An authored
"grant a legendary" returned a common ~97% of the time and **Ascension sat at
0.00% across 2000 runs**.

**Check:** a shared field whose name permits two readings is a silent bug. State
the semantics in a doc comment on the type, and assert them in
`scripts/validate-content.ts`.

### 5. The instrument lies

`npm run sim` printed **"All balance targets met"** while measuring a game nobody
plays. Three separate times:

- It ran `src/engine/__fixtures__/` instead of the real 110-offer catalog.
- Its `lich` policy was a copy of `adaptive` and never took the rite it is named
  after, reporting 0.00% for a branch a real seeker reaches ~3% of the time.
- `wormAffinity` scored a gamble's success branch at face value, so the policy
  chased bets it lost — raising its devotion made it **less** likely to succeed.
- Every policy priced pact debt linearly, with no awareness of `PACT_LIMIT`, so
  a bot at 6/7 paid the same as one at 0/7. Fixing that to a convex cost was
  correct AND exposed the deeper version of the same defect: once the debt tick
  was deleted, every policy became a perfect ceiling-avoider, and the ending's
  measured rate dropped to ~1% — a fact about **optimisers**, not about the
  game. A player who simply keeps saying yes reaches it ~10% of the time. The
  fix was a `reckless` policy carrying the target as a cohort, with the
  population figure printed beside it untargeted.

**Check:** when a metric looks impossible, suspect the harness first. Confirm the
target measures the population you mean (a cohort-level effect measured
population-wide mostly measures the population mix). Sanity-check any policy
against an independent throwaway probe before believing it.

**And ask who the model player is.** A number produced by policies that all play
better than any human is a measurement of the policies. Any mechanic whose whole
point is punishing inattention needs a cohort in the population that is not
paying attention, or the harness will report it as dead content.

### 6. Invented targets get chased

The "lichdom in 3–8% of runs" band came from a task brief, **not the wiki**,
which sets no rate for lichdom. It was then chased hard enough to distort
`DEF_LICH` twice before anyone asked where the number came from.

**Check:** every balance target needs a provenance. If you cannot cite the wiki
line, say so in the check's comment and pick a band the design can justify.

### 7. Screenshots lie

Three traps, each of which nearly produced a "fix" for a non-bug:

- `fullPage` stitches `position: fixed` overlays over the content behind them.
  Text looks clipped and buttons look missing when neither is true.
- Staged reveals. The ending card settles at ~840ms and the prophecy at ~2.9s;
  shooting earlier captures a half-empty screen.
- **A shot from a previous run, under a name that looks current.** Shots are
  numbered by counter and named by step, and the step ORDER moves between runs
  — the prophecy fires on a different era each time, so one run writes
  `05-prophecy`/`06-run-mid` and the next writes them swapped. The loser of that
  swap survives on disk as a plausible, correctly-named file from an older
  build. A header fix was diagnosed as broken against a `06-run-mid.png` that
  was two minutes old and one build stale; the bug in it had already been fixed.
  `playthrough.mjs` now clears its label's shots before writing, which is the
  durable fix — but the trap generalises to any artifact directory a tool
  appends to rather than owns.

**Check:** probe the DOM (computed `opacity`, `scrollHeight` vs `clientHeight`,
bounding boxes) before believing a visual defect. `qa/probe-mobile.mjs` does
exactly this. Capture the viewport, not `fullPage`, when an overlay is up. And
before believing a PNG at all, confirm it is from THIS run — `ls -l` the
directory and read the timestamps, or delete them first and let the run
recreate what it actually covers. A screenshot with no mtime beside it is an
undated claim.

*The probe written to settle it is not exempt.* The one measuring where the
identity line broke compared rect `top`s across a 28px name and a 17px epithet
and reported every case as broken, including a single-line one — baseline-aligned
text on one line has different tops. It went green only after it tested vertical
overlap instead. Failure mode 5 applies to the thing you build to check, in the
hour you build it.

### 8. Responsive layouts diverge from their markup

The ledger's empty state used `colSpan={6}`, but phones hide the Lair column and
have five — the browser invented a sixth column, so the pinned header background
stopped short of the frame.

**Check:** if a media query hides a table column, hide the matching cell *and*
audit every `colSpan`. Anything spanning "all columns" must agree at every
breakpoint.

### 9. Gates that were only ever claimed

`npm run test` exited 1 with "No test files found" and
`npm run validate:content` pointed at a file that did not exist — while both were
being cited as passing. The validator found a real defect on its first run.

**Check:** run the gate and read its output. "It passes" is not evidence.

### 10. Fixing the symptom and reporting the cause fixed

`README.md` was UTF-16LE. Its content was rewritten and the fix was reported —
but the *encoding* was never checked, so it was written straight back as UTF-16LE
and committed that way. It stayed unreadable to `grep`, to GitHub, and to most
editors for nine commits, while the notes said it had been fixed.

**Check on Windows specifically:** an editor or shell can silently preserve or
impose UTF-16. After touching a text file, confirm what actually landed:

```bash
python -c "d=open('README.md','rb').read(); print(d[:6], d.decode('utf-8')[:40])"
```

More generally: when you report a fix, the thing you verified must be the thing
you claimed. "I replaced the contents" is not "I fixed the encoding".

*Line endings are the same trap wearing a smaller hat.* This working tree is
CRLF and the repo stores LF, so a `python` text-mode write silently converts.
That is fine here — `git diff --numstat` proves it, and the check is one
command — but "the diff is 8 lines, not 400" is the evidence, not the
assumption.

### 11. The check that graded its own homework

The share card's regression test asserted `plan.bottomY <= plan.limitY`. Both
numbers come from the function under test, so widening the limit satisfied the
test — and it stayed **green** under a mutation that reintroduced the exact
text-over-text overlap it was written to catch. Fixed by asserting against the
footer position the *renderer* passes in.

The same shape, twice more in one session: a validator rule for `Ending.hint`
was appended *below* the report block, so it ran, pushed a real failure, and
exited 0 with "content OK"; and a QA probe read the resolution card's prose to
decide what a choice had charged, when the resolution omits zero-delta lines by
design — so it reported a working fix as broken.

**Check:** an assertion must be anchored to something the implementation does
not also supply. Mutation-test it — break the behaviour and watch it go red —
and for a gate, check the **exit code**, not just the message. When a probe
disagrees with a unit test, suspect the probe: measure the state, never the
story about the state.

### 12. Acceptance criteria are targets too

Failure mode 6 is about balance numbers. It applies just as hard to a number
you invent while reviewing: "the first choice card must start within 520px" was
never in the wiki, could not be met without moving the ledger below the cards
(which rule 2 forbids), and was chased through several rounds of layout
surgery before anyone asked where 520 came from.

**Check:** before optimising toward a threshold, say where it came from. If the
answer is "it seemed right", pick the criterion the design can actually satisfy
— here, *the first card is fully on screen* — and say plainly that you changed
it, rather than reporting a permanently red check or quietly relaxing it.

### 13. A derived visual that saturates early

The faction standing bar is centre-zero and computed its fill as
`ratio * 100%` under `overflow: hidden`. So it reached the end of the rail at
±50 and every value past that drew an identical bar — including the difference
between "the Academy dislikes you" and "the Academy is sealing you in a gem",
on the one bar where that difference ends the run. It looked correct in every
screenshot, because the common values are inside the range that works.

**Check:** for any bar, meter or scale, assert the mapping at the EXTREMES, not
at a typical value. Clipping is not scaling, and `overflow: hidden` covering
for an overflowing fill is the tell.

### 14. A cost the engine clamps to nothing

`applyEffects` floors followers, apprentices and the reliquary at zero, and
`loseArtifact` is a no-op on an empty one. So an option that trades stock for a
FIXED benefit gives the full benefit to a player who cannot pay: ten followers
where the card said forty, an apprentice who does not exist, a relic carried
out of a room containing no relics — and the `resultText` narrates the payment
regardless. Six cards across three files shipped this way; a code review found
them, not the gates.

Note what was *not* broken. The offer card printed the clamped number, because
`projectEffects` exists precisely for this (failure mode 1's second corollary).
Disclosure held. What failed was one layer down: the **exchange** — a fixed
benefit bought with a cost that was erased — and the prose describing it. A
projection that tells the truth about a cost does not make the trade honest.

**Check:** whenever an effect list spends a countable balance to buy something
fixed, ask what happens at zero. Gate the offer on the stock the option spends;
`requires` is an AND and options carry no gates of their own, so a card offering
two payments requires both. Then check what the gating closed — here it shut the
ascent's only certain way out of a pact debt, which is why the ladder walk in
`validate-content.ts` now walks it as a wizard with nothing left to sell. The
two rules only compose while a stock-free exit survives at every level.

## Working on this

### Before calling a change done

1. `npm run typecheck && npm run test && npm run lint && npm run validate:content`
   — all four, and read the output.
2. Balance touched? `npm run sim`, and check the target's provenance.
3. UI touched? `node qa/playthrough.mjs --width 393 --height 852` **and read the
   PNGs back**. 393px is the target device, not an afterthought.
4. New test? Break the behaviour it pins and watch it go red — and check that
   the assertion is anchored to something the code under test does not also
   supply (failure mode 11).
5. New state that can end a run? Make the screen say so — the threshold, the
   distance, and the rate **if there is one**. If there is not, do not invent
   one; see failure mode 1.
6. New `Effect` variant that is deterministic? Add it to `PROJECTABLE` in
   `src/engine/effects.ts`, or the offer card goes back to printing the
   authored number instead of the real one.
7. New content field the UI reads? Make it **required** on the type and let the
   compiler name every fixture. `Ending.hint` found all fourteen call sites
   that way; an optional field would have rendered blank in two of them.

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
