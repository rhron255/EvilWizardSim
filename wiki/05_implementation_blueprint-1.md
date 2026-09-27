---
name: Implementation Blueprint
description: Phased build order, validation criteria per phase, and known risks.
---

# Implementation Blueprint

## Current Status

Nothing built. Phase 1 has not started.

## Build Order

### Phase 1 — Vertical Slice (validates the whole premise)

Build the smallest thing that tests whether the ledger is compelling.

- `RunState` reducer with append-only era history.
- `<Ledger>` rendering rows with placeholder text.
- One offer type with printed odds and two options.
- Notoriety number and badge tier coloring.
- Hard stop after 15 eras; no endings, no content.

**Acceptance:** a team member plays 5 runs in a row voluntarily, with
placeholder text and no art. If the accumulating table is not compelling
here, stop and rethink before writing content — no amount of flavor text
or art rescues a loop that is boring at this stage.

### Phase 2 — Full Loop

- Creation screen with name capture.
- Prophecy interstitial and phase flip.
- Decay and hero escalation.
- All seven endings.
- Ending card with lair grid.

**Acceptance:** a run completes in 2–4 minutes and every ending has been
hit at least once in testing.

### Phase 3 — Content

- Content validation script **first**.
- Six factions with standing effects.
- 30 artifacts with faction assignment.
- 80–120 offers across both phases.

**Acceptance:** 10 consecutive runs without a repeated offer.

### Phase 4 — Persistence & Collection

- Collection in `localStorage` with version key.
- Collection grid with silhouettes for undiscovered artifacts.
- In-progress run recovery.

**Acceptance:** collection survives a browser restart and a schema
version bump.

### Phase 5 — Share

- Share image generation.
- Profanity screening on wizard names.
- OG tags.

**Acceptance:** a share image renders correctly on mobile Safari and
Android Chrome.

## Validation

Commands are unspecified until the stack is chosen. Whatever it is,
these should exist:

- Content validation (faction refs, option counts, disclosed effects).
- A headless simulation harness that plays N runs and reports the
  distribution of endings, final Notoriety, and Ascension rate. Balance
  tuning without this is guesswork.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| The ledger is not actually compelling | Critical | Phase 1 exists to find this out cheaply. Do not skip it. |
| Content volume underestimated | High | 80–120 offers is a real writing job. Budget it or cut era count. |
| Comedy does not survive translation | High | Decide target language before authoring. |
| Invented factions carry no weight on run 1 | High | Fixed recurring cast; accept that runs 1–3 are weaker than the reference game's. |
| Share image breaks on mobile Safari | Medium | Test early; server-render if needed. |
| Collection loss from schema change | Medium | Version key from day one. |
| Decline phase reads as punishment | Medium | No doom meter; tune erosion gently; playtest. |

## Handover Notes

The non-obvious constraints in this design — printed odds, append-only
ledger, no fail state, comedy quarantined to flavor text, one scarce
color — are load-bearing and derived from analysis of a game that
demonstrably worked at scale. They will look like arbitrary restrictions
during implementation. `06_reference_analysis.md` explains why each one
is there. Read it before relaxing any of them.

## Open Tasks

- [ ] Stack decision (blocks everything).
- [ ] Phase 1 vertical slice.
- [ ] Simulation harness before balance tuning.
- [ ] Content writing budget and owner.
- [ ] Target language decision.
