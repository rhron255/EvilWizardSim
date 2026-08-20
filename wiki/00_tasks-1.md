---
name: Task Board
description: Prioritized, verifiable task board grouped by decisions, architecture, features, content, and release readiness.
---

# Task Board

Status legend: `Planned` · `Partial` · `Complete` · `Blocked` · `Missing`

Everything below is `Planned` or `Blocked`. Nothing is built.

## P0 — Blocking Decisions

- [ ] Choose the stack. Proposal in `03_systems_architecture.md` is React
      + TypeScript, no backend. **Blocks all implementation.**
- [ ] Choose the target language. **Blocks all content authoring** —
      comedy does not translate cheaply.
- [ ] Decide whether cross-run collection is `localStorage`-only for v1.

## P1 — Vertical Slice

Goal: find out whether the ledger is compelling before investing in
content. See `05_implementation_blueprint.md` Phase 1.

- [ ] `RunState` reducer with append-only `EraRecord[]`.
- [ ] `<Ledger>` component rendering era rows with placeholder text.
- [ ] One offer type with two options and printed odds.
- [ ] Notoriety value plus badge tier coloring.
- [ ] Hard stop at 15 eras.
- [ ] **Verify:** a team member plays 5 consecutive runs voluntarily with
      placeholder text and no art.

## P2 — Full Loop

- [ ] Creation screen with wizard name capture and origin selection.
- [ ] Prophecy interstitial as a full-screen set piece.
- [ ] Phase flip from ascent to decline.
- [ ] Notoriety decay per `04_operational_behaviors.md`.
- [ ] Hero threat escalation and defense comparison.
- [ ] All seven endings reachable.
- [ ] Ending card with lair grid.
- [ ] **Verify:** a run completes in 2–4 minutes; every ending hit in test.

## P3 — Systems Quality

- [ ] Content validation script (faction refs valid, 2–4 options per
      offer, every probabilistic option declares success *and* failure
      effects).
- [ ] Enforce odds display structurally — make an undisclosed effect
      impossible to author, not merely discouraged.
- [ ] Headless simulation harness reporting ending distribution, final
      Notoriety spread, and Ascension rate over N runs.
- [ ] Schema `version` key on persisted collection.

## P4 — Content

Blocked on the language decision.

- [ ] Write six faction blurbs, demands, and `hostileTo` relations.
- [ ] Author 30 artifacts with faction assignment, rarity, flavor.
- [ ] Author lair list with tiers and names.
- [ ] Author 20 offers for the vertical slice.
- [ ] Author remaining offers to 80–120 total.
- [ ] Write seven ending narrations, including a swamp retirement that
      still reads as a story.
- [ ] **Verify:** 10 consecutive runs with no repeated offer.

## P5 — Persistence & Collection

- [ ] Collection read at run start, written at run end.
- [ ] Collection grid with silhouettes for undiscovered artifacts.
- [ ] In-progress run recovery on tab close.
- [ ] **Verify:** collection survives browser restart and a version bump.

## P6 — Balance

- [ ] Tune decay base/exponent against 100 simulated runs.
- [ ] Tune hero escalation so age-limit survival is uncommon.
- [ ] Hold Ascension rate in the low single-digit percent.
- [ ] Tune Notoriety tier thresholds against real run distributions.

## P7 — Release Readiness

- [ ] Share image generation.
- [ ] Profanity screening on wizard names — **required before any public
      sharing feature ships.**
- [ ] OG tags and preview image.
- [ ] **Verify:** share image renders on mobile Safari and Android Chrome.

## Deferred

- Accounts and cloud sync.
- Leaderboards. (Note: the reference game has none. A leaderboard would
  pull against principle 8 — no fail state — by grading runs.)
- Additional factions or a second prophecy arc.
