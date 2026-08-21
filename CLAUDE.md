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
| `src/content/` | Factions, artifacts, lairs, origins, endings, epithets, ~110 offers. |
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
   *The corollary is easy to miss:* disclosure does not stop at the choice. A
   stat that silently counts toward an ending is an undisclosed consequence too,
   which is why every header stat names its threshold.
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

The odds rule is satisfied on the card and then quietly abandoned. Three times:

| What shipped | How it presented |
|---|---|
| Pact debt showed its ceiling but not that it accrues `+1` per decline era | Player died at 6/7 having been shown one era of headroom that did not exist |
| Faction standing was not on the run screen at all | `sealed_in_gem` is **18.5% of runs** and arrived with no warning, twice |
| Stats were bare numbers | "the implications of followers, pact debt, loyalty… are not clear" |

Standing made it worse: it moves by **contagion** along `hostileTo`, so courting
the Covenant drives the Academy toward the seal through cards that never name the
Academy — an undisclosed downside reached by an invisible route.

**Check:** for every field on `RunState`, ask *can this end or change a run, and
does the screen say so?* If it counts toward a threshold, show the threshold, the
distance, **and the rate of change**. A ceiling without its clock is a lie.

### 2. Written but never wired

Code that exists and is never called. Four times:

- `deeds.ts` — complete, never imported. Every ledger row read `It is done.`
- `becomeLich` — handled only via the legacy `ending: 'lichdom'` path, so moving
  content to the new effect would have silently done nothing.
- Five `scripted` offers — excluded from sampling with only `prophecy` placed, so
  the lichdom branch and the Chosen One were unreachable content.
- The engine never set `roll`/`odds`, so the resolution's roll rail — principle
  4's visual proof a gamble was fair — **never rendered once, the entire build**.

**Check:** after adding a module or a union member, `rg` for its call site. A file
that exists is not a file that runs. Prefer an exhaustive `switch` with a `never`
guard so the compiler names the unwired case.

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

**Check:** when a metric looks impossible, suspect the harness first. Confirm the
target measures the population you mean (a cohort-level effect measured
population-wide mostly measures the population mix). Sanity-check any policy
against an independent throwaway probe before believing it.

### 6. Invented targets get chased

The "lichdom in 3–8% of runs" band came from a task brief, **not the wiki**,
which sets no rate for lichdom. It was then chased hard enough to distort
`DEF_LICH` twice before anyone asked where the number came from.

**Check:** every balance target needs a provenance. If you cannot cite the wiki
line, say so in the check's comment and pick a band the design can justify.

### 7. Screenshots lie

Two traps, each of which nearly produced a "fix" for a non-bug:

- `fullPage` stitches `position: fixed` overlays over the content behind them.
  Text looks clipped and buttons look missing when neither is true.
- Staged reveals. The ending card settles at ~840ms and the prophecy at ~2.9s;
  shooting earlier captures a half-empty screen.

**Check:** probe the DOM (computed `opacity`, `scrollHeight` vs `clientHeight`,
bounding boxes) before believing a visual defect. `qa/probe-mobile.mjs` does
exactly this. Capture the viewport, not `fullPage`, when an overlay is up.

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

## Working on this

### Before calling a change done

1. `npm run typecheck && npm run test && npm run lint && npm run validate:content`
   — all four, and read the output.
2. Balance touched? `npm run sim`, and check the target's provenance.
3. UI touched? `node qa/playthrough.mjs --width 393 --height 852` **and read the
   PNGs back**. 393px is the target device, not an afterthought.
4. New test? Break the behaviour it pins and watch it go red.
5. New state that can end a run? Make the screen say so.

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
