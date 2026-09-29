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

**Built and playable.** This wiki began as a pre-implementation plan and a
lot of its prose still reads that way. It is the *design record*, not API
documentation: where a page and the code disagree about what exists, the
code is right (see `CLAUDE.md` and `src/types.ts`); where they disagree
about **intent**, stop and reconcile deliberately rather than assuming
either one. The pages below carry a status table that says what is real.

| Area | Status | Notes |
|------|--------|-------|
| Core loop | Built | Creation → ascent → prophecy → decline → ending → collection. See `01_core_loop.md`. |
| Data models | Built | The frozen contract is `src/types.ts`; the schemas in `02_data_models_and_content-1.md` are the original drafts. |
| Content catalogs | Built | 6 factions · 32 relics · 155 offers · 10 lairs · 4 origins · 19 endings · 20 themes. |
| Technical architecture | Built | React + TypeScript + Vite, backendless, `localStorage`. See `03_systems_architecture-1.md`. |
| Balance | Measured | `npm run sim` plays 2000 runs against explicit targets; the ones it carries are cited in `scripts/simulate.ts`. |
| Art & audio | Text-first | Flavor text is the art budget; the only art is procedural (the sigil, the glyphs, the share card). **No audio or haptics.** |

## Page Map

| Page | Owns |
|------|------|
| `00_tasks-1.md` | Prioritized task board and what is still open. |
| `01_core_loop.md` | Run lifecycle, era structure, phase transitions, endings. |
| `02_data_models_and_content-1.md` | Schemas, catalogs, balance tables, naming rules. |
| `03_systems_architecture-1.md` | Components, state ownership, persistence, event flow. |
| `04_operational_behaviors-1.md` | Offer generation, odds, decay curves, faction logic. |
| `05_implementation_blueprint-1.md` | Build order, validation, risks. |
| `06_reference_analysis.md` | Source analysis and the design principles being reproduced. |
| `07_failure_modes.md` | Every shipped bug this repo has produced, kept as a pattern with a check — summarized in `CLAUDE.md`. |

(Several files carry a `-1` suffix. That is their real name — source comments
cite them that way — so cross-references here use the suffixed names.)

**Read `06_reference_analysis.md` and `01_core_loop.md` before changing
anything about rewards, pacing, or ending conditions.** Most of the
non-obvious constraints in this design come from there.

## Design Pillars

1. **The ledger is the game.** Each era appends a permanent row to the
   career record. The accumulating record — not any single outcome — is
   what makes a run feel expensive to abandon. *(Issue #36 removed the
   ledger TABLE from the run screen to give the choice cards the room; the
   per-era record survives underneath and the ending card is where it is
   read. See `CLAUDE.md` rule 2.)*
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

## Decisions

Resolved by building it:

- [x] **Stack.** React + TypeScript + Vite, single page, no backend.
- [x] **Cross-run persistence.** `localStorage`, versioned, migrated
      field-by-field (`src/engine/persistence.ts`). Accounts/sync remain
      deferred.
- [x] **Language.** English, en-GB spelling in player-facing text.
- [x] **Hosting.** GitHub Pages, deployed from `main` (README § Deployment).

Decided 2026-09-29 (the owner's call, after the first post-#77 polish pass):

- [x] **Wizard-name screening: a deliberate non-goal.** The original note here
      said a profanity screen was required before any public sharing feature
      ships. Nothing is *published*: the share image is a PNG the player makes
      and sends themselves, with a name they typed. A blocklist is a
      maintenance trap (it misses things and rejects real names) and buys a
      false sense of safety. If the game ever hosts names — a leaderboard, a
      shared link, a gallery — this decision is void and the requirement returns.
- [x] **Audio: none. Haptics: a few, subtle.** The game's voice is text and its
      one chromatic reward is the tier badge (`06_reference_analysis.md`
      principle 6); sound would be a second, louder voice. A short vibration is
      the smallest thing that makes a phone feel like it noticed a moment, so
      that is all there is (`src/components/meta/haptics.ts`): the verdict of a
      gamble, a celebrated tier crossing, and the prophecy's headline. A beat
      rides a visual event, carries nothing the card does not already print, and
      is inert on iOS Safari, on desktops, and under reduced motion.
- [x] **Small phones: trim what carries no information, touch nothing that can
      end a run.** The "Patron: None yet" line (printed on every era of a career
      that never earned a patron) is hidden until there is a patron, and the age
      rides the tail of the epithet line instead of a paragraph of its own.

Still open:

- [ ] **Monetization.** The reference used a "buy me a coffee" link only.
      No decision recorded.

## Next Recommended Work

Read `00_tasks-1.md` for what is still open. The game's loop has been
validated by play; the remaining work is polish, breadth of content, and
the decisions above. Before adding any mechanic, run `npm run sim` and
read the ending distribution — every mechanic that has shipped here moved
it.
