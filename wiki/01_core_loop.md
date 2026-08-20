---
name: Core Loop
description: Run lifecycle from creation to ending — era structure, phase transitions, choice presentation, and terminal states.
---

# Core Loop

## Current Status

| Area | Status | Notes |
|------|--------|-------|
| Run lifecycle | Planned | Structure below is proposed, unvalidated. |
| Era count / pacing | Planned | 16–20 eras targeting 2–4 min; needs playtest tuning. |
| Phase transition | Planned | Prophecy trigger point is a guess. |
| Endings | Planned | Seven proposed; none implemented. |

## Design Intent

One run is a compressed biography. The player makes roughly 15–20
decisions, each taking a few seconds, and arrives at a death card that
summarizes a life. The loop must be short enough that "one more run"
costs less than the curiosity it provokes.

## Run Lifecycle

```
CREATION → ASCENT PHASE → [prophecy triggers] → DECLINE PHASE → ENDING → COLLECTION
```

### 1. Creation (one screen, ~15 seconds)

Identity capture happens **before any mechanic is explained**. Everything
afterward happens to something the player named.

Fields:
- **Wizard name** (text input, required) — rendered large on a sigil.
- **Epithet** — chosen from 3–4 options, or auto-assigned later by deeds.
- **Origin** — 3 options, each a light starting modifier and a tone-setter
  (e.g. *expelled from the Pale Academy*, *self-taught in a bog*,
  *inherited a tower and its debts*).
- **Run length** — 2–4 options mirroring the reference game's season
  selector. Controls era count, not difficulty.

No stat allocation. No sliders. Setup is the only text-input moment in
the entire run.

### 2. Era Structure

An **era** is the unit of progression. Each era:

1. Presents **2–4 tappable choice cards**. Never more than four. Never
   requires typing.
2. Resolves the choice — instantly if deterministic, with a printed
   probability roll if not.
3. **Appends a row to the ledger** (see below).
4. Advances age and re-evaluates phase state.

Proposed: **5 in-world years per era**, starting age 20, 16–20 eras per
run. Wizard lifespans are long enough that this stays plausible while
keeping the row count visually satisfying.

### 3. The Ledger

The single most important UI element. A table that grows downward, one
row per era, always visible above the choice cards.

Columns: `Age | Lair | Notoriety | Followers | Artifacts | Deeds`

Rules:
- **Append only.** Rows are never removed or rewritten.
- Notoriety renders as a colored badge per tier (see
  `02_data_models_and_content.md`).
- The current era's row is highlighted; prior rows dim slightly with age.
- The header above the ledger shows lifetime totals and — critically — an
  **empty trophy slot** for the run's unattainable prize, visible from
  the first era to the last.

### 4. Ascent Phase

Roughly the first 55–60% of eras. Offers skew toward upside: new lairs,
pacts, apprentices, artifact opportunities, faction alliances. Notoriety
generally climbs. The player is building.

### 5. Prophecy Trigger

A single scripted event around era 9–11 (proposed) that flips the run's
motivational mode. A chosen one is born. From this point:

- Notoriety decay begins (see `04_operational_behaviors.md`).
- Hero-threat offers begin appearing and escalate.
- Offer text shifts from acquisition to protection.

This transition must be **loud** — a full-screen interstitial, not a card.
It is the pivot the whole design rests on.

### 6. Decline Phase

The remaining eras. The player is defending: Notoriety erodes each era,
heroes escalate, factions defect. Offers are now largely damage control
with occasional high-variance gambles to reverse the slide.

**Design note:** the reference game's decline was the most emotionally
effective stretch of a run precisely because it was *not* signposted as
a losing phase — it was just a stat quietly going the wrong way. Resist
the urge to add a doom meter.

### 7. Endings

Reached by age limit, by hero, or by a branch the player chose. Proposed
set:

| Ending | Trigger | Notes |
|--------|---------|-------|
| Slain by the Chosen One | Hero threat exceeds defense | Default failure-shaped ending. Still narrated as a life. |
| Sealed in a Gem | Specific faction outcome | Recoverable in flavor; hints at a future run. |
| Betrayed by an Apprentice | High apprentice count, low loyalty | Comedic potential. |
| Lichdom | Player-chosen branch, high cost | See below. |
| Retired to a Swamp | Survive to age limit, low Notoriety | The anticlimax ending. Must still feel like a story. |
| Consumed by the Pact | Demon-pact debt unpaid | High-variance play punished. |
| Ascension | Rare; requires the run's top prize | The near-miss target. Should be genuinely uncommon. |

**Lichdom is an ending, not a prize.** It is the branch that cheats the
decline phase — the lich's Notoriety does not decay. The cost must be
real and mechanical, not flavor: proposal is that the lich forfeits all
held artifacts and all followers desert. This makes it a live decision
rather than a strict upgrade.

### 8. Ending Card & Collection

The terminal screen must be screenshot-worthy without prompting:
- Wizard name, final epithet, lifespan, ending type.
- Lifetime totals.
- A **grid of lairs held**, one card each — the reference game's club
  grid was the single most-shared element.
- Artifacts recovered this run.
- Buttons: share image, view collection, play again.

The **collection** persists across runs and is specified in
`02_data_models_and_content.md`. It is the primary long-term retention
mechanism.

## Open Tasks

- [ ] Prototype the ledger with placeholder rows and confirm it is
      compelling before any content is written.
- [ ] Playtest era count against the 2–4 minute target; tune.
- [ ] Determine prophecy trigger era by playtest, not by theory.
- [ ] Write the prophecy interstitial as a set piece.
- [ ] Verify every ending reads as a story, including the swamp.
