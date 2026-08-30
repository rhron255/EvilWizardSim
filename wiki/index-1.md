---
name: Evil Wizard Simulator — Index
description: Master index for the Evil Wizard Simulator planning wiki; project summary, phase, page map, and design pillars.
---

# Evil Wizard Simulator — Planning Wiki

## What This Project Is

A short-session web game in which the player builds the career of an evil
wizard, from hedge-sorcerer to whatever they end up as. One run lasts
**2–4 minutes** and produces a permanent, shareable record of that
wizard's life. The game is designed to be replayed dozens of times.

The reward structure is deliberately modelled on **ליגיונר**
(legionnaire.xyz), an Israeli football-career game that reached ~750,000
careers played in its first 72 hours. See `06_reference_analysis.md`
for what was taken from it and what does not transfer.

## Current Phase

**Pre-implementation.** Nothing is built. Every page in this wiki
describes *proposed* behavior. No file in this wiki should be read as
documenting existing code.

| Area | Status | Notes |
|------|--------|-------|
| Core loop design | Planned | Specified in `01_core_loop.md`; not validated by prototype. |
| Data models | Planned | Schemas drafted in `02_data_models_and_content.md`; not final. |
| Content catalogs | Missing | Factions/artifacts/events need writing. Counts proposed only. |
| Technical architecture | Planned | Stack not chosen — see Open Decisions below. |
| Balance formulas | Planned | Numbers in this wiki are starting guesses, expected to change. |
| Art & audio | Missing | Deliberately minimal; flavor text is the art budget. |

## Page Map

| Page | Owns |
|------|------|
| `00_tasks.md` | Prioritized task board and build sequencing. |
| `01_core_loop.md` | Run lifecycle, era structure, phase transitions, endings. |
| `02_data_models_and_content.md` | Schemas, catalogs, balance tables, naming rules. |
| `03_systems_architecture.md` | Components, state ownership, persistence, event flow. |
| `04_operational_behaviors.md` | Offer generation, odds, decay curves, faction logic. |
| `05_implementation_blueprint.md` | Build order, validation, risks. |
| `06_reference_analysis.md` | Source analysis and the design principles being reproduced. |

**Read `06_reference_analysis.md` and `01_core_loop.md` before changing
anything about rewards, pacing, or ending conditions.** Most of the
non-obvious constraints in this design come from there.

## Design Pillars

1. **The ledger is the game.** Each era appends a permanent row to a
   visible table. The accumulating record — not any single outcome — is
   what makes a run feel expensive to abandon.
2. **Odds are always printed before the commit.** Every gamble shows its
   probabilities and payouts up front. This converts randomness into a
   perceived decision and is the cheapest source of player agency
   available.
3. **No fail state.** Every terminal state is a *biography*, not a loss.
   A wizard who dies obscure in a swamp at 200 still produced a story.
4. **Two motivational halves.** Early run: chase upside. After the
   prophecy triggers: defend what you built. Loss aversion carries the
   back half.
5. **One scarce color, inside the run.** Visual reward *earned during a
   career* is rationed to the Notoriety badge's tier color. Nothing the
   game hands out mid-run competes with it.
   *Amended (issue #15):* endings also grant cosmetic **themes**, which
   the player chooses between runs. These do not compete with the badge
   and are not allowed to: no theme may set `--ew-tier`, each is
   near-monochrome within itself, and each meets the default palette's
   ink contrast. The badge is what the game says about you; a theme is
   what you say about the room.
6. **Comedy in the text, never in the numbers.** Flavor text is funny;
   stat changes are straight-faced. If the mechanics wink too, nothing
   feels earned.
7. **Factions are learned across runs.** A fixed cast recurs every run so
   that player knowledge compounds into skill. This substitutes for the
   pre-existing emotional weight the reference game got free from real
   football clubs.
8. **The run's output is a shareable object.** The end screen must be
   something a player would screenshot without being asked.

## Open Decisions

These block implementation and need an owner's call:

- [ ] **Stack.** Proposal: React + TypeScript SPA, no backend for v1.
      Not yet confirmed.
- [ ] **Cross-run persistence.** Proposal: `localStorage` for the artifact
      collection. Confirm whether accounts/sync are wanted later.
- [ ] **Language.** Reference game is Hebrew. Target language for this one
      is unspecified. Comedy does not translate cheaply — decide early.
- [ ] **Monetization / hosting.** Reference used a "buy me a coffee"
      link only. No decision recorded here.

## Next Recommended Work

Build the vertical slice described in `05_implementation_blueprint.md`
Phase 1: the era ledger plus one odds-based choice, with placeholder
text. If watching the table fill up is not compelling with placeholder
content, no amount of content or art will fix it. Validate that before
writing catalogs.
