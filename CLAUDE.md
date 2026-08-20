# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Evil Wizard Simulator** — a short-session browser game. One run is a 2–4 minute
career: you name a wizard, make roughly fifteen choices, and get a shareable
biography. It is built and playable.

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

## Working on this

### Measure before you tune

`npm run sim` plays 2000 runs across seven player policies and checks explicit
targets. Do not adjust a constant because a run felt wrong — get the number,
change it, get the number again.

**Trust the harness only as far as you have checked it.** It has been wrong
twice, both times reporting a healthy game that was not: once because it ran
`src/engine/__fixtures__/` instead of real content, and once because its `lich`
policy was a copy of `adaptive` and never took the rite it was named for. When a
metric looks impossible, suspect the instrument as well as the game.

Balance constants live in `src/engine/constants.ts` and nowhere else.

### Look at the actual screen

There is no gate for CSS. `qa/playthrough.mjs` plays a full run and fails on
console errors or a stall; `qa/probe-*.mjs` capture specific states. Run them,
then **read the PNGs back** — a screenshot nobody looks at is not verification.

Two traps, both of which produced false diagnoses here:
- A `fullPage` screenshot stitches `position: fixed` overlays over the content
  behind them. Text looks clipped and buttons look missing when neither is true.
  Probe the DOM before believing a visual defect.
- Set pieces are staged. A shot taken too early catches a half-empty card.

### Tests must be able to fail

`src/engine/engine.test.ts` pins the rules above. Every test there was checked by
breaking the behaviour and watching it go red. Do the same for new ones — this
repo's stated failure mode is a test that passes on `0 == 0`.

### Content and engine are separated on purpose

The engine never imports `src/content/`; it takes a `ContentBundle`. Keep it that
way — it is what lets the balance harness hold content constant, and what makes a
content pack a different argument rather than a different engine.

### Prose moves with behaviour

Changing what a mechanic does means changing everything describing it in the same
commit: the KDoc, the wiki page, `README.md`, and any UI caption that states a
threshold. `rg` the old wording before calling it done.
